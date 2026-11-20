import * as THREE from 'three'

export function createParkGrass({
    grassMat,
    lakeCutoutPath,
    lakeParams,
    curveSamples,
    pathHalfWidth,
    plazaGroup,
    perimeterBounds
}) {
    const group = new THREE.Group()
    const { lakeCenterX, lakeCenterZ, lakeHalfLenZ, lakeAmpX } = lakeParams
    const {
        pInnerMinX,
        pInnerMaxX,
        pInnerMinZ,
        pInnerMaxZ,
        innerCornerR
    } = perimeterBounds

    const gMinX = pInnerMinX - 0.5
    const gMaxX = pInnerMaxX + 0.5
    const gMinY = -(pInnerMaxZ + 0.5)
    const gMaxY = -(pInnerMinZ - 0.5)
    const gR = innerCornerR + 0.5

    const grassOuterShape = new THREE.Shape()
    grassOuterShape.moveTo(gMinX + gR, gMinY)
    grassOuterShape.lineTo(gMaxX - gR, gMinY)
    grassOuterShape.quadraticCurveTo(gMaxX, gMinY, gMaxX, gMinY + gR)
    grassOuterShape.lineTo(gMaxX, gMaxY - gR)
    grassOuterShape.quadraticCurveTo(gMaxX, gMaxY, gMaxX - gR, gMaxY)
    grassOuterShape.lineTo(gMinX + gR, gMaxY)
    grassOuterShape.quadraticCurveTo(gMinX, gMaxY, gMinX, gMaxY - gR)
    grassOuterShape.lineTo(gMinX, gMinY + gR)
    grassOuterShape.quadraticCurveTo(gMinX, gMinY, gMinX + gR, gMinY)
    grassOuterShape.closePath()
    grassOuterShape.holes.push(lakeCutoutPath)

    const grassGeo = new THREE.ShapeGeometry(grassOuterShape)
    grassGeo.rotateX(-Math.PI / 2)
    const grass = new THREE.Mesh(grassGeo, grassMat)
    grass.position.y = -0.04
    grass.receiveShadow = true
    group.add(grass)

    const grassWindUniforms = { uTime: { value: 0 }, uWind: { value: 1 } }

    // every sample (not every 4th) so blades never land on the lake path between samples
    const walkwayCheckPts = curveSamples.map((c) => c.pt)
    const walkwayClearR2 = (pathHalfWidth + 0.25) ** 2

    plazaGroup.updateMatrixWorld(true)
    const plazaBox = new THREE.Box3().setFromObject(plazaGroup).expandByScalar(0.15)
    const plazaRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 30)
    const isOnPlaza = (x, z) => {
        if (x < plazaBox.min.x || x > plazaBox.max.x || z < plazaBox.min.z || z > plazaBox.max.z) return false
        plazaRay.ray.origin.set(x, 20, z)
        return plazaRay.intersectObject(plazaGroup, true).length > 0
    }

    const isInsideLakeOrRim = (x, z) => {
        const dzNorm = (z - lakeCenterZ) / (lakeHalfLenZ * 1.035)
        if (Math.abs(dzNorm) > 1.0) return false
        let s = dzNorm
        for (let k = 0; k < 2; k++) {
            const f = s * (0.78 + 0.22 * s * s) - dzNorm
            const df = 0.78 + 0.66 * s * s
            s = Math.max(-1, Math.min(1, s - f / df))
        }
        const c = Math.sqrt(Math.max(0, 1 - s * s))
        const lakeHalfW = lakeAmpX * c * (0.17 + 0.83 * s * s) * 1.045 + 0.75
        return Math.abs(x - lakeCenterX) < lakeHalfW
    }

    const isBlockedGrassPos = (x, z) => {
        if (isInsideLakeOrRim(x, z)) return true
        for (let i = 0; i < walkwayCheckPts.length; i++) {
            const p = walkwayCheckPts[i]
            const dx = x - p.x
            const dz = z - p.z
            if (dx * dx + dz * dz < walkwayClearR2) return true
        }
        if (isOnPlaza(x, z)) return true
        if (x < pInnerMinX || x > pInnerMaxX || z < pInnerMinZ || z > pInnerMaxZ) return true
        const cxInner = x < pInnerMinX + innerCornerR
            ? pInnerMinX + innerCornerR
            : x > pInnerMaxX - innerCornerR
                ? pInnerMaxX - innerCornerR
                : x
        const czInner = z < pInnerMinZ + innerCornerR
            ? pInnerMinZ + innerCornerR
            : z > pInnerMaxZ - innerCornerR
                ? pInnerMaxZ - innerCornerR
                : z
        if (Math.hypot(x - cxInner, z - czInner) > innerCornerR) return true
        return false
    }


    return { group, grassWindUniforms, isBlocked: isBlockedGrassPos }
}
