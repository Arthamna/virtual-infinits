import './main.css'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { createInfinitsParkScene } from './scene/infinitsPark'

const container = document.createElement('div')
document.body.appendChild(container)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0xcfe0e8, 0.0035)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.64
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
container.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.2, 10000)
camera.position.set(6, 5.5, 17)
scene.add(camera)

const sunPosition = new THREE.Vector3(36, 23, 22)

const sky = new Sky()
sky.scale.setScalar(4500)
scene.add(sky)

const skyUniforms = sky.material.uniforms
skyUniforms['turbidity'].value = 4.2
skyUniforms['rayleigh'].value = 2.4
skyUniforms['mieCoefficient'].value = 0.005
skyUniforms['mieDirectionalG'].value = 0.82
skyUniforms['sunPosition'].value.copy(sunPosition)

const pmremGenerator = new THREE.PMREMGenerator(renderer)
const envRenderTarget = pmremGenerator.fromScene(sky, 0.04)
scene.environment = envRenderTarget.texture
scene.environmentIntensity = 0.24
pmremGenerator.dispose()

const hemiLight = new THREE.HemisphereLight(0xb8d4f0, 0x262b1f, 0.26)
hemiLight.position.set(0, 30, 0)
scene.add(hemiLight)

const sunLight = new THREE.DirectionalLight(0xffe8c4, 2.05)
sunLight.position.set(-4 + sunPosition.x, sunPosition.y, -42 + sunPosition.z)
sunLight.target.position.set(-4, 0, -42)
scene.add(sunLight.target)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(4096, 4096)
sunLight.shadow.camera.near = 5
sunLight.shadow.camera.far = 170
sunLight.shadow.camera.left = -52
sunLight.shadow.camera.right = 52
sunLight.shadow.camera.top = 64
sunLight.shadow.camera.bottom = -64
sunLight.shadow.bias = -0.0004
sunLight.shadow.normalBias = 0.02
scene.add(sunLight)

const park = createInfinitsParkScene(sunPosition)
scene.add(park.group)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.85, -2.2)
controls.enableDamping = true
controls.dampingFactor = 0.05

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
            controls.enabled = true
            setOrbitControlsLimits()
            TWEEN.remove(this)
        })
}

introAnimation()

window.addEventListener('resize', () => {
    const width = window.innerWidth
    const height = window.innerHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
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

const exportBtn = document.createElement('button')
exportBtn.textContent = 'Export .GLB (Blender)'
Object.assign(exportBtn.style, {
    position: 'fixed',
    top: '14px',
    right: '14px',
    zIndex: '1000',
    padding: '8px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#0c63d6',
    color: '#ffffff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
})
exportBtn.addEventListener('click', exportParkToGLB)
document.body.appendChild(exportBtn)

window.addEventListener('keydown', (e) => {
    if (e.key === 'e' || e.key === 'E') {
        exportParkToGLB()
    }
})

const clock = new THREE.Clock()

function renderLoop() {
    const elapsed = clock.getElapsedTime()

    TWEEN.update()
    controls.update()
    park.update(elapsed)

    renderer.render(scene, camera)
    requestAnimationFrame(renderLoop)
}

renderLoop()
