import { useRef, useEffect } from 'react'
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
  ADS_ROTATIONS,
  getADSPosition,
  isAkimboWeapon,
  DEAGLE_HANDS,
  GLOCK_HANDS,
  TEC9_HANDS,
  AUTOPISTOL_HANDS,
} from './weaponRig'
import { FpsKarambitModel } from './weaponGeometries'

const weaponAnimator = new WeaponAnimator()

// Procedural studio env map singleton with ref counting
let globalEnvMap: THREE.Texture | null = null
let envMapRefCount = 0

function useStudioEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    if (!globalEnvMap) {
      const pmrem = new THREE.PMREMGenerator(gl)
      globalEnvMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      pmrem.dispose()
    }
    envMapRefCount++
    scene.environment = globalEnvMap

    return () => {
      envMapRefCount--
      if (envMapRefCount <= 0 && globalEnvMap) {
        globalEnvMap.dispose()
        globalEnvMap = null
      }
    }
  }, [gl, scene])
}

export function WeaponModel() {
  const groupRef = useRef<THREE.Group>(null)
  const recoilGroupRef = useRef<THREE.Group>(null)
  const activeWeapon = useWeaponStore((s) => s.activeWeapon)
  const isReloading = useWeaponStore((s) => s.isReloading)
  const isSwitching = useWeaponStore((s) => s.isSwitching)
  const isADS = useWeaponStore((s) => s.isADS)
  const dualWield = useWeaponStore((s) => s.dualWield)
  const hasPackAPunch = useWeaponStore((s) => s.hasPackAPunch)

  useStudioEnvironment()

  const isMoving = useRef(false)
  const moveIntensity = useRef(0)
  const lastSwingTime = useRef(0)
  const swingProgress = useRef(0)
  const mouseDelta = useRef({ x: 0, y: 0 })
  const adsProgress = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return
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
  }, [isSwitching, activeWeapon])

  useEffect(() => {
    const handleGrenadeThrown = ({ throwerId }: GameEvents['nadeThrown']) => {
      if (throwerId === 'local') weaponAnimator.play('grenade_throw')
    }
    gameEvents.on('nadeThrown', handleGrenadeThrown)
    return () => gameEvents.off('nadeThrown', handleGrenadeThrown)
  }, [])

  useFrame(({ camera }, dt) => {
    if (!groupRef.current || !recoilGroupRef.current || !activeWeapon) return

    // Frame-synced movement check
    const input = useGameStore.getState().lastInput
    const moving = !!input && (input.forward || input.backward || input.left || input.right)
    const targetMoveIntensity = moving ? (input?.sprint ? 1.5 : 1) : 0
    isMoving.current = moving
    moveIntensity.current = THREE.MathUtils.lerp(
      moveIntensity.current,
      targetMoveIntensity,
      1 - Math.exp(-10 * dt)
    )

    weaponAnimator.update(dt)
    weaponAnimator.updateBob(dt, moveIntensity.current * 5, moveIntensity.current > 1, isMoving.current)
    weaponAnimator.updateKick(dt)

    // Update sway and decay mouse delta
    weaponAnimator.updateSway(dt, mouseDelta.current.x, mouseDelta.current.y)
    const mouseDecay = 1 - Math.exp(-15 * dt)
    mouseDelta.current.x = THREE.MathUtils.lerp(mouseDelta.current.x, 0, mouseDecay)
    mouseDelta.current.y = THREE.MathUtils.lerp(mouseDelta.current.y, 0, mouseDecay)

    const recoilOffset = useWeaponStore.getState().recoilOffset
    if (recoilOffset.x * recoilOffset.x + recoilOffset.y * recoilOffset.y > 0.000001) {
      weaponAnimator.addKick(recoilOffset.x, recoilOffset.y, 0)
    }

    if (swingProgress.current > 0) {
      swingProgress.current *= Math.exp(-9.75 * dt)
      if (swingProgress.current < 0.01) swingProgress.current = 0
    }

    // Smooth ADS interpolation
    adsProgress.current = THREE.MathUtils.lerp(
      adsProgress.current,
      isADS && !isReloading && !isSwitching ? 1 : 0,
      1 - Math.exp(-18 * dt)
    )
    const adsFactor = adsProgress.current

    // Dynamic dual-wield: only when dualWield=true and weapon is akimbo-eligible
    const isDual = isAkimboWeapon(activeWeapon, dualWield)
    const basePos = (isDual && WEAPON_POSITIONS[activeWeapon])
      ? [0, -0.18, -0.32]  // Centered position for dual-wield pistols
      : (WEAPON_POSITIONS[activeWeapon] || [0.20, -0.19, -0.38])
    const baseRot = WEAPON_ROTATIONS[activeWeapon] || [0, 0, 0]
    const adsPos = getADSPosition(activeWeapon, isDual)

    groupRef.current.position.copy(camera.position)
    groupRef.current.quaternion.copy(camera.quaternion)

    const adsDamp = 1 - adsFactor * 0.95
    const posX = THREE.MathUtils.lerp(basePos[0], adsPos[0], adsFactor) + weaponAnimator.position.x * adsDamp
    const posY = THREE.MathUtils.lerp(basePos[1], adsPos[1], adsFactor) + weaponAnimator.position.y * adsDamp
    const posZ = THREE.MathUtils.lerp(basePos[2], adsPos[2], adsFactor) + weaponAnimator.position.z * adsDamp

    const targetRot = (ADS_ROTATIONS as Record<string, [number, number, number]>)[activeWeapon] || [0, 0, 0]
    const rotX = THREE.MathUtils.lerp(baseRot[0], targetRot[0], adsFactor) + weaponAnimator.rotation.x * adsDamp
    const rotY = THREE.MathUtils.lerp(baseRot[1], targetRot[1], adsFactor) + weaponAnimator.rotation.y * adsDamp
    const rotZ = THREE.MathUtils.lerp(baseRot[2], targetRot[2], adsFactor) + weaponAnimator.rotation.z * adsDamp

    recoilGroupRef.current.position.set(posX, posY, posZ)
    recoilGroupRef.current.rotation.set(rotX, rotY, rotZ)

    // Hide weapon model for AWP during ADS so sniper scope is clear
    if (activeWeapon === 'awp' && adsFactor > 0.12) {
      groupRef.current.visible = false
    } else {
      groupRef.current.visible = true
    }
  })

  if (!activeWeapon) return null

  return (
    <group ref={groupRef} name="weapon-model-parent">
      <group ref={recoilGroupRef} name="weapon-model-recoil">
        {activeWeapon === 'ak47' && <AK47Model />}
        {activeWeapon === 'm4a1' && <M4A1Model />}
        {activeWeapon === 'awp' && <AWPModel />}
        {activeWeapon === 'deagle' && (dualWield ? <DeagleDualModel /> : <DeagleModel />)}
        {activeWeapon === 'mp5' && <MP5Model />}
        {activeWeapon === 'arccaster' && <ArcCasterModel />}
        {activeWeapon === 'glock' && (dualWield ? <GlockDualModel /> : <GlockModel />)}
        {activeWeapon === 'tec9' && (dualWield ? <Tec9DualModel /> : <Tec9Model />)}
        {activeWeapon === 'autopistol' && (dualWield ? <AutoPistolDualModel /> : <AutoPistolModel />)}
        {(activeWeapon === 'knife' || activeWeapon === 'combatknife') && (
          <DualKarambitModel tactical={activeWeapon === 'combatknife'} />
        )}
        {activeWeapon === 'he' && <GrenadeModel type="he" />}
        {activeWeapon === 'smoke' && <GrenadeModel type="smoke" />}
        {activeWeapon === 'flash' && <GrenadeModel type="flash" />}
        {/* Pack-a-Punch glow */}
        {hasPackAPunch && <pointLight color="#c084fc" intensity={0.8} distance={0.6} />}
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
      {/* Front sight post (Tip at Y=0.055) */}
      <mesh position={[0, 0.048, -0.405]}>
        <boxGeometry args={[0.003, 0.014, 0.003]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Tritium glowing dot on front post */}
      <mesh position={[0, 0.054, -0.403]}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial color="#00ff00" toneMapped={false} />
      </mesh>
      {/* Front sight ears */}
      <mesh position={[0.008, 0.048, -0.405]}>
        <boxGeometry args={[0.003, 0.018, 0.01]} />
        <meshStandardMaterial color="#484848" />
      </mesh>
      <mesh position={[-0.008, 0.048, -0.405]}>
        <boxGeometry args={[0.003, 0.018, 0.01]} />
        <meshStandardMaterial color="#484848" />
      </mesh>
      {/* Rear sight block — leaf sight on the rear of the gas tube */}
      <mesh position={[0, 0.044, -0.055]}>
        <boxGeometry args={[0.03, 0.014, 0.028]} />
        <meshStandardMaterial color="#3c3c3c" metalness={0.55} roughness={0.4} />
      </mesh>
      {/* Rear sight notch (bottom of notch around Y=0.053) */}
      <mesh position={[0, 0.049, -0.055]}>
        <boxGeometry args={[0.012, 0.004, 0.01]} />
        <meshStandardMaterial color="#1c1c1c" />
      </mesh>
      {/* Rear sight ears */}
      <mesh position={[0.008, 0.053, -0.055]}>
        <boxGeometry args={[0.004, 0.008, 0.01]} />
        <meshStandardMaterial color="#484848" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[-0.008, 0.053, -0.055]}>
        <boxGeometry args={[0.004, 0.008, 0.01]} />
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
  const isADS = useWeaponStore((s) => s.isADS)
  const isReloading = useWeaponStore((s) => s.isReloading)
  const hideDot = isADS && !isReloading
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
      {/* Gas block (low profile) */}
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
      
      {/* RED DOT SIGHT (Holographic style) */}
      <group position={[0, 0.046, 0.05]}>
        {/* Sight base */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.028, 0.01, 0.06]} />
          <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Sight frame */}
        <mesh position={[0, 0.012, 0.01]}>
          <boxGeometry args={[0.032, 0.024, 0.005]} />
          <meshStandardMaterial color="#1c1c1c" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Sight glass (Lens) */}
        <mesh position={[0, 0.012, 0.008]}>
          <boxGeometry args={[0.024, 0.018, 0.002]} />
          <meshStandardMaterial color="#113344" transparent opacity={0.6} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Glowing Red Dot — hidden during ADS so the optic overlay is the only reticle */}
        {!hideDot && (
        <mesh position={[0, 0.004, 0.007]}>
          <sphereGeometry args={[0.0012, 8, 8]} />
          <meshBasicMaterial color="#ff0000" toneMapped={false} />
        </mesh>
        )}
      </group>

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
        <meshStandardMaterial color="#2244aa" metalness={0.8} roughness={0.1} transparent opacity={0.5} />
      </mesh>
      {/* Scope Reticle / Glowing Center Dot */}
      <mesh position={[0, 0.06, 0.106]}>
        <sphereGeometry args={[0.0008, 8, 8]} />
        <meshBasicMaterial color="#ff0000" toneMapped={false} />
      </mesh>
      {/* Scope Reticle Lines */}
      <mesh position={[0, 0.06, 0.107]}>
        <boxGeometry args={[0.016, 0.0004, 0.0004]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0, 0.06, 0.107]}>
        <boxGeometry args={[0.0004, 0.016, 0.0004]} />
        <meshBasicMaterial color="#000000" />
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
    </group>
  )
}

// ─── Single Desert Eagle ─────────────────────────────────────────
function DeagleModel() {
  return (
    <group>
      <DeaglePistol />
    </group>
  )
}

// ─── Dual Desert Eagle ───────────────────────────────────────────
function DeagleDualModel() {
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
      {/* Slide — massive stainless steel, polygonal profile */}
      <mesh position={[0, 0.014, 0.01]}>
        <boxGeometry args={[0.038, 0.05, 0.24]} />
        <meshStandardMaterial color="#d4d8de" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Slide front — tapered toward the muzzle */}
      <mesh position={[0, 0.014, -0.11]} rotation={[0.02, 0, 0]}>
        <boxGeometry args={[0.034, 0.042, 0.09]} />
        <meshStandardMaterial color="#ced2d9" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Slide crown — top chamfer */}
      <mesh position={[0, 0.036, -0.05]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.032, 0.016, 0.2]} />
        <meshStandardMaterial color="#c0c5cd" metalness={0.85} roughness={0.22} />
      </mesh>
      {/* Slide top Weaver rail */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`rail-top-${i}`} position={[0, 0.044, -0.04 + i * 0.025]}>
          <boxGeometry args={[0.026, 0.005, 0.012]} />
          <meshStandardMaterial color="#a0a5ad" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {/* Rear cocking serrations — deep angled cuts */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`rserr-${i}`} position={[0, 0.012, 0.08 + i * 0.012]}>
          <boxGeometry args={[0.04, 0.052, 0.005]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.75} roughness={0.3} />
        </mesh>
      ))}
      {/* Barrel — exposed heavy match barrel under slide */}
      <mesh position={[0, 0.018, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0085, 0.0085, 0.13, 12]} />
        <meshStandardMaterial color="#25272a" metalness={0.82} roughness={0.25} />
      </mesh>
      {/* Barrel gas tube & triangular contour */}
      <mesh position={[0, 0.026, -0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.05, 10]} />
        <meshStandardMaterial color="#ced2d9" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Muzzle with integrated compensator ports */}
      <mesh position={[0, 0.018, -0.265]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0145, 0.012, 0.035, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Muzzle brake exhaust ports — Symmetrical Left and Right */}
      {[-0.014, 0.014].map(xSide =>
        [0, 1].map(i => (
          <mesh
            key={`port-${xSide}-${i}`}
            position={[xSide, 0.018, -0.25 - i * 0.018]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.0035, 0.0035, 0.008, 6]} />
            <meshStandardMaterial color="#1a1c1e" />
          </mesh>
        ))
      )}
      {/* Muzzle crown ring */}
      <mesh position={[0, 0.018, -0.285]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.008, 12]} />
        <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Frame — lower tactical gunmetal */}
      <mesh position={[0, -0.016, 0.03]}>
        <boxGeometry args={[0.036, 0.024, 0.19]} />
        <meshStandardMaterial color="#1e2022" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Frame dust-cover front */}
      <mesh position={[0, -0.028, -0.07]}>
        <boxGeometry args={[0.032, 0.009, 0.09]} />
        <meshStandardMaterial color="#222426" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Accessory rail teeth */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`rail-${i}`} position={[0, -0.034, -0.04 - i * 0.016]}>
          <boxGeometry args={[0.022, 0.005, 0.012]} />
          <meshStandardMaterial color="#374151" metalness={0.65} roughness={0.3} />
        </mesh>
      ))}
      {/* Trigger guard — contoured */}
      <mesh position={[0, -0.042, 0.06]}>
        <boxGeometry args={[0.033, 0.017, 0.052]} />
        <meshStandardMaterial color="#1e2022" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Trigger guard — curved front */}
      <mesh position={[0, -0.04, 0.022]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.03, 0.014, 0.035]} />
        <meshStandardMaterial color="#1e2022" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Skeletonized Combat Trigger */}
      <mesh position={[0, -0.037, 0.05]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.005, 0.024, 0.004]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Ergonomic Combat Grip — wrap-around black polymer */}
      <mesh position={[0, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.036, 0.075, 0.042]} />
        <meshStandardMaterial color="#111214" roughness={0.7} />
      </mesh>
      {/* Grip lower flare */}
      <mesh position={[0, -0.128, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.042, 0.028, 0.048]} />
        <meshStandardMaterial color="#18191b" roughness={0.7} />
      </mesh>
      {/* Grip front finger grooves */}
      {[0, 1, 2].map(i => (
        <mesh key={`groove-${i}`} position={[0, -0.06 - i * 0.016, 0.072]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.037, 0.014, 0.036]} />
          <meshStandardMaterial color="#1e2022" roughness={0.75} />
        </mesh>
      ))}
      {/* Grip texture panels on Left and Right */}
      <mesh position={[0.019, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.06, 0.036]} />
        <meshStandardMaterial color="#25282c" roughness={0.8} />
      </mesh>
      <mesh position={[-0.019, -0.085, 0.085]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.06, 0.036]} />
        <meshStandardMaterial color="#25282c" roughness={0.8} />
      </mesh>
      {/* Iconic Eagle Medallion on Grip Left & Right */}
      <mesh position={[0.021, -0.085, 0.085]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.003, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.021, -0.085, 0.085]} rotation={[0, -Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.003, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Magazine — steel body with black base plate */}
      <mesh position={[0, -0.135, 0.095]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.03, 0.055, 0.032]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.172, 0.1]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.035, 0.014, 0.038]} />
        <meshStandardMaterial color="#1e2022" roughness={0.6} />
      </mesh>
      {/* Tactical Rear Combat Sight with U-notch */}
      <mesh position={[0, 0.048, 0.075]}>
        <boxGeometry args={[0.03, 0.014, 0.022]} />
        <meshStandardMaterial color="#1e2022" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.056, 0.075]}>
        <boxGeometry args={[0.012, 0.007, 0.016]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Front Sight Blade with White Dot */}
      <mesh position={[0, 0.052, -0.115]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.008, 0.02, 0.013]} />
        <meshStandardMaterial color="#1e2022" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.058, -0.112]}>
        <boxGeometry args={[0.004, 0.004, 0.004]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      {/* Combat Hammer with serrated spur */}
      <mesh position={[0, 0.048, 0.135]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.016, 0.022, 0.013]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.062, 0.14]} rotation={[0.0, 0, 0]}>
        <boxGeometry args={[0.014, 0.012, 0.01]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Slide Stops & Safety Levers */}
      <mesh position={[0.02, 0.002, 0.045]}>
        <boxGeometry args={[0.006, 0.013, 0.038]} />
        <meshStandardMaterial color="#1e2022" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.02, 0.002, 0.045]}>
        <boxGeometry args={[0.006, 0.013, 0.038]} />
        <meshStandardMaterial color="#1e2022" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.02, 0.026, 0.09]}>
        <boxGeometry args={[0.006, 0.011, 0.028]} />
        <meshStandardMaterial color="#1e2022" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.02, 0.026, 0.09]}>
        <boxGeometry args={[0.006, 0.011, 0.028]} />
        <meshStandardMaterial color="#1e2022" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Top slide bevel / ejection port cutout */}
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
      {/* Muzzle — SD-style integral suppressor */}
      <mesh position={[0, 0.005, -0.33]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.012, 0.08, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.65} roughness={0.32} />
      </mesh>
      {/* Suppressor end cap */}
      <mesh position={[0, 0.005, -0.375]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.013, 0.012, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Old tri-lug replaced by SD can */}
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
// Glock 17/18 — polymer frame, striker-fired (Detailed Tactical 3D Mesh)
function GlockModel() {
  return (
    <group>
      {/* Slide — Tenifer finish, proportional tactical profile */}
      <mesh position={[0, 0.010, 0]}>
        <boxGeometry args={[0.027, 0.028, 0.195]} />
        <meshStandardMaterial color="#222428" metalness={0.62} roughness={0.38} />
      </mesh>
      {/* Slide top chamfer — beveled upper crown */}
      <mesh position={[0, 0.024, 0]}>
        <boxGeometry args={[0.022, 0.004, 0.192]} />
        <meshStandardMaterial color="#2a2c30" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Slide backplate with striker cover */}
      <mesh position={[0, 0.010, 0.098]}>
        <boxGeometry args={[0.025, 0.025, 0.003]} />
        <meshStandardMaterial color="#16181b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.012, 0.0995]}>
        <cylinderGeometry args={[0.003, 0.003, 0.002, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Slide serrations — rear gripping grooves on left and right */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`serr-${i}`} position={[0, 0.010, 0.055 + i * 0.008]}>
          <boxGeometry args={[0.028, 0.026, 0.004]} />
          <meshStandardMaterial color="#181a1d" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}
      {/* Ejection port cutout (right side) */}
      <mesh position={[0.011, 0.018, -0.015]}>
        <boxGeometry args={[0.008, 0.012, 0.042]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      {/* Match grade barrel — exposed at ejection port and muzzle */}
      <mesh position={[0, 0.010, -0.015]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0075, 0.0075, 0.045, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.010, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.06, 12]} />
        <meshStandardMaterial color="#1f242d" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Muzzle crown */}
      <mesh position={[0, 0.010, -0.152]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0075, 0.0075, 0.006, 12]} />
        <meshStandardMaterial color="#111214" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Frame — polymer lower with contoured dust cover */}
      <mesh position={[0, -0.010, 0.005]}>
        <boxGeometry args={[0.026, 0.016, 0.165]} />
        <meshStandardMaterial color="#1a1c1e" roughness={0.7} />
      </mesh>
      {/* Accessory rail under barrel */}
      <mesh position={[0, -0.018, -0.05]}>
        <boxGeometry args={[0.022, 0.005, 0.045]} />
        <meshStandardMaterial color="#25272a" roughness={0.65} />
      </mesh>
      {/* Trigger guard — squared combat style */}
      <mesh position={[0, -0.026, 0.025]}>
        <boxGeometry args={[0.022, 0.014, 0.042]} />
        <meshStandardMaterial color="#1f2124" roughness={0.65} />
      </mesh>
      {/* Safe-Action Combat Trigger */}
      <mesh position={[0, -0.022, 0.024]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.016, 0.004]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Red safety trigger blade */}
      <mesh position={[0, -0.020, 0.022]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.002, 0.008, 0.002]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>

      {/* Ergonomic Polymer Grip with slight backward rake */}
      <mesh position={[0, -0.055, 0.052]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.025, 0.062, 0.034]} />
        <meshStandardMaterial color="#161719" roughness={0.75} />
      </mesh>
      {/* Grip stippling texture Left & Right */}
      <mesh position={[0.0135, -0.055, 0.052]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.002, 0.048, 0.026]} />
        <meshStandardMaterial color="#232528" roughness={0.85} />
      </mesh>
      <mesh position={[-0.0135, -0.055, 0.052]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.002, 0.048, 0.026]} />
        <meshStandardMaterial color="#232528" roughness={0.85} />
      </mesh>
      {/* Grip finger grooves on front strap */}
      {[0, 1].map(i => (
        <mesh key={`ggroove-${i}`} position={[0, -0.042 - i * 0.016, 0.04]} rotation={[0.26, 0, 0]}>
          <boxGeometry args={[0.0255, 0.008, 0.032]} />
          <meshStandardMaterial color="#1a1c1e" roughness={0.75} />
        </mesh>
      ))}
      {/* Magazine baseplate */}
      <mesh position={[0, -0.090, 0.062]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.027, 0.009, 0.038]} />
        <meshStandardMaterial color="#18191b" roughness={0.7} />
      </mesh>

      {/* ── Realistic Glock Sights with Clear Optical Sight-line ── */}
      {/* Rear Sight U-Notch — Left Wing with White Tritium Dot */}
      <mesh position={[-0.0085, 0.029, 0.082]}>
        <boxGeometry args={[0.005, 0.008, 0.008]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      <mesh position={[-0.0085, 0.029, 0.086]}>
        <boxGeometry args={[0.0025, 0.0025, 0.002]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      {/* Rear Sight U-Notch — Right Wing with White Tritium Dot */}
      <mesh position={[0.0085, 0.029, 0.082]}>
        <boxGeometry args={[0.005, 0.008, 0.008]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      <mesh position={[0.0085, 0.029, 0.086]}>
        <boxGeometry args={[0.0025, 0.0025, 0.002]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>

      {/* Front Sight Post — Blade with Bright White Center Dot */}
      <mesh position={[0, 0.029, -0.082]}>
        <boxGeometry args={[0.004, 0.008, 0.008]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      <mesh position={[0, 0.031, -0.080]}>
        <boxGeometry args={[0.0025, 0.0025, 0.002]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>

      {/* Slide stop & magazine catch controls */}
      <mesh position={[-0.0145, 0.002, 0.015]}>
        <boxGeometry args={[0.003, 0.006, 0.022]} />
        <meshStandardMaterial color="#2d3035" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.014, -0.012, 0.028]}>
        <boxGeometry args={[0.003, 0.006, 0.008]} />
        <meshStandardMaterial color="#2d3035" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Glock Dual Wield ──────────────────────────────────────────
function GlockDualModel() {
  const handRefs = useRef<Array<THREE.Group | null>>([])
  const kicks = useRef<number[]>(GLOCK_HANDS.map(() => 0))

  useEffect(() => {
    const handleFired = ({ weapon, akimboSide }: GameEvents['weaponFired']) => {
      if (weapon !== 'glock') return
      const index = GLOCK_HANDS.findIndex(hand => hand.side === akimboSide)
      if (index !== -1) kicks.current[index] = 1
    }
    gameEvents.on('weaponFired', handleFired)
    return () => gameEvents.off('weaponFired', handleFired)
  }, [])

  useFrame((_, dt) => {
    GLOCK_HANDS.forEach((hand, index) => {
      const group = handRefs.current[index]
      if (!group) return
      const kick = THREE.MathUtils.damp(kicks.current[index], 0, 11, dt)
      kicks.current[index] = kick < 0.001 ? 0 : kick
      group.position.set(hand.position[0], hand.position[1] + kick * 0.01, hand.position[2] + kick * 0.035)
      group.rotation.set(hand.rotation[0] + kick * 0.45, hand.rotation[1], hand.rotation[2] - kick * 0.1 * hand.side)
    })
  })

  return (
    <group>
      {GLOCK_HANDS.map((hand, index) => (
        <group key={`glock-hand-${hand.side}`} ref={el => { handRefs.current[index] = el }} position={hand.position} rotation={hand.rotation} scale={hand.scale}>
          <GlockModel />
        </group>
      ))}
    </group>
  )
}

// ─── Tec-9 ──────────────────────────────────────────────────────
// Intratec Tec-9 — open-bolt, simple construction (Symmetrical 3D Mesh)
function Tec9Model() {
  return (
    <group>
      {/* Upper receiver — stamped box */}
      <mesh position={[0, 0.012, -0.02]}>
        <boxGeometry args={[0.034, 0.032, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Lower receiver */}
      <mesh position={[0, -0.012, 0.02]}>
        <boxGeometry args={[0.032, 0.022, 0.17]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Barrel — short, inside shroud */}
      <mesh position={[0, 0.008, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.1, 8]} />
        <meshStandardMaterial color="#111111" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel shroud / perforated jacket */}
      <mesh position={[0, 0.008, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.11, 10]} />
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

// ─── Tec-9 Dual Wield ──────────────────────────────────────────
function Tec9DualModel() {
  const handRefs = useRef<Array<THREE.Group | null>>([])
  const kicks = useRef<number[]>(TEC9_HANDS.map(() => 0))

  useEffect(() => {
    const handleFired = ({ weapon, akimboSide }: GameEvents['weaponFired']) => {
      if (weapon !== 'tec9') return
      const index = TEC9_HANDS.findIndex(hand => hand.side === akimboSide)
      if (index !== -1) kicks.current[index] = 1
    }
    gameEvents.on('weaponFired', handleFired)
    return () => gameEvents.off('weaponFired', handleFired)
  }, [])

  useFrame((_, dt) => {
    TEC9_HANDS.forEach((hand, index) => {
      const group = handRefs.current[index]
      if (!group) return
      const kick = THREE.MathUtils.damp(kicks.current[index], 0, 11, dt)
      kicks.current[index] = kick < 0.001 ? 0 : kick
      group.position.set(hand.position[0], hand.position[1] + kick * 0.01, hand.position[2] + kick * 0.035)
      group.rotation.set(hand.rotation[0] + kick * 0.4, hand.rotation[1], hand.rotation[2] - kick * 0.1 * hand.side)
    })
  })

  return (
    <group>
      {TEC9_HANDS.map((hand, index) => (
        <group key={`tec9-hand-${hand.side}`} ref={el => { handRefs.current[index] = el }} position={hand.position} rotation={hand.rotation} scale={hand.scale}>
          <Tec9Model />
        </group>
      ))}
    </group>
  )
}

// ─── Auto Pistol ────────────────────────────────────────────────
// Auto Pistol — full-auto compact, similar to Glock 18C (Symmetrical 3D Mesh)
function AutoPistolModel() {
  return (
    <group>
      {/* Slide — Glock 18C profile, ported for full-auto */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.028, 0.032, 0.19]} />
        <meshStandardMaterial color="#222428" metalness={0.62} roughness={0.38} />
      </mesh>
      {/* Slide crown */}
      <mesh position={[0, 0.026, 0]}>
        <boxGeometry args={[0.022, 0.004, 0.188]} />
        <meshStandardMaterial color="#2a2c30" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Slide serrations */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`aserr-${i}`} position={[0, 0.012, 0.05 + i * 0.008]}>
          <boxGeometry args={[0.029, 0.03, 0.004]} />
          <meshStandardMaterial color="#181a1d" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}
      {/* Compensator cuts — top ports */}
      {[0, 1].map(i => (
        <mesh key={`port-${i}`} position={[0, 0.028, -0.14 - i * 0.018]}>
          <boxGeometry args={[0.018, 0.006, 0.012]} />
          <meshStandardMaterial color="#111214" />
        </mesh>
      ))}
      {/* Barrel */}
      <mesh position={[0, 0.012, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.06, 10]} />
        <meshStandardMaterial color="#1f242d" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.012, -0.155]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.007, 0.012, 10]} />
        <meshStandardMaterial color="#111214" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, -0.01, 0.005]}>
        <boxGeometry args={[0.026, 0.016, 0.155]} />
        <meshStandardMaterial color="#1a1c1e" roughness={0.7} />
      </mesh>
      {/* Accessory rail */}
      <mesh position={[0, -0.018, -0.04]}>
        <boxGeometry args={[0.022, 0.005, 0.04]} />
        <meshStandardMaterial color="#25272a" roughness={0.65} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.026, 0.025]}>
        <boxGeometry args={[0.022, 0.014, 0.04]} />
        <meshStandardMaterial color="#1f2124" roughness={0.65} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.022, 0.024]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.004, 0.016, 0.004]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.055, 0.052]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.025, 0.062, 0.034]} />
        <meshStandardMaterial color="#161719" roughness={0.75} />
      </mesh>
      {/* Extended magazine */}
      <mesh position={[0, -0.088, 0.062]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.022, 0.048, 0.028]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.118, 0.068]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.026, 0.01, 0.032]} />
        <meshStandardMaterial color="#18191b" roughness={0.7} />
      </mesh>
      {/* Sights */}
      <mesh position={[0, 0.029, 0.078]}>
        <boxGeometry args={[0.018, 0.008, 0.01]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      <mesh position={[0, 0.029, -0.078]}>
        <boxGeometry args={[0.004, 0.008, 0.008]} />
        <meshStandardMaterial color="#111214" />
      </mesh>
      <mesh position={[0, 0.031, -0.076]}>
        <boxGeometry args={[0.0025, 0.0025, 0.002]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
      {/* Slide stop */}
      <mesh position={[-0.0145, 0.002, 0.015]}>
        <boxGeometry args={[0.003, 0.006, 0.022]} />
        <meshStandardMaterial color="#2d3035" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Auto Pistol Dual Wield ────────────────────────────────────
function AutoPistolDualModel() {
  const handRefs = useRef<Array<THREE.Group | null>>([])
  const kicks = useRef<number[]>(AUTOPISTOL_HANDS.map(() => 0))

  useEffect(() => {
    const handleFired = ({ weapon, akimboSide }: GameEvents['weaponFired']) => {
      if (weapon !== 'autopistol') return
      const index = AUTOPISTOL_HANDS.findIndex(hand => hand.side === akimboSide)
      if (index !== -1) kicks.current[index] = 1
    }
    gameEvents.on('weaponFired', handleFired)
    return () => gameEvents.off('weaponFired', handleFired)
  }, [])

  useFrame((_, dt) => {
    AUTOPISTOL_HANDS.forEach((hand, index) => {
      const group = handRefs.current[index]
      if (!group) return
      const kick = THREE.MathUtils.damp(kicks.current[index], 0, 11, dt)
      kicks.current[index] = kick < 0.001 ? 0 : kick
      group.position.set(hand.position[0], hand.position[1] + kick * 0.008, hand.position[2] + kick * 0.03)
      group.rotation.set(hand.rotation[0] + kick * 0.4, hand.rotation[1], hand.rotation[2] - kick * 0.08 * hand.side)
    })
  })

  return (
    <group>
      {AUTOPISTOL_HANDS.map((hand, index) => (
        <group key={`autopistol-hand-${hand.side}`} ref={el => { handRefs.current[index] = el }} position={hand.position} rotation={hand.rotation} scale={hand.scale}>
          <AutoPistolModel />
        </group>
      ))}
    </group>
  )
}

// ─── Karambit (dual, left + right) ────────────────────────────────

const KARAMBIT_HANDS = [
  { side: -1 as const, position: [-0.22, -0.03, 0.04] as [number, number, number], rotation: [0.32, 0.52, 0.9] as [number, number, number] },
  { side: 1 as const, position: [0.22, -0.03, 0.04] as [number, number, number], rotation: [0.32, -0.52, -0.9] as [number, number, number] },
]

function DualKarambitModel({ tactical = false }: { tactical?: boolean }) {
  const handRefs = useRef<Array<THREE.Group | null>>([])
  const slashes = useRef([0, 0])
  const nextHand = useRef(1)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || !document.pointerLockElement) return
      const index = nextHand.current === 1 ? 1 : 0
      slashes.current[index] = 1
      nextHand.current = nextHand.current === 1 ? -1 : 1
    }
    window.addEventListener("mousedown", onDown)
    return () => window.removeEventListener("mousedown", onDown)
  }, [])

  useFrame((_, dt) => {
    KARAMBIT_HANDS.forEach((hand, index) => {
      const group = handRefs.current[index]
      if (!group) return
      const s = THREE.MathUtils.damp(slashes.current[index], 0, 9, dt)
      slashes.current[index] = s < 0.01 ? 0 : s
      group.position.set(
        hand.position[0] + s * 0.05 * hand.side,
        hand.position[1] - s * 0.05,
        hand.position[2] - s * 0.12,
      )
      group.rotation.set(
        hand.rotation[0] + s * 1.15,
        hand.rotation[1],
        hand.rotation[2] - s * 0.85 * hand.side,
      )
    })
  })

  return (
    <group>
      {KARAMBIT_HANDS.map((hand, index) => (
        <group
          key={`karambit-${hand.side}`}
          ref={el => { handRefs.current[index] = el }}
          position={hand.position}
          rotation={hand.rotation}
        >
          <FpsKarambitModel flip={hand.side === 1} tactical={tactical} />
        </group>
      ))}
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

      {/* Body Ribs / pineapple segments for HE */}
      {type === 'he' &&
        [-0.025, 0, 0.025].flatMap((y, idx) =>
          [0, 1, 2, 3, 4, 5].map(seg => (
            <mesh
              key={`seg-${idx}-${seg}`}
              position={[Math.cos((seg * Math.PI) / 3) * 0.039, y, Math.sin((seg * Math.PI) / 3) * 0.039]}
              rotation={[0, (seg * Math.PI) / 3, 0]}
            >
              <boxGeometry args={[0.008, 0.014, 0.006]} />
              <meshStandardMaterial color="#1f3d1b" roughness={0.7} />
            </mesh>
          ))
        )}

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

// ─── Wonder Weapon: Arc Caster ─────────────────────────────────────
// Futuristic high-voltage Tesla / Railgun with glowing energy coils
function ArcCasterModel() {
  return (
    <group>
      {/* Heavy futuristic chassis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.065, 0.08, 0.42]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Upper rail with energy conduits */}
      <mesh position={[0, 0.045, -0.05]}>
        <boxGeometry args={[0.045, 0.02, 0.32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Glowing Tesla Coils / Capacitors */}
      <mesh position={[0.035, 0.01, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.18, 16]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2.5} roughness={0.1} />
      </mesh>
      <mesh position={[-0.035, 0.01, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.18, 16]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2.5} roughness={0.1} />
      </mesh>
      {/* Dual Barrel Prongs (Arc Emitters) */}
      <mesh position={[0.018, 0.01, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.1} emissive="#0284c7" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[-0.018, 0.01, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 12]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.95} roughness={0.1} emissive="#0284c7" emissiveIntensity={1.2} />
      </mesh>
      {/* Energy Core / Battery Cell */}
      <mesh position={[0, -0.065, 0.04]}>
        <boxGeometry args={[0.042, 0.075, 0.09]} />
        <meshStandardMaterial color="#0284c7" emissive="#00ffff" emissiveIntensity={1.5} roughness={0.2} />
      </mesh>
      {/* Ergonomic Grip */}
      <mesh position={[0, -0.08, 0.14]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.038, 0.09, 0.045]} />
        <meshStandardMaterial color="#020617" roughness={0.8} />
      </mesh>
      {/* Arc Emitter Focus Ring */}
      <mesh position={[0, 0.01, -0.34]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.026, 0.005, 12, 24]} />
        <meshStandardMaterial color="#00ffff" emissive="#38bdf8" emissiveIntensity={3.0} />
      </mesh>
      {/* Ambient Arc Light */}
      <pointLight position={[0, 0.02, -0.2]} color="#00ffff" intensity={1.5} distance={1.2} />
    </group>
  )
}

