import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
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
        bumpMap: grassTex,
        bumpScale: 0.025,
        color: 0xb7cc9e,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide
    })
    const earthTex = createConcreteTexture()
    const bankEarthWallMat = new THREE.MeshStandardMaterial({
        map: earthTex,
        bumpMap: earthTex,
        bumpScale: 0.04,
        color: 0x665c4b,
        roughness: 0.92,
        metalness: 0.02,
        side: THREE.DoubleSide
    })

    group.add(buildBankRingStrip(bankOuterLip + 0.06, -0.038, -0.35, -0.62, bankGrassSlopeMat))
    group.add(buildBankRingStrip(-0.35, -0.62, -3.20, -2.6, bankEarthWallMat))

    const lakeBedGeo = new THREE.ShapeGeometry(lakeShape)
    lakeBedGeo.rotateX(-Math.PI / 2)
    const lakeBedTex = createLakeBedTexture()
    const lakeBedMesh = new THREE.Mesh(
        lakeBedGeo,
        new THREE.MeshStandardMaterial({
            map: lakeBedTex,
            bumpMap: lakeBedTex,
            bumpScale: 0.03,
            color: 0x8ea88c,
            emissive: 0x1a2c1e,
            emissiveIntensity: 0.18,
            roughness: 0.96,
            metalness: 0.0
        })
    )
    lakeBedMesh.position.y = -2.6
    group.add(lakeBedMesh)

    const lakeGeo = new THREE.ShapeGeometry(lakeShape)
    lakeGeo.rotateX(-Math.PI / 2)
    const lakeWater = new Water(lakeGeo, {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: createWaterNormalTexture(),
        sunDirection: new THREE.Vector3(0.4, 0.7, 0.3).normalize(),
        sunColor: 0xfff5e0,
        waterColor: 0x166d78,
        distortionScale: 1.4,
        fog: false
    })
    lakeWater.material.transparent = true
    lakeWater.material.uniforms['size'].value = 6.5
    lakeWater.material.fragmentShader = lakeWater.material.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, alpha );',
        `float waterAlpha = clamp( mix( 0.46, 0.94, reflectance ), 0.0, 1.0 );
        gl_FragColor = vec4( outgoingLight, waterAlpha );`
    )
    lakeWater.position.y = -0.78
    group.add(lakeWater)

    const simpleWater = lakeWater

    return {
        group,
        lakeWater,
        simpleWater,
        lakeCutoutPath,
        lakeParams: { lakeCenterX, lakeCenterZ, lakeHalfLenZ, lakeAmpX },
        update(elapsed = 0) {
            lakeWater.material.uniforms['time'].value = elapsed * 0.35
        },
        setWind(strength = 1) {
            lakeWater.material.uniforms['distortionScale'].value = 0.9 + 0.5 * strength
        },
        setSun(dir, color) {
            if (dir) lakeWater.material.uniforms['sunDirection'].value.copy(dir).normalize()
            if (color) lakeWater.material.uniforms['sunColor'].value.copy(color)
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
