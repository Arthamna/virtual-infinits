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
    const cutoutTex = createLeafCutoutTexture()

    const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1b1c1e,
        roughness: 0.55,
        metalness: 0.6,
        emissive: 0xffc77a,
        emissiveMap: cutoutTex,
        emissiveIntensity: 1
    })
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.55, metalness: 0.6 })
    const baseMat = new THREE.MeshStandardMaterial({ map: createConcreteTexture(1, 1), color: 0x9a9a98, roughness: 0.95 })

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

    const bodyH = 1.8
    const bodyW = 0.24
    const body = new THREE.InstancedMesh(
        new THREE.BoxGeometry(bodyW, bodyH, bodyW),
        [panelMat, panelMat, capMat, capMat, panelMat, panelMat],
        spots.length
    )
    const base = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), baseMat, spots.length)
    const d = new THREE.Object3D()
    spots.forEach(({ x, z, yaw }, i) => {
        d.rotation.set(0, yaw, 0)
        d.position.set(x, 0.01, z)
        d.updateMatrix()
        base.setMatrixAt(i, d.matrix)
        d.position.set(x, 0.06 + bodyH / 2, z)
        d.updateMatrix()
        body.setMatrixAt(i, d.matrix)
    })
    body.castShadow = true
    body.receiveShadow = true
    base.receiveShadow = true
    group.add(base, body)

    return {
        group,
        positions: spots,
        setGlow(v) {
            panelMat.emissiveIntensity = v
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
