import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { BOMB_SITES, BUY_ZONE, DUST_OBSTACLES } from "@cs-game/shared";
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
// Ground - FIXED: flat collider = flat visual (no vertex displacement)
// Gunakan Normal Map untuk ilusi bumpy agar collider sinkron & 60 FPS
// ============================================================================
function Ground() {
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <planeGeometry args={[80, 100, 10, 10]} />
        <meshStandardMaterial
          color={COLORS.ground}
          roughness={0.95}
          metalness={0.02}
          // normalMap={dustNormalTexture} // TODO: tambah texture untuk efek bumpy tanpa collider cost
        />
      </mesh>
      {/* Collider 100% sinkron dengan visual flat */}
      <CuboidCollider args={[40, 1.0, 50]} />
    </RigidBody>
  );
}

// ============================================================================
// Single Source of Truth — obstacles from shared (server + client sync)
// Visual cylinders kept as decoration (no collision mismatch)
// ============================================================================
function DustSharedObstacles() {
  return (
    <group>
      {DUST_OBSTACLES.map((obs) => {
        if (obs.shape === "cylinder") {
          const color = obs.material === "wood" ? COLORS.wood : obs.material === "metal" ? COLORS.iron : COLORS.concrete;
          return <StaticCylinder key={obs.id} position={[obs.cx, obs.cy, obs.cz]} radius={obs.radius!} height={obs.height!} color={color} materialType={obs.material} />;
        }
        const cx = (obs.minX + obs.maxX) / 2;
        const cy = (obs.minY + obs.maxY) / 2;
        const cz = (obs.minZ + obs.maxZ) / 2;
        const sx = obs.maxX - obs.minX;
        const sy = obs.maxY - obs.minY;
        const sz = obs.maxZ - obs.minZ;
        const color = obs.material === "wood" ? COLORS.wood : obs.material === "metal" ? COLORS.iron : COLORS.concrete;
        return <StaticBox key={obs.id} position={[cx, cy, cz]} size={[sx, sy, sz]} color={color} materialType={obs.material} />;
      })}
    </group>
  );
}

function TSpawnArea() {
  return <SpawnZone position={[BUY_ZONE.T.x, 0.03, BUY_ZONE.T.z]} color={COLORS.t} radius={BUY_ZONE.T.radius} />;
}

function MidArea() {
  return null;
}

function SiteA() {
  return (
    <group>
      <FloorZone position={[BOMB_SITES.A.x, 0.02, BOMB_SITES.A.z]} size={[BOMB_SITES.A.radius * 2, BOMB_SITES.A.radius * 2]} color="#dc2626" opacity={0.18} />
      <SiteMarker x={BOMB_SITES.A.x} z={BOMB_SITES.A.z} color="#ef4444" letter="A" />
    </group>
  );
}

function SiteB() {
  return (
    <group>
      <FloorZone position={[BOMB_SITES.B.x, 0.02, BOMB_SITES.B.z]} size={[BOMB_SITES.B.radius * 2, BOMB_SITES.B.radius * 2]} color="#2563eb" opacity={0.18} />
      <SiteMarker x={BOMB_SITES.B.x} z={BOMB_SITES.B.z} color="#3b82f6" letter="B" />
    </group>
  );
}

function CTSpawnArea() {
  return <SpawnZone position={[BUY_ZONE.CT.x, 0.03, BUY_ZONE.CT.z]} color={COLORS.ct} radius={BUY_ZONE.CT.radius} />;
}

// ============================================================================
// Perimeter Walls
// ============================================================================
function PerimeterWalls() {
  return (
    <group>
      <StaticBox position={[0, 3.6, -50]} size={[80, 7.2, 1]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[0, 3.6, 50]} size={[80, 7.2, 1]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[-40, 3.6, 0]} size={[1, 7.2, 100]} color={COLORS.wall} materialType="concrete" />
      <StaticBox position={[40, 3.6, 0]} size={[1, 7.2, 100]} color={COLORS.wall} materialType="concrete" />
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
      <DustSharedObstacles />
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
