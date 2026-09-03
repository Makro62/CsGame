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

/** Third-person pistol silhouette — slide + grip + barrel along −Z. */
export function ThirdPersonPistol({ heavy = false }: { heavy?: boolean }) {
  const slideColor = heavy ? '#cbd5e1' : '#1e293b'
  return (
    <group rotation={[0.12, 0, 0]}>
      <mesh position={[0, 0.012, 0.02]}>
        <boxGeometry args={[heavy ? 0.036 : 0.032, heavy ? 0.042 : 0.036, heavy ? 0.17 : 0.13]} />
        <meshStandardMaterial color={slideColor} metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.012, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, heavy ? 0.04 : 0.03, 8]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      <mesh position={[0, -0.012, 0.01]}>
        <boxGeometry args={[0.03, 0.018, 0.11]} />
        <meshStandardMaterial {...WPN.polymer} />
      </mesh>
      <mesh position={[0, -0.048, 0.035]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.028, 0.058, 0.03]} />
        <meshStandardMaterial {...WPN.polymerTan} />
      </mesh>
      <mesh position={[0, 0.032, -0.04]}>
        <boxGeometry args={[0.004, 0.008, 0.004]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/** Third-person SMG with integral suppressor look. */
export function ThirdPersonSmg() {
  return (
    <group rotation={[0.08, 0, 0]}>
      <mesh position={[0, 0.008, 0.04]}>
        <boxGeometry args={[0.04, 0.048, 0.22]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh position={[0, -0.004, -0.08]}>
        <boxGeometry args={[0.038, 0.03, 0.12]} />
        <meshStandardMaterial color="#383838" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.004, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.14, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      <mesh position={[0, 0.004, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.06, 10]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.058, 0.02]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.024, 0.075, 0.032]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.05, 0.07]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.024, 0.055, 0.026]} />
        <meshStandardMaterial {...WPN.polymer} />
      </mesh>
      <mesh position={[0, 0.012, 0.2]}>
        <boxGeometry args={[0.034, 0.032, 0.1]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Third-person AK-47 silhouette. */
export function ThirdPersonAk47() {
  return (
    <group rotation={[0.08, 0, 0]}>
      <mesh position={[0, 0.01, 0.06]}>
        <boxGeometry args={[0.048, 0.058, 0.24]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh position={[0, -0.008, -0.1]}>
        <boxGeometry args={[0.044, 0.028, 0.14]} />
        <meshStandardMaterial {...WPN.wood} />
      </mesh>
      <mesh position={[0, 0.004, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.011, 0.2, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      <mesh position={[0, -0.055, 0.04]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.03, 0.08, 0.04]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.05, 0.1]} rotation={[0.38, 0, 0]}>
        <boxGeometry args={[0.026, 0.06, 0.026]} />
        <meshStandardMaterial {...WPN.wood} />
      </mesh>
      <mesh position={[0, 0.004, 0.22]}>
        <boxGeometry args={[0.04, 0.045, 0.14]} />
        <meshStandardMaterial {...WPN.wood} />
      </mesh>
    </group>
  )
}

/** Third-person M4A1-S with suppressor. */
export function ThirdPersonM4() {
  return (
    <group rotation={[0.08, 0, 0]}>
      <mesh position={[0, 0.008, 0.02]}>
        <boxGeometry args={[0.042, 0.048, 0.22]} />
        <meshStandardMaterial color="#333" metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.004, -0.14]}>
        <boxGeometry args={[0.04, 0.03, 0.12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.002, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.12, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      <mesh position={[0, 0.002, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.1, 12]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.052, 0.02]}>
        <boxGeometry args={[0.028, 0.08, 0.038]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.048, 0.08]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.024, 0.055, 0.026]} />
        <meshStandardMaterial {...WPN.polymer} />
      </mesh>
      <mesh position={[0, 0.006, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.12, 8]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Third-person AWP with scope. */
export function ThirdPersonAwp() {
  return (
    <group rotation={[0.1, 0, 0]}>
      <mesh position={[0, -0.01, -0.04]}>
        <boxGeometry args={[0.048, 0.06, 0.34]} />
        <meshStandardMaterial color="#2d4a2d" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.012, 0.08]}>
        <boxGeometry args={[0.044, 0.04, 0.2]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.004, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.38, 10]} />
        <meshStandardMaterial {...WPN.steelDark} />
      </mesh>
      <mesh position={[0, 0.048, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.016, 0.18, 12]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.058, 0.06]}>
        <boxGeometry args={[0.03, 0.085, 0.042]} />
        <meshStandardMaterial {...WPN.steelMid} />
      </mesh>
      <mesh position={[0, -0.05, 0.12]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.024, 0.055, 0.028]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.6} />
      </mesh>
    </group>
  )
}
