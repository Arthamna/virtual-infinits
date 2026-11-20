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



    // 1. 3D Animated Lawn Grass Tuft Blades (18,000 instances, 1 draw call)
    const tuftGeo = new THREE.BufferGeometry()
    const tuftVerts = new Float32Array([
        // Blade A
        -0.024, 0.0, 0.0,
         0.024, 0.0, 0.0,
        -0.015, 0.14, 0.010,
         0.015, 0.14, 0.010,
         0.0,   0.28, 0.030,
        // Blade B (crossed)
        -0.008, 0.0, -0.022,
         0.008, 0.0,  0.022,
        -0.005, 0.13, -0.014,
         0.005, 0.13,  0.014,
         0.025, 0.26,  0.0
    ])
    tuftGeo.setAttribute('position', new THREE.BufferAttribute(tuftVerts, 3))
    tuftGeo.setIndex([
        0, 1, 2,  1, 3, 2,  2, 3, 4,
        5, 6, 7,  6, 8, 7,  7, 8, 9
    ])
    tuftGeo.computeVertexNormals()

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    bladeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = grassWindUniforms.uTime
        shader.uniforms.uWind = grassWindUniforms.uWind
        shader.vertexShader = "uniform float uTime;\nuniform float uWind;\nvarying float vBladeTip;\n" + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float tipFactor = clamp(position.y / 0.28, 0.0, 1.0);
            vBladeTip = tipFactor;
            vec4 instWorld = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
                instWorld = instanceMatrix * instWorld;
            #endif
            float sway = sin(uTime * 1.9 + instWorld.x * 0.28 + instWorld.z * 0.24) * 0.048 * uWind * tipFactor * tipFactor;
            transformed.x += sway;
            transformed.z += sway * 0.5;`
        )
        shader.fragmentShader = "varying float vBladeTip;\n" + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float ao = mix(0.40, 1.14, pow(vBladeTip, 0.72));
            diffuseColor.rgb *= ao;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.10, 0.84), smoothstep(0.55, 1.0, vBladeTip) * 0.55);`
        )
    }

    let seed = 1337
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const maxGrassBlades = 18000
    const grassBlades = new THREE.InstancedMesh(tuftGeo, bladeMat, maxGrassBlades)
    grassBlades.receiveShadow = true
    const dummy = new THREE.Object3D()
    const instColor = new THREE.Color()
    const grassPalette = [0x5c8c38, 0x6d9e42, 0x7eab4c, 0x4e7a2e, 0x8fb348]

    let placedBlades = 0
    let attempts = 0
    while (placedBlades < maxGrassBlades && attempts < maxGrassBlades * 4) {
        attempts++
        const x = pInnerMinX + nextRand() * (pInnerMaxX - pInnerMinX)
        const z = pInnerMinZ + nextRand() * (pInnerMaxZ - pInnerMinZ)
        if (isBlockedGrassPos(x, z)) continue

        dummy.position.set(x, -0.04, z)
        dummy.rotation.set((nextRand() - 0.5) * 0.18, nextRand() * Math.PI * 2, (nextRand() - 0.5) * 0.18)
        const sXZ = 0.85 + nextRand() * 0.70
        const sY = 0.80 + nextRand() * 0.90
        dummy.scale.set(sXZ, sY, sXZ)
        dummy.updateMatrix()
        grassBlades.setMatrixAt(placedBlades, dummy.matrix)
        instColor.setHex(grassPalette[Math.floor(nextRand() * grassPalette.length)])
        grassBlades.setColorAt(placedBlades, instColor)
        placedBlades++
    }
    grassBlades.count = placedBlades
    grassBlades.instanceMatrix.needsUpdate = true
    if (grassBlades.instanceColor) grassBlades.instanceColor.needsUpdate = true
    grassBlades.computeBoundingSphere()
    group.add(grassBlades)

    // 2. Tropical Fern / Pandan Rosettes (340 instances, 8-frond arching rosette, 1 draw call)
    const fernPositions = []
    const fernIndices = []
    const fronds = 8
    for (let f = 0; f < fronds; f++) {
        const a = (f / fronds) * Math.PI * 2 + (f % 2) * 0.14
        const cosA = Math.cos(a)
        const sinA = Math.sin(a)
        const px = -sinA
        const pz = cosA
        const rMax = f % 2 === 0 ? 0.55 : 0.44
        const hPeak = f % 2 === 0 ? 0.48 : 0.40
        const w0 = 0.032
        const w1 = 0.055
        const w2 = 0.040
        const base = fernPositions.length / 3

        // Segment 0 (center root)
        fernPositions.push(px * -w0, 0.0, pz * -w0,  px * w0, 0.0, pz * w0)
        // Segment 1 (mid-arch)
        const r1 = rMax * 0.42
        const y1 = hPeak * 0.88
        fernPositions.push(cosA * r1 - px * w1, y1, sinA * r1 - pz * w1,  cosA * r1 + px * w1, y1, sinA * r1 + pz * w1)
        // Segment 2 (high arch)
        const r2 = rMax * 0.78
        const y2 = hPeak
        fernPositions.push(cosA * r2 - px * w2, y2, sinA * r2 - pz * w2,  cosA * r2 + px * w2, y2, sinA * r2 + pz * w2)
        // Tip (gentle droop)
        fernPositions.push(cosA * rMax, hPeak * 0.62, sinA * rMax)

        fernIndices.push(
            base + 0, base + 1, base + 2,  base + 1, base + 3, base + 2,
            base + 2, base + 3, base + 4,  base + 3, base + 5, base + 4,
            base + 4, base + 5, base + 6
        )
    }
    const fernGeo = new THREE.BufferGeometry()
    fernGeo.setAttribute('position', new THREE.Float32BufferAttribute(fernPositions, 3))
    fernGeo.setIndex(fernIndices)
    fernGeo.computeVertexNormals()

    const fernMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    fernMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = grassWindUniforms.uTime
        shader.uniforms.uWind = grassWindUniforms.uWind
        shader.vertexShader = "uniform float uTime;\nuniform float uWind;\nvarying float vFernTip;\n" + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float fTip = clamp(position.y / 0.48, 0.0, 1.0);
            vFernTip = fTip;
            vec4 fInst = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
                fInst = instanceMatrix * fInst;
            #endif
            float fSway = sin(uTime * 1.5 + fInst.x * 0.22 + fInst.z * 0.22) * 0.035 * uWind * fTip;
            transformed.x += fSway;
            transformed.z += fSway * 0.6;`
        )
        shader.fragmentShader = "varying float vFernTip;\n" + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float fAo = mix(0.45, 1.12, pow(vFernTip, 0.75));
            diffuseColor.rgb *= fAo;`
        )
    }

    const maxFerns = 340
    const fernInst = new THREE.InstancedMesh(fernGeo, fernMat, maxFerns)
    fernInst.castShadow = true
    fernInst.receiveShadow = true
    const fernPalette = [0x3e752b, 0x4d8735, 0x619940, 0x346624]

    // Generate cluster centers for natural grouping
    const clusterCenters = []
    let cAttempts = 0
    while (clusterCenters.length < 48 && cAttempts < 500) {
        cAttempts++
        const cx = pInnerMinX + nextRand() * (pInnerMaxX - pInnerMinX)
        const cz = pInnerMinZ + nextRand() * (pInnerMaxZ - pInnerMinZ)
        if (!isBlockedGrassPos(cx, cz)) clusterCenters.push([cx, cz])
    }

    let placedFerns = 0
    attempts = 0
    while (placedFerns < maxFerns && attempts < maxFerns * 6 && clusterCenters.length > 0) {
        attempts++
        const c = clusterCenters[Math.floor(nextRand() * clusterCenters.length)]
        const ang = nextRand() * Math.PI * 2
        const rad = Math.pow(nextRand(), 0.7) * 3.8
        const x = c[0] + Math.cos(ang) * rad
        const z = c[1] + Math.sin(ang) * rad
        if (isBlockedGrassPos(x, z)) continue

        dummy.position.set(x, -0.04, z)
        dummy.rotation.set((nextRand() - 0.5) * 0.14, nextRand() * Math.PI * 2, (nextRand() - 0.5) * 0.14)
        const sc = 0.65 + nextRand() * 0.80
        dummy.scale.set(sc, sc * (0.85 + nextRand() * 0.35), sc)
        dummy.updateMatrix()
        fernInst.setMatrixAt(placedFerns, dummy.matrix)
        instColor.setHex(fernPalette[Math.floor(nextRand() * fernPalette.length)])
        fernInst.setColorAt(placedFerns, instColor)
        placedFerns++
    }
    fernInst.count = placedFerns
    fernInst.instanceMatrix.needsUpdate = true
    if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true
    fernInst.computeBoundingSphere()
    group.add(fernInst)

    // 3. Low Flowering Park Clumps (220 instances, 1 draw call)
    const flowerPositions = []
    const flowerIndices = []
    const petalCount = 5
    for (let pIdx = 0; pIdx < petalCount; pIdx++) {
        const a = (pIdx / petalCount) * Math.PI * 2
        const ox = Math.cos(a) * 0.12
        const oz = Math.sin(a) * 0.12
        const base = flowerPositions.length / 3
        const fy = 0.17 + (pIdx % 2) * 0.05
        // Small upward diamond blossom head
        flowerPositions.push(
            ox, fy - 0.04, oz,
            ox - 0.045, fy + 0.01, oz,
            ox, fy + 0.06, oz,
            ox + 0.045, fy + 0.01, oz,
            ox, fy + 0.01, oz - 0.045,
            ox, fy + 0.01, oz + 0.045
        )
        flowerIndices.push(
            base + 0, base + 1, base + 2,
            base + 0, base + 2, base + 3,
            base + 0, base + 4, base + 2,
            base + 0, base + 2, base + 5
        )
    }
    const flowerGeo = new THREE.BufferGeometry()
    flowerGeo.setAttribute('position', new THREE.Float32BufferAttribute(flowerPositions, 3))
    flowerGeo.setIndex(flowerIndices)
    flowerGeo.computeVertexNormals()

    const flowerMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    const maxFlowers = 220
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerMat, maxFlowers)
    flowerInst.receiveShadow = true
    const flowerPalette = [0xf0c242, 0xf7df7c, 0xe88548, 0xffffff]

    let placedFlowers = 0
    attempts = 0
    while (placedFlowers < maxFlowers && attempts < maxFlowers * 6 && clusterCenters.length > 0) {
        attempts++
        const c = clusterCenters[Math.floor(nextRand() * clusterCenters.length)]
        const ang = nextRand() * Math.PI * 2
        const rad = Math.pow(nextRand(), 0.7) * 3.5
        const x = c[0] + Math.cos(ang) * rad
        const z = c[1] + Math.sin(ang) * rad
        if (isBlockedGrassPos(x, z)) continue

        dummy.position.set(x, -0.04, z)
        dummy.rotation.set(0, nextRand() * Math.PI * 2, 0)
        const sc = 0.75 + nextRand() * 0.75
        dummy.scale.set(sc, sc * (0.85 + nextRand() * 0.4), sc)
        dummy.updateMatrix()
        flowerInst.setMatrixAt(placedFlowers, dummy.matrix)
        instColor.setHex(flowerPalette[Math.floor(nextRand() * flowerPalette.length)])
        flowerInst.setColorAt(placedFlowers, instColor)
        placedFlowers++
    }
    flowerInst.count = placedFlowers
    flowerInst.instanceMatrix.needsUpdate = true
    if (flowerInst.instanceColor) flowerInst.instanceColor.needsUpdate = true
    flowerInst.computeBoundingSphere()
    group.add(flowerInst)

    return { group, grassWindUniforms, isBlocked: isBlockedGrassPos }
}
