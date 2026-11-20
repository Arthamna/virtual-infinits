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

export function createPavingTexture(repeatX = 18, repeatY = 6, grey = false) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = grey ? '#55575a' : '#5a554c'
    ctx.fillRect(0, 0, 512, 512)

    const rows = 8
    const cols = 4
    const brickW = 512 / cols
    const brickH = 512 / rows

    for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (brickW * 0.5)
        for (let c = -1; c <= cols; c++) {
            const x = c * brickW + offset
            const y = r * brickH
            const shade = 110 + ((r * 13 + c * 29) % 24)
            ctx.fillStyle = grey ? `rgb(${shade}, ${shade + 1}, ${shade + 3})` : `rgb(${shade + 4}, ${shade}, ${shade - 8})`
            ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6)

            ctx.fillStyle = 'rgba(0,0,0,0.06)'
            ctx.fillRect(x + 6, y + 6, brickW - 12, 4)
        }
    }

    // Fine stone grain + organic weathering patches so paving blocks don't look flat
    let pSeed = grey ? 109 : 211
    const pRand = () => {
        pSeed = (pSeed * 1664525 + 1013904223) >>> 0
        return pSeed / 4294967296
    }
    for (let i = 0; i < 3200; i++) {
        const gx = pRand() * 512
        const gy = pRand() * 512
        const v = Math.floor(85 + pRand() * 90)
        ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.12)`
        ctx.fillRect(gx, gy, 1.5, 1.5)
    }
    for (let i = 0; i < 45; i++) {
        const sx = pRand() * 512
        const sy = pRand() * 512
        const sr = 24 + pRand() * 55
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr)
        const tint = pRand() > 0.35 ? '38, 42, 36' : '72, 66, 54'
        g.addColorStop(0, `rgba(${tint}, 0.14)`)
        g.addColorStop(1, `rgba(${tint}, 0)`)
        ctx.fillStyle = g
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
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#56852c'
    ctx.fillRect(0, 0, size, size)

    let seed = 42
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    // soft large-scale tone patches (wear, moisture) so the lawn is not a flat colour
    for (let i = 0; i < 260; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 20 + rand() * 50
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const c = rand() > 0.5 ? '112, 150, 52' : '58, 96, 30'
        g.addColorStop(0, `rgba(${c}, 0.16)`)
        g.addColorStop(1, `rgba(${c}, 0)`)
        ctx.fillStyle = g
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    // fine short blade strokes
    ctx.lineWidth = 1
    const strokeCols = ['rgba(128, 168, 62, 0.45)', 'rgba(96, 140, 46, 0.45)', 'rgba(52, 86, 26, 0.45)', 'rgba(150, 170, 80, 0.3)']
    for (let i = 0; i < 26000; i++) {
        const x = rand() * size
        const y = rand() * size
        const h = 2 + rand() * 4
        const lean = (rand() - 0.5) * 2.5
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
    const size = 256
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

    for (let y = 0; y < size; y++) {
        const row = Math.floor(y / cellH)
        const yIn = (y % cellH) / cellH
        const offset = row % 2 === 1 ? cellW * 0.5 : 0
        for (let x = 0; x < size; x++) {
            const xOff = (x + offset) % size
            const xIn = (xOff % cellW) / cellW
            const groove = xIn < 0.06 || xIn > 0.94 || yIn < 0.06 || yIn > 0.94
            h[y * size + x] = groove ? 0.15 : 0.78 + (rand() - 0.5) * 0.16
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

