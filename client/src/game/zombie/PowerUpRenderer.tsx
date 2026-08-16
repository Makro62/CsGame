import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PowerUpState, PowerUpType } from "@cs-game/shared";

// ============================================================================
// PowerUp Colors & Shapes
// ============================================================================

const POWER_UP_VISUALS: Record<PowerUpType, { color: string; emissive: string; shape: "box" | "sphere" | "octahedron" }> = {
  max_ammo: { color: "#22c55e", emissive: "#22c55e", shape: "box" },
  nuke: { color: "#ff4444", emissive: "#ff0000", shape: "octahedron" },
  insta_kill: { color: "#a855f7", emissive: "#9333ea", shape: "sphere" },
  double_points: { color: "#ffd700", emissive: "#ffaa00", shape: "box" },
  carpenter: { color: "#f97316", emissive: "#ea580c", shape: "box" },
  fire_sale: { color: "#06b6d4", emissive: "#0891b2", shape: "sphere" },
};

// ============================================================================
// Single PowerUp Mesh
// ============================================================================

interface PowerUpMeshProps {
  type: PowerUpType;
}

function PowerUpMesh({ type }: PowerUpMeshProps) {
  const visual = POWER_UP_VISUALS[type];
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: visual.color,
        emissive: visual.emissive,
        emissiveIntensity: 1.5,
        roughness: 0.3,
        metalness: 0.5,
        transparent: true,
        opacity: 0.9,
      }),
    [visual.color, visual.emissive]
  );

  const geometry = useMemo(() => {
    switch (visual.shape) {
      case "sphere":
        return new THREE.SphereGeometry(0.4, 16, 16);
      case "octahedron":
        return new THREE.OctahedronGeometry(0.4, 0);
      case "box":
      default:
        return new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }
  }, [visual.shape]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta * 2;
    groupRef.current.rotation.y += delta * 1.5;
    groupRef.current.position.y = 0.5 + Math.sin(timeRef.current) * 0.2;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshStandardMaterial
          color={visual.color}
          emissive={visual.emissive}
          emissiveIntensity={2}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main PowerUp Renderer
// ============================================================================

interface PowerUpRendererProps {
  powerUps: PowerUpState[];
  onPickup: (id: string) => void;
  playerPosition?: { x: number; z: number };
}

export function PowerUpRenderer({ powerUps, onPickup, playerPosition }: PowerUpRendererProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!playerPosition || !groupRef.current) return;

    // Check proximity for pickup
    groupRef.current.children.forEach((child) => {
      const pos = child.position;
      const dx = pos.x - playerPosition.x;
      const dz = pos.z - playerPosition.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2) {
        const id = (child as any).userData?.id;
        if (id) onPickup(id);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {powerUps.map((powerUp) => (
        <group
          key={powerUp.id}
          position={[powerUp.x, powerUp.y, powerUp.z]}
          userData={{ id: powerUp.id }}
        >
          <PowerUpMesh type={powerUp.type} />
        </group>
      ))}
    </group>
  );
}
