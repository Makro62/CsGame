import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWeaponStore } from '../../stores/useWeaponStore'
import { useGameStore } from '../../stores/useGameStore'

const WEAPON_POSITIONS: Record<string, [number, number, number]> = {
  // Primary rifles
  ak47: [0.25, -0.25, -0.42],
  m4a1: [0.25, -0.25, -0.42],
  awp: [0.28, -0.28, -0.52],
  mp5: [0.24, -0.24, -0.38],
  // Secondary pistols
  deagle: [0.2, -0.2, -0.33],
  glock: [0.18, -0.18, -0.3],
  tec9: [0.19, -0.19, -0.32],
  autopistol: [0.18, -0.18, -0.3],
  // Melee
  knife: [0.18, -0.18, -0.28],
  combatknife: [0.18, -0.18, -0.28],
}

export function WeaponModel() {
  const groupRef = useRef<THREE.Group>(null)
  const recoilGroupRef = useRef<THREE.Group>(null)
  const { activeWeapon, recoilOffset, isReloading, isSwitching, isADS } =
    useWeaponStore()

  const isMoving = useRef(false)
  const moveIntensity = useRef(0)
  const currentSway = useRef({ x: 0, y: 0 })
  const lastSwingTime = useRef(0)
  const swingProgress = useRef(0)

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

  // Listen for mouse click to trigger knife swing
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const now = performance.now()
        if (now - lastSwingTime.current > 500) {
          // 500ms cooldown
          lastSwingTime.current = now
          swingProgress.current = 1
        }
      }
    }
    window.addEventListener('mousedown', handleMouseDown)
    return () => window.removeEventListener('mousedown', handleMouseDown)
  }, [])

  useFrame(({ camera, clock }) => {
    if (!groupRef.current || !recoilGroupRef.current || !activeWeapon) return

    const time = clock.getElapsedTime()

    // Weapon sway modulated by movement state
    const moveMult = 1 + moveIntensity.current * 0.8
    const targetSwayX = Math.sin(time * 1.5) * 0.003 * moveMult
    const targetSwayY = Math.sin(time * 2) * 0.0015 * moveMult

    // Smooth sway transitions
    currentSway.current.x += (targetSwayX - currentSway.current.x) * 0.1
    currentSway.current.y += (targetSwayY - currentSway.current.y) * 0.1
    const swayX = currentSway.current.x
    const swayY = currentSway.current.y

    // Weapon bob during sprint
    const sprintBob =
      isMoving.current && moveIntensity.current > 1
        ? Math.sin(time * 8) * 0.008
        : 0
    const sprintBobY =
      isMoving.current && moveIntensity.current > 1
        ? Math.abs(Math.sin(time * 8)) * 0.005
        : 0

    // Recoil kick tuned for a smoother, less violent FPS feel.
    const kickScale = isADS ? 0.45 : 1
    const kickZ = Math.min(recoilOffset.y * 0.0065 * kickScale, 0.016)
    const kickY = Math.min(recoilOffset.x * 0.0032 * kickScale, 0.008)

    // Slightly soften the visual punch while keeping the transient feel alive.
    const visualPunch = recoilOffset.y * 0.0018

    // Reload animation — gun tilts down and back up
    const reloadProgress = isReloading ? Math.sin(time * 3) * 0.08 : 0
    const reloadTilt = isReloading ? Math.sin(time * 3) * 0.3 : 0

    // Knife swing animation
    const isKnife = activeWeapon === 'knife' || activeWeapon === 'combatknife'
    const swingAngle = isKnife ? swingProgress.current * 1.2 : 0
    const swingY = isKnife ? swingProgress.current * 0.15 : 0

    // Decay swing progress
    if (swingProgress.current > 0) {
      swingProgress.current *= 0.85
      if (swingProgress.current < 0.01) swingProgress.current = 0
    }

    // Deploy animation
    const deployOffset = isSwitching ? -0.25 : 0

    const basePos = WEAPON_POSITIONS[activeWeapon] || [0.28, -0.28, -0.45]

    // Parent group tracks camera transform
    groupRef.current.position.copy(camera.position)
    groupRef.current.quaternion.copy(camera.quaternion)

    // Child group applies local FPV offset
    recoilGroupRef.current.position.set(
      basePos[0] + swayX + sprintBob,
      basePos[1] +
        swayY +
        sprintBobY +
        kickY +
        visualPunch +
        reloadProgress +
        swingY,
      basePos[2] + kickZ + deployOffset
    )

    recoilGroupRef.current.rotation.set(
      -kickZ * 0.45 + reloadTilt + swingAngle,
      -kickY * 0.5,
      0
    )
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
      </group>
    </group>
  )
}

// ─── AK-47 ────────────────────────────────────────────────────────
// Iconic Krunker AK: wood stock, dark body, curved magazine
function AK47Model() {
  return (
    <group>
      {/* Main body / receiver */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.055, 0.07, 0.4]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Upper rail */}
      <mesh position={[0, 0.04, -0.05]}>
        <boxGeometry args={[0.04, 0.015, 0.3]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.01, -0.32]}>
        <boxGeometry args={[0.025, 0.025, 0.28]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Barrel tip / muzzle */}
      <mesh position={[0, 0.01, -0.48]}>
        <boxGeometry args={[0.03, 0.03, 0.04]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Magazine — curved AK style */}
      <mesh position={[0, -0.09, 0.04]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.035, 0.11, 0.055]} />
        <meshStandardMaterial color="#3d3d3d" />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.15, 0.05]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.06]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Stock — wooden */}
      <mesh position={[0, -0.01, 0.32]}>
        <boxGeometry args={[0.045, 0.06, 0.22]} />
        <meshStandardMaterial color="#8B5E3C" />
      </mesh>
      {/* Stock butt */}
      <mesh position={[0, -0.01, 0.45]}>
        <boxGeometry args={[0.04, 0.08, 0.04]} />
        <meshStandardMaterial color="#6B4226" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.03, 0.08, 0.03]} />
        <meshStandardMaterial color="#8B5E3C" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.06, -0.25]}>
        <boxGeometry args={[0.015, 0.03, 0.015]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.06, 0.02]}>
        <boxGeometry args={[0.03, 0.02, 0.015]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
    </group>
  )
}

// ─── M4A1 ────────────────────────────────────────────────────────
// Sleek tactical rifle with suppressor
function M4A1Model() {
  return (
    <group>
      {/* Main body / receiver */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.065, 0.38]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Upper rail system */}
      <mesh position={[0, 0.038, -0.02]}>
        <boxGeometry args={[0.042, 0.012, 0.32]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.005, -0.3]}>
        <boxGeometry args={[0.022, 0.022, 0.22]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Suppressor */}
      <mesh position={[0, 0.005, -0.46]}>
        <boxGeometry args={[0.032, 0.032, 0.12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Suppressor front cap */}
      <mesh position={[0, 0.005, -0.53]}>
        <boxGeometry args={[0.028, 0.028, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine — straight STANAG style */}
      <mesh position={[0, -0.085, 0.02]}>
        <boxGeometry args={[0.032, 0.1, 0.045]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Stock — collapsible */}
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[0.04, 0.05, 0.18]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Stock pad */}
      <mesh position={[0, 0, 0.4]}>
        <boxGeometry args={[0.035, 0.06, 0.03]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.07, 0.1]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.028, 0.07, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.055, -0.2]}>
        <boxGeometry args={[0.012, 0.025, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.055, 0.04]}>
        <boxGeometry args={[0.028, 0.018, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
    </group>
  )
}

// ─── AWP ────────────────────────────────────────────────────────
// Long sniper with scope — Krunker's signature green AWP
function AWPModel() {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.06, 0.5]} />
        <meshStandardMaterial color="#1a3a1a" />
      </mesh>
      {/* Body accent stripe */}
      <mesh position={[0, 0.032, 0]}>
        <boxGeometry args={[0.052, 0.008, 0.5]} />
        <meshStandardMaterial color="#2a5a2a" />
      </mesh>
      {/* Barrel — long and thick */}
      <mesh position={[0, 0.005, -0.42]}>
        <boxGeometry args={[0.028, 0.028, 0.35]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Muzzle brake */}
      <mesh position={[0, 0.005, -0.61]}>
        <boxGeometry args={[0.035, 0.035, 0.04]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Scope body */}
      <mesh position={[0, 0.065, -0.05]}>
        <boxGeometry args={[0.035, 0.035, 0.22]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Scope front lens */}
      <mesh position={[0, 0.065, -0.17]}>
        <boxGeometry args={[0.038, 0.038, 0.015]} />
        <meshStandardMaterial color="#334488" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Scope rear lens */}
      <mesh position={[0, 0.065, 0.07]}>
        <boxGeometry args={[0.032, 0.032, 0.015]} />
        <meshStandardMaterial color="#334488" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Scope mount */}
      <mesh position={[0, 0.05, -0.05]}>
        <boxGeometry args={[0.02, 0.015, 0.15]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Scope turrets */}
      <mesh position={[0.025, 0.07, -0.05]}>
        <boxGeometry args={[0.015, 0.025, 0.025]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.025, 0.07, -0.05]}>
        <boxGeometry args={[0.015, 0.025, 0.025]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.085, 0.06]}>
        <boxGeometry args={[0.035, 0.1, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Stock — adjustable */}
      <mesh position={[0, -0.005, 0.38]}>
        <boxGeometry args={[0.04, 0.055, 0.2]} />
        <meshStandardMaterial color="#2a4a2a" />
      </mesh>
      {/* Stock butt pad */}
      <mesh position={[0, -0.005, 0.5]}>
        <boxGeometry args={[0.038, 0.065, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.07, 0.14]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.028, 0.07, 0.028]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Bipod legs (folded) */}
      <mesh position={[0.02, -0.04, -0.15]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.008, 0.06, 0.008]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.02, -0.04, -0.15]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.008, 0.06, 0.008]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Desert Eagle ────────────────────────────────────────────────
// Iconic gold deagle — Krunker's most recognizable pistol
function DeagleModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
      {/* Main body / slide */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.04, 0.055, 0.22]} />
        <meshStandardMaterial color="#DAA520" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Slide top ridge */}
      <mesh position={[0, 0.042, -0.02]}>
        <boxGeometry args={[0.035, 0.012, 0.18]} />
        <meshStandardMaterial
          color="#FFD700"
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.015, -0.18]}>
        <boxGeometry args={[0.022, 0.022, 0.1]} />
        <meshStandardMaterial color="#B8860B" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.015, -0.24]}>
        <boxGeometry args={[0.028, 0.028, 0.025]} />
        <meshStandardMaterial color="#8B7500" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Frame / lower body */}
      <mesh position={[0, -0.02, 0.02]}>
        <boxGeometry args={[0.038, 0.025, 0.18]} />
        <meshStandardMaterial color="#B8860B" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.04, 0.04]}>
        <boxGeometry args={[0.035, 0.02, 0.06]} />
        <meshStandardMaterial color="#8B7500" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.035, 0.04]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.008, 0.02, 0.008]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.08, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.035, 0.08, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Grip texture lines */}
      <mesh position={[0.02, -0.08, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.003, 0.06, 0.035]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.02, -0.08, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.003, 0.06, 0.035]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.055, 0.06]}>
        <boxGeometry args={[0.03, 0.015, 0.015]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.055, -0.1]}>
        <boxGeometry args={[0.01, 0.02, 0.01]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine base */}
      <mesh position={[0, -0.13, 0.09]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.032, 0.015, 0.035]} />
        <meshStandardMaterial color="#DAA520" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── MP5 ────────────────────────────────────────────────────────
// Compact SMG — Krunker's fast-fire SMG
function MP5Model() {
  return (
    <group>
      {/* Main body / receiver */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.045, 0.06, 0.32]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Upper rail */}
      <mesh position={[0, 0.035, -0.02]}>
        <boxGeometry args={[0.038, 0.01, 0.26]} />
        <meshStandardMaterial color="#383838" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.005, -0.26]}>
        <boxGeometry args={[0.02, 0.02, 0.18]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.005, -0.36]}>
        <boxGeometry args={[0.025, 0.025, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Magazine — curved */}
      <mesh position={[0, -0.08, 0.02]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.028, 0.09, 0.04]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Stock — retractable */}
      <mesh position={[0, 0.01, 0.26]}>
        <boxGeometry args={[0.035, 0.04, 0.14]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Stock rails */}
      <mesh position={[0.015, 0.025, 0.28]}>
        <boxGeometry args={[0.008, 0.008, 0.12]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.015, 0.025, 0.28]}>
        <boxGeometry args={[0.008, 0.008, 0.12]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.065, 0.08]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.028, 0.065, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.05, -0.18]}>
        <boxGeometry args={[0.012, 0.025, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.05, 0.02]}>
        <boxGeometry args={[0.025, 0.018, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Handguard */}
      <mesh position={[0, -0.02, -0.12]}>
        <boxGeometry args={[0.04, 0.035, 0.12]} />
        <meshStandardMaterial color="#383838" />
      </mesh>
    </group>
  )
}

// ─── Knife ──────────────────────────────────────────────────────
// Simple combat knife — Krunker's melee
function KnifeModel() {
  return (
    <group rotation={[0.2, -0.4, 0.15]}>
      {/* Blade — angular Krunker style */}
      <mesh position={[0, 0.08, -0.01]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.012, 0.14, 0.04]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Blade edge — angled */}
      <mesh position={[0.008, 0.08, -0.01]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.008, 0.12, 0.02]} />
        <meshStandardMaterial
          color="#A8A8A8"
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>
      {/* Guard */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.04, 0.015, 0.04]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.05, 0.01]}>
        <boxGeometry args={[0.025, 0.1, 0.028]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Handle grip lines */}
      <mesh position={[0.014, -0.05, 0.01]}>
        <boxGeometry args={[0.003, 0.08, 0.024]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.014, -0.05, 0.01]}>
        <boxGeometry args={[0.003, 0.08, 0.024]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Pommel */}
      <mesh position={[0, -0.11, 0.01]}>
        <boxGeometry args={[0.028, 0.02, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Glock-18 ───────────────────────────────────────────────────
// Krunker's default pistol — clean, compact, reliable
function GlockModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
      {/* Slide */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.035, 0.045, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Slide serrations */}
      <mesh position={[0, 0.01, 0.06]}>
        <boxGeometry args={[0.036, 0.046, 0.04]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.012, -0.15]}>
        <boxGeometry args={[0.018, 0.018, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.012, -0.2]}>
        <boxGeometry args={[0.022, 0.022, 0.02]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Frame */}
      <mesh position={[0, -0.018, 0.01]}>
        <boxGeometry args={[0.033, 0.02, 0.16]} />
        <meshStandardMaterial color="#383838" />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.035, 0.03]}>
        <boxGeometry args={[0.03, 0.018, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.03, 0.03]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.006, 0.018, 0.006]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.07, 0.06]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.032, 0.07, 0.035]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Grip texture */}
      <mesh position={[0.018, -0.07, 0.06]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.018, -0.07, 0.06]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.03]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Magazine base */}
      <mesh position={[0, -0.11, 0.07]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.028, 0.015, 0.03]} />
        <meshStandardMaterial color="#383838" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.04, 0.05]}>
        <boxGeometry args={[0.025, 0.012, 0.012]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.04, -0.08]}>
        <boxGeometry args={[0.008, 0.015, 0.008]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
    </group>
  )
}

// ─── Tec-9 ──────────────────────────────────────────────────────
// Krunker's Tehchy-9 — compact machine pistol, T-side
function Tec9Model() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
      {/* Main body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.038, 0.05, 0.2]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Upper receiver / barrel shroud */}
      <mesh position={[0, 0.01, -0.08]}>
        <boxGeometry args={[0.032, 0.035, 0.18]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.01, -0.2]}>
        <boxGeometry args={[0.018, 0.018, 0.08]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.01, -0.25]}>
        <boxGeometry args={[0.022, 0.022, 0.02]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Magazine — long stick mag */}
      <mesh position={[0, -0.08, 0.02]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.025, 0.1, 0.035]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.13, 0.025]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.028, 0.015, 0.038]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Grip — angled */}
      <mesh position={[0, -0.06, 0.06]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.03, 0.065, 0.032]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* Grip texture */}
      <mesh position={[0.016, -0.06, 0.06]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.028]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.016, -0.06, 0.06]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.028]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.035, 0.04]}>
        <boxGeometry args={[0.028, 0.015, 0.04]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.03, 0.04]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.015, 0.005]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.035, 0.04]}>
        <boxGeometry args={[0.022, 0.012, 0.01]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.035, -0.12]}>
        <boxGeometry args={[0.008, 0.015, 0.008]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Side rail */}
      <mesh position={[0.022, 0.005, -0.04]}>
        <boxGeometry args={[0.005, 0.012, 0.1]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

// ─── Auto Pistol ────────────────────────────────────────────────
// Krunker's Auto Pistol — full-auto compact pistol, CT-side
function AutoPistolModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
      {/* Slide */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.036, 0.048, 0.21]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Slide top */}
      <mesh position={[0, 0.038, -0.01]}>
        <boxGeometry args={[0.032, 0.01, 0.17]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.012, -0.16]}>
        <boxGeometry args={[0.018, 0.018, 0.09]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.012, -0.21]}>
        <boxGeometry args={[0.022, 0.022, 0.02]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Frame */}
      <mesh position={[0, -0.018, 0.01]}>
        <boxGeometry args={[0.034, 0.02, 0.17]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.038, 0.03]}>
        <boxGeometry args={[0.03, 0.018, 0.05]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.032, 0.03]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.006, 0.018, 0.006]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.072, 0.065]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.033, 0.072, 0.036]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Grip texture */}
      <mesh position={[0.018, -0.072, 0.065]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.003, 0.055, 0.032]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.018, -0.072, 0.065]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.003, 0.055, 0.032]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Extended magazine base */}
      <mesh position={[0, -0.115, 0.075]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.03, 0.018, 0.032]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Rear sight */}
      <mesh position={[0, 0.044, 0.05]}>
        <boxGeometry args={[0.024, 0.012, 0.012]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.044, -0.09]}>
        <boxGeometry args={[0.008, 0.016, 0.008]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </group>
  )
}

// ─── Combat Knife ───────────────────────────────────────────────
// Krunker's Combat Knife — larger, more aggressive than default knife
function CombatKnifeModel() {
  return (
    <group rotation={[0.2, -0.4, 0.15]}>
      {/* Blade — larger, tanto-style */}
      <mesh position={[0, 0.09, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.014, 0.16, 0.045]} />
        <meshStandardMaterial
          color="#B0B0B0"
          metalness={0.9}
          roughness={0.08}
        />
      </mesh>
      {/* Blade spine — thicker back edge */}
      <mesh position={[-0.006, 0.09, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.006, 0.14, 0.04]} />
        <meshStandardMaterial
          color="#999999"
          metalness={0.85}
          roughness={0.12}
        />
      </mesh>
      {/* Blade edge — sharp side */}
      <mesh position={[0.009, 0.09, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.005, 0.13, 0.02]} />
        <meshStandardMaterial
          color="#D0D0D0"
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>
      {/* Guard — tactical */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.045, 0.018, 0.045]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Guard serrations */}
      <mesh position={[0.025, 0.01, 0]}>
        <boxGeometry args={[0.008, 0.016, 0.03]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.025, 0.01, 0]}>
        <boxGeometry args={[0.008, 0.016, 0.03]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Handle — tactical grip */}
      <mesh position={[0, -0.055, 0.012]}>
        <boxGeometry args={[0.028, 0.11, 0.032]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Handle finger grooves */}
      <mesh position={[0.016, -0.04, 0.012]}>
        <boxGeometry args={[0.004, 0.03, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.016, -0.04, 0.012]}>
        <boxGeometry args={[0.004, 0.03, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.016, -0.07, 0.012]}>
        <boxGeometry args={[0.004, 0.03, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.016, -0.07, 0.012]}>
        <boxGeometry args={[0.004, 0.03, 0.028]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Pommel — glass breaker */}
      <mesh position={[0, -0.12, 0.012]}>
        <boxGeometry args={[0.025, 0.02, 0.03]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}
