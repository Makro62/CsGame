import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useWeaponStore } from '../../stores/useWeaponStore'
import { useGameStore } from '../../stores/useGameStore'
import { WeaponAnimator } from './WeaponAnimator'

const WEAPON_POSITIONS: Record<string, [number, number, number]> = {
  ak47: [0.25, -0.25, -0.42],
  m4a1: [0.25, -0.25, -0.42],
  awp: [0.28, -0.28, -0.52],
  mp5: [0.24, -0.24, -0.38],
  deagle: [0.2, -0.2, -0.33],
  glock: [0.18, -0.18, -0.3],
  tec9: [0.19, -0.19, -0.32],
  autopistol: [0.18, -0.18, -0.3],
  knife: [0.18, -0.18, -0.28],
  combatknife: [0.18, -0.18, -0.28],
}

const weaponAnimator = new WeaponAnimator()

export function WeaponModel() {
  const groupRef = useRef<THREE.Group>(null)
  const recoilGroupRef = useRef<THREE.Group>(null)
  const { activeWeapon, recoilOffset, isReloading, isSwitching, isADS } =
    useWeaponStore()

  const isMoving = useRef(false)
  const moveIntensity = useRef(0)
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

  useEffect(() => {
    if (isReloading) {
      weaponAnimator.play('reload')
    }
  }, [isReloading])

  useEffect(() => {
    if (isSwitching) {
      weaponAnimator.play('draw')
    }
  }, [isSwitching])

  useEffect(() => {
    if (isADS) {
      weaponAnimator.play('ads_in')
    } else {
      weaponAnimator.play('ads_out')
    }
  }, [isADS])

  useFrame(({ camera, clock }) => {
    if (!groupRef.current || !recoilGroupRef.current || !activeWeapon) return

    const dt = clock.getDelta()

    weaponAnimator.update(dt)
    weaponAnimator.updateBob(dt, moveIntensity.current * 5, moveIntensity.current > 1, isMoving.current)
    weaponAnimator.updateKick(dt)

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

    const deployOffset = isSwitching ? -0.25 : 0

    const basePos = WEAPON_POSITIONS[activeWeapon] || [0.28, -0.28, -0.45]

    groupRef.current.position.copy(camera.position)
    groupRef.current.quaternion.copy(camera.quaternion)

    recoilGroupRef.current.position.set(
      basePos[0] + weaponAnimator.position.x,
      basePos[1] + weaponAnimator.position.y + swingY,
      basePos[2] + weaponAnimator.position.z + deployOffset
    )

    recoilGroupRef.current.rotation.set(
      weaponAnimator.rotation.x + swingAngle,
      weaponAnimator.rotation.y,
      weaponAnimator.rotation.z
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
// Real AK-47: wood furniture, stamped steel receiver, curved mag
function AK47Model() {
  return (
    <group>
      {/* Receiver body — stamped steel look */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.052, 0.065, 0.38]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Receiver top cover */}
      <mesh position={[0, 0.038, -0.02]}>
        <boxGeometry args={[0.048, 0.012, 0.3]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Barrel — cylindrical */}
      <mesh position={[0, 0.008, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Gas tube — above barrel */}
      <mesh position={[0, 0.025, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Front sight block */}
      <mesh position={[0, 0.04, -0.4]}>
        <boxGeometry args={[0.018, 0.035, 0.02]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Front sight post */}
      <mesh position={[0, 0.065, -0.4]}>
        <boxGeometry args={[0.006, 0.02, 0.006]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Rear sight leaf */}
      <mesh position={[0, 0.055, 0.02]}>
        <boxGeometry args={[0.028, 0.025, 0.012]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Muzzle brake — slant cut */}
      <mesh position={[0, 0.008, -0.46]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.016, 0.04, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Handguard — wooden, lower */}
      <mesh position={[0, -0.012, -0.15]}>
        <boxGeometry args={[0.048, 0.03, 0.14]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
      </mesh>
      {/* Handguard — wooden, upper */}
      <mesh position={[0, 0.02, -0.15]}>
        <boxGeometry args={[0.044, 0.022, 0.14]} />
        <meshStandardMaterial color="#9B6E4C" roughness={0.7} />
      </mesh>
      {/* Handguard ventilation slots */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`slot-${i}`} position={[0.026, 0.005, -0.11 - i * 0.03]}>
          <boxGeometry args={[0.003, 0.012, 0.015]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Magazine — curved 7.62mm */}
      <mesh position={[0, -0.085, 0.04]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.032, 0.1, 0.05]} />
        <meshStandardMaterial color="#3d3d3d" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Magazine ribs */}
      <mesh position={[0.018, -0.085, 0.04]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.003, 0.09, 0.045]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[-0.018, -0.085, 0.04]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.003, 0.09, 0.045]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Magazine floor plate */}
      <mesh position={[0, -0.14, 0.05]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.036, 0.015, 0.055]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.04, 0.08]}>
        <boxGeometry args={[0.032, 0.018, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.035, 0.08]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.006, 0.02, 0.004]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Pistol grip — Bakelite/wood */}
      <mesh position={[0, -0.075, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.028, 0.075, 0.03]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.65} />
      </mesh>
      {/* Grip checkering */}
      <mesh position={[0.016, -0.075, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.003, 0.06, 0.025]} />
        <meshStandardMaterial color="#6B4226" />
      </mesh>
      <mesh position={[-0.016, -0.075, 0.12]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.003, 0.06, 0.025]} />
        <meshStandardMaterial color="#6B4226" />
      </mesh>
      {/* Stock — wooden full stock */}
      <mesh position={[0, -0.005, 0.32]}>
        <boxGeometry args={[0.042, 0.055, 0.22]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
      </mesh>
      {/* Stock comb — raised cheek rest */}
      <mesh position={[0, 0.028, 0.32]}>
        <boxGeometry args={[0.038, 0.015, 0.18]} />
        <meshStandardMaterial color="#9B6E4C" roughness={0.7} />
      </mesh>
      {/* Stock wrist — narrow section */}
      <mesh position={[0, -0.005, 0.2]}>
        <boxGeometry args={[0.035, 0.045, 0.04]} />
        <meshStandardMaterial color="#7B4E2C" roughness={0.7} />
      </mesh>
      {/* Stock buttplate — metal */}
      <mesh position={[0, -0.005, 0.44]}>
        <boxGeometry args={[0.04, 0.065, 0.02]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Selector lever / safety */}
      <mesh position={[0.03, 0.005, 0.06]}>
        <boxGeometry args={[0.008, 0.025, 0.06]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Charging handle */}
      <mesh position={[0.032, 0.02, -0.04]}>
        <boxGeometry args={[0.008, 0.012, 0.04]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Dust cover latch */}
      <mesh position={[0, 0.045, 0.08]}>
        <boxGeometry args={[0.015, 0.01, 0.015]} />
        <meshStandardMaterial color="#444444" />
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
// AWP狙击步枪 — long barrel, large scope, bolt action
function AWPModel() {
  return (
    <group>
      {/* Action body — long receiver */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.048, 0.055, 0.48]} />
        <meshStandardMaterial color="#1a3a1a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Action body top */}
      <mesh position={[0, 0.032, 0]}>
        <boxGeometry args={[0.046, 0.01, 0.48]} />
        <meshStandardMaterial color="#2a4a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Barrel — long, heavy profile */}
      <mesh position={[0, 0.005, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.38, 14]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Barrel fluting — weight reduction */}
      {[0, 1, 2].map(i => (
        <mesh key={`flute-${i}`} position={[0.012, 0.005, -0.32 - i * 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.04, 4]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Muzzle brake — multi-port */}
      <mesh position={[0, 0.005, -0.62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.016, 0.06, 14]} />
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

// ─── Desert Eagle ────────────────────────────────────────────────
// Desert Eagle .50 AE — massive, iconic, gold finish
function DeagleModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
      {/* Slide — massive, squared */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.038, 0.052, 0.22]} />
        <meshStandardMaterial color="#DAA520" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Slide top serrations */}
      <mesh position={[0, 0.042, 0.04]}>
        <boxGeometry args={[0.036, 0.008, 0.06]} />
        <meshStandardMaterial color="#C8941E" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Barrel — exposed, under slide */}
      <mesh position={[0, 0.015, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 10]} />
        <meshStandardMaterial color="#B8860B" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.015, -0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.012, 0.03, 10]} />
        <meshStandardMaterial color="#8B7500" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Muzzle crown */}
      <mesh position={[0, 0.015, -0.245]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.014, 0.005, 10]} />
        <meshStandardMaterial color="#6B5500" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Frame — lower */}
      <mesh position={[0, -0.018, 0.02]}>
        <boxGeometry args={[0.036, 0.022, 0.18]} />
        <meshStandardMaterial color="#B8860B" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Accessory rail */}
      <mesh position={[0, -0.028, -0.06]}>
        <boxGeometry args={[0.032, 0.008, 0.08]} />
        <meshStandardMaterial color="#C8941E" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Trigger guard — squared */}
      <mesh position={[0, -0.042, 0.05]}>
        <boxGeometry args={[0.032, 0.018, 0.05]} />
        <meshStandardMaterial color="#8B7500" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Trigger */}
      <mesh position={[0, -0.037, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.005, 0.022, 0.004]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Grip — rubber wraparound */}
      <mesh position={[0, -0.075, 0.08]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.034, 0.07, 0.038]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      {/* Grip texture — diamond pattern */}
      <mesh position={[0.019, -0.075, 0.08]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.003, 0.055, 0.032]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[-0.019, -0.075, 0.08]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.003, 0.055, 0.032]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Grip backstrap */}
      <mesh position={[0, -0.07, 0.1]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.03, 0.06, 0.01]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>
      {/* Magazine — extended */}
      <mesh position={[0, -0.12, 0.09]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.028, 0.06, 0.03]} />
        <meshStandardMaterial color="#DAA520" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Magazine base plate */}
      <mesh position={[0, -0.155, 0.1]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.032, 0.012, 0.035]} />
        <meshStandardMaterial color="#C8941E" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Rear sight — adjustable */}
      <mesh position={[0, 0.05, 0.06]}>
        <boxGeometry args={[0.028, 0.015, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rear sight notch */}
      <mesh position={[0, 0.058, 0.06]}>
        <boxGeometry args={[0.01, 0.008, 0.015]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Front sight — ramped */}
      <mesh position={[0, 0.05, -0.1]}>
        <boxGeometry args={[0.008, 0.018, 0.012]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Front sight dot */}
      <mesh position={[0, 0.06, -0.1]}>
        <boxGeometry args={[0.004, 0.004, 0.004]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.3} />
      </mesh>
      {/* Hammer — external */}
      <mesh position={[0, 0.04, 0.12]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.015, 0.02, 0.012]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Slide stop */}
      <mesh position={[0.022, 0.0, 0.04]}>
        <boxGeometry args={[0.008, 0.012, 0.035]} />
        <meshStandardMaterial color="#C8941E" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Safety lever */}
      <mesh position={[0.022, 0.025, 0.08]}>
        <boxGeometry args={[0.008, 0.01, 0.025]} />
        <meshStandardMaterial color="#C8941E" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Magazine release */}
      <mesh position={[-0.02, -0.025, 0.04]}>
        <boxGeometry args={[0.008, 0.012, 0.015]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Ejection port */}
      <mesh position={[0.022, 0.03, -0.02]}>
        <boxGeometry args={[0.005, 0.02, 0.04]} />
        <meshStandardMaterial color="#8B7500" />
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
// Glock 17/18 — polymer frame, striker-fired
function GlockModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
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
      {/* Grip rough texturing */}
      <mesh position={[0.017, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      <mesh position={[-0.017, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
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
      {/* Slide lock lever */}
      <mesh position={[-0.02, 0.0, 0.02]}>
        <boxGeometry args={[0.006, 0.008, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Magazine release */}
      <mesh position={[-0.018, -0.02, 0.02]}>
        <boxGeometry args={[0.006, 0.01, 0.012]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Ejection port */}
      <mesh position={[0.019, 0.025, -0.02]}>
        <boxGeometry args={[0.004, 0.015, 0.03]} />
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
// Intratec Tec-9 — open-bolt, simple construction
function Tec9Model() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
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
      {/* Barrel shroud holes */}
      {[0, 1, 2].map(i => (
        <mesh key={`hole-${i}`} position={[0.013, 0.008, -0.1 - i * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.005, 6]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
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
      {/* Grip texture */}
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
      {/* Side rails */}
      <mesh position={[0.022, 0.005, -0.04]}>
        <boxGeometry args={[0.004, 0.01, 0.08]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Safety selector */}
      <mesh position={[-0.02, 0.008, 0.06]}>
        <boxGeometry args={[0.006, 0.01, 0.02]} />
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
// Auto Pistol — full-auto compact, similar to Glock 18C
function AutoPistolModel() {
  return (
    <group rotation={[0.15, -0.3, 0.1]}>
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
      {/* Grip texturing */}
      <mesh position={[0.017, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.003, 0.05, 0.026]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.017, -0.065, 0.06]} rotation={[0.28, 0, 0]}>
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
      {/* Fire selector — safe/semi/full */}
      <mesh position={[-0.02, 0.01, 0.04]}>
        <boxGeometry args={[0.006, 0.01, 0.025]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Slide lock */}
      <mesh position={[-0.02, 0.0, 0.02]}>
        <boxGeometry args={[0.006, 0.008, 0.03]} />
        <meshStandardMaterial color="#444444" />
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
// Standard combat knife — clip point blade
function KnifeModel() {
  return (
    <group rotation={[0.2, -0.4, 0.15]}>
      {/* Blade — clip point */}
      <mesh position={[0, 0.08, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.012, 0.14, 0.035]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Blade edge — sharpened */}
      <mesh position={[0.008, 0.08, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.006, 0.13, 0.02]} />
        <meshStandardMaterial color="#A8A8A8" metalness={0.85} roughness={0.12} />
      </mesh>
      {/* Blade spine — thicker back */}
      <mesh position={[-0.005, 0.08, -0.01]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.005, 0.12, 0.03]} />
        <meshStandardMaterial color="#999999" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Clip point tip */}
      <mesh position={[0.004, 0.155, -0.01]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.008, 0.025, 0.015]} />
        <meshStandardMaterial color="#D0D0D0" metalness={0.9} roughness={0.08} />
      </mesh>
      {/* Guard — crossguard */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.04, 0.012, 0.035]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Guard quillon — curved */}
      <mesh position={[0.022, 0.01, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.008, 0.018, 0.025]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[-0.022, 0.01, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.008, 0.018, 0.025]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Handle — stacked leather */}
      <mesh position={[0, -0.05, 0.01]}>
        <boxGeometry args={[0.024, 0.09, 0.026]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
      </mesh>
      {/* Handle spacers */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`spacer-${i}`} position={[0, -0.025 - i * 0.02, 0.01]}>
          <boxGeometry args={[0.026, 0.004, 0.028]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
      {/* Handle wire wrap */}
      <mesh position={[0.014, -0.05, 0.01]}>
        <boxGeometry args={[0.003, 0.075, 0.022]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[-0.014, -0.05, 0.01]}>
        <boxGeometry args={[0.003, 0.075, 0.022]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Pommel — metal */}
      <mesh position={[0, -0.1, 0.01]}>
        <boxGeometry args={[0.026, 0.02, 0.028]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ─── Combat Knife ───────────────────────────────────────────────
// Tactical combat knife — tanto blade, more aggressive
function CombatKnifeModel() {
  return (
    <group rotation={[0.2, -0.4, 0.15]}>
      {/* Blade — tanto style, angular */}
      <mesh position={[0, 0.09, -0.01]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.014, 0.16, 0.04]} />
        <meshStandardMaterial color="#B0B0B0" metalness={0.9} roughness={0.08} />
      </mesh>
      {/* Blade primary edge */}
      <mesh position={[0.009, 0.09, -0.01]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.005, 0.15, 0.018]} />
        <meshStandardMaterial color="#D0D0D0" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Blade spine — swedge grind */}
      <mesh position={[-0.006, 0.09, -0.01]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.005, 0.14, 0.035]} />
        <meshStandardMaterial color="#999999" metalness={0.85} roughness={0.12} />
      </mesh>
      {/* Tanto tip — angular */}
      <mesh position={[0.005, 0.17, -0.01]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.01, 0.03, 0.02]} />
        <meshStandardMaterial color="#D0D0D0" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Blood groove / fuller */}
      <mesh position={[0.004, 0.08, -0.01]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[0.002, 0.1, 0.008]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Guard — tactical, serrated */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.045, 0.015, 0.04]} />
        <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Guard serrations */}
      <mesh position={[0.026, 0.01, 0]}>
        <boxGeometry args={[0.008, 0.013, 0.025]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      <mesh position={[-0.026, 0.01, 0]}>
        <boxGeometry args={[0.008, 0.013, 0.025]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Handle — G10 scales */}
      <mesh position={[0, -0.05, 0.012]}>
        <boxGeometry args={[0.028, 0.1, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.65} />
      </mesh>
      {/* Handle texture — aggressive checkering */}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`check-${i}`} position={[0.016, -0.02 - i * 0.018, 0.012]}>
          <boxGeometry args={[0.004, 0.012, 0.025]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map(i => (
        <mesh key={`checkl-${i}`} position={[-0.016, -0.02 - i * 0.018, 0.012]}>
          <boxGeometry args={[0.004, 0.012, 0.025]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
      {/* Handle lanyard hole */}
      <mesh position={[0, -0.1, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.03, 6]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
      {/* Pommel — glass breaker */}
      <mesh position={[0, -0.11, 0.012]}>
        <boxGeometry args={[0.024, 0.018, 0.028]} />
        <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Pommel point */}
      <mesh position={[0, -0.125, 0.012]}>
        <boxGeometry args={[0.01, 0.012, 0.01]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}
