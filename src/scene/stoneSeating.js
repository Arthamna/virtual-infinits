import * as THREE from 'three'

/**
 * Cast-concrete picnic sets on the lawn between the plaza and the lake: chunky U-shaped tables and cube stools,
 * each capped with a dark glazed tile, standing on a red herringbone brick pad with a grey brick band and a thin
 * concrete edge (like the real ones in front of the plaza steps).
 *
 * Every piece is plain box geometry; layouts are in pad-local metres (x along the plaza edge, -z toward the lake).
 */

const TABLE = { length: 1.5, depth: 0.75, height: 0.75, legW: 0.2, topT: 0.14 }
const STOOL = { size: 0.42, height: 0.45 }
const CAP_T = 0.02 // dark tile cap on every top
const BAND_W = 0.4 // grey brick band around the pad
const EDGE_W = 0.08 // concrete edging between the band and the grass
const PAD_H = 0.05

// Two tables like the photo (seen from the lake, so the photo's left is +x here): the left one with two stools at its far end and one past the other end, the right one
// with two stools on the lake side and one at its end
const DEFAULT_LAYOUT = {
    padSize: [7.4, 3.4],
    tables: [
        { x: 1.55, z: 0.35 },
        { x: -1.55, z: -0.05 }
    ],
    stools: [
        { x: 2.62, z: 0.2, yaw: -0.06 },
        { x: 3.2, z: 0.62, yaw: 0.05 },
        { x: 0.5, z: 0.62, yaw: -0.04 },
        { x: -0.95, z: -0.72, yaw: 0.07 },
        { x: -1.62, z: -0.95, yaw: -0.03 },
        { x: -2.62, z: 0.05, yaw: -0.05 }
    ]
}

function createMottledConcreteTexture() {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#b4b3ae'
    ctx.fillRect(0, 0, size, size)
    let seed = 1337
    const rand = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
    }
    // soft trowel blotches, then fine speckle
    for (let i = 0; i < 70; i++) {
        const x = rand() * size
        const y = rand() * size
        const r = 10 + rand() * 38
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const dark = rand() < 0.55
        g.addColorStop(0, dark ? 'rgba(70,70,66,0.22)' : 'rgba(235,235,230,0.2)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(60,60,56,0.18)' : 'rgba(255,255,250,0.16)'
        ctx.fillRect(rand() * size, rand() * size, 1, 1)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

// red 90° herringbone (bricks 20 x 10 cm) with the odd grey brick mixed in; the canvas is 1.6 m square.
// In brick-width units the pattern is staircases: step n has a flat brick at (n, n) and an upright one at
// (n + 2, n - 1); staircases repeat every 4 units in x, so the whole thing tiles every 4 units (16 per canvas)
function createHerringboneTexture() {
    const W = 20 // px per 10 cm
    const cells = 16
    const size = cells * W
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#5b4a45' // joints
    ctx.fillRect(0, 0, size, size)
    let seed = 4242
    const rand = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
    }
    const brick = (cx, cy, cw, ch) => {
        const grey = rand() < 0.1
        const base = new THREE.Color(grey ? 0x8d8a86 : 0x9a5049)
        base.offsetHSL(0, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.09)
        ctx.fillStyle = `#${base.getHexString()}`
        const x0 = (((cx % cells) + cells) % cells) * W
        const y0 = (((cy % cells) + cells) % cells) * W
        // draw wrapped copies so bricks crossing the canvas edge tile seamlessly
        for (const ox of [0, -size]) {
            for (const oy of [0, -size]) ctx.fillRect(x0 + ox + 1, y0 + oy + 1, cw * W - 2, ch * W - 2)
        }
    }
    for (let s = 0; s < cells / 4; s++) {
        for (let n = 0; n < cells; n++) {
            brick(n + 4 * s, n, 2, 1)
            brick(n + 2 + 4 * s, n - 1, 1, 2)
        }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return tex
}

// grey bricks laid lengthwise along the band, four 10 cm courses in running bond (1 m x 0.4 m tile)
function createBandTexture() {
    const ppm = 100
    const canvas = document.createElement('canvas')
    canvas.width = ppm
    canvas.height = BAND_W * ppm
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#55524f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    let seed = 99
    const rand = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
    }
    const L = 0.2 * ppm
    const W = 0.1 * ppm
    for (let row = 0; row < BAND_W / 0.1; row++) {
        for (let i = -1; i < canvas.width / L + 1; i++) {
            const c = new THREE.Color(0x8f8c88)
            c.offsetHSL(0, 0, (rand() - 0.5) * 0.1)
            ctx.fillStyle = `#${c.getHexString()}`
            ctx.fillRect(i * L + (row % 2) * (L / 2) + 1, row * W + 1, L - 2, W - 2)
        }
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
}

// flat box with world-scale UVs on its top face (so brick textures keep their size whatever the box size)
function flatBox(w, d, h, mat, uvScaleX = 1, uvScaleZ = 1) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / uvScaleX, (pos.getZ(i) + d / 2) / uvScaleZ)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = h / 2
    mesh.receiveShadow = true
    return mesh
}

// concrete box with UVs scaled to its size (about 1 texture tile per metre on every face)
function concreteBox(w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const uv = geo.attributes.uv
    const normal = geo.attributes.normal
    for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(normal.getX(i))
        const ny = Math.abs(normal.getY(i))
        const sx = nx > 0.5 ? d : w
        const sy = ny > 0.5 ? d : h
        uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy)
    }
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
}

function buildTable(mats) {
    const { length, depth, height, legW, topT } = TABLE
    const g = new THREE.Group()
    const legH = height - topT
    for (const s of [-1, 1]) {
        const leg = concreteBox(legW, legH, depth, mats.concrete)
        leg.position.set(s * (length / 2 - legW / 2), legH / 2, 0)
        g.add(leg)
    }
    const top = concreteBox(length, topT, depth, mats.concrete)
    top.position.y = legH + topT / 2
    g.add(top)
    const cap = concreteBox(length - 0.02, CAP_T, depth - 0.02, mats.tile)
    cap.position.y = height + CAP_T / 2
    g.add(cap)
    return g
}

function buildStool(mats) {
    const { size, height } = STOOL
    const g = new THREE.Group()
    const body = concreteBox(size, height, size, mats.concrete)
    body.position.y = height / 2
    g.add(body)
    const cap = concreteBox(size - 0.01, CAP_T, size - 0.01, mats.tile)
    cap.position.y = height + CAP_T / 2
    g.add(cap)
    return g
}

/**
 * @param {Array<{x:number, z:number, yaw?:number, layout?:object}>} sets pad centres in park coordinates
 */
export function createStoneSeating(sets) {
    const group = new THREE.Group()
    const furniture = new THREE.Group() // tables + stools (walk obstacles)
    const pads = new THREE.Group() // walkable paving
    group.add(pads, furniture)

    const concreteTex = createMottledConcreteTexture()
    const mats = {
        concrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9, metalness: 0.02 }),
        tile: new THREE.MeshStandardMaterial({ color: 0x34373a, roughness: 0.22, metalness: 0.05 }),
        herringbone: new THREE.MeshStandardMaterial({ map: createHerringboneTexture(), roughness: 0.86, metalness: 0.02 }),
        band: new THREE.MeshStandardMaterial({ map: createBandTexture(), roughness: 0.88, metalness: 0.02 }),
        edge: new THREE.MeshStandardMaterial({ color: 0xc9c7c1, roughness: 0.9, metalness: 0.02 })
    }

    const footprints = []

    for (const set of sets) {
        const layout = set.layout ?? DEFAULT_LAYOUT
        const yaw = set.yaw ?? 0
        const [pw, pd] = layout.padSize

        const pad = new THREE.Group()
        pad.position.set(set.x, 0, set.z)
        pad.rotation.y = yaw
        pads.add(pad)

        // concrete edge, then the grey band (four strips with bricks running along each side), then the herringbone
        const outerW = pw + 2 * EDGE_W
        const outerD = pd + 2 * EDGE_W
        const edge = flatBox(outerW, outerD, PAD_H - 0.01, mats.edge)
        pad.add(edge)
        const bandH = PAD_H
        const strips = [
            [pw, BAND_W, 0, -(pd - BAND_W) / 2, false],
            [pw, BAND_W, 0, (pd - BAND_W) / 2, false],
            [BAND_W, pd - 2 * BAND_W, -(pw - BAND_W) / 2, 0, true],
            [BAND_W, pd - 2 * BAND_W, (pw - BAND_W) / 2, 0, true]
        ]
        for (const [w, d, x, z, side] of strips) {
            // the band texture is 1 m along the bricks x 0.4 m across; side strips swap axes by rotating the box
            const strip = side ? flatBox(d, w, bandH, mats.band, 1, BAND_W) : flatBox(w, d, bandH, mats.band, 1, BAND_W)
            strip.position.x = x
            strip.position.z = z
            if (side) strip.rotation.y = Math.PI / 2
            pad.add(strip)
        }
        const inner = flatBox(pw - 2 * BAND_W, pd - 2 * BAND_W, bandH, mats.herringbone, 1.6, 1.6)
        inner.position.y += 0.002 // clear of the band joints
        pad.add(inner)

        const setFurniture = new THREE.Group()
        setFurniture.position.copy(pad.position)
        setFurniture.rotation.y = yaw
        furniture.add(setFurniture)
        const place = (obj, x, z, objYaw = 0) => {
            obj.position.set(x, PAD_H, z)
            obj.rotation.y = objYaw
            setFurniture.add(obj)
        }
        for (const t of layout.tables) place(buildTable(mats), t.x, t.z, t.yaw ?? 0)
        for (const s of layout.stools) place(buildStool(mats), s.x, s.z, s.yaw ?? 0)

        footprints.push({ x: set.x, z: set.z, cos: Math.cos(yaw), sin: Math.sin(yaw), hx: outerW / 2, hz: outerD / 2 })
    }

    // pad footprint test in park (x, z); margin grows it (e.g. to keep tree canopies off the tables)
    const isBlocked = (x, z, margin = 0.1) => {
        for (const f of footprints) {
            const dx = x - f.x
            const dz = z - f.z
            const lx = dx * f.cos - dz * f.sin
            const lz = dx * f.sin + dz * f.cos
            if (Math.abs(lx) < f.hx + margin && Math.abs(lz) < f.hz + margin) return true
        }
        return false
    }

    return { group, pads, furniture, isBlocked }
}
