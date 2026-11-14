import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { createConcreteTexture, createWaterNormalTexture } from './textures'

export function createParkLake(sunDirection, grassTex) {
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

    const lakeGeo = new THREE.ShapeGeometry(lakeShape)
    lakeGeo.rotateX(-Math.PI / 2)
    const lakeWater = new Water(lakeGeo, {
        textureWidth: 1024,
        textureHeight: 1024,
        waterNormals: createWaterNormalTexture(),
        sunDirection: sunDirection.clone().normalize(),
        sunColor: 0xfff2d6,
        waterColor: 0x3b4d31,
        distortionScale: 0.45,
        fog: true
    })
    lakeWater.material.uniforms['size'].value = 11.0
    lakeWater.material.fragmentShader = lakeWater.material.fragmentShader
        .replace('float rf0 = 0.3;', 'float rf0 = 0.035;')
        .replace(
            'vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance );',
            'vec3 albedo = mix( ( sunColor * diffuseLight * 0.18 + scatter * 1.35 ) * getShadowMask(), ( vec3( 0.05, 0.08, 0.04 ) + reflectionSample * 0.62 + reflectionSample * specularLight * 0.45 ), reflectance );'
        )
    lakeWater.position.y = -0.54
    group.add(lakeWater)

    return {
        group,
        lakeWater,
        lakeCutoutPath,
        lakeParams: { lakeCenterX, lakeCenterZ, lakeHalfLenZ, lakeAmpX }
    }
}
