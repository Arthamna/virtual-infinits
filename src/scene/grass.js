import * as THREE from 'three'

export function createParkGrass({
    grassMat,
    lakeCutoutPath,
    lakeParams,
    curveSamples,
    pathHalfWidth,
    plazaGroup,
    perimeterBounds,
    extraBlocked = () => false
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
        if (extraBlocked(x, z)) return true
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


    // 1. Lush Dense Curved-Blade Meadow Grass (32,000 7-blade clumps = 224,000 curved blades in 1 draw call)
    const tuftPositions = []
    const tuftNormals = []
    const tuftIndices = []
    const bladesPerClump = 7
    const bladeSegs = 3
    for (let b = 0; b < bladesPerClump; b++) {
        const ang = (b / bladesPerClump) * Math.PI * 2 + (b % 2) * 0.31
        const ox = b === 0 ? 0 : Math.cos(ang) * (0.14 + (b % 3) * 0.06)
        const oz = b === 0 ? 0 : Math.sin(ang) * (0.14 + (b % 3) * 0.06)
        const leanAng = ang + 0.35 + (b % 2) * 0.4
        const cosL = Math.cos(leanAng)
        const sinL = Math.sin(leanAng)
        const perpX = -sinL
        const perpZ = cosL

        const bladeH = 0.44 + (b % 3) * 0.09
        const baseHalfW = 0.034 + (b % 2) * 0.008
        const bend = 0.16 + (b % 3) * 0.05
        const vBase = tuftPositions.length / 3

        for (let s = 0; s < bladeSegs; s++) {
            const t = s / bladeSegs
            const y = bladeH * t
            const hw = baseHalfW * (1.0 - t * 0.72)
            const curve = bend * t * t
            const cx = ox + cosL * curve
            const cz = oz + sinL * curve
            // Tilt normal slightly upward and outward for smooth sunlit shading across the blade
            const nx = cosL * 0.35
            const ny = 0.88
            const nz = sinL * 0.35

            tuftPositions.push(
                cx - perpX * hw, y, cz - perpZ * hw,
                cx + perpX * hw, y, cz + perpZ * hw
            )
            tuftNormals.push(nx, ny, nz, nx, ny, nz)
        }
        // Sharp pointed tip
        tuftPositions.push(ox + cosL * bend, bladeH, oz + sinL * bend)
        tuftNormals.push(cosL * 0.25, 0.94, sinL * 0.25)

        for (let s = 0; s < bladeSegs - 1; s++) {
            const row = vBase + s * 2
            tuftIndices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2)
        }
        const topRow = vBase + (bladeSegs - 1) * 2
        tuftIndices.push(topRow, topRow + 1, topRow + 2)
    }

    const tuftGeo = new THREE.BufferGeometry()
    tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(tuftPositions, 3))
    tuftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(tuftNormals, 3))
    tuftGeo.setIndex(tuftIndices)

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.76,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    bladeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = grassWindUniforms.uTime
        shader.uniforms.uWind = grassWindUniforms.uWind
        shader.vertexShader = "uniform float uTime;\nuniform float uWind;\nvarying float vBladeTip;\nvarying float vWindWave;\n" + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float tipFactor = clamp(position.y / 0.56, 0.0, 1.0);
            vBladeTip = tipFactor;
            vec4 instWorld = vec4(0.0, 0.0, 0.0, 1.0);
            #ifdef USE_INSTANCING
                instWorld = instanceMatrix * instWorld;
            #endif
            float gustWave = sin(uTime * 2.1 + instWorld.x * 0.16 + instWorld.z * 0.13)
                           + 0.45 * sin(uTime * 3.4 - instWorld.x * 0.27 + instWorld.z * 0.21);
            vWindWave = gustWave * 0.5 + 0.5;
            float sway = gustWave * 0.095 * uWind * tipFactor * tipFactor;
            transformed.x += sway;
            transformed.z += sway * 0.55;
            transformed.y -= abs(sway) * 0.22 * tipFactor;`
        )
        shader.fragmentShader = "varying float vBladeTip;\nvarying float vWindWave;\n" + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            // Deep forest-green roots transitioning smoothly to bright luminous lime-yellow sunlit tips
            vec3 rootCol = vec3(0.09, 0.24, 0.05);
            vec3 midCol  = vec3(0.28, 0.54, 0.11);
            vec3 tipCol  = vec3(0.68, 0.86, 0.19);
            vec3 grad = vBladeTip < 0.48
                ? mix(rootCol, midCol, vBladeTip / 0.48)
                : mix(midCol, tipCol, (vBladeTip - 0.48) / 0.52);
            // Subtle brightness shimmer along rolling wind waves
            grad *= 0.92 + 0.16 * vWindWave * vBladeTip;
            diffuseColor.rgb = grad * mix(vec3(0.88), diffuseColor.rgb * 1.18, 0.45);`
        )
    }

    let seed = 1337
    const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const maxGrassBlades = 32000
    const grassBlades = new THREE.InstancedMesh(tuftGeo, bladeMat, maxGrassBlades)
    grassBlades.receiveShadow = true
    const dummy = new THREE.Object3D()
    const instColor = new THREE.Color()
    const grassPalette = [0xb2d848, 0x9ec93c, 0xc4e258, 0x8bb834, 0xd0e864]

    let placedBlades = 0
    let attempts = 0
    while (placedBlades < maxGrassBlades && attempts < maxGrassBlades * 4) {
        attempts++
        const x = pInnerMinX + nextRand() * (pInnerMaxX - pInnerMinX)
        const z = pInnerMinZ + nextRand() * (pInnerMaxZ - pInnerMinZ)
        if (isBlockedGrassPos(x, z)) continue

        dummy.position.set(x, -0.04, z)
        dummy.rotation.set((nextRand() - 0.5) * 0.14, nextRand() * Math.PI * 2, (nextRand() - 0.5) * 0.14)
        const sXZ = 0.85 + nextRand() * 0.65
        const sY = 0.78 + nextRand() * 0.72
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

    return { group, groundMesh: grass, grassWindUniforms, isBlocked: isBlockedGrassPos }
}
