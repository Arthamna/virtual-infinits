import * as THREE from 'three'

// Minecraft-style First-Person Controls:
// Click canvas for PointerLock mouse-look (or drag fallback), WASD/Arrows move, Shift sprint, Space jump, ESC unlock.
const MAX_STEP = 0.65
const BODY_RADIUS = 0.38
const GRAVITY = -16.5
const JUMP_SPEED = 6.2

export function createWalkControls({ camera, domElement, walkables, obstacles, start, startDir, eyeHeight = 2.4 }) {
    const keys = new Set()
    const look = { yaw: 0, pitch: 0 }
    const feet = new THREE.Vector3()
    let eyeY = 0
    let velY = 0
    let grounded = true
    let enabled = false
    let dragging = false
    let bobPhase = 0

    const downRay = new THREE.Raycaster()
    downRay.ray.direction.set(0, -1, 0)
    const sideRay = new THREE.Raycaster()
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const delta = new THREE.Vector3()

    const isLocked = () => document.pointerLockElement === domElement

    const groundAt = (x, z) => {
        downRay.ray.origin.set(x, 30, z)
        const hit = downRay.intersectObjects(walkables, true)[0]
        return hit ? hit.point.y : null
    }

    const tryMove = (dx, dz) => {
        const len = Math.hypot(dx, dz)
        if (len === 0) return null
        const y = groundAt(feet.x + dx, feet.z + dz)
        if (y === null) return null
        // Allow stepping up smoothly when grounded, or moving over lower terrain while jumping
        if (grounded && y - feet.y > MAX_STEP) return null
        if (!grounded && y > feet.y + 0.35) return null
        sideRay.ray.origin.set(feet.x, feet.y + 0.85, feet.z)
        sideRay.ray.direction.set(dx / len, 0, dz / len)
        sideRay.far = len + BODY_RADIUS
        if (sideRay.intersectObjects(obstacles, true).length) return null
        return y
    }

    const onKey = (e) => {
        if (!enabled) return
        const k = e.key.toLowerCase()
        if (e.type === 'keydown') {
            if (e.code === 'Space') {
                e.preventDefault()
                if (grounded) {
                    velY = JUMP_SPEED
                    grounded = false
                }
            }
            keys.add(k)
        } else {
            keys.delete(k)
        }
    }

    const onDown = (e) => {
        if (!enabled || e.button !== 0) return
        dragging = true
        if (!isLocked() && domElement.requestPointerLock) {
            domElement.requestPointerLock()
        }
    }
    const onUp = () => {
        dragging = false
    }
    const onMove = (e) => {
        if (!enabled) return
        if (!isLocked() && !dragging) return
        const sens = isLocked() ? 0.0022 : 0.004
        look.yaw -= e.movementX * sens
        look.pitch = THREE.MathUtils.clamp(look.pitch - e.movementY * sens, -1.42, 1.42)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)

    const pressed = (...names) => names.some((n) => keys.has(n))

    const initGround = groundAt(start.x, start.z) ?? 0.3
    feet.set(start.x, initGround, start.z)
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
            const g = groundAt(feet.x, feet.z)
            if (g !== null) feet.y = g
            eyeY = feet.y + eyeHeight
            velY = 0
            grounded = true
            look.pitch = -0.04
            camera.position.set(feet.x, eyeY, feet.z)
            camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ')
        },
        disable() {
            enabled = false
            keys.clear()
            dragging = false
            if (isLocked() && document.exitPointerLock) {
                document.exitPointerLock()
            }
        },
        update(dt) {
            if (!enabled) return
            forward.set(-Math.sin(look.yaw), 0, -Math.cos(look.yaw))
            right.set(-forward.z, 0, forward.x)

            const move = (pressed('w', 'arrowup') ? 1 : 0) - (pressed('s', 'arrowdown') ? 1 : 0)
            const strafe = (pressed('d', 'arrowright') ? 1 : 0) - (pressed('a', 'arrowleft') ? 1 : 0)
            const sprinting = keys.has('shift') && move > 0
            const speed = sprinting ? 9.5 : 4.8

            delta.copy(forward).multiplyScalar(move).addScaledVector(right, strafe)
            const moving = delta.lengthSq() > 0
            let floorY = groundAt(feet.x, feet.z) ?? feet.y

            if (moving) {
                delta.normalize().multiplyScalar(speed * dt)
                let y = tryMove(delta.x, delta.z)
                if (y !== null) {
                    feet.x += delta.x
                    feet.z += delta.z
                    floorY = y
                } else if ((y = tryMove(delta.x, 0)) !== null) {
                    feet.x += delta.x
                    floorY = y
                } else if ((y = tryMove(0, delta.z)) !== null) {
                    feet.z += delta.z
                    floorY = y
                }
            }

            // Gravity & jumping physics
            if (!grounded || feet.y > floorY + 0.05) {
                grounded = false
                velY += GRAVITY * dt
                feet.y += velY * dt
                if (feet.y <= floorY) {
                    feet.y = floorY
                    velY = 0
                    grounded = true
                }
            } else {
                feet.y = floorY
                velY = 0
            }

            // Minecraft-like sprint FOV boost
            const targetFov = sprinting ? 76 : 70
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 10))
                camera.updateProjectionMatrix()
            }

            // Head bobbing while walking/sprinting on ground
            if (moving && grounded) {
                bobPhase += dt * (sprinting ? 13 : 8.5)
            }
            const bobY = moving && grounded ? Math.sin(bobPhase) * (sprinting ? 0.055 : 0.032) : 0
            const bobX = moving && grounded ? Math.cos(bobPhase * 0.5) * 0.018 : 0

            eyeY += (feet.y + eyeHeight - eyeY) * (1 - Math.exp(-dt * 14))
            camera.position.set(
                feet.x + right.x * bobX,
                eyeY + bobY,
                feet.z + right.z * bobX
            )
            camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ')
        }
    }
}
