import * as THREE from 'three'
import { createConcreteTexture, createPavingPBRMaps, createPavingTexture } from './textures'

/**
 * Curved 3-tier concrete amphitheater ("tribun beton melengkung") with sculpted side wing walls,
 * smooth concrete apron, and circular red-and-grey paving forecourt.
 */
export function createParkAmphitheater({
    centerX = -31.6,
    centerZ = -55.0,
    facingAngle = -0.44, // rotated slightly so seating arc shifts right toward the jogging curve
    arcHalf = 0.86
} = {}) {
    const group = new THREE.Group()
    group.position.set(centerX, 0, centerZ)
    group.rotation.y = facingAngle

    const concTex = createConcreteTexture()
    concTex.repeat.set(0.35, 0.35)

    // Light elephant-grey architectural concrete ("abu gajah" / abu muda terang)
    const darkConcreteMat = new THREE.MeshStandardMaterial({
        map: concTex,
        bumpMap: concTex,
        bumpScale: 0.020,
        color: 0xa2a6aa,
        roughness: 0.86,
        metalness: 0.02
    })
    const lightConcreteMat = new THREE.MeshStandardMaterial({
        map: concTex,
        bumpMap: concTex,
        bumpScale: 0.015,
        color: 0xc2c6ca,
        roughness: 0.82,
        metalness: 0.02
    })
    const apronConcreteMat = new THREE.MeshStandardMaterial({
        map: concTex,
        bumpMap: concTex,
        bumpScale: 0.014,
        color: 0xcfd3d6,
        roughness: 0.84,
        metalness: 0.02
    })

    const forecourtPBR = createPavingPBRMaps(4, 4, false)
    const forecourtPavingMat = new THREE.MeshStandardMaterial({
        map: createPavingTexture(4, 4, false),
        normalMap: forecourtPBR.normalMap,
        normalScale: new THREE.Vector2(1.25, 1.25),
        aoMap: forecourtPBR.aoMap,
        aoMapIntensity: 0.8,
        roughnessMap: forecourtPBR.roughnessMap,
        roughness: 0.85,
        metalness: 0.03
    })

    const a0 = Math.PI - arcHalf
    const a1 = Math.PI + arcHalf
    const segs = 40

    // Helper: builds a curved annular solid block between radii [rIn, rOut] and heights [yBot, yTop]
    // with separate material groups: 0 = top face (light concrete), 1 = vertical walls (dark concrete)
    function makeCurvedTier(rIn, rOut, yBot, yTop, topMat = lightConcreteMat, wallMat = darkConcreteMat) {
        const topPos = []
        const topUV = []
        const topIdx = []
        const wallPos = []
        const wallUV = []
        const wallIdx = []

        for (let i = 0; i <= segs; i++) {
            const t = i / segs
            const a = a0 + t * (a1 - a0)
            const ca = Math.cos(a)
            const sa = Math.sin(a)
            const xIn = ca * rIn
            const zIn = sa * rIn
            const xOut = ca * rOut
            const zOut = sa * rOut

            topPos.push(xIn, yTop, zIn, xOut, yTop, zOut)
            topUV.push(xIn * 0.45, zIn * 0.45, xOut * 0.45, zOut * 0.45)

            if (i < segs) {
                const b = i * 2
                topIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
            }
        }

        // Front (inner concave riser) & Back (outer convex wall)
        let wBase = 0
        for (const [r, flip] of [
            [rIn, false],
            [rOut, true]
        ]) {
            const start = wBase
            for (let i = 0; i <= segs; i++) {
                const t = i / segs
                const a = a0 + t * (a1 - a0)
                const x = Math.cos(a) * r
                const z = Math.sin(a) * r
                const arcDist = t * (a1 - a0) * r
                wallPos.push(x, yTop, z, x, yBot, z)
                wallUV.push(arcDist * 0.35, yTop * 0.5, arcDist * 0.35, yBot * 0.5)
                if (i < segs) {
                    const b = start + i * 2
                    if (!flip) {
                        wallIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
                    } else {
                        wallIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
                    }
                }
            }
            wBase += (segs + 1) * 2
        }

        const topGeo = new THREE.BufferGeometry()
        topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3))
        topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUV, 2))
        topGeo.setIndex(topIdx)
        topGeo.computeVertexNormals()
        const topMesh = new THREE.Mesh(topGeo, topMat)
        topMesh.castShadow = true
        topMesh.receiveShadow = true

        const wallGeo = new THREE.BufferGeometry()
        wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3))
        wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUV, 2))
        wallGeo.setIndex(wallIdx)
        wallGeo.computeVertexNormals()
        const wallMesh = new THREE.Mesh(wallGeo, wallMat)
        wallMesh.castShadow = true
        wallMesh.receiveShadow = true

        const tierGroup = new THREE.Group()
        tierGroup.add(topMesh, wallMesh)
        return tierGroup
    }

    // 1. Circular red-and-grey brick paving forecourt + concrete curb rim in front of the amphitheater
    const forecourtR = 3.65
    const forecourtGeo = new THREE.CylinderGeometry(forecourtR, forecourtR, 0.12, 48)
    const forecourtMesh = new THREE.Mesh(forecourtGeo, forecourtPavingMat)
    forecourtMesh.position.y = 0.005
    forecourtMesh.receiveShadow = true
    group.add(forecourtMesh)

    // Crisp concrete border ring around the circular paving forecourt
    const curbRingShape = new THREE.Shape()
    curbRingShape.absarc(0, 0, forecourtR + 0.16, 0, Math.PI * 2, false)
    const curbRingHole = new THREE.Path()
    curbRingHole.absarc(0, 0, forecourtR - 0.02, 0, Math.PI * 2, true)
    curbRingShape.holes.push(curbRingHole)
    const curbRingGeo = new THREE.ExtrudeGeometry(curbRingShape, { depth: 0.12, bevelEnabled: false, curveSegments: 48 })
    curbRingGeo.rotateX(Math.PI / 2)
    const curbRingMesh = new THREE.Mesh(curbRingGeo, apronConcreteMat)
    curbRingMesh.position.y = 0.072
    curbRingMesh.receiveShadow = true
    group.add(curbRingMesh)

    // 2. Smooth grey curved concrete walkway apron between circular paving and Tier 1 seat
    group.add(makeCurvedTier(forecourtR + 0.05, 5.05, -0.06, 0.09, apronConcreteMat, darkConcreteMat))

    // 3. Three taller stepped curved concrete seating tiers + back backrest wall
    // Tier 1 (bottom seat)
    group.add(makeCurvedTier(4.98, 5.56, -0.06, 0.56, lightConcreteMat, darkConcreteMat))
    // Tier 2 (middle seat)
    group.add(makeCurvedTier(5.54, 6.10, -0.06, 1.04, lightConcreteMat, darkConcreteMat))
    // Tier 3 (top seat)
    group.add(makeCurvedTier(6.08, 6.66, -0.06, 1.52, lightConcreteMat, darkConcreteMat))
    // Back concrete backrest/retaining wall
    group.add(makeCurvedTier(6.64, 6.92, -0.06, 1.96, darkConcreteMat, darkConcreteMat))

    // 4. Two sculpted elephant-grey concrete side wing walls (pipi kanan & kiri) with rounded front nose
    // Profile in radial (r) and vertical (y) coordinates
    const wingShape = new THREE.Shape()
    wingShape.moveTo(4.60, -0.08)
    wingShape.lineTo(8.45, -0.08) // gentle rear slope foot
    wingShape.quadraticCurveTo(8.36, 0.38, 7.08, 2.02) // smooth rear slope up to crest
    wingShape.quadraticCurveTo(6.86, 2.16, 6.56, 2.06) // rounded upper crest
    wingShape.lineTo(4.78, 0.76) // diagonal front slope matching the 3 taller steps
    wingShape.quadraticCurveTo(4.58, 0.62, 4.60, 0.28) // rounded front nose
    wingShape.closePath()

    const wingThick = 0.24
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: wingThick,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 16
    })
    wingGeo.translate(0, 0, -wingThick / 2)

    for (const angle of [a0, a1]) {
        const wing = new THREE.Mesh(wingGeo, darkConcreteMat)
        // Rotate around Y so local +X aligns with radial direction (cos(angle), 0, sin(angle))
        wing.rotation.y = -angle
        wing.castShadow = true
        wing.receiveShadow = true
        group.add(wing)
    }

    // 5. Subtle architectural details from photo: brass commemorative plaque on right inner wing wall + small step lights
    const plaqueMat = new THREE.MeshStandardMaterial({
        color: 0x8f7443,
        roughness: 0.38,
        metalness: 0.72
    })
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.025), plaqueMat)
    // on the outer face of the right-hand wing as seen from the stage (a1 side), like the photos
    const plaqueR = 6.55
    plaque.position.set(
        Math.cos(a1) * plaqueR - Math.sin(a1) * 0.145,
        1.48,
        Math.sin(a1) * plaqueR + Math.cos(a1) * 0.145
    )
    plaque.rotation.y = -a1
    group.add(plaque)

    const outletMat = new THREE.MeshStandardMaterial({
        color: 0xd8dad6,
        roughness: 0.6,
        metalness: 0.1
    })
    for (const frac of [0.22, 0.5, 0.78]) {
        const a = a0 + frac * (a1 - a0)
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.09), outletMat)
        box.position.set(Math.cos(a) * 6.62, 1.74, Math.sin(a) * 6.62)
        box.rotation.y = -a
        group.add(box)
    }

    // Exclusion check in park local (x, z) so grass blades, bushes, and trees never spawn inside the amphitheater
    const isBlocked = (x, z) => {
        const dx = x - centerX
        const dz = z - centerZ
        const cosF = Math.cos(-facingAngle)
        const sinF = Math.sin(-facingAngle)
        const lx = dx * cosF - dz * sinF
        const lz = dx * sinF + dz * cosF
        const r = Math.hypot(lx, lz)
        if (r < forecourtR + 0.55) return true
        if (r > 8.5) return false
        const ang = Math.atan2(lz, lx)
        const diff = Math.abs(Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)))
        return diff <= arcHalf + 0.14
    }

    return { group, isBlocked }
}
