import * as THREE from 'three'
import { createConcreteTexture } from './textures'

export function createParkPaths({
    walkwayMat,
    lakeParams,
    rightEdgeCurve,
    tan0,
    curveEndX,
    topZ,
    innerRampBotCurve,
    innerRampTopCurve,
    rampWidth,
    innerRampWidth,
    perimeterBounds
}) {
    const group = new THREE.Group()
    const { lakeCenterX, lakeCenterZ, lakeHalfLenZ, lakeAmpX } = lakeParams

    const inner0 = rightEdgeCurve.getPointAt(0)
    const iLen0 = Math.hypot(tan0.z, -tan0.x) || 1
    const pathStartLeftX = inner0.x + (tan0.z / iLen0) * 0.07
    const pathStartLeftZ = inner0.z + (-tan0.x / iLen0) * 0.07
    const pathStartRightX = curveEndX
    const pathStartRightZ = topZ

    const dirLen0 = Math.hypot(tan0.x, tan0.z) || 1
    const pathUx = -tan0.x / dirLen0
    const pathUz = -tan0.z / dirLen0

    const getLakeOffsetPoint = (theta) => {
        const s = Math.sin(theta)
        const c = Math.cos(theta)
        const lx = lakeCenterX + lakeAmpX * c * (0.17 + 0.83 * s * s)
        const lz = lakeCenterZ + lakeHalfLenZ * s * (0.78 + 0.22 * s * s)
        const dx = lakeAmpX * (-s * (0.17 + 0.83 * s * s) + c * (1.66 * s * c))
        const dz = lakeHalfLenZ * (0.78 + 0.66 * s * s) * c
        const nLen = Math.hypot(dz, -dx) || 1

        const leftWaistSwing = 6.2 * Math.exp(-Math.pow((theta + Math.PI) / 0.34, 2))
        const rightWaistSwing = 5.4 * Math.exp(-Math.pow((theta + 0.08) / 0.32, 2))
        const dynOffset = 3.8 + leftWaistSwing + rightWaistSwing
        return new THREE.Vector3(lx + (dz / nLen) * dynOffset, 0, lz + (-dx / nLen) * dynOffset)
    }

    const rightStartCenter = new THREE.Vector3(
        (pathStartLeftX + pathStartRightX) / 2,
        0,
        (pathStartLeftZ + pathStartRightZ) / 2
    )

    const leftRampBot0 = innerRampBotCurve.getPointAt(0)
    const leftRampTop0 = innerRampTopCurve.getPointAt(0)
    const leftRampTan0 = innerRampBotCurve.getTangentAt(0)
    const leftTanLen = Math.hypot(leftRampTan0.x, leftRampTan0.z) || 1
    const leftOutUx = -leftRampTan0.x / leftTanLen
    const leftOutUz = -leftRampTan0.z / leftTanLen
    const leftEndCenter = new THREE.Vector3(
        (leftRampBot0.x + leftRampTop0.x) / 2,
        0,
        (leftRampBot0.z + leftRampTop0.z) / 2
    )

    const thetaStart = 0.28 * Math.PI
    const thetaEnd = -1.28 * Math.PI
    const getLakeOffsetTangent = (theta) => {
        const eps = 0.002
        const pPrev = getLakeOffsetPoint(theta + eps)
        const pNext = getLakeOffsetPoint(theta - eps)
        return pNext.sub(pPrev).normalize()
    }

    const rightStartPt = rightStartCenter
    const rightEndPt = getLakeOffsetPoint(thetaStart)
    const rightStartTan = new THREE.Vector3(pathUx, 0, pathUz)
    const rightEndTan = getLakeOffsetTangent(thetaStart)
    const rightBezier = new THREE.CubicBezierCurve3(
        rightStartPt,
        rightStartPt.clone().addScaledVector(rightStartTan, 6.0),
        rightEndPt.clone().addScaledVector(rightEndTan, -6.0),
        rightEndPt
    )

    const lakeArcPts = []
    const lakeLoopSteps = 64
    for (let i = 0; i <= lakeLoopSteps; i++) {
        const theta = thetaStart + (i / lakeLoopSteps) * (thetaEnd - thetaStart)
        lakeArcPts.push(getLakeOffsetPoint(theta))
    }
    const lakeArcCurve = new THREE.CatmullRomCurve3(lakeArcPts, false, 'centripetal')

    const leftStartPt = getLakeOffsetPoint(thetaEnd)
    const leftStartTan = getLakeOffsetTangent(thetaEnd)
    const leftEndTan = new THREE.Vector3(-leftOutUx, 0, -leftOutUz)
    const leftBezier = new THREE.CubicBezierCurve3(
        leftStartPt,
        leftStartPt.clone().addScaledVector(leftStartTan, 6.0),
        leftEndCenter.clone().addScaledVector(leftEndTan, -6.0),
        leftEndCenter
    )

    const curveSamples = []
    const addSamples = (curve, count, includeLast, taperStart = 0, taperEnd = 0) => {
        const end = includeLast ? count : count - 1
        for (let i = 0; i <= end; i++) {
            const u = i / count
            curveSamples.push({
                pt: curve.getPointAt(u),
                tan: curve.getTangentAt(u),
                taper: taperStart + (taperEnd - taperStart) * u
            })
        }
    }
    addSamples(rightBezier, 40, false, 0, 0)
    addSamples(lakeArcCurve, 160, false, 0, 0)
    addSamples(leftBezier, 45, true, 0, 1)

    const rightHalfW = rampWidth / 2
    const leftHalfW = innerRampWidth / 2
    const curbW = 0.16
    const curbExtraH = 0.055
    const lpPos = []
    const lpUV = []
    const lpIdx = []
    const cbPos = []
    const cbUV = []
    const cbIdx = []

    for (let i = 0; i < curveSamples.length; i++) {
        const { pt, tan, taper } = curveSamples[i]
        const nLen = Math.hypot(tan.z, -tan.x) || 1
        const nx = tan.z / nLen
        const nz = -tan.x / nLen
        const halfW = rightHalfW * (1 - taper) + leftHalfW * taper

        let lx = pt.x + nx * halfW
        let lz = pt.z + nz * halfW
        let rx = pt.x - nx * halfW
        let rz = pt.z - nz * halfW

        if (i === 0) {
            lx = pathStartLeftX
            lz = pathStartLeftZ
            rx = pathStartRightX
            rz = pathStartRightZ
        } else if (i === curveSamples.length - 1) {
            lx = leftRampTop0.x
            lz = leftRampTop0.z
            rx = leftRampBot0.x
            rz = leftRampBot0.z
        }

        const u = i / (curveSamples.length - 1)
        const startBlend = Math.min(1, u / 0.04)
        const endBlend = Math.min(1, (1 - u) / 0.04)
        const midFactor = Math.min(startBlend, endBlend)
        const endBaseY = i === 0 ? 0.0 : 0.02 * taper
        const topY = endBaseY * (1 - midFactor) + 0.075 * midFactor
        const curbTopY = topY + curbExtraH * midFactor

        lpPos.push(
            lx, topY, lz,
            rx, topY, rz,
            lx, -0.04, lz,
            rx, -0.04, rz
        )
        lpUV.push(
            lx * 0.22, lz * 0.22,
            rx * 0.22, rz * 0.22,
            lx * 0.22, lz * 0.22,
            rx * 0.22, rz * 0.22
        )

        const lox = lx + nx * curbW
        const loz = lz + nz * curbW
        const rox = rx - nx * curbW
        const roz = rz - nz * curbW
        cbPos.push(
            lx, curbTopY, lz,
            lox, curbTopY, loz,
            lx, -0.04, lz,
            lox, -0.04, loz,
            rx, curbTopY, rz,
            rox, curbTopY, roz,
            rx, -0.04, rz,
            rox, -0.04, roz
        )
        cbUV.push(
            lx * 0.35, lz * 0.35,
            lox * 0.35, loz * 0.35,
            lx * 0.35, lz * 0.35,
            lox * 0.35, loz * 0.35,
            rx * 0.35, rz * 0.35,
            rox * 0.35, roz * 0.35,
            rx * 0.35, rz * 0.35,
            rox * 0.35, roz * 0.35
        )

        if (i < curveSamples.length - 1) {
            const b = i * 4
            const n = (i + 1) * 4
            lpIdx.push(
                b + 0, n + 0, b + 1, b + 1, n + 0, n + 1,
                b + 0, b + 2, n + 0, n + 0, b + 2, n + 2,
                b + 1, n + 1, b + 3, b + 3, n + 1, n + 3
            )
            const cb = i * 8
            const cn = (i + 1) * 8
            cbIdx.push(
                cb + 0, cb + 1, cn + 0, cb + 1, cn + 1, cn + 0,
                cb + 0, cn + 0, cb + 2, cn + 0, cn + 2, cb + 2,
                cb + 1, cb + 3, cn + 1, cb + 3, cn + 3, cn + 1,
                cb + 4, cn + 4, cb + 5, cb + 5, cn + 4, cn + 5,
                cb + 4, cb + 6, cn + 4, cb + 4, cb + 6, cn + 6,
                cb + 5, cn + 5, cb + 7, cb + 5, cn + 7, cb + 7
            )
        }
    }

    const fullWalkwayGeo = new THREE.BufferGeometry()
    fullWalkwayGeo.setAttribute('position', new THREE.Float32BufferAttribute(lpPos, 3))
    fullWalkwayGeo.setAttribute('uv', new THREE.Float32BufferAttribute(lpUV, 2))
    fullWalkwayGeo.setIndex(lpIdx)
    fullWalkwayGeo.computeVertexNormals()
    const fullWalkwayMesh = new THREE.Mesh(fullWalkwayGeo, walkwayMat)
    fullWalkwayMesh.castShadow = true
    fullWalkwayMesh.receiveShadow = true
    group.add(fullWalkwayMesh)

    const curbMat = new THREE.MeshStandardMaterial({
        map: createConcreteTexture(),
        color: 0x8d9199,
        roughness: 0.9,
        metalness: 0.03
    })
    const curbGeo = new THREE.BufferGeometry()
    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(cbPos, 3))
    curbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(cbUV, 2))
    curbGeo.setIndex(cbIdx)
    curbGeo.computeVertexNormals()
    const curbMesh = new THREE.Mesh(curbGeo, curbMat)
    curbMesh.castShadow = true
    curbMesh.receiveShadow = true
    group.add(curbMesh)

    const {
        perimH,
        pInnerMinX,
        pInnerMaxX,
        pInnerMinZ,
        pInnerMaxZ,
        pOuterMinX,
        pOuterMaxX,
        pOuterMinZ,
        pOuterMaxZ,
        innerCornerR,
        outerCornerR
    } = perimeterBounds

    const perimShape = new THREE.Shape()
    perimShape.moveTo(pOuterMinX + outerCornerR, pOuterMinZ)
    perimShape.lineTo(pOuterMaxX - outerCornerR, pOuterMinZ)
    perimShape.quadraticCurveTo(pOuterMaxX, pOuterMinZ, pOuterMaxX, pOuterMinZ + outerCornerR)
    perimShape.lineTo(pOuterMaxX, pOuterMaxZ - outerCornerR)
    perimShape.quadraticCurveTo(pOuterMaxX, pOuterMaxZ, pOuterMaxX - outerCornerR, pOuterMaxZ)
    perimShape.lineTo(pOuterMinX + outerCornerR, pOuterMaxZ)
    perimShape.quadraticCurveTo(pOuterMinX, pOuterMaxZ, pOuterMinX, pOuterMaxZ - outerCornerR)
    perimShape.lineTo(pOuterMinX, pOuterMinZ + outerCornerR)
    perimShape.quadraticCurveTo(pOuterMinX, pOuterMinZ, pOuterMinX + outerCornerR, pOuterMinZ)
    perimShape.closePath()

    const perimHoleCW = new THREE.Path()
    perimHoleCW.moveTo(pInnerMinX + innerCornerR, pInnerMinZ)
    perimHoleCW.quadraticCurveTo(pInnerMinX, pInnerMinZ, pInnerMinX, pInnerMinZ + innerCornerR)
    perimHoleCW.lineTo(pInnerMinX, pInnerMaxZ - innerCornerR)
    perimHoleCW.quadraticCurveTo(pInnerMinX, pInnerMaxZ, pInnerMinX + innerCornerR, pInnerMaxZ)
    perimHoleCW.lineTo(pInnerMaxX - innerCornerR, pInnerMaxZ)
    perimHoleCW.quadraticCurveTo(pInnerMaxX, pInnerMaxZ, pInnerMaxX, pInnerMaxZ - innerCornerR)
    perimHoleCW.lineTo(pInnerMaxX, pInnerMinZ + innerCornerR)
    perimHoleCW.quadraticCurveTo(pInnerMaxX, pInnerMinZ, pInnerMaxX - innerCornerR, pInnerMinZ)
    perimHoleCW.closePath()
    perimShape.holes.push(perimHoleCW)

    const perimGeo = new THREE.ExtrudeGeometry(perimShape, {
        depth: perimH,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
        curveSegments: 24
    })
    perimGeo.rotateX(Math.PI / 2)
    const perimPos = perimGeo.attributes.position
    const perimUV = new Float32Array(perimPos.count * 2)
    for (let i = 0; i < perimPos.count; i++) {
        perimUV[i * 2] = perimPos.getX(i) * 0.22
        perimUV[i * 2 + 1] = perimPos.getZ(i) * 0.22
    }
    perimGeo.setAttribute('uv', new THREE.BufferAttribute(perimUV, 2))
    const perimMesh = new THREE.Mesh(perimGeo, [walkwayMat, curbMat])
    perimMesh.position.y = 0.24
    perimMesh.castShadow = true
    perimMesh.receiveShadow = true
    group.add(perimMesh)

    return { group, curveSamples }
}
