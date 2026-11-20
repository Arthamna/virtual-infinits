import * as THREE from 'three'
import { createConcreteTexture, createLakeBedTexture, createWaterNormalTexture } from './textures'

export function createParkLake(grassTex) {
    const group = new THREE.Group()

    const lakeCenterX = -5.5
    const lakeCenterZ = -55.0
    const lakeHalfLenZ = 50.5
    const lakeAmpX = 60.0
    const lakeSamples = 200
    const bankOuterLip = 0.82
    const lakePts = []
    const lakeNormals = []

    for (let i = 0; i < lakeSamples; i++) {
        const theta = (i / lakeSamples) * Math.PI * 2
        const s = Math.sin(theta)
        const c = Math.cos(theta)
        const x = lakeCenterX + lakeAmpX * c * (0.17 + 0.83 * s * s)
        const z = lakeCenterZ + lakeHalfLenZ * s * (0.78 + 0.22 * s * s)
        const dx = lakeAmpX * (-s * (0.17 + 0.83 * s * s) + c * (1.66 * s * c))
        const dz = lakeHalfLenZ * (0.78 + 0.66 * s * s) * c
        const nLen = Math.hypot(dz, -dx) || 1
        lakePts.push(new THREE.Vector2(x, z))
        lakeNormals.push(new THREE.Vector2(dz / nLen, -dx / nLen))
    }

    const lakeCutoutPath = new THREE.Path()
    for (let i = 0; i < lakeSamples; i++) {
        const bx = lakePts[i].x + lakeNormals[i].x * bankOuterLip
        const bz = lakePts[i].y + lakeNormals[i].y * bankOuterLip
        if (i === 0) lakeCutoutPath.moveTo(bx, -bz)
        else lakeCutoutPath.lineTo(bx, -bz)
    }
    lakeCutoutPath.closePath()

    const lakeShape = new THREE.Shape()
    lakeShape.moveTo(lakePts[0].x, -lakePts[0].y)
    for (let i = 1; i < lakePts.length; i++) {
        lakeShape.lineTo(lakePts[i].x, -lakePts[i].y)
    }
    lakeShape.closePath()

    const buildBankRingStrip = (r0Off, y0, r1Off, y1, mat) => {
        const pos = []
        const uv = []
        const idx = []
        for (let i = 0; i <= lakeSamples; i++) {
            const k = i % lakeSamples
            const p = lakePts[k]
            const n = lakeNormals[k]
            const x0 = p.x + n.x * r0Off
            const z0 = p.y + n.y * r0Off
            const x1 = p.x + n.x * r1Off
            const z1 = p.y + n.y * r1Off
            pos.push(x0, y0, z0, x1, y1, z1)
            uv.push(x0 * 0.2, z0 * 0.2, x1 * 0.2, z1 * 0.2)
            if (i < lakeSamples) {
                const b = i * 2
                idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
            }
        }
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
        geo.setIndex(idx)
        geo.computeVertexNormals()
        const mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.receiveShadow = true
        return mesh
    }

    const bankGrassSlopeMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        color: 0xb7cc9e,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    const bankEarthWallMat = new THREE.MeshStandardMaterial({
        map: createConcreteTexture(),
        color: 0x665c4b,
        roughness: 0.92,
        metalness: 0.02,
        side: THREE.DoubleSide
    })

    group.add(buildBankRingStrip(bankOuterLip + 0.06, -0.038, 0.36, -0.22, bankGrassSlopeMat))
    group.add(buildBankRingStrip(0.36, -0.22, -0.45, -1.05, bankEarthWallMat))

    const lakeBedGeo = new THREE.ShapeGeometry(lakeShape)
    lakeBedGeo.rotateX(-Math.PI / 2)
    const lakeBedMesh = new THREE.Mesh(
        lakeBedGeo,
        new THREE.MeshStandardMaterial({ color: 0x16291c, roughness: 0.98, metalness: 0.0 })
    )
    lakeBedMesh.position.y = -1.05
    group.add(lakeBedMesh)

    const { geometry: lakeGeo } = buildPhysicalLakeWater(lakePts)
    const waterUniforms = {
        uNormalMap: { value: createWaterNormalTexture() },
        uTime: { value: 0 },
        uDistortion: { value: 1.0 },
        uSunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3).normalize() },
        uSunColor: { value: new THREE.Color(0xfff5e0) }
    }
    const lakeWaterMat = new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: `
            attribute float aShore;
            uniform float uTime;
            uniform float uDistortion;
            varying vec3 vWorldPos;
            varying vec3 vWaveNormal;
            varying float vCrest;
            varying float vShore;

            vec3 gerstnerWave(
                vec2 pos,
                vec2 dir,
                float steepness,
                float wavelength,
                float speedScale,
                inout vec3 tangent,
                inout vec3 binormal
            ) {
                float k = 6.28318530718 / wavelength;
                float c = sqrt(9.81 / k) * speedScale;
                vec2 d = normalize(dir);
                vec2 perp = vec2(-d.y, d.x);
                float crossMod = sin(dot(perp, pos) * k * 0.48 + uTime * 0.65) * 0.85
                               + cos(dot(perp, pos) * k * 0.23 - uTime * 0.42) * 0.55;
                float f = k * (dot(d, pos) - c * uTime) + crossMod;
                float a = steepness / k;
                float sf = sin(f);
                float cf = cos(f);

                tangent += vec3(
                    -d.x * d.x * steepness * sf,
                    d.x * steepness * cf,
                    -d.x * d.y * steepness * sf
                );
                binormal += vec3(
                    -d.x * d.y * steepness * sf,
                    d.y * steepness * cf,
                    -d.y * d.y * steepness * sf
                );

                return vec3(d.x * (a * cf), a * sf, d.y * (a * cf));
            }

            void main() {
                vShore = aShore;
                float shoreDamp = smoothstep(0.0, 2.6, aShore);
                float amp = clamp(0.75 + 0.35 * uDistortion, 0.6, 1.5) * shoreDamp;

                vec2 wp = position.xz;
                float gustEnv = (0.68 + 0.32 * sin(wp.x * 0.11 + uTime * 0.45) * cos(wp.y * 0.09 - uTime * 0.38))
                              * (0.80 + 0.20 * cos(wp.x * 0.23 - wp.y * 0.17 + uTime * 0.62));
                float wAmp = amp * gustEnv;

                vec3 tangent = vec3(1.0, 0.0, 0.0);
                vec3 binormal = vec3(0.0, 0.0, 1.0);
                vec3 disp = vec3(0.0);

                disp += gerstnerWave(wp, vec2( 0.86,  0.51), 0.095 * wAmp, 7.20, 0.68, tangent, binormal);
                disp += gerstnerWave(wp, vec2( 0.24,  0.97), 0.085 * wAmp, 4.60, 0.80, tangent, binormal);
                disp += gerstnerWave(wp, vec2(-0.74,  0.67), 0.072 * wAmp, 3.00, 0.92, tangent, binormal);
                disp += gerstnerWave(wp, vec2( 0.95, -0.31), 0.058 * wAmp, 2.00, 1.04, tangent, binormal);
                disp += gerstnerWave(wp, vec2(-0.42, -0.91), 0.045 * wAmp, 1.35, 1.15, tangent, binormal);
                disp += gerstnerWave(wp, vec2( 0.58, -0.81), 0.035 * wAmp, 0.92, 1.28, tangent, binormal);

                vec3 displaced = position + disp;
                vWaveNormal = normalize(mat3(modelMatrix) * normalize(cross(binormal, tangent)));
                vCrest = clamp((disp.y / max(0.04, 0.19 * amp)) * 0.5 + 0.5, 0.0, 1.0);

                vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            uniform sampler2D uNormalMap;
            uniform float uTime;
            uniform float uDistortion;
            uniform vec3 uSunDir;
            uniform vec3 uSunColor;
            varying vec3 vWorldPos;
            varying vec3 vWaveNormal;
            varying float vCrest;
            varying float vShore;

            void main() {
                vec2 uv1 = vWorldPos.xz * 0.11 + vec2(uTime * 0.045, uTime * 0.028);
                vec2 uv2 = vWorldPos.xz * 0.21 + vec2(-uTime * 0.035, uTime * 0.042);
                vec2 uv3 = vWorldPos.xz * 0.42 + vec2(uTime * 0.022, -uTime * 0.032);

                vec3 n1 = texture2D(uNormalMap, uv1).xyz * 2.0 - 1.0;
                vec3 n2 = texture2D(uNormalMap, uv2).xyz * 2.0 - 1.0;
                vec3 n3 = texture2D(uNormalMap, uv3).xyz * 2.0 - 1.0;

                vec3 ripple = vec3(
                    (n1.x * 0.5 + n2.x * 0.35 + n3.x * 0.25) * 0.45 * uDistortion,
                    0.0,
                    (n1.y * 0.5 + n2.y * 0.35 + n3.y * 0.25) * 0.45 * uDistortion
                );
                vec3 N = normalize(vWaveNormal + ripple);

                vec3 V = normalize(cameraPosition - vWorldPos);
                vec3 L = normalize(uSunDir);

                // Deep trough ocean-blue to mid-water blue + turquoise subsurface scattering in crests
                vec3 deepBlue = vec3(0.04, 0.15, 0.29);
                vec3 midBlue = vec3(0.09, 0.30, 0.49);
                vec3 sssTurquoise = vec3(0.16, 0.58, 0.64);

                float crestFactor = smoothstep(0.35, 0.92, vCrest);
                float backLit = pow(max(dot(V, -L + N * 0.65), 0.0), 2.5);
                vec3 waterBody = mix(deepBlue, midBlue, 0.35 + 0.65 * crestFactor);
                waterBody = mix(waterBody, sssTurquoise, crestFactor * (0.45 + 0.55 * backLit));
                float depthShade = mix(0.68, 1.0, smoothstep(0.0, 2.2, vShore));
                waterBody *= depthShade;

                // Fresnel sky reflection harmonized with golden afternoon sun
                float theta = max(dot(V, N), 0.0);
                float reflectance = 0.03 + 0.97 * pow(1.0 - theta, 4.5);
                vec3 R = reflect(-V, N);
                float skyGrad = clamp(R.y * 1.4, 0.0, 1.0);
                vec3 horizonCol = mix(vec3(0.84, 0.48, 0.32), uSunColor * 1.05, 0.55);
                vec3 reflectionSample = mix(horizonCol, vec3(0.18, 0.26, 0.50), skyGrad);

                vec3 col = mix(waterBody, reflectionSample, reflectance * 0.78);

                // Dual-lobe sun glitter path across wave facets
                vec3 H = normalize(L + V);
                float specTight = pow(max(dot(N, H), 0.0), 240.0) * 2.6;
                float specBroad = pow(max(dot(N, H), 0.0), 32.0) * 0.35;
                col += uSunColor * (specTight + specBroad);

                // Lacy whitecap foam on wave crests & subtle shore lap
                float foamTex = clamp((n1.z * 0.5 + n2.x * 0.5 + n3.y * 0.5) * 0.5 + 0.55, 0.0, 1.0);
                float crestFoam = smoothstep(0.68, 0.96, vCrest) * smoothstep(0.36, 0.78, foamTex);
                float shoreMask = 1.0 - smoothstep(0.0, 0.9, vShore);
                float shoreFoam = shoreMask * smoothstep(0.42, 0.85, foamTex) * 0.55;
                float foam = clamp(crestFoam * 0.88 + shoreFoam, 0.0, 0.92);
                col = mix(col, vec3(0.88, 0.95, 0.98), foam);

                float waterAlpha = clamp(mix(0.76, 0.98, reflectance + foam * 0.3), 0.0, 1.0);
                gl_FragColor = vec4(col, waterAlpha);

                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `
    })
    const lakeWater = new THREE.Mesh(lakeGeo, lakeWaterMat)
    lakeWater.position.y = -0.72
    group.add(lakeWater)

    // cheap stand-in for simplify mode: no per-frame reflection/refraction renders,
    // just a glossy surface reflecting the static sky environment map
    const simpleWater = new THREE.Mesh(
        lakeGeo,
        new THREE.MeshStandardMaterial({ color: 0x3d5a3e, roughness: 0.12, metalness: 0, envMapIntensity: 0.6 })
    )
    simpleWater.position.y = -0.54
    simpleWater.visible = false
    group.add(simpleWater)

    return {
        group,
        lakeWater,
        simpleWater,
        lakeCutoutPath,
        lakeParams: { lakeCenterX, lakeCenterZ, lakeHalfLenZ, lakeAmpX },
        update(elapsed = 0) {
            waterUniforms.uTime.value = elapsed * 0.85
        },
        setWind(strength = 1) {
            waterUniforms.uDistortion.value = 0.75 + 0.45 * strength
        },
        setSun(dir, color) {
            if (dir) waterUniforms.uSunDir.value.copy(dir).normalize()
            if (color) waterUniforms.uSunColor.value.copy(color)
        }
    }
}

function pointInPolygon(x, z, pts) {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x, zi = pts[i].y
        const xj = pts[j].x, zj = pts[j].y
        if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
            inside = !inside
        }
    }
    return inside
}

function buildPhysicalLakeWater(lakePts) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of lakePts) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minZ) minZ = p.y
        if (p.y > maxZ) maxZ = p.y
    }
    minX -= 1.0
    maxX += 1.0
    minZ -= 1.0
    maxZ += 1.0

    const segX = 96
    const segZ = 84
    const cols = segX + 1
    const rows = segZ + 1
    const gridShore = new Float32Array(cols * rows)
    const gridX = new Float32Array(cols)
    const gridZ = new Float32Array(rows)

    for (let ix = 0; ix < cols; ix++) gridX[ix] = minX + (ix / segX) * (maxX - minX)
    for (let iz = 0; iz < rows; iz++) gridZ[iz] = minZ + (iz / segZ) * (maxZ - minZ)

    for (let iz = 0; iz < rows; iz++) {
        const z = gridZ[iz]
        for (let ix = 0; ix < cols; ix++) {
            const x = gridX[ix]
            let minD2 = Infinity
            for (let k = 0; k < lakePts.length; k++) {
                const dx = x - lakePts[k].x
                const dz = z - lakePts[k].y
                const d2 = dx * dx + dz * dz
                if (d2 < minD2) minD2 = d2
            }
            const dist = Math.sqrt(minD2)
            gridShore[iz * cols + ix] = pointInPolygon(x, z, lakePts) ? dist : -dist
        }
    }

    const pos = []
    const nrm = []
    const uv = []
    const shore = []
    const idx = []
    const vertMap = new Int32Array(cols * rows).fill(-1)
    const spanX = maxX - minX
    const spanZ = maxZ - minZ

    const getVert = (ix, iz) => {
        const gi = iz * cols + ix
        if (vertMap[gi] !== -1) return vertMap[gi]
        const vi = pos.length / 3
        const x = gridX[ix]
        const z = gridZ[iz]
        pos.push(x, 0, z)
        nrm.push(0, 1, 0)
        uv.push((x - minX) / spanX, (z - minZ) / spanZ)
        shore.push(Math.max(0, gridShore[gi]))
        vertMap[gi] = vi
        return vi
    }

    for (let iz = 0; iz < segZ; iz++) {
        for (let ix = 0; ix < segX; ix++) {
            const s00 = gridShore[iz * cols + ix]
            const s10 = gridShore[iz * cols + ix + 1]
            const s01 = gridShore[(iz + 1) * cols + ix]
            const s11 = gridShore[(iz + 1) * cols + ix + 1]
            if (s00 < -1.2 && s10 < -1.2 && s01 < -1.2 && s11 < -1.2) continue

            const v00 = getVert(ix, iz)
            const v10 = getVert(ix + 1, iz)
            const v01 = getVert(ix, iz + 1)
            const v11 = getVert(ix + 1, iz + 1)
            idx.push(v00, v01, v10, v10, v01, v11)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shore, 1))
    geometry.setIndex(idx)

    const uniforms = {
        uTime: { value: 0 },
        uWind: { value: 1 },
        uSunDir: { value: new THREE.Vector3(-0.6, 0.5, 0.2).normalize() },
        uSunColor: { value: new THREE.Color(0xffb878) }
    }
    return { geometry, uniforms }
}

function patchPhysicalLakeWater(water) {
    const mat = water.material
    mat.uniforms.uTime = { value: 0 }
    mat.uniforms.uWind = { value: 1 }

    mat.vertexShader =
        `attribute float aShore;
        uniform float uTime;
        uniform float uWind;
        varying float vShore;

        vec3 gerstnerWave(vec2 pos, vec2 dir, float steepness, float wavelength, float speedScale) {
            float k = 6.28318530718 / wavelength;
            float c = sqrt(9.81 / k) * speedScale;
            vec2 d = normalize(dir);
            float f = k * (dot(d, pos) - c * uTime);
            float a = steepness / k;
            return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
        }\n` +
        mat.vertexShader
            .replace(
                'void main() {',
                `void main() {
                    vShore = aShore;
                    float shoreDamp = smoothstep(0.0, 2.8, aShore);
                    float amp = clamp(0.65 + 0.35 * uWind, 0.5, 1.8) * shoreDamp;
                    vec2 wp = position.xz;
                    vec3 wavePos = position
                        + gerstnerWave(wp, vec2(0.85, 0.52), 0.015 * amp, 14.0, 0.42)
                        + gerstnerWave(wp, vec2(0.35, 0.94), 0.012 * amp, 7.5,  0.50)
                        + gerstnerWave(wp, vec2(-0.65, 0.76), 0.009 * amp, 4.2, 0.58)
                        + gerstnerWave(wp, vec2(0.92, -0.38), 0.006 * amp, 2.3, 0.65);`
            )
            .replaceAll('vec4( position, 1.0 )', 'vec4( wavePos, 1.0 )')

    mat.fragmentShader =
        `uniform float uTime;
        varying float vShore;\n` +
        mat.fragmentShader
            .replace(
                'vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',
                'vec3 reflectionSample = vec3( texture2D( mirrorSampler, clamp( mirrorCoord.xy / mirrorCoord.w + distortion * 0.45, 0.002, 0.998 ) ) );'
            )
            .replace(
                'gl_FragColor = vec4( outgoingLight, alpha );',
                `float shoreMask = 1.0 - smoothstep(0.0, 0.85, vShore);
                float rippleLine = sin(vShore * 14.0 - uTime * 2.4) * 0.5 + 0.5;
                float foam = shoreMask * smoothstep(0.55, 0.95, rippleLine) * 0.16;
                outgoingLight = mix(outgoingLight, vec3(0.86, 0.90, 0.86), foam);
                float shoreAlpha = mix(0.68, alpha, smoothstep(0.0, 2.2, vShore));
                gl_FragColor = vec4( outgoingLight, shoreAlpha );`
            )
}
