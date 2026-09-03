/**
 * Procedural 5v5 Map — Renders a seed-based procedurally generated bomb defuse map.
 * Same seed = same map every time. Different seed = new layout.
 */
import { useMemo } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { ProceduralMapResult } from "@cs-game/shared/proceduralMaps";
import { StaticBox, StaticCylinder, FloorZone, SiteMarker, SpawnZone } from "./MapHelpers";
import { computeLighting, getDefaultVariant, getWeatherParticles } from "../effects/MapVariants";
import { WeatherParticles } from "../effects/WeatherParticles";
import { ensureProcedural5v5 } from "./ProceduralMapRegistry";

// ─── Color Palette ───────────────────────────────────────────────
const COLORS = {
  ground: "#1a2332",
  groundAlt: "#151d2a",
  metal: { dark: "#374151", medium: "#4b5563", light: "#6b7280", rust: "#78350f" },
  concrete: { dark: "#334155", medium: "#475569", light: "#64748b" },
  wood: { dark: "#451a03", medium: "#78350f", light: "#92400e" },
  t: "#991b1b",
  ct: "#1e3a8a",
} as const;

function colorFor(obs: { material: string; id: string }): string {
  if (obs.material === "wood") return COLORS.wood.medium;
  if (obs.material === "concrete") return COLORS.concrete.medium;
  if (obs.id.startsWith("t_")) return COLORS.metal.dark;
  if (obs.id.startsWith("ct_")) return COLORS.metal.medium;
  if (obs.id.startsWith("site_a") || obs.id.startsWith("a_")) return COLORS.metal.light;
  if (obs.id.startsWith("site_b") || obs.id.startsWith("b_")) return COLORS.metal.rust;
  return COLORS.metal.dark;
}

// ─── Ground ──────────────────────────────────────────────────────
function Ground() {
  return (
    <group>
      <RigidBody type="fixed" position={[0, -0.5, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
          <planeGeometry args={[84, 104]} />
          <meshStandardMaterial color={COLORS.ground} roughness={0.92} metalness={0.08} />
        </mesh>
        <CuboidCollider args={[42, 1.0, 52]} />
      </RigidBody>
      {/* Concrete patches */}
      {[[-15, 0], [15, 0], [0, -12], [0, 12]].map(([x, z], i) => (
        <mesh key={`patch-${i}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
          <planeGeometry args={[8, 12]} />
          <meshStandardMaterial color={COLORS.groundAlt} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Obstacle Renderer ───────────────────────────────────────────
function Obstacle({ obs }: { obs: ProceduralMapResult["obstacles"][0] }) {
  if (obs.shape === "cylinder") {
    return (
      <StaticCylinder
        position={[obs.cx, obs.cy, obs.cz]}
        radius={obs.radius ?? 0.5}
        height={obs.height ?? 2}
        color={colorFor(obs)}
        materialType={obs.material === "wood" ? "wood" : obs.material === "concrete" ? "concrete" : "metal"}
      />
    );
  }
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

export function Procedural5v5Map() {
  const mapData = useMemo(() => ensureProcedural5v5(), []);
  const variant = useMemo(() => getDefaultVariant(mapData.seed), [mapData.seed]);
  const lighting = useMemo(() => computeLighting(variant), [variant]);
  const weatherParticles = useMemo(() => getWeatherParticles(variant.weather, variant.season), [variant]);

  return (
    <group name="procedural_5v5_map">
      {/* Lighting from MapVariants */}
      <ambientLight intensity={lighting.ambientIntensity} color={lighting.ambientColor} />
      <directionalLight
        castShadow
        position={[22, 36, 16]}
        intensity={lighting.directionalIntensity}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={110}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        color={lighting.directionalColor}
      />
      <directionalLight position={[-18, 22, -14]} intensity={0.32} color="#93c5fd" />

      <Ground />

      {/* All obstacles */}
      {mapData.obstacles.map((obs) => (
        <Obstacle key={obs.id} obs={obs} />
      ))}

      {/* Spawn zones */}
      <SpawnZone position={[mapData.spawns.T.x, 0.03, mapData.spawns.T.z]} color={COLORS.t} radius={10} />
      <SpawnZone position={[mapData.spawns.CT.x, 0.03, mapData.spawns.CT.z]} color={COLORS.ct} radius={10} />

      {/* Bomb sites */}
      <FloorZone
        position={[mapData.bombSites.A.x, 0.02, mapData.bombSites.A.z]}
        size={[mapData.bombSites.A.radius * 2, mapData.bombSites.A.radius * 2]}
        color="#dc2626"
        opacity={0.18}
      />
      <SiteMarker x={mapData.bombSites.A.x} z={mapData.bombSites.A.z} color="#ef4444" letter="A" />

      <FloorZone
        position={[mapData.bombSites.B.x, 0.02, mapData.bombSites.B.z]}
        size={[mapData.bombSites.B.radius * 2, mapData.bombSites.B.radius * 2]}
        color="#2563eb"
        opacity={0.18}
      />
      <SiteMarker x={mapData.bombSites.B.x} z={mapData.bombSites.B.z} color="#3b82f6" letter="B" />

      {/* Buy zones */}
      <FloorZone
        position={[mapData.spawns.T.x, 0.02, mapData.spawns.T.z]}
        size={[14, 16]}
        color={COLORS.t}
        opacity={0.14}
      />
      <FloorZone
        position={[mapData.spawns.CT.x, 0.02, mapData.spawns.CT.z]}
        size={[14, 16]}
        color={COLORS.ct}
        opacity={0.14}
      />

      <WeatherParticles config={weatherParticles} />

      {/* Fog from MapVariants */}
      <fog attach="fog" args={[lighting.fogColor, lighting.fogNear, lighting.fogFar]} />
    </group>
  );
}

export default Procedural5v5Map;
