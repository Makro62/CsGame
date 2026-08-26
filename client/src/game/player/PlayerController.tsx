// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  RigidBody,
  useRapier,
  RapierRigidBody,
  CapsuleCollider,
} from '@react-three/rapier'
import * as THREE from 'three'
import { KinematicCharacterController } from '@dimforge/rapier3d-compat'
import { PHYSICS, SPAWN, MAP_OBSTACLES, MAP_BOUNDARY, WEAPONS } from '@cs-game/shared'
import { spawnCameraYaw } from '../offline/offlineCombat'
import { TRAINING_ARENA } from '../training/TrainingArena'
import { SURVIVAL_BOUNDS } from '../zombie/survivalLayout'
import { L4D_BOUNDS, L4D_SAFE_Z } from '../l4d/l4dLayout'
import { updateAudioListener } from '../../components/AudioManager'
import { usePlayerInput } from '../../hooks/usePlayerInput'
import { useGameStore } from '../../stores/useGameStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useWeaponStore, type WeaponKey } from '../../stores/useWeaponStore'
import { useOffline5v5Store } from '../../screens/Offline5v5Store'
import { useL4DStore } from '../../stores/useL4DStore'

const EYE_HEIGHT_STAND = 0.8
const EYE_HEIGHT_CROUCH = 0.4
const CAPSULE_RADIUS = 0.3
const CAPSULE_HALF_HEIGHT = 0.6
const TOTAL_HEIGHT = (CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS) * 2

interface SlideState {
  active: boolean
  startTime: number
  startVelXZ: THREE.Vector2
}

const direction = new THREE.Vector3()
const velocityXZ = new THREE.Vector2()
const _lookTarget = new THREE.Vector3()
const _currentPos = new THREE.Vector3()
const _desiredMovement = new THREE.Vector3()
const _euler = new THREE.Euler()
const _lookEuler = new THREE.Euler()

const POINTER_LOCK_SENSITIVITY = 0.002
const PITCH_LIMIT = 1.55

// Each mode has its own playable area, so the clamp must follow the mode.
// Values are inset by the capsule radius so the player never clips a wall.
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }

const MODE_BOUNDS: Record<string, Bounds> = {
  offline5v5: { minX: MAP_BOUNDARY.minX + 0.8, maxX: MAP_BOUNDARY.maxX - 0.8, minZ: MAP_BOUNDARY.minZ + 0.8, maxZ: MAP_BOUNDARY.maxZ - 0.8 },
  training: {
    minX: TRAINING_ARENA.minX + 0.8,
    maxX: TRAINING_ARENA.maxX - 0.8,
    minZ: TRAINING_ARENA.minZ + 0.8,
    maxZ: TRAINING_ARENA.maxZ - 0.8,
  },
  zombie: { minX: SURVIVAL_BOUNDS.minX, maxX: SURVIVAL_BOUNDS.maxX, minZ: SURVIVAL_BOUNDS.minZ, maxZ: SURVIVAL_BOUNDS.maxZ },
  l4d: { minX: L4D_BOUNDS.minX, maxX: L4D_BOUNDS.maxX, minZ: L4D_BOUNDS.minZ, maxZ: L4D_BOUNDS.maxZ },
}

export function getBounds(mode: string): Bounds {
  return MODE_BOUNDS[mode] ?? MODE_BOUNDS.offline5v5
}

// Ray vs AABB slab test for wall jump detection (fixed: inv = 1/d, not d/len)
function rayVsAABB(
  origin: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): boolean {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (len < 1e-6) return false
  const invDx = dx !== 0 ? 1 / dx : Infinity
  const invDy = dy !== 0 ? 1 / dy : Infinity
  const invDz = dz !== 0 ? 1 / dz : Infinity

  let tmin = -Infinity
  let tmax = Infinity

  if (dx !== 0) {
    const t1 = (box.minX - origin.x) * invDx
    const t2 = (box.maxX - origin.x) * invDx
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.x < box.minX || origin.x > box.maxX) return false

  if (dy !== 0) {
    const t1 = (box.minY - origin.y) * invDy
    const t2 = (box.maxY - origin.y) * invDy
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.y < box.minY || origin.y > box.maxY) return false

  if (dz !== 0) {
    const t1 = (box.minZ - origin.z) * invDz
    const t2 = (box.maxZ - origin.z) * invDz
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.z < box.minZ || origin.z > box.maxZ) return false

  // Hit inside [0, len] along the ray
  return tmax >= tmin && tmax >= 0 && tmin <= len
}

const WALK_SPEED = PHYSICS.walkSpeed as number
const SPRINT_SPEED = PHYSICS.sprintSpeed as number
const JUMP_VELOCITY = PHYSICS.jumpVelocity as number
const GRAVITY = PHYSICS.gravity as number
const STRAFE_MULT = PHYSICS.strafeMultiplier as number
const SLIDE_DURATION = PHYSICS.slideDuration as number
const MAX_VELOCITY = PHYSICS.maxVelocity as number
const MAX_STRAFE_DEG = PHYSICS.maxStrafeTurnDeg as number
const AIR_CONTROL = PHYSICS.airControl as number
const MOON_JUMP_MULT = PHYSICS.moonJumpMult as number
const SHORT_HOP_MULT = PHYSICS.shortHopMult as number
const INPUT_WINDOW_MS = PHYSICS.inputWindowMs as number
const SLIDE_BOOST = PHYSICS.slideBoost as number

// Perfect Jump Boost
const PERFECT_JUMP_WINDOW = PHYSICS.perfectJumpWindow as number
const PERFECT_JUMP_BOOST = PHYSICS.perfectJumpBoost as number

// Double Jump
const DOUBLE_JUMP_BOOST = PHYSICS.doubleJumpBoost as number

// Wall Jump
const WALL_JUMP_ENABLED = PHYSICS.wallJumpEnabled as boolean
const WALL_JUMP_BOOST = PHYSICS.wallJumpBoost as number
const WALL_JUMP_HORIZONTAL = PHYSICS.wallJumpHorizontal as number
const WALL_JUMP_COOLDOWN = PHYSICS.wallJumpCooldown as number
const WALL_JUMP_RAY_DIST = PHYSICS.wallJumpRayDist as number

export function PlayerController() {
  const { camera } = useThree()
  const { world } = useRapier()
  const { getInput, getCrouchReleasedAt } = usePlayerInput()
  const mode = useGameStore(s => s.mode)
  const isZombieMode = mode === 'zombie'
  const { slideControl } = useSettingsStore()
  // Offline only — death from offline5v5 local store; spectator skipped (bots visible)
  const offlineAlive = useOffline5v5Store(s => {
    const p = s.players.get("local");
    return p ? !p.isDead : false;
  });
  const effectiveIsDead = mode === 'offline5v5' ? !offlineAlive : false
  // Offline bomb state from local store
  const localHasBomb = useOffline5v5Store(s => {
    const p = s.players.get("local");
    return p?.hasBomb ?? false;
  })
  const droppedBombPos = useOffline5v5Store(s =>
    s.bombDropped ? { x: s.bombDropX, y: 0, z: s.bombDropZ } : null
  )
  const sendPickupBomb = () => {}

  // Spawn offline — no server. Safe spawn per mode.
  const [initialSpawn] = useState<[number, number, number]>(() => {
    if (mode === 'l4d') {
      return [0, TOTAL_HEIGHT / 2 + 0.05, L4D_SAFE_Z]
    }
    if (isZombieMode) {
      return [0, TOTAL_HEIGHT / 2 + 0.05, 0]
    }
    if (mode === 'training') {
      return [
        TRAINING_ARENA.spawn.x,
        TOTAL_HEIGHT / 2 + 0.01,
        TRAINING_ARENA.spawn.z,
      ]
    }
    return [SPAWN.T.x, TOTAL_HEIGHT / 2 + 0.01, SPAWN.T.z]
  })

  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const controllerRef = useRef<KinematicCharacterController | null>(null)
  const initDone = useRef(false)

  const velocityY = useRef(0)
  const grounded = useRef(true)
  const coyoteTimeRef = useRef(0)
  const crouching = useRef(false)
  const slideState = useRef<SlideState>({
    active: false,
    startTime: 0,
    startVelXZ: new THREE.Vector2(),
  })

  const headBob = useRef(0)
  const lookYaw = useRef(0)
  const lookPitch = useRef(0)
  const lastFrameTime = useRef(performance.now())
  const moveVelocityRef = useRef(new THREE.Vector2(0, 0))

  const weaponEquipped = useRef(false)
  const adsPressedInAir = useRef(false)

  // Perfect Jump Boost
  const lastLandTime = useRef(0)

  // Double Jump
  const doubleJumpUsed = useRef(false)

  // Wall Jump
  const lastWallJumpTime = useRef(0)

  // ADS: hold right mouse button (with guards for reload, switch, and weapon)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        const state = useWeaponStore.getState()
        if (state.activeWeapon && !state.isReloading && !state.isSwitching) {
          state.setADS(true)
          if (!grounded.current) {
            adsPressedInAir.current = true
          }
        }
      }
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        useWeaponStore.getState().setADS(false)
        adsPressedInAir.current = false
      }
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Mouse look keeps its own yaw/pitch so weapon recoil can be layered on top
  // without the recoil kick feeding back into the player's own aim.
  const applyLook = useCallback(() => {
    const { recoilAim } = useWeaponStore.getState()
    _lookEuler.set(
      THREE.MathUtils.clamp(
        lookPitch.current + recoilAim.pitch,
        -PITCH_LIMIT,
        PITCH_LIMIT
      ),
      lookYaw.current + recoilAim.yaw,
      0,
      'YXZ'
    )
    camera.quaternion.setFromEuler(_lookEuler)
  }, [camera])

  useEffect(() => {
    let locked = false

    const onPointerLockChange = () => {
      locked = !!document.pointerLockElement
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!locked) return
      const weaponState = useWeaponStore.getState()
      const adsSensMult = weaponState.isADS ? (weaponState.activeWeapon === 'awp' ? 0.35 : 0.6) : 1.0
      const sens =
        POINTER_LOCK_SENSITIVITY * useSettingsStore.getState().sensitivity * adsSensMult

      lookYaw.current -= e.movementX * sens
      lookPitch.current = THREE.MathUtils.clamp(
        lookPitch.current - e.movementY * sens,
        -PITCH_LIMIT,
        PITCH_LIMIT
      )
      applyLook()
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [applyLook])

  // Offline — weapon equip handled by mode screens; no server sync needed.

  useFrame(() => {
    if (!controllerRef.current) {
      controllerRef.current = world.createCharacterController(0.01)
      controllerRef.current.enableAutostep(0.5, 0.3, true)
      controllerRef.current.enableSnapToGround(1.0)
    }
  })

  useFrame(() => {
    const now = performance.now()
    const dt = Math.min((now - lastFrameTime.current) / 1000, 0.05)
    lastFrameTime.current = now

    if (effectiveIsDead) {
      // Offline death cam: freeze at death spot (no network killcam/spectator).
      const rbDead = rigidBodyRef.current
      if (rbDead) {
        const pos = rbDead.translation()
        camera.position.set(pos.x, pos.y + 1.6, pos.z)
      }
      return
    }

    // Recoil is an offset on top of mouse look, so the aim (and therefore the
    // shooting raycast, which uses the camera) climbs with the spray pattern.
    applyLook()

    // Menus and click-to-play release the pointer lock. Freeze look-driven
    // movement so pause actually pauses instead of letting WASD keep walking.
    if (!document.pointerLockElement) {
      const rbFrozen = rigidBodyRef.current
      if (rbFrozen) {
        const pos = rbFrozen.translation()
        camera.position.set(pos.x, pos.y + EYE_HEIGHT_STAND, pos.z)
      }
      return
    }

    const input = getInput()
    const controller = controllerRef.current
    const rb = rigidBodyRef.current
    if (!controller || !rb) return

    const pos = rb.translation()
    _currentPos.set(pos.x, pos.y, pos.z)

    if (mode === 'l4d') {
      const me = useL4DStore.getState().survivors[0]
      if (me && (me.isDead || me.isDowned || me.pinnedBy)) {
        camera.position.set(_currentPos.x, _currentPos.y + EYE_HEIGHT_CROUCH, _currentPos.z)
        applyLook()
        return
      }
    }

    // Initialize on first frame: snap to ground level
    if (!initDone.current) {
      initDone.current = true
      _currentPos.y = TOTAL_HEIGHT / 2 + 0.01
      velocityY.current = 0
      grounded.current = true
      rb.setNextKinematicTranslation({
        x: _currentPos.x,
        y: _currentPos.y,
        z: _currentPos.z,
      })
      camera.position.set(
        _currentPos.x,
        _currentPos.y + EYE_HEIGHT_STAND,
        _currentPos.z
      )

      if (mode === 'offline5v5') {
        const team = useOffline5v5Store.getState().players.get("local")?.team ?? 'T'
        lookYaw.current = spawnCameraYaw(team)
        applyLook()
      }
      if (mode === 'l4d') {
        lookYaw.current = Math.PI
        applyLook()
      }
      // Weapon already equipped by mode screen (Offline5v5Mode/TrainingRange)
      weaponEquipped.current = true
      return
    }

    // Offline — no server reconciliation needed

    // Calculate movement direction from quaternion yaw (matching server logic)
    // Extract yaw from quaternion to avoid Euler gimbal lock issues
    _euler.setFromQuaternion(camera.quaternion, 'YXZ')
    const sin = Math.sin(_euler.y)
    const cos = Math.cos(_euler.y)

    direction.set(0, 0, 0)
    if (input.forward) {
      direction.x -= sin
      direction.z -= cos
    }
    if (input.backward) {
      direction.x += sin
      direction.z += cos
    }
    if (input.left) {
      direction.x -= cos
      direction.z += sin
    }
    if (input.right) {
      direction.x += cos
      direction.z -= sin
    }
    direction.y = 0

    const isDiagonal =
      (input.forward || input.backward) && (input.left || input.right)
    const strafeMult = isDiagonal ? STRAFE_MULT : 1.0

    // Determine speed
    let targetSpeed: number = WALK_SPEED
    if (input.sprint) targetSpeed = SPRINT_SPEED
    if (input.crouch) targetSpeed = PHYSICS.crouchSpeed as number

    // Knife speed buff (+10%)
    if (useWeaponStore.getState().activeWeapon === 'knife') {
      targetSpeed *= 1.1
    }

    // Apply slide speed — single lerp per Physics Bible §4.1 (7.5 → end linear)
    if (slideState.current.active) {
      const slideElapsed = (now - slideState.current.startTime) / 1000
      const slideProgress = Math.min(slideElapsed / SLIDE_DURATION, 1)
      const slideControlFactor = slideControl / 10
      const slideEndSpeed = 2 + slideControlFactor * 3
      targetSpeed = THREE.MathUtils.lerp(SPRINT_SPEED, slideEndSpeed, slideProgress)
    }

    // 5v5 is CS-like: walk / sprint / crouch / jump only. Parkour stays in training.
    const csTactical = mode === 'offline5v5'

    // Calculate desired velocity XZ with smoother acceleration / deceleration
    const desiredMove = new THREE.Vector2()
    if (direction.lengthSq() > 0.001) {
      direction.normalize()
      desiredMove.set(
        direction.x * targetSpeed * strafeMult,
        direction.z * targetSpeed * strafeMult
      )
      const accel = grounded.current ? (csTactical ? 16 : 10) : (csTactical ? 3 : 5)
      moveVelocityRef.current.lerp(desiredMove, 1 - Math.exp(-accel * dt))
    } else {
      const decel = grounded.current ? (csTactical ? 18 : 14) : 6
      moveVelocityRef.current.lerp(
        new THREE.Vector2(0, 0),
        1 - Math.exp(-decel * dt)
      )
    }
    velocityXZ.copy(moveVelocityRef.current)

    // Apply friction — always when grounded (Physics Bible Table 4.2); air = 0
    let friction: number = PHYSICS.friction.walk
    if (input.sprint) friction = PHYSICS.friction.sprint
    if (slideState.current.active) friction = PHYSICS.friction.slide
    if (!grounded.current) friction = PHYSICS.friction.air

    if (friction > 0 && grounded.current) {
      const frictionFactor = Math.max(0, 1 - friction * dt)
      velocityXZ.multiplyScalar(frictionFactor)
      moveVelocityRef.current.multiplyScalar(frictionFactor)
    }

    if (velocityXZ.length() < 0.06) {
      velocityXZ.set(0, 0)
      moveVelocityRef.current.set(0, 0)
    }

    // Air strafing
    if (!csTactical && !grounded.current && direction.lengthSq() > 0.001) {
      const velYaw = Math.atan2(velocityXZ.x, velocityXZ.y)
      const camYaw = _euler.y
      let delta = camYaw - velYaw
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2

      const maxTurn = THREE.MathUtils.degToRad(MAX_STRAFE_DEG)
      const clampedDelta = THREE.MathUtils.clamp(delta, -maxTurn, maxTurn)
      const angle = clampedDelta * AIR_CONTROL
      velocityXZ.rotateAround(new THREE.Vector2(0, 0), angle)

      if (Math.abs(delta) > maxTurn) {
        velocityXZ.multiplyScalar(0.8)
      }
    }

    // Curve slide
    if (!csTactical && slideState.current.active && direction.lengthSq() > 0.001) {
      const velYaw = Math.atan2(velocityXZ.x, velocityXZ.y)
      const camYaw = _euler.y
      let rot = camYaw - velYaw
      while (rot > Math.PI) rot -= Math.PI * 2
      while (rot < -Math.PI) rot += Math.PI * 2

      const step = THREE.MathUtils.clamp(rot, -0.1, 0.1)
      velocityXZ.rotateAround(new THREE.Vector2(0, 0), step)

      if (Math.abs(rot) > 0.6) {
        velocityXZ.multiplyScalar(0.95)
      }
    }

    // Clamp max velocity
    const speed = velocityXZ.length()
    if (speed > MAX_VELOCITY) {
      velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
    }

    // Slide logic
    const canSlide =
      !csTactical &&
      input.sprint &&
      input.crouch &&
      grounded.current &&
      speed > 4 &&
      !slideState.current.active

    if (canSlide) {
      slideState.current = {
        active: true,
        startTime: now,
        startVelXZ: velocityXZ.clone(),
      }
      crouching.current = true
    }

    // Jump logic
    const hasJumpBuffer =
      (input.jumpBuffer.length > 0 &&
        now - input.jumpBuffer[input.jumpBuffer.length - 1] <=
          INPUT_WINDOW_MS) ||
      input.jump

    const canJump =
      grounded.current ||
      coyoteTimeRef.current > 0 ||
      _currentPos.y <= TOTAL_HEIGHT / 2 + 0.1

    // Perfect Jump Boost: check if jump is within timing window after landing
    const timeSinceLand = now - lastLandTime.current
    const isPerfectJump = timeSinceLand <= PERFECT_JUMP_WINDOW && timeSinceLand > 0

    // Use jump stamina from store
    const spendJumpStamina = useGameStore.getState().useJumpStamina

    if (canJump && hasJumpBuffer) {
      const timeSinceCrouchRelease = now - getCrouchReleasedAt()
      if (!csTactical && timeSinceCrouchRelease <= 150) {
        velocityY.current = JUMP_VELOCITY * MOON_JUMP_MULT
        spendJumpStamina()
      } else if (!csTactical && slideState.current.active) {
        velocityXZ.multiplyScalar(SLIDE_BOOST)
        const currentSpeed = velocityXZ.length()
        if (currentSpeed > MAX_VELOCITY) {
          velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
        }
        velocityY.current = JUMP_VELOCITY
        slideState.current.active = false
        spendJumpStamina()
      } else {
        velocityY.current = (!csTactical && isPerfectJump) ? JUMP_VELOCITY * PERFECT_JUMP_BOOST : JUMP_VELOCITY
        spendJumpStamina()
      }
      input.jumpBuffer.length = 0
      coyoteTimeRef.current = 0
      grounded.current = false
      doubleJumpUsed.current = false
    } else if (!csTactical && !grounded.current && hasJumpBuffer && !doubleJumpUsed.current) {
      // Double Jump
      if (PHYSICS.doubleJumpEnabled) {
        const hasStamina = spendJumpStamina()
        if (hasStamina) {
          velocityY.current = JUMP_VELOCITY * DOUBLE_JUMP_BOOST
          doubleJumpUsed.current = true
          input.jumpBuffer.length = 0
        }
      }
    }

    // Wall Jump: detect nearby walls via raycast in strafe directions.
    // MAP_OBSTACLES only describes the competitive map, so other modes would
    // otherwise wall jump off invisible geometry.
    if (
      mode === 'training' &&
      !grounded.current &&
      hasJumpBuffer &&
      WALL_JUMP_ENABLED
    ) {
      const timeSinceWallJump = now - lastWallJumpTime.current
      if (timeSinceWallJump >= WALL_JUMP_COOLDOWN) {
        // Cast rays left and right relative to camera yaw
        const yaw = _euler.y
        const rayDirs = [
          { x: -Math.cos(yaw), z: Math.sin(yaw) },   // left
          { x: Math.cos(yaw), z: -Math.sin(yaw) },    // right
          { x: -Math.sin(yaw), z: -Math.cos(yaw) },   // forward-left
          { x: Math.sin(yaw), z: Math.cos(yaw) },     // forward-right
        ]
        for (const dir of rayDirs) {
          const rayOrigin = { x: _currentPos.x, y: _currentPos.y, z: _currentPos.z }
          const rayTarget = { x: rayOrigin.x + dir.x * WALL_JUMP_RAY_DIST, y: rayOrigin.y, z: rayOrigin.z + dir.z * WALL_JUMP_RAY_DIST }
          // Simple AABB ray check against map obstacles
          let hitWall = false
          for (const obs of MAP_OBSTACLES) {
            if (rayVsAABB(rayOrigin, rayTarget, obs)) {
              hitWall = true
              break
            }
          }
          if (hitWall) {
            const hasStamina = spendJumpStamina()
            if (hasStamina) {
              velocityY.current = WALL_JUMP_BOOST
              // Push AWAY from wall — ray dir points toward wall, invert it
              velocityXZ.x -= dir.x * WALL_JUMP_HORIZONTAL
              velocityXZ.y -= dir.z * WALL_JUMP_HORIZONTAL
              // Clamp to max velocity
              const spd = velocityXZ.length()
              if (spd > MAX_VELOCITY) velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
              lastWallJumpTime.current = now
              input.jumpBuffer.length = 0
              break
            }
          }
        }
      }
    }

    if (!input.jump && velocityY.current > 0) {
      velocityY.current *= 0.88
    }

    // Short-hop (only when ADS is pressed while in air, not when holding ADS)
    if (!grounded.current && adsPressedInAir.current) {
      velocityY.current = Math.min(
        velocityY.current,
        JUMP_VELOCITY * SHORT_HOP_MULT
      )
      adsPressedInAir.current = false
    }

    // End slide
    if (slideState.current.active) {
      const slideElapsed = (now - slideState.current.startTime) / 1000
      if (slideElapsed > SLIDE_DURATION) {
        slideState.current.active = false
      }
    }

    // Gravity
    if (!grounded.current) {
      coyoteTimeRef.current = Math.max(0, coyoteTimeRef.current - dt)
      velocityY.current -= GRAVITY * dt
      // Clamp fall speed
      velocityY.current = Math.max(velocityY.current, -30)
    } else {
      coyoteTimeRef.current = 0.12
      // Keep grounded velocity small downward for ground detection
      velocityY.current = -2
      // Regen jump stamina while grounded
      useGameStore.getState().regenJumpStamina(PHYSICS.jumpStaminaRegen * dt)
    }

    // Movement
    const moveX = velocityXZ.x * dt
    const moveZ = velocityXZ.y * dt
    const moveY = velocityY.current * dt

    _desiredMovement.set(moveX, moveY, moveZ)

    // Character controller collision
    const collider = rb.collider(0)
    if (collider) {
      controller.computeColliderMovement(collider, _desiredMovement)
    }

    const result = controller.computedMovement()
    _currentPos.add(result)

    // Keep the player inside the playable area of the current mode
    const bounds = getBounds(mode)
    _currentPos.x = THREE.MathUtils.clamp(_currentPos.x, bounds.minX, bounds.maxX)
    _currentPos.z = THREE.MathUtils.clamp(_currentPos.z, bounds.minZ, bounds.maxZ)

    // Ground detection
    if (velocityY.current > 0) {
      grounded.current = false
    } else if (controller.computedGrounded()) {
      if (!grounded.current && velocityY.current < 0) {
        velocityY.current = 0
        lastLandTime.current = now
        doubleJumpUsed.current = false
        // Regen stamina on landing
        useGameStore.getState().regenJumpStamina(1)
      }
      grounded.current = true
      adsPressedInAir.current = false
    } else {
      grounded.current = false
    }

    // Prevent falling below ground
    if (_currentPos.y < TOTAL_HEIGHT / 2) {
      _currentPos.y = TOTAL_HEIGHT / 2
      if (velocityY.current < 0) velocityY.current = 0
      grounded.current = true
      coyoteTimeRef.current = 0.12
      adsPressedInAir.current = false
    }

    // Offline: update local store only (no server)
    if (mode === 'offline5v5') {
      useOffline5v5Store.getState().setLocalPos(_currentPos.x, _currentPos.z, _euler.y);
    }

    // Update last input for weapon sway and spread
    useGameStore.getState().setLastInput({
      forward: input.forward,
      backward: input.backward,
      left: input.left,
      right: input.right,
      sprint: input.sprint,
      slide: slideState.current.active,
      airborne: !grounded.current,
    })

    // Update position
    rb.setNextKinematicTranslation({
      x: _currentPos.x,
      y: _currentPos.y,
      z: _currentPos.z,
    })

    // Update crouch state
    crouching.current = input.crouch || slideState.current.active

    // Camera height
    const targetEyeHeight = crouching.current
      ? EYE_HEIGHT_CROUCH
      : EYE_HEIGHT_STAND
    const targetCameraY = _currentPos.y + targetEyeHeight

    // Smooth camera height transition — dt-based (frame-rate independent)
    const bobOffset =
      grounded.current && speed > 0.5 && !slideState.current.active
        ? Math.sin(headBob.current) * (input.sprint ? 0.045 : 0.03)
        : 0
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetCameraY + bobOffset,
      1 - Math.exp(-12 * dt)
    )

    // Smooth FOV transition: AWP=22 (sniper scope), Rifles=46 (optic zoom), Pistols=54, Sprint=80, Normal=75
    const weaponState = useWeaponStore.getState()
    const isAiming = input.ads || weaponState.isADS
    const targetFov = isAiming
      ? (weaponState.activeWeapon === 'awp'
          ? 22
          : weaponState.activeWeapon === 'ak47' || weaponState.activeWeapon === 'm4a1' || weaponState.activeWeapon === 'mp5'
          ? 46
          : 54)
      : input.sprint ? 80 : 75
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-12 * dt))
      camera.updateProjectionMatrix()
    }

    // Head bobbing
    if (grounded.current && speed > 0.5 && !slideState.current.active) {
      const bobSpeed = input.sprint ? 12 : 6
      headBob.current += dt * bobSpeed
    } else {
      headBob.current = 0
    }

    // Camera position XZ
    camera.position.x = _currentPos.x
    camera.position.z = _currentPos.z

    // Update Web Audio listener to match camera for spatial audio
    _lookTarget.set(
      camera.position.x - Math.sin(_euler.y),
      camera.position.y,
      camera.position.z - Math.cos(_euler.y)
    )
    updateAudioListener(
      camera.position.x, camera.position.y, camera.position.z,
      _lookTarget.x, _lookTarget.y, _lookTarget.z
    )

    // Auto-pickup dropped bomb (T team only)
    if (!localHasBomb && droppedBombPos) {
      const dx = _currentPos.x - droppedBombPos.x
      const dz = _currentPos.z - droppedBombPos.z
      if (Math.sqrt(dx * dx + dz * dz) < 2) {
        sendPickupBomb()
      }
    }

    if (mode === 'l4d') {
      const st = useL4DStore.getState()
      const me = st.survivors[0]
      if (me?.grabbedBy) {
        const smoker = st.infected.find(i => i.id === me.grabbedBy && !i.isDead)
        if (smoker) {
          const dx = smoker.x - _currentPos.x
          const dz = smoker.z - _currentPos.z
          const d = Math.hypot(dx, dz)
          if (d > 1.4) {
            _currentPos.x += (dx / d) * 2.5 * dt
            _currentPos.z += (dz / d) * 2.5 * dt
            rb.setNextKinematicTranslation({ x: _currentPos.x, y: _currentPos.y, z: _currentPos.z })
            camera.position.x = _currentPos.x
            camera.position.z = _currentPos.z
          }
        }
      }
      st.updateSurvivor('survivor_0', s => ({ ...s, x: _currentPos.x, z: _currentPos.z }))
    }

    if (mode === 'offline5v5') {
      useOffline5v5Store.getState().setLocalPos(_currentPos.x, _currentPos.z, lookYaw.current)
    }
  })

  return (
    <group>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={initialSpawn}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
      </RigidBody>
    </group>
  )
}
