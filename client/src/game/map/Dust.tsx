import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { BOMB_SITES, BUY_ZONE } from "@cs-game/shared";
import { StaticBox, StaticCylinder, FloorZone, SiteMarker, SpawnZone } from "./MapHelpers";

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
  t: "#991b1b",
  ct: "#1e3a8a",
} as const;

// ============================================================================
// Ground
// ============================================================================
function Ground() {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const height = Math.sin(x * 0.1) * Math.cos(z * 0.08) * 0.3 + (Math.random() - 0.5) * 0.1;
      pos.setY(i, height);
    }
    geo.computeVertexNormals();
  }, []);

  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh
        ref={meshRef}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.5, 0]}
      >
        <planeGeometry args={[60, 40, 40, 40]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.9} metalness={0.02} flatShading />
      </mesh>
      <CuboidCollider args={[30, 1.0, 20]} />
    </RigidBody>
  );
}

// ============================================================================
// T Spawn Area (West)
// ============================================================================
function TSpawnArea() {
  return (
    <group>
      <StaticBox position={[-22, 0.75, -5]} size={[1, 1.5, 4]} color={COLORS.stone} materialType="concrete" />
      <StaticBox position={[-22, 0.75, 5]} size={[1, 1.5, 4]} color={COLORS.stone} materialType="concrete" />
      <StaticBox position={[-26, 1.5, 0]} size={[1, 3, 12]} color={COLORS.wall} materialType="concrete" />
      <SpawnZone position={[BUY_ZONE.T.x, 0.03, BUY_ZONE.T.z]} color={COLORS.t} radius={BUY_ZONE.T.radius} />
    </group>
  );
}

// ============================================================================
// Mid Area - Improved with more cover variety
// ============================================================================
function MidArea() {
  return (
    <group>
      <StaticBox position={[0, 1.5, 0]} size={[4, 3, 4]} color={COLORS.stone} materialType="concrete" />
      <StaticBox position={[-8, 0.5, -6]} size={[2, 1, 2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[8, 0.5, 6]} size={[2, 1, 2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[-4, 0.75, 4]} size={[3, 1.5, 1.5]} color={COLORS.iron} materialType="metal" />
      <StaticBox position={[4, 0.75, -4]} size={[3, 1.5, 1.5]} color={COLORS.iron} materialType="metal" />
      <StaticCylinder position={[-5, 1, 0]} radius={0.4} height={2} color={COLORS.concrete} materialType="concrete" />
      <StaticCylinder position={[5, 1, 0]} radius={0.4} height={2} color={COLORS.concrete} materialType="concrete" />
      <StaticCylinder position={[0, 0.6, -3]} radius={0.3} height={1.2} color={COLORS.iron} materialType="metal" />
      <StaticCylinder position={[0, 0.6, 3]} radius={0.3} height={1.2} color={COLORS.iron} materialType="metal" />
    </group>
  );
}

// ============================================================================
// Site A (North) - Improved structure
// ============================================================================
function SiteA() {
  return (
    <group>
      <StaticBox position={[-5, 1, -18]} size={[6, 2, 4]} color={COLORS.sand} materialType="concrete" />
      <StaticBox position={[5, 1, -18]} size={[4, 2, 4]} color={COLORS.sand} materialType="concrete" />
      <StaticBox position={[0, 0.5, -14]} size={[2, 1, 2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[-3, 0.75, -12]} size={[2, 1.5, 1.5]} color={COLORS.iron} materialType="metal" />
      <StaticBox position={[8, 0.5, -14]} size={[1.5, 1, 1.5]} color={COLORS.wood} materialType="wood" />
      <FloorZone position={[BOMB_SITES.A.x, 0.02, BOMB_SITES.A.z]} size={[BOMB_SITES.A.radius * 2, BOMB_SITES.A.radius * 2]} color="#dc2626" opacity={0.18} />
      <SiteMarker x={BOMB_SITES.A.x} z={BOMB_SITES.A.z} color="#ef4444" letter="A" />
    </group>
  );
}

// ============================================================================
// Site B (South) - Improved structure
// ============================================================================
function SiteB() {
  return (
    <group>
      <StaticBox position={[0, 0.5, 18]} size={[8, 1, 6]} color={COLORS.concrete} materialType="concrete" />
      <StaticBox position={[-3, 1.5, 20]} size={[2, 2, 2]} color={COLORS.stone} materialType="concrete" />
      <StaticBox position={[3, 1.5, 20]} size={[2, 2, 2]} color={COLORS.stone} materialType="concrete" />
      <StaticBox position={[0, 0.75, 14]} size={[2, 1.5, 1.5]} color={COLORS.iron} materialType="metal" />
      <StaticBox position={[-6, 0.5, 16]} size={[1.5, 1, 1.5]} color={COLORS.wood} materialType="wood" />
      <FloorZone position={[BOMB_SITES.B.x, 0.02, BOMB_SITES.B.z]} size={[BOMB_SITES.B.radius * 2, BOMB_SITES.B.radius * 2]} color="#2563eb" opacity={0.18} />
      <SiteMarker x={BOMB_SITES.B.x} z={BOMB_SITES.B.z} color="#3b82f6" letter="B" />
    </group>
  );
}

// ============================================================================
// CT Spawn Area (East)
// ============================================================================
function CTSpawnArea() {
  return (
    <group>
      <StaticBox position={[22, 0.75, -5]} size={[1, 1.5, 4]} color={COLORS.concrete} materialType="concrete" />
      <StaticBox position={[22, 0.75, 5]} size={[1, 1.5, 4]} color={COLORS.concrete} materialType="concrete" />
      <StaticBox position={[26, 1.5, 0]} size={[1, 3, 12]} color={COLORS.wall} materialType="concrete" />
      <SpawnZone position={[BUY_ZONE.CT.x, 0.03, BUY_ZONE.CT.z]} color={COLORS.ct} radius={BUY_ZONE.CT.radius} />
    </group>
  );
}

// ============================================================================
// Perimeter Walls
// ============================================================================
function PerimeterWalls() {
  return (
    <group>
      <StaticBox position={[0, 3.6, -21]} size={[60, 7.2, 1]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[0, 3.6, 21]} size={[60, 7.2, 1]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[-30, 3.6, 0]} size={[1, 7.2, 42]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[30, 3.6, 0]} size={[1, 7.2, 42]} color={COLORS.wall} materialType="concrete" />
    </group>
  );
}

// ============================================================================
// Decorative Details - Improved with more variety
// ============================================================================
function DecorativeDetails() {
  return (
    <group>
      <StaticBox position={[-15, 0.15, -10]} size={[0.6, 0.3, 0.4]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[12, 0.15, 8]} size={[0.4, 0.3, 0.6]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[-8, 0.15, 12]} size={[0.5, 0.3, 0.5]} color={COLORS.iron} materialType="metal" />
      <StaticBox position={[15, 0.15, -8]} size={[0.4, 0.3, 0.4]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[-12, 0.15, 6]} size={[0.5, 0.3, 0.3]} color={COLORS.iron} materialType="metal" />
      <StaticCylinder position={[-10, 0.2, -8]} radius={1} height={0.4} color={COLORS.sand} materialType="default" />
      <StaticCylinder position={[10, 0.2, 8]} radius={0.8} height={0.3} color={COLORS.sand} materialType="default" />
      <StaticCylinder position={[0, 0.15, -10]} radius={0.6} height={0.3} color={COLORS.sand} materialType="default" />
    </group>
  );
}

// ============================================================================
// Main Export
// ============================================================================
export function Dust() {
  return (
    <group name="dust_map">
      <ambientLight intensity={0.6} color="#ffecd2" />
      <directionalLight
        castShadow
        position={[20, 30, 15]}
        intensity={1.2}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        color="#fff5e6"
      />
      <directionalLight position={[-15, 20, -10]} intensity={0.28} color="#ffd89b" />

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
