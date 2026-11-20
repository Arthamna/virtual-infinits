import * as THREE from 'three'
import { createConcreteTexture } from './textures'

// Black square bollard lamp with leaf-pattern cutouts that glow from inside
function createLeafCutoutTexture() {
    const w = 128
    const h = 512
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)

    let seed = 77
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
    ctx.fillStyle = '#fff'
    // two columns of leaves, with a plain band in the middle where the real lamp has text
    for (const colX of [w * 0.32, w * 0.68]) {
        for (const [y0, y1] of [[h * 0.08, h * 0.44], [h * 0.56, h * 0.92]]) {
            for (let y = y0; y < y1; y += 13) {
                const x = colX + (rand() - 0.5) * 14
                ctx.save()
                ctx.translate(x, y + rand() * 6)
                ctx.rotate((rand() - 0.5) * 1.6)
                ctx.beginPath()
                ctx.ellipse(0, 0, 3 + rand() * 2, 7 + rand() * 4, 0, 0, Math.PI * 2)
                ctx.fill()
                ctx.restore()
            }
        }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
}

export function createPathLamps({ leftEdge, rightEdge, curbW, spacing = 5 }) {
    const group = new THREE.Group()

    const colW = 0.44
    const colH = 3.55
    const wallT = 0.016
    const halfW = colW * 0.5
    const winHalfW = 0.152

    const blackMetalMat = new THREE.MeshStandardMaterial({
        color: 0x26292c,
        roughness: 0.62,
        metalness: 0.38,
        envMapIntensity: 0.75,
        side: THREE.DoubleSide
    })

    const buildWallGeometry = (includeText, phase) => {
        const wallShape = new THREE.Shape()
        wallShape.moveTo(-halfW, 0)
        wallShape.lineTo(halfW, 0)
        wallShape.lineTo(halfW, colH)
        wallShape.lineTo(-halfW, colH)
        wallShape.closePath()

        // Upper laser-cut tropical foliage window
        addOrganicLeafPanelHoles(wallShape.holes, -winHalfW, winHalfW, 1.98, 2.98, 8, 4, phase)

        // Middle stencil cutout text: iTS / TEKNO / SAINS using exact InfinITS Park plaque font proportions & skew=0.12
        if (includeText) {
            const s = 0.242
            addStencilTextRowHoles(
                wallShape.holes,
                ['iTS_i', 'iTS_T', 'iTS_S'],
                -winHalfW + 0.015,
                1.775,
                0.44 * s,
                0.38 * s,
                0.018 * s,
                0.0
            )
            addStencilTextRowHoles(
                wallShape.holes,
                ['T', 'E', 'K', 'N', 'O'],
                -winHalfW + 0.01,
                1.652,
                0.28 * s,
                0.29 * s,
                0.037 * s,
                0.12
            )
            addStencilTextRowHoles(
                wallShape.holes,
                ['S', '^', 'I', 'N', 'S'],
                -winHalfW - 0.002,
                1.532,
                0.28 * s,
                0.29 * s,
                0.037 * s,
                0.12
            )
        }

        // Lower laser-cut tropical foliage window
        addOrganicLeafPanelHoles(wallShape.holes, -winHalfW, winHalfW, 0.56, 1.46, 8, 4, phase + 1.7)

        return new THREE.ExtrudeGeometry(wallShape, {
            depth: wallT,
            bevelEnabled: false,
            curveSegments: 4
        })
    }

    const frontWallGeo = buildWallGeometry(true, 0.2)
    const sideWallGeo = buildWallGeometry(true, 1.1)

    // Front wall (+Z)
    const frontWall = new THREE.Mesh(frontWallGeo, blackMetalMat)
    frontWall.position.set(0, 0.08, halfW - wallT)
    frontWall.castShadow = true
    frontWall.receiveShadow = true
    group.add(frontWall)

    // Back wall (-Z)
    const backWall = new THREE.Mesh(frontWallGeo, blackMetalMat)
    backWall.rotation.y = Math.PI
    backWall.position.set(0, 0.08, -halfW + wallT)
    backWall.castShadow = true
    backWall.receiveShadow = true
    group.add(backWall)

    // Left wall (-X)
    const leftWall = new THREE.Mesh(sideWallGeo, blackMetalMat)
    leftWall.rotation.y = -Math.PI / 2
    leftWall.position.set(-halfW + wallT, 0.08, 0)
    leftWall.castShadow = true
    leftWall.receiveShadow = true
    group.add(leftWall)

    // Right wall (+X)
    const rightWall = new THREE.Mesh(sideWallGeo, blackMetalMat)
    rightWall.rotation.y = Math.PI / 2
    rightWall.position.set(halfW - wallT, 0.08, 0)
    rightWall.castShadow = true
    rightWall.receiveShadow = true
    group.add(rightWall)

    // 4 vertical corner seam posts so corners are solid & bevel-sealed
    const cornerPostGeo = new THREE.BoxGeometry(0.026, colH, 0.026)
    const cornerOff = halfW - 0.013
    for (const [cx, cz] of [
        [-cornerOff, -cornerOff],
        [cornerOff, -cornerOff],
        [-cornerOff, cornerOff],
        [cornerOff, cornerOff]
    ]) {
        const post = new THREE.Mesh(cornerPostGeo, blackMetalMat)
        post.position.set(cx, 0.08 + colH * 0.5, cz)
        post.castShadow = true
        post.receiveShadow = true
        group.add(post)
    }

    // Flat top cap plate
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(colW + 0.008, 0.022, colW + 0.008), blackMetalMat)
    topCap.position.set(0, 0.08 + colH + 0.011, 0)
    topCap.castShadow = true
    topCap.receiveShadow = true
    group.add(topCap)

    // Small base mounting bolts on side faces (as visible near bottom of pillar in photo)
    const boltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.45, 8)
    boltGeo.rotateZ(Math.PI / 2)
    for (const by of [0.16, 0.52]) {
        for (const bz of [-halfW + 0.045, halfW - 0.045]) {
            const bolt = new THREE.Mesh(boltGeo, blackMetalMat)
            bolt.position.set(0, by, bz)
            group.add(bolt)
        }
    }

    // Square light-grey concrete base pad on the grass
    const concreteBaseMat = new THREE.MeshStandardMaterial({
        map: createConcreteTexture(),
        color: 0xd8dce0,
        roughness: 0.88,
        metalness: 0.02
    })
    const basePad = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.72), concreteBaseMat)
    basePad.position.set(0, 0.045, 0)
    basePad.castShadow = true
    basePad.receiveShadow = true
    group.add(basePad)

    // Warm inner glowing core shining through the laser-cut leaves & stencil text
    const innerGlowMat = new THREE.MeshStandardMaterial({
        color: 0xffdfaa,
        emissive: 0xffbe66,
        emissiveIntensity: 1.8,
        roughness: 0.4,
        metalness: 0.0
    })
    const innerCore = new THREE.Mesh(
        new THREE.BoxGeometry(colW - wallT * 3, colH - 0.24, colW - wallT * 3),
        innerGlowMat
    )
    innerCore.position.set(0, 0.08 + colH * 0.5, 0)
    group.add(innerCore)

    group.userData.innerGlowMat = innerGlowMat
    return group
}

export function createPathLamps({ leftEdge, rightEdge, curbW, spacing = 10 }) {
    const group = new THREE.Group()

    // walk the path centreline; every `spacing` metres drop a lamp, alternating outer/inner side
    const spots = []
    let acc = 0
    let next = spacing / 2
    for (let i = 1; i < leftEdge.length; i++) {
        const cx = (leftEdge[i].x + rightEdge[i].x) / 2
        const cz = (leftEdge[i].z + rightEdge[i].z) / 2
        const px = (leftEdge[i - 1].x + rightEdge[i - 1].x) / 2
        const pz = (leftEdge[i - 1].z + rightEdge[i - 1].z) / 2
        acc += Math.hypot(cx - px, cz - pz)
        if (acc >= next) {
            const e = spots.length % 2 === 0 ? leftEdge[i] : rightEdge[i]
            const off = curbW + 0.45
            spots.push({ x: e.x + e.nx * off, z: e.z + e.nz * off, yaw: Math.atan2(e.nx, e.nz) })
            next += spacing
        }
    }
    if (spots.length) spots.pop() // last one sits on the ramp landing

    let innerGlowMat = null
    const pathLights = []

    if (spots.length) {
        const template = createTeknoSainsBollardLamp()
        innerGlowMat = template.userData.innerGlowMat
        template.updateMatrixWorld(true)

        // Group child meshes by geometry so shared parts (posts, bolts, walls) use a single InstancedMesh
        const partsByGeo = new Map()
        template.traverse((obj) => {
            if (!obj.isMesh) return
            let entry = partsByGeo.get(obj.geometry)
            if (!entry) {
                entry = {
                    geometry: obj.geometry,
                    material: obj.material,
                    castShadow: obj.castShadow,
                    receiveShadow: obj.receiveShadow,
                    localMatrices: []
                }
                partsByGeo.set(obj.geometry, entry)
            }
            entry.localMatrices.push(obj.matrixWorld.clone())
        })

        const lampMat = new THREE.Matrix4()
        const finalMat = new THREE.Matrix4()
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scale = new THREE.Vector3(0.75, 0.78, 0.75)
        const euler = new THREE.Euler()

        for (const part of partsByGeo.values()) {
            const count = spots.length * part.localMatrices.length
            const inst = new THREE.InstancedMesh(part.geometry, part.material, count)
            inst.castShadow = part.castShadow
            inst.receiveShadow = part.receiveShadow

            let idx = 0
            for (const { x, z, yaw } of spots) {
                pos.set(x, -0.04, z)
                euler.set(0, yaw, 0)
                quat.setFromEuler(euler)
                lampMat.compose(pos, quat, scale)
                for (const localMat of part.localMatrices) {
                    finalMat.multiplyMatrices(lampMat, localMat)
                    inst.setMatrixAt(idx++, finalMat)
                }
            }
            inst.instanceMatrix.needsUpdate = true
            group.add(inst)
        }

        // Warm PointLights on every 2nd lamp to illuminate the path without hurting FPS
        for (let i = 0; i < spots.length; i += 2) {
            const { x, z } = spots[i]
            const light = new THREE.PointLight(0xffc272, 0, 11, 2.0)
            light.visible = false
            light.position.set(x, 1.7, z)
            group.add(light)
            pathLights.push(light)
        }
    }

    return {
        group,
        positions: spots,
        setGlow(v) {
            if (innerGlowMat) innerGlowMat.emissiveIntensity = Math.max(0.65, v * 1.6)
            for (let i = 0; i < pathLights.length; i++) {
                pathLights[i].visible = false
                pathLights[i].intensity = 0
            }
        }
    }
}

// Tall double-arm street lamp post (grey pole, two upturned arms with flat LED heads), like the ones on the plaza
export function createPlazaLampPosts(spots) {
    const group = new THREE.Group()
    const poleH = 10
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.4, metalness: 0.7 })
    const headMat = new THREE.MeshStandardMaterial({
        color: 0x5c6066,
        roughness: 0.5,
        metalness: 0.5,
        emissive: 0xfff2dc,
        emissiveIntensity: 0
    })
    const baseMat = new THREE.MeshStandardMaterial({ map: createConcreteTexture(1, 1), color: 0x9a9a98, roughness: 0.95 })

    const pole = new THREE.CylinderGeometry(0.08, 0.13, poleH, 12)
    pole.translate(0, poleH / 2, 0)
    const base = new THREE.CylinderGeometry(0.22, 0.26, 0.35, 12)
    base.translate(0, 0.175, 0)
    // each arm rises from the pole top and bends outward, ending slightly upturned
    const arms = []
    const heads = []
    for (const dir of [-1, 1]) {
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, poleH - 0.6, 0),
            new THREE.Vector3(dir * 0.2, poleH + 0.1, 0),
            new THREE.Vector3(dir * 1.2, poleH + 0.35, 0),
            new THREE.Vector3(dir * 2.4, poleH + 0.45, 0)
        )
        arms.push(new THREE.TubeGeometry(curve, 16, 0.045, 8, false))
        const head = new THREE.BoxGeometry(0.75, 0.08, 0.28)
        head.rotateZ(dir * 0.08)
        head.translate(dir * 2.65, poleH + 0.45, 0)
        heads.push(head)
    }

    for (const { x, y, z, yaw = 0 } of spots) {
        const post = new THREE.Group()
        post.position.set(x, y, z)
        post.rotation.y = yaw
        post.add(new THREE.Mesh(base, baseMat), new THREE.Mesh(pole, metalMat))
        for (const g of arms) post.add(new THREE.Mesh(g, metalMat))
        for (const g of heads) post.add(new THREE.Mesh(g, headMat))
        post.traverse((o) => {
            o.castShadow = true
            o.receiveShadow = true
        })
        group.add(post)
    }

    return {
        group,
        setGlow(v) {
            headMat.emissiveIntensity = v
        }
    }
}
