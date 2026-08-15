import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  RigidBody,
  useRapier,
  RapierRigidBody,
  CapsuleCollider,
} from '@react-three/rapier'
import * as THREE from 'three'
import { PHYSICS, SPAWN, MAP_OBSTACLES } from '@cs-game/shared'
import { updateAudioListener } from '../../components/AudioManager'
import { usePlayerInput } from '../../hooks/usePlayerInput'
import { useNetwork } from '../../hooks/useNetwork'
import { useGameStore } from '../../stores/useGameStore'
import { useNetworkStore } from '../../stores/useNetworkStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useWeaponStore, type WeaponKey } from '../../stores/useWeaponStore'
import { useKillCamStore } from '../../stores/useKillCamStore'

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

const POINTER_LOCK_SENSITIVITY = 0.002

// Simple ray vs AABB intersection for wall jump detection
function rayVsAABB(
  origin: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): boolean {
  const dx = target.x - origin.x
  const dy = target.y - origin.y
  const dz = target.z - origin.z
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (len === 0) return false
  const invDx = dx / len
  const invDy = dy / len
  const invDz = dz / len

  let tmin = -Infinity
  let tmax = Infinity

  if (invDx !== 0) {
    const t1 = (box.minX - origin.x) / invDx
    const t2 = (box.maxX - origin.x) / invDx
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.x < box.minX || origin.x > box.maxX) return false

  if (invDy !== 0) {
    const t1 = (box.minY - origin.y) / invDy
    const t2 = (box.maxY - origin.y) / invDy
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.y < box.minY || origin.y > box.maxY) return false

  if (invDz !== 0) {
    const t1 = (box.minZ - origin.z) / invDz
    const t2 = (box.maxZ - origin.z) / invDz
    tmin = Math.max(tmin, Math.min(t1, t2))
    tmax = Math.min(tmax, Math.max(t1, t2))
  } else if (origin.z < box.minZ || origin.z > box.maxZ) return false

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
  const nickname = useGameStore(s => s.nickname)
  const { sendPlayerInput, reconcile, lastSnapshot } = useNetwork(nickname)
  const { slideControl } = useSettingsStore()
  const localIsDead = useNetworkStore(s => s.localIsDead)
  const remotePlayers = useNetworkStore(s => s.remotePlayers)
  const localWeapon = useNetworkStore(s => s.localWeapon)
  const localHasBomb = useNetworkStore(s => s.localHasBomb)
  const droppedBombPos = useNetworkStore(s => s.droppedBombPos)
  const sendPickupBomb = useNetworkStore(s => s.sendPickupBomb)

  // Spawn at server position when available, otherwise a safe spawn point.
  // Never spawn at (0,0,0): the Mid Box container sits at the map center and
  // the character controller would be stuck inside its collider.
  const [initialSpawn] = useState<[number, number, number]>(() => {
    const net = useNetworkStore.getState()
    if (net.localX !== 0 || net.localZ !== 0) {
      return [net.localX, TOTAL_HEIGHT / 2 + 0.01, net.localZ]
    }
    return [SPAWN.T.x, TOTAL_HEIGHT / 2 + 0.01, SPAWN.T.z]
  })

  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const controllerRef = useRef<any>(null)
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!localIsDead) return
      const k = parseInt(e.key, 10)
      if (!isNaN(k) && k >= 1 && k <= 9) {
        const playerArray = Array.from(remotePlayers.keys())
        const idx = Math.min(k - 1, Math.max(0, playerArray.length - 1))
        useGameStore.getState().setSpectatorTargetIndex(idx)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [localIsDead, remotePlayers])

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

  // Mouse look: rotates the camera only while the pointer is locked.
  // Uses quaternion-based yaw/pitch to avoid Euler gimbal lock.
  useEffect(() => {
    let locked = false

    const onPointerLockChange = () => {
      locked = !!document.pointerLockElement
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!locked) return
      const sens =
        POINTER_LOCK_SENSITIVITY * useSettingsStore.getState().sensitivity

      // Use a single Euler-based yaw/pitch update for a more natural and stable FPS feel.
      const current = new THREE.Euler().setFromQuaternion(
        camera.quaternion,
        'YXZ'
      )

      current.y -= e.movementX * sens
      current.x -= e.movementY * sens
      current.x = THREE.MathUtils.clamp(current.x, -1.55, 1.55)
      current.z = 0

      camera.quaternion.setFromEuler(current)
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousemove', onMouseMove)
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [camera])

  // Re-equip when server changes our weapon (buy confirmation / round reset)
  useEffect(() => {
    const active = useWeaponStore.getState().activeWeapon
    if (localWeapon && active !== localWeapon) {
      useWeaponStore.getState().equipWeapon(localWeapon as WeaponKey)
    }
  }, [localWeapon])

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

    if (localIsDead) {
      // Kill cam replay
      const killCam = useKillCamStore.getState()
      if (killCam.isReplaying) {
        const frame = killCam.getReplayFrame(now)
        if (frame) {
          camera.position.set(frame.x, frame.y + EYE_HEIGHT_STAND, frame.z)
          _lookTarget.set(
            frame.x - Math.sin(frame.rotationY),
            frame.y + EYE_HEIGHT_STAND,
            frame.z - Math.cos(frame.rotationY)
          )
          camera.lookAt(_lookTarget)
          return
        }
        // Kill cam finished, fall through to spectator
      }

      // Normal spectator mode
      const playerArray = Array.from(remotePlayers.values())
      if (playerArray.length > 0) {
        const targetIdx = useGameStore.getState().spectatorTargetIndex
        const safeIdx = Math.max(0, Math.min(targetIdx, playerArray.length - 1))
        const target = playerArray[safeIdx]
        if (target) {
          _currentPos.set(target.x, target.y + EYE_HEIGHT_STAND, target.z)
          camera.position.lerp(_currentPos, 0.1)
          _lookTarget.set(
            target.x - Math.sin(target.rotationY),
            target.y + EYE_HEIGHT_STAND,
            target.z - Math.cos(target.rotationY)
          )
          camera.lookAt(_lookTarget)
        }
      }
      return
    }

    const input = getInput()
    const controller = controllerRef.current
    const rb = rigidBodyRef.current
    if (!controller || !rb) return

    const pos = rb.translation()
    _currentPos.set(pos.x, pos.y, pos.z)

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

      // Auto-equip default weapon
      if (!weaponEquipped.current) {
        weaponEquipped.current = true
        useWeaponStore.getState().equipWeapon('deagle')
      }
      return
    }

    // Server reconciliation
    if (lastSnapshot) {
      const reconciled = reconcile(
        { x: _currentPos.x, y: _currentPos.y, z: _currentPos.z },
        { x: lastSnapshot.x, y: lastSnapshot.y, z: lastSnapshot.z }
      )
      _currentPos.set(reconciled.x, reconciled.y, reconciled.z)
    }

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

    // Apply slide speed
    if (slideState.current.active) {
      const slideElapsed = (now - slideState.current.startTime) / 1000
      const slideProgress = Math.min(slideElapsed / SLIDE_DURATION, 1)
      const slideControlFactor = slideControl / 10
      const slideEndSpeed = THREE.MathUtils.lerp(
        SPRINT_SPEED,
        2 + slideControlFactor * 3,
        slideProgress
      )
      targetSpeed = THREE.MathUtils.lerp(
        SPRINT_SPEED,
        slideEndSpeed,
        slideProgress
      )
    }

    // Calculate desired velocity XZ with smoother acceleration / deceleration
    const desiredMove = new THREE.Vector2()
    if (direction.lengthSq() > 0.001) {
      direction.normalize()
      desiredMove.set(
        direction.x * targetSpeed * strafeMult,
        direction.z * targetSpeed * strafeMult
      )
      const accel = grounded.current ? 10 : 5
      moveVelocityRef.current.lerp(desiredMove, 1 - Math.exp(-accel * dt))
    } else {
      const decel = grounded.current ? 14 : 6
      moveVelocityRef.current.lerp(
        new THREE.Vector2(0, 0),
        1 - Math.exp(-decel * dt)
      )
    }
    velocityXZ.copy(moveVelocityRef.current)

    // Apply friction
    let friction: number = PHYSICS.friction.walk
    if (input.sprint) friction = PHYSICS.friction.sprint
    if (slideState.current.active) friction = PHYSICS.friction.slide
    if (!grounded.current) friction = PHYSICS.friction.air

    if (friction > 0 && grounded.current && direction.lengthSq() < 0.001) {
      const frictionFactor = Math.max(0, 1 - friction * dt)
      velocityXZ.multiplyScalar(frictionFactor)
      moveVelocityRef.current.multiplyScalar(frictionFactor)
    }

    if (velocityXZ.length() < 0.06) {
      velocityXZ.set(0, 0)
      moveVelocityRef.current.set(0, 0)
    }

    // Air strafing
    if (!grounded.current && direction.lengthSq() > 0.001) {
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
    if (slideState.current.active && direction.lengthSq() > 0.001) {
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
    const useJumpStamina = useGameStore.getState().useJumpStamina

    if (canJump && hasJumpBuffer) {
      const timeSinceCrouchRelease = now - getCrouchReleasedAt()
      if (timeSinceCrouchRelease <= 150) {
        velocityY.current = JUMP_VELOCITY * MOON_JUMP_MULT
        useJumpStamina()
      } else if (slideState.current.active) {
        velocityXZ.multiplyScalar(SLIDE_BOOST)
        const currentSpeed = velocityXZ.length()
        if (currentSpeed > MAX_VELOCITY) {
          velocityXZ.normalize().multiplyScalar(MAX_VELOCITY)
        }
        velocityY.current = JUMP_VELOCITY
        slideState.current.active = false
        useJumpStamina()
      } else {
        // Perfect Jump Boost
        velocityY.current = isPerfectJump ? JUMP_VELOCITY * PERFECT_JUMP_BOOST : JUMP_VELOCITY
        useJumpStamina()
      }
      input.jumpBuffer.length = 0
      coyoteTimeRef.current = 0
      grounded.current = false
      doubleJumpUsed.current = false
    } else if (!grounded.current && hasJumpBuffer && !doubleJumpUsed.current) {
      // Double Jump
      const hasStamina = useJumpStamina()
      if (hasStamina && PHYSICS.doubleJumpEnabled) {
        velocityY.current = JUMP_VELOCITY * DOUBLE_JUMP_BOOST
        doubleJumpUsed.current = true
        input.jumpBuffer.length = 0
      }
    }

    // Wall Jump: detect nearby walls via raycast in strafe directions
    if (!grounded.current && hasJumpBuffer && WALL_JUMP_ENABLED) {
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
            const hasStamina = useJumpStamina()
            if (hasStamina) {
              velocityY.current = WALL_JUMP_BOOST
              // Push away from wall
              velocityXZ.x += dir.x * WALL_JUMP_HORIZONTAL
              velocityXZ.y += dir.z * WALL_JUMP_HORIZONTAL
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

    // Strict wall boundary clamping (-29.2 to 29.2 on X, -19.2 to 19.2 on Z)
    _currentPos.x = THREE.MathUtils.clamp(_currentPos.x, -29.2, 29.2)
    _currentPos.z = THREE.MathUtils.clamp(_currentPos.z, -19.2, 19.2)

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

    // Send input to server
    sendPlayerInput({
      forward: input.forward,
      backward: input.backward,
      left: input.left,
      right: input.right,
      jump: input.jump,
      sprint: input.sprint,
      crouch: input.crouch,
      rotationY: _euler.y,
    })

    // Update last input for weapon sway
    useGameStore.getState().setLastInput({
      forward: input.forward,
      backward: input.backward,
      left: input.left,
      right: input.right,
      sprint: input.sprint,
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

    // Smooth camera height transition
    const bobOffset =
      grounded.current && speed > 0.5 && !slideState.current.active
        ? Math.sin(headBob.current) * (input.sprint ? 0.045 : 0.03)
        : 0
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetCameraY + bobOffset,
      0.18
    )

    // Smooth FOV transition (ADS: 60, Sprint: 80, Normal: 75)
    const targetFov = input.ads ? 60 : input.sprint ? 80 : 75
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1)
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
