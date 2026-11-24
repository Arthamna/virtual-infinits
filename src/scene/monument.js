import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createConcreteTexture } from './textures'

// Monuments modelled in Blender and exported as .glb with their procedural materials baked to textures.
// Footprints are in model space (Blender X / -Y) and are used to keep grass, trees and walkers off them.
//  - kananatas: rock planter on a diagonal-paving pad, far-right lawn corner (kananatas.blend)
//  - kiriatas:  rock planter + flagpole on a teardrop paving pad, far-left lawn corner (batukiriatas.blend)
//  - fasor:     outdoor fitness area (octagonal paving + red pull-up floor + black pillar), right lawn
//               beside the lake path's right waist (fasor.blend)

export const MONUMENTS = [
    {
        name: 'Monument_Kananatas',
        url: '/models/monument/kananatas.glb',
        placement: { x: 31.5, z: -109, yaw: 0 },
        // paving pad + curb, with a little margin for grass & trees
        rect: { minX: -7.6, maxX: 6.5, minZ: -3.9, maxZ: 4.7 }
    },
    {
        name: 'Monument_Kiriatas',
        url: '/models/monument/kiriatas.glb',
        // fitted between the lake path's top-left bend and the perimeter path corner,
        // planter front (sign) facing the lake path
        placement: { x: -33, z: -109.5, yaw: THREE.MathUtils.degToRad(70) },
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
            // per corner, same order as points: the right angle stays tighter so the gym's corner stays on the paving
            cornerRadius: [2.2, 5.5, 4.5],
            // same proportions as the monuments' pads
            curbWidth: 0.2,
            curbHeight: 0.1,
            pavingHeight: 0.04
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
    if (m.pad && !m.polygons) m = { ...m, polygons: [m.pad.points] }
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

// shrink a convex polygon by moving every edge inward by d
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
        return { px: ax + nx * d, pz: az + nz * d, dx: bx - ax, dz: bz - az }
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

// small square blocks in mixed pink / grey / beige with grey joints, like the paving baked into the monument
// models (kananatas, kiriatas); laid on the diagonal by rotating the UVs 45° in buildPad
function createMonumentPavingTexture() {
    const tiles = 16
    const px = 32
    const size = tiles * px
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#6f6a66' // joints
    ctx.fillRect(0, 0, size, size)
    // colours sampled by eye from Paving_Blocks_col (weights = how often each shows up)
    const palette = [
        ['#c99a8f', 3], ['#d6a99d', 2], ['#b9b8b6', 3], ['#a3a5aa', 2], ['#85888f', 2], ['#d3c7b3', 2]
    ]
    const total = palette.reduce((a, [, w]) => a + w, 0)
    let seed = 1337
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    const joint = 3
    for (let j = 0; j < tiles; j++) {
        for (let i = 0; i < tiles; i++) {
            let r = rand() * total
            let k = 0
            while ((r -= palette[k][1]) > 0) k++
            const col = new THREE.Color(palette[k][0]).offsetHSL(0, 0, (rand() - 0.5) * 0.05)
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

let padMaterials
// monument-style pad: diagonal block paving inside a raised light concrete curb ring
// (heights match kananatas / kiriatas: paving top 0.04 m, curb top 0.10 m)
function buildPad({ points, cornerRadius = 0.8, curbWidth = 0.2, curbHeight = 0.1, pavingHeight = 0.04 }) {
    padMaterials ??= {
        curb: new THREE.MeshStandardMaterial({ map: createConcreteTexture(), color: 0xcfcfca, roughness: 0.9, metalness: 0 }),
        paving: new THREE.MeshStandardMaterial({ map: createMonumentPavingTexture(), roughness: 0.88, metalness: 0 })
    }
    const radii = points.map((_, i) => (Array.isArray(cornerRadius) ? cornerRadius[i] : cornerRadius))
    const inner = insetPolygon(points, curbWidth)
    const innerRadii = radii.map((r) => Math.max(r - curbWidth, 0.1))

    const ringShape = roundedPolygonShape(points, radii)
    ringShape.holes.push(roundedPolygonShape(inner, innerRadii))

    const group = new THREE.Group()
    group.name = 'Pad'
    const curb = new THREE.Mesh(extrudeFlat(ringShape, curbHeight, 1.5), padMaterials.curb)
    // 16 blocks per repeat, 0.2 m blocks -> 3.2 m per repeat
    const paving = new THREE.Mesh(extrudeFlat(roundedPolygonShape(inner, innerRadii), pavingHeight, 3.2, Math.PI / 4), padMaterials.paving)
    for (const m of [curb, paving]) {
        m.receiveShadow = true
        group.add(m)
    }
    return group
}

function loadMonument({ name, url, placement, scale = 1, pad }) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(placement.x, 0, placement.z)
    group.rotation.y = placement.yaw
    if (pad) group.add(buildPad(pad))

    new GLTFLoader()
        .loadAsync(url)
        .then((gltf) => {
            gltf.scene.scale.setScalar(scale)
            if (pad) gltf.scene.position.y = pad.pavingHeight ?? 0.04 // stand on the paving
            gltf.scene.traverse((o) => {
                if (!o.isMesh) return
                o.castShadow = true
                o.receiveShadow = true
                if (o.material.map) o.material.map.anisotropy = 8
                // leaves are flat cards lying on the ground
                if (o.name.startsWith('Fallen_Leaves')) {
                    o.castShadow = false
                    o.material.side = THREE.DoubleSide
                }
            })
            group.add(gltf.scene)
            group.dispatchEvent({ type: 'loaded' })
        })
        .catch((err) => console.error(`${name} model failed to load:`, err))

    return group
}

export function createMonuments() {
    const group = new THREE.Group()
    group.name = 'Monuments'
    for (const m of MONUMENTS) group.add(loadMonument(m))
    return group
}
