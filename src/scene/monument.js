import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { createConcreteTexture, createPavingPBRMaps, createPavingTexture } from './textures'

let rectAreaInitialized = false
function ensureRectAreaLights() {
    if (!rectAreaInitialized) {
        RectAreaLightUniformsLib.init()
        rectAreaInitialized = true
    }
}

let joggingPavingMat = null
function getJoggingPavingMaterial() {
    if (joggingPavingMat) return joggingPavingMat
    const pbr = createPavingPBRMaps(3, 3, false)
    joggingPavingMat = new THREE.MeshStandardMaterial({
        map: createPavingTexture(3, 3, false),
        normalMap: pbr.normalMap,
        normalScale: new THREE.Vector2(1.45, 1.45),
        aoMap: pbr.aoMap,
        aoMapIntensity: 0.85,
        roughnessMap: pbr.roughnessMap,
        roughness: 0.85,
        metalness: 0.03
    })
    return joggingPavingMat
}

let gravelBumpTex = null
function getGravelBumpTexture() {
    if (gravelBumpTex) return gravelBumpTex
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#707070'
    ctx.fillRect(0, 0, size, size)
    let seed = 4099
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
    for (let i = 0; i < 1800; i++) {
        const x = rand() * size
        const y = rand() * size
        const rx = 1.8 + rand() * 3.8
        const ry = 1.5 + rand() * 3.2
        const v = Math.floor(90 + rand() * 145)
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
    }
    gravelBumpTex = new THREE.CanvasTexture(canvas)
    gravelBumpTex.wrapS = THREE.RepeatWrapping
    gravelBumpTex.wrapT = THREE.RepeatWrapping
    gravelBumpTex.repeat.set(8, 4)
    return gravelBumpTex
}

let rockGrainBumpTex = null
function getRockGrainBumpTexture() {
    if (rockGrainBumpTex) return rockGrainBumpTex
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, size, size)
    let seed = 8821
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
    // Fine mineral speckles & coarse stone pores for tactile rough granite/andesite grain
    for (let i = 0; i < 14000; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 0.6 + rand() * 2.2
        const v = Math.floor(40 + rand() * 195)
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.fillRect(x, y, r, r)
    }
    for (let i = 0; i < 650; i++) {
        const x = rand() * size
        const y = rand() * size
        const rx = 2.0 + rand() * 7.0
        const ry = 1.5 + rand() * 5.0
        const v = rand() > 0.5 ? Math.floor(155 + rand() * 85) : Math.floor(35 + rand() * 65)
        ctx.fillStyle = `rgba(${v},${v},${v},0.45)`
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
    }
    rockGrainBumpTex = new THREE.CanvasTexture(canvas)
    rockGrainBumpTex.wrapS = THREE.RepeatWrapping
    rockGrainBumpTex.wrapT = THREE.RepeatWrapping
    rockGrainBumpTex.repeat.set(4, 4)
    return rockGrainBumpTex
}

// Injects 3D world-space stone micro-grain, fracture contrast, cavity AO, and crisp 3D finite-difference normal bump
function enhanceRockMaterial(mat, baseRoughness = 0.72) {
    mat.bumpMap = getRockGrainBumpTexture()
    mat.bumpScale = 0.058
    mat.roughness = baseRoughness
    mat.metalness = 0.02
    mat.envMapIntensity = 0.65
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vRockWPos;\nvarying vec3 vRockWNorm;')
            .replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                vRockWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                vRockWNorm = normalize(mat3(modelMatrix) * objectNormal);`
            )
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vRockWPos;
                varying vec3 vRockWNorm;
                float rHash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }
                float rNoise(vec3 x) {
                    vec3 i = floor(x);
                    vec3 f = fract(x);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(mix(rHash(i + vec3(0,0,0)), rHash(i + vec3(1,0,0)), f.x),
                            mix(rHash(i + vec3(0,1,0)), rHash(i + vec3(1,1,0)), f.x), f.y),
                        mix(mix(rHash(i + vec3(0,0,1)), rHash(i + vec3(1,0,1)), f.x),
                            mix(rHash(i + vec3(0,1,1)), rHash(i + vec3(1,1,1)), f.x), f.y),
                        f.z
                    );
                }
                float rockHeightField(vec3 p) {
                    float f1 = abs(rNoise(p * 4.5) - 0.5) * 2.0;
                    float f2 = rNoise(p * 22.0) * 0.55 + rNoise(p * 68.0) * 0.45;
                    float f3 = rNoise(p * 145.0);
                    return f1 * 0.35 + f2 * 0.40 + f3 * 0.25;
                }`
            )
            .replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float coarseGrain = rNoise(vRockWPos * 20.0) * 0.6 + rNoise(vRockWPos * 52.0) * 0.4;
                float fineGrain = rNoise(vRockWPos * 135.0);
                float strata = rNoise(vec3(vRockWPos.x * 3.5, vRockWPos.y * 8.5, vRockWPos.z * 3.5));
                float crevice = smoothstep(0.08, 0.65, abs(rNoise(vRockWPos * 4.5) - 0.5) * 2.0);
                float aoBase = mix(0.62, 1.06, smoothstep(0.62, 1.38, vRockWPos.y));
                float topLight = mix(0.80, 1.15, clamp(vRockWNorm.y * 0.5 + 0.5, 0.0, 1.0));
                diffuseColor.rgb *= (0.72 + 0.44 * coarseGrain) * (0.85 + 0.30 * fineGrain) * (0.86 + 0.28 * strata) * mix(0.68, 1.05, crevice) * aoBase * topLight;`
            )
            .replace(
                '#include <normal_fragment_maps>',
                `#include <normal_fragment_maps>
                float e = 0.0045;
                float hC = rockHeightField(vRockWPos);
                vec3 wGrad = vec3(
                    rockHeightField(vRockWPos + vec3(e, 0.0, 0.0)) - hC,
                    rockHeightField(vRockWPos + vec3(0.0, e, 0.0)) - hC,
                    rockHeightField(vRockWPos + vec3(0.0, 0.0, e)) - hC
                ) / e;
                vec3 vGrad = (viewMatrix * vec4(wGrad, 0.0)).xyz;
                vGrad -= normal * dot(vGrad, normal);
                normal = normalize(normal - vGrad * 0.055);`
            )
            .replace(
                '#include <roughnessmap_fragment>',
                `#include <roughnessmap_fragment>
                float rVar = rNoise(vRockWPos * 38.0);
                roughnessFactor = clamp(roughnessFactor * (0.70 + 0.52 * rVar), 0.32, 0.98);`
            )
    }
    mat.needsUpdate = true
}

function enhanceConcretePlanterMaterial(mat) {
    const tex = createConcreteTexture()
    mat.bumpMap = tex
    mat.bumpScale = 0.042
    mat.roughnessMap = tex
    mat.roughness = 0.90
    mat.envMapIntensity = 0.38
    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vPlanterWPos;')
            .replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                vPlanterWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            )
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vPlanterWPos;
                float cHash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }
                float cNoise(vec3 x) {
                    vec3 i = floor(x);
                    vec3 f = fract(x);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(mix(cHash(i + vec3(0,0,0)), cHash(i + vec3(1,0,0)), f.x),
                            mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
                        mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x),
                            mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y),
                        f.z
                    );
                }`
            )
            .replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float stuccoGrain = cNoise(vPlanterWPos * 36.0) * 0.6 + cNoise(vPlanterWPos * 95.0) * 0.4;
                float rainStreak = cNoise(vec3(vPlanterWPos.x * 8.0, vPlanterWPos.y * 1.4, vPlanterWPos.z * 8.0));
                float contactAo = mix(0.64, 1.0, smoothstep(0.03, 0.46, vPlanterWPos.y));
                diffuseColor.rgb *= contactAo * (0.86 + 0.24 * stuccoGrain) * (0.88 + 0.20 * rainStreak);`
            )
            .replace(
                '#include <normal_fragment_maps>',
                `#include <normal_fragment_maps>
                float cH = cNoise(vPlanterWPos * 55.0);
                vec3 cdPdx = dFdx(vPlanterWPos);
                vec3 cdPdy = dFdy(vPlanterWPos);
                float cdhdx = dFdx(cH);
                float cdhdy = dFdy(cH);
                vec3 cGrad = normalize(cross(normal, cdPdy) * cdhdx + cross(cdPdx, normal) * cdhdy + vec3(1e-5));
                normal = normalize(normal - cGrad * min(0.35, length(vec2(cdhdx, cdhdy)) * 12.0));`
            )
    }
    mat.needsUpdate = true
}

let grassTuftGeo = null
let grassTuftMat = null
function createGrassTuftCluster(center, radiusX, radiusZ, bladeCount = 150, seedBase = 71) {
    if (!grassTuftGeo) {
        grassTuftGeo = new THREE.PlaneGeometry(0.032, 0.28, 1, 4)
        grassTuftGeo.translate(0, 0.14, 0)
        const pos = grassTuftGeo.attributes.position
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i)
            const t = y / 0.28
            // Taper width toward tip and arch outward
            pos.setX(i, pos.getX(i) * (1 - t * 0.85))
            pos.setZ(i, t * t * 0.07)
        }
        grassTuftGeo.computeVertexNormals()
    }
    if (!grassTuftMat) {
        grassTuftMat = new THREE.MeshStandardMaterial({
            color: 0x4c7c2b,
            roughness: 0.78,
            metalness: 0.0,
            side: THREE.DoubleSide
        })
    }

    const mesh = new THREE.InstancedMesh(grassTuftGeo, grassTuftMat, bladeCount)
    mesh.castShadow = true
    mesh.receiveShadow = true
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    let seed = seedBase
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    for (let i = 0; i < bladeCount; i++) {
        const a = rand() * Math.PI * 2
        const r = Math.sqrt(rand())
        dummy.position.set(
            center.x + Math.cos(a) * r * radiusX,
            center.y - 0.03,
            center.z + Math.sin(a) * r * radiusZ
        )
        dummy.rotation.set((rand() - 0.2) * 0.55, rand() * Math.PI * 2, (rand() - 0.5) * 0.35)
        const s = 0.65 + rand() * 0.75
        dummy.scale.set(s, s * (0.8 + rand() * 0.5), s)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        col.setHSL(0.25 + (rand() - 0.5) * 0.05, 0.48 + rand() * 0.18, 0.24 + rand() * 0.16)
        mesh.setColorAt(i, col)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    return mesh
}

// Monuments modelled in Blender and exported as .glb with their procedural materials baked to textures.
// Footprints are in model space (Blender X / -Y) and are used to keep grass, trees and walkers off them.
//  - kananatas: rock planter on a diagonal-paving pad (kananatas.blend)
//  - kiriatas:  rock planter + flagpole on a teardrop paving pad (batukiriatas.blend)
//  - fasor:     outdoor fitness area (octagonal paving + red pull-up floor + black pillar), right lawn
//               beside the lake path's right waist (fasor.blend)

export const MONUMENTS = [
    {
        name: 'Monument_Kananatas',
        url: '/models/monument/kananatas.glb',
        placement: { x: -33, z: -109.5, yaw: THREE.MathUtils.degToRad(44) },
        // paving pad + curb, with a little margin for grass & trees
        rect: { minX: -7.6, maxX: 6.5, minZ: -3.9, maxZ: 4.7 }
    },
    {
        name: 'Monument_Kiriatas',
        url: '/models/monument/kiriatas.glb',
        placement: { x: 31.5, z: -109, yaw: 0 },
        // convex outline of the curb
        polygons: [[
            [-11.1, -0.9], [-10.7, -1.8], [2.7, -5.2], [3.9, -5.3], [5, -5.1], [6.1, -4.5],
            [6.9, -3.6], [7.5, -2.6], [7.7, -1.4], [7.1, 2.5], [6.8, 3.6], [6.2, 4.5],
            [5.3, 5.2], [4.4, 5.7], [3.3, 5.9], [2.2, 5.8], [-10.3, 0.5], [-11, -0.2]
        ]]
    },
    {
        // playground (jungle_gym.glb, 8.9 x 4.6 m) in the lake's left waist, between the bank and the lake path
        // (the path swings out around it, see leftWaistSwing in paths.js). Like the real park: a right-triangle
        // pad with a light concrete curb, right angle by the water, one leg along the shore, the long side
        // facing the path. Rear slides (model -z) point at the lake, the front faces the path.
        name: 'Playground',
        url: '/models/monument/jungle_gym.glb',
        placement: { x: -22.5, z: -58.45, yaw: -Math.PI / 2 },
        pad: {
            // model space; world corners: (-19.6, -65) by the water, (-19.6, -44.5) along the shore, (-32, -65)
            // (rounded well inside the lake path). The access stairs come down at the model's -x end, so the pad
            // runs ~2 m past their foot.
            points: [[-6.55, -2.9], [13.95, -2.9], [-6.55, 9.5]],
            // per corner, same order as points: the right angle stays tighter so the gym's corner stays on the paving;
            // the big radius past the slides blunts that long tip (moving the corner in would clip the slides)
            cornerRadius: [2.2, 10, 4.5],
            // like the real playground: paving inside a low raised curb, then a wide flat concrete border.
            // Border width per edge (shore, slanted side facing the path, stairs side); narrow on the
            // shore side so it stays off the lake bank.
            borderWidth: [0.2, 0.9, 0.7],
            curbWidth: 0.15,
            curbHeight: 0.12,
            borderHeight: 0.06,
            pavingHeight: 0.05
        }
    },
    {
        name: 'Fasor',
        url: '/models/monument/fasor.glb',
        // right lawn next to the lake path's right waist, turned 180° from the first fit (yaw 25° -> 205°)
        placement: { x: 27, z: -56.5, yaw: THREE.MathUtils.degToRad(205) },
        polygons: [
            // octagonal paving + concrete border (and the pillar's base)
            [[-10.4, -1.6], [-6.6, -4.7], [6.6, -4.7], [9.9, -2.1], [9.9, 2.8], [8.3, 5.3], [6.6, 6], [-7.1, 6], [-10.4, 3.1]],
            // red pull-up floor with the three bars
            [[-3.6, -11.5], [8.4, -11.5], [8.4, -6.1], [-3.6, -6.1]]
        ]
    }
]

function toLocal({ x: px, z: pz, yaw }, x, z) {
    const dx = x - px
    const dz = z - pz
    const c = Math.cos(-yaw)
    const s = Math.sin(-yaw)
    return [dx * c + dz * s, -dx * s + dz * c]
}

// signed distance to a convex polygon (either winding); negative inside
function polygonDistance(poly, x, z) {
    let inside = true
    let sign = 0
    let minD = Infinity
    for (let i = 0; i < poly.length; i++) {
        const [ax, az] = poly[i]
        const [bx, bz] = poly[(i + 1) % poly.length]
        const ex = bx - ax
        const ez = bz - az
        const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)))
        minD = Math.min(minD, Math.hypot(x - ax - t * ex, z - az - t * ez))
        const side = Math.sign(ex * (z - az) - ez * (x - ax))
        if (side !== 0) {
            if (sign === 0) sign = side
            else if (side !== sign) inside = false
        }
    }
    return inside ? -minD : minD
}

function isOn(m, x, z, margin) {
    const [lx, lz] = toLocal(m.placement, x, z)
    if (m.pad && !m.polygons) m = { ...m, polygons: [padOutline(m.pad)] }
    if (m.rect) {
        const r = m.rect
        return lx > r.minX - margin && lx < r.maxX + margin && lz > r.minZ - margin && lz < r.maxZ + margin
    }
    for (const poly of m.polygons) if (polygonDistance(poly, lx, lz) < margin + 0.3) return true
    return false
}

export function isOnMonument(x, z, margin = 0) {
    for (const m of MONUMENTS) if (isOn(m, x, z, margin)) return true
    return false
}

// polygon with rounded corners as a THREE.Shape (points are [x, z]; shape y = -z so rotateX(-90°) lands on the ground)
function roundedPolygonShape(points, r) {
    const shape = new THREE.Shape()
    const n = points.length
    for (let i = 0; i < n; i++) {
        const prev = points[(i + n - 1) % n]
        const cur = points[i]
        const next = points[(i + 1) % n]
        const toPrev = new THREE.Vector2(prev[0] - cur[0], prev[1] - cur[1])
        const toNext = new THREE.Vector2(next[0] - cur[0], next[1] - cur[1])
        const k = Math.min(Array.isArray(r) ? r[i] : r, toPrev.length() / 2, toNext.length() / 2)
        toPrev.normalize().multiplyScalar(k)
        toNext.normalize().multiplyScalar(k)
        const sx = cur[0] + toPrev.x
        const sz = cur[1] + toPrev.y
        if (i === 0) shape.moveTo(sx, -sz)
        else shape.lineTo(sx, -sz)
        shape.quadraticCurveTo(cur[0], -cur[1], cur[0] + toNext.x, -(cur[1] + toNext.y))
    }
    shape.closePath()
    return shape
}

// shrink a convex polygon by moving every edge inward by d (a number, or one per edge i -> i+1; negative grows it)
function insetPolygon(points, d) {
    const n = points.length
    let area = 0
    for (let i = 0; i < n; i++) {
        const [ax, az] = points[i]
        const [bx, bz] = points[(i + 1) % n]
        area += ax * bz - bx * az
    }
    const sign = Math.sign(area) // inward normal side depends on winding
    const lines = points.map(([ax, az], i) => {
        const [bx, bz] = points[(i + 1) % n]
        const len = Math.hypot(bx - ax, bz - az)
        const nx = (-(bz - az) / len) * sign
        const nz = ((bx - ax) / len) * sign
        const di = Array.isArray(d) ? d[i] : d
        return { px: ax + nx * di, pz: az + nz * di, dx: bx - ax, dz: bz - az }
    })
    return lines.map((l1, i) => {
        const l0 = lines[(i + n - 1) % n]
        const den = l0.dx * l1.dz - l0.dz * l1.dx
        const t = ((l1.px - l0.px) * l1.dz - (l1.pz - l0.pz) * l1.dx) / den
        return [l0.px + l0.dx * t, l0.pz + l0.dz * t]
    })
}

// extrude a flat shape upward from y = 0; uvScale = metres per texture repeat, uvAngle rotates the pattern
function extrudeFlat(shape, height, uvScale, uvAngle = 0) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 12 })
    geo.rotateX(-Math.PI / 2) // shape y = -z, extrusion goes up from y = 0
    const pos = geo.attributes.position
    const uv = new Float32Array(pos.count * 2)
    const c = Math.cos(uvAngle)
    const s = Math.sin(uvAngle)
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        uv[i * 2] = (x * c - z * s) / uvScale
        uv[i * 2 + 1] = (x * s + z * c) / uvScale
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return geo
}

// grey square blocks laid in straight rows with salmon-pink blocks in stepped 2x2 clusters,
// like the real playground's paving (reference photos)
function createPlaygroundPavingTexture() {
    const blocks = 24 // the pink pattern repeats every 12 blocks, so 24 tiles seamlessly
    const px = 24
    const size = blocks * px
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#5f5d5a' // joints
    ctx.fillRect(0, 0, size, size)
    let seed = 4242
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    const grey = new THREE.Color(0x9c9c9a)
    const pink = new THREE.Color(0xd38f86)
    const joint = 2
    for (let j = 0; j < blocks; j++) {
        for (let i = 0; i < blocks; i++) {
            const ci = i >> 1
            const cj = j >> 1
            // stepped diagonal runs of 2x2 pink clusters, broken into short segments
            const isPink = (ci + cj) % 6 === 0 && (((ci - cj) % 12) + 12) % 12 < 8
            const col = (isPink ? pink : grey).clone().offsetHSL(0, 0, (rand() - 0.5) * (isPink ? 0.06 : 0.09))
            ctx.fillStyle = `#${col.getHexString()}`
            ctx.fillRect(i * px + joint / 2, j * px + joint / 2, px - joint, px - joint)
        }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
}

const padRadii = ({ points, cornerRadius = 0.8 }) =>
    points.map((_, i) => (Array.isArray(cornerRadius) ? cornerRadius[i] : cornerRadius))

// outer edge of the concrete border (pad.points is the outer edge of the curb)
function padOutline(pad) {
    return pad.borderWidth ? insetPolygon(pad.points, [pad.borderWidth].flat().map((w) => -w)) : pad.points
}

let padMaterials
// playground pad, outside in: flat concrete border -> low raised curb -> block paving
function buildPad(pad) {
    const { points, curbWidth = 0.15, curbHeight = 0.12, borderHeight = 0.06, pavingHeight = 0.05 } = pad
    padMaterials ??= {
        // plain colour, not createConcreteTexture(): that one is dark grey (#7c7b74) and the border is pale in the photos
        border: new THREE.MeshStandardMaterial({ color: 0xcdcbc5, roughness: 0.92, metalness: 0 }),
        curb: new THREE.MeshStandardMaterial({ color: 0xaeaca6, roughness: 0.9, metalness: 0 }),
        paving: new THREE.MeshStandardMaterial({ map: createPlaygroundPavingTexture(), roughness: 0.88, metalness: 0 })
    }
    const radii = padRadii(pad)
    const ring = (outer, outerR, inner, innerR) => {
        const shape = roundedPolygonShape(outer, outerR)
        shape.holes.push(roundedPolygonShape(inner, innerR))
        return shape
    }
    const inner = insetPolygon(points, curbWidth)
    const innerRadii = radii.map((r) => Math.max(r - curbWidth, 0.1))

    const group = new THREE.Group()
    group.name = 'Pad'
    const meshes = [
        // 2.88 m per paving repeat = 24 blocks of 12 cm, rows parallel to the shore side
        new THREE.Mesh(extrudeFlat(roundedPolygonShape(inner, innerRadii), pavingHeight, 2.88), padMaterials.paving),
        new THREE.Mesh(extrudeFlat(ring(points, radii, inner, innerRadii), curbHeight, 1.5), padMaterials.curb)
    ]
    if (pad.borderWidth) {
        const widths = [pad.borderWidth].flat()
        const outer = padOutline(pad)
        // grow each corner's radius by the wider of its two borders so the outline stays concentric-ish
        const outerRadii = radii.map((r, i) => r + Math.max(widths[i % widths.length], widths[(i + points.length - 1) % widths.length]))
        meshes.push(new THREE.Mesh(extrudeFlat(ring(outer, outerRadii, points, radii), borderHeight, 2), padMaterials.border))
    }
    for (const m of meshes) {
        m.receiveShadow = true
        group.add(m)
    }
    return group
}

function createMonumentPhysicalLighting() {
    ensureRectAreaLights()
    const rig = new THREE.Group()
    rig.name = 'Monument_Physical_Lighting'

    // 1. Physical Sky-Dome Key Area Light (cosine-weighted solid-angle diffuse & specular highlights)
    const skyArea = new THREE.RectAreaLight(0xfff5e8, 3.6, 8.5, 5.5)
    skyArea.position.set(1.8, 7.6, 4.8)
    skyArea.lookAt(0.0, 2.2, -0.4)
    rig.add(skyArea)

    // 2. Physical Ground-Bounce Radiosity (warm light reflected off the paving pad)
    const groundBounce = new THREE.RectAreaLight(0xd9c2ae, 1.4, 7.5, 2.5)
    groundBounce.position.set(0.2, 0.25, 3.4)
    groundBounce.lookAt(0.2, 2.4, -0.3)
    rig.add(groundBounce)

    return {
        rig,
        setGlow() {}
    }
}

function loadMonument({ name, url, placement, scale = 1, pad }, onLoaded) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(placement.x, 0, placement.z)
    group.rotation.y = placement.yaw
    if (pad) group.add(buildPad(pad))

    let lightingRig = null
    if (name === 'Monument_Kiriatas' || name === 'Monument_Kananatas') {
        lightingRig = createMonumentPhysicalLighting()
        group.add(lightingRig.rig)
    }

    new GLTFLoader()
        .loadAsync(url)
        .then((gltf) => {
            gltf.scene.scale.setScalar(scale)
            if (pad) gltf.scene.position.y = pad.pavingHeight ?? 0.05 // stand on the paving
            const extraDecor = []
            gltf.scene.traverse((o) => {
                if (!o.isMesh) return
                o.castShadow = true
                o.receiveShadow = true
                if (o.material.map) o.material.map.anisotropy = 8
                // replace baked paving pad with the jogging track's interlocking paving material
                if (o.name === 'Paving_Blocks') {
                    const pos = o.geometry.attributes.position
                    const uvs = new Float32Array(pos.count * 2)
                    const sx = o.scale.x || 1
                    const sz = o.scale.z || 1
                    for (let i = 0; i < pos.count; i++) {
                        uvs[i * 2] = pos.getX(i) * sx * 0.22
                        uvs[i * 2 + 1] = pos.getZ(i) * sz * 0.22
                    }
                    const uvAttr = new THREE.BufferAttribute(uvs, 2)
                    o.geometry.setAttribute('uv', uvAttr)
                    if (o.geometry.attributes.uv1) o.geometry.setAttribute('uv1', uvAttr)
                    if (o.geometry.attributes.uv2) o.geometry.setAttribute('uv2', uvAttr)
                    o.material = getJoggingPavingMaterial()
                }
                if (o.name.startsWith('Rock_')) {
                    const isMainSpire = o.name === 'Rock_Center_Main' || o.name === 'Rock_Main_Spire'
                    enhanceRockMaterial(o.material, isMainSpire ? 0.48 : 0.74)
                }
                if (o.name === 'Planter_Wall' || o.name === 'Paving_Curb') {
                    enhanceConcretePlanterMaterial(o.material)
                }
                if (o.name === 'Planter_Gravel_Fill' || o.name === 'Planter_Soil') {
                    const gBump = getGravelBumpTexture()
                    o.material.bumpMap = gBump
                    o.material.bumpScale = 0.048
                    o.material.roughnessMap = gBump
                    o.material.roughness = 0.94
                    o.material.needsUpdate = true
                }
                if (o.name === 'Sign_Text_Lighting_By' || o.name === 'Sign_Lighting_Back') {
                    o.material.color.setHex(0xdce2ea)
                    o.material.metalness = 0.88
                    o.material.roughness = 0.22
                    o.material.needsUpdate = true
                }
                if (o.name === 'Sign_Lighting_Front') {
                    o.material.color.setHex(0x1b1d22)
                    o.material.metalness = 0.35
                    o.material.roughness = 0.28
                    o.material.needsUpdate = true
                }
                if (o.name === 'Sign_Text_Brand' || o.name === 'Sign_Panasonic_Front') {
                    o.material.color.setHex(0x1055e8)
                    o.material.metalness = 0.12
                    o.material.roughness = 0.24
                    o.material.needsUpdate = true
                }
                if (o.name === 'Sign_Panasonic_Side') {
                    o.material.color.setHex(0x061b52)
                    o.material.metalness = 0.15
                    o.material.roughness = 0.38
                    o.material.needsUpdate = true
                }
                if (o.name === 'Plant_Clump_1' || o.name === 'Plant_Clump_2') {
                    o.visible = false
                    const seed = o.name === 'Plant_Clump_1' ? 101 : 202
                    extraDecor.push(createGrassTuftCluster(o.position, 0.55, 0.35, 150, seed))
                }
                // leaves are flat cards lying on the ground
                if (o.name.startsWith('Fallen_Leaves') || o.name.startsWith('Leaf_')) {
                    o.castShadow = false
                    o.material.side = THREE.DoubleSide
                }
            })
            for (const d of extraDecor) gltf.scene.add(d)
            group.add(gltf.scene)
            group.dispatchEvent({ type: 'loaded' })
            onLoaded?.()
        })
        .catch((err) => console.error(`${name} model failed to load:`, err))

    return { group, setGlow: (v) => lightingRig?.setGlow(v) }
}

export function createMonuments() {
    const group = new THREE.Group()
    group.name = 'Monuments'
    const glowHandlers = []
    for (const m of MONUMENTS) {
        const res = loadMonument(m, () => group.dispatchEvent({ type: 'loaded' }))
        group.add(res.group)
        glowHandlers.push(res.setGlow)
    }
    group.setLampGlow = (v) => {
        for (const fn of glowHandlers) fn(v)
    }
    return group
}
