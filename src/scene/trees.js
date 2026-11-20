import * as THREE from 'three'
import { Tree, TreePreset } from '@dgreenheck/ez-tree'
import { configureTexture } from './textures'

class PhotoMatchedTree extends Tree {
    generateBranch(branch) {
        this._currentParentBranch = branch
        const uvStart = this.branches.uvs.length
        super.generateBranch(branch)

        // Fix ez-tree's alternating (i % 2) UVs with continuous, proportional arc-length UVs
        const segs = branch.segmentCount
        const secs = branch.sectionCount
        const uRepeat = branch.level === 0 ? 2.0 : 1.0
        const vScale = 0.16
        const baseV = branch.startV || 0
        let ptr = uvStart
        for (let i = 0; i <= secs; i++) {
            const v = baseV + (i / secs) * branch.length * vScale
            for (let j = 0; j <= segs; j++) {
                if (ptr + 1 < this.branches.uvs.length) {
                    this.branches.uvs[ptr] = (j / segs) * uRepeat
                    this.branches.uvs[ptr + 1] = v
                }
                ptr += 2
            }
        }
    }

    _spawnAtSection(BranchClass, sections, t, orientation, length, radiusScale, level, sectionCount, segmentCount, role = null) {
        const idxFloat = THREE.MathUtils.clamp(t, 0, 1) * (sections.length - 1)
        const i0 = Math.floor(idxFloat)
        const i1 = Math.min(sections.length - 1, i0 + 1)
        const alpha = idxFloat - i0

        const origin = new THREE.Vector3().lerpVectors(sections[i0].origin, sections[i1].origin, alpha)
        const parentRadius = (1 - alpha) * sections[i0].radius + alpha * sections[i1].radius
        const child = new BranchClass(
            origin,
            orientation,
            length,
            parentRadius * radiusScale,
            level,
            sectionCount,
            segmentCount
        )
        child.customRole = role
        const parent = this._currentParentBranch
        child.startV = (parent?.startV || 0) + t * (parent?.length || 0) * 0.16
        this.branchQueue.push(child)
    }

    generateChildBranches(count, level, sections) {
        const parent = this._currentParentBranch
        const terminalBranch = this.branchQueue[this.branchQueue.length - 1]
        const BranchClass = parent?.constructor || terminalBranch?.constructor

        if (level === 1 && BranchClass) {
            // Replace default terminal branch at top of short trunk with the exact V-Fork from the photo
            this.branchQueue.pop()

            // Left V-Fork Trunk: rises steeply up-left (~19 deg left of vertical)
            this._spawnAtSection(
                BranchClass,
                sections,
                0.80,
                new THREE.Euler(0.04, 0.0, 0.33),
                17.5,
                0.76,
                1,
                10,
                10,
                'leftVStem'
            )

            // Right V-Fork Trunk (main thicker stem): angles up-right (~26 deg right of vertical) to the knee
            this._spawnAtSection(
                BranchClass,
                sections,
                1.0,
                new THREE.Euler(-0.03, 0.0, -0.45),
                13.0,
                0.88,
                1,
                10,
                10,
                'rightVStem'
            )
            return
        }

        if (level === 2 && BranchClass && parent?.customRole) {
            this.branchQueue.pop()

            if (parent.customRole === 'leftVStem') {
                // 1) Crooked outer-left branch (angles left then curves up at the left edge of the photo)
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    0.68,
                    new THREE.Euler(-0.04, 0.12, 0.56),
                    18.5,
                    0.72,
                    2,
                    10,
                    8,
                    'outerLeft'
                )
                // 2) Main upper-left branch rising steeply toward the top-left crown
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    1.0,
                    new THREE.Euler(0.05, -0.08, 0.15),
                    24.0,
                    0.82,
                    2,
                    11,
                    8,
                    'upperLeft'
                )
                // 3) Inner-left upward branch filling the upper-left-center
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    0.84,
                    new THREE.Euler(-0.10, 0.18, -0.04),
                    20.0,
                    0.65,
                    2,
                    9,
                    7,
                    'innerLeft'
                )
                return
            }

            if (parent.customRole === 'rightVStem') {
                // 1) Tall Center-Vertical Main Limb rising almost straight up from the knee
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    0.86,
                    new THREE.Euler(0.03, 0.06, -0.10),
                    29.5,
                    0.84,
                    2,
                    12,
                    9,
                    'centerVertical'
                )
                // 2) Long Diagonal Right Main Limb sweeping across to the upper-right
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    1.0,
                    new THREE.Euler(-0.03, -0.06, -0.78),
                    32.0,
                    0.82,
                    2,
                    12,
                    9,
                    'rightDiagonal'
                )
                // 3) Lower-right sweeping secondary limb below the main diagonal
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    0.66,
                    new THREE.Euler(0.08, 0.16, -1.00),
                    24.5,
                    0.62,
                    2,
                    10,
                    8,
                    'lowerRight'
                )
                // 4) Mid-right back limb for natural 3D canopy volume
                this._spawnAtSection(
                    BranchClass,
                    sections,
                    0.78,
                    new THREE.Euler(-0.22, -0.22, -0.56),
                    25.5,
                    0.66,
                    2,
                    10,
                    8,
                    'midRightBack'
                )
                return
            }
        }

        super.generateChildBranches(count, level, sections)
    }
}

function configurePhotoMatchedTree(tree, { seed = 104 } = {}) {
    tree.options.seed = seed
    tree.options.type = 'deciduous'

    tree.options.bark.type = 'willow'
    tree.options.bark.tint = 0xffffff
    tree.options.bark.flatShading = false
    tree.options.bark.textured = true
    tree.options.bark.textureScale = { x: 1, y: 1 }

    // 4 levels:
    // 0 = short base trunk, 1 = V-fork trunks, 2 = long major limbs, 3 = secondary branches, 4 = fine upper twigs
    tree.options.branch.levels = 4
    tree.options.branch.length = {
        0: 9.2,
        1: 15.0,
        2: 26.0,
        3: 15.5,
        4: 8.8
    }
    tree.options.branch.radius = {
        0: 1.55,
        1: 0.85,
        2: 0.80,
        3: 0.65,
        4: 0.58
    }
    tree.options.branch.taper = {
        0: 0.16,
        1: 0.28,
        2: 0.52,
        3: 0.62,
        4: 0.72
    }
    tree.options.branch.children = {
        0: 0,
        1: 0,
        2: 4,
        3: 5
    }
    tree.options.branch.start = {
        1: 0.8,
        2: 0.7,
        3: 0.32,
        4: 0.22
    }
    tree.options.branch.angle = {
        1: 28,
        2: 30,
        3: 32,
        4: 34
    }
    tree.options.branch.gnarliness = {
        0: 0.03,
        1: 0.06,
        2: 0.10,
        3: 0.13,
        4: 0.12
    }
    tree.options.branch.twist = {
        0: 0.02,
        1: 0.05,
        2: 0.08,
        3: 0.06,
        4: 0.0
    }
    tree.options.branch.sections = {
        0: 10,
        1: 10,
        2: 11,
        3: 8,
        4: 5
    }
    tree.options.branch.segments = {
        0: 16,
        1: 12,
        2: 10,
        3: 6,
        4: 4
    }
    // Slight upward phototropism so branches reach high instead of drooping to the ground
    tree.options.branch.force = {
        direction: { x: 0.08, y: 0.99, z: 0 },
        strength: 0.012
    }

    // Crisp HD oak foliage with sharp alpha cutout matching the reference render
    tree.options.leaves.type = 'oak'
    tree.options.leaves.billboard = 'double'
    tree.options.leaves.angle = 30
    tree.options.leaves.count = 18
    tree.options.leaves.start = 0.10
    tree.options.leaves.size = 2.4
    tree.options.leaves.sizeVariance = 0.45
    tree.options.leaves.tint = 0xdcf7b8
    tree.options.leaves.alphaTest = 0.5
}

// Gentle outer-tip gravity on upper twigs: left-most twigs droop slightly down-left, right-most tips droop slightly down-right
function applyOuterTwigGravity(tree, minY, rawHeight) {
    const h = rawHeight
    const outPt = new THREE.Vector3()

    const deformPoint = (x, y, z, target) => {
        const t = THREE.MathUtils.clamp((y - minY) / h, 0, 1)
        // Only affect outer canopy tips ( keep lower V-fork and main trunks 100% rigid )
        const upperMask = THREE.MathUtils.smoothstep(t, 0.35, 0.75)

        let dx = 0
        let dy = 0
        if (x < -h * 0.08) {
            const leftExcess = (Math.abs(x) - h * 0.08) / (h * 0.45)
            dy -= Math.pow(leftExcess, 1.5) * h * 0.09 * upperMask
            dx -= Math.pow(leftExcess, 1.2) * h * 0.04 * upperMask
        } else if (x > h * 0.22) {
            const rightExcess = (x - h * 0.22) / (h * 0.5)
            dy -= Math.pow(rightExcess, 1.5) * h * 0.07 * upperMask
        }

        target.set(x + dx, y + dy, z)
    }

    const branchGeo = tree.branchesMesh?.geometry
    const branchPos = branchGeo?.attributes?.position
    if (branchPos) {
        for (let i = 0; i < branchPos.count; i++) {
            deformPoint(branchPos.getX(i), branchPos.getY(i), branchPos.getZ(i), outPt)
            branchPos.setXYZ(i, outPt.x, outPt.y, outPt.z)
        }
        branchPos.needsUpdate = true
        branchGeo.computeVertexNormals()
        branchGeo.computeBoundingBox()
        branchGeo.computeBoundingSphere()
    }

    const leafGeo = tree.leavesMesh?.geometry
    const leafPos = leafGeo?.attributes?.position
    if (leafPos) {
        const center = new THREE.Vector3()
        const newCenter = new THREE.Vector3()
        const rel = new THREE.Vector3()
        const zAxis = new THREE.Vector3(0, 0, 1)
        const tiltQuat = new THREE.Quaternion()

        for (let i = 0; i + 3 < leafPos.count; i += 4) {
            center.set(0, 0, 0)
            for (let k = 0; k < 4; k++) {
                center.x += leafPos.getX(i + k)
                center.y += leafPos.getY(i + k)
                center.z += leafPos.getZ(i + k)
            }
            center.multiplyScalar(0.25)

            deformPoint(center.x, center.y, center.z, newCenter)

            const sideNorm = THREE.MathUtils.clamp(newCenter.x / (h * 0.45), -1, 1)
            tiltQuat.setFromAxisAngle(zAxis, -sideNorm * 0.32)

            for (let k = 0; k < 4; k++) {
                rel.set(
                    leafPos.getX(i + k) - center.x,
                    leafPos.getY(i + k) - center.y,
                    leafPos.getZ(i + k) - center.z
                )
                rel.applyQuaternion(tiltQuat).add(newCenter)
                leafPos.setXYZ(i + k, rel.x, rel.y, rel.z)
            }
        }
        leafPos.needsUpdate = true
        leafGeo.computeBoundingBox()
        leafGeo.computeBoundingSphere()
    }
}

function upgradeBarkToPBR(tree) {
    const oldMat = tree.branchesMesh?.material
    const geo = tree.branchesMesh?.geometry
    if (!oldMat || !geo) return

    // Provide uv2 so Three.js applies aoMap properly into bark crevices
    if (geo.attributes.uv && !geo.attributes.uv2) {
        geo.setAttribute('uv2', geo.attributes.uv)
    }
    geo.computeTangents()

    const configureTex = (tex, isColor = false) => {
        if (!tex) return null
        return configureTexture(tex, { isColor, repeat: true })
    }

    const pbrBarkMat = new THREE.MeshStandardMaterial({
        name: 'branches_pbr',
        color: new THREE.Color(0xc8beb0),
        map: configureTex(oldMat.map, true),
        normalMap: configureTex(oldMat.normalMap, false),
        normalScale: new THREE.Vector2(2.8, 2.8),
        roughnessMap: configureTex(oldMat.roughnessMap, false),
        roughness: 0.9,
        metalness: 0.02,
        aoMap: configureTex(oldMat.aoMap, false),
        aoMapIntensity: 0.9,
        envMapIntensity: 0.75
    })

    oldMat.dispose()
    tree.branchesMesh.material = pbrBarkMat
}


function applyLakesideSCurve(tree, minY, rawHeight, reach = 0.50) {
    const h = rawHeight
    const r = reach / 0.52
    const spine = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.04 * h * r, 0.16 * h, 0),
        new THREE.Vector3(0.20 * h * r, 0.34 * h, 0),
        new THREE.Vector3(0.44 * h * r, 0.50 * h, 0),
        new THREE.Vector3(0.54 * h * r, 0.72 * h, 0),
        new THREE.Vector3(0.52 * h * r, 1.00 * h, 0)
    ])

    const UP = new THREE.Vector3(0, 1, 0)
    const SAMPLES = 48
    const samplePoints = []
    const sampleQuats = []
    for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES
        const pt = spine.getPointAt(u)
        pt.y += minY
        const tan = spine.getTangentAt(u).normalize()
        samplePoints.push(pt)
        sampleQuats.push(new THREE.Quaternion().setFromUnitVectors(UP, tan))
    }

    const tmpPt = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpOffset = new THREE.Vector3()
    const tmpCenter = new THREE.Vector3()
    const tmpVert = new THREE.Vector3()

    const sampleSpine = (y) => {
        const t = THREE.MathUtils.clamp((y - minY) / rawHeight, 0, 1)
        const f = t * SAMPLES
        const i0 = Math.min(SAMPLES - 1, Math.floor(f))
        const alpha = f - i0
        tmpPt.copy(samplePoints[i0]).lerp(samplePoints[i0 + 1], alpha)
        tmpQuat.copy(sampleQuats[i0]).slerp(sampleQuats[i0 + 1], alpha)
    }

    const branchGeo = tree.branchesMesh?.geometry
    const branchPos = branchGeo?.attributes?.position
    if (branchPos) {
        for (let i = 0; i < branchPos.count; i++) {
            const x = branchPos.getX(i)
            const y = branchPos.getY(i)
            const z = branchPos.getZ(i)
            sampleSpine(y)
            tmpOffset.set(x, 0, z).applyQuaternion(tmpQuat).add(tmpPt)
            branchPos.setXYZ(i, tmpOffset.x, tmpOffset.y, tmpOffset.z)
        }
        branchPos.needsUpdate = true
        branchGeo.computeVertexNormals()
        branchGeo.computeBoundingBox()
        branchGeo.computeBoundingSphere()
    }

    const leafGeo = tree.leavesMesh?.geometry
    const leafPos = leafGeo?.attributes?.position
    if (leafPos) {
        for (let i = 0; i + 3 < leafPos.count; i += 4) {
            tmpCenter.set(0, 0, 0)
            for (let k = 0; k < 4; k++) {
                tmpCenter.x += leafPos.getX(i + k)
                tmpCenter.y += leafPos.getY(i + k)
                tmpCenter.z += leafPos.getZ(i + k)
            }
            tmpCenter.multiplyScalar(0.25)

            sampleSpine(tmpCenter.y)
            tmpOffset.set(tmpCenter.x, 0, tmpCenter.z).applyQuaternion(tmpQuat).add(tmpPt)

            for (let k = 0; k < 4; k++) {
                tmpVert.set(
                    leafPos.getX(i + k) - tmpCenter.x,
                    leafPos.getY(i + k) - tmpCenter.y,
                    leafPos.getZ(i + k) - tmpCenter.z
                )
                tmpVert.applyQuaternion(tmpQuat).add(tmpOffset)
                leafPos.setXYZ(i + k, tmpVert.x, tmpVert.y, tmpVert.z)
            }
        }
        leafPos.needsUpdate = true
        leafGeo.computeBoundingBox()
        leafGeo.computeBoundingSphere()
    }
}

function styleTreeMeshes(tree) {
    if (tree.branchesMesh) {
        tree.branchesMesh.castShadow = true
        tree.branchesMesh.receiveShadow = true
    }
    if (tree.leavesMesh) {
        tree.leavesMesh.userData.noAO = true
        tree.leavesMesh.castShadow = true
        tree.leavesMesh.receiveShadow = false // avoid dark self-shadowing across crossed billboards
        const leafMat = tree.leavesMesh.material
        if (leafMat) {
            if (leafMat.map) configureTexture(leafMat.map, { isColor: true })
            // Subtle bounce so shadowed foliage keeps crisp 3D contrast without turning black
            leafMat.emissive = new THREE.Color(0x467a2c)
            leafMat.emissiveIntensity = 0.30
            if ('shininess' in leafMat) leafMat.shininess = 12
            if ('specular' in leafMat) leafMat.specular = new THREE.Color(0x1e3018)
            const prevCompile = leafMat.onBeforeCompile
            leafMat.onBeforeCompile = (shader, renderer) => {
                if (prevCompile) prevCompile(shader, renderer)
                shader.vertexShader = shader.vertexShader.replace(
                    "mvPosition = modelViewMatrix * mvPosition;",
                    "#ifdef USE_INSTANCING\n    mvPosition = instanceMatrix * mvPosition;\n#endif\nmvPosition = modelViewMatrix * mvPosition;"
                )
            }
            leafMat.customProgramCacheKey = () => "ez-tree-instanced-leaves"
            leafMat.needsUpdate = true
        }
        tree.leavesMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: leafMat?.map ?? null,
            alphaTest: leafMat?.alphaTest ?? 0.5
        })
    }
}

export function createRealisticParkTrees({ isBlocked } = {}) {
    const group = new THREE.Group()
    const trees = []
    const bbox = new THREE.Box3()

    const parkTreeSpecs = [
        // Signature tropical V-fork tree on the left outer lawn
        { x: -33.5, z: -42.0, targetHeight: 16.0, rotY: 0.30, seed: 104, preset: 'vfork' }
    ]

    // Deterministic RNG to populate ~85 varied trees around the outer park (away from lake shore, paths & plaza)
    let rngState = 73856093
    const nextRand = () => {
        rngState = (rngState * 1664525 + 1013904223) >>> 0
        return rngState / 4294967296
    }

    const presetPool = [
        { preset: 'Ash Large', minH: 12.5, maxH: 15.8 },
        { preset: 'Ash Medium', minH: 9.8, maxH: 12.5 },
        { preset: 'Ash Small', minH: 7.8, maxH: 9.8 },
        { preset: 'Oak Large', minH: 13.0, maxH: 16.2 },
        { preset: 'Oak Medium', minH: 10.0, maxH: 13.0 },
        { preset: 'Oak Small', minH: 7.8, maxH: 10.0 },
        { preset: 'Aspen Large', minH: 12.5, maxH: 15.5 },
        { preset: 'Aspen Medium', minH: 9.5, maxH: 12.2 },
        { preset: 'Pine Medium', minH: 10.0, maxH: 13.2 },
        { preset: 'Pine Small', minH: 8.0, maxH: 10.2 },
        { preset: 'vfork', minH: 13.5, maxH: 16.2 }
    ]
    const leafTints = [0xdcf7b8, 0xeaf7b2, 0xd4f2b4, 0xcbeeb0, 0xedf5a6, 0xe3f7ba, 0xd0eab8]

    // Lake exclusion zone so no tree is placed near the lake shore (lake is centered at -5.5, -55.0)
    const isNearLakeShore = (x, z) => {
        const dx = (x + 5.5) / 27.5
        const dz = (z + 55.0) / 53.5
        return dx * dx + dz * dz < 1.0
    }

    const minSpacingSq = 4.6 * 4.6
    const targetTotal = 85
    let attempts = 0
    while (parkTreeSpecs.length < targetTotal && attempts < 3000) {
        attempts++
        const x = -39.0 + nextRand() * 81.0
        const z = -117.5 + nextRand() * 113.0
        if (isNearLakeShore(x, z)) continue
        if (isBlocked && isBlocked(x, z)) continue

        let tooClose = false
        for (let i = 0; i < parkTreeSpecs.length; i++) {
            const dx = parkTreeSpecs[i].x - x
            const dz = parkTreeSpecs[i].z - z
            if (dx * dx + dz * dz < minSpacingSq) {
                tooClose = true
                break
            }
        }
        if (tooClose) continue

        const pick = presetPool[Math.floor(nextRand() * presetPool.length)]
        const targetHeight = pick.minH + nextRand() * (pick.maxH - pick.minH)
        parkTreeSpecs.push({
            x,
            z,
            targetHeight,
            rotY: nextRand() * Math.PI * 2,
            seed: 200 + parkTreeSpecs.length * 17,
            preset: pick.preset,
            tint: leafTints[Math.floor(nextRand() * leafTints.length)]
        })
    }

    // Group placements by preset archetype and render with InstancedMesh (only 11 draw pairs for all 85 trees)
    const grouped = new Map()
    for (let i = 0; i < parkTreeSpecs.length; i++) {
        const spec = parkTreeSpecs[i]
        const key = spec.preset
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(spec)
    }

    const dummy = new THREE.Object3D()
    const tintColor = new THREE.Color()

    for (const [presetKey, specs] of grouped.entries()) {
        let tree
        if (presetKey === 'vfork') {
            tree = new PhotoMatchedTree()
            configurePhotoMatchedTree(tree, { seed: specs[0].seed })
            tree.generate()
            bbox.setFromObject(tree)
            const rawHeight = Math.max(0.01, bbox.max.y - bbox.min.y)
            applyOuterTwigGravity(tree, bbox.min.y, rawHeight)
            upgradeBarkToPBR(tree)
        } else {
            const presetData = TreePreset[presetKey] || TreePreset['Oak Medium']
            tree = new Tree()
            tree.options.copy(structuredClone(presetData))
            tree.options.seed = specs[0].seed
            tree.options.leaves.tint = 0xffffff

            // Trim excessive mesh density & leaf overdraw (~30% fewer triangles, identical canopy volume)
            for (const lvl of Object.keys(tree.options.branch.sections)) {
                tree.options.branch.sections[lvl] = Math.max(2, Math.round(tree.options.branch.sections[lvl] * 0.72))
            }
            for (const lvl of Object.keys(tree.options.branch.segments)) {
                tree.options.branch.segments[lvl] = Math.max(3, Math.round(tree.options.branch.segments[lvl] * 0.75))
            }
            tree.options.leaves.count = Math.max(4, Math.round(tree.options.leaves.count * 0.72))
            tree.options.leaves.size *= 1.15

            tree.generate()
            if (tree.branchesMesh?.material?.map) {
                configureTexture(tree.branchesMesh.material.map, { isColor: true, repeat: true })
            }
        }

        styleTreeMeshes(tree)
        bbox.setFromObject(tree)
        const finalRawHeight = Math.max(0.01, bbox.max.y - bbox.min.y)
        const minY = bbox.min.y

        const branchInst = new THREE.InstancedMesh(
            tree.branchesMesh.geometry,
            tree.branchesMesh.material,
            specs.length
        )
        branchInst.castShadow = true
        branchInst.receiveShadow = true

        const leafInst = new THREE.InstancedMesh(
            tree.leavesMesh.geometry,
            tree.leavesMesh.material,
            specs.length
        )
        leafInst.userData.noAO = true
        leafInst.castShadow = true
        leafInst.receiveShadow = false
        leafInst.customDepthMaterial = tree.leavesMesh.customDepthMaterial

        for (let i = 0; i < specs.length; i++) {
            const spec = specs[i]
            const scaleFactor = spec.targetHeight / finalRawHeight
            dummy.position.set(spec.x, -minY * scaleFactor - 0.03, spec.z)
            dummy.rotation.set(0, spec.rotY, 0)
            dummy.scale.setScalar(scaleFactor)
            dummy.updateMatrix()

            branchInst.setMatrixAt(i, dummy.matrix)
            leafInst.setMatrixAt(i, dummy.matrix)
            tintColor.setHex(spec.tint ?? 0xdcf7b8)
            leafInst.setColorAt(i, tintColor)
        }

        branchInst.instanceMatrix.needsUpdate = true
        leafInst.instanceMatrix.needsUpdate = true
        if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true
        branchInst.computeBoundingSphere()
        leafInst.computeBoundingSphere()

        group.add(branchInst, leafInst)
        trees.push(tree)
    }


    // 4 spaced-out, uniquely shaped S-curved overhanging trees on the left & right lake waist peninsulas
    const lakesideSpecs = [
        { x: -21.2, z: -45.5, targetHeight: 15.0, rotY: 0.25, seed: 501, preset: 'Oak Large', reach: 0.48, tint: 0xcbeeb0 },
        { x: -19.8, z: -61.5, targetHeight: 16.5, rotY: -0.22, seed: 512, preset: 'Ash Large', reach: 0.40, tint: 0xdcf7b8 },
        { x: 10.6, z: -45.5, targetHeight: 14.2, rotY: Math.PI - 0.28, seed: 523, preset: 'Oak Medium', reach: 0.52, tint: 0xd4f2b4 },
        { x: 9.2, z: -61.5, targetHeight: 16.2, rotY: Math.PI + 0.22, seed: 537, preset: 'Oak Large', reach: 0.36, tint: 0xe3f7ba }
    ]

    for (let i = 0; i < lakesideSpecs.length; i++) {
        const spec = lakesideSpecs[i]
        const presetData = TreePreset[spec.preset] || TreePreset['Oak Large']
        const lakeTree = new Tree()
        lakeTree.options.copy(structuredClone(presetData))
        lakeTree.options.seed = spec.seed
        lakeTree.options.leaves.tint = spec.tint

        for (const lvl of Object.keys(lakeTree.options.branch.sections)) {
            lakeTree.options.branch.sections[lvl] = Math.max(2, Math.round(lakeTree.options.branch.sections[lvl] * 0.78))
        }
        for (const lvl of Object.keys(lakeTree.options.branch.segments)) {
            lakeTree.options.branch.segments[lvl] = Math.max(3, Math.round(lakeTree.options.branch.segments[lvl] * 0.75))
        }
        lakeTree.options.leaves.count = Math.max(4, Math.round(lakeTree.options.leaves.count * 0.75))
        lakeTree.options.leaves.size *= 1.15
        lakeTree.generate()

        bbox.setFromObject(lakeTree)
        const rawH = Math.max(0.01, bbox.max.y - bbox.min.y)
        applyLakesideSCurve(lakeTree, bbox.min.y, rawH, spec.reach)
        if (lakeTree.branchesMesh?.material?.map) {
            configureTexture(lakeTree.branchesMesh.material.map, { isColor: true, repeat: true })
        }
        styleTreeMeshes(lakeTree)

        bbox.setFromObject(lakeTree)
        const finalH = Math.max(0.01, bbox.max.y - bbox.min.y)
        const sc = spec.targetHeight / finalH
        lakeTree.scale.setScalar(sc)
        lakeTree.position.set(spec.x, -bbox.min.y * sc - 0.03, spec.z)
        lakeTree.rotation.y = spec.rotY

        group.add(lakeTree)
        trees.push(lakeTree)
    }

    return {
        group,
        update(elapsed = 0) {
            for (let i = 0; i < trees.length; i++) {
                trees[i].update(elapsed)
            }
        }
    }
}
