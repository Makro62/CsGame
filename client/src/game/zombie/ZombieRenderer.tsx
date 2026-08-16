import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { ZombieState, ZombieType } from "@cs-game/shared";

// ============================================================================
// Zombie Color Palettes
// ============================================================================

const ZOMBIE_COLORS: Record<ZombieType, {
  body: string;
  head: string;
  eyes: string;
  arms: string;
}> = {
  walker: { body: "#4a5d23", head: "#5c6b2e", eyes: "#ff0000", arms: "#3d4e1c" },
  runner: { body: "#8b4513", head: "#a0522d", eyes: "#ffff00", arms: "#6b3410" },
  tank: { body: "#2f4f4f", head: "#3a5c5c", eyes: "#ff4444", arms: "#253f3f" },
  spitter: { body: "#556b2f", head: "#6b8e23", eyes: "#00ff00", arms: "#4a5d23" },
  boss: { body: "#8b0000", head: "#a00000", eyes: "#ff0000", arms: "#6b0000" },
};

// ============================================================================
// Animated Zombie Component
// ============================================================================

interface AnimatedZombieProps {
  zombie: ZombieState;
}

function AnimatedZombie({ zombie }: AnimatedZombieProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  const colors = ZOMBIE_COLORS[zombie.type] || ZOMBIE_COLORS.walker;
  const scale = zombie.type === "tank" ? 1.4 : zombie.type === "boss" ? 1.8 : zombie.type === "runner" ? 0.85 : 1;

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(0.8 * scale, 1.0 * scale, 0.5 * scale), [scale]);
  const headGeo = useMemo(() => new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.5 * scale), [scale]);
  const armGeo = useMemo(() => new THREE.BoxGeometry(0.2 * scale, 0.7 * scale, 0.2 * scale), [scale]);
  const legGeo = useMemo(() => new THREE.BoxGeometry(0.25 * scale, 0.5 * scale, 0.25 * scale), [scale]);
  const eyeGeo = useMemo(() => new THREE.SphereGeometry(0.06 * scale, 8, 8), [scale]);

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.body,
    roughness: 0.9,
    metalness: 0.1,
  }), [colors.body]);

  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.head,
    roughness: 0.85,
    metalness: 0.1,
  }), [colors.head]);

  const armMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.arms,
    roughness: 0.9,
    metalness: 0.1,
  }), [colors.arms]);

  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.eyes,
    emissive: colors.eyes,
    emissiveIntensity: 2.0,
    roughness: 0.3,
    metalness: 0.0,
  }), [colors.eyes]);

  const legMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    roughness: 0.95,
    metalness: 0.05,
  }), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta * (zombie.speed || 2.5);

    // Smooth sync
    groupRef.current.position.set(zombie.x, zombie.y, zombie.z);
    groupRef.current.rotation.y = zombie.rotationY;

    // Animate limbs
    const swing = Math.sin(timeRef.current * 4) * 0.4;
    const legSwing = Math.sin(timeRef.current * 4) * 0.3;

    if (leftArmRef.current) leftArmRef.current.rotation.x = zombie.isAttacking ? -1.2 : -0.5 + swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = zombie.isAttacking ? -1.2 : -0.5 - swing;
    if (leftLegRef.current) leftLegRef.current.position.z = legSwing * 0.2;
    if (rightLegRef.current) rightLegRef.current.position.z = -legSwing * 0.2;
  });

  const hpPercent = zombie.maxHp > 0 ? Math.max(0, Math.min(100, (zombie.hp / zombie.maxHp) * 100)) : 100;
  const showHealthBar = zombie.type === "boss" || (zombie.hp < zombie.maxHp && zombie.hp > 0);

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh geometry={bodyGeo} material={bodyMat} position={[0, 0.75 * scale, 0]} />

      {/* Head */}
      <mesh geometry={headGeo} material={headMat} position={[0, 1.5 * scale, 0]} />

      {/* Eyes */}
      <mesh geometry={eyeGeo} material={eyeMat} position={[-0.15 * scale, 1.55 * scale, 0.25 * scale]} />
      <mesh geometry={eyeGeo} material={eyeMat} position={[0.15 * scale, 1.55 * scale, 0.25 * scale]} />

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.55 * scale, 1.0 * scale, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={armGeo} material={armMat} position={[0, -0.2 * scale, 0]} />
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.55 * scale, 1.0 * scale, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={armGeo} material={armMat} position={[0, -0.2 * scale, 0]} />
      </group>

      {/* Left leg */}
      <mesh ref={leftLegRef} geometry={legGeo} material={legMat} position={[-0.18 * scale, 0.25 * scale, 0]} />

      {/* Right leg */}
      <mesh ref={rightLegRef} geometry={legGeo} material={legMat} position={[0.18 * scale, 0.25 * scale, 0]} />

      {/* Overhead health bar for Boss and damaged zombies */}
      {showHealthBar && (
        <Html position={[0, 2.0 * scale, 0]} center distanceFactor={18}>
          <div
            style={{
              width: zombie.type === "boss" ? "100px" : "48px",
              backgroundColor: "rgba(0,0,0,0.8)",
              border: zombie.type === "boss" ? "1px solid #ff0000" : "1px solid #666",
              borderRadius: "3px",
              padding: "1px",
              pointerEvents: "none",
            }}
          >
            {zombie.type === "boss" && (
              <div style={{ color: "#ff4444", fontSize: "9px", fontWeight: "bold", textAlign: "center", marginBottom: "1px" }}>
                BOSS
              </div>
            )}
            <div
              style={{
                width: "100%",
                height: zombie.type === "boss" ? "6px" : "3px",
                backgroundColor: "#222",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  backgroundColor: zombie.type === "boss" ? "#dc2626" : "#22c55e",
                }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Main Zombie Renderer
// ============================================================================

interface ZombieRendererProps {
  zombies: ZombieState[];
}

export function ZombieRenderer({ zombies }: ZombieRendererProps) {
  return (
    <group>
      {zombies.map((zombie) => (
        !zombie.isDead && (
          <AnimatedZombie key={zombie.id} zombie={zombie} />
        )
      ))}
    </group>
  );
}
