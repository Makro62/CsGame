import { useRef, useState, useEffect, useCallback } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export type BotDifficulty = 1 | 2 | 3 | 4 | 5
export type BotBehavior = "peeker" | "rusher" | "camper" | "awper"

interface BotProps {
  id: string
  position: [number, number, number]
  onHit: (headshot: boolean) => void
  onKill?: () => void
  respawnTime?: number
  difficulty?: BotDifficulty
  behavior?: BotBehavior
}

type BotState = "idle" | "patrol" | "chase" | "strafe" | "dead"

// Difficulty-based parameters
const DIFFICULTY = {
  1: { speed: 0.4, accuracy: 0.3, reactionMs: 800, hsRate: 0.05, aggroRange: 15, name: "Easy" },
  2: { speed: 0.6, accuracy: 0.5, reactionMs: 500, hsRate: 0.15, aggroRange: 20, name: "Medium" },
  3: { speed: 0.8, accuracy: 0.7, reactionMs: 300, hsRate: 0.30, aggroRange: 25, name: "Hard" },
  4: { speed: 0.95, accuracy: 0.85, reactionMs: 150, hsRate: 0.50, aggroRange: 30, name: "Expert" },
  5: { speed: 1.0, accuracy: 0.95, reactionMs: 80, hsRate: 0.70, aggroRange: 35, name: "Legend" },
} as const

const _tempVec = new THREE.Vector3()
const _perpVec = new THREE.Vector3()

export function Bot({
  id,
  position,
  onHit,
  onKill,
  respawnTime = 3000,
  difficulty = 2,
  behavior = "peeker",
}: BotProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [hp, setHp] = useState(100)
  const [botState, setBotState] = useState<BotState>("patrol")
  const respawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const config = DIFFICULTY[difficulty]
  const BASE_SPEED = 5

  // Movement refs
  const currentPos = useRef(new THREE.Vector3(...position))
  const targetPos = useRef(new THREE.Vector3())
  const spawnPos = useRef(new THREE.Vector3(...position))
  const strafeDir = useRef(1)
  const strafeTimer = useRef(0)
  const legPhase = useRef(0)
  const lastShootTime = useRef(0)
  const aggroTimer = useRef(0)

  // Respawn
  useEffect(() => {
    if (botState === "dead") {
      respawnTimer.current = setTimeout(() => {
        setHp(100)
        setBotState("patrol")
        currentPos.current.copy(spawnPos.current)
        pickPatrolTarget()
      }, respawnTime)
    }
    return () => {
      if (respawnTimer.current) clearTimeout(respawnTimer.current)
    }
  }, [botState, respawnTime])

  const pickPatrolTarget = useCallback(() => {
    const angle = Math.random() * Math.PI * 2
    const dist = 3 + Math.random() * 10
    targetPos.current.set(
      spawnPos.current.x + Math.cos(angle) * dist,
      0,
      spawnPos.current.z + Math.sin(angle) * dist
    )
  }, [])

  useEffect(() => {
    pickPatrolTarget()
  }, [pickPatrolTarget])

  const handleClick = useCallback(
    (e: any) => {
      if (botState === "dead") return
      e.stopPropagation?.()

      const point = e.point
      const headY = currentPos.current.y + 1.6
      const isHeadshot = point.y > headY - 0.2

      const damage = isHeadshot ? 100 : 35
      const newHp = hp - damage

      if (newHp <= 0) {
        setHp(0)
        setBotState("dead")
        onHit(isHeadshot)
        onKill?.()
      } else {
        setHp(newHp)
        setBotState("strafe")
        strafeTimer.current = 1.5 + Math.random()
        strafeDir.current = Math.random() > 0.5 ? 1 : -1
      }
    },
    [botState, hp, onHit, onKill]
  )

  // AI + Animation
  useFrame((_, delta) => {
    if (!groupRef.current || botState === "dead") return

    const dt = Math.min(delta, 0.05)
    const pos = currentPos.current
    const distToPlayer = pos.distanceTo(camera.position)
    const moveSpeed = BASE_SPEED * config.speed

    // State transitions
    if (botState === "patrol" && distToPlayer < config.aggroRange) {
      aggroTimer.current += dt
      if (aggroTimer.current > 0.3) {
        setBotState("chase")
        aggroTimer.current = 0
      }
    } else if (botState === "chase" && distToPlayer > config.aggroRange * 1.5) {
      setBotState("patrol")
    } else if (botState === "chase" && distToPlayer < 3) {
      setBotState("strafe")
      strafeTimer.current = 2
    }

    // Movement
    if (botState === "patrol") {
      _tempVec.copy(targetPos.current).sub(pos)
      _tempVec.y = 0
      const dist = _tempVec.length()
      if (dist < 1) {
        pickPatrolTarget()
      } else {
        _tempVec.normalize().multiplyScalar(moveSpeed * dt)
        pos.add(_tempVec)
      }
    } else if (botState === "chase") {
      _tempVec.copy(camera.position)
      _tempVec.y = pos.y
      _tempVec.sub(pos)
      const dist = _tempVec.length()
      if (dist > 4) {
        _tempVec.normalize().multiplyScalar(moveSpeed * 0.8 * dt)
        pos.add(_tempVec)
      }
    } else if (botState === "strafe") {
      strafeTimer.current -= dt
      if (strafeTimer.current <= 0) {
        setBotState(distToPlayer < config.aggroRange ? "chase" : "patrol")
      }

      // Perpendicular strafe
      _tempVec.copy(camera.position)
      _tempVec.y = pos.y
      _tempVec.sub(pos)
      _tempVec.normalize()
      _perpVec.set(-_tempVec.z, 0, _tempVec.x).multiplyScalar(strafeDir.current)
      _perpVec.multiplyScalar(moveSpeed * 0.6 * dt)
      pos.add(_perpVec)

      if (Math.random() < dt * (behavior === "peeker" ? 1.5 : 0.5)) {
        strafeDir.current *= -1
      }
    }

    // Clamp to training area
    pos.x = THREE.MathUtils.clamp(pos.x, -18, 18)
    pos.z = THREE.MathUtils.clamp(pos.z, -33, -5)

    // Update visual
    groupRef.current.position.copy(pos)

    // Face player in combat
    if (botState === "chase" || botState === "strafe") {
      _tempVec.copy(camera.position)
      _tempVec.y = pos.y
      groupRef.current.lookAt(_tempVec)
    }

    // Leg animation
    const currentState = botState as string
    if (currentState !== "dead") {
      const speed = botState === "patrol" ? moveSpeed : moveSpeed * 0.6
      legPhase.current += dt * speed * 2
    }

    // Bot shooting (simulated — deals damage to player via callback)
    if ((botState === "chase" || botState === "strafe") && distToPlayer < config.aggroRange) {
      const now = performance.now()
      const fireInterval = behavior === "awper" ? 1500 : 300
      if (now - lastShootTime.current > fireInterval) {
        // Accuracy check
        if (Math.random() < config.accuracy) {
          const isHS = Math.random() < config.hsRate
          // Emit bot shot event (parent handles player damage)
          window.dispatchEvent(
            new CustomEvent("botShoot", {
              detail: { botId: id, isHeadshot: isHS, damage: isHS ? 100 : 15 },
            })
          )
        }
        lastShootTime.current = now
      }
    }
  })

  if (botState === "dead") return null

  const isMoving = botState === "patrol" || botState === "chase"
  const legSwing = isMoving ? Math.sin(legPhase.current) * 0.35 : 0
  const armSwing = isMoving ? Math.sin(legPhase.current) * 0.4 : 0

  // Color based on difficulty
  const bodyColor = difficulty <= 2 ? "#be123c" : difficulty <= 3 ? "#dc2626" : "#991b1b"
  const headColor = difficulty <= 2 ? "#e11d48" : difficulty <= 3 ? "#ef4444" : "#b91c1c"

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh
        position={[0, 1.6, 0]}
        onClick={handleClick}
        name="bot-head"
        userData={{ targetId: id, isHead: true }}
      >
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color={headColor} />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.08, 1.65, -0.18]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.08, 1.65, -0.18]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshStandardMaterial color="#fda4af" />
      </mesh>

      {/* Torso */}
      <mesh
        position={[0, 0.95, 0]}
        onClick={handleClick}
        name="bot-torso"
        userData={{ targetId: id, isHead: false }}
      >
        <boxGeometry args={[0.5, 0.7, 0.3]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* Belt */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.52, 0.08, 0.32]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* Left Arm */}
      <group position={[0.35, 1.1, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[armSwing * 0.5, 0, 0]}>
          <boxGeometry args={[0.15, 0.35, 0.15]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0, -0.4, 0]} rotation={[armSwing * 0.5, 0, 0]}>
          <boxGeometry args={[0.12, 0.25, 0.12]} />
          <meshStandardMaterial color="#fda4af" />
        </mesh>
      </group>

      {/* Right Arm */}
      <group position={[-0.35, 1.1, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[-armSwing * 0.5, 0, 0]}>
          <boxGeometry args={[0.15, 0.35, 0.15]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh position={[0, -0.4, 0]} rotation={[-armSwing * 0.5, 0, 0]}>
          <boxGeometry args={[0.12, 0.25, 0.12]} />
          <meshStandardMaterial color="#fda4af" />
        </mesh>
      </group>

      {/* Left Leg */}
      <group position={[0.12, 0.45, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[legSwing, 0, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, -0.42, 0]} rotation={[legSwing, 0, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.2]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[-0.12, 0.45, 0]}>
        <mesh position={[0, -0.15, 0]} rotation={[-legSwing, 0, 0]}>
          <boxGeometry args={[0.18, 0.4, 0.18]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, -0.42, 0]} rotation={[-legSwing, 0, 0]}>
          <boxGeometry args={[0.16, 0.2, 0.2]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>

      {/* Weapon (simple gun shape) */}
      <group position={[-0.25, 0.9, -0.2]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.12]}>
          <boxGeometry args={[0.04, 0.04, 0.2]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, -0.04, -0.04]}>
          <boxGeometry args={[0.03, 0.06, 0.06]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </group>

      {/* HP Bar */}
      {hp < 100 && (
        <group position={[0, 2.1, 0]}>
          <mesh>
            <planeGeometry args={[0.6, 0.08]} />
            <meshBasicMaterial color="#374151" />
          </mesh>
          <mesh position={[(hp / 100 - 1) * 0.3, 0, 0.001]}>
            <planeGeometry args={[(hp / 100) * 0.6, 0.08]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}

      {/* Difficulty indicator */}
      <mesh position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color={
            difficulty <= 2 ? "#22c55e" :
            difficulty <= 3 ? "#fbbf24" :
            difficulty <= 4 ? "#f97316" : "#ef4444"
          }
        />
      </mesh>
    </group>
  )
}
