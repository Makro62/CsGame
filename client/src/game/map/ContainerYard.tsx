import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { BOMB_SITES, BUY_ZONE, MAP_BOUNDARY, MAP_OBSTACLES, type MapObstacle } from "@cs-game/shared";
import { StaticBox, StaticCylinder, FloorZone, SiteMarker, SpawnZone } from "./MapHelpers";

// ============================================================================
// Color Palette - Industrial Container Yard
// ============================================================================
const COLORS = {
  ground: "#1a2332",
  groundAlt: "#151d2a",
  container: {
    blue: "#1e40af",
    blueDark: "#1e3a8a",
    red: "#991b1b",
    redDark: "#7f1d1d",
    green: "#166534",
    greenDark: "#14532d",
    yellow: "#854d0e",
    yellowDark: "#713f12",
    orange: "#9a3412",
  },
  metal: {
    dark: "#374151",
    medium: "#4b5563",
    light: "#6b7280",
    rust: "#78350f",
  },
  concrete: {
    dark: "#334155",
    medium: "#475569",
    light: "#64748b",
  },
  wood: {
    dark: "#451a03",
    medium: "#78350f",
    light: "#92400e",
  },
  t: "#991b1b",
  ct: "#1e3a8a",
} as const;

// ============================================================================
// Helper: Color for obstacle based on ID and material
// ============================================================================
function colorFor(obs: MapObstacle): string {
  if (obs.material === "wood") return COLORS.wood.medium;
  if (obs.material === "concrete") return COLORS.concrete.medium;

  // Container colors based on ID patterns
  if (obs.id.includes("container")) {
    if (obs.id.includes("_b") || obs.id.includes("blue")) return COLORS.container.blue;
    if (obs.id.includes("_r") || obs.id.includes("red")) return COLORS.container.red;
    if (obs.id.includes("_g") || obs.id.includes("green")) return COLORS.container.green;
    if (obs.id.includes("_y") || obs.id.includes("yellow")) return COLORS.container.yellow;
    if (obs.id.includes("_o") || obs.id.includes("orange")) return COLORS.container.orange;
    return COLORS.container.blue;
  }

  // Spawn area colors
  if (obs.id.startsWith("t_")) return COLORS.metal.dark;
  if (obs.id.startsWith("ct_")) return COLORS.metal.medium;

  // Site specific colors
  if (obs.id.startsWith("site_a") || obs.id.startsWith("a_")) return COLORS.metal.light;
  if (obs.id.startsWith("site_b") || obs.id.startsWith("b_")) return COLORS.metal.rust;

  // Default metal
  return COLORS.metal.dark;
}

// ============================================================================
// Render obstacle from shared data
// ============================================================================
function Obstacle({ obs }: { obs: MapObstacle }) {
  const sx = obs.maxX - obs.minX;
  const sy = obs.maxY - obs.minY;
  const sz = obs.maxZ - obs.minZ;
  return (
    <StaticBox
      position={[(obs.minX + obs.maxX) / 2, (obs.minY + obs.maxY) / 2, (obs.minZ + obs.maxZ) / 2]}
      size={[sx, sy, sz]}
      color={colorFor(obs)}
      materialType={obs.material === "wood" ? "wood" : obs.material === "concrete" ? "concrete" : "metal"}
    />
  );
}

// ============================================================================
// Floor Zones & Markers
// ============================================================================
function FloorZones() {
  return (
    <group>
      <FloorZone
        position={[BUY_ZONE.T.x, 0.02, BUY_ZONE.T.z]}
        size={[BUY_ZONE.T.radius * 1.4, BUY_ZONE.T.radius * 1.6]}
        color={COLORS.t}
        opacity={0.14}
      />
      <FloorZone
        position={[BUY_ZONE.CT.x, 0.02, BUY_ZONE.CT.z]}
        size={[BUY_ZONE.CT.radius * 1.4, BUY_ZONE.CT.radius * 1.6]}
        color={COLORS.ct}
        opacity={0.14}
      />
      <FloorZone
        position={[BOMB_SITES.A.x, 0.02, BOMB_SITES.A.z]}
        size={[BOMB_SITES.A.radius * 2, BOMB_SITES.A.radius * 2]}
        color="#dc2626"
        opacity={0.18}
      />
      <FloorZone
        position={[BOMB_SITES.B.x, 0.02, BOMB_SITES.B.z]}
        size={[BOMB_SITES.B.radius * 2, BOMB_SITES.B.radius * 2]}
        color="#2563eb"
        opacity={0.18}
      />
      <SiteMarker x={BOMB_SITES.A.x} z={BOMB_SITES.A.z} color="#ef4444" letter="A" />
      <SiteMarker x={BOMB_SITES.B.x} z={BOMB_SITES.B.z} color="#3b82f6" letter="B" />
      <SpawnZone position={[BUY_ZONE.T.x, 0.03, BUY_ZONE.T.z]} color={COLORS.t} radius={BUY_ZONE.T.radius} />
      <SpawnZone position={[BUY_ZONE.CT.x, 0.03, BUY_ZONE.CT.z]} color={COLORS.ct} radius={BUY_ZONE.CT.radius} />
    </group>
  );
}

// ============================================================================
// Ground - Multi-textured industrial floor
// ============================================================================
function Ground() {
  const w = MAP_BOUNDARY.maxX - MAP_BOUNDARY.minX + 4;
  const d = MAP_BOUNDARY.maxZ - MAP_BOUNDARY.minZ + 4;
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color={COLORS.ground} roughness={0.92} metalness={0.08} />
        </mesh>
        <CuboidCollider args={[w / 2, 1.0, d / 2]} />
      </RigidBody>
      {/* Concrete patches for visual variety */}
      <mesh position={[-15, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[8, 12]} />
        <meshStandardMaterial color={COLORS.groundAlt} roughness={0.95} />
      </mesh>
      <mesh position={[15, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[8, 12]} />
        <meshStandardMaterial color={COLORS.groundAlt} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, -12]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial color={COLORS.groundAlt} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, 12]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[20, 6]} />
        <meshStandardMaterial color={COLORS.groundAlt} roughness={0.95} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Decorative Elements - Visual only, no gameplay impact
// ============================================================================
function DecorativeElements() {
  return (
    <group>
      {/* T Spawn Area Decorations */}
      <StaticCylinder position={[-24, 0.3, -6]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticCylinder position={[-24, 0.3, 6]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticBox position={[-23, 0.15, -7.5]} size={[0.8, 0.3, 0.4]} color={COLORS.wood.dark} materialType="wood" />
      <StaticBox position={[-23, 0.15, 7.5]} size={[0.6, 0.3, 0.6]} color={COLORS.metal.light} materialType="metal" />

      {/* Mid Area Decorations */}
      <StaticCylinder position={[-8, 0.3, 0]} radius={0.3} height={0.6} color={COLORS.container.yellow} materialType="metal" />
      <StaticCylinder position={[8, 0.3, 0]} radius={0.3} height={0.6} color={COLORS.container.green} materialType="metal" />
      <StaticBox position={[0, 0.15, -2]} size={[0.6, 0.3, 0.4]} color={COLORS.metal.rust} materialType="metal" />
      <StaticBox position={[0, 0.15, 2]} size={[0.4, 0.3, 0.6]} color={COLORS.wood.medium} materialType="wood" />

      {/* Site A Area Decorations */}
      <StaticCylinder position={[12, 0.3, -16]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticCylinder position={[18, 0.3, -12]} radius={0.25} height={0.6} color={COLORS.container.orange} materialType="metal" />
      <StaticBox position={[14, 0.15, -17]} size={[0.6, 0.3, 0.4]} color={COLORS.wood.dark} materialType="wood" />
      <StaticBox position={[22, 0.15, -17]} size={[0.4, 0.3, 0.6]} color={COLORS.metal.light} materialType="metal" />

      {/* Site B Area Decorations */}
      <StaticCylinder position={[12, 0.3, 16]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticCylinder position={[18, 0.3, 12]} radius={0.25} height={0.6} color={COLORS.container.yellow} materialType="metal" />
      <StaticBox position={[14, 0.15, 17]} size={[0.6, 0.3, 0.4]} color={COLORS.wood.medium} materialType="wood" />
      <StaticBox position={[22, 0.15, 17]} size={[0.4, 0.3, 0.6]} color={COLORS.metal.dark} materialType="metal" />

      {/* CT Spawn Area Decorations */}
      <StaticCylinder position={[24, 0.3, -6]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticCylinder position={[24, 0.3, 6]} radius={0.25} height={0.6} color={COLORS.metal.rust} materialType="metal" />
      <StaticBox position={[23, 0.15, -7.5]} size={[0.8, 0.3, 0.4]} color={COLORS.wood.dark} materialType="wood" />
      <StaticBox position={[23, 0.15, 7.5]} size={[0.6, 0.3, 0.6]} color={COLORS.metal.medium} materialType="metal" />

      {/* Scattered debris */}
      <StaticBox position={[-18, 0.08, -3]} size={[0.4, 0.16, 0.25]} color={COLORS.metal.light} materialType="metal" />
      <StaticBox position={[18, 0.08, 3]} size={[0.3, 0.16, 0.4]} color={COLORS.wood.medium} materialType="wood" />
      <StaticBox position={[-5, 0.08, -8]} size={[0.35, 0.16, 0.35]} color={COLORS.metal.rust} materialType="metal" />
      <StaticBox position={[5, 0.08, 8]} size={[0.4, 0.16, 0.3]} color={COLORS.wood.dark} materialType="wood" />
    </group>
  );
}

// ============================================================================
// Container Stacks - Visual variety with stacked containers
// ============================================================================
function ContainerStacks() {
  return (
    <group>
      {/* T Side - Blue container stack */}
      <StaticBox position={[-22, 2.5, -6]} size={[6, 2.5, 3]} color={COLORS.container.blue} materialType="metal" />
      <StaticBox position={[-22, 0, -6]} size={[6, 2.5, 3]} color={COLORS.container.blueDark} materialType="metal" />

      {/* T Side - Red container stack */}
      <StaticBox position={[-22, 2.5, 6]} size={[6, 2.5, 3]} color={COLORS.container.red} materialType="metal" />
      <StaticBox position={[-22, 0, 6]} size={[6, 2.5, 3]} color={COLORS.container.redDark} materialType="metal" />

      {/* CT Side - Green container stack */}
      <StaticBox position={[22, 2.5, -6]} size={[6, 2.5, 3]} color={COLORS.container.green} materialType="metal" />
      <StaticBox position={[22, 0, -6]} size={[6, 2.5, 3]} color={COLORS.container.greenDark} materialType="metal" />

      {/* CT Side - Yellow container stack */}
      <StaticBox position={[22, 2.5, 6]} size={[6, 2.5, 3]} color={COLORS.container.yellow} materialType="metal" />
      <StaticBox position={[22, 0, 6]} size={[6, 2.5, 3]} color={COLORS.container.yellowDark} materialType="metal" />

      {/* Mid - Orange container */}
      <StaticBox position={[-10, 1.25, 0]} size={[4, 2.5, 2.5]} color={COLORS.container.orange} materialType="metal" />

      {/* Site A - Blue container */}
      <StaticBox position={[18, 1.25, -16]} size={[5, 2.5, 2.5]} color={COLORS.container.blue} materialType="metal" />

      {/* Site B - Red container */}
      <StaticBox position={[18, 1.25, 16]} size={[5, 2.5, 2.5]} color={COLORS.container.red} materialType="metal" />
    </group>
  );
}

// ============================================================================
// Main Export
// ============================================================================
export function ContainerYard() {
  return (
    <group name="container_yard_map">
      <ambientLight intensity={0.58} color="#dbeafe" />
      <directionalLight
        castShadow
        position={[22, 36, 16]}
        intensity={1.15}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={110}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        color="#fffbeb"
      />
      <directionalLight position={[-18, 22, -14]} intensity={0.32} color="#93c5fd" />

      <Ground />
      <ContainerStacks />
      {MAP_OBSTACLES.map((obs) => (
        <Obstacle key={obs.id} obs={obs} />
      ))}
      <DecorativeElements />
      <FloorZones />
    </group>
  );
}

export default ContainerYard;
