import * as THREE from 'three'
import { createGrassTexture } from './textures'

// Background around the park: outer ground, layered tree-line walls.
// The tree line is solid geometry with a bumpy crown silhouette (no alpha cards), so it stays cheap
// and does not confuse the GTAO pass.

function makeRand(seed) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
    }
}

// points evenly spaced along a rounded rectangle grown `grow` metres outside the perimeter road
function ringPoints(b, grow, spacing) {
    const minX = b.pOuterMinX - grow
    const maxX = b.pOuterMaxX + grow
    const minZ = b.pOuterMinZ - grow
    const maxZ = b.pOuterMaxZ + grow
    const r = b.outerCornerR + grow
    const shape = new THREE.Shape()
    shape.moveTo(minX + r, minZ)
    shape.lineTo(maxX - r, minZ)
    shape.quadraticCurveTo(maxX, minZ, maxX, minZ + r)
    shape.lineTo(maxX, maxZ - r)
    shape.quadraticCurveTo(maxX, maxZ, maxX - r, maxZ)
    shape.lineTo(minX + r, maxZ)
    shape.quadraticCurveTo(minX, maxZ, minX, maxZ - r)
    shape.lineTo(minX, minZ + r)
    shape.quadraticCurveTo(minX, minZ, minX + r, minZ)
    const count = Math.round(shape.getLength() / spacing)
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    return shape.getSpacedPoints(count).slice(0, count).map((p, i, arr) => {
        const next = arr[(i + 1) % arr.length]
        const tx = next.x - p.x
        const tz = next.y - p.y
        const len = Math.hypot(tx, tz) || 1
        let nx = -tz / len
        let nz = tx / len
        if (nx * (cx - p.x) + nz * (cz - p.y) < 0) {
            nx = -nx
            nz = -nz
        }
        return { x: p.x, z: p.y, inX: nx, inZ: nz }
    })
}

function createCanopyTexture(seed) {
    const w = 1024
    const h = 512
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    const rand = makeRand(seed)

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#4f7a2e')
    grad.addColorStop(0.6, '#2f4f1f')
    grad.addColorStop(1, '#1c2b14')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // shadowy understory with trunks along the bottom
    ctx.fillStyle = '#18220f'
    ctx.fillRect(0, h * 0.78, w, h * 0.22)
    for (let i = 0; i < 40; i++) {
        const x = rand() * w
        ctx.strokeStyle = rand() > 0.5 ? '#3b332a' : '#4a4238'
        ctx.lineWidth = 3 + rand() * 6
        ctx.beginPath()
        ctx.moveTo(x, h)
        ctx.lineTo(x + (rand() - 0.5) * 30, h * (0.55 + rand() * 0.2))
        ctx.stroke()
    }

    // leaf clumps: lighter toward the top where the sun hits the crowns
    const cols = ['#6f9a3a', '#5f8a32', '#82ad45', '#4b7428', '#3c6122', '#94b850', '#2e4d1b']
    for (let i = 0; i < 9000; i++) {
        const y = Math.pow(rand(), 1.3) * h * 0.85
        const x = rand() * w
        const light = 1 - y / (h * 0.85)
        const idx = Math.min(cols.length - 1, Math.floor((1 - light) * 4 + rand() * 3.5))
        ctx.fillStyle = cols[idx]
        ctx.globalAlpha = 0.55 + rand() * 0.45
        ctx.beginPath()
        ctx.ellipse(x, y, 3 + rand() * 9, 2 + rand() * 6, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.globalAlpha = 1

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.anisotropy = 8
    return tex
}

function createTreeLine(points, { minH, maxH, seed, texture, color }) {
    const rand = makeRand(seed)
    const n = points.length
    // cumulative distance around the ring
    const dist = [0]
    for (let i = 1; i <= n; i++) {
        const a = points[i - 1]
        const b = points[i % n]
        dist.push(dist[i - 1] + Math.hypot(b.x - a.x, b.z - a.z))
    }
    const total = dist[n]

    // crowns: overlapping domes along the ring; height profile = tallest dome at each point
    const crowns = []
    for (let s = 0; s < total; s += 3 + rand() * 5) {
        crowns.push({ c: s, r: 4 + rand() * 6, h: minH + rand() * (maxH - minH) })
    }
    const heightAt = (s) => {
        let hgt = minH * 0.55
        for (const { c, r, h } of crowns) {
            let d = Math.abs(s - c)
            d = Math.min(d, total - d)
            if (d < r) hgt = Math.max(hgt, h * Math.sqrt(1 - (d / r) ** 2))
        }
        // small leafy jitter on the silhouette
        return hgt + Math.sin(s * 2.7) * 0.18 + Math.sin(s * 6.1 + 1.3) * 0.12
    }

    const pos = []
    const nrm = []
    const uv = []
    const idx = []
    for (let i = 0; i <= n; i++) {
        const p = points[i % n]
        const s = dist[i]
        const top = heightAt(s)
        pos.push(p.x, -0.1, p.z, p.x, top, p.z)
        // mostly-up normals so the wall is lit evenly whichever side the sun is on
        const nx = p.inX * 0.45
        const nz = p.inZ * 0.45
        const l = Math.hypot(nx, 1, nz)
        nrm.push(nx / l, 1 / l, nz / l, nx / l, 1 / l, nz / l)
        const u = s / 26
        uv.push(u, 0, u, top / maxH)
        if (i < n) {
            const b = i * 2
            idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
        }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)
    const mat = new THREE.MeshStandardMaterial({
        map: texture,
        color,
        roughness: 0.95,
        side: THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    return mesh
}

export function createBackdrop(perimeterBounds) {
    const group = new THREE.Group()
    const b = perimeterBounds

    // ground beyond the outer road, with a hole so it never overlaps the park (or covers the lake bed)
    const groundShape = new THREE.Shape()
    groundShape.moveTo(-700, -700)
    groundShape.lineTo(700, -700)
    groundShape.lineTo(700, 700)
    groundShape.lineTo(-700, 700)
    groundShape.closePath()
    const hole = new THREE.Path()
    const inset = 0.5
    // shape y = -world z (rotateX(-PI/2) below maps shape y to -z and keeps faces pointing up)
    // rounded like the outer road so no bare patches are left at the corners
    const x0 = b.pOuterMinX + inset
    const x1 = b.pOuterMaxX - inset
    const y0 = -(b.pOuterMaxZ - inset)
    const y1 = -(b.pOuterMinZ + inset)
    const r = b.outerCornerR - inset
    hole.moveTo(x0 + r, y0)
    hole.lineTo(x1 - r, y0)
    hole.quadraticCurveTo(x1, y0, x1, y0 + r)
    hole.lineTo(x1, y1 - r)
    hole.quadraticCurveTo(x1, y1, x1 - r, y1)
    hole.lineTo(x0 + r, y1)
    hole.quadraticCurveTo(x0, y1, x0, y1 - r)
    hole.lineTo(x0, y0 + r)
    hole.quadraticCurveTo(x0, y0, x0 + r, y0)
    groundShape.holes.push(hole)
    const groundGeo = new THREE.ShapeGeometry(groundShape)
    groundGeo.rotateX(-Math.PI / 2)
    const groundTex = createGrassTexture()
    groundTex.repeat.set(0.25, 0.25)
    const ground = new THREE.Mesh(
        groundGeo,
        new THREE.MeshStandardMaterial({ map: groundTex, color: 0xc8d6b8, roughness: 0.95 })
    )
    ground.position.y = -0.05
    ground.receiveShadow = true
    group.add(ground)

    // three tree-line layers, farther ones taller so they peek over the nearer ones
    const layers = [
        { grow: 9, minH: 8, maxH: 14, seed: 11, color: 0xffffff },
        { grow: 24, minH: 11, maxH: 18, seed: 23, color: 0xd8e2cc },
        { grow: 48, minH: 14, maxH: 22, seed: 37, color: 0xb8c6b0 }
    ]
    layers.forEach((l) => {
        group.add(createTreeLine(ringPoints(b, l.grow, 1), { ...l, texture: createCanopyTexture(l.seed) }))
    })

    return { group }
}
