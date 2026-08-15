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
  ramp: "#888888",
} as const;

// ============================================================================
// T-Spawn Area (West)
// ============================================================================

function TSpawnArea() {
  return (
    <>
      {/* Red Base container at [-25, 1.2, -8] - 4x2.4x8m */}
      <StaticBox
        position={[-25, 1.2, -8]}
        size={[4, 2.4, 8]}
        color={COLORS.red}
      />

      {/* T-Cover: 2 wooden boxes at [-20, 0.6, -3] and [-20, 0.6, 3] */}
      <StaticBox
        position={[-20, 0.6, -3]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
      <StaticBox
        position={[-20, 0.6, 3]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
    </>
  );
}

// ============================================================================
// Mid Lane (Center)
// ============================================================================

function MidLane() {
  return (
    <>
      {/* Yellow container stack "Mid Box" at [0, 1.2, 0] - 4x2.4x6m */}
      <StaticBox
        position={[0, 1.2, 0]}
        size={[4, 2.4, 6]}
        color={COLORS.yellow}
      />

      {/* Iron barrels "Barrels" at [-8, 0.75, -3] and [-8, 0.75, 3] */}
      <StaticCylinder
        position={[-8, 0.75, -3]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />
      <StaticCylinder
        position={[-8, 0.75, 3]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />
    </>
  );
}

// ============================================================================
// Site A (North, z = -15 area)
// ============================================================================

function SiteA() {
  return (
    <>
      {/* L-Shape container tunnel: two containers forming an L */}
      {/* Horizontal container at [-10, 1.2, -12] */}
      <StaticBox
        position={[-10, 1.2, -12]}
        size={[6, 2.4, 4]}
        color={COLORS.concrete}
      />
      {/* Vertical container at [-12, 1.2, -15] */}
      <StaticBox
        position={[-14, 1.2, -15]}
        size={[4, 2.4, 6]}
        color={COLORS.concrete}
      />

      {/* A Corner cover: wooden box at [-3, 0.6, -18] */}
      <StaticBox
        position={[-3, 0.6, -18]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />

      {/* Iron barrel at [-7, 0.75, -18] */}
      <StaticCylinder
        position={[-7, 0.75, -18]}
        radius={0.35}
        height={1.5}
        color={COLORS.iron}
      />
    </>
  );
}

// ============================================================================
// Site B (South, z = +15 area)
// ============================================================================

function SiteB() {
  return (
    <>
      {/* B Stack: two containers stacked */}
      <StaticBox
        position={[8, 1.2, 12]}
        size={[4, 2.4, 6]}
        color={COLORS.blue}
      />
      <StaticBox
        position={[8, 3.6, 12]}
        size={[4, 2.4, 6]}
        color={COLORS.blue}
      />

      {/* Ramp: angled box from ground to container top at [5, 0.5, 14] - 30° incline, 4m long */}
      <StaticBox
        position={[5, 0.5, 14]}
        size={[4, 0.3, 4]}
        color={COLORS.ramp}
        rotation={[-0.5236, 0, 0]}
      />

      {/* Wooden boxes on ramp top at [5, 4.0, 12] */}
      <StaticBox
        position={[5, 4.0, 12]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
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
      {/* Blue Base container at [25, 1.2, -8] - 4x2.4x8m */}
      <StaticBox
        position={[25, 1.2, -8]}
        size={[4, 2.4, 8]}
        color={COLORS.blue}
      />

      {/* CT-Cover: 2 wooden boxes at [20, 0.6, -3] and [20, 0.6, 3] */}
      <StaticBox
        position={[20, 0.6, -3]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
      <StaticBox
        position={[20, 0.6, 3]}
        size={[1.2, 1.2, 1.2]}
        color={COLORS.wood}
      />
    </>
  );
}

// ============================================================================
// Perimeter Walls
// ============================================================================

function PerimeterWalls() {
  const wallHeight = 7.2;
  const wallThickness = 4.0;

  return (
    <>
      {/* North wall: centered at z=-21.5, size 68x7.2x4m */}
      <StaticBox
        position={[0, wallHeight / 2, -21.5]}
        size={[68, wallHeight, wallThickness]}
        color={COLORS.concrete}
      />

      {/* South wall: centered at z=21.5, size 68x7.2x4m */}
      <StaticBox
        position={[0, wallHeight / 2, 21.5]}
        size={[68, wallHeight, wallThickness]}
        color={COLORS.concrete}
      />

      {/* West wall: centered at x=-31.5, size 4x7.2x44m */}
      <StaticBox
        position={[-31.5, wallHeight / 2, 0]}
        size={[wallThickness, wallHeight, 44]}
        color={COLORS.concrete}
      />

      {/* East wall: centered at x=31.5, size 4x7.2x44m */}
      <StaticBox
        position={[31.5, wallHeight / 2, 0]}
        size={[wallThickness, wallHeight, 44]}
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
      {/* Buy Zone T: red tint at [-25, 0.02, 0], 6x6m */}
      <FloorZone
        position={[-25, 0.02, 0]}
        size={[6, 6]}
        color={COLORS.red}
        opacity={0.3}
      />

      {/* Buy Zone CT: blue tint at [25, 0.02, 0], 6x6m */}
      <FloorZone
        position={[25, 0.02, 0]}
        size={[6, 6]}
        color={COLORS.blue}
        opacity={0.3}
      />

      {/* Site A: red/yellow tint at [0, 0.02, -20], 8x8m */}
      <FloorZone
        position={[0, 0.02, -20]}
        size={[8, 8]}
        color="#cc6633"
        opacity={0.2}
      />

      {/* Site B: blue tint at [0, 0.02, 20], 8x8m */}
      <FloorZone
        position={[0, 0.02, 20]}
        size={[8, 8]}
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
      {/* small low crates and pipes scattered for visual interest */}
      <StaticBox position={[-4, 0.3, 6]} size={[0.8, 0.6, 0.8]} color={COLORS.wood} />
      <StaticBox position={[3, 0.3, -6]} size={[1.0, 0.6, 0.6]} color={COLORS.wood} rotation={[0, 0.3, 0]} />

      {/* short concrete bollards */}
      <StaticCylinder position={[12, 0.45, -2]} radius={0.25} height={0.9} color={COLORS.concrete} />
      <StaticCylinder position={[14, 0.45, 2]} radius={0.25} height={0.9} color={COLORS.concrete} />

      {/* a small sloped metal panel to add angular variety */}
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
      {/* collider remains a simple box for stable physics; make it slightly thicker */}
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
      <TSpawnArea />
      <MidLane />
      <SiteA />
      <SiteB />
      <CTSpawnArea />
      <PerimeterWalls />
      <FloorZones />
      <DecorativeDetails />
    </group>
  );
}

export default ContainerYard;
