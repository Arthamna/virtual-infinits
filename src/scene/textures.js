import * as THREE from 'three'

function configureRepeatTexture(texture, repeatX, repeatY, isColor = true) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    texture.anisotropy = 8
    if (isColor) {
        texture.colorSpace = THREE.SRGBColorSpace
    }
    return texture
}

export function createPavingTexture(repeatX = 18, repeatY = 6) {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#5a554c'
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
            ctx.fillStyle = `rgb(${shade + 4}, ${shade}, ${shade - 8})`
            ctx.fillRect(x + 3, y + 3, brickW - 6, brickH - 6)

            ctx.fillStyle = 'rgba(0,0,0,0.06)'
            ctx.fillRect(x + 6, y + 6, brickW - 12, 4)
        }
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

export function createBarkTexture(repeatX = 2, repeatY = 4) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#6c5f53'
    ctx.fillRect(0, 0, 256, 512)

    for (let i = 0; i < 180; i++) {
        const x = (i * 47) % 256
        const y = (i * 89) % 512
        const h = 30 + (i % 60)
        const w = 3 + (i % 6)
        ctx.fillStyle = i % 3 === 0 ? 'rgba(42,35,28,0.45)' : 'rgba(135,122,108,0.28)'
        ctx.fillRect(x, y, w, h)
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
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
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
    texture.anisotropy = 8
    return texture
}

export function createTeknoSainsBumpTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 768
    const ctx = canvas.getContext('2d')
    drawTeknoSainsContent(ctx, canvas.width, canvas.height, true)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    return texture
}

function drawTotemWhiteContent(ctx, width, height, isBump = false) {
    if (isBump) {
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        grad.addColorStop(0, '#eef0f2')
        grad.addColorStop(1, '#d8dce0')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, width, height)
    }
}

export function createTotemWhiteTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 1792
    const ctx = canvas.getContext('2d')
    drawTotemWhiteContent(ctx, canvas.width, canvas.height, false)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
}

export function createTotemWhiteBumpTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 1792
    const ctx = canvas.getContext('2d')
    drawTotemWhiteContent(ctx, canvas.width, canvas.height, true)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    return texture
}

export function createTotemBlueTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
    grad.addColorStop(0, '#0a4eb0')
    grad.addColorStop(1, '#073c8a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 3

    ctx.fillStyle = '#f2f5f8'
    ctx.font = 'bold 54px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Jogging Track', 64, 595)
    ctx.fillText('Amphiteather', 64, 700)
    ctx.fillText('Plaza', 64, 805)
    ctx.fillText('Dock', 64, 910)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
}

export function createTotemUrlTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 160
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#084399'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.fillStyle = '#f2f5f8'
    ctx.font = 'bold 34px Arial, Helvetica, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('www.itsteknosains.co.id', 64, 92)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
}

export function createGrassTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#3f682d'
    ctx.fillRect(0, 0, size, size)

    let seed = 42
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    for (let i = 0; i < 450; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 6 + rand() * 14
        ctx.fillStyle = rand() > 0.5 ? 'rgba(82, 130, 52, 0.14)' : 'rgba(38, 68, 25, 0.14)'
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.lineWidth = 1.2
    for (let i = 0; i < 2400; i++) {
        const x = rand() * size
        const y = rand() * size
        const h = 3 + rand() * 6
        const lean = (rand() - 0.5) * 3
        ctx.strokeStyle = rand() > 0.45 ? 'rgba(96, 148, 60, 0.35)' : 'rgba(36, 66, 24, 0.32)'
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + lean, y - h)
        ctx.stroke()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
}

export function createLeafSprigTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)

    let seed = 91
    const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }

    const puffs = [
        [128, 128, 62],
        [82, 92, 48],
        [174, 90, 48],
        [76, 158, 50],
        [178, 156, 50],
        [128, 72, 44],
        [128, 182, 44],
        [62, 124, 42],
        [194, 124, 42]
    ]

    for (let p = 0; p < puffs.length; p++) {
        const [px, py, pr] = puffs[p]
        for (let i = 0; i < 45; i++) {
            const a = rand() * Math.PI * 2
            const r = Math.pow(rand(), 0.65) * pr
            const lx = px + Math.cos(a) * r
            const ly = py + Math.sin(a) * r
            const rw = 8 + rand() * 8
            const rh = 6 + rand() * 6
            ctx.save()
            ctx.translate(lx, ly)
            ctx.rotate(rand() * Math.PI * 2)
            ctx.fillStyle = rand() > 0.5 ? '#0d1f08' : '#142c0d'
            ctx.beginPath()
            ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    }

    const midColors = ['#1c3b13', '#234718', '#2b541e', '#325f23']
    for (let p = 0; p < puffs.length; p++) {
        const [px, py, pr] = puffs[p]
        for (let i = 0; i < 65; i++) {
            const a = rand() * Math.PI * 2
            const r = Math.pow(rand(), 0.7) * (pr * 0.88)
            const lx = px + Math.cos(a) * r
            const ly = py + Math.sin(a) * r
            const rw = 5.5 + rand() * 5.5
            const rh = 4.0 + rand() * 4.5
            ctx.save()
            ctx.translate(lx, ly)
            ctx.rotate(rand() * Math.PI * 2)
            ctx.fillStyle = midColors[Math.floor(rand() * midColors.length)]
            ctx.beginPath()
            ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    }

    const topColors = ['#396927', '#43752d', '#4d8033', '#588b39']
    for (let p = 0; p < puffs.length; p++) {
        const [px, py, pr] = puffs[p]
        for (let i = 0; i < 42; i++) {
            const a = rand() * Math.PI * 2
            const r = Math.pow(rand(), 0.75) * (pr * 0.7)
            const lx = px - 3 + Math.cos(a) * r
            const ly = py - 3 + Math.sin(a) * r
            const rw = 3.8 + rand() * 4.2
            const rh = 2.8 + rand() * 3.2
            ctx.save()
            ctx.translate(lx, ly)
            ctx.rotate(rand() * Math.PI * 2)
            ctx.fillStyle = topColors[Math.floor(rand() * topColors.length)]
            ctx.beginPath()
            ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return texture
}
