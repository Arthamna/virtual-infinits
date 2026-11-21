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

function loadMonument({ name, url, placement }) {
    const group = new THREE.Group()
    group.name = name
    group.position.set(placement.x, 0, placement.z)
    group.rotation.y = placement.yaw

    new GLTFLoader()
        .loadAsync(url)
        .then((gltf) => {
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
