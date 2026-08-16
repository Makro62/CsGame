import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { StaticBox, StaticCylinder, FloorZone } from "./MapHelpers";

// ============================================================================
// Color Constants & Material Palette
// ============================================================================
const COLORS = {
  ground: "#2e3b2e",
  red: "#b91c1c",
  blue: "#1d4ed8",
  yellow: "#ca8a04",
  wood: "#78350f",
  iron: "#374151",
  concrete: "#4b5563",
  metal: "#334155",
  ramp: "#64748b",
  tunnel: "#1e293b",
} as const;

// ============================================================================
// Mid Lane (Center)
// ============================================================================

function MidLane() {
  return (
    <group name="mid_lane">
      {/* Mid Box Center — wallbangable wood cover */}
      <StaticBox
        position={[0, 0.6, 0]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
        materialType="wood"
      />

      {/* Mid Yellow Landmark Container — AWP peeking nest */}
      <StaticBox
        position={[-2.5, 1.2, 3.5]}
        size={[4.0, 2.4, 2.0]}
        color={COLORS.yellow}
        materialType="metal"
      />

      {/* T-Mid Barrels — iron cover for T peeking mid */}
      <StaticCylinder
        position={[-15, 0.75, -2]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
        materialType="iron"
      />
      <StaticCylinder
        position={[-15, 0.75, 2]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
        materialType="iron"
      />

      {/* CT Sniper Window — two solid concrete blocks with 3m gap */}
      <StaticBox
        position={[15, 0.6, -2.5]}
        size={[2.4, 1.2, 1.2]}
        color={COLORS.concrete}
        materialType="concrete"
      />
      <StaticBox
        position={[15, 0.6, 2.5]}
        size={[2.4, 1.2, 1.2]}
        color={COLORS.concrete}
        materialType="concrete"
      />
    </group>
  );
}

// ============================================================================
// Site A (North, z ≈ -15)
// ============================================================================

function SiteA() {
  return (
    <group name="site_a">
      {/* Site A Core — main container for bombsite */}
      <StaticBox
        position={[15, 1.2, -15]}
        size={[6.0, 2.4, 2.4]}
        color={COLORS.metal}
        materialType="metal"
      />

      {/* A-Main Choke — forces T into narrow entry */}
      <StaticBox
        position={[-5, 1.2, -15]}
        size={[2.4, 2.4, 6.0]}
        color={COLORS.metal}
        materialType="metal"
      />

      {/* Site A Corridor Cover — breaks long sightlines in A approach */}
      <StaticBox
        position={[4, 1.2, -13.5]}
        size={[3.0, 2.4, 1.5]}
        color={COLORS.metal}
        materialType="metal"
      />
      <StaticBox
        position={[-0.5, 0.6, -16.5]}
        size={[1.5, 1.2, 1.5]}
        color={COLORS.wood}
        materialType="wood"
      />

      {/* L-Choke between A and Mid */}
      <StaticBox
        position={[0, 1.2, -8]}
        size={[2.4, 2.4, 2.4]}
        color={COLORS.metal}
        materialType="metal"
      />
      <StaticBox
        position={[2.4, 0.6, -8]}
        size={[2.4, 1.2, 1.2]}
        color={COLORS.wood}
        materialType="wood"
      />

      {/* A Ninja Corner — stacked wood boxes */}
      <StaticBox
        position={[10, 0.6, -18]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
        materialType="wood"
      />
      <StaticBox
        position={[10, 1.8, -18]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
        materialType="wood"
      />

      {/* A-Connector wood cover */}
      <StaticBox
        position={[5, 0.6, -5.5]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
        materialType="wood"
      />
    </group>
  );
}

// ============================================================================
// Site B (South, z ≈ +15)
// ============================================================================

function SiteB() {
  return (
    <group name="site_b">
      {/* B-Stack Bottom — main container pillar */}
      <StaticBox
        position={[12, 1.2, 15]}
        size={[6.0, 2.4, 2.4]}
        color={COLORS.blue}
        materialType="metal"
      />

      {/* B-Ramp — stepped solid physics matching visual ramp */}
      <StaticBox
        position={[6.5, 0.4, 15]}
        size={[1.8, 0.8, 2.4]}
        color={COLORS.ramp}
        materialType="metal"
      />
      <StaticBox
        position={[8.3, 1.2, 15]}
        size={[1.8, 1.6, 2.4]}
        color={COLORS.ramp}
        materialType="metal"
      />

      {/* B-Stack Top — elevated container for high ground */}
      <StaticBox
        position={[13.8, 3.6, 15]}
        size={[2.4, 2.4, 2.4]}
        color={COLORS.blue}
        materialType="metal"
      />

      {/* B-Pillar Cover — iron cylinder for plant cover */}
      <StaticCylinder
        position={[16, 0.75, 12]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
        materialType="iron"
      />

      {/* B-Tunnel walls & roof */}
      <StaticBox
        position={[-5, 1.2, 12.5]}
        size={[10.0, 2.4, 0.5]}
        color={COLORS.tunnel}
        materialType="metal"
      />
      <StaticBox
        position={[-5, 1.2, 17.5]}
        size={[10.0, 2.4, 0.5]}
        color={COLORS.tunnel}
        materialType="metal"
      />
      <StaticBox
        position={[-5, 2.4, 15]}
        size={[10.0, 0.3, 5.0]}
        color={COLORS.tunnel}
        materialType="metal"
      />
    </group>
  );
}

// ============================================================================
// T-Spawn Area (West Base Landmark)
// ============================================================================

function TSpawnArea() {
  return (
    <group name="t_spawn">
      {/* T-Spawn Landmark Red Containers */}
      <StaticBox
        position={[-25, 1.2, -5]}
        size={[3.0, 2.4, 2.0]}
        color={COLORS.red}
        materialType="metal"
      />
      <StaticBox
        position={[-25, 1.2, 5]}
        size={[3.0, 2.4, 2.0]}
        color={COLORS.red}
        materialType="metal"
      />
    </group>
  );
}

// ============================================================================
// CT-Spawn Area (East Base Landmark)
// ============================================================================

function CTSpawnArea() {
  return (
    <group name="ct_spawn">
      {/* CT-Spawn Landmark Blue Containers */}
      <StaticBox
        position={[25, 1.2, -5]}
        size={[3.0, 2.4, 2.0]}
        color={COLORS.blue}
        materialType="metal"
      />
      <StaticBox
        position={[25, 1.2, 5]}
        size={[3.0, 2.4, 2.0]}
        color={COLORS.blue}
        materialType="metal"
      />
    </group>
  );
}

// ============================================================================
// Perimeter Walls
// ============================================================================

function PerimeterWalls() {
  const wallHeight = 7.2;

  return (
    <group name="perimeter_walls">
      {/* North wall */}
      <StaticBox
        position={[0, wallHeight / 2, -20.25]}
        size={[60, wallHeight, 0.5]}
        color={COLORS.concrete}
        materialType="concrete"
      />

      {/* South wall */}
      <StaticBox
        position={[0, wallHeight / 2, 20.25]}
        size={[60, wallHeight, 0.5]}
        color={COLORS.concrete}
        materialType="concrete"
      />

      {/* West wall */}
      <StaticBox
        position={[-30.25, wallHeight / 2, 0]}
        size={[0.5, wallHeight, 40]}
        color={COLORS.concrete}
        materialType="concrete"
      />

      {/* East wall */}
      <StaticBox
        position={[30.25, wallHeight / 2, 0]}
        size={[0.5, wallHeight, 40]}
        color={COLORS.concrete}
        materialType="concrete"
      />
    </group>
  );
}

// ============================================================================
// Floor Zones & Stencils
// ============================================================================

function FloorZones() {
  return (
    <group name="floor_zones">
      {/* Buy Zone T: red tint */}
      <FloorZone
        position={[-25, 0.02, 0]}
        size={[10, 16]}
        color={COLORS.red}
        opacity={0.2}
      />

      {/* Buy Zone CT: blue tint */}
      <FloorZone
        position={[25, 0.02, 0]}
        size={[10, 16]}
        color={COLORS.blue}
        opacity={0.2}
      />

      {/* Site A: red/orange plant zone at [15, 0.02, -15] with radius 6m */}
      <FloorZone
        position={[15, 0.02, -15]}
        size={[12, 12]}
        color="#dc2626"
        opacity={0.25}
      />

      {/* Site B: blue plant zone at [12, 0.02, 15] with radius 6m */}
      <FloorZone
        position={[12, 0.02, 15]}
        size={[12, 12]}
        color="#2563eb"
        opacity={0.25}
      />

      {/* 3D Stencil Letter A on Site A */}
      <Html position={[15, 0.05, -15]} center rotation={[-Math.PI / 2, 0, 0]}>
        <div
          style={{
            fontSize: "48px",
            fontWeight: "900",
            color: "rgba(239, 68, 68, 0.4)",
            userSelect: "none",
            pointerEvents: "none",
            fontFamily: "Impact, sans-serif",
            letterSpacing: "4px",
          }}
        >
          A
        </div>
      </Html>

      {/* 3D Stencil Letter B on Site B */}
      <Html position={[12, 0.05, 15]} center rotation={[-Math.PI / 2, 0, 0]}>
        <div
          style={{
            fontSize: "48px",
            fontWeight: "900",
            color: "rgba(59, 130, 246, 0.4)",
            userSelect: "none",
            pointerEvents: "none",
            fontFamily: "Impact, sans-serif",
            letterSpacing: "4px",
          }}
        >
          B
        </div>
      </Html>

      {/* Lane boundary subtle lines */}
      <FloorZone position={[0, 0.01, -10]} size={[58, 0.2]} color="#ffffff" opacity={0.06} />
      <FloorZone position={[0, 0.01, 10]} size={[58, 0.2]} color="#ffffff" opacity={0.06} />
    </group>
  );
}

// ============================================================================
// Grid-Aligned Decorative Props
// ============================================================================

function DecorativeDetails() {
  return (
    <group name="decorative_props">
      {/* Grid-aligned crates */}
      <StaticBox position={[-4, 0.3, 6]} size={[1.2, 0.6, 1.2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[3, 0.3, -6]} size={[1.2, 0.6, 1.2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[8, 0.3, -12]} size={[1.2, 0.6, 1.2]} color={COLORS.wood} materialType="wood" />
      <StaticBox position={[4, 0.3, 13.5]} size={[1.2, 0.6, 1.2]} color={COLORS.wood} materialType="wood" />

      {/* Iron bollards */}
      <StaticBox position={[12, 0.45, -2]} size={[0.5, 0.9, 0.5]} color={COLORS.iron} materialType="iron" />
      <StaticBox position={[14, 0.45, 2]} size={[0.5, 0.9, 0.5]} color={COLORS.iron} materialType="iron" />
    </group>
  );
}

// ============================================================================
// Ground with Deterministic Vertex Variations
// ============================================================================

function Ground() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geom = mesh.geometry as THREE.PlaneGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    // Deterministic subtle surface noise (identical on all clients)
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const height = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.04;
      pos.setY(i, height);
    }

    geom.computeVertexNormals();
    geom.attributes.position.needsUpdate = true;
  }, []);

  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh
        ref={meshRef}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.5, 0]}
      >
        <planeGeometry args={[60, 40, 30, 20]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.88} metalness={0.02} flatShading />
      </mesh>
      <CuboidCollider args={[30, 1.0, 20]} />
    </RigidBody>
  );
}

// ============================================================================
// Main ContainerYard Export
// ============================================================================

export function ContainerYard() {
  return (
    <group>
      {/* Map Local Warm Lighting */}
      <ambientLight intensity={0.55} color="#ffeedd" />
      <directionalLight
        castShadow
        position={[20, 35, 15]}
        intensity={1.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      <Ground />
      <MidLane />
      <SiteA />
      <SiteB />
      <TSpawnArea />
      <CTSpawnArea />
      <PerimeterWalls />
      <FloorZones />
      <DecorativeDetails />
    </group>
  );
}

export default ContainerYard;
