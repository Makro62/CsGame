/**
 * Bunny Hop & Movement System
 * Based on patterns from Quake-style movement (TOSIOS, three-fps)
 *
 * Encapsulates bunny hop acceleration, air strafing, and slide mechanics.
 * Extracted from PlayerController for cleaner separation of concerns.
 */

import * as THREE from 'three'

const WALK_SPEED = 8.5
const SPRINT_SPEED = 11.5
const JUMP_VELOCITY = 8.5
const GRAVITY = 30
const MAX_VELOCITY = 18
const AIR_CONTROL = 0.3
const MAX_STRAFE_DEG = 15
const SLIDE_DURATION = 0.6
const SLIDE_BOOST = 1.3
const FRICTION_GROUND = 5
const FRICTION_AIR = 0.5

interface MovementState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  velocityXZ: THREE.Vector2
  grounded: boolean
  sliding: boolean
  slideStartTime: number
  slideStartVelocity: THREE.Vector2
  coyoteTime: number
  velocityY: number
}

interface MovementInput {
  forward: boolean
  backward: boolean
  right: boolean
  left: boolean
  jump: boolean
  sprint: boolean
  crouch: boolean
  rotationY: number
  jumpBuffer: number[]
}

export class BhopSystem {
  private state: MovementState = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    velocityXZ: new THREE.Vector2(),
    grounded: true,
    sliding: false,
    slideStartTime: 0,
    slideStartVelocity: new THREE.Vector2(),
    coyoteTime: 0,
    velocityY: 0,
  }

  private moveVelocity = new THREE.Vector2()
  private direction = new THREE.Vector3()

  /** Initialize at spawn position */
  setPosition(x: number, y: number, z: number) {
    this.state.position.set(x, y, z)
    this.state.velocity.set(0, 0, 0)
    this.state.velocityXZ.set(0, 0)
    this.state.velocityY = 0
    this.state.grounded = true
  }

  /** Get current state for external use */
  getState(): Readonly<MovementState> {
    return this.state
  }

  /** Main update — call each frame with dt and input */
  update(
    dt: number,
    input: MovementInput,
    now: number,
    options: {
      canJump?: boolean
      crouchSpeed?: number
      hasKnife?: boolean
      slideControl?: number
    } = {}
  ): {
    position: THREE.Vector3
    velocityY: number
    grounded: boolean
    sliding: boolean
    speed: number
  } {
    const { canJump = true, crouchSpeed = 4.5, hasKnife = false, slideControl = 5 } = options

    // ─── Direction from input ────────────────────────────────
    const sin = Math.sin(input.rotationY)
    const cos = Math.cos(input.rotationY)

    this.direction.set(0, 0, 0)
    if (input.forward) { this.direction.x -= sin; this.direction.z -= cos }
    if (input.backward) { this.direction.x += sin; this.direction.z += cos }
    if (input.left) { this.direction.x -= cos; this.direction.z += sin }
    if (input.right) { this.direction.x += cos; this.direction.z -= sin }
    this.direction.y = 0

    const isDiagonal = (input.forward || input.backward) && (input.left || input.right)
    const strafeMult = isDiagonal ? 1.0 : 1.0

    // ─── Target speed ───────────────────────────────────────
    let targetSpeed = WALK_SPEED
    if (input.sprint) targetSpeed = SPRINT_SPEED
    if (input.crouch && !this.state.sliding) targetSpeed = crouchSpeed
    if (hasKnife) targetSpeed *= 1.1

    // Slide speed decay
    if (this.state.sliding) {
      const elapsed = (now - this.state.slideStartTime) / 1000
      const progress = Math.min(elapsed / SLIDE_DURATION, 1)
      const sc = slideControl / 10
      const slideEndSpeed = THREE.MathUtils.lerp(SPRINT_SPEED, 2 + sc * 3, progress)
      targetSpeed = THREE.MathUtils.lerp(SPRINT_SPEED, slideEndSpeed, progress)
    }

    // ─── Desired velocity XZ ────────────────────────────────
    const desiredMove = new THREE.Vector2()
    if (this.direction.lengthSq() > 0.001) {
      this.direction.normalize()
      desiredMove.set(
        this.direction.x * targetSpeed * strafeMult,
        this.direction.z * targetSpeed * strafeMult
      )
      const accel = this.state.grounded ? 10 : 5
      this.moveVelocity.lerp(desiredMove, 1 - Math.exp(-accel * dt))
    } else {
      const decel = this.state.grounded ? 14 : 6
      this.moveVelocity.lerp(new THREE.Vector2(0, 0), 1 - Math.exp(-decel * dt))
    }
    this.state.velocityXZ.copy(this.moveVelocity)

    // ─── Friction ───────────────────────────────────────────
    const friction = this.state.grounded
      ? (input.sprint ? FRICTION_GROUND * 0.8 : FRICTION_GROUND)
      : FRICTION_AIR

    if (friction > 0 && this.state.grounded && this.direction.lengthSq() < 0.001) {
      const frictionFactor = Math.max(0, 1 - friction * dt)
      this.state.velocityXZ.multiplyScalar(frictionFactor)
      this.moveVelocity.multiplyScalar(frictionFactor)
    }

    if (this.state.velocityXZ.length() < 0.06) {
      this.state.velocityXZ.set(0, 0)
      this.moveVelocity.set(0, 0)
    }

    // ─── Air strafing ──────────────────────────────────────
    if (!this.state.grounded && this.direction.lengthSq() > 0.001) {
      const velYaw = Math.atan2(this.state.velocityXZ.x, this.state.velocityXZ.y)
      const camYaw = input.rotationY
      let delta = camYaw - velYaw
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2

      const maxTurn = THREE.MathUtils.degToRad(MAX_STRAFE_DEG)
      const clampedDelta = THREE.MathUtils.clamp(delta, -maxTurn, maxTurn)
      const angle = clampedDelta * AIR_CONTROL
      this.state.velocityXZ.rotateAround(new THREE.Vector2(0, 0), angle)

      if (Math.abs(delta) > maxTurn) {
        this.state.velocityXZ.multiplyScalar(0.8)
      }
    }

    // ─── Curve slide ────────────────────────────────────────
    if (this.state.sliding && this.direction.lengthSq() > 0.001) {
      const velYaw = Math.atan2(this.state.velocityXZ.x, this.state.velocityXZ.y)
      const camYaw = input.rotationY
      let rot = camYaw - velYaw
      while (rot > Math.PI) rot -= Math.PI * 2
      while (rot < -Math.PI) rot += Math.PI * 2

      const step = THREE.MathUtils.clamp(rot, -0.1, 0.1)
      this.state.velocityXZ.rotateAround(new THREE.Vector2(0, 0), step)

      if (Math.abs(rot) > 0.6) {
        this.state.velocityXZ.multiplyScalar(0.95)
      }
    }

    // ─── Clamp max velocity ─────────────────────────────────
    const speed = this.state.velocityXZ.length()
    if (speed > MAX_VELOCITY) {
      this.state.velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
    }

    // ─── Slide logic ────────────────────────────────────────
    const canSlide =
      input.sprint &&
      input.crouch &&
      this.state.grounded &&
      speed > 4 &&
      !this.state.sliding

    if (canSlide) {
      this.state.sliding = true
      this.state.slideStartTime = now
      this.state.slideStartVelocity = this.state.velocityXZ.clone()
    }

    // ─── Jump logic ─────────────────────────────────────────
    const hasJumpBuffer =
      (input.jumpBuffer.length > 0 &&
        now - input.jumpBuffer[input.jumpBuffer.length - 1] <= 100) ||
      input.jump

    const isGrounded = this.state.grounded || this.state.coyoteTime > 0

    if (isGrounded && hasJumpBuffer && canJump) {
      this.state.velocityY = JUMP_VELOCITY
      input.jumpBuffer.length = 0
      this.state.coyoteTime = 0
      this.state.grounded = false

      // Slide boost
      if (this.state.sliding) {
        this.state.velocityXZ.multiplyScalar(SLIDE_BOOST)
        const boostedSpeed = this.state.velocityXZ.length()
        if (boostedSpeed > MAX_VELOCITY) {
          this.state.velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
        }
        this.state.sliding = false
      }
    }

    // Short-hop
    if (!this.state.grounded && !input.jump && this.state.velocityY > 0) {
      this.state.velocityY *= 0.88
    }

    // ─── End slide ──────────────────────────────────────────
    if (this.state.sliding) {
      const elapsed = (now - this.state.slideStartTime) / 1000
      if (elapsed > SLIDE_DURATION) {
        this.state.sliding = false
      }
    }

    // ─── Gravity ────────────────────────────────────────────
    if (!this.state.grounded) {
      this.state.coyoteTime = Math.max(0, this.state.coyoteTime - dt)
      this.state.velocityY -= GRAVITY * dt
      this.state.velocityY = Math.max(this.state.velocityY, -30)
    } else {
      this.state.coyoteTime = 0.12
      this.state.velocityY = -2
    }

    // ─── Apply movement ────────────────────────────────────
    this.state.position.x += this.state.velocityXZ.x * dt
    this.state.position.z += this.state.velocityXZ.y * dt
    this.state.position.y += this.state.velocityY * dt

    return {
      position: this.state.position.clone(),
      velocityY: this.state.velocityY,
      grounded: this.state.grounded,
      sliding: this.state.sliding,
      speed,
    }
  }

  /** Update grounded state from character controller */
  setGrounded(grounded: boolean) {
    if (!this.state.grounded && grounded && this.state.velocityY < 0) {
      this.state.velocityY = 0
    }
    this.state.grounded = grounded
  }

  /** Check if player is on ground (for external use) */
  isGrounded(): boolean {
    return this.state.grounded
  }

  /** Get current speed */
  getSpeed(): number {
    return this.state.velocityXZ.length()
  }

  /** Check if sliding */
  isSliding(): boolean {
    return this.state.sliding
  }

  /** Get velocity Y */
  getVelocityY(): number {
    return this.state.velocityY
  }
}
