import * as THREE from 'three'

function applyWorldUV(geo, offsetX = 0, offsetZ = 0) {
    const pos = geo.attributes.position
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + offsetX) * 0.22
        uv[i * 2 + 1] = (pos.getZ(i) + offsetZ) * 0.22
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

function offsetPolyline(pts, dist) {
    const segNormals = []
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1][0] - pts[i][0]
        const dz = pts[i + 1][1] - pts[i][1]
        const len = Math.hypot(dx, dz) || 1
        segNormals.push([-dz / len, dx / len])
    }
    return pts.map((p, i) => {
        if (i === 0) return [p[0] + segNormals[0][0] * dist, p[1] + segNormals[0][1] * dist]
        if (i === pts.length - 1) {
            const n = segNormals[segNormals.length - 1]
            return [p[0] + n[0] * dist, p[1] + n[1] * dist]
        }
        const n0 = segNormals[i - 1]
        const n1 = segNormals[i]
        const bx = n0[0] + n1[0]
        const bz = n0[1] + n1[1]
        const bLen = Math.hypot(bx, bz) || 1
        const nx = bx / bLen
        const nz = bz / bLen
        const scale = dist / Math.max(0.45, nx * n0[0] + nz * n0[1])
        return [p[0] + nx * scale, p[1] + nz * scale]
    })
}

function addSteppedTier(group, pts, offsetDist, height, mat) {
    const outerPts = offsetPolyline(pts, offsetDist)
    const s = new THREE.Shape()
    s.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1])
    for (let i = outerPts.length - 1; i >= 0; i--) s.lineTo(outerPts[i][0], outerPts[i][1])
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false })
    g.rotateX(Math.PI / 2)
    applyWorldUV(g)
    const m = new THREE.Mesh(g, mat)
    m.position.y = height
    m.receiveShadow = true
    m.castShadow = true
    group.add(m)
}

export function createParkPlaza({ concreteMat, walkwayMat, redPavingMat }) {
    const group = new THREE.Group()

    const wallWidth = 16.3
    const plazaFrontZ = 1.12
    const plazaBackZ = -3.1
    const plazaDepth = plazaFrontZ - plazaBackZ
    const plazaCenterZ = (plazaFrontZ + plazaBackZ) / 2

    const plazaCenter = new THREE.Mesh(
        new THREE.BoxGeometry(wallWidth, 0.48, plazaDepth),
        redPavingMat
    )
    plazaCenter.position.set(0, 0.24, plazaCenterZ)
    plazaCenter.receiveShadow = true
    group.add(plazaCenter)

    const sidePlazaWidth = (26 - wallWidth) / 2
    const leftSidePlaza = new THREE.Mesh(
        new THREE.BoxGeometry(sidePlazaWidth, 0.48, plazaDepth),
        walkwayMat
    )
    leftSidePlaza.position.set(-(wallWidth / 2 + sidePlazaWidth / 2), 0.24, plazaCenterZ)
    leftSidePlaza.receiveShadow = true
    group.add(leftSidePlaza)

    const rightRailingPoints = [
        [14.55, -1.65],
        [13.55, -0.35],
        [12.35, 0.55],
        [11.0, 1.05]
    ]
    const rightEdgeCurve = new THREE.CatmullRomCurve3(
        rightRailingPoints.map(([x, z]) => new THREE.Vector3(x, 0, z))
    )

    const rightPlazaShape = new THREE.Shape()
    rightPlazaShape.moveTo(8.15, -3.1)
    rightPlazaShape.lineTo(11.35, -3.1)
    rightPlazaShape.lineTo(11.35, -1.72)
    rightPlazaShape.lineTo(14.62, -1.72)

    const edgeSteps = 24
    for (let i = 0; i <= edgeSteps; i++) {
        const t = i / edgeSteps
        const pt = rightEdgeCurve.getPointAt(t)
        const tan = rightEdgeCurve.getTangentAt(t)
        const nx = tan.z
        const nz = -tan.x
        const len = Math.hypot(nx, nz) || 1
        rightPlazaShape.lineTo(pt.x + (nx / len) * 0.07, pt.z + (nz / len) * 0.07)
    }

    rightPlazaShape.lineTo(8.15, plazaFrontZ)
    rightPlazaShape.closePath()

    const rightPlazaGeo = new THREE.ExtrudeGeometry(rightPlazaShape, {
        depth: 0.48,
        bevelEnabled: false,
        curveSegments: 24
    })
    rightPlazaGeo.rotateX(Math.PI / 2)
    applyWorldUV(rightPlazaGeo)

    const rightSidePlaza = new THREE.Mesh(rightPlazaGeo, walkwayMat)
    rightSidePlaza.position.y = 0.48
    rightSidePlaza.receiveShadow = true
    group.add(rightSidePlaza)

    const createHalfKiteStep = (leftX, apexX, rightX, depth, height, cornerBlend = 0.24) => {
        const shape = new THREE.Shape()
        shape.moveTo(leftX, 0)
        shape.lineTo(rightX, 0)
        const rightJoinX = apexX + (rightX - apexX) * cornerBlend
        const leftJoinX = apexX - (apexX - leftX) * cornerBlend
        const joinY = depth * (1 - cornerBlend)
        shape.lineTo(rightJoinX, joinY)
        shape.quadraticCurveTo(apexX, depth, leftJoinX, joinY)
        shape.closePath()

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelSegments: 2,
            curveSegments: 18
        })
        geo.rotateX(Math.PI / 2)

        const mesh = new THREE.Mesh(geo, concreteMat)
        mesh.receiveShadow = true
        mesh.castShadow = true
        return mesh
    }

    const curvedStep1 = createHalfKiteStep(-5.6, -2.7, 2.9, 1.45, 0.18, 0.22)
    curvedStep1.position.set(0, 0.66, -1.82)
    group.add(curvedStep1)

    const curvedStep2 = createHalfKiteStep(-4.85, -2.7, -0.3, 0.85, 0.18, 0.26)
    curvedStep2.position.set(0, 0.84, -1.82)
    group.add(curvedStep2)

    const wallShape = new THREE.Shape()
    wallShape.moveTo(-8.15, 0)
    wallShape.lineTo(8.15, 0)
    wallShape.lineTo(5.45, 1.65)
    wallShape.lineTo(-5.75, 1.65)
    wallShape.closePath()

    const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
        depth: 1.15,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2
    })
    const wallMesh = new THREE.Mesh(wallGeo, concreteMat)
    wallMesh.position.set(0, 0.48, -2.95)
    wallMesh.castShadow = true
    wallMesh.receiveShadow = true
    group.add(wallMesh)

    const rampWidth = 2.4
    const parallelPts = []
    const offsetSamples = 16
    for (let i = 0; i <= offsetSamples; i++) {
        const t = i / offsetSamples
        const pt = rightEdgeCurve.getPointAt(t)
        const tan = rightEdgeCurve.getTangentAt(t)
        const len = Math.hypot(tan.z, -tan.x) || 1
        parallelPts.push([pt.x + (tan.z / len) * rampWidth, 0.48, pt.z + (-tan.x / len) * rampWidth])
    }

    const topZ = -1.65
    const tan0 = rightEdgeCurve.getTangentAt(0)
    const backDist = (parallelPts[0][2] - topZ) / (tan0.z || 1)
    const curveEndX = parallelPts[0][0] - tan0.x * backDist
    const topMidX = (curveEndX + parallelPts[0][0]) / 2 + 0.16
    const topMidZ = (topZ + parallelPts[0][2]) / 2 - 0.08
    const outerRailingPts = [
        [curveEndX, 0.48, topZ],
        [topMidX, 0.48, topMidZ],
        parallelPts[0],
        parallelPts[4],
        parallelPts[8],
        parallelPts[12],
        parallelPts[16]
    ]

    const outerPathCurve = new THREE.CatmullRomCurve3(
        outerRailingPts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    )

    const targetX = 24.5

    const rampSteps = 24
    const rampPositions = []
    const rampUVs = []
    const rampIndices = []

    for (let i = 0; i <= rampSteps; i++) {
        const t = i / rampSteps
        const innerPt = rightEdgeCurve.getPointAt(t)
        const innerTan = rightEdgeCurve.getTangentAt(t)
        const iLen = Math.hypot(innerTan.z, -innerTan.x) || 1
        const innerX = innerPt.x + (innerTan.z / iLen) * 0.07
        const innerZ = innerPt.z + (-innerTan.x / iLen) * 0.07

        const outerPt = outerPathCurve.getPointAt(t)
        const y = 0.48 * t

        rampPositions.push(
            innerX, y, innerZ,
            outerPt.x, y, outerPt.z,
            outerPt.x, -0.02, outerPt.z
        )
        rampUVs.push(
            innerX * 0.22, innerZ * 0.22,
            outerPt.x * 0.22, outerPt.z * 0.22,
            outerPt.x * 0.22, outerPt.z * 0.22
        )

        if (i < rampSteps) {
            const b = i * 3
            rampIndices.push(b, b + 3, b + 1)
            rampIndices.push(b + 1, b + 3, b + 4)
            rampIndices.push(b + 1, b + 2, b + 4)
            rampIndices.push(b + 2, b + 5, b + 4)
        }
    }

    const rampGeo = new THREE.BufferGeometry()
    rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(rampPositions, 3))
    rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rampUVs, 2))
    rampGeo.setIndex(rampIndices)
    rampGeo.computeVertexNormals()

    const rampMesh = new THREE.Mesh(rampGeo, walkwayMat)
    rampMesh.receiveShadow = true
    rampMesh.castShadow = true
    group.add(rampMesh)

    const outerEndPt = outerPathCurve.getPointAt(1)
    const rampFrontOuterZ = outerEndPt.z
    const fEndPt = rightEdgeCurve.getPointAt(1)

    const frontWalkwayShape = new THREE.Shape()
    frontWalkwayShape.moveTo(-13.0, plazaFrontZ)
    frontWalkwayShape.lineTo(fEndPt.x, plazaFrontZ)
    frontWalkwayShape.lineTo(fEndPt.x, fEndPt.z)
    frontWalkwayShape.lineTo(outerEndPt.x, rampFrontOuterZ)
    frontWalkwayShape.lineTo(-13.0, rampFrontOuterZ)
    frontWalkwayShape.closePath()

    const frontWalkwayGeo = new THREE.ExtrudeGeometry(frontWalkwayShape, {
        depth: 0.48,
        bevelEnabled: false
    })
    frontWalkwayGeo.rotateX(Math.PI / 2)
    applyWorldUV(frontWalkwayGeo)

    const frontGreyWalkway = new THREE.Mesh(frontWalkwayGeo, walkwayMat)
    frontGreyWalkway.position.y = 0.48
    frontGreyWalkway.receiveShadow = true
    group.add(frontGreyWalkway)

    const centerStepLeftX = -8.15
    const centerStepRightX = 6.35
    const centerStepWidth = centerStepRightX - centerStepLeftX
    const centerStepCenterX = (centerStepLeftX + centerStepRightX) / 2
    const centerStepDepth = 0.75
    const centerStepShape = new THREE.Shape()
    centerStepShape.moveTo(-centerStepWidth / 2, 0)
    centerStepShape.lineTo(centerStepWidth / 2, 0)
    centerStepShape.lineTo(centerStepWidth / 2, centerStepDepth)
    centerStepShape.lineTo(-centerStepWidth / 2, centerStepDepth)
    centerStepShape.closePath()

    const centerStepGeo = new THREE.ExtrudeGeometry(centerStepShape, {
        depth: 0.26,
        bevelEnabled: false
    })
    centerStepGeo.rotateX(Math.PI / 2)
    applyWorldUV(centerStepGeo, centerStepCenterX, rampFrontOuterZ)

    const centerFrontStep = new THREE.Mesh(centerStepGeo, walkwayMat)
    centerFrontStep.position.set(centerStepCenterX, 0.24, rampFrontOuterZ)
    centerFrontStep.castShadow = true
    centerFrontStep.receiveShadow = true
    group.add(centerFrontStep)

    const extPlazaShape = new THREE.Shape()
    extPlazaShape.moveTo(outerEndPt.x, rampFrontOuterZ)
    const curveSampleSteps = 48
    for (let i = 0; i <= curveSampleSteps; i++) {
        const pt = outerPathCurve.getPointAt(1 - i / curveSampleSteps)
        extPlazaShape.lineTo(pt.x, pt.z)
    }
    extPlazaShape.lineTo(targetX, topZ)
    extPlazaShape.lineTo(targetX, rampFrontOuterZ)
    extPlazaShape.lineTo(outerEndPt.x, rampFrontOuterZ)
    extPlazaShape.closePath()

    const extPlazaGeo = new THREE.ExtrudeGeometry(extPlazaShape, {
        depth: 0.48,
        bevelEnabled: false
    })
    extPlazaGeo.rotateX(Math.PI / 2)
    applyWorldUV(extPlazaGeo)

    const extPlazaMesh = new THREE.Mesh(extPlazaGeo, walkwayMat)
    extPlazaMesh.position.y = 0.48
    extPlazaMesh.receiveShadow = true
    group.add(extPlazaMesh)

    const apronLeftX = 8.85
    const apronFrontZ = rampFrontOuterZ + 2.5
    const apronShape = new THREE.Shape()
    apronShape.moveTo(apronLeftX, rampFrontOuterZ)
    apronShape.lineTo(targetX, rampFrontOuterZ)
    apronShape.lineTo(targetX, apronFrontZ)
    apronShape.lineTo(apronLeftX, apronFrontZ)
    apronShape.closePath()

    const apronGeo = new THREE.ExtrudeGeometry(apronShape, {
        depth: 0.48,
        bevelEnabled: false
    })
    apronGeo.rotateX(Math.PI / 2)
    applyWorldUV(apronGeo)

    const frontRightApron = new THREE.Mesh(apronGeo, walkwayMat)
    frontRightApron.position.y = 0.48
    frontRightApron.receiveShadow = true
    group.add(frontRightApron)

    const extCornerFarX = 34.5
    const extCornerTipX = 36.8
    const extCornerTipZ = (apronFrontZ + topZ) * 0.5
    const extYellowStartX = 34.0
    const extVLeftX = 31.8
    const extVTipX = 29.8
    const extVTipZ = topZ - 2.1
    const extVRightX = 27.8

    const extCornerShape = new THREE.Shape()
    extCornerShape.moveTo(targetX, apronFrontZ)
    extCornerShape.lineTo(extCornerFarX, apronFrontZ)
    extCornerShape.lineTo(extCornerTipX, extCornerTipZ)
    extCornerShape.lineTo(extYellowStartX, topZ)
    extCornerShape.lineTo(extVLeftX, topZ)
    extCornerShape.lineTo(extVTipX, extVTipZ)
    extCornerShape.lineTo(extVRightX, topZ)
    extCornerShape.lineTo(targetX, topZ)
    extCornerShape.closePath()
    const extCornerGeo = new THREE.ExtrudeGeometry(extCornerShape, { depth: 0.48, bevelEnabled: false })
    extCornerGeo.rotateX(Math.PI / 2)
    applyWorldUV(extCornerGeo)
    const extCornerMesh = new THREE.Mesh(extCornerGeo, walkwayMat)
    extCornerMesh.position.y = 0.48
    extCornerMesh.receiveShadow = true
    extCornerMesh.castShadow = true
    group.add(extCornerMesh)

    const rightYellowPts = [
        [extYellowStartX, topZ],
        [extVLeftX, topZ],
        [extVTipX, extVTipZ],
        [extVRightX, topZ],
        [targetX, topZ]
    ]
    addSteppedTier(group, rightYellowPts, 0.44, 0.32, walkwayMat)
    addSteppedTier(group, rightYellowPts, 0.88, 0.16, walkwayMat)

    const addLeftGreySlab = (xMin, xMax, zMin, zMax) => {
        const s = new THREE.Shape()
        s.moveTo(xMin, zMin)
        s.lineTo(xMax, zMin)
        s.lineTo(xMax, zMax)
        s.lineTo(xMin, zMax)
        s.closePath()
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.48, bevelEnabled: false })
        geo.rotateX(Math.PI / 2)
        applyWorldUV(geo)
        const mesh = new THREE.Mesh(geo, walkwayMat)
        mesh.position.y = 0.48
        mesh.receiveShadow = true
        group.add(mesh)
    }

    const leftOuterX = -34.2
    const leftSmallBoxRightX = -16.2
    const leftSmallBoxFrontZ = rampFrontOuterZ + 1.5

    const innerRampBotPts = [
        [-29.0, 0.48, -0.3],
        [-26.2, 0.48, 0.65],
        [-23.5, 0.48, 1.3],
        [-21.0, 0.48, 1.55]
    ]
    const innerRampBotCurve = new THREE.CatmullRomCurve3(innerRampBotPts.map(([x, y, z]) => new THREE.Vector3(x, y, z)))

    const innerRampWidth = 2.0
    const innerRampTopPts = [0, 0.33, 0.67, 1].map((t) => {
        const pt = innerRampBotCurve.getPointAt(t)
        const tan = innerRampBotCurve.getTangentAt(t)
        const len = Math.hypot(tan.z, -tan.x) || 1
        return [pt.x + (tan.z / len) * innerRampWidth, 0.48, pt.z + (-tan.x / len) * innerRampWidth]
    })
    const innerRampTopCurve = new THREE.CatmullRomCurve3(innerRampTopPts.map(([x, y, z]) => new THREE.Vector3(x, y, z)))

    const innerTopCutT = 0.18
    const innerTopCutPt = innerRampTopCurve.getPointAt(innerTopCutT)
    const backTabX = innerTopCutPt.x + Math.abs(plazaBackZ - innerTopCutPt.z)

    const holeSteps = 16
    const leftMainShape = new THREE.Shape()
    leftMainShape.moveTo(leftOuterX, rampFrontOuterZ)
    leftMainShape.lineTo(-33.3, leftSmallBoxFrontZ - 1.75)
    for (let i = 0; i <= holeSteps; i++) {
        const pt = innerRampBotCurve.getPointAt(i / holeSteps)
        leftMainShape.lineTo(pt.x, pt.z)
    }
    for (let i = holeSteps; i >= 0; i--) {
        const t = innerTopCutT + (i / holeSteps) * (1 - innerTopCutT)
        const pt = innerRampTopCurve.getPointAt(t)
        leftMainShape.lineTo(pt.x, pt.z)
    }
    leftMainShape.lineTo(backTabX, plazaBackZ)
    leftMainShape.lineTo(-13.0, plazaBackZ)
    leftMainShape.lineTo(-13.0, rampFrontOuterZ)
    leftMainShape.closePath()

    const leftMainGeo = new THREE.ExtrudeGeometry(leftMainShape, { depth: 0.48, bevelEnabled: false })
    leftMainGeo.rotateX(Math.PI / 2)
    applyWorldUV(leftMainGeo)
    const leftMainMesh = new THREE.Mesh(leftMainGeo, walkwayMat)
    leftMainMesh.position.y = 0.48
    leftMainMesh.receiveShadow = true
    group.add(leftMainMesh)

    const vStartX = -20.5
    const vTipX = (vStartX + backTabX) * 0.5
    const vTipZ = plazaBackZ - 2.1

    const vFillShape = new THREE.Shape()
    vFillShape.moveTo(vStartX, plazaBackZ)
    vFillShape.lineTo(vTipX, vTipZ)
    vFillShape.lineTo(backTabX, plazaBackZ)
    vFillShape.closePath()
    const vFillGeo = new THREE.ExtrudeGeometry(vFillShape, { depth: 0.48, bevelEnabled: false })
    vFillGeo.rotateX(Math.PI / 2)
    applyWorldUV(vFillGeo)
    const vFillMesh = new THREE.Mesh(vFillGeo, walkwayMat)
    vFillMesh.position.y = 0.48
    vFillMesh.receiveShadow = true
    vFillMesh.castShadow = true
    group.add(vFillMesh)

    const backStepPts = [
        [-13.11, plazaBackZ],
        [vStartX, plazaBackZ],
        [vTipX, vTipZ],
        [backTabX, plazaBackZ]
    ]
    addSteppedTier(group, backStepPts, 0.44, 0.32, walkwayMat)
    addSteppedTier(group, backStepPts, 0.88, 0.16, walkwayMat)

    addLeftGreySlab(leftOuterX, leftSmallBoxRightX, rampFrontOuterZ, leftSmallBoxFrontZ)

    const irPositions = []
    const irUVs = []
    const irIndices = []
    for (let i = 0; i <= holeSteps; i++) {
        const t = i / holeSteps
        const bPt = innerRampBotCurve.getPointAt(t)
        const tPt = innerRampTopCurve.getPointAt(t)
        const rampY = 0.02 + 0.46 * t
        irPositions.push(bPt.x, rampY, bPt.z, tPt.x, rampY, tPt.z)
        irUVs.push(bPt.x * 0.22, bPt.z * 0.22, tPt.x * 0.22, tPt.z * 0.22)
        if (i < holeSteps) {
            const b = i * 2
            irIndices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
        }
    }
    const irGeo = new THREE.BufferGeometry()
    irGeo.setAttribute('position', new THREE.Float32BufferAttribute(irPositions, 3))
    irGeo.setAttribute('uv', new THREE.Float32BufferAttribute(irUVs, 2))
    irGeo.setIndex(irIndices)
    irGeo.computeVertexNormals()
    const leftInnerRampMesh = new THREE.Mesh(irGeo, walkwayMat)
    leftInnerRampMesh.receiveShadow = true
    group.add(leftInnerRampMesh)

    const trimmedInnerTopPts = [0.18, 0.45, 0.72, 1].map((t) => {
        const pt = innerRampTopCurve.getPointAt(t)
        return [pt.x, 0.48, pt.z]
    })

    const leftFrontRailingLen = sidePlazaWidth + 1.35
    const diagTopStart = [-8.15 - leftFrontRailingLen, 0.48, rampFrontOuterZ]
    const diagTopEnd = [-11.8, 0.0, rampFrontOuterZ + 0.55]
    const diagBotStart = [leftSmallBoxRightX, 0.48, rampFrontOuterZ + 1.15]
    const diagBotEnd = [
        diagBotStart[0] + (diagTopEnd[0] - diagTopStart[0]),
        0.0,
        diagBotStart[2] + (diagTopEnd[2] - diagTopStart[2])
    ]

    const diagRampGeo = new THREE.BufferGeometry()
    const drPos = new Float32Array([
        leftSmallBoxRightX, 0.48, rampFrontOuterZ,
        diagTopStart[0], 0.48, diagTopStart[2],
        diagTopEnd[0], 0.0, diagTopEnd[2],
        diagBotEnd[0], 0.0, diagBotEnd[2],
        diagBotStart[0], 0.48, diagBotStart[2],
        diagTopStart[0], -0.02, diagTopStart[2],
        diagTopEnd[0], -0.02, diagTopEnd[2],
        diagBotStart[0], -0.02, diagBotStart[2],
        diagBotEnd[0], -0.02, diagBotEnd[2]
    ])
    const drUV = new Float32Array([
        leftSmallBoxRightX * 0.22, rampFrontOuterZ * 0.22,
        diagTopStart[0] * 0.22, diagTopStart[2] * 0.22,
        diagTopEnd[0] * 0.22, diagTopEnd[2] * 0.22,
        diagBotEnd[0] * 0.22, diagBotEnd[2] * 0.22,
        diagBotStart[0] * 0.22, diagBotStart[2] * 0.22,
        diagTopStart[0] * 0.22, diagTopStart[2] * 0.22,
        diagTopEnd[0] * 0.22, diagTopEnd[2] * 0.22,
        diagBotStart[0] * 0.22, diagBotStart[2] * 0.22,
        diagBotEnd[0] * 0.22, diagBotEnd[2] * 0.22
    ])
    diagRampGeo.setAttribute('position', new THREE.BufferAttribute(drPos, 3))
    diagRampGeo.setAttribute('uv', new THREE.BufferAttribute(drUV, 2))
    diagRampGeo.setIndex([
        0, 4, 1, 1, 4, 3, 1, 3, 2,
        1, 2, 5, 2, 6, 5,
        4, 7, 3, 3, 7, 8
    ])
    diagRampGeo.computeVertexNormals()
    const leftDiagRampMesh = new THREE.Mesh(diagRampGeo, walkwayMat)
    leftDiagRampMesh.receiveShadow = true
    leftDiagRampMesh.castShadow = true
    group.add(leftDiagRampMesh)

    return {
        group,
        apronFrontZ,
        railingConfig: {
            sidePlazaWidth,
            rightRailingPoints,
            outerRailingPts,
            curveEndX,
            topZ,
            targetX,
            rampFrontOuterZ,
            apronLeftX,
            apronFrontZ,
            extCornerFarX,
            extCornerTipX,
            extCornerTipZ,
            extYellowStartX,
            leftOuterX,
            leftSmallBoxRightX,
            leftSmallBoxFrontZ,
            innerRampBotPts,
            trimmedInnerTopPts,
            backTabX,
            plazaBackZ,
            innerTopCutPt,
            diagTopStart,
            diagTopEnd,
            diagBotStart,
            diagBotEnd
        },
        pathParams: {
            rightEdgeCurve,
            tan0,
            curveEndX,
            topZ,
            innerRampBotCurve,
            innerRampTopCurve,
            rampWidth,
            innerRampWidth
        }
    }
}
