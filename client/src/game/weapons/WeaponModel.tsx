import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { WEAPONS } from '@cs-game/shared'
import { useWeaponStore } from '../../stores/useWeaponStore'
import { useGameStore } from '../../stores/useGameStore'
import { WeaponAnimator } from './WeaponAnimator'
import { gameEvents, type GameEvents } from '../../lib/gameEvents'
import {
  WEAPON_POSITIONS,
  WEAPON_ROTATIONS,
  ADS_POSITIONS,
  DEAGLE_HANDS,
} from './weaponRig'

const weaponAnimator = new WeaponAnimator()

// Procedural studio env map so metalness looks good without external HDR assets
function useStudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envMap
    return () => {
      envMap.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
}

export function WeaponModel() {
  const groupRef = useRef<THREE.Group>(null)
  const recoilGroupRef = useRef<THREE.Group>(null)
  const { activeWeapon, recoilOffset, isReloading, isSwitching, isADS } =
    useWeaponStore()

  useStudioEnvironment()

  const isMoving = useRef(false)
  const moveIntensity = useRef(0)
  const lastSwingTime = useRef(0)
  const swingProgress = useRef(0)
  const mouseDelta = useRef({ x: 0, y: 0 })
  const adsProgress = useRef(0)

  useEffect(() => {
    const checkMovement = () => {
      const input = useGameStore.getState().lastInput
      if (input) {
        const moving =
          input.forward || input.backward || input.left || input.right
        const sprinting = input.sprint
        isMoving.current = moving
        moveIntensity.current = sprinting ? 1.5 : moving ? 1.0 : 0
      }
    }
    const interval = setInterval(checkMovement, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseDelta.current.x += e.movementX
      mouseDelta.current.y += e.movementY
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const now = performance.now()
        if (now - lastSwingTime.current > 500) {
          lastSwingTime.current = now
          swingProgress.current = 1
        }
      }
    }
    window.addEventListener('mousedown', handleMouseDown)
    return () => window.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Sync reload animation duration with weapon stats
  useEffect(() => {
    if (isReloading && activeWeapon) {
      const stats = WEAPONS[activeWeapon]
      const duration = stats?.reload || 2.2
      weaponAnimator.play('reload', duration)
    } else if (!isReloading) {
      if (weaponAnimator.getCurrentClip() === 'reload') {
        weaponAnimator.stop()
      }
    }
  }, [isReloading, activeWeapon])

  useEffect(() => {
    if (isSwitching) {
      weaponAnimator.play('draw')
    }
  }, [isSwitching])

  useFrame(({ camera }, dt) => {
    if (!groupRef.current || !recoilGroupRef.current || !activeWeapon) return

    weaponAnimator.update(dt)
    weaponAnimator.updateBob(dt, moveIntensity.current * 5, moveIntensity.current > 1, isMoving.current)
    weaponAnimator.updateKick(dt)

    // Update sway and decay mouse delta
    weaponAnimator.updateSway(dt, mouseDelta.current.x, mouseDelta.current.y)
    mouseDelta.current.x = THREE.MathUtils.lerp(mouseDelta.current.x, 0, dt * 15)
    mouseDelta.current.y = THREE.MathUtils.lerp(mouseDelta.current.y, 0, dt * 15)

    if (recoilOffset.y > 0) {
      weaponAnimator.addKick(recoilOffset.x, recoilOffset.y, 0)
    }

    const isKnife = activeWeapon === 'knife' || activeWeapon === 'combatknife'
    const swingAngle = isKnife ? swingProgress.current * 1.2 : 0
    const swingY = isKnife ? swingProgress.current * 0.15 : 0

    if (swingProgress.current > 0) {
      swingProgress.current *= 0.85
      if (swingProgress.current < 0.01) swingProgress.current = 0
    }

    // Smooth ADS interpolation
    adsProgress.current = THREE.MathUtils.lerp(
      adsProgress.current,
      isADS && !isReloading && !isSwitching ? 1 : 0,
      dt * 14
    )
    const adsFactor = adsProgress.current

    const basePos = WEAPON_POSITIONS[activeWeapon] || [0.22, -0.22, -0.40]
    const baseRot = WEAPON_ROTATIONS[activeWeapon] || [0, 0, 0]
    const adsPos = ADS_POSITIONS[activeWeapon] || [0, -0.145, -0.30]

    groupRef.current.position.copy(camera.position)
    groupRef.current.quaternion.copy(camera.quaternion)

    const posX = THREE.MathUtils.lerp(basePos[0], adsPos[0], adsFactor) + weaponAnimator.position.x
    const posY = THREE.MathUtils.lerp(basePos[1], adsPos[1], adsFactor) + weaponAnimator.position.y + swingY
    const posZ = THREE.MathUtils.lerp(basePos[2], adsPos[2], adsFactor) + weaponAnimator.position.z

    const rotX = THREE.MathUtils.lerp(baseRot[0], 0, adsFactor) + weaponAnimator.rotation.x + swingAngle
    const rotY = THREE.MathUtils.lerp(baseRot[1], 0, adsFactor) + weaponAnimator.rotation.y
    const rotZ = THREE.MathUtils.lerp(baseRot[2], 0, adsFactor) + weaponAnimator.rotation.z

    recoilGroupRef.current.position.set(posX, posY, posZ)
    recoilGroupRef.current.rotation.set(rotX, rotY, rotZ)
  })

  if (!activeWeapon) return null

  return (
    <group ref={groupRef} name="weapon-model-parent">
      <group ref={recoilGroupRef} name="weapon-model-recoil">
        {activeWeapon === 'ak47' && <AK47Model />}
        {activeWeapon === 'm4a1' && <M4A1Model />}
        {activeWeapon === 'awp' && <AWPModel />}
        {activeWeapon === 'deagle' && <DeagleModel />}
        {activeWeapon === 'mp5' && <MP5Model />}
        {activeWeapon === 'glock' && <GlockModel />}
        {activeWeapon === 'tec9' && <Tec9Model />}
        {activeWeapon === 'autopistol' && <AutoPistolModel />}
        {activeWeapon === 'knife' && <KnifeModel />}
        {activeWeapon === 'combatknife' && <CombatKnifeModel />}
        {activeWeapon === 'he' && <GrenadeModel type="he" />}
        {activeWeapon === 'smoke' && <GrenadeModel type="smoke" />}
        {activeWeapon === 'flash' && <GrenadeModel type="flash" />}
      </group>
    </group>
  )
}

// ─── AK-47 ────────────────────────────────────────────────────────
// Real AK-47: wood furniture, stamped steel receiver, curved mag
function AK47Model() {
  return (
    <group>
      {/* Receiver body — stamped steel look */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.052, 0.065, 0.38]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Receiver rear — tapers down toward stock */}
      <mesh position={[0, -0.004, 0.16]} rotation={[0.035, 0, 0]}>
        <boxGeometry args={[0.05, 0.055, 0.1]} />
        <meshStandardMaterial color="#2f2f2f" metalness={0.55} roughness={0.42} />
      </mesh>
      {/* Receiver top cover */}
      <mesh position={[0, 0.038, -0.02]}>
        <boxGeometry args={[0.048, 0.012, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Top cover charging-handle channel */}
      <mesh position={[0, 0.045, -0.02]}>
        <boxGeometry args={[0.028, 0.002, 0.22]} />
        <meshStandardMaterial color="#262626" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Barrel — tapered profile */}
      <mesh position={[0, 0.008, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.0125, 0.26, 12]} />
        <meshStandardMaterial color="#1e1e1e" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Barrel front section — thinner */}
      <mesh position={[0, 0.008, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0075, 0.009, 0.1, 12]} />
        <meshStandardMaterial color="#1c1c1c" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Gas tube — above barrel */}
      <mesh position={[0, 0.027, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0075, 0.008, 0.2, 10]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Gas tube handguard cap */}
      <mesh position={[0, 0.027, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.012, 10]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Front sight block */}
      <mesh position={[0, 0.035, -0.405]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.03, 10]} />
        <meshStandardMaterial color="#404040" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.06, -0.405]}>
        <boxGeometry args={[0.005, 0.018, 0.005]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Front sight ears */}
      <mesh position={[0.008, 0.048, -0.405]}>
        <boxGeometry args={[0.004, 0.02, 0.012]} />
        <meshStandardMaterial color="#484848" />
      </mesh>
      <mesh position={[-0.008, 0.048, -0.405]}>
        <boxGeometry args={[0.004, 0.02, 0.012]} />
        <meshStandardMaterial color="#484848" />
      </mesh>
      {/* Rear sight block — leaf sight on the rear of the gas tube */}
      <mesh position={[0, 0.044, -0.055]}>
        <boxGeometry args={[0.03, 0.014, 0.028]} />
        <meshStandardMaterial color="#3c3c3c" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Rear sight notch */}
      <mesh position={[0, 0.053, -0.055]}>
        <boxGeometry args={[0.01, 0.006, 0.02]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      {/* Rear sight ears */}
      <mesh position={[0.012, 0.052, -0.055]}>
        <boxGeometry args={[0.005, 0.014, 0.02]} />
        <meshStandardMaterial color="#484848" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[-0.012, 0.052, -0.055]}>
        <boxGeometry args={[0.005, 0.014, 0.02]} />
        <meshStandardMaterial color="#484848" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Muzzle brake — angled frustum */}
      <mesh position={[0, 0.008, -0.425]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0145, 0.012, 0.045, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Muzzle brake slanted tip */}
      <mesh position={[0, 0.008, -0.447]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.0115, 0.008, 12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Handguard — wood, tapered forward */}
      <mesh position={[0, -0.012, -0.13]} rotation={[0.018, 0, 0]}>
        <boxGeometry args={[0.046, 0.028, 0.16]} />
        <meshStandardMaterial color="#7a4a24" roughness={0.75} />
      </mesh>
      {/* Handguard — upper wood panel */}
      <mesh position={[0, 0.016, -0.13]} rotation={[0.018, 0, 0]}>
        <boxGeometry args={[0.044, 0.02, 0.16]} />
        <meshStandardMaterial color="#8a552a" roughness={0.75} />
      </mesh>
      {/* Handguard ventilation slots */}
      {[0, 1, 2].map(i => (
        <mesh key={`slot-${i}`} position={[0.024, -0.012, -0.09 - i * 0.032]}>
          <boxGeometry args={[0.004, 0.014, 0.014]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {[0, 1, 2].map(i => (
        <mesh key={`slotl-${i}`} position={[-0.024, -0.012, -0.09 - i * 0.032]}>
          <boxGeometry args={[0.004, 0.014, 0.014]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Magazine — banana curve built from stacked segments */}
      <mesh position={[0, -0.06, 0.045]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.033, 0.045, 0.052]} />
        <meshStandardMaterial color="#3d3d3d" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.1, 0.06]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.033, 0.048, 0.052]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.142, 0.082]} rotation={[0.27, 0, 0]}>
        <boxGeometry args={[0.033, 0.045, 0.052]} />
        <meshStandardMaterial color="#383838" metalness={0.5} roughness={0.38} />
      </mesh>
      {/* Magazine side ribs */}
      <mesh position={[0.017, -0.1, 0.06]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.003, 0.045, 0.048]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[-0.017, -0.1, 0.06]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.003, 0.045, 0.048]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Magazine floor plate */}
      <mesh position={[0, -0.165, 0.095]} rotation={[0.27, 0, 0]}>
        <boxGeometry args={[0.04, 0.016, 0.058]} />
        <meshStandardMaterial color="#555555" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Magazine spine — rear curve */}
      <mesh position={[-0.014, -0.1, 0.09]} rotation={[0.16, 0, 0]}>
        <boxGeometry args={[0.01, 0.05, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.042, 0.08]}>
        <boxGeometry args={[0.032, 0.016, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.038, 0.08]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.006, 0.02, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Pistol grip — sculpted, slanted rear */}
      <mesh position={[0, -0.07, 0.115]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.028, 0.072, 0.028]} />
        <meshStandardMaterial color="#6b3f1e" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.105, 0.135]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.024, 0.035, 0.024]} />
        <meshStandardMaterial color="#5c3518" roughness={0.7} />
      </mesh>
      {/* Grip checkering */}
      <mesh position={[0.016, -0.09, 0.122]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.004, 0.055, 0.025]} />
        <meshStandardMaterial color="#4c2a12" />
      </mesh>
      <mesh position={[-0.016, -0.09, 0.122]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.004, 0.055, 0.025]} />
        <meshStandardMaterial color="#4c2a12" />
      </mesh>
      {/* Stock — wood with proper taper and rounded heel */}
      <mesh position={[0, 0.002, 0.3]} rotation={[-0.03, 0, 0]}>
        <boxGeometry args={[0.042, 0.05, 0.17]} />
        <meshStandardMaterial color="#7a4a24" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.021, 0.27]} rotation={[-0.03, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.12]} />
        <meshStandardMaterial color="#8a552a" roughness={0.75} />
      </mesh>
      {/* Stock wrist — narrow connection */}
      <mesh position={[0, 0.002, 0.21]} rotation={[-0.03, 0, 0]}>
        <boxGeometry args={[0.036, 0.042, 0.05]} />
        <meshStandardMaterial color="#66401f" roughness={0.75} />
      </mesh>
      {/* Stock comb — cheek */}
      <mesh position={[0, 0.032, 0.3]} rotation={[-0.03, 0, 0]}>
        <boxGeometry args={[0.036, 0.016, 0.15]} />
        <meshStandardMaterial color="#8a552a" roughness={0.75} />
      </mesh>
      {/* Stock butt end — steel plate */}
      <mesh position={[0, 0.002, 0.386]} rotation={[-0.03, 0, 0]}>
        <boxGeometry args={[0.04, 0.06, 0.014]} />
        <meshStandardMaterial color="#484848" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Stock sling mount */}
      <mesh position={[0, -0.026, 0.395]}>
        <boxGeometry args={[0.02, 0.012, 0.02]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Selector lever / safety */}
      <mesh position={[0.03, 0.005, 0.065]}>
        <boxGeometry args={[0.007, 0.026, 0.06]} />
        <meshStandardMaterial color="#333333" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Charging handle */}
      <mesh position={[0.034, 0.022, -0.05]}>
        <boxGeometry args={[0.009, 0.012, 0.05]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Charging handle knob */}
      <mesh position={[0.034, 0.022, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.012, 8]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Dust cover latch */}
      <mesh position={[0, 0.047, 0.085]}>
        <boxGeometry args={[0.015, 0.01, 0.015]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Ejection port */}
      <mesh position={[0.028, 0.028, -0.02]}>
        <boxGeometry args={[0.006, 0.02, 0.045]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      {/* Lower handguard retainer — where the wood meets the barrel */}
      <mesh position={[0, -0.03, -0.205]}>
        <boxGeometry args={[0.03, 0.016, 0.03]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Sling loop under the front sight */}
      <mesh position={[0, -0.012, -0.235]}>
        <boxGeometry args={[0.018, 0.012, 0.018]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── M4A1 ────────────────────────────────────────────────────────
// M4A1-S: carbine with suppressor, rail system, collapsible stock
function M4A1Model() {
  return (
    <group>
      {/* Lower receiver */}
      <mesh position={[0, -0.012, 0.02]}>
        <boxGeometry args={[0.044, 0.04, 0.22]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Upper receiver — flat top */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.046, 0.035, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Picatinny rail — full length top */}
      <mesh position={[0, 0.042, -0.02]}>
        <boxGeometry args={[0.038, 0.008, 0.38]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Rail teeth */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`rail-${i}`} position={[0, 0.048, -0.16 + i * 0.028]}>
          <boxGeometry args={[0.036, 0.004, 0.012]} />
          <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Barrel — cylindrical, under barrel */}
      <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.24, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel profile — thicker section */}
      <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.08, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Front sight base — FSB */}
      <mesh position={[0, 0.025, -0.36]}>
        <boxGeometry args={[0.015, 0.04, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.055, -0.36]}>
        <boxGeometry args={[0.005, 0.02, 0.005]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Gas block */}
      <mesh position={[0, 0.012, -0.32]}>
        <boxGeometry args={[0.022, 0.025, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Suppressor — cylindrical */}
      <mesh position={[0, 0, -0.44]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.14, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Suppressor front cap */}
      <mesh position={[0, 0, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.018, 0.02, 16]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Suppressor rear cap */}
      <mesh position={[0, 0, -0.37]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.015, 0.02, 16]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Handguard — RIS/Picatinny quad rail */}
      <mesh position={[0, -0.008, -0.16]}>
        <boxGeometry args={[0.042, 0.032, 0.14]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Side rail segments */}
      <mesh position={[0.024, -0.008, -0.16]}>
        <boxGeometry args={[0.004, 0.028, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-0.024, -0.008, -0.16]}>
        <boxGeometry args={[0.004, 0.028, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Bottom rail */}
      <mesh position={[0, -0.028, -0.16]}>
        <boxGeometry args={[0.038, 0.004, 0.12]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine — STANAG */}
      <mesh position={[0, -0.08, 0.02]}>
        <boxGeometry args={[0.03, 0.095, 0.042]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine witness window */}
      <mesh position={[0.017, -0.07, 0.02]}>
        <boxGeometry args={[0.003, 0.04, 0.025]} />
        <meshStandardMaterial color="#5a5a5a" />
      </mesh>
      {/* Magazine floor plate */}
      <mesh position={[0, -0.13, 0.02]}>
        <boxGeometry args={[0.032, 0.012, 0.045]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger guard — enlarged */}
      <mesh position={[0, -0.038, 0.06]}>
        <boxGeometry args={[0.028, 0.016, 0.05]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.033, 0.06]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.018, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Pistol grip — A2 style */}
      <mesh position={[0, -0.065, 0.1]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.026, 0.065, 0.028]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      {/* Grip finger groove */}
      <mesh position={[0, -0.055, 0.1]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.03, 0.02, 0.032]} />
        <meshStandardMaterial color="#333333" roughness={0.6} />
      </mesh>
      {/* Collapsible stock — buffer tube */}
      <mesh position={[0, 0.005, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Stock body */}
      <mesh position={[0, 0.005, 0.34]}>
        <boxGeometry args={[0.038, 0.045, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.55} />
      </mesh>
      {/* Stock buttpad */}
      <mesh position={[0, 0.005, 0.4]}>
        <boxGeometry args={[0.036, 0.055, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      {/* Stock adjustment lever */}
      <mesh position={[0, -0.018, 0.32]}>
        <boxGeometry args={[0.015, 0.012, 0.025]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Castle nut */}
      <mesh position={[0, 0.005, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.015, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Forward assist */}
      <mesh position={[0.028, 0.025, 0.06]}>
        <boxGeometry args={[0.012, 0.015, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Brass deflector */}
      <mesh position={[0.028, 0.03, 0.02]}>
        <boxGeometry args={[0.01, 0.02, 0.03]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Ejection port cover */}
      <mesh position={[0.026, 0.025, -0.02]}>
        <boxGeometry args={[0.005, 0.025, 0.04]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Rear sight — flip-up */}
      <mesh position={[0, 0.052, 0.1]}>
        <boxGeometry args={[0.03, 0.012, 0.025]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Bolt catch */}
      <mesh position={[-0.026, -0.01, 0.04]}>
        <boxGeometry args={[0.008, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine release */}
      <mesh position={[0.024, -0.01, 0.04]}>
        <boxGeometry args={[0.008, 0.015, 0.015]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  )
}

// ─── AWP ────────────────────────────────────────────────────────
// Accuracy International AWM/AWP: thumbhole stock, massive scope, bolt action
function AWPModel() {
  return (
    <group>
      {/* Receiver body — olive drab polymer chassis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.048, 0.06, 0.45]} />
        <meshStandardMaterial color="#2d4a2d" roughness={0.55} />
      </mesh>
      {/* Receiver top flat — action */}
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.042, 0.015, 0.35]} />
        <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Barrel — long, free-floating, fluted */}
      <mesh position={[0, 0.005, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.42, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel flutes — longitudinal grooves */}
      {[0, 1, 2, 3].map(i => (
        <mesh
          key={`flute-${i}`}
          position={[0.012 * Math.cos((i * Math.PI) / 2), 0.005 + 0.012 * Math.sin((i * Math.PI) / 2), -0.4]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.002, 0.002, 0.3, 6]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
      {/* Muzzle brake — large cylindrical with side ports */}
      <mesh position={[0, 0.005, -0.64]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.06, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Muzzle brake ports */}
      {[0, 1, 2].map(i => (
        <mesh key={`port-${i}`} position={[0.018, 0.005, -0.6 - i * 0.015]}>
          <boxGeometry args={[0.005, 0.008, 0.008]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Scope body — large objective */}
      <mesh position={[0, 0.06, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.018, 0.24, 14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Scope objective bell — front */}
      <mesh position={[0, 0.06, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.02, 0.04, 14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Scope eyepiece — rear */}
      <mesh position={[0, 0.06, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.02, 0.04, 14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Scope front lens — coated */}
      <mesh position={[0, 0.06, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.005, 16]} />
        <meshStandardMaterial color="#2244aa" metalness={0.8} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Scope rear lens */}
      <mesh position={[0, 0.06, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.005, 16]} />
        <meshStandardMaterial color="#2244aa" metalness={0.8} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Scope mount rings */}
      <mesh position={[0, 0.048, -0.04]}>
        <boxGeometry args={[0.035, 0.012, 0.025]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.048, 0.04]}>
        <boxGeometry args={[0.035, 0.012, 0.025]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Scope mount base */}
      <mesh position={[0, 0.042, 0]}>
        <boxGeometry args={[0.028, 0.008, 0.12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Elevation turret */}
      <mesh position={[0, 0.078, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 10]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Windage turret */}
      <mesh position={[0.02, 0.06, -0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.018, 10]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Turret caps */}
      <mesh position={[0, 0.09, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.006, 10]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Parallax adjustment — side focus */}
      <mesh position={[-0.02, 0.06, -0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.015, 10]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Bolt handle */}
      <mesh position={[0.032, 0.02, 0.08]}>
        <boxGeometry args={[0.012, 0.012, 0.06]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bolt knob */}
      <mesh position={[0.032, 0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.015, 8]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bolt body */}
      <mesh position={[0.028, 0.015, 0.02]}>
        <boxGeometry args={[0.015, 0.015, 0.12]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Magazine — 10-round box */}
      <mesh position={[0, -0.08, 0.06]}>
        <boxGeometry args={[0.034, 0.095, 0.048]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine floor plate */}
      <mesh position={[0, -0.13, 0.06]}>
        <boxGeometry args={[0.036, 0.012, 0.05]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.042, 0.1]}>
        <boxGeometry args={[0.03, 0.015, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.037, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.018, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Pistol grip — ergonomic */}
      <mesh position={[0, -0.068, 0.14]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.026, 0.065, 0.03]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.6} />
      </mesh>
      {/* Grip texture */}
      <mesh position={[0.015, -0.068, 0.14]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.025]} />
        <meshStandardMaterial color="#2a4a2a" />
      </mesh>
      <mesh position={[-0.015, -0.068, 0.14]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.025]} />
        <meshStandardMaterial color="#2a4a2a" />
      </mesh>
      {/* Stock — adjustable, thumbhole style */}
      <mesh position={[0, 0, 0.36]}>
        <boxGeometry args={[0.04, 0.05, 0.2]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.6} />
      </mesh>
      {/* Stock cheek riser */}
      <mesh position={[0, 0.032, 0.36]}>
        <boxGeometry args={[0.036, 0.015, 0.16]} />
        <meshStandardMaterial color="#2a4a2a" roughness={0.6} />
      </mesh>
      {/* Stock buttpad — rubber */}
      <mesh position={[0, 0, 0.47]}>
        <boxGeometry args={[0.038, 0.06, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Stock length-of-pull adjustment */}
      <mesh position={[0, -0.02, 0.46]}>
        <boxGeometry args={[0.02, 0.012, 0.02]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Bipod — folded */}
      <mesh position={[0.018, -0.035, -0.14]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.008, 0.055, 0.008]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.018, -0.035, -0.14]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.008, 0.055, 0.008]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Bipod feet */}
      <mesh position={[0.022, -0.065, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.01, 6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.022, -0.065, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.01, 6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Safety lever */}
      <mesh position={[0.028, 0.015, 0.12]}>
        <boxGeometry args={[0.008, 0.012, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Cheek riser adjustment knob */}
      <mesh position={[-0.022, 0.032, 0.38]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.01, 8]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Dual Desert Eagle ───────────────────────────────────────────
// One .50 AE per hand, firing alternately. Each shot kicks only the pistol that
// fired, so the off hand never sits frozen while the other one recoils.
function DeagleModel() {
  const handRefs = useRef<Array<THREE.Group | null>>([])
  const kicks = useRef<number[]>(DEAGLE_HANDS.map(() => 0))

  useEffect(() => {
    const handleFired = ({ weapon, akimboSide }: GameEvents['weaponFired']) => {
      if (weapon !== 'deagle') return
      const index = DEAGLE_HANDS.findIndex(hand => hand.side === akimboSide)
      if (index !== -1) kicks.current[index] = 1
    }
    gameEvents.on('weaponFired', handleFired)
    return () => gameEvents.off('weaponFired', handleFired)
  }, [])

  useFrame((_, dt) => {
    DEAGLE_HANDS.forEach((hand, index) => {
      const group = handRefs.current[index]
      if (!group) return

      const kick = THREE.MathUtils.damp(kicks.current[index], 0, 11, dt)
      kicks.current[index] = kick < 0.001 ? 0 : kick

      // Slide back, muzzle up, and a small outward twist of the wrist.
      group.position.set(
        hand.position[0],
        hand.position[1] + kick * 0.012,
        hand.position[2] + kick * 0.04
      )
      group.rotation.set(
        hand.rotation[0] + kick * 0.5,
        hand.rotation[1],
        hand.rotation[2] - kick * 0.12 * hand.side
      )
    })
  })

  return (
    <group>
      {DEAGLE_HANDS.map((hand, index) => (
        <group
          key={`deagle-hand-${hand.side}`}
          ref={element => {
            handRefs.current[index] = element
          }}
          position={hand.position}
          rotation={hand.rotation}
          scale={hand.scale}
        >
          <DeaglePistol />
        </group>
      ))}
    </group>
  )
}

function DeaglePistol() {
  return (
    <group>
      {/* Slide — massive, tapered toward muzzle */}
      <mesh position={[0, 0.014, 0.01]}>
        <boxGeometry args={[0.038, 0.05, 0.24]} />
        <meshStandardMaterial color="#CA9C24" metalness={0.85} roughness={0.18} />
      </mesh>
      {/* Slide front — narrows toward the muzzle */}
      <mesh position={[0, 0.014, -0.11]} rotation={[0.02, 0, 0]}>
        <boxGeometry args={[0.034, 0.042, 0.09]} />
        <meshStandardMaterial color="#C8941E" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Slide crown — top chamfer */}
      <mesh position={[0, 0.036, -0.05]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.032, 0.016, 0.2]} />
        <meshStandardMaterial color="#B8860B" metalness={0.8} roughness={0.22} />
      </mesh>
      {/* Slide top serrations */}
      {[0, 1, 2].map(i => (
        <mesh key={`serr-${i}`} position={[0, 0.044, 0.06 + i * 0.014]}>
          <boxGeometry args={[0.033, 0.009, 0.008]} />
          <meshStandardMaterial color="#9a7414" metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
      {/* Rear serrations — angled */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`rserr-${i}`} position={[0, 0.012, 0.1 + i * 0.015]}>
          <boxGeometry args={[0.04, 0.052, 0.006]} />
          <meshStandardMaterial color="#a88218" metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
      {/* Barrel — exposed, under slide */}
      <mesh position={[0, 0.018, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0085, 0.0085, 0.13, 10]} />
        <meshStandardMaterial color="#B8860B" metalness={0.78} roughness={0.2} />
      </mesh>
      {/* Barrel ribs — reinforced flutes */}
      <mesh position={[0, 0.026, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.05, 10]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Muzzle — brake with barrel */}
      <mesh position={[0, 0.018, -0.265]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0145, 0.012, 0.035, 10]} />
        <meshStandardMaterial color="#8B7500" metalness={0.72} roughness={0.25} />
      </mesh>
      {/* Muzzle brake ports — Symmetrical on Left and Right */}
      {[-0.014, 0.014].map(xSide =>
        [0, 1].map(i => (
          <mesh
            key={`port-${xSide}-${i}`}
            position={[xSide, 0.018, -0.25 - i * 0.018]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.003, 0.003, 0.008, 6]} />
            <meshStandardMaterial color="#5c4a00" />
          </mesh>
        ))
      )}
      {/* Muzzle crown */}
      <mesh position={[0, 0.018, -0.285]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.008, 10]} />
        <meshStandardMaterial color="#6B5500" metalness={0.72} roughness={0.25} />
      </mesh>
      {/* Frame — lower, rounded bottom */}
      <mesh position={[0, -0.016, 0.03]}>
        <boxGeometry args={[0.036, 0.024, 0.19]} />
        <meshStandardMaterial color="#B8860B" metalness={0.78} roughness={0.2} />
      </mesh>
      {/* Frame dust-cover rail */}
      <mesh position={[0, -0.028, -0.07]}>
        <boxGeometry args={[0.032, 0.009, 0.09]} />
        <meshStandardMaterial color="#C8941E" metalness={0.72} roughness={0.22} />
      </mesh>
      {/* Accessory rail teeth */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`rail-${i}`} position={[0, -0.034, -0.04 - i * 0.016]}>
          <boxGeometry args={[0.022, 0.005, 0.012]} />
          <meshStandardMaterial color="#a88218" metalness={0.65} roughness={0.3} />
        </mesh>
      ))}
      {/* Trigger guard — squared but contoured */}
      <mesh position={[0, -0.042, 0.06]}>
        <boxGeometry args={[0.033, 0.017, 0.052]} />
        <meshStandardMaterial color="#8B7500" metalness={0.72} roughness={0.25} />
      </mesh>
      {/* Trigger guard — curved front */}
      <mesh position={[0, -0.04, 0.022]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.03, 0.014, 0.035]} />
        <meshStandardMaterial color="#8B7500" metalness={0.72} roughness={0.25} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.037, 0.05]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.005, 0.024, 0.004]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Trigger spur — curved back */}
      <mesh position={[0, -0.028, 0.048]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.015, 0.004]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Grip — ergonomic wraparound, wider at bottom */}
      <mesh position={[0, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.036, 0.075, 0.042]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.72} />
      </mesh>
      {/* Grip lower flare */}
      <mesh position={[0, -0.128, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.042, 0.028, 0.048]} />
        <meshStandardMaterial color="#232323" roughness={0.72} />
      </mesh>
      {/* Grip front strap — finger grooves (Symmetrical Centered on X=0) */}
      {[0, 1, 2].map(i => (
        <mesh key={`groove-${i}`} position={[0, -0.06 - i * 0.016, 0.072]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.037, 0.014, 0.036]} />
          <meshStandardMaterial color="#2f2f2f" roughness={0.75} />
        </mesh>
      ))}
      {/* Grip texture — symmetrical panels on Left and Right */}
      <mesh position={[0.019, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.06, 0.036]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.019, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.06, 0.036]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Grip backstrap */}
      <mesh position={[0, -0.078, 0.107]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.032, 0.065, 0.01]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.75} />
      </mesh>
      {/* Magazine — extended with gold base */}
      <mesh position={[0, -0.135, 0.095]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.03, 0.055, 0.032]} />
        <meshStandardMaterial color="#A88218" metalness={0.75} roughness={0.22} />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.172, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.035, 0.014, 0.038]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Rear sight — adjustable, serrated */}
      <mesh position={[0, 0.048, 0.075]}>
        <boxGeometry args={[0.03, 0.014, 0.022]} />
        <meshStandardMaterial color="#333333" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Rear sight notch */}
      <mesh position={[0, 0.056, 0.075]}>
        <boxGeometry args={[0.012, 0.007, 0.016]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Front sight — ramped blade */}
      <mesh position={[0, 0.052, -0.115]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.009, 0.02, 0.013]} />
        <meshStandardMaterial color="#333333" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Front sight base */}
      <mesh position={[0, 0.042, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Front sight dot */}
      <mesh position={[0, 0.063, -0.115]}>
        <boxGeometry args={[0.005, 0.005, 0.005]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.35} />
      </mesh>
      {/* Hammer — external, large */}
      <mesh position={[0, 0.048, 0.135]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.016, 0.022, 0.013]} />
        <meshStandardMaterial color="#555555" metalness={0.65} roughness={0.3} />
      </mesh>
      {/* Hammer spur */}
      <mesh position={[0, 0.062, 0.14]} rotation={[0.0, 0, 0]}>
        <boxGeometry args={[0.014, 0.012, 0.01]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Slide stops — Symmetrical Left and Right */}
      <mesh position={[0.02, 0.002, 0.045]}>
        <boxGeometry args={[0.006, 0.013, 0.038]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[-0.02, 0.002, 0.045]}>
        <boxGeometry args={[0.006, 0.013, 0.038]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Safety levers — Ambidextrous Left and Right */}
      <mesh position={[0.02, 0.026, 0.09]}>
        <boxGeometry args={[0.006, 0.011, 0.028]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[-0.02, 0.026, 0.09]}>
        <boxGeometry args={[0.006, 0.011, 0.028]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Magazine release — Symmetrical Left and Right */}
      <mesh position={[-0.019, -0.024, 0.048]}>
        <boxGeometry args={[0.006, 0.013, 0.016]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.019, -0.024, 0.048]}>
        <boxGeometry args={[0.006, 0.013, 0.016]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Top slide bevel / ejection cutout — Centered */}
      <mesh position={[0, 0.034, -0.045]}>
        <boxGeometry args={[0.03, 0.014, 0.05]} />
        <meshStandardMaterial color="#7a6300" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Stamping — "DEAGLE" plate */}
      <mesh position={[0, 0.002, -0.01]}>
        <boxGeometry args={[0.031, 0.008, 0.02]} />
        <meshStandardMaterial color="#a8891c" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── MP5 ────────────────────────────────────────────────────────
// Heckler & Koch MP5 — iconic SMG, roller-delayed blowback
function MP5Model() {
  return (
    <group>
      {/* Upper receiver — stamped steel */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.042, 0.045, 0.32]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Lower receiver — polymer housing */}
      <mesh position={[0, -0.018, 0.02]}>
        <boxGeometry args={[0.04, 0.025, 0.24]} />
        <meshStandardMaterial color="#333333" metalness={0.3} roughness={0.55} />
      </mesh>
      {/* Barrel — short, threaded */}
      <mesh position={[0, 0.005, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.16, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel trunnion */}
      <mesh position={[0, 0.005, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.04, 10]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Muzzle — tri-lug */}
      <mesh position={[0, 0.005, -0.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.011, 0.03, 10]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Front sight hood */}
      <mesh position={[0, 0.035, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.04, -0.22]}>
        <boxGeometry args={[0.004, 0.015, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight drum */}
      <mesh position={[0, 0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rear sight apertures */}
      <mesh position={[0, 0.04, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Handguard — slimline */}
      <mesh position={[0, -0.008, -0.1]}>
        <boxGeometry args={[0.04, 0.032, 0.12]} />
        <meshStandardMaterial color="#383838" roughness={0.6} />
      </mesh>
      {/* Handguard texture lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`hg-${i}`} position={[0.022, -0.008, -0.06 - i * 0.02]}>
          <boxGeometry args={[0.003, 0.025, 0.008]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
      ))}
      {/* Magazine — curved 9mm */}
      <mesh position={[0, -0.075, 0.02]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.025, 0.085, 0.035]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine ribs */}
      <mesh position={[0.014, -0.075, 0.02]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.003, 0.075, 0.03]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[-0.014, -0.075, 0.02]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.003, 0.075, 0.03]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Magazine floor plate */}
      <mesh position={[0, -0.12, 0.025]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.028, 0.012, 0.038]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.038, 0.06]}>
        <boxGeometry args={[0.028, 0.015, 0.045]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.033, 0.06]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.018, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Pistol grip — contoured */}
      <mesh position={[0, -0.06, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.026, 0.06, 0.028]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      {/* Grip finger groove */}
      <mesh position={[0, -0.052, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.03, 0.018, 0.032]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Retractable stock — collapsed */}
      <mesh position={[0, 0.015, 0.26]}>
        <boxGeometry args={[0.035, 0.035, 0.12]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Stock rails */}
      <mesh position={[0.016, 0.025, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.1, 6]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.016, 0.025, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.1, 6]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Stock buttpad */}
      <mesh position={[0, 0.015, 0.33]}>
        <boxGeometry args={[0.033, 0.04, 0.015]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      {/* Charging handle — left side */}
      <mesh position={[-0.026, 0.025, 0.04]}>
        <boxGeometry args={[0.008, 0.01, 0.035]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Charging handle knob */}
      <mesh position={[-0.026, 0.025, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.008, 8]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Selector lever */}
      <mesh position={[-0.024, -0.015, 0.04]}>
        <boxGeometry args={[0.006, 0.01, 0.04]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Bolt catch */}
      <mesh position={[-0.024, -0.005, 0.08]}>
        <boxGeometry args={[0.006, 0.012, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine release */}
      <mesh position={[0, -0.055, 0.04]}>
        <boxGeometry args={[0.02, 0.01, 0.015]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Glock-18 ───────────────────────────────────────────────────
// Glock 17/18 — polymer frame, striker-fired (Symmetrical 3D Mesh)
function GlockModel() {
  return (
    <group>
      {/* Slide — blocky, Tenifer finish */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.034, 0.042, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Slide serrations — rear */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`serr-${i}`} position={[0, 0.012, 0.05 + i * 0.012]}>
          <boxGeometry args={[0.035, 0.043, 0.006]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
      {/* Barrel — exposed at muzzle */}
      <mesh position={[0, 0.012, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.08, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.012, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.009, 0.02, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Frame — polymer, lower */}
      <mesh position={[0, -0.015, 0.01]}>
        <boxGeometry args={[0.032, 0.02, 0.16]} />
        <meshStandardMaterial color="#383838" roughness={0.6} />
      </mesh>
      {/* Trigger guard — squared */}
      <mesh position={[0, -0.032, 0.03]}>
        <boxGeometry args={[0.028, 0.015, 0.045]} />
        <meshStandardMaterial color="#333333" roughness={0.6} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.028, 0.03]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.018, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Trigger safety tab */}
      <mesh position={[0, -0.025, 0.028]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.003, 0.008, 0.003]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Grip — polymer, rough texture */}
      <mesh position={[0, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.03, 0.065, 0.032]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.65} />
      </mesh>
      {/* Grip rough texturing — Symmetrical Left and Right */}
      <mesh position={[0.016, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.016, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Grip backstrap */}
      <mesh position={[0, -0.06, 0.075]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.028, 0.055, 0.008]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine — standard */}
      <mesh position={[0, -0.1, 0.07]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.024, 0.05, 0.028]} />
        <meshStandardMaterial color="#333333" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.13, 0.075]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.028, 0.012, 0.032]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Rear sight — polymer */}
      <mesh position={[0, 0.038, 0.04]}>
        <boxGeometry args={[0.022, 0.012, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Front sight — white dot */}
      <mesh position={[0, 0.038, -0.08]}>
        <boxGeometry args={[0.006, 0.012, 0.006]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[0, 0.045, -0.08]}>
        <boxGeometry args={[0.004, 0.004, 0.004]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
      {/* Slide lock levers — Symmetrical Left and Right */}
      <mesh position={[-0.018, 0.0, 0.02]}>
        <boxGeometry args={[0.005, 0.008, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.018, 0.0, 0.02]}>
        <boxGeometry args={[0.005, 0.008, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine release — Symmetrical Left and Right */}
      <mesh position={[-0.017, -0.02, 0.02]}>
        <boxGeometry args={[0.005, 0.01, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.017, -0.02, 0.02]}>
        <boxGeometry args={[0.005, 0.01, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Slide top bevel cut */}
      <mesh position={[0, 0.034, -0.02]}>
        <boxGeometry args={[0.026, 0.008, 0.035]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Accessory rail */}
      <mesh position={[0, -0.022, -0.04]}>
        <boxGeometry args={[0.028, 0.006, 0.04]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
    </group>
  )
}

// ─── Tec-9 ──────────────────────────────────────────────────────
// Intratec Tec-9 — open-bolt, simple construction (Symmetrical 3D Mesh)
function Tec9Model() {
  return (
    <group>
      {/* Receiver — cylindrical upper */}
      <mesh position={[0, 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Receiver — squared lower */}
      <mesh position={[0, -0.012, 0.02]}>
        <boxGeometry args={[0.032, 0.02, 0.18]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Barrel — short, threaded */}
      <mesh position={[0, 0.008, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#111111" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel shroud / perforated jacket */}
      <mesh position={[0, 0.008, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.1, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Barrel shroud holes — Symmetrical on Left and Right */}
      {[-0.013, 0.013].map(xSide =>
        [0, 1, 2].map(i => (
          <mesh
            key={`hole-${xSide}-${i}`}
            position={[xSide, 0.008, -0.1 - i * 0.03]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.003, 0.003, 0.005, 6]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        ))
      )}
      {/* Muzzle */}
      <mesh position={[0, 0.008, -0.27]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.009, 0.02, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.028, -0.16]}>
        <boxGeometry args={[0.008, 0.015, 0.008]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.032, 0.06]}>
        <boxGeometry args={[0.018, 0.012, 0.01]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Magazine — long stick, inserted at angle */}
      <mesh position={[0, -0.075, 0.02]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.022, 0.09, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine ribs */}
      <mesh position={[0.013, -0.075, 0.02]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.003, 0.08, 0.025]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[-0.013, -0.075, 0.02]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.003, 0.08, 0.025]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.12, 0.025]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.025, 0.012, 0.033]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.035, 0.05]}>
        <boxGeometry args={[0.024, 0.015, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.03, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.015, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Grip — polymer, simple */}
      <mesh position={[0, -0.055, 0.07]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.028, 0.055, 0.028]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      {/* Grip texture — Symmetrical Left and Right */}
      <mesh position={[0.016, -0.055, 0.07]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.003, 0.04, 0.022]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.016, -0.055, 0.07]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.003, 0.04, 0.022]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Charging handle — T-shaped */}
      <mesh position={[0, 0.025, 0.04]}>
        <boxGeometry args={[0.03, 0.008, 0.015]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Side rails — Symmetrical Left and Right */}
      <mesh position={[0.02, 0.005, -0.04]}>
        <boxGeometry args={[0.004, 0.01, 0.08]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.02, 0.005, -0.04]}>
        <boxGeometry args={[0.004, 0.01, 0.08]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Safety selector — Symmetrical Left and Right */}
      <mesh position={[-0.019, 0.008, 0.06]}>
        <boxGeometry args={[0.005, 0.01, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.019, 0.008, 0.06]}>
        <boxGeometry args={[0.005, 0.01, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine release */}
      <mesh position={[0, -0.045, 0.04]}>
        <boxGeometry args={[0.018, 0.008, 0.012]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Auto Pistol ────────────────────────────────────────────────
// Auto Pistol — full-auto compact, similar to Glock 18C (Symmetrical 3D Mesh)
function AutoPistolModel() {
  return (
    <group>
      {/* Slide — extended for full-auto */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.034, 0.045, 0.21]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Slide serrations */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`serr-${i}`} position={[0, 0.012, 0.05 + i * 0.012]}>
          <boxGeometry args={[0.035, 0.046, 0.006]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
      ))}
      {/* Barrel — extended */}
      <mesh position={[0, 0.012, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.09, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.012, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.009, 0.02, 8]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Compensator ports — for full-auto control */}
      <mesh position={[0, 0.02, -0.195]}>
        <boxGeometry args={[0.02, 0.012, 0.015]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Frame — polymer */}
      <mesh position={[0, -0.015, 0.01]}>
        <boxGeometry args={[0.032, 0.02, 0.17]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.6} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.035, 0.03]}>
        <boxGeometry args={[0.028, 0.015, 0.045]} />
        <meshStandardMaterial color="#444444" roughness={0.6} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.03, 0.03]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.018, 0.004]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      {/* Grip — ergonomic, polymer */}
      <mesh position={[0, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.03, 0.065, 0.032]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
      </mesh>
      {/* Grip texturing — Symmetrical Left and Right */}
      <mesh position={[0.016, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.016, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Extended magazine */}
      <mesh position={[0, -0.1, 0.07]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.024, 0.055, 0.028]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* Magazine base pad */}
      <mesh position={[0, -0.135, 0.075]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.028, 0.012, 0.032]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.04, 0.04]}>
        <boxGeometry args={[0.022, 0.012, 0.012]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.04, -0.08]}>
        <boxGeometry args={[0.006, 0.012, 0.006]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      {/* Fire selector — Symmetrical Left and Right */}
      <mesh position={[-0.018, 0.01, 0.04]}>
        <boxGeometry args={[0.005, 0.01, 0.025]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.018, 0.01, 0.04]}>
        <boxGeometry args={[0.005, 0.01, 0.025]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Slide lock — Symmetrical Left and Right */}
      <mesh position={[-0.018, 0.0, 0.02]}>
        <boxGeometry args={[0.005, 0.008, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[0.018, 0.0, 0.02]}>
        <boxGeometry args={[0.005, 0.008, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Magazine release — Symmetrical Left and Right */}
      <mesh position={[-0.017, -0.02, 0.02]}>
        <boxGeometry args={[0.005, 0.01, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.017, -0.02, 0.02]}>
        <boxGeometry args={[0.005, 0.01, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Accessory rail */}
      <mesh position={[0, -0.022, -0.04]}>
        <boxGeometry args={[0.028, 0.006, 0.04]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
    </group>
  )
}

// ─── Knife ──────────────────────────────────────────────────────
// Standard combat knife — drop point blade, cylindrical handle
// Blade built from a 2D shape extruded thin so the profile actually tapers.
function makeBladeGeometry(
  bladeLength: number,
  bladeWidth: number,
  tipSlope: number
): THREE.ExtrudeGeometry {
  const w = bladeWidth / 2
  const shape = new THREE.Shape()
  // Start at the guard (handle side)
  shape.moveTo(-w, 0)
  shape.lineTo(w, 0)
  // Up along the cutting edge side
  shape.lineTo(w * 0.82, bladeLength * tipSlope) // start tapering
  shape.lineTo(0, bladeLength) // tip
  // Down the spine side
  shape.lineTo(-w * 0.9, bladeLength * 0.72)
  shape.lineTo(-w, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
  })
  geo.rotateX(-Math.PI / 2) // lay flat along XY → XZ
  geo.translate(0, 0.012, 0)
  return geo
}

function KnifeModel() {
  const bladeGeo = useMemo(() => makeBladeGeometry(0.16, 0.034, 0.62), [])
  return (
    <group>
      {/* Blade — extruded drop point */}
      <mesh geometry={bladeGeo} position={[0, 0.095, 0.008]}>
        <meshStandardMaterial color="#D8D8D8" metalness={0.95} roughness={0.06} />
      </mesh>
      {/* Blade spine — darker top edge */}
      <mesh position={[-0.0085, 0.015, 0.008]}>
        <boxGeometry args={[0.009, 0.014, 0.005]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Blueing stripe down blade */}
      <mesh position={[0, 0.05, 0.008]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.018, 0.11, 0.018]} />
        <meshStandardMaterial color="#77aaff" metalness={0.95} roughness={0.1} transparent opacity={0.25} />
      </mesh>
      {/* Fuller (blood groove) — dark line */}
      <mesh position={[0.004, 0.055, 0.008]}>
        <boxGeometry args={[0.004, 0.1, 0.01]} />
        <meshStandardMaterial color="#667788" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Crossguard */}
      <mesh position={[0, 0.012, 0.008]}>
        <boxGeometry args={[0.05, 0.018, 0.024]} />
        <meshStandardMaterial color="#3c3c3c" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Crossguard quillons — flared */}
      <mesh position={[0.026, 0.012, 0.008]}>
        <boxGeometry args={[0.014, 0.02, 0.02]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-0.026, 0.012, 0.008]}>
        <boxGeometry args={[0.014, 0.02, 0.02]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Handle — cylindrical, tapered butt */}
      <mesh position={[0, -0.055, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.105, 10]} />
        <meshStandardMaterial color="#141414" roughness={0.6} />
      </mesh>
      {/* Handle lanyard grooves */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`groove-${i}`} position={[0, -0.045 - i * 0.014, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0175, 0.0175, 0.012, 10]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
        </mesh>
      ))}
      {/* Handle wrap — paracord texture lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`wrap-${i}`} position={[0, -0.055 + i * 0.018, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.017, 0.017, 0.008, 10]} />
          <meshStandardMaterial color="#1f1f1f" roughness={0.7} />
        </mesh>
      ))}
      {/* Pommel — steel cap */}
      <mesh position={[0, -0.112, 0.008]}>
        <boxGeometry args={[0.022, 0.016, 0.026]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Pommel lanyard hole */}
      <mesh position={[0, -0.115, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.028, 6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  )
}

// ─── Combat Knife ───────────────────────────────────────────────
// Tactical combat knife — tanto style angular blade, G10 scales
function makeTantoGeometry(bladeLength: number, bladeWidth: number): THREE.ExtrudeGeometry {
  const w = bladeWidth / 2
  const shape = new THREE.Shape()
  shape.moveTo(-w, 0)
  shape.lineTo(w, 0)
  // Straight cutting edge, then a jog up to the chisel tip
  shape.lineTo(w * 0.8, bladeLength * 0.82)
  shape.lineTo(w * 0.35, bladeLength * 0.92)
  shape.lineTo(w * 0.35, bladeLength) // chisel point
  shape.lineTo(0, bladeLength)
  // Straight spine down
  shape.lineTo(-w * 0.88, bladeLength * 0.75)
  shape.lineTo(-w * 0.9, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0.012, 0.012)
  return geo
}

function CombatKnifeModel() {
  const bladeGeo = useMemo(() => makeTantoGeometry(0.17, 0.038), [])
  return (
    <group>
      {/* Blade — extruded tanto */}
      <mesh geometry={bladeGeo} position={[0, 0.1, 0.01]}>
        <meshStandardMaterial color="#C8C8C8" metalness={0.92} roughness={0.07} />
      </mesh>
      {/* Blade spine — serrated top edge */}
      <mesh position={[-0.011, 0.02, 0.01]}>
        <boxGeometry args={[0.011, 0.018, 0.006]} />
        <meshStandardMaterial color="#8a8a8a" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Serrated false edge teeth */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`tooth-${i}`} position={[-0.0145, 0.055 + i * 0.022, 0.01]}>
          <boxGeometry args={[0.003, 0.01, 0.008]} />
          <meshStandardMaterial color="#777777" metalness={0.8} roughness={0.15} />
        </mesh>
      ))}
      {/* Fuller — dark groove */}
      <mesh position={[0.003, 0.06, 0.01]}>
        <boxGeometry args={[0.004, 0.1, 0.01]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Guard — tactical one-piece */}
      <mesh position={[0, 0.014, 0.01]}>
        <boxGeometry args={[0.058, 0.02, 0.026]} />
        <meshStandardMaterial color="#2f2f2f" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Guard finger flange */}
      <mesh position={[0.029, 0.014, 0.01]}>
        <boxGeometry args={[0.012, 0.024, 0.022]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* Handle — G10 scales with jimped thumb plate */}
      <mesh position={[0, -0.055, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.017, 0.115, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.62} />
      </mesh>
      {/* Handle hex texture — faceted */}
      <mesh position={[0, -0.055, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.015, 0.115, 6]} />
        <meshStandardMaterial color="#242424" roughness={0.62} />
      </mesh>
      {/* Jimping — thumb serrations behind guard */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`jimp-${i}`} position={[0, -0.015 - i * 0.008, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0205, 0.0205, 0.006, 10]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.7} />
        </mesh>
      ))}
      {/* Handle wrap lines */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`wrap-${i}`} position={[0, -0.075 + i * 0.02, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0185, 0.0185, 0.008, 10]} />
          <meshStandardMaterial color="#262626" roughness={0.7} />
        </mesh>
      ))}
      {/* Lanyard hole */}
      <mesh position={[0, -0.115, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.032, 6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Pommel — glass breaker tip */}
      <mesh position={[0, -0.118, 0.012]}>
        <boxGeometry args={[0.02, 0.014, 0.03]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.128, 0.012]}>
        <boxGeometry args={[0.009, 0.01, 0.009]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.75} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── GRENADE (HE / SMOKE / FLASH) ──────────────────────────────────
function GrenadeModel({ type }: { type: 'he' | 'smoke' | 'flash' }) {
  const mainColor = type === 'he' ? '#2d5a27' : type === 'smoke' ? '#4b5563' : '#1e293b'
  const stripeColor = type === 'he' ? '#ef4444' : type === 'smoke' ? '#f8fafc' : '#38bdf8'

  return (
    <group position={[0, -0.05, 0.05]} rotation={[0.2, 0.1, -0.1]}>
      {/* Grenade Main Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.09, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Top and Bottom Caps */}
      <mesh position={[0, 0.045, 0]}>
        <sphereGeometry args={[0.038, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.045, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.038, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Body Ribs / Texture Grooves for HE Pineapple effect */}
      {type === 'he' &&
        [-0.025, 0, 0.025].map((y, idx) => (
          <mesh key={`rib-${idx}`} position={[0, y, 0]}>
            <torusGeometry args={[0.039, 0.003, 8, 16]} />
            <meshStandardMaterial color="#1f3d1b" roughness={0.7} />
          </mesh>
        ))}

      {/* Identification Stripe */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.0385, 0.0385, 0.012, 16]} />
        <meshStandardMaterial color={stripeColor} roughness={0.4} />
      </mesh>

      {/* Fuse Neck / Screw Collar */}
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 0.03, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Lever (Safety Spoon) */}
      <mesh position={[0.016, 0.045, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.006, 0.09, 0.016]} />
        <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Safety Pin Ring */}
      <mesh position={[-0.022, 0.075, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.012, 0.002, 8, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

