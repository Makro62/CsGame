import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";

// ============================================================================
// Color Constants - Desert Theme
// ============================================================================
const COLORS = {
  ground: "#c2b280",
  sand: "#deb887",
  stone: "#8b7355",
  wood: "#8B6914",
  iron: "#444444",
  concrete: "#a0a0a0",
  wall: "#b8a88a",
} as const;

// ============================================================================
// Helper Components
// ============================================================================

type BoxProps = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  receiveShadow?: boolean;
  castShadow?: boolean;
};

function StaticBox({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  receiveShadow = true,
  castShadow = true,
}: BoxProps) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <mesh receiveShadow={receiveShadow} castShadow={castShadow}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </RigidBody>
  );
}

type CylinderProps = {
  position: [number, number, number];
  radius: number;
  height: number;
  color: string;
};

function StaticCylinder({ position, radius, height, color }: CylinderProps) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <CylinderCollider args={[height / 2, radius]} />
    </RigidBody>
  );
}

// ============================================================================
// Ground
// ============================================================================
function Ground() {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.15);
    }
    geo.computeVertexNormals();
  }, []);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
    >
      <planeGeometry args={[60, 40, 40, 40]} />
      <meshStandardMaterial color={COLORS.ground} />
    </mesh>
  );
}

// ============================================================================
// T Spawn Area (West)
// ============================================================================
function TSpawnArea() {
  return (
    <group>
      {/* Spawn cover - stone wall */}
      <StaticBox position={[-22, 0.75, -5]} size={[1, 1.5, 4]} color={COLORS.stone} />
      <StaticBox position={[-22, 0.75, 5]} size={[1, 1.5, 4]} color={COLORS.stone} />
      {/* Back wall */}
      <StaticBox position={[-26, 1.5, 0]} size={[1, 3, 12]} color={COLORS.wall} />
    </group>
  );
}

// ============================================================================
// Mid Area
// ============================================================================
function MidArea() {
  return (
    <group>
      {/* Central structure - stone building */}
      <StaticBox position={[0, 1.5, 0]} size={[4, 3, 4]} color={COLORS.stone} />
      {/* Cover boxes around mid */}
      <StaticBox position={[-8, 0.5, -6]} size={[2, 1, 2]} color={COLORS.wood} />
      <StaticBox position={[8, 0.5, 6]} size={[2, 1, 2]} color={COLORS.wood} />
      {/* Pillars */}
      <StaticCylinder position={[-5, 1, 0]} radius={0.4} height={2} color={COLORS.concrete} />
      <StaticCylinder position={[5, 1, 0]} radius={0.4} height={2} color={COLORS.concrete} />
    </group>
  );
}

// ============================================================================
// Site A (North)
// ============================================================================
function SiteA() {
  return (
    <group>
      {/* A site containers */}
      <StaticBox position={[-5, 1, -18]} size={[6, 2, 4]} color={COLORS.sand} />
      <StaticBox position={[5, 1, -18]} size={[4, 2, 4]} color={COLORS.sand} />
      {/* Cover */}
      <StaticBox position={[0, 0.5, -14]} size={[2, 1, 2]} color={COLORS.wood} />
      {/* Site marker - simple box */}
      <mesh position={[0, 0.01, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Site B (South)
// ============================================================================
function SiteB() {
  return (
    <group>
      {/* B site - elevated platform */}
      <StaticBox position={[0, 0.5, 18]} size={[8, 1, 6]} color={COLORS.concrete} />
      <StaticBox position={[-3, 1.5, 20]} size={[2, 2, 2]} color={COLORS.stone} />
      <StaticBox position={[3, 1.5, 20]} size={[2, 2, 2]} color={COLORS.stone} />
      {/* Site marker */}
      <mesh position={[0, 1.01, 18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================================
// CT Spawn Area (East)
// ============================================================================
function CTSpawnArea() {
  return (
    <group>
      {/* CT spawn cover */}
      <StaticBox position={[22, 0.75, -5]} size={[1, 1.5, 4]} color={COLORS.concrete} />
      <StaticBox position={[22, 0.75, 5]} size={[1, 1.5, 4]} color={COLORS.concrete} />
      {/* Back wall */}
      <StaticBox position={[26, 1.5, 0]} size={[1, 3, 12]} color={COLORS.wall} />
    </group>
  );
}

// ============================================================================
// Perimeter Walls
// ============================================================================
function PerimeterWalls() {
  return (
    <group>
      {/* North wall */}
      <StaticBox position={[0, 3.6, -21]} size={[60, 7.2, 1]} color={COLORS.wall} />
      {/* South wall */}
      <StaticBox position={[0, 3.6, 21]} size={[60, 7.2, 1]} color={COLORS.wall} />
      {/* West wall */}
      <StaticBox position={[-30, 3.6, 0]} size={[1, 7.2, 42]} color={COLORS.wall} />
      {/* East wall */}
      <StaticBox position={[30, 3.6, 0]} size={[1, 7.2, 42]} color={COLORS.wall} />
    </group>
  );
}

// ============================================================================
// Decorative Details
// ============================================================================
function DecorativeDetails() {
  return (
    <group>
      {/* Scattered debris */}
      <StaticBox position={[-15, 0.15, -10]} size={[0.6, 0.3, 0.4]} color={COLORS.wood} />
      <StaticBox position={[12, 0.15, 8]} size={[0.4, 0.3, 0.6]} color={COLORS.wood} />
      <StaticBox position={[-8, 0.15, 12]} size={[0.5, 0.3, 0.5]} color={COLORS.iron} />
      {/* Sand piles */}
      <StaticCylinder position={[-10, 0.2, -8]} radius={1} height={0.4} color={COLORS.sand} />
      <StaticCylinder position={[10, 0.2, 8]} radius={0.8} height={0.3} color={COLORS.sand} />
    </group>
  );
}

// ============================================================================
// Main Export
// ============================================================================
export function Dust() {
  return (
    <group>
      <Ground />
      <TSpawnArea />
      <MidArea />
      <SiteA />
      <SiteB />
      <CTSpawnArea />
      <PerimeterWalls />
      <DecorativeDetails />
    </group>
  );
}
