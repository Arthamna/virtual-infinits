import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Trees and bushes from the user's models in /3d (served at /models/3d by webpack).
// Everything is drawn with one InstancedMesh per model part.

// hand-placed feature trees at their modelled size, both on the lake's narrow waist:
// the biggest of the four weeping willows (~24 m) on the left bank, tree_gn (~21 m) on the right bank
const FEATURE_TREES = [
    { file: 'weeping willow.glb', node: 'Armature_255', x: -20.5, z: -55, clear: 12 },
    { file: 'tree_gn.glb', node: 'TreeGen', x: 9.3, z: -57.5, clear: 11 }
]
const SMALL_TREE_COUNT = 110
const BUSH_COUNT = 150

// the elm and oak collections hold several trees, each split into a structure + foliage node pair
const elm = (a, b) => ['high_detail_elm_tree_collection.glb', [`structure.${a}`, `foliage.${b}`], 14, 0.5]
const oak = (a, b) => ['mighty_oak_trees.glb', [a, b], 16, 0.4]

// [file, node name(s) or null for the whole scene, target height m, pick weight]
// weights favour the light models; the oaks (~100-145k tris each) and elms (~50k) stay rarer
const SMALL_TREES = [
    ['fun tree.glb', null, 10, 3],
    ['fun tree 1.glb', null, 9, 3],
    ['fun tree 2.glb', null, 10, 3],
    elm('002_1', '002_2'),
    elm('005_3', '005_4'),
    elm('006_5', '006_6'),
    elm('007_7', '007_8'),
    elm('008_9', '008_10'),
    elm('009_11', '009_12'),
    elm('010_13', '010_14'),
    oak('structure_2', 'foliage_3'),
    oak('structure.001_4', 'foliage.001_5'),
    oak('structure.002_6', 'foliage.002_7'),
    ['focal_tree.glb', 'TreeGen', 12, 1],
    ['bush_1.glb', 'Lilac_single_tree_1_LOD0', 5, 1],
    ['bush_1.glb', 'Lilac_single_tree_2_LOD0', 5, 1],
    ['bush_1.glb', 'Lilac_single_tree_3_LOD0', 5, 1]
]
// grass.glb is a 13 m wide clump (1.2 m grass, 2 m reeds); scaled down to ankle-high tufts along the lake path
const TRAIL_GRASS = { file: 'grass.glb', scale: 0.22, spacing: 2.2 }

// bushes use LOD1 (~half the triangles of LOD0), indistinguishable at ~1.5 m
const BUSHES = [
    ['bush_1.glb', 'Lilac_bush_1_LOD1', 1.8, 1],
    ['bush_1.glb', 'Lilac_bush_2_LOD1', 1.8, 1],
    ['bush_1.glb', 'Lilac_bush_3_LOD1', 1.6, 1],
    ['bush_1.glb', 'Lilac_small_bush_1_LOD1', 1.1, 1],
    ['bush_1.glb', 'Lilac_small_bush_2_LOD1', 1.0, 1],
    ['bush_1.glb', 'Lilac_small_bush_3_LOD1', 1.1, 1],
    ['bush_1.glb', 'Lilac_sapling_1_LOD1', 1.4, 1],
    ['bush_1.glb', 'Lilac_sapling_2_LOD1', 1.4, 1],
    ['bush_1.glb', 'Lilac_sapling_3_LOD1', 1.4, 1]
]

// focal_tree.glb requires KHR_materials_pbrSpecularGlossiness, which three's GLTFLoader dropped;
// map its diffuse onto the standard material so it isn't rendered as untextured black metal.
export function specGlossPlugin(parser) {
    return {
        name: 'KHR_materials_pbrSpecularGlossiness',
        extendMaterialParams(materialIndex, params) {
            const ext = parser.json.materials[materialIndex].extensions?.[this.name]
            if (!ext) return Promise.resolve()
            params.metalness = 0
            params.roughness = 1 - (ext.glossinessFactor ?? 0.2)
            if (ext.diffuseFactor) {
                params.color = new THREE.Color().fromArray(ext.diffuseFactor)
                params.opacity = ext.diffuseFactor[3]
            }
            return ext.diffuseTexture
                ? parser.assignTexture(params, 'map', ext.diffuseTexture, THREE.SRGBColorSpace)
                : Promise.resolve()
        }
    }
}

// mesh parts of a model, re-based so the trunk base sits at the origin
export function buildTemplate(scene, nodeNames) {
    scene.updateMatrixWorld(true)
    const roots = nodeNames == null
        ? [scene]
        : [].concat(nodeNames).map((name) => {
              const node = scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name))
              if (!node) throw new Error(`Node ${name} not found`)
              return node
          })
    const meshes = []
    roots.forEach((r) => r.traverse((o) => o.isMesh && meshes.push(o)))

    // skinned meshes (the willow) get their rest pose baked into plain geometry so they can be instanced
    const geometryOf = new Map()
    const v = new THREE.Vector3()
    for (const o of meshes) {
        if (!o.isSkinnedMesh) {
            geometryOf.set(o, o.geometry)
            continue
        }
        const g = o.geometry.clone()
        const pos = g.attributes.position
        for (let i = 0; i < pos.count; i++) {
            o.applyBoneTransform(i, v.fromBufferAttribute(pos, i))
            pos.setXYZ(i, v.x, v.y, v.z)
        }
        g.deleteAttribute('skinIndex')
        g.deleteAttribute('skinWeight')
        geometryOf.set(o, g)
    }
    const isFoliage = (o) => o.material.transparent || o.material.alphaTest > 0
    const eachWorldVertex = (fn, list = meshes) => {
        for (const o of list) {
            const pos = geometryOf.get(o).attributes.position
            for (let i = 0; i < pos.count; i++) fn(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld))
        }
    }

    const box = new THREE.Box3()
    eachWorldVertex((p) => box.expandByPoint(p))
    // models are authored with ground at y=0; focal_tree's roots reach 1.7 m below it,
    // so using the lowest vertex as ground would lift the tree into the air
    const groundY = box.min.y < 0 && box.max.y > 0 ? 0 : box.min.y
    // pivot on the trunk base (average of the lowest bark vertices), not the canopy's bbox centre,
    // so lopsided trees stand where they are placed; bark only, since some foliage droops to the ground
    const bark = meshes.filter((o) => !isFoliage(o))
    const base = new THREE.Vector3()
    let n = 0
    eachWorldVertex((p) => {
        if (p.y < groundY + 0.3) {
            base.add(p)
            n++
        }
    }, bark.length ? bark : meshes)
    if (n) base.divideScalar(n)
    else box.getCenter(base)
    const toOrigin = new THREE.Matrix4().makeTranslation(-base.x, -groundY, -base.z)

    const parts = meshes.map((o) => {
        const mat = o.material
        // blended leaves sort badly and smear AO; alpha-test them instead
        if (mat.transparent || mat.alphaTest > 0) {
            mat.transparent = false
            mat.depthWrite = true
            mat.alphaTest = 0.5
        }
        return { geometry: geometryOf.get(o), material: mat, matrix: toOrigin.clone().multiply(o.matrixWorld) }
    })
    // horizontal reach from the pivot, used to keep trail grass off the path
    const radius = Math.max(base.x - box.min.x, box.max.x - base.x, base.z - box.min.z, box.max.z - base.z)
    return { parts, height: box.max.y - groundY, radius }
}

function addInstanced(group, template, placements) {
    if (!placements.length) return
    const tmp = new THREE.Matrix4()
    for (const { geometry, material, matrix } of template.parts) {
        const inst = new THREE.InstancedMesh(geometry, material, placements.length)
        placements.forEach((m, i) => inst.setMatrixAt(i, tmp.multiplyMatrices(m, matrix)))
        inst.castShadow = true
        inst.receiveShadow = true
        inst.userData.noAO = material.alphaTest > 0
        group.add(inst)
    }
}

export function scatter({ isBlocked, lampPositions }) {
    let seed = 4711
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
    const placed = FEATURE_TREES.map(({ x, z, clear }) => ({ x, z, r: clear }))
    const fits = (x, z, clearance, spacing) => {
        if (z > -8 && Math.abs(x) < 14) return false // keep the view onto the sign open
        if (isBlocked(x, z)) return false
        for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2
            if (isBlocked(x + Math.cos(a) * clearance, z + Math.sin(a) * clearance)) return false
        }
        if (lampPositions.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 2.25)) return false
        return placed.every((p) => Math.hypot(p.x - x, p.z - z) > Math.max(spacing, p.r))
    }
    const pick = (count, clearance, spacing, r) => {
        const out = []
        for (let tries = 0; out.length < count && tries < count * 600; tries++) {
            const x = -40 + rand() * 83
            const z = -119 + rand() * 128
            if (!fits(x, z, clearance, spacing)) continue
            placed.push({ x, z, r })
            out.push({ x, z, yaw: rand() * Math.PI * 2, scale: 0.85 + rand() * 0.3, variant: rand() })
        }
        return out
    }
    return { trees: pick(SMALL_TREE_COUNT, 1.5, 5.5, 3), bushes: pick(BUSH_COUNT, 0.8, 2.2, 1.1) }
}

// clumps every `spacing` m along both path edges, pushed out so their inner side starts at the curb
export function trailGrassPlacements(edges, radius, { scale, spacing }) {
    let seed = 99
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
    const out = []
    for (const edge of edges) {
        let acc = 0
        let next = 3 // skip the ramp landings at both path ends
        let total = 0
        for (let i = 1; i < edge.length; i++) total += Math.hypot(edge[i].x - edge[i - 1].x, edge[i].z - edge[i - 1].z)
        for (let i = 1; i < edge.length; i++) {
            acc += Math.hypot(edge[i].x - edge[i - 1].x, edge[i].z - edge[i - 1].z)
            if (acc < next || acc > total - 3) continue
            const s = scale * (0.8 + rand() * 0.4)
            const off = 0.16 + radius * s * (0.85 + rand() * 0.3)
            const e = edge[i]
            out.push(
                new THREE.Matrix4().compose(
                    new THREE.Vector3(e.x + e.nx * off, -0.04, e.z + e.nz * off),
                    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
                    new THREE.Vector3(s, s, s)
                )
            )
            next = acc + spacing * (0.8 + rand() * 0.4)
        }
    }
    return out
}

export function createVegetation({ isBlocked, lampPositions, pathEdges }) {
    const group = new THREE.Group()
    const loader = new GLTFLoader()
    loader.register(specGlossPlugin)
    const spots = scatter({ isBlocked, lampPositions })
    group.userData.spots = spots

    const files = [...new Set([TRAIL_GRASS.file, ...FEATURE_TREES.map((t) => t.file), ...SMALL_TREES.map((e) => e[0]), ...BUSHES.map((e) => e[0])])]
    Promise.all(files.map((f) => loader.loadAsync(encodeURI(`/models/3d/${f}`))))
        .then((gltfs) => {
            const scenes = Object.fromEntries(files.map((f, i) => [f, gltfs[i].scene]))

            const trailGrass = buildTemplate(scenes[TRAIL_GRASS.file], null)
            addInstanced(group, trailGrass, trailGrassPlacements(pathEdges, trailGrass.radius, TRAIL_GRASS))

            for (const { file, node, x, z } of FEATURE_TREES) {
                addInstanced(group, buildTemplate(scenes[file], node), [new THREE.Matrix4().makeTranslation(x, -0.05, z)])
            }

            for (const [list, chosen] of [[SMALL_TREES, spots.trees], [BUSHES, spots.bushes]]) {
                const templates = list.map(([file, node, h, w]) => ({ ...buildTemplate(scenes[file], node), targetH: h, w }))
                const totalW = templates.reduce((sum, t) => sum + t.w, 0)
                const byTemplate = templates.map(() => [])
                for (const s of chosen) {
                    let r = s.variant * totalW
                    let t = 0
                    while (t < templates.length - 1 && (r -= templates[t].w) > 0) t++
                    const k = (templates[t].targetH * s.scale) / templates[t].height
                    byTemplate[t].push(
                        new THREE.Matrix4().compose(
                            new THREE.Vector3(s.x, -0.05, s.z),
                            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw),
                            new THREE.Vector3(k, k, k)
                        )
                    )
                }
                templates.forEach((t, i) => addInstanced(group, t, byTemplate[i]))
            }
            group.dispatchEvent({ type: 'loaded' })
        })
        .catch((err) => console.error('Vegetation models failed to load:', err))

    return group
}
