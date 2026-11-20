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

    const grassTex = createGrassTexture()
    grassTex.repeat.set(0.25, 0.25)
    const grassMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        bumpMap: grassTex,
        bumpScale: 0.035,
        color: 0xe2ecd2,
        roughness: 0.94,
        metalness: 0.0,
        envMapIntensity: 0.35
    })

    const walkwayPBR = createPavingPBRMaps(5, 2, false)
    const walkwayMat = new THREE.MeshStandardMaterial({
        map: createPavingTexture(5, 2),
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
            walkables: [plaza.group, paths.walkwayMesh],
            obstacles: [railingsGroup, signage, totem, lamps.group, lampPosts.group],
            start: paths.curveSamples[16].pt.clone(),
            startDir: paths.curveSamples[16].tan.clone()
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
