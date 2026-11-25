import './main.css'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import GUI from 'lil-gui'
import { createInfinitsParkScene } from './scene/infinitsPark'
import { createWalkControls } from './walkControls'
import { setMaxTextureAnisotropy } from './scene/textures'

const container = document.createElement('div')
document.body.appendChild(container)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0xd99b76, 0.0022)

const MIN_DPR = Math.min(window.devicePixelRatio, 1.35)
const MAX_DPR = 2
let currentDpr = Math.min(window.devicePixelRatio, MAX_DPR)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(currentDpr)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.84
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// the scene is static apart from grass sway, so redraw the shadow map only when the sun or the trees change
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true
setMaxTextureAnisotropy(renderer.capabilities.getMaxAnisotropy())
container.appendChild(renderer.domElement)

const PARK_SCALE = 1.6

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.5, 5000)
camera.position.set(6 * PARK_SCALE, 5.5 * PARK_SCALE, 17 * PARK_SCALE)
scene.add(camera)

// set by applyTimeOfDay(); the sun rises on the left (-x) and sets on the right (+x) of the start view
const sunPosition = new THREE.Vector3()

const sky = new Sky()
sky.scale.setScalar(4500)
scene.add(sky)

const skyUniforms = sky.material.uniforms
skyUniforms['mieCoefficient'].value = 0.0008
// tight sun corona + visible sun disc so it reads as an actual sun rather than a wide glare
skyUniforms['mieDirectionalG'].value = 0.94
skyUniforms['showSunDisc'].value = 1
// Reinhard sky roll-off to tame the wide glare on the right while keeping a crisp sun disc
sky.material.fragmentShader = sky.material.fragmentShader.replace(
    'gl_FragColor = vec4( texColor, 1.0 );',
    `float skyLum = dot( texColor, vec3( 0.2126, 0.7152, 0.0722 ) );
    float compressedLum = skyLum / ( 1.0 + skyLum * 0.95 );
    texColor *= compressedLum / max( skyLum, 0.0001 );
    float horizonFade = smoothstep( 0.0, 0.22, max( normalize( vWorldPosition ).y, 0.0 ) );
    texColor *= mix( 0.58, 1.0, horizonFade );
    gl_FragColor = vec4( texColor, 1.0 );`
)
// smaller, denser puffs read more like cumulus than the default streaky layer
skyUniforms['cloudScale'].value = 0.00035
skyUniforms['cloudCoverage'].value = 0.45
skyUniforms['cloudDensity'].value = 0.8
skyUniforms['cloudElevation'].value = 0.45

const pmremGenerator = new THREE.PMREMGenerator(renderer)
let envRenderTarget = null
function updateEnvironment() {
    envRenderTarget?.dispose()
    envRenderTarget = pmremGenerator.fromScene(sky, 0.02)
    scene.environment = envRenderTarget.texture
}
scene.environmentIntensity = 0.88

const hemiLight = new THREE.HemisphereLight(0xf5c89a, 0x4d5e3a, 0.75)
hemiLight.position.set(0, 30, 0)
scene.add(hemiLight)

const sunLight = new THREE.DirectionalLight(0xffa860, 1.15)
sunLight.target.position.set(0, 0, -56 * PARK_SCALE)
scene.add(sunLight.target)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(4096, 4096)
sunLight.shadow.camera.near = 15
sunLight.shadow.camera.far = 185 * PARK_SCALE
sunLight.shadow.camera.left = -44 * PARK_SCALE
sunLight.shadow.camera.right = 44 * PARK_SCALE
sunLight.shadow.camera.top = 62 * PARK_SCALE
sunLight.shadow.camera.bottom = -62 * PARK_SCALE
sunLight.shadow.bias = -0.0003
sunLight.shadow.normalBias = 0.014
sunLight.shadow.radius = 2.4
scene.add(sunLight)

const skyFillLight = new THREE.DirectionalLight(0x6b82c4, 0.36)
scene.add(skyFillLight)

const park = createInfinitsParkScene()
park.group.scale.setScalar(PARK_SCALE)
scene.add(park.group)

const lowSunColor = new THREE.Color(0xff7a3d)
const highSunColor = new THREE.Color(0xfff2e0)
const lowSkyColor = new THREE.Color(0xf29f6d)
const highSkyColor = new THREE.Color(0xd2e2f2)

// hour 6..18: sun arc, light colour/intensity, sky haze and wind all follow the time of day
function applyTimeOfDay(hour) {
    const angle = ((hour - 6) / 12) * Math.PI
    sunPosition.set(-60 * Math.cos(angle), 2 + 55 * Math.sin(angle), 4 + 10 * Math.sin(angle))
    const high = THREE.MathUtils.smoothstep(sunPosition.y / 57, 0.05, 0.7) // 0 = sun at horizon, 1 = midday

    skyUniforms['sunPosition'].value.copy(sunPosition)
    skyUniforms['turbidity'].value = THREE.MathUtils.lerp(7.5, 2.2, high)
    skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(2.8, 1.0, high)

    sunLight.position.set(sunPosition.x * PARK_SCALE, sunPosition.y * PARK_SCALE, (-56 + sunPosition.z) * PARK_SCALE)
    sunLight.color.lerpColors(lowSunColor, highSunColor, high)
    sunLight.intensity = THREE.MathUtils.lerp(1.55, 2.85, high)
    skyFillLight.position.set(-sunPosition.x, sunPosition.y * 0.75, -sunPosition.z)
    hemiLight.color.lerpColors(lowSkyColor, highSkyColor, high)
    hemiLight.intensity = THREE.MathUtils.lerp(0.36, 0.72, high)

    // calm morning, gusty mid-afternoon, settling toward evening
    renderer.shadowMap.needsUpdate = true
    park.setWind(0.5 + 1.3 * Math.exp(-(((hour - 14) / 3) ** 2)))
    park.setLampGlow(0.15 + 2.6 * (1 - high) ** 2) // lamps barely visible at noon, glowing toward dusk
    park.setSun(sunPosition, sunLight.color)
}

park.vegetation.addEventListener('loaded', () => {
    renderer.shadowMap.needsUpdate = true
})
park.trees.addEventListener('loaded', () => {
    renderer.shadowMap.needsUpdate = true
})

const timeOfDay = { hour: 17.45 } // always sunny midday
applyTimeOfDay(timeOfDay.hour)
updateEnvironment()

const viewState = { mode: 'walk' }

// 4K still from the same angle as the reference photo: standing in front of the plaza steps,
// left of centre, looking across at the sign. The live view is restored afterwards.
function takePhoto() {
    const w = 3840
    const h = 2160
    const saved = {
        pos: camera.position.clone(),
        quat: camera.quaternion.clone(),
        fov: camera.fov,
        aspect: camera.aspect,
        pixelRatio: renderer.getPixelRatio(),
        controls: controls.enabled
    }
    controls.enabled = false
    camera.position.set(-7.5, 1.6, 6.5)
    camera.lookAt(1.5, 1.9, -2.4)
    camera.fov = 55
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(1)
    renderer.setSize(w, h, false) // false: keep the on-page canvas size, only the buffer grows
    const savedAo = aoPass.enabled
    aoPass.enabled = true
    composer.setPixelRatio(1)
    composer.setSize(w, h)
    if (aoPass.enabled || bloomPass.enabled) {
        composer.render()
    } else {
        renderer.render(scene, camera)
    }
    aoPass.enabled = savedAo
    renderer.domElement.toBlob((blob) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'infinits-park-4k.png'
        link.click()
        URL.revokeObjectURL(link.href)
    }, 'image/png')

    camera.position.copy(saved.pos)
    camera.quaternion.copy(saved.quat)
    camera.fov = saved.fov
    camera.aspect = saved.aspect
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(saved.pixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setPixelRatio(saved.pixelRatio)
    composer.setSize(window.innerWidth, window.innerHeight)
    controls.enabled = saved.controls
}
// the full scene panel was removed; keep a minimal one just for the photo button
const gui = new GUI({ title: 'Scene' })
gui.add({ takePhoto }, 'takePhoto').name('Take 4K photo')

// simplify mode for slow GPUs: swaps the heavy caustics/fresnel water shader for a plain glossy surface,
// turns off sun shadows, ambient occlusion, bloom and god-rays, and pins the time to noon.
// Lights stay on. Unticking restores the normal time and effects.
const simplify = { on: false, normalHour: timeOfDay.hour }
gui.add(simplify, 'on')
    .name('Simplify mode')
    .onChange((on) => {
        timeOfDay.hour = on ? 12 : simplify.normalHour
        applyTimeOfDay(timeOfDay.hour)
        updateEnvironment()
        park.setSimpleWater(on)
        sunLight.castShadow = !on
        renderer.shadowMap.needsUpdate = true
        aoPass.enabled = !on
        bloomPass.enabled = !on
    })

// MSAA target: the composer otherwise drops the canvas antialiasing
const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 })
)
composer.addPass(new RenderPass(scene, camera))
const aoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight)
aoPass.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 8 })
aoPass.enabled = false // off by default for high FPS; toggleable via GUI or enabled in 4K photo
let noAOMeshes = []
function refreshNoAOCache() {
    noAOMeshes = []
    scene.traverse((o) => {
        if (o.userData.noAO) noAOMeshes.push(o)
    })
}
refreshNoAOCache()
park.vegetation.addEventListener('loaded', refreshNoAOCache)
park.trees.addEventListener('loaded', refreshNoAOCache)
// alpha-tested leaves (userData.noAO) would be drawn as solid quads in GTAO's normal/depth pass
// and smear AO squares onto the sky. shortcut: patches a private GTAOPass method, recheck on three upgrades
const hideFromAO = aoPass._overrideVisibility.bind(aoPass)
aoPass._overrideVisibility = function () {
    hideFromAO()
    for (let i = 0; i < noAOMeshes.length; i++) {
        const o = noAOMeshes[i]
        if (o.visible) {
            o.visible = false
            this._visibilityCache.push(o)
        }
    }
}
composer.addPass(aoPass)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2)),
    0.04,
    0.25,
    1.1
)
bloomPass.enabled = false
composer.addPass(bloomPass)
const smaaPass = new SMAAPass(window.innerWidth * currentDpr, window.innerHeight * currentDpr)
smaaPass.enabled = false
composer.addPass(smaaPass)

// Screen-space volumetric sun god-rays (crepuscular shafts + crisp object silhouettes against the sun)
const godRaysPass = new ShaderPass({
    uniforms: {
        tDiffuse: { value: null },
        uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
        uIntensity: { value: 0.0 },
        uRayColor: { value: new THREE.Color(0xffc982) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uSunScreenPos;
        uniform float uIntensity;
        uniform vec3 uRayColor;
        varying vec2 vUv;

        void main() {
            vec4 baseColor = texture2D(tDiffuse, vUv);
            if (uIntensity <= 0.001) {
                gl_FragColor = baseColor;
                return;
            }

            const int SAMPLES = 28;
            vec2 deltaUv = (vUv - uSunScreenPos) * (0.88 / float(SAMPLES));
            vec2 coord = vUv;
            float decay = 1.0;
            float accum = 0.0;

            for (int i = 0; i < SAMPLES; i++) {
                coord -= deltaUv;
                vec2 clampedCoord = clamp(coord, 0.001, 0.999);
                vec3 samp = texture2D(tDiffuse, clampedCoord).rgb;
                float lum = dot(samp, vec3(0.2126, 0.7152, 0.0722));
                // Only bright sky/sunlight gaps scatter rays; dark silhouetted trunks & leaves block them
                float bright = smoothstep(0.62, 1.45, lum);
                accum += bright * decay;
                decay *= 0.94;
            }

            float distToSun = length(vUv - uSunScreenPos);
            float radialFalloff = smoothstep(1.15, 0.0, distToSun);
            float rays = (accum / float(SAMPLES)) * radialFalloff * uIntensity;

            gl_FragColor = vec4(baseColor.rgb + uRayColor * rays * 1.45, baseColor.a);
        }
    `
})
godRaysPass.enabled = false
composer.addPass(godRaysPass)
composer.addPass(new OutputPass())
composer.setPixelRatio(currentDpr)
composer.setSize(window.innerWidth, window.innerHeight)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.85 * PARK_SCALE, -2.2 * PARK_SCALE)
controls.enableDamping = false // camera moves only while the mouse moves, no glide after release

function setOrbitControlsLimits() {
    controls.minDistance = 1.5
    controls.maxDistance = 400 * PARK_SCALE
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    controls.rotateSpeed = 1.2
    controls.zoomSpeed = 2.0
    controls.panSpeed = 2.2
    controls.screenSpacePanning = true
    controls.keyPanSpeed = 45
    controls.maxPolarAngle = Math.PI / 2 - 0.01
}

// Fast free-fly movement in God mode: WASD / Arrows move, Space/Q up, C down, Shift turbo boost
const flyKeys = new Set()
const flyForward = new THREE.Vector3()
const flyRight = new THREE.Vector3()
const flyMove = new THREE.Vector3()

function cancelIntroAndEnableControls() {
    if (!controls.enabled && viewState.mode === 'god') {
        TWEEN.removeAll()
        controls.enabled = true
        setOrbitControlsLimits()
    }
}

window.addEventListener('keydown', (e) => {
    if (viewState.mode !== 'god') return
    const code = e.code
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyQ', 'KeyC', 'ShiftLeft', 'ShiftRight'].includes(code)) {
        cancelIntroAndEnableControls()
        flyKeys.add(code)
    }
})
window.addEventListener('keyup', (e) => {
    flyKeys.delete(e.code)
})
window.addEventListener('blur', () => flyKeys.clear())
renderer.domElement.addEventListener('pointerdown', cancelIntroAndEnableControls)

function updateFreeFly(dt) {
    if (!controls.enabled || flyKeys.size === 0) return
    const speed = (flyKeys.has('ShiftLeft') || flyKeys.has('ShiftRight') ? 55 : 22) * dt

    camera.getWorldDirection(flyForward)
    flyForward.y = 0
    if (flyForward.lengthSq() > 0) flyForward.normalize()
    flyRight.crossVectors(flyForward, camera.up).normalize()

    flyMove.set(0, 0, 0)
    if (flyKeys.has('KeyW') || flyKeys.has('ArrowUp')) flyMove.add(flyForward)
    if (flyKeys.has('KeyS') || flyKeys.has('ArrowDown')) flyMove.sub(flyForward)
    if (flyKeys.has('KeyD') || flyKeys.has('ArrowRight')) flyMove.add(flyRight)
    if (flyKeys.has('KeyA') || flyKeys.has('ArrowLeft')) flyMove.sub(flyRight)
    if (flyKeys.has('Space') || flyKeys.has('KeyQ')) flyMove.y += 1
    if (flyKeys.has('KeyC')) flyMove.y -= 1

    if (flyMove.lengthSq() > 0) {
        flyMove.normalize().multiplyScalar(speed)
        camera.position.add(flyMove)
        controls.target.add(flyMove)
        if (camera.position.y < 0.5) {
            const lift = 0.5 - camera.position.y
            camera.position.y += lift
            controls.target.y += lift
        }
    }
}

function introAnimation() {
    controls.enabled = false

    new TWEEN.Tween(camera.position, true)
        .to(
            {
                x: 0.15 * PARK_SCALE,
                y: 2.35 * PARK_SCALE,
                z: 11.4 * PARK_SCALE
            },
            2800
        )
        .delay(400)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()
        .onComplete(function () {
            controls.enabled = viewState.mode === 'god'
            setOrbitControlsLimits()
            TWEEN.remove(this)
        })
}

// Start directly in Minecraft First-Person mode (press V or click button to switch to Orbit)

// --- camera modes: God (orbit/pan) and Walk (first person along the lake path) ---
park.group.updateMatrixWorld(true) // ground rays need world matrices before the first render
park.walk.start.multiplyScalar(PARK_SCALE)
const walk = createWalkControls({
    camera,
    domElement: renderer.domElement,
    ...park.walk
})
const walkHint = document.createElement('div')
walkHint.textContent = 'Klik layar untuk lihat sekitar · WASD jalan · Space lompat · Shift lari · V ganti mode · ESC lepas kursor'
Object.assign(walkHint.style, {
    position: 'fixed',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 12px',
    borderRadius: '6px',
    background: 'rgba(0,0,0,0.45)',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    display: 'none'
})
document.body.appendChild(walkHint)


const crosshair = document.createElement('div')
crosshair.textContent = '+'
Object.assign(crosshair.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: 'monospace',
    fontSize: '22px',
    fontWeight: '700',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.85)',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: '1000'
})
document.body.appendChild(crosshair)

const modeBtn = document.createElement('button')
Object.assign(modeBtn.style, {
    position: 'fixed',
    top: '14px',
    right: '14px',
    zIndex: '1001',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.22)',
    background: 'rgba(18, 24, 32, 0.72)',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)'
})
modeBtn.addEventListener('click', () => {
    setViewMode(viewState.mode === 'walk' ? 'god' : 'walk')
})
document.body.appendChild(modeBtn)

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV') {
        setViewMode(viewState.mode === 'walk' ? 'god' : 'walk')
    }
})

function setViewMode(mode) {
    viewState.mode = mode
    if (mode === 'walk') {
        TWEEN.removeAll()
        controls.enabled = false
        camera.fov = 70
        camera.updateProjectionMatrix()
        walk.enable()
    } else {
        walk.disable()
        camera.fov = 44
        camera.updateProjectionMatrix()
        const p = walk.position
        controls.target.set(p.x, 1, p.z)
        camera.position.set(p.x + 10, 12, p.z + 16)
        setOrbitControlsLimits()
        controls.enabled = true
    }
    walkHint.style.display = mode === 'walk' ? 'block' : 'none'
    crosshair.style.display = mode === 'walk' ? 'block' : 'none'
    modeBtn.textContent = mode === 'walk' ? 'Mode: First Person (V)' : 'Mode: Orbit / God (V)'
}

setViewMode('walk')

function applyViewportSize(width, height, dpr) {
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    composer.setPixelRatio(dpr)
    composer.setSize(width, height)
    bloomPass.resolution.set(Math.floor(width / 2), Math.floor(height / 2))
    smaaPass.setSize(Math.floor(width * dpr), Math.floor(height * dpr))
}

window.addEventListener('resize', () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    const maxAllowed = Math.min(window.devicePixelRatio, MAX_DPR)
    currentDpr = THREE.MathUtils.clamp(currentDpr, MIN_DPR, maxAllowed)
    applyViewportSize(width, height, currentDpr)
})

function exportParkToGLB() {
    const exporter = new GLTFExporter()
    exporter.parse(
        park.group,
        (result) => {
            const blob = new Blob([result], { type: 'model/gltf-binary' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'infinits-park.glb'
            link.click()
            URL.revokeObjectURL(url)
        },
        (err) => {
            console.error('GLB export failed:', err)
        },
        { binary: true }
    )
}

// const exportBtn = document.createElement('button')
// exportBtn.textContent = 'Export .GLB (Blender)'
// Object.assign(exportBtn.style, {
//     position: 'fixed',
//     top: '14px',
//     right: '14px',
//     zIndex: '1000',
//     padding: '8px 14px',
//     borderRadius: '8px',
//     border: 'none',
//     background: '#0c63d6',
//     color: '#ffffff',
//     fontFamily: 'system-ui, sans-serif',
//     fontSize: '13px',
//     fontWeight: '600',
//     cursor: 'pointer',
//     boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
// })
// exportBtn.addEventListener('click', exportParkToGLB)
// document.body.appendChild(exportBtn)

window.addEventListener('keydown', (e) => {
    // E sits next to WASD, so only export from God mode
    if ((e.key === 'e' || e.key === 'E') && viewState.mode === 'god') {
        exportParkToGLB()
    }
})

const clock = new THREE.Clock()

// cheap eye adaptation: exposure drops when looking toward the sun and recovers when looking away.
// shortcut: uses view direction, not measured scene luminance; upgrade to a luminance-based pass if needed
const baseExposure = renderer.toneMappingExposure
const viewDir = new THREE.Vector3()
const sunDir = new THREE.Vector3()
const sunProj = new THREE.Vector3()
let lastElapsed = 0

// Adaptive pixel ratio based on rolling average FPS (<45 step down 0.25, >58 step up 0.25, range 1..2)
let fpsFrames = 0
let fpsAccum = 0
const FPS_WINDOW_SEC = 1.0
const DPR_STEP = 0.25

function updateAdaptiveQuality(dt) {
    fpsFrames++
    fpsAccum += dt
    if (fpsAccum < FPS_WINDOW_SEC) return

    const avgFps = fpsFrames / fpsAccum
    fpsFrames = 0
    fpsAccum = 0

    const maxAllowed = Math.min(window.devicePixelRatio, MAX_DPR)
    let nextDpr = currentDpr
    if (avgFps < 45 && currentDpr > MIN_DPR) {
        nextDpr = Math.max(MIN_DPR, Math.round((currentDpr - DPR_STEP) * 4) / 4)
    } else if (avgFps > 58 && currentDpr < maxAllowed) {
        nextDpr = Math.min(maxAllowed, Math.round((currentDpr + DPR_STEP) * 4) / 4)
    }

    if (nextDpr !== currentDpr) {
        currentDpr = nextDpr
        applyViewportSize(window.innerWidth, window.innerHeight, currentDpr)
    }
}

function renderLoop() {
    const elapsed = clock.getElapsedTime()
    const dt = Math.min(0.1, elapsed - lastElapsed)
    lastElapsed = elapsed

    updateAdaptiveQuality(dt)

    camera.getWorldDirection(viewDir)
    sunDir.copy(sunPosition).normalize()
    const sunDot = viewDir.dot(sunDir)
    const facingSun = THREE.MathUtils.smoothstep(sunDot, 0.4, 0.95)
    const targetExposure = baseExposure * THREE.MathUtils.lerp(1, 0.86, facingSun)
    renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * (1 - Math.exp(-dt * 2.5))

    // Update volumetric sun god-rays pass only when looking toward the sun (never in simplify mode)
    if (sunDot > 0.08 && !simplify.on) {
        sunProj.copy(camera.position).addScaledVector(sunDir, 2000).project(camera)
        godRaysPass.uniforms.uSunScreenPos.value.set(sunProj.x * 0.5 + 0.5, sunProj.y * 0.5 + 0.5)
        godRaysPass.uniforms.uIntensity.value = THREE.MathUtils.smoothstep(sunDot, 0.08, 0.72) * 0.62
        godRaysPass.uniforms.uRayColor.value.copy(sunLight.color).lerp(new THREE.Color(0xffe0a8), 0.35)
        godRaysPass.enabled = true
    } else {
        godRaysPass.enabled = false
        godRaysPass.uniforms.uIntensity.value = 0.0
    }

    TWEEN.update()
    if (walk.enabled) walk.update(dt)
    else {
        updateFreeFly(dt)
        controls.update()
    }
    park.update(elapsed)
    skyUniforms['time'].value = elapsed

    composer.render()
    requestAnimationFrame(renderLoop)
}

renderLoop()
