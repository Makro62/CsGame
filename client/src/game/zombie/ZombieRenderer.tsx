import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { ZombieState, ZombieType, ZOMBIE_TYPES } from "@cs-game/shared";

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
// Shared Geometries per Zombie Type (created once, reused by all instances)
// ============================================================================

const SHARED_GEOMETRIES: Record<ZombieType, {
  body: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  eye: THREE.SphereGeometry;
  shoulder: THREE.BoxGeometry;
  chestPlate: THREE.BoxGeometry;
  auraRing: THREE.RingGeometry;
}> = Object.fromEntries(
  Object.entries(ZOMBIE_TYPES).map(([type, cfg]) => {
    const s = cfg.scale ?? 1;
    return [type, {
      body: new THREE.BoxGeometry(0.8 * s, 1.0 * s, 0.5 * s),
      head: new THREE.BoxGeometry(0.6 * s, 0.6 * s, 0.5 * s),
      arm: new THREE.BoxGeometry(0.2 * s, 0.7 * s, 0.2 * s),
      leg: new THREE.BoxGeometry(0.25 * s, 0.5 * s, 0.25 * s),
      eye: new THREE.SphereGeometry(0.06 * s, 8, 8),
      shoulder: new THREE.BoxGeometry(1.1 * s, 0.25 * s, 0.55 * s),
      chestPlate: new THREE.BoxGeometry(0.6 * s, 0.4 * s, 0.15 * s),
      auraRing: new THREE.RingGeometry(1.2 * s, 1.6 * s, 32),
    }];
  })
) as Record<ZombieType, typeof SHARED_GEOMETRIES[ZombieType]>;

const LEG_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.95, metalness: 0.05 });
const ARMOR_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.7, metalness: 0.5 });
const BOSS_AURA_MAT = new THREE.MeshBasicMaterial({ color: "#ff0000", transparent: true, opacity: 0.15, side: THREE.DoubleSide });

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
  const isBoss = zombie.type === "boss";
  const isTank = zombie.type === "tank";

  const geos = SHARED_GEOMETRIES[zombie.type] || SHARED_GEOMETRIES.walker;

  // Materials are per-instance (color varies by zombie type, but type is fixed per instance)
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.body, roughness: 0.9, metalness: isBoss ? 0.3 : 0.1,
  }), [colors.body, isBoss]);

  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.head, roughness: 0.85, metalness: isBoss ? 0.3 : 0.1,
  }), [colors.head, isBoss]);

  const armMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.arms, roughness: 0.9, metalness: isBoss ? 0.3 : 0.1,
  }), [colors.arms, isBoss]);

  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.eyes, emissive: colors.eyes, emissiveIntensity: isBoss ? 3.5 : 2.0,
    roughness: 0.3, metalness: 0.0,
  }), [colors.eyes, isBoss]);

  useEffect(() => {
    return () => {
      bodyMat.dispose();
      headMat.dispose();
      armMat.dispose();
      eyeMat.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta * (zombie.speed || 2.5);

    // Smooth sync
    groupRef.current.position.set(zombie.x, zombie.y, zombie.z);
    groupRef.current.rotation.y = zombie.rotationY;

    // Animate limbs — boss swings slower and heavier
    const speedMult = isBoss ? 0.6 : isTank ? 0.7 : 1.0;
    const swing = Math.sin(timeRef.current * 4 * speedMult) * 0.4;
    const legSwing = Math.sin(timeRef.current * 4 * speedMult) * 0.3;

    if (leftArmRef.current) leftArmRef.current.rotation.x = zombie.isAttacking ? -1.2 : -0.5 + swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = zombie.isAttacking ? -1.2 : -0.5 - swing;
    if (leftLegRef.current) leftLegRef.current.position.z = legSwing * 0.2;
    if (rightLegRef.current) rightLegRef.current.position.z = -legSwing * 0.2;
  });

  const scale = ZOMBIE_TYPES[zombie.type]?.scale ?? 1;
  const hpPercent = zombie.maxHp > 0 ? Math.max(0, Math.min(100, (zombie.hp / zombie.maxHp) * 100)) : 100;
  const showHealthBar = zombie.type === "boss" || (zombie.hp < zombie.maxHp && zombie.hp > 0);

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh geometry={geos.body} material={bodyMat} position={[0, 0.75 * scale, 0]} />

      {/* Boss: chest plate armor */}
      {isBoss && (
        <mesh geometry={geos.chestPlate} material={ARMOR_MAT} position={[0, 0.75 * scale, 0.3 * scale]} />
      )}

      {/* Head */}
      <mesh geometry={geos.head} material={headMat} position={[0, 1.5 * scale, 0]} />

      {/* Eyes */}
      <mesh geometry={geos.eye} material={eyeMat} position={[-0.15 * scale, 1.55 * scale, 0.25 * scale]} />
      <mesh geometry={geos.eye} material={eyeMat} position={[0.15 * scale, 1.55 * scale, 0.25 * scale]} />

      {/* Boss: extra pair of eyes (menacing) */}
      {isBoss && (
        <>
          <mesh geometry={geos.eye} material={eyeMat} position={[-0.25 * scale, 1.65 * scale, 0.22 * scale]} />
          <mesh geometry={geos.eye} material={eyeMat} position={[0.25 * scale, 1.65 * scale, 0.22 * scale]} />
        </>
      )}

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.55 * scale, 1.0 * scale, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={geos.arm} material={armMat} position={[0, -0.2 * scale, 0]} />
        {isBoss && <mesh geometry={geos.shoulder} material={ARMOR_MAT} position={[0, 0.3 * scale, 0]} />}
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.55 * scale, 1.0 * scale, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={geos.arm} material={armMat} position={[0, -0.2 * scale, 0]} />
        {isBoss && <mesh geometry={geos.shoulder} material={ARMOR_MAT} position={[0, 0.3 * scale, 0]} />}
      </group>

      {/* Left leg */}
      <mesh ref={leftLegRef} geometry={geos.leg} material={LEG_MAT} position={[-0.18 * scale, 0.25 * scale, 0]} />

      {/* Right leg */}
      <mesh ref={rightLegRef} geometry={geos.leg} material={LEG_MAT} position={[0.18 * scale, 0.25 * scale, 0]} />

      {/* Boss: glowing aura ring on ground */}
      {isBoss && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geos.auraRing} material={BOSS_AURA_MAT} />
      )}

      {/* Overhead health bar */}
      {showHealthBar && (
        <Html position={[0, (isBoss ? 2.4 : 2.0) * scale, 0]} center distanceFactor={18}>
          <div
            style={{
              width: isBoss ? "120px" : "48px",
              backgroundColor: "rgba(0,0,0,0.85)",
              border: isBoss ? "2px solid #ff0000" : "1px solid #666",
              borderRadius: "4px",
              padding: isBoss ? "3px" : "1px",
              pointerEvents: "none",
            }}
          >
            {isBoss && (
              <div style={{ color: "#ff4444", fontSize: "10px", fontWeight: "bold", textAlign: "center", marginBottom: "2px", letterSpacing: "1px" }}>
                BOSS — {zombie.hp.toLocaleString()} HP
              </div>
            )}
            <div
              style={{
                width: "100%",
                height: isBoss ? "6px" : "3px",
                backgroundColor: "#222",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${hpPercent}%`,
                  height: "100%",
                  backgroundColor: isBoss ? "#dc2626" : "#22c55e",
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
