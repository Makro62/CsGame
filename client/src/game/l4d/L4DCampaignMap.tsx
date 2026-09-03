import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox, StaticCylinder } from "../map/MapHelpers";
import { useL4DStore } from "../../stores/useL4DStore";
import {
  L4D_FINISH_Z,
  L4D_SAFE_Z,
  L4D_WALL_T,
  L4D_DOOR_W,
  L4D_ROOMS,
  L4D_ZONES,
  type L4DRect,
} from "./l4dLayout";

const WALL = "#2a3238";
const WALL_ALT = "#3a3330";
const WOOD = "#5c4634";
const METAL = "#4a5568";
const RUST = "#8b4513";
const T = L4D_WALL_T;

function WallZ({
  x, z0, z1, openings = [], color = WALL,
}: {
  x: number; z0: number; z1: number;
  openings?: Array<{ z: number; w: number }>;
  color?: string;
}) {
  const lo = Math.min(z0, z1);
  const hi = Math.max(z0, z1);
  const gaps = openings
    .map(o => ({ a: o.z - o.w / 2, b: o.z + o.w / 2 }))
    .sort((a, b) => a.a - b.a);
  const segs: Array<[number, number]> = [];
  let cursor = lo;
  for (const g of gaps) {
    if (g.a > cursor + 0.2) segs.push([cursor, g.a]);
    cursor = Math.max(cursor, g.b);
  }
  if (hi - cursor > 0.2) segs.push([cursor, hi]);
  return (
    <>
      {segs.map(([a, b], i) => (
        <StaticBox key={`${x}-${a}-${i}`} position={[x, 2, (a + b) / 2]} size={[T, 4, b - a]} color={color} materialType="concrete" />
      ))}
    </>
  );
}

function WallX({
  z, x0, x1, openings = [], color = WALL,
}: {
  z: number; x0: number; x1: number;
  openings?: Array<{ x: number; w: number }>;
  color?: string;
}) {
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  const gaps = openings
    .map(o => ({ a: o.x - o.w / 2, b: o.x + o.w / 2 }))
    .sort((a, b) => a.a - b.a);
  const segs: Array<[number, number]> = [];
  let cursor = lo;
  for (const g of gaps) {
    if (g.a > cursor + 0.2) segs.push([cursor, g.a]);
    cursor = Math.max(cursor, g.b);
  }
  if (hi - cursor > 0.2) segs.push([cursor, hi]);
  return (
    <>
      {segs.map(([a, b], i) => (
        <StaticBox key={`${z}-${a}-${i}`} position={[(a + b) / 2, 2, z]} size={[b - a, 4, T]} color={color} materialType="concrete" />
      ))}
    </>
  );
}

function Floor({ x, z, w, d, color = "#1a2218" }: { x: number; z: number; w: number; d: number; color?: string }) {
  return (
    <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ skipShot: true }}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Ceiling({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <StaticBox position={[x, 4.2, z]} size={[w, 0.24, d]} color="#12161a" materialType="concrete" receiveShadow={false} skipShot />
  );
}

function roomCenter(r: L4DRect) {
  return {
    x: (r.minX + r.maxX) / 2,
    z: (r.minZ + r.maxZ) / 2,
    w: r.maxX - r.minX,
    d: r.maxZ - r.minZ,
  };
}

function Crate({ x, z, s = 1.1 }: { x: number; z: number; s?: number }) {
  return <StaticBox position={[x, s / 2, z]} size={[s, s, s]} color={WOOD} materialType="wood" />;
}

function Barrel({ x, z, color = METAL }: { x: number; z: number; color?: string }) {
  return <StaticCylinder position={[x, 0.5, z]} radius={0.35} height={1} color={color} materialType="metal" />;
}

function Debris({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <StaticBox position={[0, 0.08, 0]} size={[0.8, 0.16, 0.3]} color={WOOD} materialType="wood" />
      <StaticBox position={[0.3, 0.06, 0.2]} size={[0.4, 0.12, 0.2]} color={METAL} materialType="metal" />
    </group>
  );
}

function Pipe({ x, z, height = 3.5 }: { x: number; z: number; height?: number }) {
  return (
    <group position={[x, height / 2, z]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, height, 8]} />
        <meshStandardMaterial color="#5a6570" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ZoneGate({ z, open }: { z: number; open: boolean }) {
  if (open) {
    return (
      <mesh position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[L4D_DOOR_W + 1, 1.6]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.28} />
      </mesh>
    );
  }
  return (
    <StaticBox
      position={[0, 2, z]}
      size={[L4D_DOOR_W - 0.2, 4, 0.7]}
      color="#7f1d1d"
      materialType="metal"
    />
  );
}

function ZoneGates() {
  const unlocked = useL4DStore(s => s.unlockedZones);
  return (
    <group>
      {L4D_ZONES.slice(0, -1).map((zone, i) => (
        <ZoneGate key={zone.id} z={zone.gateZ} open={unlocked > i + 1} />
      ))}
    </group>
  );
}

function SafeRoom() {
  const r = L4D_ROOMS.safe;
  const c = roomCenter(r);
  const z = L4D_SAFE_Z;
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color="#14532d" />
      <WallX z={r.minZ} x0={r.minX} x1={r.maxX} />
      <WallZ x={r.minX} z0={r.minZ} z1={r.maxZ} />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} />
      <WallX z={r.maxZ} x0={r.minX} x1={r.maxX} openings={[{ x: 0, w: L4D_DOOR_W }]} />
      {/* Open gateway zone marker on the floor (green illumination) */}
      <mesh position={[0, 0.04, r.maxZ]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <planeGeometry args={[L4D_DOOR_W, 1.6]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.28} />
      </mesh>
      {/* Safe room heavy metal door swung open against the wall */}
      <mesh position={[-4.7, 1.6, r.maxZ + 1.2]} userData={{ skipShot: true }}>
        <boxGeometry args={[0.12, 3.1, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-4.62, 1.6, r.maxZ + 1.2]} userData={{ skipShot: true }}>
        <boxGeometry args={[0.04, 0.6, 0.8]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.5} />
      <pointLight position={[0, 3.2, z]} intensity={1.25} distance={18} color="#86efac" />
      <Crate x={-5.2} z={z - 4.2} s={1.0} />
      <Crate x={5.0} z={z - 4.4} s={0.8} />
      <Barrel x={-5.4} z={z + 3.6} color={RUST} />
      <Debris x={2.2} z={z - 2.2} rot={0.3} />
    </group>
  );
}

function HallA() {
  const r = L4D_ROOMS.hall_a;
  const c = roomCenter(r);
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color="#1c241c" />
      <WallZ x={r.minX} z0={r.minZ} z1={r.maxZ} />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} />
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.2} />
      <pointLight position={[0, 3, -36]} intensity={0.55} distance={16} color="#c4b48a" />
      <pointLight position={[0, 3, -24]} intensity={0.5} distance={16} color="#c4b48a" />
      <Pipe x={r.minX + 0.4} z={-32} />
      <Pipe x={r.maxX - 0.4} z={-22} />
      <Debris x={1.2} z={-28} rot={0.8} />
      <Debris x={-0.8} z={-38} rot={-0.4} />
    </group>
  );
}

function Warehouse() {
  const r = L4D_ROOMS.warehouse;
  const c = roomCenter(r);
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color="#2a2418" />
      <WallX z={r.minZ} x0={r.minX} x1={r.maxX} openings={[{ x: 0, w: L4D_DOOR_W }]} color={WALL_ALT} />
      <WallX z={r.maxZ} x0={r.minX} x1={r.maxX} openings={[{ x: 0, w: L4D_DOOR_W }]} color={WALL_ALT} />
      <WallZ x={r.minX} z0={r.minZ} z1={r.maxZ} color={WALL_ALT} />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} color={WALL_ALT} />
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.5} />
      <Crate x={-12} z={-6} s={1.6} />
      <Crate x={-10} z={4} s={1.4} />
      <Crate x={12} z={-8} s={1.8} />
      <Crate x={10} z={6} s={1.5} />
      <Crate x={0} z={0} s={1.3} />
      <Crate x={-5.2} z={-8.2} s={1.3} />
      <Barrel x={13} z={8} color={METAL} />
      <Barrel x={-13} z={8} color={RUST} />
      <Barrel x={13} z={-2} color={METAL} />
      <Debris x={4} z={-10} rot={1.2} />
      <Debris x={-4} z={10} rot={-0.6} />
      <Pipe x={r.minX + 0.4} z={-8} />
      <Pipe x={r.maxX - 0.4} z={8} />
      <pointLight position={[0, 3.3, 0]} intensity={1.15} distance={22} color="#e8c07a" />
      <pointLight position={[-10, 2.8, -6]} intensity={0.45} distance={12} color="#f59e0b" />
      <pointLight position={[10, 2.8, 6]} intensity={0.4} distance={12} color="#fbbf24" />
    </group>
  );
}

function SideRoom() {
  const r = L4D_ROOMS.side;
  const c = roomCenter(r);
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color="#1a2030" />
      <WallX z={r.minZ} x0={r.minX} x1={r.maxX} color="#2c3544" />
      <WallX z={r.maxZ} x0={r.minX} x1={r.maxX} color="#2c3544" />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} color="#2c3544" />
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.5} />
      <Crate x={18} z={24} s={1.5} />
      <Crate x={24} z={32} s={1.2} />
      <Crate x={13} z={28} s={1.1} />
      <Barrel x={26} z={22} color={RUST} />
      <Barrel x={10} z={22} color={METAL} />
      <Debris x={16} z={34} rot={0.5} />
      <Pipe x={r.maxX - 0.5} z={26} />
      <pointLight position={[16, 3.1, 28]} intensity={0.9} distance={16} color="#93c5fd" />
      <pointLight position={[24, 2.5, 22]} intensity={0.35} distance={8} color="#60a5fa" />
    </group>
  );
}

function HallB() {
  const r = L4D_ROOMS.hall_b;
  const c = roomCenter(r);
  const sideZ = (L4D_ROOMS.side.minZ + L4D_ROOMS.side.maxZ) / 2;
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color="#1c241c" />
      <WallZ x={r.minX} z0={r.minZ} z1={r.maxZ} />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} openings={[{ z: sideZ, w: 4.2 }]} />
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.2} />
      <pointLight position={[0, 3, 22]} intensity={0.5} distance={16} color="#c4b48a" />
      <pointLight position={[0, 3, 32]} intensity={0.45} distance={16} color="#a8b8c4" />
      <pointLight position={[0, 3, 40]} intensity={0.4} distance={14} color="#d4a574" />
      <Pipe x={r.minX + 0.4} z={20} />
      <Pipe x={r.maxX - 0.4} z={30} />
      <Pipe x={r.minX + 0.4} z={38} />
      <Debris x={1.0} z={22} rot={-0.3} />
      <Debris x={-0.6} z={32} rot={0.7} />
      <Debris x={1.2} z={40} rot={-1.1} />
    </group>
  );
}

function RescuePad() {
  const r = L4D_ROOMS.rescue;
  const c = roomCenter(r);
  const z = L4D_FINISH_Z;
  const unlocked = useL4DStore(s => s.unlockedZones);
  const open = unlocked >= L4D_ZONES.length;
  return (
    <group>
      <Floor x={c.x} z={c.z} w={c.w} d={c.d} color={open ? "#14532d" : "#1e293b"} />
      <WallZ x={r.minX} z0={r.minZ} z1={r.maxZ} />
      <WallZ x={r.maxX} z0={r.minZ} z1={r.maxZ} />
      <WallX z={r.minZ} x0={r.minX} x1={r.maxX} openings={[{ x: 0, w: L4D_DOOR_W }]} />
      <WallX z={r.maxZ} x0={r.minX} x1={r.maxX} />
      <Ceiling x={c.x} z={c.z} w={c.w + 0.5} d={c.d + 0.5} />
      <Crate x={-12} z={48} s={1.6} />
      <Crate x={12} z={48} s={1.4} />
      <Crate x={-12} z={64} s={1.3} />
      <Crate x={12} z={64} s={1.5} />
      <Barrel x={-14} z={z} color={METAL} />
      <Barrel x={14} z={z} color={RUST} />
      <Debris x={-5} z={z + 6} rot={0.4} />
      <Debris x={5} z={z - 6} rot={-0.8} />
      <Pipe x={r.minX + 0.5} z={z - 6} />
      <Pipe x={r.maxX - 0.5} z={z + 6} />
      <pointLight position={[0, 3.3, z - 4]} intensity={0.95} distance={20} color="#fde68a" />
      {open && <pointLight position={[0, 4, z]} intensity={1.8} distance={28} color="#4ade80" />}
    </group>
  );
}

export function L4DCampaignMap() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[6, -0.5, 5]}>
        <mesh receiveShadow userData={{ skipShot: true }}>
          <boxGeometry args={[80, 1, 160]} />
          <meshStandardMaterial color="#0a100c" roughness={1} />
        </mesh>
        <CuboidCollider args={[40, 0.5, 80]} />
      </RigidBody>

      <SafeRoom />
      <HallA />
      <Warehouse />
      <HallB />
      <SideRoom />
      <RescuePad />
      <ZoneGates />
    </group>
  );
}
