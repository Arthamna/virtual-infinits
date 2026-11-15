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

    // one instance = a tuft of short mown-lawn blades (single triangles), dark root -> light tip
    const tuftBlades = 9
    const tuftH = 0.11
    const tuftPos = []
    const tuftCol = []
    let tSeed = 7
    const tRand = () => {
        tSeed = (tSeed * 1664525 + 1013904223) >>> 0
        return tSeed / 4294967296
    }
    for (let i = 0; i < tuftBlades; i++) {
        const a = tRand() * Math.PI * 2
        const r = Math.sqrt(tRand()) * 0.09
        const bx = Math.cos(a) * r
        const bz = Math.sin(a) * r
        const facing = tRand() * Math.PI
        const w = 0.006 + tRand() * 0.005
        const h = tuftH * (0.55 + tRand() * 0.45)
        const lean = (tRand() - 0.5) * 0.05
        const wx = Math.cos(facing) * w
        const wz = Math.sin(facing) * w
        tuftPos.push(bx - wx, 0, bz - wz, bx + wx, 0, bz + wz, bx + lean, h, bz + lean * 0.6)
        tuftCol.push(0.45, 0.5, 0.4, 0.45, 0.5, 0.4, 1, 1, 0.9)
    }
    const bladeGeo = new THREE.BufferGeometry()
    bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(tuftPos, 3))
    bladeGeo.setAttribute('color', new THREE.Float32BufferAttribute(tuftCol, 3))
    // up-facing normals make blades shade like the ground under them instead of glowing at grazing sun
    bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(tuftPos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))

    const grassWindUniforms = { uTime: { value: 0 }, uWind: { value: 1 } }
    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
        vertexColors: true,
        side: THREE.DoubleSide
    })
    bladeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = grassWindUniforms.uTime
        shader.uniforms.uWind = grassWindUniforms.uWind
        shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float tipFactor = clamp(position.y / 0.11, 0.0, 1.0);
            vec4 instWorld = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
                instWorld = instanceMatrix * instWorld;
            #endif
            float sway = sin(uTime * 1.9 + instWorld.x * 0.28 + instWorld.z * 0.24) * 0.018 * uWind * tipFactor * tipFactor;
            transformed.x += sway;
            transformed.z += sway * 0.5;`
        )
    }

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

    const maxGrassBlades = 120000
    const grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, maxGrassBlades)
    grassBlades.receiveShadow = true
    const dummy = new THREE.Object3D()
    const bladeColor = new THREE.Color()
    const palette = [0x5a8a2c, 0x649434, 0x527f28, 0x6f9a36, 0x5e8530]

    let seed = 1337
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    let placed = 0
    let attempts = 0
    while (placed < maxGrassBlades && attempts < maxGrassBlades * 4) {
        attempts++
        const x = pInnerMinX + nextRand() * (pInnerMaxX - pInnerMinX)
        const z = pInnerMinZ + nextRand() * (pInnerMaxZ - pInnerMinZ)
        if (isBlockedGrassPos(x, z)) continue

        dummy.position.set(x, -0.04, z)
        dummy.rotation.set((nextRand() - 0.5) * 0.18, nextRand() * Math.PI * 2, (nextRand() - 0.5) * 0.18)
        const scaleXZ = 0.8 + nextRand() * 0.5
        const scaleY = 0.7 + nextRand() * 0.6
        dummy.scale.set(scaleXZ, scaleY, scaleXZ)
        dummy.updateMatrix()
        grassBlades.setMatrixAt(placed, dummy.matrix)

        bladeColor.setHex(palette[Math.floor(nextRand() * palette.length)])
        grassBlades.setColorAt(placed, bladeColor)
        placed++
    }
    grassBlades.count = placed
    grassBlades.instanceMatrix.needsUpdate = true
    if (grassBlades.instanceColor) grassBlades.instanceColor.needsUpdate = true
    group.add(grassBlades)

    return { group, grassWindUniforms, isBlocked: isBlockedGrassPos }
}
