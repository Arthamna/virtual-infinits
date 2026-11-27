import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { configureTexture } from './textures'

const PRESET_TO_GLB = {
    vfork: '/models/trees/tree_vfork.glb',
    'Oak Large': '/models/trees/tree_oak_large.glb',
    'Oak Medium': '/models/trees/tree_oak_medium.glb',
    'Oak Small': '/models/trees/tree_oak_small.glb',
    'Ash Large': '/models/trees/tree_ash_large.glb',
    'Ash Medium': '/models/trees/tree_ash_medium.glb',
    'Ash Small': '/models/trees/tree_ash_small.glb',
    'Aspen Large': '/models/trees/tree_aspen_large.glb',
    'Aspen Medium': '/models/trees/tree_aspen_medium.glb',
    'Pine Medium': '/models/trees/tree_pine_medium.glb',
    'Pine Small': '/models/trees/tree_pine_small.glb',
    'Bush 1': '/models/trees/bush_1.glb',
    'Bush 2': '/models/trees/bush_2.glb',
    'Bush 3': '/models/trees/bush_3.glb',
    lakeside_oak: '/models/trees/tree_lakeside_oak_scurve.glb',
    lakeside_ash: '/models/trees/tree_lakeside_ash_scurve.glb',
    hero_custom: '/models/trees/tree_hero_custom.glb'
}

const leafSunUniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.7, 0.3, 0.15).normalize() },
    uSunColor: { value: new THREE.Color(0xff9b54) }
}

function extractTreeParts(gltfScene) {
    let branchesMesh = null
    let leavesMesh = null
    gltfScene.traverse((o) => {
        if (!o.isMesh) return
        if (o.name === 'Branches' || o.name === 'BranchesMesh' || o.material?.name === 'Bark_PBR') {
            branchesMesh = o
        } else if (o.name === 'Leaves' || o.name === 'LeavesMesh' || o.material?.name === 'Leaves_Cutout') {
            leavesMesh = o
        }
    })
    return { branchesMesh, leavesMesh }
}

function styleLoadedTreeMeshes(branchesMesh, leavesMesh, { minY = 0, maxY = 10, maxR = 5 } = {}) {
    if (branchesMesh) {
        branchesMesh.castShadow = true
        branchesMesh.receiveShadow = false
        const bMat = branchesMesh.material
        if (bMat) {
            if (bMat.map) configureTexture(bMat.map, { isColor: true, repeat: true })
            if (bMat.normalMap) {
                configureTexture(bMat.normalMap, { isColor: false, repeat: true })
                bMat.normalScale = new THREE.Vector2(2.8, 2.8)
            }
            bMat.roughness = 0.9
            bMat.metalness = 0.02
            bMat.envMapIntensity = 0.75
            bMat.needsUpdate = true
        }
    }

    if (leavesMesh) {
        leavesMesh.userData.noAO = true
        leavesMesh.castShadow = true
        leavesMesh.receiveShadow = false
        const leafMat = leavesMesh.material
        if (leafMat) {
            if (leafMat.map) configureTexture(leafMat.map, { isColor: true })
            leafMat.alphaTest = 0.5
            leafMat.side = THREE.DoubleSide
            leafMat.emissive = new THREE.Color(0x28451a)
            leafMat.emissiveIntensity = 0.08
            leafMat.roughness = 0.72
            leafMat.metalness = 0.0

            leafMat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = leafSunUniforms.uTime
                shader.uniforms.uCrownMinY = { value: minY }
                shader.uniforms.uCrownMaxY = { value: maxY }
                shader.uniforms.uCrownMaxR = { value: maxR }
                shader.uniforms.uSunDir = leafSunUniforms.uSunDir
                shader.uniforms.uSunColor = leafSunUniforms.uSunColor

                shader.vertexShader =
                    'uniform float uTime;\nuniform float uCrownMinY;\nuniform float uCrownMaxY;\nuniform float uCrownMaxR;\nvarying float vCrownShade;\nvarying float vCrownEdge;\nvarying vec3 vCrownWorldDir;\nvarying vec3 vLeafWorldPos;\n' +
                    shader.vertexShader.replace(
                        '#include <begin_vertex>',
                        `#include <begin_vertex>
                        float cH = clamp((position.y - uCrownMinY) / max(0.01, uCrownMaxY - uCrownMinY), 0.0, 1.0);
                        float cR = clamp(length(position.xz) / max(0.01, uCrownMaxR), 0.0, 1.0);
                        vCrownShade = clamp((0.36 + 0.64 * cH) * (0.52 + 0.48 * cR), 0.30, 1.06);
                        vCrownEdge = clamp(cR * 0.72 + cH * 0.28, 0.0, 1.0);
                        float crownMidY = mix(uCrownMinY, uCrownMaxY, 0.56);
                        vec3 localCrownDir = normalize(position - vec3(0.0, crownMidY, 0.0) + vec3(0.0, 0.22, 0.0));
                        vec4 leafLocalPos = vec4(position, 1.0);
                        #ifdef USE_INSTANCING
                            localCrownDir = mat3(instanceMatrix) * localCrownDir;
                            leafLocalPos = instanceMatrix * leafLocalPos;
                        #endif
                        vCrownWorldDir = normalize(mat3(modelMatrix) * localCrownDir);
                        vLeafWorldPos = (modelMatrix * leafLocalPos).xyz;
                        float windOffset = dot(vLeafWorldPos, vec3(0.14, 0.09, 0.16));
                        float sway = uv.y * 0.08 * sin(uTime * 1.9 + windOffset);
                        transformed.x += sway;
                        transformed.z += sway * 0.6;`
                    )

                shader.fragmentShader =
                    'uniform vec3 uSunDir;\nuniform vec3 uSunColor;\nvarying float vCrownShade;\nvarying float vCrownEdge;\nvarying vec3 vCrownWorldDir;\nvarying vec3 vLeafWorldPos;\n' +
                    shader.fragmentShader.replace(
                        '#include <color_fragment>',
                        `#include <color_fragment>
                        vec3 cNorm = normalize(vCrownWorldDir);
                        vec3 sDir = normalize(uSunDir);
                        vec3 vDir = normalize(cameraPosition - vLeafWorldPos);

                        // Directional foliage light physics: sunlit side bright, side away from sun (behind light) darker
                        float sunFacing = dot(cNorm, sDir);
                        float litSide = smoothstep(-0.55, 0.68, sunFacing);
                        float directionalShade = mix(0.46, 1.14, litSide);

                        // When camera looks through foliage toward the sun (backlit), thicken inner shadow slightly
                        float backView = smoothstep(0.15, 0.88, dot(-vDir, sDir));
                        float backlitDarken = mix(1.0, mix(0.74, 0.96, vCrownEdge), backView * (1.0 - litSide * 0.65));

                        // Cool shadow tint on the dark side, warm sunlit boost on the facing side
                        vec3 shadowTint = mix(vec3(0.84, 0.90, 0.98), vec3(1.0), litSide);
                        diffuseColor.rgb *= vCrownShade * directionalShade * backlitDarken * shadowTint;

                        // Subtle warm subsurface translucency (SSS) where sunlight filters through thin outer leaf edges
                        float edgeTranslucency = pow(max(dot(-vDir, sDir), 0.0), 3.0) * smoothstep(0.48, 1.0, vCrownEdge);
                        float sunTipGlow = smoothstep(0.52, 1.0, vCrownShade) * litSide;
                        diffuseColor.rgb += uSunColor * (sunTipGlow * 0.14 + edgeTranslucency * 0.24);`
                    )
            }
            leafMat.customProgramCacheKey = () => 'glb-tree-instanced-leaves-light-physics'
            leafMat.needsUpdate = true
        }

        leavesMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: leafMat?.map ?? null,
            alphaTest: leafMat?.alphaTest ?? 0.5
        })
    }
}

export function createRealisticParkTrees({ isBlocked, perimeterBounds } = {}) {
    const group = new THREE.Group()
    const loader = new GLTFLoader()
    const bbox = new THREE.Box3()
    const areaMinX = (perimeterBounds?.pInnerMinX ?? -40.5) + 1.5
    const areaMaxX = (perimeterBounds?.pInnerMaxX ?? 43.5) - 1.5
    const areaMinZ = (perimeterBounds?.pInnerMinZ ?? -119.5) + 2.0
    const areaMaxZ = (perimeterBounds?.pInnerMaxZ ?? 4.5) - 2.0

    const parkTreeSpecs = [
        // Signature tropical V-fork tree on the left outer lawn, just outside the amphitheater's plaque wing
        // (as in the photos)
        { x: -35.7, z: -37.6, targetHeight: 16.0, rotY: 0.30, seed: 104, preset: 'vfork' }
    ]

    let rngState = 73856093
    const nextRand = () => {
        rngState = (rngState * 1664525 + 1013904223) >>> 0
        return rngState / 4294967296
    }

    const presetPool = [
        { preset: 'Ash Large', minH: 12.5, maxH: 15.8 },
        { preset: 'Ash Medium', minH: 9.8, maxH: 12.5 },
        { preset: 'Ash Small', minH: 7.8, maxH: 9.8 },
        { preset: 'Oak Large', minH: 13.0, maxH: 16.2 },
        { preset: 'Oak Medium', minH: 10.0, maxH: 13.0 },
        { preset: 'Oak Small', minH: 7.8, maxH: 10.0 },
        { preset: 'Aspen Large', minH: 12.5, maxH: 15.5 },
        { preset: 'Aspen Medium', minH: 9.5, maxH: 12.2 },
        { preset: 'Pine Medium', minH: 10.0, maxH: 13.2 },
        { preset: 'Pine Small', minH: 8.0, maxH: 10.2 },
        { preset: 'vfork', minH: 13.5, maxH: 16.2 }
    ]
    const leafTints = [0xdcf7b8, 0xeaf7b2, 0xd4f2b4, 0xcbeeb0, 0xedf5a6, 0xe3f7ba, 0xd0eab8]

    const isNearLakeShore = (x, z) => {
        const dx = (x + 5.5) / 27.5
        const dz = (z + 55.0) / 53.5
        return dx * dx + dz * dz < 1.0
    }

    const minSpacingSq = 5.4 * 5.4
    const targetTotal = 76
    let attempts = 0
    while (parkTreeSpecs.length < targetTotal && attempts < 3600) {
        attempts++
        const x = areaMinX + nextRand() * (areaMaxX - areaMinX)
        const z = areaMinZ + nextRand() * (areaMaxZ - areaMinZ)
        if (isNearLakeShore(x, z)) continue
        if (isBlocked && isBlocked(x, z)) continue

        let tooClose = false
        for (let i = 0; i < parkTreeSpecs.length; i++) {
            const dx = parkTreeSpecs[i].x - x
            const dz = parkTreeSpecs[i].z - z
            if (dx * dx + dz * dz < minSpacingSq) {
                tooClose = true
                break
            }
        }
        if (tooClose) continue

        const pick = presetPool[Math.floor(nextRand() * presetPool.length)]
        const targetHeight = pick.minH + nextRand() * (pick.maxH - pick.minH)
        parkTreeSpecs.push({
            x,
            z,
            targetHeight,
            rotY: nextRand() * Math.PI * 2,
            seed: 200 + parkTreeSpecs.length * 17,
            preset: pick.preset,
            tint: leafTints[Math.floor(nextRand() * leafTints.length)]
        })
    }

    const bushPresets = ['Bush 1', 'Bush 2', 'Bush 3']
    const bushTints = [0xdcf7b8, 0xcbeeb0, 0xeaf7b2, 0xbfe3a8, 0xf2e8a0]
    const bushSpecs = []
    const bushSpacingSq = 2.4 * 2.4
    let bushAttempts = 0
    while (bushSpecs.length < 70 && bushAttempts < 3000) {
        bushAttempts++
        const x = areaMinX + nextRand() * (areaMaxX - areaMinX)
        const z = areaMinZ + nextRand() * (areaMaxZ - areaMinZ)
        if (isBlocked && isBlocked(x, z)) continue

        let tooClose = false
        for (let i = 0; i < bushSpecs.length; i++) {
            const dx = bushSpecs[i].x - x
            const dz = bushSpecs[i].z - z
            if (dx * dx + dz * dz < bushSpacingSq) {
                tooClose = true
                break
            }
        }
        if (tooClose) continue

        bushSpecs.push({
            x,
            z,
            targetHeight: 1.2 + nextRand() * 1.6,
            rotY: nextRand() * Math.PI * 2,
            seed: 900 + bushSpecs.length * 13,
            preset: bushPresets[Math.floor(nextRand() * bushPresets.length)],
            tint: bushTints[Math.floor(nextRand() * bushTints.length)]
        })
    }

    const allTreeAndBushSpecs = parkTreeSpecs.concat(bushSpecs)
    const grouped = new Map()
    for (let i = 0; i < allTreeAndBushSpecs.length; i++) {
        const spec = allTreeAndBushSpecs[i]
        const key = spec.preset
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key).push(spec)
    }

    // Add lakeside overhanging S-curve groups
    grouped.set('lakeside_oak', [
        { x: -21.2, z: -45.5, targetHeight: 15.0, rotY: 0.25, tint: 0xcbeeb0 },
        { x: 9.2, z: -61.5, targetHeight: 16.2, rotY: Math.PI + 0.22, tint: 0xe3f7ba }
    ])
    grouped.set('lakeside_ash', [
        { x: -18.6, z: -61.5, targetHeight: 16.5, rotY: -0.22, tint: 0xdcf7b8 }, // on the bank, clear of the playground pad
        { x: 10.6, z: -45.5, targetHeight: 14.4, rotY: Math.PI - 0.28, tint: 0xd4f2b4 }
    ])

    // Hero custom tree placement on front-right lawn
    let heroX = 20.5
    let heroZ = -13.5
    if (isBlocked && isBlocked(heroX, heroZ)) {
        for (let r = 1; r <= 12; r += 1.5) {
            let found = false
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                const tx = heroX + Math.cos(a) * r
                const tz = heroZ + Math.sin(a) * r
                if (!isBlocked(tx, tz)) {
                    heroX = tx
                    heroZ = tz
                    found = true
                    break
                }
            }
            if (found) break
        }
    }
    grouped.set('hero_custom', [
        { x: heroX, z: heroZ, targetHeight: 16.5, rotY: 0, tint: 0xffffff }
    ])

    const dummy = new THREE.Object3D()
    const tintColor = new THREE.Color()

    const loadPromises = []
    for (const [presetKey, specs] of grouped.entries()) {
        const url = PRESET_TO_GLB[presetKey]
        if (!url) continue

        const p = loader
            .loadAsync(url)
            .then((gltf) => {
                const { branchesMesh, leavesMesh } = extractTreeParts(gltf.scene)
                if (!branchesMesh || !leavesMesh) return

                bbox.setFromObject(gltf.scene)
                const maxR = Math.max(
                    0.5,
                    Math.abs(bbox.max.x),
                    Math.abs(bbox.min.x),
                    Math.abs(bbox.max.z),
                    Math.abs(bbox.min.z)
                )
                styleLoadedTreeMeshes(branchesMesh, leavesMesh, {
                    minY: bbox.min.y,
                    maxY: bbox.max.y,
                    maxR
                })

                const finalRawHeight = Math.max(0.01, bbox.max.y - bbox.min.y)
                const minY = bbox.min.y

                const branchInst = new THREE.InstancedMesh(
                    branchesMesh.geometry,
                    branchesMesh.material,
                    specs.length
                )
                branchInst.castShadow = true
                branchInst.receiveShadow = false

                const leafInst = new THREE.InstancedMesh(
                    leavesMesh.geometry,
                    leavesMesh.material,
                    specs.length
                )
                leafInst.userData.noAO = true
                leafInst.castShadow = true
                leafInst.receiveShadow = false
                leafInst.customDepthMaterial = leavesMesh.customDepthMaterial

                for (let i = 0; i < specs.length; i++) {
                    const spec = specs[i]
                    const scaleFactor = spec.targetHeight / finalRawHeight
                    dummy.position.set(spec.x, -minY * scaleFactor - 0.03, spec.z)
                    dummy.rotation.set(0, spec.rotY, 0)
                    dummy.scale.setScalar(scaleFactor)
                    dummy.updateMatrix()

                    branchInst.setMatrixAt(i, dummy.matrix)
                    leafInst.setMatrixAt(i, dummy.matrix)
                    tintColor.setHex(spec.tint ?? 0xdcf7b8)
                    leafInst.setColorAt(i, tintColor)
                }

                branchInst.instanceMatrix.needsUpdate = true
                leafInst.instanceMatrix.needsUpdate = true
                if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true
                branchInst.computeBoundingSphere()
                leafInst.computeBoundingSphere()

                group.add(branchInst, leafInst)
            })
            .catch((err) => console.error(`Failed to load tree GLB (${url}):`, err))

        loadPromises.push(p)
    }

    Promise.all(loadPromises).then(() => {
        group.dispatchEvent({ type: 'loaded' })
    })

    return {
        group,
        update(elapsed = 0) {
            leafSunUniforms.uTime.value = elapsed
        },
        setSun(dir, color) {
            if (dir) leafSunUniforms.uSunDir.value.copy(dir).normalize()
            if (color) leafSunUniforms.uSunColor.value.copy(color)
        }
    }
}
