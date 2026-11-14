import * as THREE from 'three'
import {
    createTotemWhiteTexture,
    createTotemWhiteBumpTexture,
    createTotemBlueTexture,
    createTotemUrlTexture
} from './textures'
import { createPlaqueLetterMaterials, add3DTextTokens } from './plaqueGlyphs'

const EXTRUDE_SETTINGS = {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 16
}

function makeRoundedRectShape(w, h) {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(w, 0)
    s.lineTo(w, h)
    s.lineTo(0, h)
    s.closePath()
    return s
}

function createLetterShape(char, isTallCap = true) {
    const s = new THREE.Shape()
    switch (char) {
        case 'I':
            return { shape: makeRoundedRectShape(0.27, isTallCap ? 1.5 : 1.12), width: 0.27 }

        case 'i':
            return { shape: makeRoundedRectShape(0.27, 1.12), width: 0.27 }

        case 'n': {
            const t = 0.27
            const w = 0.96
            const h = 1.12

            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.72)
            s.quadraticCurveTo(t, h - t, 0.42, h - t)
            s.lineTo(w - t - 0.12, h - t)
            s.quadraticCurveTo(w - t, h - t, w - t, 0.72)
            s.lineTo(w - t, 0)
            s.lineTo(w, 0)
            s.lineTo(w, 0.76)
            s.quadraticCurveTo(w, h, w - 0.34, h)
            s.lineTo(0.22, h)
            s.quadraticCurveTo(0, h, 0, h - 0.22)
            s.closePath()
            return { shape: s, width: w }
        }

        case 'f': {
            const t = 0.27
            const h = 1.66
            s.moveTo(0.2, 0)
            s.lineTo(0.2 + t, 0)
            s.lineTo(0.2 + t, 0.88)
            s.lineTo(0.72, 0.88)
            s.lineTo(0.72, 1.13)
            s.lineTo(0.2 + t, 1.13)
            s.lineTo(0.2 + t, 1.32)
            s.quadraticCurveTo(0.2 + t, 1.4, 0.56, 1.4)
            s.lineTo(0.72, 1.4)
            s.lineTo(0.72, h)
            s.lineTo(0.48, h)
            s.quadraticCurveTo(0.2, h, 0.2, 1.34)
            s.lineTo(0.2, 1.13)
            s.lineTo(0, 1.13)
            s.lineTo(0, 0.88)
            s.lineTo(0.2, 0.88)
            s.closePath()
            return { shape: s, width: 0.74 }
        }

        case 'T': {
            const w = 1.02
            const h = 1.5
            const t = 0.27
            const cx = w / 2
            s.moveTo(cx - t / 2, 0)
            s.lineTo(cx + t / 2, 0)
            s.lineTo(cx + t / 2, h - t)
            s.lineTo(w, h - t)
            s.lineTo(w, h)
            s.lineTo(0, h)
            s.lineTo(0, h - t)
            s.lineTo(cx - t / 2, h - t)
            s.closePath()
            return { shape: s, width: w }
        }

        case 'S': {
            const w = 0.94
            const h = 1.5
            const t = 0.26

            s.moveTo(0.02, 0)
            s.lineTo(w - 0.3, 0)
            s.quadraticCurveTo(w, 0, w, 0.34)
            s.lineTo(w, 0.54)
            s.quadraticCurveTo(w, 0.88, w - 0.3, 0.88)
            s.lineTo(0.36, 0.88)
            s.quadraticCurveTo(t, 0.88, t, 1.0)
            s.lineTo(t, 1.12)
            s.quadraticCurveTo(t, h - t, 0.36, h - t)
            s.lineTo(w - 0.04, h - t)
            s.lineTo(w - 0.04, h)
            s.lineTo(0.3, h)
            s.quadraticCurveTo(0, h, 0, 1.16)
            s.lineTo(0, 0.96)
            s.quadraticCurveTo(0, 0.62, 0.3, 0.62)
            s.lineTo(w - 0.36, 0.62)
            s.quadraticCurveTo(w - t, 0.62, w - t, 0.5)
            s.lineTo(w - t, 0.38)
            s.quadraticCurveTo(w - t, t, w - 0.36, t)
            s.lineTo(0.02, t)
            s.closePath()
            return { shape: s, width: w }
        }

        case 'P': {

            const w = 0.94
            const h = 1.5
            const t = 0.26
            s.moveTo(0, -0.22)
            s.lineTo(t, -0.22)
            s.lineTo(t, 0.6)
            s.lineTo(w - 0.3, 0.6)
            s.quadraticCurveTo(w, 0.6, w, 0.9)
            s.lineTo(w, 1.2)
            s.quadraticCurveTo(w, h, w - 0.3, h)
            s.lineTo(0, h)
            s.lineTo(0, h - t)
            s.lineTo(w - t - 0.12, h - t)
            s.quadraticCurveTo(w - t, h - t, w - t, h - t - 0.12)
            s.lineTo(w - t, 0.98)
            s.quadraticCurveTo(w - t, 0.86, w - t - 0.12, 0.86)
            s.lineTo(0.3, 0.86)
            s.quadraticCurveTo(0, 0.86, 0, 0.56)
            s.closePath()
            return { shape: s, width: w }
        }

        case 'a': {
            const w = 0.9
            const h = 1.12
            const t = 0.25
            s.moveTo(0.08, h - t)
            s.lineTo(w - t - 0.14, h - t)
            s.quadraticCurveTo(w - t, h - t, w - t, 0.72)
            s.lineTo(w - t, 0.66)
            s.lineTo(0.34, 0.66)
            s.quadraticCurveTo(0, 0.66, 0, 0.33)
            s.quadraticCurveTo(0, 0, 0.34, 0)
            s.lineTo(w, 0)
            s.lineTo(w, 0.78)
            s.quadraticCurveTo(w, h, w - 0.34, h)
            s.lineTo(0.08, h)
            s.closePath()

            const hole = new THREE.Path()
            hole.moveTo(0.36, 0.22)
            hole.lineTo(w - t, 0.22)
            hole.lineTo(w - t, 0.44)
            hole.lineTo(0.36, 0.44)
            hole.quadraticCurveTo(0.24, 0.44, 0.24, 0.33)
            hole.quadraticCurveTo(0.24, 0.22, 0.36, 0.22)
            hole.closePath()
            s.holes.push(hole)
            return { shape: s, width: w }
        }

        case 'r': {
            const t = 0.26
            const w = 0.64
            const h = 1.12
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.72)
            s.quadraticCurveTo(t, h - t, 0.4, h - t)
            s.lineTo(w, h - t)
            s.lineTo(w, h)
            s.lineTo(0.22, h)
            s.quadraticCurveTo(0, h, 0, h - 0.22)
            s.closePath()
            return { shape: s, width: w }
        }

        case 'k': {
            const t = 0.26
            const w = 0.88
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.46)
            s.lineTo(0.6, 0)
            s.lineTo(w, 0)
            s.lineTo(0.46, 0.56)
            s.lineTo(0.84, 1.12)
            s.lineTo(0.54, 1.12)
            s.lineTo(t, 0.66)
            s.lineTo(t, 1.5)
            s.lineTo(0, 1.5)
            s.closePath()
            return { shape: s, width: w }
        }

        default:
            return { shape: makeRoundedRectShape(0.4, 1.0), width: 0.4 }
    }
}

export function createInfinitsSignage() {
    const group = new THREE.Group()

    const blueMat = new THREE.MeshStandardMaterial({
        color: 0x064da3,
        roughness: 0.36,
        metalness: 0.12,
        envMapIntensity: 0.55
    })
    const yellowMat = new THREE.MeshStandardMaterial({
        color: 0xe8a800,
        roughness: 0.36,
        metalness: 0.12,
        envMapIntensity: 0.55
    })
    const postMat = new THREE.MeshStandardMaterial({
        color: 0x22262b,
        roughness: 0.45,
        metalness: 0.75
    })

    const lettersGroup = new THREE.Group()
    const word = 'InfinITS Park'
    let cursorX = 0
    const letterGap = 0.16

    for (let idx = 0; idx < word.length; idx++) {
        const ch = word[idx]
        if (ch === ' ') {
            cursorX += 0.42
            continue
        }

        const isYellow = idx >= 9
        const mat = isYellow ? yellowMat : blueMat
        const { shape, width } = createLetterShape(ch, idx >= 5)
        const shapes = Array.isArray(shape) ? shape : [shape]

        shapes.forEach((sh) => {
            const geo = new THREE.ExtrudeGeometry(sh, EXTRUDE_SETTINGS)
            const mesh = new THREE.Mesh(geo, mat)
            mesh.position.set(cursorX, 0.22, -0.11)
            mesh.castShadow = true
            mesh.receiveShadow = true
            lettersGroup.add(mesh)
        })

        const postFracsByChar = {
            P: [],
            n: [0.14, 0.86],
            S: [0.22, 0.78],
            a: [0.26, 0.85],
            k: [0.15, 0.84],
            f: [0.45],
            r: [0.2]
        }
        const postFracs = postFracsByChar[ch] || [0.5]
        const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10)
        for (const frac of postFracs) {
            const post = new THREE.Mesh(postGeo, mat)
            post.position.set(cursorX + width * frac, 0.11, 0)
            post.castShadow = true
            lettersGroup.add(post)
        }

        cursorX += width + letterGap
    }

    lettersGroup.position.x = -cursorX / 2
    group.add(lettersGroup)

    const lampMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.45, metalness: 0.6 })
    const lampGlassMat = new THREE.MeshStandardMaterial({ color: 0xdbe4ee, roughness: 0.2, metalness: 0.8 })
    for (let lx = -4.8; lx <= 4.8; lx += 1.35) {
        const lampGroup = new THREE.Group()
        lampGroup.position.set(lx, 0.03, 0.34)
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), lampMat)
        bracket.position.y = 0.03
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.08), lampMat)
        head.position.set(0, 0.09, -0.01)
        head.rotation.x = 0.38
        const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.075), lampGlassMat)
        lens.position.set(0, 0.105, -0.048)
        lens.rotation.x = 0.38 + Math.PI
        lampGroup.add(bracket, head, lens)
        group.add(lampGroup)
    }

    const plaqueShape = new THREE.Shape()
    plaqueShape.moveTo(0.08, 0)
    plaqueShape.lineTo(2.58, 0)

    plaqueShape.bezierCurveTo(3.45, 0.04, 4.12, 0.72, 4.62, 1.56)
    plaqueShape.quadraticCurveTo(4.7, 1.72, 4.44, 1.72)

    plaqueShape.lineTo(2.45, 1.72)
    plaqueShape.bezierCurveTo(1.92, 1.72, 1.74, 0.68, 1.24, 0.68)
    plaqueShape.lineTo(0.48, 0.68)

    plaqueShape.bezierCurveTo(0.18, 0.68, -0.02, 0.24, 0.0, 0.06)
    plaqueShape.quadraticCurveTo(0.01, 0, 0.08, 0)
    plaqueShape.closePath()

    const plaqueGeo = new THREE.ExtrudeGeometry(plaqueShape, {
        depth: 0.13,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.015,
        bevelSegments: 3,
        curveSegments: 36
    })
    const plaqueBodyMat = new THREE.MeshStandardMaterial({
        color: 0xf2f0ea,
        roughness: 0.55,
        metalness: 0.02,
        envMapIntensity: 0.25
    })
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueBodyMat)
    plaqueMesh.castShadow = true
    plaqueMesh.receiveShadow = true

    const trimGeo = new THREE.ExtrudeGeometry(plaqueShape, {
        depth: 0.115,
        bevelEnabled: true,
        bevelThickness: 0.014,
        bevelSize: 0.014,
        bevelSegments: 2,
        curveSegments: 36
    })
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0x242238,
        roughness: 0.42,
        metalness: 0.18
    })
    const trimMesh = new THREE.Mesh(trimGeo, trimMat)
    trimMesh.position.set(0.055, -0.065, -0.018)
    trimMesh.castShadow = true
    trimMesh.receiveShadow = true

    const { darkFrontMat, whiteSideMat, itsBlueFrontMat, itsLightSideMat } = createPlaqueLetterMaterials()

    const plaqueGroup = new THREE.Group()
    plaqueGroup.add(trimMesh, plaqueMesh)

    add3DTextTokens(
        plaqueGroup,
        ['SB_S', 'SB_U', 'SB_P', 'SB_P', 'SB_O', 'SB_R', 'SB_T', 'SB_E', 'SB_D', ' ', 'SB_B', 'SB_Y'],
        0.42,
        0.19,
        0.132,
        0.14,
        0.156,
        0.02,
        [darkFrontMat, whiteSideMat],
        0.028
    )

    add3DTextTokens(
        plaqueGroup,
        ['iTS_i', 'iTS_T', 'iTS_S'],
        2.4,
        1.04,
        0.132,
        0.44,
        0.38,
        0.018,
        [itsBlueFrontMat, itsLightSideMat],
        0.04
    )

    add3DTextTokens(
        plaqueGroup,
        ['T', 'E', 'K', 'N', 'O'],
        2.38,
        0.64,
        0.132,
        0.28,
        0.29,
        0.037,
        [darkFrontMat, whiteSideMat],
        0.036,
        0.12
    )

    add3DTextTokens(
        plaqueGroup,
        ['S', '^', 'I', 'N', 'S'],
        2.33,
        0.25,
        0.132,
        0.28,
        0.29,
        0.037,
        [darkFrontMat, whiteSideMat],
        0.036,
        0.12
    )

    plaqueGroup.position.set(2.25, -1.32, 0.62)
    group.add(plaqueGroup)

    return group
}

export function createTeknoSainsTotem() {
    const group = new THREE.Group()

    const normalizeUVs = (geo, w, h) => {
        const pos = geo.attributes.position
        const uvs = new Float32Array(pos.count * 2)
        for (let i = 0; i < pos.count; i++) {
            uvs[i * 2] = pos.getX(i) / w
            uvs[i * 2 + 1] = pos.getY(i) / h
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    }

    const blueBaseMat = new THREE.MeshStandardMaterial({
        color: 0x073f94,
        roughness: 0.45,
        metalness: 0.18,
        envMapIntensity: 0.4
    })
    const plinthBottom = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.12, 0.4), blueBaseMat)
    plinthBottom.position.set(0.5, 0.06, 0.08)
    plinthBottom.castShadow = true
    plinthBottom.receiveShadow = true
    group.add(plinthBottom)

    const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.1, 0.34), blueBaseMat)
    plinthTop.position.set(0.5, 0.17, 0.08)
    plinthTop.castShadow = true
    plinthTop.receiveShadow = true
    group.add(plinthTop)

    const whiteW = 1.12
    const whiteH = 3.35
    const whiteShape = new THREE.Shape()
    whiteShape.moveTo(0, 0)
    whiteShape.lineTo(whiteW, 0)
    whiteShape.lineTo(whiteW, whiteH - 0.12)
    whiteShape.quadraticCurveTo(whiteW, whiteH, whiteW - 0.14, whiteH - 0.04)
    whiteShape.lineTo(0.12, 2.62)
    whiteShape.quadraticCurveTo(0, 2.56, 0, 2.42)
    whiteShape.closePath()

    const whiteBodyGeo = new THREE.ExtrudeGeometry(whiteShape, {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
        curveSegments: 16
    })
    const whiteBodyMat = new THREE.MeshStandardMaterial({
        color: 0xdce0e4,
        roughness: 0.58,
        metalness: 0.05,
        envMapIntensity: 0.3
    })
    const whiteBody = new THREE.Mesh(whiteBodyGeo, whiteBodyMat)
    whiteBody.position.set(-0.04, 0.22, -0.02)
    whiteBody.castShadow = true
    whiteBody.receiveShadow = true
    group.add(whiteBody)

    const whiteFaceGeo = new THREE.ShapeGeometry(whiteShape, 16)
    normalizeUVs(whiteFaceGeo, whiteW, whiteH)
    const whiteFaceMat = new THREE.MeshStandardMaterial({
        map: createTotemWhiteTexture(),
        bumpMap: createTotemWhiteBumpTexture(),
        bumpScale: 0.055,
        roughness: 0.58,
        metalness: 0.04,
        envMapIntensity: 0.25
    })
    const whiteFace = new THREE.Mesh(whiteFaceGeo, whiteFaceMat)
    whiteFace.position.set(-0.04, 0.22, 0.156)
    whiteFace.receiveShadow = true
    group.add(whiteFace)

    const blueW = 0.96
    const blueX = 0.01
    const blueFrontZ = 0.11
    const blueBackZ = -0.105

    const urlBandMat = new THREE.MeshStandardMaterial({
        map: createTotemUrlTexture(),
        roughness: 0.45,
        metalness: 0.12,
        envMapIntensity: 0.35
    })

    const blueH = 1.66
    const blueShape = new THREE.Shape()
    blueShape.moveTo(0, 0)
    blueShape.lineTo(blueW, 0)
    blueShape.lineTo(blueW, 0.96)
    blueShape.quadraticCurveTo(blueW, 1.08, blueW - 0.1, 1.14)
    blueShape.lineTo(0.14, blueH)
    blueShape.quadraticCurveTo(0, blueH + 0.05, 0, blueH - 0.1)
    blueShape.closePath()

    const blueBodyGeo = new THREE.ExtrudeGeometry(blueShape, {
        depth: 0.085,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 2,
        curveSegments: 16
    })

    const blueFaceGeo = new THREE.ShapeGeometry(blueShape, 16)
    normalizeUVs(blueFaceGeo, blueW, blueH)
    const blueFaceMat = new THREE.MeshStandardMaterial({
        map: createTotemBlueTexture(),
        roughness: 0.45,
        metalness: 0.12,
        envMapIntensity: 0.35
    })

    ;[blueFrontZ, blueBackZ].forEach((zPos, idx) => {
        const isFront = idx === 0

        const bottomBand = new THREE.Mesh(new THREE.BoxGeometry(blueW, 0.2, 0.1), blueBaseMat)
        bottomBand.position.set(blueX + blueW / 2, 0.32, zPos + 0.05)
        bottomBand.castShadow = true
        bottomBand.receiveShadow = true
        group.add(bottomBand)

        const urlBandGeo = new THREE.BoxGeometry(blueW, 0.21, 0.1)
        const urlBand = new THREE.Mesh(urlBandGeo, [
            blueBaseMat,
            blueBaseMat,
            blueBaseMat,
            blueBaseMat,
            isFront ? urlBandMat : blueBaseMat,
            isFront ? blueBaseMat : urlBandMat
        ])
        urlBand.position.set(blueX + blueW / 2, 0.56, zPos + 0.05)
        urlBand.castShadow = true
        urlBand.receiveShadow = true
        group.add(urlBand)

        const blueBody = new THREE.Mesh(blueBodyGeo, blueBaseMat)
        blueBody.position.set(blueX, 0.7, zPos)
        blueBody.castShadow = true
        blueBody.receiveShadow = true
        group.add(blueBody)

        if (isFront) {
            const blueFace = new THREE.Mesh(blueFaceGeo, blueFaceMat)
            blueFace.position.set(blueX, 0.7, zPos + 0.098)
            blueFace.receiveShadow = true
            group.add(blueFace)
        }
    })

    const { darkFrontMat, whiteSideMat, itsBlueFrontMat, itsLightSideMat } = createPlaqueLetterMaterials()
    add3DTextTokens(
        group,
        ['iTS_i', 'iTS_T', 'iTS_S'],
        0.35,
        2.74,
        0.156,
        0.21,
        0.18,
        0.01,
        [itsBlueFrontMat, itsLightSideMat],
        0.022
    )
    add3DTextTokens(
        group,
        ['T', 'E', 'K', 'N', 'O'],
        0.26,
        2.52,
        0.156,
        0.135,
        0.14,
        0.018,
        [darkFrontMat, whiteSideMat],
        0.02,
        0.12
    )
    add3DTextTokens(
        group,
        ['S', '^', 'I', 'N', 'S'],
        0.29,
        2.33,
        0.156,
        0.135,
        0.14,
        0.018,
        [darkFrontMat, whiteSideMat],
        0.02,
        0.12
    )

    return group
}
