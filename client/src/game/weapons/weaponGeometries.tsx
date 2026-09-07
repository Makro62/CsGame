import { useMemo } from 'react'
import * as THREE from 'three'

/** Shared PBR presets — keeps metal/polymer reads consistent across all weapon meshes. */
export const WPN = {
  steelDark: { color: '#1a1c1e', metalness: 0.82, roughness: 0.28 },
  steelMid: { color: '#374151', metalness: 0.75, roughness: 0.32 },
  steelLight: { color: '#cbd5e1', metalness: 0.88, roughness: 0.2 },
  polymer: { color: '#111827', roughness: 0.72, metalness: 0.06 },
  polymerTan: { color: '#1c1917', roughness: 0.7, metalness: 0.05 },
  wood: { color: '#6b3d1f', roughness: 0.75, metalness: 0.02 },
  blade: { color: '#e8edf2', metalness: 0.96, roughness: 0.12 },
  bladeTactical: { color: '#cbd5e1', metalness: 0.96, roughness: 0.12 },
  grip: { color: '#1c1917', roughness: 0.75, metalness: 0.06 },
  gripTactical: { color: '#111827', roughness: 0.72, metalness: 0.08 },
  ring: { color: '#9ca3af', metalness: 0.85, roughness: 0.22 },
  ringTactical: { color: '#64748b', metalness: 0.85, roughness: 0.22 },
} as const

/**
 * Karambit blade in the XZ plane (forward = −Z), extruded thin on Y.
 * Reads correctly in first- and third-person instead of a paper-thin edge view.
 */
export function makeKarambitBladeGeometry(thickness = 0.011): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(0.006, 0)
  shape.lineTo(0.018, -0.014)
  shape.quadraticCurveTo(0.058, -0.052, 0.05, -0.115)
  shape.quadraticCurveTo(0.018, -0.168, -0.056, -0.148)
  shape.quadraticCurveTo(-0.078, -0.124, -0.066, -0.098)
  shape.quadraticCurveTo(-0.028, -0.078, -0.01, -0.036)
  shape.quadraticCurveTo(-0.004, -0.014, -0.006, 0)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.26,
    bevelSize: 0.0016,
    bevelSegments: 2,
    curveSegments: 12,
  })
  geo.translate(0, -thickness / 2, 0)
  geo.computeVertexNormals()
  return geo
}

/** First-person karambit — grip along +Z, blade hooks forward (−Z). */
export function FpsKarambitModel({ flip = false, tactical = false }: { flip?: boolean; tactical?: boolean }) {
  const bladeGeo = useMemo(() => makeKarambitBladeGeometry(0.011), [])
  const bladeMat = tactical ? WPN.bladeTactical : WPN.blade
  const gripMat = tactical ? WPN.gripTactical : WPN.grip
  const ringMat = tactical ? WPN.ringTactical : WPN.ring

  return (
    <group scale={[flip ? -1 : 1, 1, 1]}>
      <mesh geometry={bladeGeo} position={[0, 0.014, -0.045]} castShadow>
        <meshStandardMaterial {...bladeMat} />
      </mesh>
      <mesh position={[0.004, 0.012, 0.018]}>
        <boxGeometry args={[0.008, 0.055, 0.004]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, 0.01, 0.024]}>
        <boxGeometry args={[0.026, 0.016, 0.012]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.006, 0.058]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.024, 0.042, 0.062]} />
        <meshStandardMaterial {...gripMat} />
      </mesh>
      <mesh position={[0, -0.012, 0.092]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0145, 0.0042, 10, 20]} />
        <meshStandardMaterial {...ringMat} />
      </mesh>
    </group>
  )
}

/** Compact third-person karambit for bots / minecraft characters. */
export function ThirdPersonKarambit({ flip = false, tactical = false, scale = 1 }: { flip?: boolean; tactical?: boolean; scale?: number }) {
  const bladeGeo = useMemo(() => {
    const geo = makeKarambitBladeGeometry(0.007)
    geo.scale(0.72, 0.72, 0.72)
    return geo
  }, [])

  const bladeMat = tactical ? WPN.bladeTactical : WPN.blade
  const gripMat = tactical ? WPN.gripTactical : WPN.grip

  return (
    <group scale={scale * (flip ? -1 : 1)} rotation={[0.15, flip ? -0.12 : 0.12, flip ? -0.1 : 0.1]}>
      <mesh geometry={bladeGeo} position={[0, 0.008, -0.032]} castShadow>
        <meshStandardMaterial {...bladeMat} />
      </mesh>
      <mesh position={[0, 0.006, 0.012]}>
        <boxGeometry args={[0.018, 0.01, 0.008]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.004, 0.042]} rotation={[0.22, 0, 0]}>
        <boxGeometry args={[0.016, 0.028, 0.042]} />
        <meshStandardMaterial {...gripMat} />
      </mesh>
      <mesh position={[0, -0.008, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.01, 0.003, 8, 16]} />
        <meshStandardMaterial {...WPN.ring} />
      </mesh>
    </group>
  )
}

/** Third-person Desert Eagle .50 AE silhouette — brushed chrome slide & triangular barrel. */
export function ThirdPersonDeagle() {
  return (
    <group rotation={[0.12, 0, 0]}>
      {/* Massive polygonal slide in brushed chrome */}
      <mesh position={[0, 0.016, 0.02]} castShadow>
        <boxGeometry args={[0.038, 0.046, 0.17]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
      </mesh>
      {/* Triangular barrel top rib */}
      <mesh position={[0, 0.04, 0.01]}>
        <boxGeometry args={[0.022, 0.008, 0.15]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.25} />
      </mesh>
      {/* Heavy bore muzzle */}
      <mesh position={[0, 0.016, -0.075]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.02, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Frame / trigger guard */}
      <mesh position={[0, -0.01, 0.01]}>
        <boxGeometry args={[0.032, 0.018, 0.12]} />
        <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Textured black grip */}
      <mesh position={[0, -0.052, 0.042]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.03, 0.065, 0.034]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Front and rear combat sights */}
      <mesh position={[0, 0.044, -0.05]}>
        <boxGeometry args={[0.004, 0.008, 0.004]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

/** Third-person Glock-18 silhouette — boxy Tenifer black slide & polymer lower. */
export function ThirdPersonGlock() {
  return (
    <group rotation={[0.12, 0, 0]}>
      {/* Squared Tenifer matte black steel slide */}
      <mesh position={[0, 0.014, 0.01]} castShadow>
        <boxGeometry args={[0.032, 0.034, 0.14]} />
        <meshStandardMaterial color="#18181b" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Ejection port cutout */}
      <mesh position={[0.014, 0.022, 0.005]}>
        <boxGeometry args={[0.006, 0.014, 0.032]} />
        <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Muzzle barrel */}
      <mesh position={[0, 0.014, -0.065]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.02, 8]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Polymer lightweight frame with finger grooves */}
      <mesh position={[0, -0.01, 0.005]}>
        <boxGeometry args={[0.028, 0.016, 0.12]} />
        <meshStandardMaterial color="#09090b" roughness={0.78} metalness={0.05} />
      </mesh>
      {/* Ergonomic angled grip */}
      <mesh position={[0, -0.048, 0.035]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.026, 0.058, 0.03]} />
        <meshStandardMaterial color="#09090b" roughness={0.82} metalness={0.04} />
      </mesh>
      {/* White dot combat sights */}
      <mesh position={[0, 0.034, -0.05]}>
        <boxGeometry args={[0.004, 0.006, 0.004]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

/** Third-person Tec-9 silhouette — perforated barrel shroud & extended mag. */
export function ThirdPersonTec9() {
  return (
    <group rotation={[0.1, 0, 0]}>
      {/* Upper receiver */}
      <mesh position={[0, 0.014, 0.02]} castShadow>
        <boxGeometry args={[0.034, 0.038, 0.16]} />
        <meshStandardMaterial color="#27272a" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Cylindrical ventilated heat shroud */}
      <mesh position={[0, 0.014, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.09, 12]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Muzzle tip */}
      <mesh position={[0, 0.014, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.02, 8]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Long extended stick magazine */}
      <mesh position={[0, -0.07, -0.01]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[0.022, 0.11, 0.028]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      {/* Polymer grip */}
      <mesh position={[0, -0.048, 0.05]} rotation={[0.26, 0, 0]}>
        <boxGeometry args={[0.026, 0.06, 0.03]} />
        <meshStandardMaterial {...WPN.polymer} />
      </mesh>
    </group>
  )
}

/** Legacy ThirdPersonPistol wrapper for backwards compatibility */
export function ThirdPersonPistol({ heavy = false }: { heavy?: boolean }) {
  return heavy ? <ThirdPersonDeagle /> : <ThirdPersonGlock />
}

/** Third-person SMG (MP5-SD) with iconic integral rubberized suppressor & curved mag. */
export function ThirdPersonSmg() {
  return (
    <group rotation={[0.08, 0, 0]}>
      {/* Stamped steel upper receiver */}
      <mesh position={[0, 0.01, 0.04]} castShadow>
        <boxGeometry args={[0.038, 0.048, 0.22]} />
        <meshStandardMaterial color="#1c1917" metalness={0.72} roughness={0.32} />
      </mesh>
      {/* Cocking tube on top */}
      <mesh position={[0, 0.038, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.16, 10]} />
        <meshStandardMaterial color="#292524" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Ribbed integral cylindrical suppressor (MP5-SD look) */}
      <mesh position={[0, 0.008, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.017, 0.017, 0.18, 14]} />
        <meshStandardMaterial color="#171717" roughness={0.8} metalness={0.15} />
      </mesh>
      {/* Muzzle crown */}
      <mesh position={[0, 0.008, -0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.016, 0.02, 12]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Curved 30-round 9mm magazine */}
      <mesh position={[0, -0.068, 0.02]} rotation={[0.24, 0, 0]}>
        <boxGeometry args={[0.022, 0.09, 0.03]} />
        <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.25} />
      </mesh>
      {/* Navy trigger group & pistol grip */}
      <mesh position={[0, -0.052, 0.075]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.024, 0.058, 0.028]} />
        <meshStandardMaterial {...WPN.polymer} />
      </mesh>
      {/* Retractable A3 stock rails */}
      <mesh position={[0.02, 0.008, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.16, 6]} />
        <meshStandardMaterial {...WPN.steelLight} />
      </mesh>
      <mesh position={[-0.02, 0.008, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.16, 6]} />
        <meshStandardMaterial {...WPN.steelLight} />
      </mesh>
      <mesh position={[0, 0.006, 0.26]}>
        <boxGeometry args={[0.046, 0.05, 0.015]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Third-person AK-47 — real wood furniture, stamped steel receiver & banana magazine. */
export function ThirdPersonAk47() {
  return (
    <group rotation={[0.08, 0, 0]}>
      {/* Stamped steel receiver */}
      <mesh position={[0, 0.012, 0.05]} castShadow>
        <boxGeometry args={[0.044, 0.056, 0.22]} />
        <meshStandardMaterial color="#262626" metalness={0.72} roughness={0.34} />
      </mesh>
      {/* Receiver top dust cover with longitudinal ribs */}
      <mesh position={[0, 0.042, 0.04]}>
        <boxGeometry args={[0.038, 0.012, 0.18]} />
        <meshStandardMaterial color="#1f1f1f" metalness={0.65} roughness={0.4} />
      </mesh>
      {/* Lower wooden handguard */}
      <mesh position={[0, -0.008, -0.11]} castShadow>
        <boxGeometry args={[0.042, 0.032, 0.13]} />
        <meshStandardMaterial color="#78350f" roughness={0.68} metalness={0.05} />
      </mesh>
      {/* Upper wooden gas tube cover */}
      <mesh position={[0, 0.026, -0.11]}>
        <boxGeometry args={[0.036, 0.022, 0.11]} />
        <meshStandardMaterial color="#854d0e" roughness={0.7} metalness={0.04} />
      </mesh>
      {/* Gas block & tube forward section */}
      <mesh position={[0, 0.025, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.12, 8]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Main rifled steel barrel */}
      <mesh position={[0, 0.006, -0.27]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.009, 0.22, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Hooded front sight post */}
      <mesh position={[0, 0.032, -0.36]}>
        <boxGeometry args={[0.008, 0.022, 0.008]} />
        <meshStandardMaterial color="#171717" metalness={0.8} />
      </mesh>
      {/* Slanted muzzle compensator */}
      <mesh position={[0, 0.006, -0.39]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.009, 0.025, 8]} />
        <meshStandardMaterial color="#222" metalness={0.85} />
      </mesh>
      {/* Iconic 30-round banana curved magazine (ribbed steel / bakelite) */}
      <mesh position={[0, -0.065, 0.02]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.024, 0.095, 0.04]} />
        <meshStandardMaterial color="#9a3412" roughness={0.65} metalness={0.25} />
      </mesh>
      {/* Wooden pistol grip */}
      <mesh position={[0, -0.052, 0.105]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.024, 0.058, 0.028]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} metalness={0.04} />
      </mesh>
      {/* Solid wooden buttstock */}
      <mesh position={[0, -0.004, 0.22]} rotation={[-0.04, 0, 0]}>
        <boxGeometry args={[0.036, 0.052, 0.15]} />
        <meshStandardMaterial color="#78350f" roughness={0.68} metalness={0.05} />
      </mesh>
    </group>
  )
}

/** Third-person M4A1-S — signature detachable silencer, carry handle & quad-rail handguard. */
export function ThirdPersonM4() {
  return (
    <group rotation={[0.08, 0, 0]}>
      {/* Receiver with carry handle */}
      <mesh position={[0, 0.01, 0.02]} castShadow>
        <boxGeometry args={[0.04, 0.05, 0.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Carry handle optic bridge */}
      <mesh position={[0, 0.044, 0.01]}>
        <boxGeometry args={[0.02, 0.018, 0.14]} />
        <meshStandardMaterial color="#0f172a" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Ribbed quad-rail tactical handguard */}
      <mesh position={[0, 0.006, -0.14]}>
        <boxGeometry args={[0.038, 0.034, 0.13]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Triangle front sight base */}
      <mesh position={[0, 0.034, -0.21]}>
        <boxGeometry args={[0.01, 0.026, 0.018]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      {/* Free-floating steel barrel */}
      <mesh position={[0, 0.004, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Signature M4A1-S cylindrical suppressor */}
      <mesh position={[0, 0.004, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 14]} />
        <meshStandardMaterial color="#09090b" metalness={0.75} roughness={0.28} />
      </mesh>
      {/* Curved STANAG 5.56 30-round magazine */}
      <mesh position={[0, -0.062, 0.01]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.024, 0.085, 0.036]} />
        <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Ergonomic polymer A2 pistol grip */}
      <mesh position={[0, -0.052, 0.08]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[0.024, 0.058, 0.026]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.06} />
      </mesh>
      {/* Buffer tube & LE collapsible carbine stock */}
      <mesh position={[0, 0.008, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.12, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.002, 0.22]}>
        <boxGeometry args={[0.032, 0.052, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.75} metalness={0.08} />
      </mesh>
    </group>
  )
}

/** Third-person AWP — signature British Arctic Warfare OD green chassis & sniper scope. */
export function ThirdPersonAwp() {
  return (
    <group rotation={[0.1, 0, 0]}>
      {/* Iconic Olive Drab green thumbhole polymer body */}
      <mesh position={[0, -0.008, -0.04]} castShadow>
        <boxGeometry args={[0.044, 0.06, 0.36]} />
        <meshStandardMaterial color="#2d421e" roughness={0.65} metalness={0.08} />
      </mesh>
      {/* Rear stock with thumbhole cutout section */}
      <mesh position={[0, 0.008, 0.17]}>
        <boxGeometry args={[0.04, 0.052, 0.18]} />
        <meshStandardMaterial color="#223317" roughness={0.68} metalness={0.08} />
      </mesh>
      {/* Adjustable rubber cheek rest & buttpad */}
      <mesh position={[0, 0.038, 0.18]}>
        <boxGeometry args={[0.034, 0.015, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.005, 0.26]}>
        <boxGeometry args={[0.038, 0.06, 0.016]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Massive fluted free-floating barrel */}
      <mesh position={[0, 0.006, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.014, 0.44, 12]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      {/* Large dual-port tactical muzzle brake */}
      <mesh position={[0, 0.006, -0.58]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.04, 10]} />
        <meshStandardMaterial color="#171717" metalness={0.85} roughness={0.25} />
      </mesh>
      {/* Telescopic sniper scope tube */}
      <mesh position={[0, 0.054, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.016, 0.24, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Scope front objective lens bell */}
      <mesh position={[0, 0.054, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.023, 0.018, 0.04, 12]} />
        <meshStandardMaterial color="#111827" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Scope elevation turret */}
      <mesh position={[0, 0.076, -0.02]}>
        <boxGeometry args={[0.014, 0.014, 0.014]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
      {/* Heavy 5-round box magazine */}
      <mesh position={[0, -0.062, 0.05]} rotation={[-0.04, 0, 0]}>
        <boxGeometry args={[0.028, 0.075, 0.044]} />
        <meshStandardMaterial color="#334155" metalness={0.78} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Wonder Weapon / Arc Caster model */
export function ThirdPersonArcCaster() {
  return (
    <group position={[0, 0, 0.1]} rotation={[0.08, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.055, 0.07, 0.32]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0.03, 0.01, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-0.03, 0.01, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

/** Animated Muzzle Flash */
export function MuzzleFlash({ z = 0.48, scale = 1 }: { z?: number; scale?: number }) {
  return (
    <group position={[0, 0.01, z]} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#ffe08a" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/**
 * SharedThirdPersonWeaponMesh — Single source of truth for third-person weapon meshes
 * used identically across 5v5 Bots and Survivor Campaign player characters!
 */
export function SharedThirdPersonWeaponMesh({
  weapon = "ak47",
  isFiring = false,
  muzzleZ,
  scale = 1,
}: {
  weapon?: string | null;
  isFiring?: boolean;
  muzzleZ?: number;
  scale?: number;
}) {
  const w = (weapon ?? "ak47").toLowerCase();

  let mesh = <ThirdPersonAk47 />;
  let defMuzzleZ = -0.42;

  if (w.includes("awp")) {
    mesh = <ThirdPersonAwp />;
    defMuzzleZ = -0.62;
  } else if (w.includes("ak47") || w.includes("ak-")) {
    mesh = <ThirdPersonAk47 />;
    defMuzzleZ = -0.42;
  } else if (w.includes("m4a1") || w.includes("m4")) {
    mesh = <ThirdPersonM4 />;
    defMuzzleZ = -0.44;
  } else if (w.includes("mp5")) {
    mesh = <ThirdPersonSmg />;
    defMuzzleZ = -0.32;
  } else if (w.includes("deagle")) {
    mesh = <ThirdPersonDeagle />;
    defMuzzleZ = -0.16;
  } else if (w.includes("tec9") || w.includes("tec-9")) {
    mesh = <ThirdPersonTec9 />;
    defMuzzleZ = -0.18;
  } else if (w.includes("glock") || w.includes("autopistol") || w.includes("pistol")) {
    mesh = <ThirdPersonGlock />;
    defMuzzleZ = -0.15;
  } else if (w.includes("knife") || w.includes("karambit") || w.includes("combatknife")) {
    mesh = <ThirdPersonKarambit />;
    defMuzzleZ = 0;
  } else if (w.includes("arccaster")) {
    mesh = <ThirdPersonArcCaster />;
    defMuzzleZ = -0.25;
  }

  const mz = muzzleZ ?? defMuzzleZ;

  return (
    <group scale={scale}>
      {mesh}
      {isFiring && <MuzzleFlash z={mz} />}
    </group>
  );
}

