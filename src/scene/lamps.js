import * as THREE from 'three'
import { createConcreteTexture } from './textures'
import { makePlaqueGlyph } from './plaqueGlyphs'

function warpFoliageUV(u, v, xMin, xMax, yMin, yMax, phase = 0) {
    const envU = Math.sin(Math.PI * u)
    const envV = Math.sin(Math.PI * v)
    const du =
        0.11 * envU * Math.sin(v * Math.PI * 2.4 + phase) +
        0.04 * envU * Math.cos(u * Math.PI * 2.0 - v * Math.PI * 2.8)
    const dv = 0.06 * envV * Math.sin(u * Math.PI * 2.0 - v * Math.PI * 1.6 + phase)
    const uw = THREE.MathUtils.clamp(u + du, 0.01, 0.99)
    const vw = THREE.MathUtils.clamp(v + dv, 0.01, 0.99)
    return [xMin + uw * (xMax - xMin), yMin + vw * (yMax - yMin)]
}

function addOrganicLeafPanelHoles(holesArray, xMin, xMax, yMin, yMax, rows = 8, cols = 4, phase = 0) {
    const segs = 7
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const u0 = (c + 0.09) / cols
            const u1 = (c + 0.91) / cols
            const v0 = (r + 0.09) / rows
            const v1 = (r + 0.91) / rows
            const uc = (u0 + u1) * 0.5
            const vc = (v0 + v1) * 0.5
            const du = (u1 - u0) * 0.5
            const dv = (v1 - v0) * 0.5

            // Alternate leaf diagonal tilt left/right like tropical fern fronds in the laser-cut panel
            const tiltLeft = (c + r) % 2 === 0
            const pStart = tiltLeft ? [uc - du * 0.78, vc - dv * 0.82] : [uc + du * 0.78, vc - dv * 0.82]
            const pEnd = tiltLeft ? [uc + du * 0.82, vc + dv * 0.84] : [uc - du * 0.82, vc + dv * 0.84]

            const dirU = pEnd[0] - pStart[0]
            const dirV = pEnd[1] - pStart[1]
            const len = Math.hypot(dirU, dirV) || 1
            const nx = -dirV / len
            const ny = dirU / len
            const maxHalfW = Math.min(du, dv) * 0.44
            const curveBend = (tiltLeft ? 1 : -1) * Math.min(du, dv) * 0.18

            const pts = []
            for (let s = 0; s <= segs; s++) {
                const t = s / segs
                const profile = Math.sin(Math.PI * t)
                const arch = Math.sin(Math.PI * t) * curveBend
                const u = pStart[0] + dirU * t + nx * (arch + maxHalfW * profile)
                const v = pStart[1] + dirV * t + ny * (arch + maxHalfW * profile)
                pts.push(warpFoliageUV(u, v, xMin, xMax, yMin, yMax, phase))
            }
            for (let s = segs - 1; s >= 1; s--) {
                const t = s / segs
                const profile = Math.sin(Math.PI * t)
                const arch = Math.sin(Math.PI * t) * curveBend
                const u = pStart[0] + dirU * t + nx * (arch - maxHalfW * profile)
                const v = pStart[1] + dirV * t + ny * (arch - maxHalfW * profile)
                pts.push(warpFoliageUV(u, v, xMin, xMax, yMin, yMax, phase))
            }

            const hole = new THREE.Path()
            hole.moveTo(pts[0][0], pts[0][1])
            for (let i = 1; i < pts.length; i++) {
                hole.lineTo(pts[i][0], pts[i][1])
            }
            hole.closePath()
            holesArray.push(hole)
        }
    }
}

function makeStencilGlyphHolePaths(token, offsetX, offsetY, scaleX, scaleY, skew = 0) {
    const paths = []
    const tx = (u, v) => offsetX + (u + skew * v) * scaleX
    const ty = (v) => offsetY + v * scaleY

    const pushPolygon = (coords) => {
        const p = new THREE.Path()
        for (let i = 0; i < coords.length; i++) {
            const x = tx(coords[i][0], coords[i][1])
            const y = ty(coords[i][1])
            if (i === 0) p.moveTo(x, y)
            else p.lineTo(x, y)
        }
        p.closePath()
        paths.push(p)
    }

    if (token === 'iTS_i') {
        // Stencil 'i' matching the close-up photo: lower bar with diagonal top + upper triangular wedge dot
        const sh = (u, v) => [u + 0.09 * v, v]
        pushPolygon([sh(0.0, 0.0), sh(0.25, 0.0), sh(0.25, 0.62), sh(0.0, 0.72)])
        pushPolygon([sh(0.0, 0.83), sh(0.25, 0.96), sh(0.25, 1.0), sh(0.0, 1.0)])
        return { paths, w: 0.27 }
    }

    if (token === 'O') {
        // Smooth Bezier stencil 'O' split by vertical top/bottom bridges so the center island stays solid metal
        const w = 0.72
        const t = 0.18
        const bL = 0.305
        const bR = 0.415

        const leftShape = new THREE.Shape()
        leftShape.moveTo(bL, 0.01)
        leftShape.lineTo(bL, t + 0.01)
        leftShape.bezierCurveTo(t + 0.03, t + 0.02, t, 0.28, t, 0.5)
        leftShape.bezierCurveTo(t, 0.72, t + 0.03, 1.0 - t - 0.02, bL, 1.0 - t - 0.01)
        leftShape.lineTo(bL, 0.99)
        leftShape.bezierCurveTo(w * 0.08, 0.96, 0, 0.8, 0, 0.5)
        leftShape.bezierCurveTo(0, 0.2, w * 0.08, 0.04, bL, 0.01)
        leftShape.closePath()

        const rightShape = new THREE.Shape()
        rightShape.moveTo(bR, 0.01)
        rightShape.bezierCurveTo(w * 0.92, 0.04, w, 0.2, w, 0.5)
        rightShape.bezierCurveTo(w, 0.8, w * 0.92, 0.96, bR, 0.99)
        rightShape.lineTo(bR, 1.0 - t - 0.01)
        rightShape.bezierCurveTo(w - t - 0.03, 1.0 - t - 0.02, w - t, 0.72, w - t, 0.5)
        rightShape.bezierCurveTo(w - t, 0.28, w - t - 0.03, t + 0.02, bR, t + 0.01)
        rightShape.closePath()

        for (const sub of [leftShape, rightShape]) {
            const pts = sub.getPoints(18)
            const p = new THREE.Path()
            pts.forEach((pt, idx) => {
                const x = tx(pt.x, pt.y)
                const y = ty(pt.y)
                if (idx === 0) p.moveTo(x, y)
                else p.lineTo(x, y)
            })
            p.closePath()
            paths.push(p)
        }
        return { paths, w }
    }

    const { shapes, w } = makePlaqueGlyph(token)
    shapes.forEach((sh) => {
        const pts = sh.getPoints(18)
        const p = new THREE.Path()
        pts.forEach((pt, idx) => {
            const x = tx(pt.x, pt.y)
            const y = ty(pt.y)
            if (idx === 0) p.moveTo(x, y)
            else p.lineTo(x, y)
        })
        p.closePath()
        paths.push(p)
    })
    return { paths, w }
}

function addStencilTextRowHoles(holesArray, tokens, startX, y, scaleX, scaleY, gap, skew = 0) {
    let cursorX = startX
    for (const token of tokens) {
        const { paths, w } = makeStencilGlyphHolePaths(token, cursorX, y, scaleX, scaleY, skew)
        holesArray.push(...paths)
        cursorX += w * scaleX + gap
    }
}

export function createTeknoSainsBollardLamp() {
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
