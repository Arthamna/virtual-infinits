import * as THREE from 'three'

export function createParkGrass({
    grassMat,
    lakeCutoutPath,
    lakeParams,
    curveSamples,
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

    const bladeGeo = new THREE.BufferGeometry()
    const bladeVerts = new Float32Array([
        -0.028, 0.0, 0.0,
        0.028, 0.0, 0.0,
        -0.018, 0.12, 0.012,
        0.018, 0.12, 0.012,
        0.0, 0.25, 0.036
    ])
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(bladeVerts, 3))
    bladeGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4])
    bladeGeo.computeVertexNormals()

    const grassWindUniforms = { uTime: { value: 0 } }
    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    bladeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = grassWindUniforms.uTime
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float tipFactor = clamp(position.y / 0.25, 0.0, 1.0);
            vec4 instWorld = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
                instWorld = instanceMatrix * instWorld;
            #endif
            float sway = sin(uTime * 1.9 + instWorld.x * 0.28 + instWorld.z * 0.24) * 0.045 * tipFactor * tipFactor;
            transformed.x += sway;
            transformed.z += sway * 0.5;`
        )
    }

    const walkwayCheckPts = []
    for (let i = 0; i < curveSamples.length; i += 4) {
        walkwayCheckPts.push(curveSamples[i].pt)
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
        if (x > -35.4 && x < 25.4 && z > -4.2 && z < 7.2) return true
        if (isInsideLakeOrRim(x, z)) return true
        for (let i = 0; i < walkwayCheckPts.length; i++) {
            const p = walkwayCheckPts[i]
            const dx = x - p.x
            const dz = z - p.z
            if (dx * dx + dz * dz < 2.4) return true
        }
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

    const maxGrassBlades = 24000
    const grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, maxGrassBlades)
    grassBlades.receiveShadow = true
    const dummy = new THREE.Object3D()
    const bladeColor = new THREE.Color()
    const palette = [0x3d6b2b, 0x4b7d34, 0x578c3c, 0x355e24]

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
        const scaleXZ = 0.85 + nextRand() * 0.65
        const scaleY = 0.75 + nextRand() * 0.9
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

    return { group, grassWindUniforms }
}
