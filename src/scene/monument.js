import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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
            if (pad) gltf.scene.position.y = pad.pavingHeight ?? 0.05 // stand on the paving
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
