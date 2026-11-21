import * as THREE from 'three'
import {
    createPavingTexture,
    createBrickPlazaTexture,
    createConcreteTexture,
    createGrassTexture
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
import { createMonuments, isOnMonument } from './monument'

export function createInfinitsParkScene() {
    const group = new THREE.Group()

    const concreteMat = new THREE.MeshStandardMaterial({
        map: createConcreteTexture(),
        color: 0xbabec4,
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.25
    })

    const grassTex = createGrassTexture()
    grassTex.repeat.set(0.25, 0.25)
    const grassMat = new THREE.MeshStandardMaterial({
        map: grassTex,
        color: 0xe2ecd2,
        roughness: 0.95,
        metalness: 0.0
    })

    const walkwayMat = new THREE.MeshStandardMaterial({
        map: createPavingTexture(5, 2),
        roughness: 0.88,
        metalness: 0.03
    })
    const redPavingMat = new THREE.MeshStandardMaterial({
        map: createBrickPlazaTexture(10, 4),
        roughness: 0.82,
        metalness: 0.03
    })

    const plaza = createParkPlaza({ concreteMat, walkwayMat, redPavingMat })
    group.add(plaza.group)

    const railingsGroup = createPlazaRailings(plaza.railingConfig)
    group.add(railingsGroup)

    const signage = createInfinitsSignage()
    signage.position.set(-0.2, 2.13, -2.35)
    group.add(signage)

    const totem = createTeknoSainsTotem()
    totem.position.set(10.1, 0.48, -1.6)
    group.add(totem)

    const lake = createParkLake(grassTex)
    group.add(lake.group)

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
    group.add(paths.group)

    const lamps = createPathLamps({ leftEdge: paths.leftEdge, rightEdge: paths.rightEdge, curbW: 0.16 })
    group.add(lamps.group)

    // the four double-arm lamp posts on the plaza (y = plaza deck height)
    const lampPosts = createPlazaLampPosts([
        { x: -23.5, y: 0.48, z: -3.9, yaw: Math.PI / 2 },
        { x: -8.7, y: 0.48, z: -2.6, yaw: Math.PI / 2 },
        { x: 8.7, y: 0.48, z: -2.4, yaw: Math.PI / 2 },
        { x: 33.6, y: 0.48, z: -0.8, yaw: Math.PI / 2 }
    ])
    group.add(lampPosts.group)

    const grass = createParkGrass({
        grassMat,
        lakeCutoutPath: lake.lakeCutoutPath,
        lakeParams: lake.lakeParams,
        curveSamples: paths.curveSamples,
        pathHalfWidth: plaza.pathParams.rampWidth / 2 + 0.16,
        plazaGroup: plaza.group,
        perimeterBounds,
        extraBlocked: (x, z) => isOnMonument(x, z)
    })
    group.add(grass.group)

    // Blender models: kananatas (far-right corner), kiriatas (far-left corner), fasor (right lawn)
    const monument = createMonuments()
    group.add(monument)

    const vegetation = createVegetation({
        isBlocked: (x, z) => grass.isBlocked(x, z) || isOnMonument(x, z, 2.5),
        lampPositions: lamps.positions,
        pathEdges: [paths.leftEdge, paths.rightEdge]
    })
    group.add(vegetation)


    return {
        group,
        vegetation,
        walk: {
            walkables: [plaza.group, paths.walkwayMesh],
            obstacles: [railingsGroup, signage, totem, lamps.group, lampPosts.group, monument],
            start: paths.curveSamples[16].pt.clone(),
            startDir: paths.curveSamples[16].tan.clone()
        },
        update(elapsed = 0) {
            grass.grassWindUniforms.uTime.value = elapsed
        },
        setWind(strength) {
            grass.grassWindUniforms.uWind.value = strength
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
