import { RigidBody, CuboidCollider } from "@react-three/rapier";
import {
  RAVENPOINT_AREAS,
  RAVENPOINT_OBSTACLES,
  RAVENPOINT_BOMB_SITES,
  RAVENPOINT_SPAWN,
} from "@cs-game/shared";
import { StaticBox, FloorZone, SiteMarker, SpawnZone } from "./MapHelpers";

// Colors - RavenPoint: industrial / concrete theme with team colors
const COLORS = {
  ground: "#2a303c",
  concrete: "#6b7280",
  wall: "#4b5563",
  wood: "#92400e",
  metal: "#374151",
  t: "#991b1b",
  ct: "#1e3a8a",
  siteA: "#dc2626",
  siteB: "#2563eb",
} as const;

function Ground() {
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <planeGeometry args={[84, 104]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.9} />
      </mesh>
      <CuboidCollider args={[42, 1, 52]} />
    </RigidBody>
  );
}

function AreaFloors() {
  return (
    <group>
      {RAVENPOINT_AREAS.map((area) => {
        const w = area.x2 - area.x1;
        const d = area.z2 - area.z1;
        const cx = (area.x1 + area.x2) / 2;
        const cz = (area.z1 + area.z2) / 2;
        const isSite = area.type === "site_a" || area.type === "site_b";
        const isSpawn = area.type === "spawn_t" || area.type === "spawn_ct";
        const color = isSite ? (area.type === "site_a" ? "#3a2a2a" : "#2a2a3a") : isSpawn ? "#2a2a2a" : "#2d3748";
        return (
          <mesh key={area.id} position={[cx, -0.02, cz]} receiveShadow>
            <boxGeometry args={[w, 0.04, d]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

function Colliders() {
  return (
    <group>
      {RAVENPOINT_OBSTACLES.map((obs) => {
        const sx = obs.maxX - obs.minX;
        const sy = obs.maxY - obs.minY;
        const sz = obs.maxZ - obs.minZ;
        const color =
          obs.material === "wood" ? COLORS.wood : obs.material === "metal" ? COLORS.metal : COLORS.wall;
        return (
          <StaticBox
            key={obs.id}
            position={[(obs.minX + obs.maxX) / 2, (obs.minY + obs.maxY) / 2, (obs.minZ + obs.maxZ) / 2]}
            size={[sx, sy, sz]}
            color={color}
            materialType={obs.material}
          />
        );
      })}
    </group>
  );
}

function BombSites() {
  return (
    <group>
      <FloorZone
        position={[RAVENPOINT_BOMB_SITES.A.x, 0.02, RAVENPOINT_BOMB_SITES.A.z]}
        size={[RAVENPOINT_BOMB_SITES.A.radius * 2, RAVENPOINT_BOMB_SITES.A.radius * 2]}
        color={COLORS.siteA}
        opacity={0.18}
      />
      <SiteMarker x={RAVENPOINT_BOMB_SITES.A.x} z={RAVENPOINT_BOMB_SITES.A.z} color="#ef4444" letter="A" />
      <FloorZone
        position={[RAVENPOINT_BOMB_SITES.B.x, 0.02, RAVENPOINT_BOMB_SITES.B.z]}
        size={[RAVENPOINT_BOMB_SITES.B.radius * 2, RAVENPOINT_BOMB_SITES.B.radius * 2]}
        color={COLORS.siteB}
        opacity={0.18}
      />
      <SiteMarker x={RAVENPOINT_BOMB_SITES.B.x} z={RAVENPOINT_BOMB_SITES.B.z} color="#3b82f6" letter="B" />
    </group>
  );
}

function SpawnAreas() {
  return (
    <group>
      <SpawnZone position={[RAVENPOINT_SPAWN.T.x, 0.03, RAVENPOINT_SPAWN.T.z]} color={COLORS.t} radius={12} />
      <SpawnZone position={[RAVENPOINT_SPAWN.CT.x, 0.03, RAVENPOINT_SPAWN.CT.z]} color={COLORS.ct} radius={12} />
    </group>
  );
}

export function RavenPoint() {
  return (
    <group name="de_ravenpoint">
      <ambientLight intensity={0.6} color="#e0f2fe" />
      <directionalLight
        castShadow
        position={[20, 30, -20]}
        intensity={1.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        color="#ffffff"
      />
      <directionalLight position={[-15, 20, 15]} intensity={0.25} color="#fef3c7" />

      <Ground />
      <AreaFloors />
      <Colliders />
      <BombSites />
      <SpawnAreas />
    </group>
  );
}
