import * as THREE from 'three'
import { createGrassTexture } from './textures'

// Background around the park: outer ground.

export function createBackdrop(perimeterBounds) {
    const group = new THREE.Group()
    const b = perimeterBounds

    // ground beyond the outer road extending to the sky/render horizon, with a hole for the park
    const groundShape = new THREE.Shape()
    groundShape.moveTo(-4800, -4800)
    groundShape.lineTo(4800, -4800)
    groundShape.lineTo(4800, 4800)
    groundShape.lineTo(-4800, 4800)
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

    return { group }
}
