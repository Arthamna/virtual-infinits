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
        uSunColor: { value: new THREE.Color(0xfff5e0) },
        uHorizonColor: { value: new THREE.Color(0xb8cfe0) },
        uZenithColor: { value: new THREE.Color(0x1f4b78) },
        uDaylight: { value: 1.0 }
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
            uniform vec3 uHorizonColor;
            uniform vec3 uZenithColor;
            uniform float uDaylight;
            varying vec3 vWorldPos;
            varying vec3 vWaveNormal;
            varying float vCrest;
            varying float vShore;

            float wHash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
            }

            float wNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x),
                    mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x),
                    f.y
                );
            }

            float wFbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
                for (int i = 0; i < 3; i++) {
                    v += a * wNoise(p);
                    p = rot * p * 2.07;
                    a *= 0.5;
                }
                return v;
            }

            // Sharp web-like water caustics (interference ridges)
            float waterCaustics(vec2 p, float t) {
                vec2 p1 = p * 0.62 + vec2(t * 0.28, -t * 0.21);
                vec2 p2 = p * 0.85 + vec2(-t * 0.24, t * 0.31);
                float c1 = abs(sin(p1.x + sin(p1.y * 1.3 + t * 0.5)) * cos(p1.y + cos(p1.x * 1.1 - t * 0.4)));
                float c2 = abs(sin(p2.x * 1.2 - cos(p2.y + t * 0.45)) * cos(p2.y * 1.1 + sin(p2.x - t * 0.35)));
                return pow(1.0 - min(c1, c2), 4.2);
            }

            void main() {
                // 4-octave multi-scale scrolling capillary ripples (Water Pro style crispness)
                vec2 uv1 = vWorldPos.xz * 0.095 + vec2(uTime * 0.042, uTime * 0.026);
                vec2 uv2 = vWorldPos.xz * 0.195 + vec2(-uTime * 0.036, uTime * 0.044);
                vec2 uv3 = vWorldPos.xz * 0.410 + vec2(uTime * 0.028, -uTime * 0.034);
                vec2 uv4 = vWorldPos.xz * 0.880 + vec2(-uTime * 0.024, -uTime * 0.029);

                vec3 n1 = texture2D(uNormalMap, uv1).xyz * 2.0 - 1.0;
                vec3 n2 = texture2D(uNormalMap, uv2).xyz * 2.0 - 1.0;
                vec3 n3 = texture2D(uNormalMap, uv3).xyz * 2.0 - 1.0;
                vec3 n4 = texture2D(uNormalMap, uv4).xyz * 2.0 - 1.0;

                float ripAmp = 0.50 * uDistortion;
                vec3 ripple = vec3(
                    (n1.x * 0.44 + n2.x * 0.30 + n3.x * 0.22 + n4.x * 0.16) * ripAmp,
                    0.0,
                    (n1.y * 0.44 + n2.y * 0.30 + n3.y * 0.22 + n4.y * 0.16) * ripAmp
                );
                vec3 N = normalize(vWaveNormal + ripple);

                vec3 V = normalize(cameraPosition - vWorldPos);
                vec3 L = normalize(uSunDir);

                // React physically to sun elevation & light color (bright turquoise at noon, darker warm-amber at sunset, deep midnight at night)
                float sunElev = clamp(L.y, 0.0, 1.0);
                float sunsetWarmth = (1.0 - smoothstep(0.18, 0.58, sunElev)) * smoothstep(0.18, 0.50, uDaylight);
                vec3 sunTint = mix(vec3(1.0), uSunColor * 1.15, 0.72);

                // Organic underwater depth field (crystal turquoise shallows + deep cobalt-navy basins)
                float shoreDepth = smoothstep(0.0, 5.2, vShore);
                float basinNoise = wFbm(vWorldPos.xz * 0.055 + vec2(3.7, -2.1));
                float deepPatch = smoothstep(0.42, 0.78, basinNoise);
                float waterDepth = clamp(shoreDepth * (0.45 + 1.65 * deepPatch) + 0.12, 0.08, 2.4);

                // Refracted underwater seabed + dark rock/reef patches + dancing caustics
                vec2 bedPos = vWorldPos.xz + N.xz * (0.45 + waterDepth * 0.28);
                float bedDetail = wFbm(bedPos * 0.32);
                float darkReef = smoothstep(0.46, 0.76, wFbm(bedPos * 0.16 + vec2(-4.2, 6.1)));
                vec3 sandBed = mix(vec3(0.46, 0.62, 0.58), vec3(0.14, 0.24, 0.27), darkReef);
                sandBed *= (0.78 + 0.42 * bedDetail) * sunTint;

                float caustics = waterCaustics(bedPos, uTime * 1.15);
                float causticFade = exp(-waterDepth * 0.85) * uDaylight * mix(1.0, 0.32, sunsetWarmth);
                vec3 causticCol = mix(vec3(0.32, 0.88, 0.86), uSunColor * 1.1, sunsetWarmth * 0.85);
                vec3 litBed = sandBed + causticCol * caustics * causticFade * 0.95;

                // Beer-Lambert optical absorption: red dies first -> crystal cyan-turquoise shallows, deep ocean blue in troughs
                vec3 shallowTurquoise = vec3(0.08, 0.58, 0.62);
                vec3 midOcean = vec3(0.05, 0.34, 0.48);
                vec3 deepOcean = vec3(0.025, 0.12, 0.24);

                vec3 transmittance = exp(-waterDepth * vec3(1.15, 0.34, 0.22));
                vec3 scatterCol = mix(shallowTurquoise, midOcean, smoothstep(0.2, 1.15, waterDepth));
                scatterCol = mix(scatterCol, deepOcean, smoothstep(0.95, 2.1, waterDepth));

                // Subsurface scattering (SSS) glowing emerald-turquoise at noon, warm amber-teal at sunset
                float crestFactor = smoothstep(0.32, 0.92, vCrest);
                float backLit = pow(max(dot(V, -L + N * 0.52), 0.0), 3.0);
                float sssMask = clamp(crestFactor * (0.50 + 0.65 * backLit) + (1.0 - shoreDepth) * 0.28, 0.0, 1.0);
                vec3 sssCol = mix(vec3(0.12, 0.78, 0.76), mix(vec3(0.18, 0.32, 0.30), uSunColor * 0.95, 0.65), sunsetWarmth);
                scatterCol = mix(scatterCol, sssCol, sssMask * mix(0.52, 0.42, sunsetWarmth));

                vec3 waterVolume = mix(scatterCol, litBed * vec3(0.65, 1.0, 0.98), transmittance * mix(0.68, 0.35, sunsetWarmth));
                // Darken water body naturally as the sun drops toward sunset or night
                float bodyBrightness = mix(0.18, 1.0, uDaylight) * mix(1.0, 0.44, sunsetWarmth);
                waterVolume *= bodyBrightness;
                waterVolume = mix(waterVolume, waterVolume * sunTint, sunsetWarmth * 0.65);

                // Physical Schlick Fresnel sky reflection (F0 = 0.02) + automatic sunset/day/night sky color from sun elevation
                float ndotv = max(dot(V, N), 0.0);
                float fresnel = 0.02 + 0.98 * pow(1.0 - ndotv, 5.0);
                float reflStrength = mix(fresnel * 0.92, 0.18 + fresnel * 0.80, sunsetWarmth);
                vec3 R = reflect(-V, N);
                float skyGrad = clamp(pow(max(R.y, 0.0), 0.65) * 1.25, 0.0, 1.0);

                vec3 autoHorizon = mix(vec3(0.68, 0.80, 0.90), mix(vec3(0.88, 0.42, 0.18), uSunColor * 1.15, 0.62), sunsetWarmth);
                vec3 autoZenith = mix(vec3(0.14, 0.34, 0.62), vec3(0.11, 0.15, 0.28), sunsetWarmth);
                autoHorizon = mix(vec3(0.06, 0.10, 0.20), autoHorizon, uDaylight);
                autoZenith = mix(vec3(0.02, 0.04, 0.09), autoZenith, uDaylight);

                vec3 reflectionSample = mix(autoHorizon, autoZenith, skyGrad);
                float sunHaloRefl = pow(max(dot(R, L), 0.0), 6.0);
                reflectionSample += uSunColor * sunHaloRefl * mix(0.28, 1.05, sunsetWarmth) * uDaylight;

                vec3 col = mix(waterVolume, reflectionSample, clamp(reflStrength, 0.0, 0.95));

                // Crisp Water-Pro sun/moon sparkle glitter (stronger warm golden ribbon at sunset)
                vec3 H = normalize(L + V);
                float ndoth = max(dot(N, H), 0.0);
                float specSparkle = pow(ndoth, 520.0) * mix(1.6, 4.4, uDaylight);
                float specMid = pow(ndoth, 75.0) * mix(0.20, 0.65, uDaylight) * mix(1.0, 1.55, sunsetWarmth);
                float specBroad = pow(ndoth, 16.0) * mix(0.04, 0.16, uDaylight) * mix(1.0, 2.1, sunsetWarmth);
                col += uSunColor * (specSparkle + specMid + specBroad);

                // Organic lacy/webbed sea-foam streaks on crests, wind lines, and shoreline (lit by current sky/sun)
                vec2 foamWarp = vec2(n1.x + n2.y, n2.x - n3.y) * 0.45;
                float foamNoiseA = wFbm(vWorldPos.xz * 0.36 + foamWarp + vec2(uTime * 0.05, -uTime * 0.03));
                float foamNoiseB = wNoise(vWorldPos.xz * 1.15 - foamWarp * 1.4 - vec2(uTime * 0.04, uTime * 0.06));
                float foamWeb = smoothstep(0.36, 0.72, foamNoiseA) * smoothstep(0.32, 0.74, foamNoiseB);
                float lacyStreak = smoothstep(0.56, 0.84, foamNoiseA * 0.65 + (1.0 - abs(foamNoiseB - 0.5) * 2.0) * 0.45);

                float crestFoam = smoothstep(0.62, 0.94, vCrest) * clamp(foamWeb * 1.35 + lacyStreak * 0.45, 0.0, 1.0);
                float surfaceWisp = smoothstep(0.66, 0.88, foamNoiseA) * lacyStreak * 0.28 * (0.4 + 0.6 * (1.0 - shoreDepth));
                float shoreMask = 1.0 - smoothstep(0.0, 1.15, vShore);
                float shoreFoam = shoreMask * smoothstep(0.28, 0.78, foamNoiseA * 0.6 + foamNoiseB * 0.5) * 0.78;

                float foam = clamp(crestFoam * 0.92 + surfaceWisp + shoreFoam, 0.0, 0.94);
                vec3 dayFoam = mix(vec3(0.92, 0.97, 0.99), uSunColor * vec3(0.95, 0.82, 0.72), sunsetWarmth * 0.72);
                vec3 foamColor = mix(vec3(0.20, 0.26, 0.36), dayFoam, uDaylight);
                col = mix(col, foamColor, foam);

                float waterAlpha = clamp(mix(0.84, 0.99, fresnel + foam * 0.35 + (1.0 - transmittance.r) * 0.14), 0.0, 1.0);
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
        },
        setAtmosphere(horizonColor, zenithColor, daylight = 1.0) {
            if (horizonColor) waterUniforms.uHorizonColor.value.copy(horizonColor)
            if (zenithColor) waterUniforms.uZenithColor.value.copy(zenithColor)
            waterUniforms.uDaylight.value = daylight
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
