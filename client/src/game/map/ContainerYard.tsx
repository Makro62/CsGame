import { useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox, StaticCylinder, FloorZone } from "./MapHelpers";

// ============================================================================
// Color Constants
// ============================================================================
const COLORS = {
  ground: "#3a5a3a",
  red: "#cc3333",
  blue: "#3355cc",
  yellow: "#ccaa33",
  wood: "#8B6914",
  iron: "#444444",
  concrete: "#666666",
  metal: "#5577aa",
  ramp: "#888888",
  tunnel: "#333333",
} as const;

// ============================================================================
// Mid Lane (Center)
// ============================================================================

function MidLane() {
  return (
    <>
      {/* Mid Box Center — wallbangable wood cover */}
      <StaticBox
        position={[0, 0.6, 0]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />

      {/* T-Mid Barrels — iron cover for T peeking mid */}
      <StaticCylinder
        position={[-15, 0.75, -2]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />
      <StaticCylinder
        position={[-15, 0.75, 2]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />

      {/* CT Sniper Window — two solid blocks with 3m gap for CT sniper */}
      <StaticBox
        position={[15, 0.6, -2.5]}
        size={[2.4, 1.2, 1.2]}
        color={COLORS.concrete}
      />
      <StaticBox
        position={[15, 0.6, 2.5]}
        size={[2.4, 1.2, 1.2]}
        color={COLORS.concrete}
      />
    </>
  );
}

// ============================================================================
// Site A (North, z = -15)
// ============================================================================

function SiteA() {
  return (
    <>
      {/* Site A Core — main container for bombsite */}
      <StaticBox
        position={[15, 1.2, -15]}
        size={[6.0, 2.4, 2.4]}
        color={COLORS.metal}
      />

      {/* A-Main Choke — forces T into narrow entry */}
      <StaticBox
        position={[-5, 1.2, -15]}
        size={[2.4, 2.4, 6.0]}
        color={COLORS.metal}
      />

      {/* A Ninja Corner — stacked wood boxes for ninja defuse */}
      <StaticBox
        position={[10, 0.6, -18]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
      <StaticBox
        position={[10, 1.8, -18]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />

      {/* A-Connector — small wood cover for mid→A rotation */}
      <StaticBox
        position={[5, 0.6, -8]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
    </>
  );
}

// ============================================================================
// Site B (South, z = +15)
// ============================================================================

function SiteB() {
  return (
    <>
      {/* B-Stack Bottom — main container pillar */}
      <StaticBox
        position={[12, 1.2, 15]}
        size={[6.0, 2.4, 2.4]}
        color={COLORS.blue}
      />

      {/* B-Ramp — sloped surface for high ground access */}
      <StaticBox
        position={[8, 1.2, 15]}
        size={[4.8, 2.4, 2.4]}
        color={COLORS.ramp}
        rotation={[0, 0, Math.PI / 6]}
      />

      {/* B-Stack Top — elevated container for high ground */}
      <StaticBox
        position={[13.8, 3.6, 15]}
        size={[2.4, 2.4, 2.4]}
        color={COLORS.blue}
      />

      {/* B-Pillar Cover — iron cylinder for plant cover */}
      <StaticCylinder
        position={[16, 0.75, 12]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />

      {/* B-Tunnel walls — forming the tunnel corridor */}
      <StaticBox
        position={[-5, 1.2, 12.5]}
        size={[10.0, 2.4, 0.5]}
        color={COLORS.tunnel}
      />
      <StaticBox
        position={[-5, 1.2, 17.5]}
        size={[10.0, 2.4, 0.5]}
        color={COLORS.tunnel}
      />
      {/* B-Tunnel roof — blocks overhead grenades */}
      <StaticBox
        position={[-5, 2.4, 15]}
        size={[10.0, 0.3, 5.0]}
        color={COLORS.tunnel}
      />
    </>
  );
}

// ============================================================================
// T-Spawn Area (West)
// ============================================================================

function TSpawnArea() {
  return (
    <>
      {/* T-Spawn marker */}
      <StaticBox
        position={[-25, 0.05, 0]}
        size={[8, 0.1, 12]}
        color={COLORS.red}
      />
    </>
  );
}

// ============================================================================
// CT-Spawn Area (East)
// ============================================================================

function CTSpawnArea() {
  return (
    <>
      {/* CT-Spawn marker */}
      <StaticBox
        position={[25, 0.05, 0]}
        size={[8, 0.1, 12]}
        color={COLORS.blue}
      />
    </>
  );
}

// ============================================================================
// Perimeter Walls
// ============================================================================

function PerimeterWalls() {
  const wallHeight = 7.2;

  return (
    <>
      {/* North wall */}
      <StaticBox
        position={[0, wallHeight / 2, -20.25]}
        size={[60, wallHeight, 0.5]}
        color={COLORS.concrete}
      />

      {/* South wall */}
      <StaticBox
        position={[0, wallHeight / 2, 20.25]}
        size={[60, wallHeight, 0.5]}
        color={COLORS.concrete}
      />

      {/* West wall */}
      <StaticBox
        position={[-30.25, wallHeight / 2, 0]}
        size={[0.5, wallHeight, 40]}
        color={COLORS.concrete}
      />

      {/* East wall */}
      <StaticBox
        position={[30.25, wallHeight / 2, 0]}
        size={[0.5, wallHeight, 40]}
        color={COLORS.concrete}
      />
    </>
  );
}

// ============================================================================
// Floor Zones (Visual Indicators)
// ============================================================================

function FloorZones() {
  return (
    <>
      {/* Buy Zone T: red tint */}
      <FloorZone
        position={[-25, 0.02, 0]}
        size={[8, 12]}
        color={COLORS.red}
        opacity={0.3}
      />

      {/* Buy Zone CT: blue tint */}
      <FloorZone
        position={[25, 0.02, 0]}
        size={[8, 12]}
        color={COLORS.blue}
        opacity={0.3}
      />

      {/* Site A: orange tint at [15, 0.02, -15] */}
      <FloorZone
        position={[15, 0.02, -15]}
        size={[6, 6]}
        color="#cc6633"
        opacity={0.2}
      />

      {/* Site B: blue tint at [12, 0.02, 15] */}
      <FloorZone
        position={[12, 0.02, 15]}
        size={[6, 6]}
        color={COLORS.blue}
        opacity={0.2}
      />
    </>
  );
}

// ============================================================================
// Decorative Details (break up blocky silhouette)
// ============================================================================

function DecorativeDetails() {
  return (
    <>
      {/* small low crates scattered for visual interest */}
      <StaticBox position={[-4, 0.3, 6]} size={[0.8, 0.6, 0.8]} color={COLORS.wood} />
      <StaticBox position={[3, 0.3, -6]} size={[1.0, 0.6, 0.6]} color={COLORS.wood} rotation={[0, 0.3, 0]} />

      {/* short concrete bollards */}
      <StaticCylinder position={[12, 0.45, -2]} radius={0.25} height={0.9} color={COLORS.concrete} />
      <StaticCylinder position={[14, 0.45, 2]} radius={0.25} height={0.9} color={COLORS.concrete} />

      {/* a small sloped metal panel */}
      <StaticBox position={[-6, 0.4, -10]} size={[2.5, 0.2, 1.6]} color={COLORS.ramp} rotation={[-0.35, 0.15, 0]} />
    </>
  );
}

// ============================================================================
// Ground (replaces separate Ground.tsx)
// ============================================================================

function Ground() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geom = mesh.geometry as THREE.PlaneGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    // gentle low-poly displacement grid to break the perfectly flat look
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // compute a simple wave + subtle random variation
      const height = Math.sin(x * 0.12) * Math.cos(z * 0.08) * 0.45 + (Math.random() - 0.5) * 0.12;
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
        {/* higher segments to allow displacement */}
        <planeGeometry args={[60, 40, 60, 40]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.86} metalness={0.05} flatShading />
      </mesh>
      {/* collider remains a simple box for stable physics */}
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
