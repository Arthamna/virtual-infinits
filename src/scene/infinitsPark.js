import * as THREE from 'three'
import {
    createPavingTexture,
    createBrickPlazaTexture,
    createConcreteTexture,
    createGrassTexture,
    createPavingPBRMaps
} from './textures'
import { createInfinitsSignage, createTeknoSainsTotem } from './signage'
import { createParkPlaza } from './plaza'
import { createPlazaRailings } from './railings'
import { createParkLake } from './lake'
import { createParkPaths } from './paths'
import { createParkGrass } from './grass'
import { createPathLamps, createPlazaLampPosts } from './lamps'
import { createBackdrop } from './backdrop'
import { createVegetation } from './vegetation'
import { createRealisticParkTrees } from './trees'

export function createInfinitsParkScene() {
    const group = new THREE.Group()
    const innerParkGroup = new THREE.Group()
    innerParkGroup.position.y = 0.18
    group.add(innerParkGroup)

    const concreteTex = createConcreteTexture()
    const concreteMat = new THREE.MeshStandardMaterial({
        map: concreteTex,
        bumpMap: concreteTex,
        bumpScale: 0.028,
        roughnessMap: concreteTex,
        color: 0xc2c6cc,
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.42
    })
    concreteMat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                "#include <common>\nvarying float vConcY;\nvarying float vConcUp;"
            )
            .replace(
                "#include <worldpos_vertex>",
                `#include <worldpos_vertex>
                vConcY = (modelMatrix * vec4(transformed, 1.0)).y;
                vConcUp = normalize(mat3(modelMatrix) * objectNormal).y;`
            )
        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                "#include <common>\nvarying float vConcY;\nvarying float vConcUp;"
            )
            .replace(
                "#include <color_fragment>",
                `#include <color_fragment>
                float contactAo = mix(0.76, 1.0, smoothstep(0.12, 0.55, vConcY));
                float skyBounce = mix(0.92, 1.06, clamp(vConcUp * 0.5 + 0.5, 0.0, 1.0));
                diffuseColor.rgb *= contactAo * skyBounce;`
            )
    }

    const grassTex = createGrassTexture()
    grassTex.repeat.set(0.32, 0.32)
    const grassMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        bumpMap: grassTex,
        bumpScale: 0.085,
        roughnessMap: grassTex,
        color: 0xe6ebd8,
        roughness: 0.94,
        metalness: 0.0,
        envMapIntensity: 0.38
    })
    // Break up tile repetition with macro world-space soil, dry thatch, and damp moss patches
    grassMat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                '#include <common>\nvarying vec3 vGroundWorldPos;'
            )
            .replace(
                '#include <worldpos_vertex>',
                `#include <worldpos_vertex>
                vGroundWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
            )
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vGroundWorldPos;
                float gHash(vec2 p) {
                    p = fract(p * vec2(123.34, 456.21));
                    p += dot(p, p + 45.32);
                    return fract(p.x * p.y);
                }
                float gNoise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x),
                        mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x),
                        f.y
                    );
                }`
            )
            .replace(
                '#include <map_fragment>',
                `#include <map_fragment>
                vec2 gPos = vGroundWorldPos.xz;
                float nMacro = gNoise(gPos * 0.065) * 0.6 + gNoise(gPos * 0.19) * 0.4;
                float nDetail = gNoise(gPos * 0.65);

                // Exposed brown earth / worn soil patches
                float soilMask = smoothstep(0.60, 0.84, nMacro) * (0.65 + 0.35 * nDetail);
                // Sun-dried golden thatch patches
                float dryMask = smoothstep(0.50, 0.76, gNoise(gPos * 0.09 + vec2(14.3, -8.7)));
                // Damp darker mossy/loam patches
                float dampMask = smoothstep(0.24, 0.48, 1.0 - nMacro);

                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.27, 0.17), soilMask * 0.68);
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.46, 0.42, 0.22), dryMask * 0.32);
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.76, 0.84, 0.70), dampMask * 0.40);`
            )
    }

    const walkwayPBR = createPavingPBRMaps(5, 2, false)
    const walkwayMat = new THREE.MeshStandardMaterial({
        map: createPavingTexture(5, 2, true),
        normalMap: walkwayPBR.normalMap,
        normalScale: new THREE.Vector2(1.35, 1.35),
        aoMap: walkwayPBR.aoMap,
        aoMapIntensity: 0.8,
        roughnessMap: walkwayPBR.roughnessMap,
        roughness: 0.85,
        metalness: 0.03
    })
    const redPavingPBR = createPavingPBRMaps(10, 4, true)
    const redPavingMat = new THREE.MeshStandardMaterial({
        map: createBrickPlazaTexture(10, 4),
        normalMap: redPavingPBR.normalMap,
        normalScale: new THREE.Vector2(1.35, 1.35),
        aoMap: redPavingPBR.aoMap,
        aoMapIntensity: 0.8,
        roughnessMap: redPavingPBR.roughnessMap,
        roughness: 0.82,
        metalness: 0.03
    })

    const plaza = createParkPlaza({ concreteMat, walkwayMat, redPavingMat })
    innerParkGroup.add(plaza.group)

    const railingsGroup = createPlazaRailings(plaza.railingConfig)
    innerParkGroup.add(railingsGroup)

    const signage = createInfinitsSignage()
    signage.position.set(-0.2, 2.13, -2.35)
    innerParkGroup.add(signage)

    const totem = createTeknoSainsTotem()
    totem.position.set(10.1, 0.48, -1.6)
    innerParkGroup.add(totem)

    const lake = createParkLake(grassTex)
    innerParkGroup.add(lake.group)

    const perimW = 3.5
    const pInnerMinX = -40.5
    const pInnerMaxX = 43.5
    const pInnerMinZ = -119.5
    const pInnerMaxZ = plaza.apronFrontZ + 4.5
    const innerCornerR = 8.0
    const perimeterBounds = {
        perimW,
        perimH: 0.28,
        pInnerMinX,
        pInnerMaxX,
        pInnerMinZ,
        pInnerMaxZ,
        pOuterMinX: pInnerMinX - perimW,
        pOuterMaxX: pInnerMaxX + perimW,
        pOuterMinZ: pInnerMinZ - perimW,
        pOuterMaxZ: pInnerMaxZ + perimW,
        innerCornerR,
        outerCornerR: innerCornerR + perimW
    }

    const backdrop = createBackdrop(perimeterBounds)
    group.add(backdrop.group)

    const paths = createParkPaths({
        walkwayMat,
        lakeParams: lake.lakeParams,
        ...plaza.pathParams,
        perimeterBounds
    })
    innerParkGroup.add(paths.group)

    const lamps = createPathLamps({ leftEdge: paths.leftEdge, rightEdge: paths.rightEdge, curbW: 0.16 })
    innerParkGroup.add(lamps.group)

    // the four double-arm lamp posts on the plaza (y = plaza deck height)
    const lampPosts = createPlazaLampPosts([
        { x: -23.5, y: 0.48, z: -3.9, yaw: Math.PI / 2 },
        { x: -8.7, y: 0.48, z: -2.6, yaw: Math.PI / 2 },
        { x: 8.7, y: 0.48, z: -2.4, yaw: Math.PI / 2 },
        { x: 33.6, y: 0.48, z: -0.8, yaw: Math.PI / 2 }
    ])
    innerParkGroup.add(lampPosts.group)

    const grass = createParkGrass({
        grassMat,
        lakeCutoutPath: lake.lakeCutoutPath,
        lakeParams: lake.lakeParams,
        curveSamples: paths.curveSamples,
        pathHalfWidth: plaza.pathParams.rampWidth / 2 + 0.16,
        plazaGroup: plaza.group,
        perimeterBounds
    })
    innerParkGroup.add(grass.group)

    const vegetation = createVegetation({
        isBlocked: grass.isBlocked,
        lampPositions: lamps.positions,
        pathEdges: [paths.leftEdge, paths.rightEdge]
    })
    innerParkGroup.add(vegetation)

    const realisticTrees = createRealisticParkTrees({ isBlocked: grass.isBlocked })
    innerParkGroup.add(realisticTrees.group)


    return {
        group,
        vegetation,
        walk: {
            walkables: [plaza.group, paths.walkwayMesh, grass.groundMesh],
            obstacles: [railingsGroup, signage, totem, lamps.group, lampPosts.group],
            start: new THREE.Vector3(-2.5, 0, 5.2),
            startDir: new THREE.Vector3(0.12, 0, -1).normalize()
        },
        update(elapsed = 0) {
            grass.grassWindUniforms.uTime.value = elapsed
            lake.update(elapsed)
            realisticTrees.update(elapsed)
        },
        setWind(strength) {
            grass.grassWindUniforms.uWind.value = strength
            lake.setWind(strength)
        },
        setSun(dir, color) {
            lake.setSun(dir, color)
        },
        setLampGlow(v) {
            lamps.setGlow(v)
            lampPosts.setGlow(v)
        },
        setSimpleWater(on) {
            lake.lakeWater.visible = !on
            lake.simpleWater.visible = on
        }
    }
}
