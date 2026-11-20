import * as THREE from 'three'

let maxTextureAnisotropy = 8

export function setMaxTextureAnisotropy(maxAnisotropy) {
    maxTextureAnisotropy = Math.max(1, maxAnisotropy || 1)
}

export function configureTexture(texture, { isColor = true, repeat = false, repeatX = 1, repeatY = 1 } = {}) {
    if (repeat) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(repeatX, repeatY)
    }
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = maxTextureAnisotropy
    texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.needsUpdate = true
    return texture
}

function configureRepeatTexture(texture, repeatX, repeatY, isColor = true) {
    return configureTexture(texture, { isColor, repeat: true, repeatX, repeatY })
}

// Shared interlocking "paving cacing" (S-wave Uni-Paver) cell evaluation so albedo and PBR maps align pixel-for-pixel
function evalUniPaverPixel(x, y, size, cols, rows) {
    const cellW = size / cols
    const cellH = size / rows
    const phase = (x / cellW) * Math.PI * 2
    // Rounded zig-zag wave for the iconic interlocking paving cacing silhouette
    const wave = cellH * 0.25 * (0.86 * Math.sin(phase) + 0.14 * Math.sin(3 * phase))
    const yShifted = ((y - wave) % size + size) % size
    const row = Math.floor(yShifted / cellH)
    const yIn = (yShifted % cellH) / cellH

    const rowOffset = (row % 2) * (cellW * 0.5)
    const xShifted = ((x + rowOffset) % size + size) % size
    const col = Math.floor(xShifted / cellW)
    const xIn = (xShifted % cellW) / cellW

    // Distance to nearest joint (normalized in pixels)
    const distY = Math.min(yIn, 1 - yIn) * cellH
    const distX = Math.min(xIn, 1 - xIn) * cellW
    const distJoint = Math.min(distX, distY)

    return { row, col, distJoint }
}

export function createPavingTexture(repeatX = 18, repeatY = 6, grey = false) {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(size, size)
    const data = img.data

    const cols = 4
    const rows = 8
    const groovePx = 2.4
    const chamferPx = 6.2

    let seed = grey ? 109 : 211
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    // Deterministic per-pixel hash for porous concrete aggregate grain
    const hash2 = (x, y) => {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
        return n - Math.floor(n)
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const { row, col, distJoint } = evalUniPaverPixel(x, y, size, cols, rows)
            const brickId = (row * 17 + col * 31) & 255
            const brickVar = ((brickId * 53) % 24) - 12

            // Organic random mix of terracotta-red and weathered-grey pavers (no symmetrical stripes)
            const isRed = !grey && hash2(col * 3.17 + 7.1, row * 5.73 + 11.3) < 0.47
            let r, g, b

            if (distJoint <= groovePx) {
                // Deep dark sandy/mossy joint between pavers
                const gNoise = (hash2(x, y) - 0.5) * 18
                r = 54 + gNoise
                g = 52 + gNoise
                b = 44 + gNoise
            } else {
                // Porous concrete aggregate micro-speckles (salt-and-pepper mineral grain)
                const n1 = hash2(x, y)
                const n2 = hash2(Math.floor(x * 0.5), Math.floor(y * 0.5))
                const speck = (n1 - 0.5) * 26 + (n2 - 0.5) * 16
                const pore = n1 < 0.08 ? -20 : n1 > 0.94 ? 14 : 0

                if (isRed) {
                    // Dusty sun-weathered terracotta red concrete paver
                    r = 168 + brickVar + speck + pore
                    g = 118 + brickVar * 0.72 + speck * 0.85 + pore
                    b = 112 + brickVar * 0.68 + speck * 0.85 + pore
                } else {
                    // Natural weathered light-grey concrete paver
                    r = 166 + brickVar + speck + pore
                    g = 168 + brickVar + speck + pore
                    b = 163 + brickVar + speck + pore
                }

                // Chamfered edge darkening & slight highlight near the joint rim
                if (distJoint < chamferPx) {
                    const bevelT = (distJoint - groovePx) / (chamferPx - groovePx)
                    const bevelShade = 0.64 + 0.36 * bevelT
                    r *= bevelShade
                    g *= bevelShade
                    b *= bevelShade
                }
            }

            const idx = (y * size + x) * 4
            data[idx] = Math.max(0, Math.min(255, r))
            data[idx + 1] = Math.max(0, Math.min(255, g))
            data[idx + 2] = Math.max(0, Math.min(255, b))
            data[idx + 3] = 255
        }
    }
    ctx.putImageData(img, 0, 0)

    // Subtle organic weathering & damp soil stains across tiles
    for (let i = 0; i < 42; i++) {
        const sx = rand() * size
        const sy = rand() * size
        const sr = 28 + rand() * 64
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        const tint = rand() > 0.4 ? '44, 42, 34' : '82, 74, 62'
        grad.addColorStop(0, `rgba(${tint}, 0.13)`)
        grad.addColorStop(1, `rgba(${tint}, 0)`)
        ctx.fillStyle = grad
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2)
    }

    return configureRepeatTexture(new THREE.CanvasTexture(canvas), repeatX, repeatY)
}

export function createBrickPlazaTexture(repeatX = 12, repeatY = 6) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#5c2c22'
    ctx.fillRect(0, 0, 512, 512)

    const rows = 12
    const cols = 6
    const w = 512 / cols
    const h = 512 / rows

    for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (w * 0.5)
        for (let c = -1; c <= cols; c++) {
            const x = c * w + offset
            const y = r * h
            const red = 154 + ((r * 11 + c * 19) % 28)
            ctx.fillStyle = `rgb(${red}, ${Math.floor(red * 0.34)}, ${Math.floor(red * 0.27)})`
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4)
        }
    }

    let bSeed = 317
    const bRand = () => {
        bSeed = (bSeed * 1664525 + 1013904223) >>> 0
        return bSeed / 4294967296
    }
    for (let i = 0; i < 2400; i++) {
        const gx = bRand() * 512
        const gy = bRand() * 512
        const v = Math.floor(60 + bRand() * 110)
        ctx.fillStyle = `rgba(${v}, ${Math.floor(v * 0.5)}, ${Math.floor(v * 0.4)}, 0.12)`
        ctx.fillRect(gx, gy, 1.5, 1.5)
    }
    for (let i = 0; i < 30; i++) {
        const sx = bRand() * 512
        const sy = bRand() * 512
        const sr = 20 + bRand() * 48
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        g.addColorStop(0, 'rgba(42, 22, 18, 0.14)')
        g.addColorStop(1, 'rgba(42, 22, 18, 0)')
        ctx.fillStyle = g
        ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2)
    }

    return configureRepeatTexture(new THREE.CanvasTexture(canvas), repeatX, repeatY)
}

export function createConcreteTexture(repeatX = 4, repeatY = 2) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#7c7b74'
    ctx.fillRect(0, 0, 256, 256)

    for (let i = 0; i < 2400; i++) {
        const x = (i * 73) % 256
        const y = (i * 137) % 256
        const alpha = (i % 5) * 0.015
        ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
        ctx.fillRect(x, y, 3, 3)
    }

    return configureRepeatTexture(new THREE.CanvasTexture(canvas), repeatX, repeatY)
}


export function createWaterNormalTexture() {
    const size = 512
    const data = new Uint8Array(size * size * 4)

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = (x / size) * Math.PI * 2
            const v = (y / size) * Math.PI * 2

            const p1 = u * 2.0 + v * 1.0
            const p2 = u * 3.0 - v * 2.0
            const p3 = u * 5.0 + v * 4.0
            const p4 = u * 8.0 - v * 7.0
            const p5 = u * 13.0 + v * 11.0

            const dx =
                Math.cos(p1 + Math.sin(p2) * 0.45) * 0.28 +
                Math.cos(p2 + Math.sin(p1) * 0.35) * 0.22 +
                Math.sin(p3) * 0.14 +
                Math.cos(p4) * 0.09 +
                Math.sin(p5) * 0.05
            const dy =
                Math.sin(p1 + Math.cos(p2) * 0.45) * 0.28 -
                Math.sin(p2 - Math.cos(p1) * 0.35) * 0.22 +
                Math.cos(p3) * 0.14 -
                Math.sin(p4) * 0.09 +
                Math.cos(p5) * 0.05

            const nx = Math.max(-1, Math.min(1, dx))
            const ny = Math.max(-1, Math.min(1, dy))
            const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny))

            const idx = (y * size + x) * 4
            data[idx] = Math.floor((nx * 0.5 + 0.5) * 255)
            data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255)
            data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255)
            data[idx + 3] = 255
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    return configureTexture(texture, { isColor: false, repeat: true })
}

function drawTeknoSainsContent(ctx, width, height, isBump = false) {
    if (isBump) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        grad.addColorStop(0, '#eef0f2')
        grad.addColorStop(0.5, '#e2e5e8')
        grad.addColorStop(1, '#cfd4da')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
    }

    const setupShadow = () => {
        if (!isBump) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 4
            ctx.shadowOffsetY = 6
        }
    }

    const clearShadow = () => {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
    }

    setupShadow()
    ctx.fillStyle = isBump ? '#ffffff' : '#25292e'
    ctx.font = 'bold 74px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('SUPPORTED BY', 260, 635)
    clearShadow()

    ctx.save()
    ctx.translate(1150, 268)
    ctx.transform(1, 0, -0.09, 1, 0, 0)
    setupShadow()
    ctx.fillStyle = isBump ? '#ffffff' : '#0568d8'

    ctx.fillRect(0, -156, 39, 156)
    ctx.save()
    ctx.fillStyle = isBump ? '#000000' : '#f2f0ea'
    ctx.beginPath()
    ctx.moveTo(8, -112)
    ctx.lineTo(34, -147)
    ctx.lineTo(28, -112)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.beginPath()
    ctx.moveTo(74, 0)
    ctx.lineTo(85, 0)
    ctx.quadraticCurveTo(113, -3, 113, -39)
    ctx.lineTo(113, -115)
    ctx.lineTo(148, -115)
    ctx.lineTo(148, -156)
    ctx.lineTo(56, -156)
    ctx.lineTo(44, -115)
    ctx.lineTo(74, -115)
    ctx.closePath()
    ctx.fill()

    ctx.translate(160, 0)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(56, 0)
    ctx.quadraticCurveTo(100, 0, 100, -47)
    ctx.quadraticCurveTo(100, -92, 55, -95)
    ctx.lineTo(45, -97)
    ctx.quadraticCurveTo(36, -98, 36, -109)
    ctx.quadraticCurveTo(36, -122, 48, -122)
    ctx.lineTo(66, -122)
    ctx.quadraticCurveTo(91, -122, 103, -150)
    ctx.quadraticCurveTo(105, -156, 95, -156)
    ctx.lineTo(44, -156)
    ctx.quadraticCurveTo(3, -156, 3, -111)
    ctx.quadraticCurveTo(3, -66, 45, -62)
    ctx.lineTo(56, -61)
    ctx.quadraticCurveTo(66, -59, 66, -47)
    ctx.quadraticCurveTo(66, -34, 53, -34)
    ctx.lineTo(34, -34)
    ctx.quadraticCurveTo(12, -34, 0, -6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    clearShadow()

    ctx.save()
    ctx.translate(1125, 445)
    ctx.transform(1, 0, -0.18, 1, 0, 0)
    setupShadow()
    ctx.fillStyle = isBump ? '#ffffff' : '#282c32'
    ctx.font = '900 132px Arial, Helvetica, sans-serif'
    ctx.fillText('TEKNO', 0, 0)
    ctx.restore()
    clearShadow()

    ctx.save()
    ctx.translate(1070, 598)
    ctx.transform(1, 0, -0.18, 1, 0, 0)
    setupShadow()
    ctx.fillStyle = isBump ? '#ffffff' : '#282c32'
    ctx.font = '900 132px Arial, Helvetica, sans-serif'
    ctx.fillText('S', 0, 0)

    ctx.beginPath()
    ctx.moveTo(96, 0)
    ctx.lineTo(138, -96)
    ctx.lineTo(164, -96)
    ctx.lineTo(206, 0)
    ctx.lineTo(178, 0)
    ctx.lineTo(151, -66)
    ctx.lineTo(124, 0)
    ctx.closePath()
    ctx.fill()

    ctx.fillText('INS', 216, 0)
    ctx.restore()
    clearShadow()
}

export function createTeknoSainsTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 768
    const ctx = canvas.getContext('2d')
    drawTeknoSainsContent(ctx, canvas.width, canvas.height, false)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    return texture
}

export function createTeknoSainsBumpTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 768
    const ctx = canvas.getContext('2d')
    drawTeknoSainsContent(ctx, canvas.width, canvas.height, true)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 16
    return texture
}

export function createGrassTexture() {
    const size = 1024
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Rich earthy base under the turf instead of flat green
    ctx.fillStyle = '#4e6b2c'
    ctx.fillRect(0, 0, size, size)

    let seed = 42
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    // Helper for tileable wrap-around drawing across edges
    const drawWrapped = (x, y, r, fn) => {
        for (const ox of [-size, 0, size]) {
            if (x + ox + r < 0 || x + ox - r > size) continue
            for (const oy of [-size, 0, size]) {
                if (y + oy + r < 0 || y + oy - r > size) continue
                fn(x + ox, y + oy)
            }
        }
    }

    // 1. Organic large-scale patches: damp earth, sandy soil, dry straw/thatch, and lush turf
    const patchPalette = [
        { rgb: '104, 82, 54', alpha: 0.34 }, // brown loam soil
        { rgb: '132, 108, 74', alpha: 0.26 }, // sandy dry earth
        { rgb: '68, 54, 36', alpha: 0.28 },   // damp dark humus
        { rgb: '142, 134, 68', alpha: 0.24 }, // sun-baked dry grass/thatch
        { rgb: '74, 114, 38', alpha: 0.24 },  // mid park grass
        { rgb: '48, 82, 26', alpha: 0.26 }    // shaded mossy green
    ]
    for (let i = 0; i < 320; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 32 + rand() * 88
        const pick = patchPalette[Math.floor(rand() * patchPalette.length)]
        drawWrapped(x, y, r, (px, py) => {
            const g = ctx.createRadialGradient(px, py, 0, px, py, r)
            g.addColorStop(0, `rgba(${pick.rgb}, ${pick.alpha})`)
            g.addColorStop(1, `rgba(${pick.rgb}, 0)`)
            ctx.fillStyle = g
            ctx.fillRect(px - r, py - r, r * 2, r * 2)
        })
    }

    // 2. Micro dirt grit & soil grain
    for (let i = 0; i < 14000; i++) {
        const x = rand() * size
        const y = rand() * size
        const w = 1 + rand() * 2.2
        ctx.fillStyle = rand() > 0.45 ? 'rgba(62, 48, 32, 0.32)' : 'rgba(148, 126, 92, 0.26)'
        ctx.fillRect(x, y, w, w)
    }

    // 3. Small scattered pebbles & tiny stones with subtle shadow
    const pebbleColors = ['#8a867c', '#6e6a61', '#a0988a', '#5a5850', '#968a76']
    for (let i = 0; i < 480; i++) {
        const x = rand() * size
        const y = rand() * size
        const rx = 1.6 + rand() * 3.4
        const ry = rx * (0.55 + rand() * 0.45)
        const ang = rand() * Math.PI
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang)
        ctx.fillStyle = 'rgba(28, 24, 18, 0.38)'
        ctx.beginPath()
        ctx.ellipse(0.9, 1.1, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = pebbleColors[Math.floor(rand() * pebbleColors.length)]
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    // 4. Dry fallen leaf flecks & tiny twigs
    const leafColors = ['rgba(146, 108, 52, 0.55)', 'rgba(116, 82, 42, 0.55)', 'rgba(168, 138, 66, 0.48)']
    for (let i = 0; i < 650; i++) {
        const x = rand() * size
        const y = rand() * size
        const rx = 2.2 + rand() * 4.0
        const ry = rx * 0.42
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rand() * Math.PI)
        ctx.fillStyle = leafColors[Math.floor(rand() * leafColors.length)]
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    // 5. Layered grass & dry straw strokes for crisp close-up detail in First-Person View
    ctx.lineWidth = 1.1
    const strokeCols = [
        'rgba(114, 150, 56, 0.46)',
        'rgba(86, 126, 42, 0.46)',
        'rgba(52, 82, 26, 0.45)',
        'rgba(156, 144, 74, 0.38)',
        'rgba(124, 102, 60, 0.32)'
    ]
    for (let i = 0; i < 38000; i++) {
        const x = rand() * size
        const y = rand() * size
        const h = 3 + rand() * 6
        const lean = (rand() - 0.5) * 4.0
        ctx.strokeStyle = strokeCols[Math.floor(rand() * strokeCols.length)]
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lean, y - h)
        ctx.stroke()
    }

    return configureTexture(new THREE.CanvasTexture(canvas), { isColor: true, repeat: true })
}

export function createLakeBedTexture() {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#364d34'
    ctx.fillRect(0, 0, size, size)

    let seed = 889
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    // mossy sediment patches
    for (let i = 0; i < 240; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 14 + rand() * 38
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const c = rand() > 0.45 ? '64, 92, 54' : '44, 66, 42'
        g.addColorStop(0, `rgba(${c}, 0.5)`)
        g.addColorStop(1, `rgba(${c}, 0)`)
        ctx.fillStyle = g
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    // submerged pebbles & silt speckles
    for (let i = 0; i < 4000; i++) {
        const x = rand() * size
        const y = rand() * size
        const rx = 1 + rand() * 2.5
        const ry = 0.8 + rand() * 2.0
        const shade = Math.floor(55 + rand() * 55)
        ctx.fillStyle = `rgba(${shade}, ${shade + 12}, ${shade - 4}, 0.45)`
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
    }

    return configureTexture(new THREE.CanvasTexture(canvas), { isColor: true, repeat: true, repeatX: 6, repeatY: 6 })
}

let cachedBrushedMetalTex = null
export function createBrushedMetalTexture() {
    if (cachedBrushedMetalTex) return cachedBrushedMetalTex
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#909090'
    ctx.fillRect(0, 0, size, size)

    let seed = 313
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    for (let i = 0; i < 1800; i++) {
        const y = rand() * size
        const x = rand() * size
        const len = 18 + rand() * 80
        const v = Math.floor(110 + rand() * 85)
        ctx.strokeStyle = `rgba(${v}, ${v}, ${v}, 0.25)`
        ctx.lineWidth = 0.7 + rand() * 0.8
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + len, y)
        ctx.stroke()
    }

    const texture = configureTexture(new THREE.CanvasTexture(canvas), {
        isColor: false,
        repeat: true,
        repeatX: 2,
        repeatY: 2
    })
    cachedBrushedMetalTex = texture
    return texture
}

export function createPavingPBRMaps(repeatX = 5, repeatY = 2, brick = false) {
    const size = 512
    const h = new Float32Array(size * size)
    const rows = brick ? 12 : 8
    const cols = brick ? 6 : 4
    const cellW = size / cols
    const cellH = size / rows
    let seed = brick ? 901 : 404
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const groovePx = 2.4
    const chamferPx = 6.2

    for (let y = 0; y < size; y++) {
        const row = Math.floor(y / cellH)
        const yIn = (y % cellH) / cellH
        const offset = row % 2 === 1 ? cellW * 0.5 : 0
        for (let x = 0; x < size; x++) {
            if (brick) {
                const xOff = (x + offset) % size
                const xIn = (xOff % cellW) / cellW
                const groove = xIn < 0.05 || xIn > 0.95 || yIn < 0.05 || yIn > 0.95
                h[y * size + x] = groove ? 0.15 : 0.78 + (rand() - 0.5) * 0.16
            } else {
                const { distJoint } = evalUniPaverPixel(x, y, size, cols, rows)
                const grain = (rand() - 0.5) * 0.10
                if (distJoint <= groovePx) {
                    h[y * size + x] = 0.08 + grain * 0.35
                } else if (distJoint < chamferPx) {
                    const t = (distJoint - groovePx) / (chamferPx - groovePx)
                    h[y * size + x] = 0.12 + 0.72 * t + grain * 0.6
                } else {
                    h[y * size + x] = 0.84 + grain
                }
            }
        }
    }

    const nrmData = new Uint8Array(size * size * 4)
    const aoData = new Uint8Array(size * size * 4)
    const rghData = new Uint8Array(size * size * 4)
    const sample = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const hL = sample(x - 1, y)
            const hR = sample(x + 1, y)
            const hU = sample(x, y - 1)
            const hD = sample(x, y + 1)
            const hC = sample(x, y)

            const dx = (hL - hR) * 2.4
            const dy = (hU - hD) * 2.4
            const len = Math.hypot(dx, dy, 1)
            const idx = (y * size + x) * 4
            nrmData[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255)
            nrmData[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255)
            nrmData[idx + 2] = Math.floor(((1 / len) * 0.5 + 0.5) * 255)
            nrmData[idx + 3] = 255

            const avg = (hL + hR + hU + hD) * 0.25
            const ao = Math.max(0.35, Math.min(1.0, 0.85 + (hC - avg) * 1.4))
            const aoByte = Math.floor(ao * 255)
            aoData[idx] = aoByte
            aoData[idx + 1] = aoByte
            aoData[idx + 2] = aoByte
            aoData[idx + 3] = 255

            const rgh = Math.max(0.55, Math.min(1.0, 0.9 - hC * 0.18))
            const rghByte = Math.floor(rgh * 255)
            rghData[idx] = rghByte
            rghData[idx + 1] = rghByte
            rghData[idx + 2] = rghByte
            rghData[idx + 3] = 255
        }
    }

    const makeTex = (buf) => {
        const tex = configureTexture(new THREE.DataTexture(buf, size, size, THREE.RGBAFormat), {
            isColor: false,
            repeat: true,
            repeatX,
            repeatY
        })
        tex.channel = 0
        return tex
    }

    return {
        normalMap: makeTex(nrmData),
        aoMap: makeTex(aoData),
        roughnessMap: makeTex(rghData)
    }
}

