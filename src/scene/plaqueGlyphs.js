import * as THREE from 'three'

const shearITS = (u, v) => [u + 0.09 * v, v]

function makeFallbackRect(w, h) {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(w, 0)
    s.lineTo(w, h)
    s.lineTo(0, h)
    s.closePath()
    return s
}

export function makePlaqueGlyph(ch) {
    const s = new THREE.Shape()
    switch (ch) {
        case 'iTS_i': {
            const p = shearITS
            s.moveTo(...p(0.0, 0.0))
            s.lineTo(...p(0.25, 0.0))
            s.lineTo(...p(0.25, 1.0))
            s.lineTo(...p(0.0, 1.0))
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(...p(0.05, 0.72))
            h.lineTo(...p(0.22, 0.94))
            h.lineTo(...p(0.18, 0.72))
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w: 0.27 }
        }
        case 'iTS_T': {
            const p = shearITS
            s.moveTo(...p(0.16, 0.0))
            s.lineTo(...p(0.23, 0.0))
            s.quadraticCurveTo(...p(0.41, 0.02), ...p(0.41, 0.25))
            s.lineTo(...p(0.41, 0.74))
            s.lineTo(...p(0.6, 0.74))
            s.quadraticCurveTo(...p(0.64, 0.74), ...p(0.64, 0.79))
            s.lineTo(...p(0.64, 0.96))
            s.quadraticCurveTo(...p(0.64, 1.0), ...p(0.6, 1.0))
            s.lineTo(...p(0.04, 1.0))
            s.lineTo(...p(-0.04, 0.74))
            s.lineTo(...p(0.16, 0.74))
            s.closePath()
            return { shapes: [s], w: 0.65 }
        }
        case 'iTS_S': {
            const p = shearITS
            s.moveTo(...p(0.0, 0.0))
            s.lineTo(...p(0.36, 0.0))
            s.quadraticCurveTo(...p(0.64, 0.0), ...p(0.64, 0.3))
            s.quadraticCurveTo(...p(0.64, 0.59), ...p(0.35, 0.61))
            s.lineTo(...p(0.29, 0.62))
            s.quadraticCurveTo(...p(0.23, 0.63), ...p(0.23, 0.7))
            s.quadraticCurveTo(...p(0.23, 0.78), ...p(0.31, 0.78))
            s.lineTo(...p(0.42, 0.78))
            s.quadraticCurveTo(...p(0.58, 0.78), ...p(0.66, 0.96))
            s.quadraticCurveTo(...p(0.67, 1.0), ...p(0.61, 1.0))
            s.lineTo(...p(0.28, 1.0))
            s.quadraticCurveTo(...p(0.02, 1.0), ...p(0.02, 0.71))
            s.quadraticCurveTo(...p(0.02, 0.42), ...p(0.29, 0.4))
            s.lineTo(...p(0.36, 0.39))
            s.quadraticCurveTo(...p(0.42, 0.38), ...p(0.42, 0.3))
            s.quadraticCurveTo(...p(0.42, 0.22), ...p(0.34, 0.22))
            s.lineTo(...p(0.22, 0.22))
            s.quadraticCurveTo(...p(0.08, 0.22), ...p(0.0, 0.04))
            s.closePath()
            return { shapes: [s], w: 0.68 }
        }
        case 'I': {
            const w = 0.185
            s.moveTo(0, 0)
            s.lineTo(w, 0)
            s.lineTo(w, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'T': {
            const w = 0.66
            const t = 0.18
            const stemW = 0.185
            const sx = (w - stemW) * 0.5
            s.moveTo(sx, 0)
            s.lineTo(sx + stemW, 0)
            s.lineTo(sx + stemW, 1.0 - t)
            s.lineTo(w, 1.0 - t)
            s.lineTo(w, 1.0)
            s.lineTo(0, 1.0)
            s.lineTo(0, 1.0 - t)
            s.lineTo(sx, 1.0 - t)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'E': {
            const w = 0.62
            const t = 0.18
            const r = 0.22
            s.moveTo(r, 0)
            s.lineTo(w, 0)
            s.lineTo(w, t)
            s.lineTo(t, t)
            s.lineTo(t, 0.41)
            s.lineTo(w - 0.08, 0.41)
            s.lineTo(w - 0.08, 0.59)
            s.lineTo(t, 0.59)
            s.lineTo(t, 1.0 - t)
            s.lineTo(w, 1.0 - t)
            s.lineTo(w, 1.0)
            s.lineTo(r, 1.0)
            s.quadraticCurveTo(0, 1.0, 0, 1.0 - r)
            s.lineTo(0, r)
            s.quadraticCurveTo(0, 0, r, 0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'K': {
            const w = 0.68
            const t = 0.185
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.42)
            s.lineTo(0.47, 0)
            s.lineTo(w, 0)
            s.lineTo(0.37, 0.5)
            s.quadraticCurveTo(0.44, 0.66, 0.67, 1.0)
            s.lineTo(0.46, 1.0)
            s.quadraticCurveTo(0.28, 0.7, t, 0.54)
            s.lineTo(t, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'N': {
            const w = 0.7
            const t = 0.18
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.68)
            s.lineTo(w - 0.2, 0)
            s.quadraticCurveTo(w, 0, w, 0.22)
            s.lineTo(w, 1.0)
            s.lineTo(w - t, 1.0)
            s.lineTo(w - t, 0.34)
            s.lineTo(0.2, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'O': {
            const w = 0.72
            const t = 0.18
            s.moveTo(w * 0.5, 0)
            s.bezierCurveTo(w * 0.92, 0, w, 0.18, w, 0.5)
            s.bezierCurveTo(w, 0.82, w * 0.92, 1.0, w * 0.5, 1.0)
            s.bezierCurveTo(w * 0.08, 1.0, 0, 0.82, 0, 0.5)
            s.bezierCurveTo(0, 0.18, w * 0.08, 0, w * 0.5, 0)
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(w * 0.5, t)
            h.bezierCurveTo(w - t - 0.04, t, w - t, 0.26, w - t, 0.5)
            h.bezierCurveTo(w - t, 0.74, w - t - 0.04, 1.0 - t, w * 0.5, 1.0 - t)
            h.bezierCurveTo(t + 0.04, 1.0 - t, t, 0.74, t, 0.5)
            h.bezierCurveTo(t, 0.26, t + 0.04, t, w * 0.5, t)
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w }
        }
        case 'S': {
            const w = 0.64
            const t = 0.18
            s.moveTo(0.02, 0)
            s.lineTo(w - 0.22, 0)
            s.quadraticCurveTo(w, 0, w, 0.24)
            s.lineTo(w, 0.36)
            s.quadraticCurveTo(w, 0.585, w - 0.22, 0.585)
            s.lineTo(0.24, 0.585)
            s.quadraticCurveTo(t, 0.585, t, 0.66)
            s.lineTo(t, 0.74)
            s.quadraticCurveTo(t, 1.0 - t, 0.24, 1.0 - t)
            s.lineTo(w - 0.02, 1.0 - t)
            s.lineTo(w - 0.02, 1.0)
            s.lineTo(0.22, 1.0)
            s.quadraticCurveTo(0, 1.0, 0, 0.76)
            s.lineTo(0, 0.64)
            s.quadraticCurveTo(0, 0.415, 0.22, 0.415)
            s.lineTo(w - 0.24, 0.415)
            s.quadraticCurveTo(w - t, 0.415, w - t, 0.34)
            s.lineTo(w - t, 0.26)
            s.quadraticCurveTo(w - t, t, w - 0.24, t)
            s.lineTo(0.02, t)
            s.closePath()
            return { shapes: [s], w }
        }
        case '^': {
            const w = 0.7
            s.moveTo(0, 0)
            s.lineTo(0.19, 0)
            s.lineTo(0.35, 0.74)
            s.lineTo(0.51, 0)
            s.lineTo(w, 0)
            s.lineTo(0.45, 0.94)
            s.quadraticCurveTo(0.41, 1.0, 0.35, 1.0)
            s.quadraticCurveTo(0.29, 1.0, 0.25, 0.94)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'SB_S': {
            const w = 0.66
            s.moveTo(0.01, 0.22)
            s.bezierCurveTo(0.05, 0.04, 0.18, 0.0, 0.34, 0.0)
            s.bezierCurveTo(0.54, 0.0, 0.66, 0.12, 0.66, 0.3)
            s.bezierCurveTo(0.66, 0.46, 0.54, 0.55, 0.35, 0.6)
            s.bezierCurveTo(0.24, 0.63, 0.23, 0.67, 0.23, 0.72)
            s.bezierCurveTo(0.23, 0.78, 0.27, 0.81, 0.34, 0.81)
            s.bezierCurveTo(0.4, 0.81, 0.43, 0.78, 0.44, 0.72)
            s.lineTo(0.64, 0.76)
            s.bezierCurveTo(0.61, 0.93, 0.5, 1.0, 0.34, 1.0)
            s.bezierCurveTo(0.14, 1.0, 0.02, 0.88, 0.02, 0.7)
            s.bezierCurveTo(0.02, 0.54, 0.14, 0.45, 0.32, 0.4)
            s.bezierCurveTo(0.43, 0.37, 0.44, 0.33, 0.44, 0.28)
            s.bezierCurveTo(0.44, 0.22, 0.4, 0.19, 0.33, 0.19)
            s.bezierCurveTo(0.26, 0.19, 0.22, 0.22, 0.2, 0.28)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'SB_U': {
            const w = 0.68
            const t = 0.22
            s.moveTo(w * 0.5, 0)
            s.bezierCurveTo(w * 0.86, 0, w, 0.12, w, 0.34)
            s.lineTo(w, 1.0)
            s.lineTo(w - t, 1.0)
            s.lineTo(w - t, 0.36)
            s.bezierCurveTo(w - t, 0.25, w - t - 0.03, 0.21, w * 0.5, 0.21)
            s.bezierCurveTo(t + 0.03, 0.21, t, 0.25, t, 0.36)
            s.lineTo(t, 1.0)
            s.lineTo(0, 1.0)
            s.lineTo(0, 0.34)
            s.bezierCurveTo(0, 0.12, w * 0.14, 0, w * 0.5, 0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'SB_P': {
            const w = 0.64
            const t = 0.22
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.38)
            s.lineTo(0.38, 0.38)
            s.bezierCurveTo(w * 0.92, 0.38, w, 0.52, w, 0.69)
            s.bezierCurveTo(w, 0.86, w * 0.92, 1.0, 0.38, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(t, 0.58)
            h.lineTo(0.35, 0.58)
            h.bezierCurveTo(w - t, 0.58, w - t + 0.01, 0.63, w - t + 0.01, 0.69)
            h.bezierCurveTo(w - t + 0.01, 0.75, w - t, 0.8, 0.35, 0.8)
            h.lineTo(t, 0.8)
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w }
        }
        case 'SB_O': {
            const w = 0.7
            const t = 0.22
            s.moveTo(w * 0.5, 0)
            s.bezierCurveTo(w * 0.9, 0, w, 0.18, w, 0.5)
            s.bezierCurveTo(w, 0.82, w * 0.9, 1.0, w * 0.5, 1.0)
            s.bezierCurveTo(w * 0.1, 1.0, 0, 0.82, 0, 0.5)
            s.bezierCurveTo(0, 0.18, w * 0.1, 0, w * 0.5, 0)
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(w * 0.5, 0.2)
            h.bezierCurveTo(w - t - 0.02, 0.2, w - t, 0.29, w - t, 0.5)
            h.bezierCurveTo(w - t, 0.71, w - t - 0.02, 0.8, w * 0.5, 0.8)
            h.bezierCurveTo(t + 0.02, 0.8, t, 0.71, t, 0.5)
            h.bezierCurveTo(t, 0.29, t + 0.02, 0.2, w * 0.5, 0.2)
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w }
        }
        case 'SB_R': {
            const w = 0.66
            const t = 0.22
            s.moveTo(0, 0)
            s.lineTo(t, 0)
            s.lineTo(t, 0.4)
            s.lineTo(0.28, 0.4)
            s.lineTo(0.44, 0)
            s.lineTo(w, 0)
            s.lineTo(0.47, 0.42)
            s.bezierCurveTo(w * 0.92, 0.46, w, 0.57, w, 0.71)
            s.bezierCurveTo(w, 0.88, w * 0.9, 1.0, 0.38, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(t, 0.59)
            h.lineTo(0.35, 0.59)
            h.bezierCurveTo(w - t, 0.59, w - t + 0.01, 0.64, w - t + 0.01, 0.7)
            h.bezierCurveTo(w - t + 0.01, 0.76, w - t, 0.81, 0.35, 0.81)
            h.lineTo(t, 0.81)
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w }
        }
        case 'SB_T': {
            const w = 0.64
            const t = 0.21
            const stemW = 0.22
            const sx = (w - stemW) * 0.5
            s.moveTo(sx, 0)
            s.lineTo(sx + stemW, 0)
            s.lineTo(sx + stemW, 1.0 - t)
            s.lineTo(w, 1.0 - t)
            s.lineTo(w, 1.0)
            s.lineTo(0, 1.0)
            s.lineTo(0, 1.0 - t)
            s.lineTo(sx, 1.0 - t)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'SB_E': {
            const w = 0.6
            const t = 0.21
            s.moveTo(0, 0)
            s.lineTo(w, 0)
            s.lineTo(w, t)
            s.lineTo(t, t)
            s.lineTo(t, 0.4)
            s.lineTo(w - 0.06, 0.4)
            s.lineTo(w - 0.06, 0.6)
            s.lineTo(t, 0.6)
            s.lineTo(t, 1.0 - t)
            s.lineTo(w, 1.0 - t)
            s.lineTo(w, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            return { shapes: [s], w }
        }
        case 'SB_D': {
            const w = 0.68
            const t = 0.22
            s.moveTo(0, 0)
            s.lineTo(0.34, 0)
            s.bezierCurveTo(w * 0.88, 0, w, 0.18, w, 0.5)
            s.bezierCurveTo(w, 0.82, w * 0.88, 1.0, 0.34, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            const h = new THREE.Path()
            h.moveTo(t, 0.2)
            h.lineTo(0.32, 0.2)
            h.bezierCurveTo(w - t - 0.01, 0.2, w - t, 0.3, w - t, 0.5)
            h.bezierCurveTo(w - t, 0.7, w - t - 0.01, 0.8, 0.32, 0.8)
            h.lineTo(t, 0.8)
            h.closePath()
            s.holes.push(h)
            return { shapes: [s], w }
        }
        case 'SB_B': {
            const w = 0.66
            const t = 0.21
            s.moveTo(0, 0)
            s.lineTo(0.38, 0)
            s.bezierCurveTo(w * 0.92, 0, w, 0.12, w, 0.28)
            s.bezierCurveTo(w, 0.42, 0.56, 0.49, 0.48, 0.52)
            s.bezierCurveTo(0.56, 0.55, w - 0.03, 0.62, w - 0.03, 0.75)
            s.bezierCurveTo(w - 0.03, 0.9, 0.54, 1.0, 0.36, 1.0)
            s.lineTo(0, 1.0)
            s.closePath()
            const h1 = new THREE.Path()
            h1.moveTo(t, 0.19)
            h1.lineTo(0.35, 0.19)
            h1.bezierCurveTo(w - t, 0.19, w - t + 0.01, 0.23, w - t + 0.01, 0.3)
            h1.bezierCurveTo(w - t + 0.01, 0.37, w - t, 0.41, 0.35, 0.41)
            h1.lineTo(t, 0.41)
            h1.closePath()
            const h2 = new THREE.Path()
            h2.moveTo(t, 0.59)
            h2.lineTo(0.33, 0.59)
            h2.bezierCurveTo(w - t - 0.03, 0.59, w - t - 0.02, 0.64, w - t - 0.02, 0.7)
            h2.bezierCurveTo(w - t - 0.02, 0.76, w - t - 0.03, 0.81, 0.33, 0.81)
            h2.lineTo(t, 0.81)
            h2.closePath()
            s.holes.push(h1, h2)
            return { shapes: [s], w }
        }
        case 'SB_Y': {
            const w = 0.66
            const t = 0.22
            const cx = w * 0.5
            s.moveTo(cx - t * 0.5, 0)
            s.lineTo(cx + t * 0.5, 0)
            s.lineTo(cx + t * 0.5, 0.42)
            s.lineTo(w, 1.0)
            s.lineTo(w - t - 0.02, 1.0)
            s.lineTo(cx, 0.58)
            s.lineTo(t + 0.02, 1.0)
            s.lineTo(0, 1.0)
            s.lineTo(cx - t * 0.5, 0.42)
            s.closePath()
            return { shapes: [s], w }
        }
        default:
            return { shapes: [makeFallbackRect(0.4, 1.0)], w: 0.4 }
    }
}

export function createPlaqueLetterMaterials() {
    return {
        darkFrontMat: new THREE.MeshStandardMaterial({ color: 0x2f3138, roughness: 0.42, metalness: 0.08 }),
        whiteSideMat: new THREE.MeshStandardMaterial({ color: 0xf4f2ed, roughness: 0.48, metalness: 0.02 }),
        itsBlueFrontMat: new THREE.MeshStandardMaterial({ color: 0x0568d8, roughness: 0.32, metalness: 0.08 }),
        itsLightSideMat: new THREE.MeshStandardMaterial({ color: 0xcbe0f5, roughness: 0.42, metalness: 0.04 })
    }
}

export function add3DTextTokens(
    targetGroup,
    tokens,
    startX,
    startY,
    startZ,
    scaleX,
    scaleY,
    gap,
    mats,
    extrudeDepth = 0.042,
    skew = 0
) {
    let cx = startX
    const shearMat = skew !== 0
        ? new THREE.Matrix4().set(
            1, skew, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        )
        : null
    for (const tok of tokens) {
        if (tok === ' ') {
            cx += 0.38 * scaleX
            continue
        }
        const { shapes, w } = makePlaqueGlyph(tok)
        for (const sh of shapes) {
            const g = new THREE.ExtrudeGeometry(sh, {
                depth: extrudeDepth / scaleY,
                bevelEnabled: true,
                bevelThickness: 0.005 / scaleY,
                bevelSize: 0.004 / scaleY,
                bevelSegments: 2,
                curveSegments: 16
            })
            if (shearMat) g.applyMatrix4(shearMat)
            const m = new THREE.Mesh(g, mats)
            m.scale.set(scaleX, scaleY, scaleY)
            m.position.set(cx, startY, startZ)
            m.castShadow = true
            m.receiveShadow = true
            targetGroup.add(m)
        }
        cx += w * scaleX + gap
    }
}
