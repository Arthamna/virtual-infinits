import * as THREE from 'three'
import { createBarkTexture, createLeafSprigTexture } from './textures'

export function createForegroundTree(barkMat, mirror = false) {
    const group = new THREE.Group()
    const sign = mirror ? -1 : 1

    const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.08 * sign, 1.4, -0.05),
        new THREE.Vector3(-0.12 * sign, 2.8, 0.05),
        new THREE.Vector3(-0.38 * sign, 4.4, -0.08),
        new THREE.Vector3(-0.55 * sign, 6.2, 0.02)
    ])
    const trunkGeo = new THREE.TubeGeometry(trunkCurve, 20, 0.24, 12, false)
    const trunk = new THREE.Mesh(trunkGeo, barkMat)
    trunk.castShadow = true
    trunk.receiveShadow = true
    group.add(trunk)

    const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.12 * sign, 2.75, 0.04),
        new THREE.Vector3(0.28 * sign, 3.8, 0.12),
        new THREE.Vector3(0.55 * sign, 5.2, 0.18)
    ])
    const branchGeo = new THREE.TubeGeometry(branchCurve, 14, 0.14, 10, false)
    const branch = new THREE.Mesh(branchGeo, barkMat)
    branch.castShadow = true
    branch.receiveShadow = true
    group.add(branch)

    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x3b6e2c,
        roughness: 0.85,
        metalness: 0.02
    })
    const canopyOffsets = [
        [-0.55 * sign, 6.4, 0.0, 1.35],
        [0.55 * sign, 5.5, 0.15, 1.15],
        [0.0, 6.8, -0.2, 1.25]
    ]
    canopyOffsets.forEach(([x, y, z, r]) => {
        const geo = new THREE.IcosahedronGeometry(r, 2)
        const mesh = new THREE.Mesh(geo, leafMat)
        mesh.position.set(x, y, z)
        mesh.scale.set(1.25, 0.72, 1.15)
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
    })

    return group
}

export function createParkTree(barkMat, leafColors, seed = 1) {
    const group = new THREE.Group()

    const trunkH = 3.2 + (seed % 3) * 0.7
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, trunkH, 8)
    const trunk = new THREE.Mesh(trunkGeo, barkMat)
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    trunk.receiveShadow = true
    group.add(trunk)

    const color = leafColors[seed % leafColors.length]
    const leafMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness: 0.02
    })

    const puffs = 5
    for (let i = 0; i < puffs; i++) {
        const angle = (i / puffs) * Math.PI * 2 + seed * 0.7
        const dist = i === 0 ? 0 : 1.15 + ((seed + i) % 3) * 0.35
        const radius = i === 0 ? 1.85 : 1.35 + ((seed + i) % 2) * 0.35
        const geo = new THREE.IcosahedronGeometry(radius, 1)
        const puff = new THREE.Mesh(geo, leafMat)
        puff.position.set(
            Math.cos(angle) * dist,
            trunkH + 0.55 + (i % 2) * 0.35,
            Math.sin(angle) * dist
        )
        puff.scale.set(1.35, 0.62, 1.25)
        puff.castShadow = true
        puff.receiveShadow = true
        group.add(puff)
    }

    return group
}

export function createParkFoliage() {
    const group = new THREE.Group()
    const barkMat = new THREE.MeshStandardMaterial({
        map: createBarkTexture(),
        roughness: 0.92,
        metalness: 0.02
    })

    const leftTree = createForegroundTree(barkMat, false)
    leftTree.position.set(-4.35, 0, 7.6)
    group.add(leftTree)

    const rightTree = createForegroundTree(barkMat, true)
    rightTree.position.set(4.55, 0, 7.3)
    group.add(rightTree)

    const leafColors = [0x2d5a24, 0x3b6f2d, 0x4b8036, 0x24491d]
    const treePlacements = [
        [-16, 0, -10, 1.35],
        [-12, 0, -16, 1.45],
        [-6, 0, -22, 1.5],
        [2, 0, -25, 1.6],
        [10, 0, -22, 1.45],
        [16, 0, -16, 1.55],
        [19, 0, -8, 1.35],
        [-21, 0, -4, 1.25],
        [22, 0, -1, 1.3],
        [-14, 0, -25, 1.5],
        [15, 0, -26, 1.55]
    ]

    treePlacements.forEach(([x, y, z, scale], idx) => {
        const tree = createParkTree(barkMat, leafColors, idx + 1)
        tree.position.set(x, y, z)
        tree.scale.setScalar(scale)
        group.add(tree)
    })

    return group
}

export function createRealisticParkTrees() {
    const group = new THREE.Group()

    const barkTex = createBarkTexture()
    barkTex.repeat.set(2, 4)
    const barkMat = new THREE.MeshStandardMaterial({
        map: barkTex,
        color: 0x8a7968,
        roughness: 0.92,
        metalness: 0.0
    })

    const cardW = 1.62
    const cardH = 1.62
    const leafCardGeo = new THREE.BufferGeometry()
    const cHalfW = cardW / 2
    const cHalfH = cardH / 2
    const s60 = Math.sin(Math.PI / 3)
    const c60 = Math.cos(Math.PI / 3)
    const cardPositions = [
        -cHalfW, -cHalfH, 0,
        cHalfW, -cHalfH, 0,
        cHalfW, cHalfH, 0,
        -cHalfW, cHalfH, 0,
        -cHalfW * c60, -cHalfH, -cHalfW * s60,
        cHalfW * c60, -cHalfH, cHalfW * s60,
        cHalfW * c60, cHalfH, cHalfW * s60,
        -cHalfW * c60, cHalfH, -cHalfW * s60,
        -cHalfW * c60, -cHalfH, cHalfW * s60,
        cHalfW * c60, -cHalfH, -cHalfW * s60,
        cHalfW * c60, cHalfH, -cHalfW * s60,
        -cHalfW * c60, cHalfH, cHalfW * s60,
        -cHalfW, 0, -cHalfH,
        cHalfW, 0, -cHalfH,
        cHalfW, 0, cHalfH,
        -cHalfW, 0, cHalfH
    ]
    leafCardGeo.setAttribute('position', new THREE.Float32BufferAttribute(cardPositions, 3))
    leafCardGeo.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
            [
                0, 0, 1, 0, 1, 1, 0, 1,
                0, 0, 1, 0, 1, 1, 0, 1,
                0, 0, 1, 0, 1, 1, 0, 1,
                0, 0, 1, 0, 1, 1, 0, 1
            ],
            2
        )
    )
    leafCardGeo.setIndex([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 14, 13, 12, 15, 14
    ])
    const cardNormals = new Float32Array(cardPositions.length)
    for (let i = 0; i < cardPositions.length; i += 3) {
        const vx = cardPositions[i]
        const vy = cardPositions[i + 1] + cHalfH * 0.9
        const vz = cardPositions[i + 2]
        const len = Math.hypot(vx, vy, vz) || 1
        cardNormals[i] = vx / len
        cardNormals[i + 1] = vy / len
        cardNormals[i + 2] = vz / len
    }
    leafCardGeo.setAttribute('normal', new THREE.BufferAttribute(cardNormals, 3))

    const leafMat = new THREE.MeshStandardMaterial({
        map: createLeafSprigTexture(),
        alphaTest: 0.34,
        side: THREE.DoubleSide,
        roughness: 0.88,
        metalness: 0.0,
        envMapIntensity: 0.14
    })

    const treeSpecs = [
        [14.2, -5.2, 1.45, 'tall', 0, 'bright'],
        [33.2, -4.4, 1.45, 'tall', 0, 'deep'],
        [-19.8, -5.4, 0.62, 'medium', 0, 'bright'],
        [-28.6, -10.5, 0.68, 'medium', 0, 'emerald'],
        [-19.0, -55.0, 1.25, 'beringin', 1, 'deep'],
        [18.0, -12.5, 0.85, 'beringin', -1, 'emerald'],
        [10.2, -43.0, 1.32, 'beringin', -1, 'deep'],
        [8.5, -58.5, 1.1, 'beringin', -1, 'emerald'],
        [28.5, -11.5, 0.98, 'trembesi', 0, 'olive'],
        [33.5, -18.5, 1.05, 'trembesi', 0, 'deep'],
        [26.5, -27.0, 1.0, 'tall', 0, 'emerald'],
        [36.0, -35.5, 0.62, 'medium', 0, 'bright'],
        [36.5, -42.5, 0.52, 'medium', 0, 'olive'],
        [27.5, -50.5, 0.78, 'medium', 0, 'emerald']
    ]

    const cardsByType = { trembesi: 380, tall: 360, medium: 200, beringin: 520 }
    const totalLeafCards = treeSpecs.reduce((sum, spec) => sum + cardsByType[spec[3]], 0)
    const baseBladesPerTree = 20
    const leafInstances = new THREE.InstancedMesh(leafCardGeo, leafMat, totalLeafCards)
    leafInstances.castShadow = true
    leafInstances.receiveShadow = true

    const baseBladeGeo = new THREE.BufferGeometry()
    const baseBladeVerts = new Float32Array([
        -0.028, 0.0, 0.0,
        0.028, 0.0, 0.0,
        -0.018, 0.12, 0.012,
        0.018, 0.12, 0.012,
        0.0, 0.25, 0.036
    ])
    baseBladeGeo.setAttribute('position', new THREE.BufferAttribute(baseBladeVerts, 3))
    baseBladeGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4])
    baseBladeGeo.computeVertexNormals()

    const basePlantMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.75,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    const basePlantInstances = new THREE.InstancedMesh(baseBladeGeo, basePlantMat, treeSpecs.length * baseBladesPerTree)
    basePlantInstances.receiveShadow = true

    const tonePalettes = {
        deep: [0x4c6e38, 0x3e5e2c, 0x587a42, 0x355225],
        emerald: [0x58803c, 0x4b7032, 0x678f47, 0x3f6129],
        olive: [0x6b8238, 0x5c732e, 0x7a9144, 0x4e6325],
        golden: [0x919e32, 0x808c28, 0xa3b03c, 0x6e7a20],
        bright: [0x74a13e, 0x648f32, 0x84b24a, 0x557d28]
    }
    const basePlantPalette = [0x82a629, 0x719422, 0x93b532, 0x5c801c]

    let seed = 4242
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const dummy = new THREE.Object3D()
    const bladeColor = new THREE.Color()
    let leafIdx = 0
    let baseIdx = 0

    for (let t = 0; t < treeSpecs.length; t++) {
        const [tx, tz, tScale, treeType, leanDir = 1, toneType = 'deep'] = treeSpecs[t]
        const treePalette = tonePalettes[toneType] || tonePalettes.deep
        const isBeringin = treeType === 'beringin'
        const isTrembesi = treeType === 'trembesi'
        const isTall = treeType === 'tall'

        const leanSign = leanDir !== 0 ? leanDir : 1
        const leanX = isBeringin
            ? 3.6 * leanSign * tScale
            : (leanDir * 0.45 + (nextRand() - 0.5) * (isTrembesi ? 1.0 : 0.65)) * tScale
        const leanZ = (nextRand() - 0.5) * (isTrembesi || isBeringin ? 1.1 : 0.7) * tScale
        const treeH = (isBeringin ? 9.4 : isTrembesi ? 8.4 + nextRand() * 1.8 : isTall ? 9.6 + nextRand() * 1.8 : 5.6 + nextRand() * 1.3) * tScale
        const trunkRad = (isBeringin ? 0.48 : isTrembesi ? 0.36 : isTall ? 0.24 : 0.2) * tScale

        const trunkTopFrac = isBeringin ? 0.62 : isTrembesi ? 0.56 : 0.86
        const trunkCurve = isBeringin
            ? new THREE.CatmullRomCurve3([
                  new THREE.Vector3(tx, -0.05, tz),
                  new THREE.Vector3(tx - 0.55 * leanSign * tScale, treeH * 0.18, tz + leanZ * 0.3),
                  new THREE.Vector3(tx + leanX * 0.55, treeH * 0.42, tz + leanZ * 0.7),
                  new THREE.Vector3(tx + leanX, treeH * trunkTopFrac, tz + leanZ)
              ])
            : new THREE.CatmullRomCurve3([
                  new THREE.Vector3(tx, -0.05, tz),
                  new THREE.Vector3(tx + leanX * 0.35, treeH * trunkTopFrac * 0.32, tz + leanZ * 0.35),
                  new THREE.Vector3(tx + leanX * 0.8, treeH * trunkTopFrac * 0.68, tz + leanZ * 0.8),
                  new THREE.Vector3(tx + leanX, treeH * trunkTopFrac, tz + leanZ)
              ])
        const trunkGeo = new THREE.TubeGeometry(trunkCurve, 14, trunkRad, 8, false)
        const tPos = trunkGeo.attributes.position
        for (let i = 0; i < tPos.count; i++) {
            const py = tPos.getY(i)
            const hNorm = Math.max(0, Math.min(1, py / (treeH * trunkTopFrac)))
            const center = trunkCurve.getPointAt(hNorm)
            const shrink = 1.0 - (isBeringin ? 0.48 : isTrembesi ? 0.42 : 0.58) * hNorm
            tPos.setX(i, center.x + (tPos.getX(i) - center.x) * shrink)
            tPos.setZ(i, center.z + (tPos.getZ(i) - center.z) * shrink)
        }
        trunkGeo.computeVertexNormals()
        const trunkMesh = new THREE.Mesh(trunkGeo, barkMat)
        trunkMesh.castShadow = true
        trunkMesh.receiveShadow = true
        group.add(trunkMesh)

        const clusterCenters = []
        const branchCount = isBeringin ? 10 : isTrembesi ? 9 : isTall ? 7 : 6
        const baseTowardLakeAngle = leanSign > 0 ? 0 : Math.PI
        for (let b = 0; b < branchCount; b++) {
            const hFrac = isBeringin
                ? 0.44 + (b / (branchCount - 1)) * 0.56
                : isTrembesi
                    ? 0.54 + (b / (branchCount - 1)) * 0.46
                    : 0.35 + (b / (branchCount - 1)) * 0.55
            const origin = trunkCurve.getPointAt(Math.min(1, hFrac))
            const angle = isBeringin
                ? (b < 6 ? baseTowardLakeAngle + (b - 2.5) * 0.36 : baseTowardLakeAngle + Math.PI * 0.65 + (b - 6) * 0.5)
                : (b / branchCount) * Math.PI * 2 + nextRand() * 0.55
            const reach = isBeringin
                ? (b < 6 ? 5.2 + nextRand() * 2.5 : 3.0 + nextRand() * 1.6) * tScale
                : isTrembesi
                    ? (4.2 + nextRand() * 2.5) * tScale
                    : isTall
                        ? (1.8 + nextRand() * 1.1) * tScale
                        : (1.9 + nextRand() * 1.0) * tScale
            const rise = isBeringin
                ? (1.1 + (b / branchCount) * 2.1 + nextRand() * 0.6) * tScale
                : isTrembesi
                    ? (1.7 + nextRand() * 1.4) * tScale
                    : (0.9 + nextRand() * 1.0) * tScale

            const tip = new THREE.Vector3(
                origin.x + Math.cos(angle) * reach,
                origin.y + rise,
                origin.z + Math.sin(angle) * reach
            )
            const mid = origin.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, (isBeringin ? 0.95 : isTrembesi ? 0.8 : 0.3) * tScale, 0))
            const branchCurve = new THREE.CatmullRomCurve3([origin, mid, tip])
            const branchGeo = new THREE.TubeGeometry(branchCurve, 8, (isBeringin ? 0.15 : isTrembesi ? 0.12 : 0.075) * tScale, 6, false)
            const branchMesh = new THREE.Mesh(branchGeo, barkMat)
            branchMesh.castShadow = true
            group.add(branchMesh)

            if (isBeringin) {
                clusterCenters.push({ pos: mid.clone().add(new THREE.Vector3(0, 0.55 * tScale, 0)), radX: 2.75 * tScale, radY: 1.25 * tScale })
                clusterCenters.push({ pos: tip, radX: 3.15 * tScale, radY: 1.35 * tScale })
                if (b < 5) {
                    const rootStart = mid.clone().lerp(tip, 0.35)
                    const rootLen = Math.max(1.2, rootStart.y * (0.55 + nextRand() * 0.3))
                    const rootCurve = new THREE.CatmullRomCurve3([
                        rootStart,
                        rootStart.clone().add(new THREE.Vector3((nextRand() - 0.5) * 0.2, -rootLen * 0.5, (nextRand() - 0.5) * 0.2)),
                        rootStart.clone().add(new THREE.Vector3((nextRand() - 0.5) * 0.25, -rootLen, (nextRand() - 0.5) * 0.25))
                    ])
                    const rootMesh = new THREE.Mesh(new THREE.TubeGeometry(rootCurve, 6, 0.03 * tScale, 5, false), barkMat)
                    group.add(rootMesh)
                }
            } else if (isTrembesi) {
                clusterCenters.push({ pos: mid.clone().lerp(tip, 0.45).add(new THREE.Vector3(0, 0.65 * tScale, 0)), radX: 2.85 * tScale, radY: 1.3 * tScale })
                clusterCenters.push({ pos: tip, radX: 3.1 * tScale, radY: 1.4 * tScale })
            } else if (isTall) {
                clusterCenters.push({ pos: mid.clone().add(new THREE.Vector3(0, 0.55 * tScale, 0)), radX: 1.55 * tScale, radY: 1.65 * tScale })
                clusterCenters.push({ pos: tip, radX: (1.75 + (b > 1 ? 0.25 : 0)) * tScale, radY: 1.85 * tScale })
            } else {
                clusterCenters.push({ pos: mid.clone().add(new THREE.Vector3(0, 0.4 * tScale, 0)), radX: 1.75 * tScale, radY: 1.35 * tScale })
                clusterCenters.push({ pos: tip, radX: (1.95 + (b > 1 ? 0.35 : 0)) * tScale, radY: 1.55 * tScale })
            }
        }

        const peakPos = trunkCurve.getPointAt(1).add(new THREE.Vector3(isBeringin ? 0.8 * leanSign * tScale : 0, (isBeringin ? 2.4 : isTrembesi ? 2.2 : 1.0) * tScale, 0))
        clusterCenters.push({
            pos: peakPos,
            radX: (isBeringin ? 4.2 : isTrembesi ? 3.8 : 2.3) * tScale,
            radY: (isBeringin ? 1.75 : isTrembesi ? 1.6 : 1.7) * tScale
        })

        const cardCount = cardsByType[treeType]
        for (let c = 0; c < cardCount; c++) {
            const cluster = clusterCenters[c % clusterCenters.length]
            const u = nextRand() * Math.PI * 2
            const v = Math.acos(2 * nextRand() - 1)
            const r = Math.pow(nextRand(), 0.5)
            dummy.position.set(
                cluster.pos.x + r * cluster.radX * Math.sin(v) * Math.cos(u),
                cluster.pos.y + r * cluster.radY * Math.cos(v),
                cluster.pos.z + r * cluster.radX * Math.sin(v) * Math.sin(u)
            )
            dummy.rotation.set(
                (nextRand() - 0.5) * 0.85,
                nextRand() * Math.PI * 2,
                (nextRand() - 0.5) * 0.85
            )
            const sc = (isBeringin || isTrembesi ? 1.15 + nextRand() * 0.75 : 0.95 + nextRand() * 0.6) * tScale
            dummy.scale.set(sc, sc, sc)
            dummy.updateMatrix()
            leafInstances.setMatrixAt(leafIdx, dummy.matrix)
            bladeColor.setHex(treePalette[Math.floor(nextRand() * treePalette.length)])
            const ao = 0.42 + 0.58 * ((Math.cos(v) + 1) * 0.5) * (0.65 + 0.35 * r)
            bladeColor.multiplyScalar(ao)
            leafInstances.setColorAt(leafIdx, bladeColor)
            leafIdx++
        }

        for (let p = 0; p < baseBladesPerTree; p++) {
            const a = (p / baseBladesPerTree) * Math.PI * 2 + (nextRand() - 0.5) * 0.35
            const rad = (trunkRad + 0.14 + nextRand() * 0.45) * tScale
            dummy.position.set(tx + Math.cos(a) * rad, -0.04, tz + Math.sin(a) * rad)
            dummy.rotation.set(0.35 + nextRand() * 0.35, -a + Math.PI / 2, (nextRand() - 0.5) * 0.25)
            const sXZ = (1.3 + nextRand() * 0.7) * tScale
            const sY = (1.5 + nextRand() * 1.1) * tScale
            dummy.scale.set(sXZ, sY, sXZ)
            dummy.updateMatrix()
            basePlantInstances.setMatrixAt(baseIdx, dummy.matrix)
            bladeColor.setHex(basePlantPalette[Math.floor(nextRand() * basePlantPalette.length)])
            basePlantInstances.setColorAt(baseIdx, bladeColor)
            baseIdx++
        }
    }

    if (treeSpecs.length > 0) {
        leafInstances.instanceMatrix.needsUpdate = true
        if (leafInstances.instanceColor) leafInstances.instanceColor.needsUpdate = true
        group.add(leafInstances)

        basePlantInstances.instanceMatrix.needsUpdate = true
        if (basePlantInstances.instanceColor) basePlantInstances.instanceColor.needsUpdate = true
        group.add(basePlantInstances)
    }

    return group
}
