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
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import GUI from 'lil-gui'
import { createInfinitsParkScene } from './scene/infinitsPark'
import { createWalkControls } from './walkControls'

const container = document.createElement('div')
document.body.appendChild(container)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0xe6dfd4, 0.0016)

const MIN_DPR = Math.min(window.devicePixelRatio, 1.35)
const MAX_DPR = 2
let currentDpr = Math.min(window.devicePixelRatio, MAX_DPR)
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.80
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// the scene is static apart from grass sway, so redraw the shadow map only when the sun or the trees change
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true
container.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.2, 10000)
camera.position.set(6, 5.5, 17)
scene.add(camera)

// set by applyTimeOfDay(); the sun rises on the left (-x) and sets on the right (+x) of the start view
const sunPosition = new THREE.Vector3()

const sky = new Sky()
sky.scale.setScalar(4500)
scene.add(sky)

const skyUniforms = sky.material.uniforms
skyUniforms['mieCoefficient'].value = 0.003
// tighter sun halo so the glow doesn't flood half the screen
skyUniforms['mieDirectionalG'].value = 0.8
skyUniforms['showSunDisc'].value = 0
// soft highlight roll-off on the sky: luminance above 1 (the glow around the sun) is compressed,
// everything below stays untouched, so the sun stays bright without a clipped white blob
sky.material.fragmentShader = sky.material.fragmentShader.replace(
    'gl_FragColor = vec4( texColor, 1.0 );',
    `float skyLum = dot( texColor, vec3( 0.2126, 0.7152, 0.0722 ) );
    texColor /= 1.0 + 0.6 * max( skyLum - 1.0, 0.0 );
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
    envRenderTarget = pmremGenerator.fromScene(sky, 0.04)
    scene.environment = envRenderTarget.texture
}
scene.environmentIntensity = 0.88

const hemiLight = new THREE.HemisphereLight(0xf5c89a, 0x3a3020, 0.55)
hemiLight.position.set(0, 30, 0)
scene.add(hemiLight)

const sunLight = new THREE.DirectionalLight(0xffa860, 1.15)
sunLight.target.position.set(-4, 0, -42)
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

const skyFillLight = new THREE.DirectionalLight(0x9ec5f8, 0.55)
scene.add(skyFillLight)

const park = createInfinitsParkScene()
scene.add(park.group)

const lowSunColor = new THREE.Color(0xffa860)
const highSunColor = new THREE.Color(0xfff2e0)
const lowSkyColor = new THREE.Color(0xf5c89a)
const highSkyColor = new THREE.Color(0xd2e2f2)
const lowFogColor = new THREE.Color(0xe6cfae)
const highFogColor = new THREE.Color(0xcfe0e8)

// hour 6..18: sun arc, light colour/intensity, sky haze, fog and wind all follow the time of day
function applyTimeOfDay(hour) {
    const angle = ((hour - 6) / 12) * Math.PI
    sunPosition.set(-60 * Math.cos(angle), 2 + 55 * Math.sin(angle), 4 + 10 * Math.sin(angle))
    const high = THREE.MathUtils.smoothstep(sunPosition.y / 57, 0.05, 0.7) // 0 = sun at horizon, 1 = midday

    skyUniforms['sunPosition'].value.copy(sunPosition)
    skyUniforms['turbidity'].value = THREE.MathUtils.lerp(10, 4, high)
    skyUniforms['rayleigh'].value = THREE.MathUtils.lerp(3, 1.4, high)

    sunLight.position.set(-4 + sunPosition.x, sunPosition.y, -42 + sunPosition.z)
    sunLight.color.lerpColors(lowSunColor, highSunColor, high)
    sunLight.intensity = THREE.MathUtils.lerp(1.15, 2.85, high)
    skyFillLight.position.set(-sunPosition.x, sunPosition.y * 0.75, -sunPosition.z)
    hemiLight.color.lerpColors(lowSkyColor, highSkyColor, high)
    hemiLight.intensity = THREE.MathUtils.lerp(0.45, 0.65, high)
    scene.fog.color.lerpColors(lowFogColor, highFogColor, high)

    // calm morning, gusty mid-afternoon, settling toward evening
    renderer.shadowMap.needsUpdate = true
    park.setWind(0.5 + 1.3 * Math.exp(-(((hour - 14) / 3) ** 2)))
    park.setLampGlow(0.15 + 2.6 * (1 - high) ** 2) // lamps barely visible at noon, glowing toward dusk
}

park.vegetation.addEventListener('loaded', () => {
    renderer.shadowMap.needsUpdate = true
})

const timeOfDay = { hour: 15.6 } // always sunny midday
applyTimeOfDay(timeOfDay.hour)
updateEnvironment()

const viewState = { mode: 'god' }
const gui = new GUI({ title: 'Scene' })
gui.domElement.style.top = '56px' // below the export button
const timeCtrl = gui.add(timeOfDay, 'hour', 6, 18, 0.1)
    .name('Time of day')
    .onChange(applyTimeOfDay)
    .onFinishChange(updateEnvironment) // PMREM bake is too slow to redo every slider tick
gui.add(viewState, 'mode', { 'God (orbit / pan)': 'god', 'Walk (path + plaza)': 'walk' })
    .name('Camera mode')
    .onChange(setViewMode)

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
    composer.setPixelRatio(1)
    composer.setSize(w, h)
    composer.render()
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
gui.add({ takePhoto }, 'takePhoto').name('Take 4K photo')

// MSAA target: the composer otherwise drops the canvas antialiasing
const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 })
)
composer.addPass(new RenderPass(scene, camera))
const aoPass = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight)
aoPass.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2 })
// alpha-tested leaves (userData.noAO) would be drawn as solid quads in GTAO's normal/depth pass
// and smear AO squares onto the sky. shortcut: patches a private GTAOPass method, recheck on three upgrades
const hideFromAO = aoPass._overrideVisibility.bind(aoPass)
aoPass._overrideVisibility = function () {
    hideFromAO()
    scene.traverse((o) => {
        if (o.userData.noAO && o.visible) {
            o.visible = false
            this._visibilityCache.push(o)
        }
    })
}
composer.addPass(aoPass)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.12, 0.4, 0.95)
composer.addPass(bloomPass)

// simplify mode for slow GPUs: drops the costly parts — the water's real-time reflection/refraction
// (two extra scene renders per frame), sun shadows, ambient occlusion and bloom. Lights stay on.
const simplify = { on: false, savedHour: timeOfDay.hour }
gui.add(simplify, 'on')
    .name('Simplify mode')
    .onChange((on) => {
        // time of day is pinned to noon while simplified; the previous hour comes back when turned off
        if (on) simplify.savedHour = timeOfDay.hour
        timeOfDay.hour = on ? 12 : simplify.savedHour
        timeCtrl.updateDisplay()
        timeCtrl.enable(!on)
        applyTimeOfDay(timeOfDay.hour)
        updateEnvironment()
        park.setSimpleWater(on)
        sunLight.castShadow = !on
        renderer.shadowMap.needsUpdate = true
        aoPass.enabled = !on
        bloomPass.enabled = !on
    })
composer.addPass(new OutputPass())

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.85, -2.2)
controls.enableDamping = false // camera moves only while the mouse moves, no glide after release

function setOrbitControlsLimits() {
    controls.minDistance = 6
    controls.maxDistance = 120
    controls.enableRotate = true
    controls.enableZoom = true
    controls.enablePan = true
    controls.screenSpacePanning = false
    controls.keyPanSpeed = 18
    controls.listenToKeyEvents(window)
    controls.maxPolarAngle = Math.PI / 2 - 0.02
}

function introAnimation() {
    controls.enabled = false

    new TWEEN.Tween(camera.position, true)
        .to(
            {
                x: 0.15,
                y: 2.35,
                z: 11.4
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

introAnimation()

// --- camera modes: God (orbit/pan) and Walk (first person along the lake path) ---
park.group.updateMatrixWorld(true) // ground rays need world matrices before the first render
const walk = createWalkControls({
    camera,
    domElement: renderer.domElement,
    ...park.walk
})
const walkHint = document.createElement('div')
walkHint.textContent = 'WASD move · drag to look · Shift run'
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

function setViewMode(mode) {
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
}

window.addEventListener('resize', () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    composer.setSize(width, height)
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
let lastElapsed = 0

function renderLoop() {
    const elapsed = clock.getElapsedTime()
    const dt = Math.min(0.1, elapsed - lastElapsed)
    lastElapsed = elapsed

    camera.getWorldDirection(viewDir)
    sunDir.copy(sunPosition).normalize()
    const facingSun = THREE.MathUtils.smoothstep(viewDir.dot(sunDir), 0.4, 0.95)
    const targetExposure = baseExposure * THREE.MathUtils.lerp(1, 0.86, facingSun)
    renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * (1 - Math.exp(-dt * 2.5))

    TWEEN.update()
    if (walk.enabled) walk.update(dt)
    else controls.update()
    park.update(elapsed)
    skyUniforms['time'].value = elapsed

    composer.render()
    requestAnimationFrame(renderLoop)
}

renderLoop()
