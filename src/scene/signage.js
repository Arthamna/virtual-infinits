import * as THREE from 'three'
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
    const lampGlassMat = new THREE.MeshStandardMaterial({
        color: 0xdbe4ee,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0xffe2b0,
        emissiveIntensity: 2.5
    })
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

        // uplight washing the letters behind the lamp (no shadows: 8 shadow maps is too costly)
        const spot = new THREE.SpotLight(0xffe2b0, 6, 4, 0.75, 0.7, 2)
        spot.position.set(lx, 0.14, 0.3)
        spot.target.position.set(lx, 0.95, -0.11)
        group.add(spot, spot.target)
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

    // backlight: glowing halo in the gap between plaque and wall, plus a light washing the wall
    const haloGeo = new THREE.ShapeGeometry(plaqueShape, 36)
    haloGeo.translate(-2.35, -0.86, 0)
    haloGeo.scale(1.05, 1.13, 1)
    haloGeo.translate(2.35, 0.86, 0)
    const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffd9a0).multiplyScalar(2.2),
        transparent: true,
        opacity: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.position.z = -0.03
    plaqueGroup.add(halo)
    const backLight = new THREE.PointLight(0xffd9a0, 2.5, 3, 2)
    backLight.position.set(2.35, 0.86, -0.025)
    plaqueGroup.add(backLight)

    plaqueGroup.position.set(2.25, -1.32, 0.62)
    group.add(plaqueGroup)

    return group
}

// Raised lettering: canvas text used as a cut-out on 5 stacked layers (grey sides, white face),
// so it reads as extruded letters from an angle. lines: [{ text, x, y (baseline), size }] in metres.
function createRaisedText(lines, w, h, { depth = 0.03, face = 0xffffff, side = 0x8a919d } = {}) {
    const ppm = 900 // canvas pixels per metre
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w * ppm)
    canvas.height = Math.ceil(h * ppm)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#fff'
    ctx.lineJoin = 'round'
    // black-weight look like the real sign: heavy font, plus an outline stroke in case it isn't installed
    const fontAt = (size) => `900 ${size * ppm}px "Arial Black", Arial, Helvetica, sans-serif`
    // installed fonts differ in width: shrink the whole block evenly if any line would run off the panel
    let fit = 1
    for (const { text, x, size } of lines) {
        ctx.font = fontAt(size)
        fit = Math.min(fit, ((w - x - 0.05) * ppm) / (ctx.measureText(text).width + size * ppm * 0.07))
    }
    for (const { text, x, y, size: baseSize } of lines) {
        const size = baseSize * fit
        ctx.font = fontAt(size)
        ctx.lineWidth = size * ppm * 0.07
        ctx.fillText(text, x * ppm, (h - y) * ppm)
        ctx.strokeText(text, x * ppm, (h - y) * ppm)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const group = new THREE.Group()
    const layers = 5
    for (let i = 0; i < layers; i++) {
        const mat = new THREE.MeshStandardMaterial({
            map: tex,
            alphaTest: 0.5,
            color: i === layers - 1 ? face : side,
            roughness: 0.5
        })
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
        plane.position.set(w / 2, h / 2, (i / (layers - 1)) * depth)
        plane.castShadow = i === layers - 1
        plane.userData.noAO = true // alpha-tested: keep out of GTAO's solid-quad depth pass
        group.add(plane)
    }
    return group
}

// rounded "diagonal top" panel: flat bottom, top runs from height hL (left) to hR (right)
function diagonalPanelShape(w, hL, hR, r = 0.1) {
    const slope = (hR - hL) / w
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(w, 0)
    s.lineTo(w, hR - r)
    s.quadraticCurveTo(w, hR, w - r, hR - r * slope)
    s.lineTo(r, hL + r * slope)
    s.quadraticCurveTo(0, hL, 0, hL - r)
    s.closePath()
    return s
}

// ITS Tekno Sains direction pylon, modelled on the reference photo: white back slab, a blue front slab
// shifted left (white edge layer showing between them), two blue strips below it, raised white labels,
// on a painted blue concrete block.
export function createTeknoSainsTotem() {
    const group = new THREE.Group()
    const extrude = (shape, depth) =>
        new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 2,
            curveSegments: 16
        })
    const add = (geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat)
        m.position.set(x, y, z)
        m.castShadow = true
        m.receiveShadow = true
        group.add(m)
        return m
    }

    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x2f6fdc, roughness: 0.9 })
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.55, metalness: 0.03 })
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1f5fd0, roughness: 0.42, metalness: 0.1, envMapIntensity: 0.4 })

    // painted concrete block
    const plinthH = 0.26
    add(new THREE.BoxGeometry(1.42, plinthH, 0.46), plinthMat, 0.5, plinthH / 2, 0)

    // white back slab, z -0.07..0.07 (+bevel)
    const whiteW = 1.12
    add(extrude(diagonalPanelShape(whiteW, 2.78, 3.1, 0.12), 0.14), whiteMat, 0, plinthH, -0.07)

    // blue front assembly (both faces), shifted left past the white slab, on a thin white edge layer
    const blueX = -0.12
    const blueW = 1.1
    const mainY = 0.56 // main panel bottom, above the plinth
    const mainShape = diagonalPanelShape(blueW, 1.96, 1.03)
    const stripShape = new THREE.Shape()
    stripShape.moveTo(0, 0)
    stripShape.lineTo(blueW, 0)
    stripShape.lineTo(blueW, 0.24)
    stripShape.lineTo(0, 0.24)
    stripShape.closePath()
    const pieces = [
        [mainShape, mainY],
        [stripShape, 0.28], // url strip
        [stripShape, 0] // bottom strip
    ]
    for (const sign of [1, -1]) {
        const zFace = 0.085 * sign
        for (const [shape, y] of pieces) {
            // white edge layer then blue slab, stacked outward from the white slab's face
            add(extrude(shape, 0.03), whiteMat, blueX, plinthH + y, sign > 0 ? zFace : zFace - 0.03)
            add(extrude(shape, 0.05), blueMat, blueX, plinthH + y, sign > 0 ? zFace + 0.03 : zFace - 0.08)
        }
    }
    const frontZ = 0.085 + 0.03 + 0.05 + 0.012 // blue slab face (+bevel)

    // raised white labels on the main blue panel and the url strip
    const labels = createRaisedText(
        [
            { text: 'Jogging Track', x: 0.09, y: 0.76, size: 0.118 },
            { text: 'Amphiteather', x: 0.09, y: 0.54, size: 0.118 },
            { text: 'Plaza', x: 0.09, y: 0.33, size: 0.118 },
            { text: 'Dock', x: 0.09, y: 0.12, size: 0.118 }
        ],
        blueW,
        1.2
    )
    labels.position.set(blueX, plinthH + mainY, frontZ)
    group.add(labels)
    const url = createRaisedText([{ text: 'www.itsteknosains.co.id', x: 0.07, y: 0.085, size: 0.074 }], blueW, 0.24, { depth: 0.015 })
    url.position.set(blueX, plinthH + 0.28, frontZ)
    group.add(url)

    // ITS (light blue) / TEKNO SAINS (charcoal) logo on the white slab, kept above the blue diagonal
    // (which is ~2.33 m high at x 0.37) and below the white top (~3.16 m at x 0.42)
    const { darkFrontMat, whiteSideMat, itsBlueFrontMat, itsLightSideMat } = createPlaqueLetterMaterials()
    itsBlueFrontMat.color.set(0x1e8fe6)
    const logoZ = 0.085
    add3DTextTokens(group, ['iTS_i', 'iTS_T', 'iTS_S'], 0.42, 2.8, logoZ, 0.25, 0.2, 0.012, [itsBlueFrontMat, itsLightSideMat], 0.028)
    add3DTextTokens(group, ['T', 'E', 'K', 'N', 'O'], 0.34, 2.6, logoZ, 0.14, 0.145, 0.02, [darkFrontMat, whiteSideMat], 0.024, 0.12)
    add3DTextTokens(group, ['S', '^', 'I', 'N', 'S'], 0.37, 2.42, logoZ, 0.14, 0.145, 0.02, [darkFrontMat, whiteSideMat], 0.024, 0.12)

    return group
}
