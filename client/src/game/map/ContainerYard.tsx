import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { BOMB_SITES, BUY_ZONE, MAP_BOUNDARY, MAP_OBSTACLES, type MapObstacle } from "@cs-game/shared";
import { StaticBox, FloorZone } from "./MapHelpers";

const COLORS = {
  ground: "#1a2332",
  wood: "#78350f",
  concrete: "#475569",
  t: "#991b1b",
  ct: "#1e3a8a",
  a: "#9a3412",
  mid: "#334155",
} as const;

const letterCache = new Map<string, THREE.CanvasTexture>();

function siteLetterTexture(letter: string, color: string): THREE.CanvasTexture {
  const key = `${letter}:${color}`;
  const hit = letterCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = "bold 92px Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 8;
    ctx.strokeText(letter, 64, 70);
    ctx.fillStyle = color;
    ctx.fillText(letter, 64, 70);
  }
  const tex = new THREE.CanvasTexture(canvas);
  letterCache.set(key, tex);
  return tex;
}

function colorFor(obs: MapObstacle): string {
  if (obs.material === "wood") return COLORS.wood;
  if (obs.material === "concrete") return COLORS.concrete;
  if (obs.id.startsWith("t_")) return COLORS.t;
  if (obs.id.startsWith("ct_") || obs.id.startsWith("site_b") || obs.id.startsWith("b_")) return COLORS.ct;
  if (obs.id.startsWith("site_a") || obs.id.startsWith("a_")) return COLORS.a;
  return COLORS.mid;
}

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

function SiteMarker({ x, z, color, letter }: { x: number; z: number; color: string; letter: string }) {
  const tex = siteLetterTexture(letter, color);
  return (
    <group position={[x, 0.04, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

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
    </group>
  );
}

function Ground() {
  const w = MAP_BOUNDARY.maxX - MAP_BOUNDARY.minX + 4;
  const d = MAP_BOUNDARY.maxZ - MAP_BOUNDARY.minZ + 4;
  return (
    <RigidBody type="fixed" position={[0, -0.5, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.92} metalness={0.08} />
      </mesh>
      <CuboidCollider args={[w / 2, 1.0, d / 2]} />
    </RigidBody>
  );
}

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
      {MAP_OBSTACLES.map((obs) => (
        <Obstacle key={obs.id} obs={obs} />
      ))}
      <FloorZones />
    </group>
  );
}

export default ContainerYard;
