import * as THREE from 'three'

// First-person walking: WASD/arrows move relative to the view, drag to look, Shift to run.
// You can only stand on `walkables` (found by a downward ray, so ramps and steps follow the surface)
// and `obstacles` (railings, lamps, sign) block you; blocked moves slide along the blocking axis.
const MAX_STEP = 0.4
const BODY_RADIUS = 0.3

export function createWalkControls({ camera, domElement, walkables, obstacles, start, startDir, eyeHeight = 1.7 }) {
    const keys = new Set()
    const look = { yaw: 0, pitch: 0 }
    const feet = new THREE.Vector3()
    let eyeY = 0
    let enabled = false
    let dragging = false
    let bobPhase = 0

    const downRay = new THREE.Raycaster()
    downRay.ray.direction.set(0, -1, 0)
    const sideRay = new THREE.Raycaster()
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const delta = new THREE.Vector3()

    const groundAt = (x, z) => {
        downRay.ray.origin.set(x, 20, z)
        const hit = downRay.intersectObjects(walkables, true)[0]
        return hit ? hit.point.y : null
    }

    // returns new ground height if moving feet by (dx, dz) is allowed, else null
    const tryMove = (dx, dz) => {
        const len = Math.hypot(dx, dz)
        if (len === 0) return null
        const y = groundAt(feet.x + dx, feet.z + dz)
        if (y === null || y - feet.y > MAX_STEP) return null
        sideRay.ray.origin.set(feet.x, feet.y + 0.5, feet.z)
        sideRay.ray.direction.set(dx / len, 0, dz / len)
        sideRay.far = len + BODY_RADIUS
        if (sideRay.intersectObjects(obstacles, true).length) return null
        return y
    }

    const onKey = (e) => {
        if (!enabled) return
        const k = e.key.toLowerCase()
        if (e.type === 'keydown') keys.add(k)
        else keys.delete(k)
    }
    const onDown = (e) => {
        if (enabled && e.button === 0) dragging = true
    }
    const onUp = () => {
        dragging = false
    }
    const onMove = (e) => {
        if (!enabled || !dragging) return
        look.yaw -= e.movementX * 0.004
        look.pitch = THREE.MathUtils.clamp(look.pitch - e.movementY * 0.004, -1.2, 1.2)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)

    const pressed = (...names) => names.some((n) => keys.has(n))

    feet.set(start.x, groundAt(start.x, start.z) ?? 0, start.z)
    look.yaw = Math.atan2(-startDir.x, -startDir.z)

    return {
        get enabled() {
            return enabled
        },
        get position() {
            return feet
        },
        enable() {
            enabled = true
            eyeY = feet.y + eyeHeight
            look.pitch = -0.05
        },
        disable() {
            enabled = false
            keys.clear()
            dragging = false
        },
        update(dt) {
            if (!enabled) return
            forward.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw))
            right.set(-forward.z, 0, forward.x)
            const move = (pressed('w', 'arrowup') ? 1 : 0) - (pressed('s', 'arrowdown') ? 1 : 0)
            const strafe = (pressed('d', 'arrowright') ? 1 : 0) - (pressed('a', 'arrowleft') ? 1 : 0)
            const speed = keys.has('shift') ? 4 : 1.6

            delta.copy(forward).multiplyScalar(move).addScaledVector(right, strafe)
            const moving = delta.lengthSq() > 0
            if (moving) {
                delta.normalize().multiplyScalar(speed * dt)
                let y = tryMove(delta.x, delta.z)
                if (y !== null) {
                    feet.x += delta.x
                    feet.z += delta.z
                } else if ((y = tryMove(delta.x, 0)) !== null) {
                    feet.x += delta.x
                } else if ((y = tryMove(0, delta.z)) !== null) {
                    feet.z += delta.z
                }
                if (y !== null) feet.y = y
            }

            bobPhase += moving ? dt * speed * 5 : 0
            const bob = moving ? Math.sin(bobPhase) * 0.025 : 0
            eyeY += (feet.y + eyeHeight - eyeY) * (1 - Math.exp(-dt * 10)) // smooth over steps
            camera.position.set(feet.x, eyeY + bob, feet.z)
            camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ')
        }
    }
}
