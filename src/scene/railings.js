import * as THREE from 'three'

export function createRailing(length = 4.2, customPostCount = null) {
    const group = new THREE.Group()
    const railMat = new THREE.MeshStandardMaterial({
        color: 0x0c63d6,
        roughness: 0.32,
        metalness: 0.45,
        envMapIntensity: 0.55
    })

    const postCount = customPostCount ?? Math.max(2, Math.round(length / 2.1) + 1)
    const postGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.96, 12)
    const capGeo = new THREE.SphereGeometry(0.048, 12, 8)
    for (let i = 0; i < postCount; i++) {
        const px = -length / 2 + (i / (postCount - 1)) * length
        const post = new THREE.Mesh(postGeo, railMat)
        post.position.set(px, 0.48, 0)
        post.castShadow = true
        post.receiveShadow = true
        group.add(post)

        const cap = new THREE.Mesh(capGeo, railMat)
        cap.position.set(px, 0.96, 0)
        group.add(cap)
    }

    const barGeo = new THREE.CylinderGeometry(0.038, 0.038, length, 12)
    barGeo.rotateZ(Math.PI / 2)
    ;[0.26, 0.58, 0.9].forEach((y) => {
        const bar = new THREE.Mesh(barGeo, railMat)
        bar.position.y = y
        bar.castShadow = true
        bar.receiveShadow = true
        group.add(bar)
    })

    return group
}

export function createCurvedRailing(points, postCount = 5, getPostBottomY = null) {
    const group = new THREE.Group()
    const railMat = new THREE.MeshStandardMaterial({
        color: 0x0c63d6,
        roughness: 0.32,
        metalness: 0.45,
        envMapIntensity: 0.55
    })

    const toVec3 = (p, yOffset = 0) =>
        p.length === 3
            ? new THREE.Vector3(p[0], p[1] + yOffset, p[2])
            : new THREE.Vector3(p[0], yOffset, p[1])

    const baseCurve = new THREE.CatmullRomCurve3(points.map((p) => toVec3(p, 0)))

    ;[0.26, 0.58, 0.9].forEach((yOffset) => {
        const railCurve = new THREE.CatmullRomCurve3(points.map((p) => toVec3(p, yOffset)))
        const tubeGeo = new THREE.TubeGeometry(railCurve, 24, 0.038, 10, false)
        const tube = new THREE.Mesh(tubeGeo, railMat)
        tube.castShadow = true
        tube.receiveShadow = true
        group.add(tube)
    })

    const capGeo = new THREE.SphereGeometry(0.048, 12, 8)
    for (let i = 0; i < postCount; i++) {
        const t = i / (postCount - 1)
        const pt = baseCurve.getPointAt(t)
        const topY = pt.y + 0.96
        const bottomY = getPostBottomY ? getPostBottomY(t) : pt.y
        const postHeight = Math.max(0.05, topY - bottomY)
        const postGeo = new THREE.CylinderGeometry(0.048, 0.048, postHeight, 12)
        const post = new THREE.Mesh(postGeo, railMat)
        post.position.set(pt.x, (topY + bottomY) / 2, pt.z)
        post.castShadow = true
        post.receiveShadow = true
        group.add(post)

        const cap = new THREE.Mesh(capGeo, railMat)
        cap.position.set(pt.x, topY, pt.z)
        group.add(cap)
    }

    return group
}

export function createPlazaRailings({
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
}) {
    const group = new THREE.Group()

    const leftPostSpacing = (sidePlazaWidth + 1.35) / 5
    const leftWallRailingLen = leftPostSpacing * 4
    const leftWallRailing = createRailing(leftWallRailingLen, 5)
    leftWallRailing.position.set(-8.15 - leftWallRailingLen / 2, 0.48, -2.35)
    group.add(leftWallRailing)

    const rightWallRailing = createRailing(3.2)
    rightWallRailing.position.set(12.95, 0.48, -1.65)
    group.add(rightWallRailing)

    const rightCurvedRailing = createCurvedRailing(rightRailingPoints, 3)
    rightCurvedRailing.position.y = 0.48
    group.add(rightCurvedRailing)

    const outerCurvedRailing = createCurvedRailing(outerRailingPts, 5, (t) => 0.48 * t)
    group.add(outerCurvedRailing)

    const topFenceLen = targetX - curveEndX
    const topFence = createRailing(topFenceLen, Math.max(2, Math.round(topFenceLen / 2.1) + 1))
    topFence.position.set(curveEndX + topFenceLen / 2, 0.48, topZ)
    group.add(topFence)

    const apronRailStartX = 6.35
    const apronLeftRailLen = apronLeftX - apronRailStartX
    const apronLeftRail = createRailing(apronLeftRailLen, 2)
    apronLeftRail.position.set(apronRailStartX + apronLeftRailLen / 2, 0.48, rampFrontOuterZ)
    group.add(apronLeftRail)

    const apronStepLen = apronFrontZ - rampFrontOuterZ
    const apronStepRail = createRailing(apronStepLen, 2)
    apronStepRail.rotation.y = Math.PI / 2
    apronStepRail.position.set(apronLeftX, 0.48, rampFrontOuterZ + apronStepLen / 2)
    group.add(apronStepRail)

    const apronFrontLen = targetX - apronLeftX
    const apronFrontRail = createRailing(apronFrontLen, Math.max(2, Math.round(apronFrontLen / 2.1) + 1))
    apronFrontRail.position.set(apronLeftX + apronFrontLen / 2, 0.48, apronFrontZ)
    group.add(apronFrontRail)

    const extTopRail = createRailing(extCornerFarX - targetX, 5)
    extTopRail.position.set((targetX + extCornerFarX) * 0.5, 0.48, apronFrontZ)
    group.add(extTopRail)
    group.add(
        createCurvedRailing(
            [
                [extCornerFarX, 0.48, apronFrontZ],
                [extCornerTipX, 0.48, extCornerTipZ]
            ],
            3
        )
    )
    group.add(
        createCurvedRailing(
            [
                [extCornerTipX, 0.48, extCornerTipZ],
                [extYellowStartX, 0.48, topZ]
            ],
            3
        )
    )

    const leftFrontRailingLen = sidePlazaWidth + 1.35
    const leftFrontRailing = createRailing(leftFrontRailingLen, 6)
    leftFrontRailing.position.set(-8.15 - leftFrontRailingLen / 2, 0.48, rampFrontOuterZ)
    group.add(leftFrontRailing)

    const leftBackDiagRail = createCurvedRailing(
        [
            [leftOuterX, 0.48, leftSmallBoxFrontZ],
            [leftOuterX, 0.48, leftSmallBoxFrontZ - 0.85],
            [-33.3, 0.48, leftSmallBoxFrontZ - 1.75],
            innerRampBotPts[0]
        ],
        6
    )
    group.add(leftBackDiagRail)

    group.add(createCurvedRailing(innerRampBotPts, 4, (t) => 0.02 + 0.46 * t))
    group.add(createCurvedRailing(trimmedInnerTopPts, 4, (u) => 0.02 + 0.46 * (0.18 + 0.82 * u)))
    group.add(
        createCurvedRailing(
            [
                [backTabX, 0.48, plazaBackZ],
                [innerTopCutPt.x, 0.48, innerTopCutPt.z]
            ],
            2
        )
    )

    const leftCornerVertLen = leftSmallBoxFrontZ - rampFrontOuterZ
    const leftCornerVertRail = createRailing(leftCornerVertLen, 2)
    leftCornerVertRail.rotation.y = Math.PI / 2
    leftCornerVertRail.position.set(leftSmallBoxRightX, 0.48, rampFrontOuterZ + leftCornerVertLen / 2)
    group.add(leftCornerVertRail)

    const leftCornerHorizLen = leftSmallBoxRightX - leftOuterX
    const leftCornerHorizRail = createRailing(leftCornerHorizLen, 13)
    leftCornerHorizRail.position.set(leftOuterX + leftCornerHorizLen / 2, 0.48, leftSmallBoxFrontZ)
    group.add(leftCornerHorizRail)

    const leftDiagTopRail = createCurvedRailing(
        [
            diagTopStart,
            [(diagTopStart[0] + diagTopEnd[0]) / 2, 0.24, (diagTopStart[2] + diagTopEnd[2]) / 2],
            diagTopEnd
        ],
        3
    )
    group.add(leftDiagTopRail)

    const leftDiagBotRail = createCurvedRailing(
        [
            diagBotStart,
            [(diagBotStart[0] + diagBotEnd[0]) / 2, 0.24, (diagBotStart[2] + diagBotEnd[2]) / 2],
            diagBotEnd
        ],
        3
    )
    group.add(leftDiagBotRail)

    return group
}
