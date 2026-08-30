import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox, StaticCylinder } from "../map/MapHelpers";
import { useL4DStore } from "../../stores/useL4DStore";
import { L4D_FINISH_Z, L4D_SAFE_Z, L4D_HALL_HALF } from "./l4dLayout";

const WALL = "#2a3238";
const WALL_ALT = "#3a3330";
const WOOD = "#5c4634";
const METAL = "#4a5568";
const RUST = "#8b4513";
const HALL = L4D_HALL_HALF;

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
        <StaticBox key={`${x}-${a}-${i}`} position={[x, 2, (a + b) / 2]} size={[0.4, 4, b - a]} color={color} materialType="concrete" />
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
        <StaticBox key={`${z}-${a}-${i}`} position={[(a + b) / 2, 2, z]} size={[b - a, 4, 0.4]} color={color} materialType="concrete" />
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

function SafeRoom() {
  const z = L4D_SAFE_Z;
  return (
    <group>
      <Floor x={0} z={z} w={10} d={10} color="#14532d" />
      <WallX z={z - 5} x0={-5} x1={5} />
      <WallZ x={-5} z0={z - 5} z1={z + 5} />
      <WallZ x={5} z0={z - 5} z1={z + 5} />
      <WallX z={z + 5} x0={-5} x1={5} openings={[{ x: 0, w: HALL * 2 }]} />
      <mesh position={[0, 1.6, z + 4.95]} userData={{ skipShot: true }}>
        <boxGeometry args={[HALL * 2 - 0.3, 3.1, 0.08]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.35} />
      </mesh>
      <Ceiling x={0} z={z} w={10.4} d={10.4} />
      <pointLight position={[0, 3.2, z]} intensity={1.25} distance={14} color="#86efac" />
      <Crate x={-3.4} z={z - 2.8} s={1.0} />
      <Crate x={3.2} z={z - 3.0} s={0.8} />
      <Barrel x={-3.5} z={z + 2.5} color={RUST} />
      <Debris x={1.5} z={z - 1.5} rot={0.3} />
    </group>
  );
}

function HallA() {
  const z0 = L4D_SAFE_Z + 5;
  const z1 = -12;
  const midZ = (z0 + z1) / 2;
  return (
    <group>
      <Floor x={0} z={midZ} w={HALL * 2} d={z1 - z0} color="#1c241c" />
      <WallZ x={-HALL} z0={z0} z1={z1} />
      <WallZ x={HALL} z0={z0} z1={z1} />
      <Ceiling x={0} z={midZ} w={HALL * 2 + 0.5} d={z1 - z0 + 0.2} />
      <pointLight position={[0, 3, -20]} intensity={0.55} distance={12} color="#c4b48a" />
      <Pipe x={-HALL + 0.3} z={-18} />
      <Pipe x={HALL - 0.3} z={-14} />
      <Debris x={0.5} z={-16} rot={0.8} />
      <Debris x={-0.3} z={-22} rot={-0.4} />
    </group>
  );
}

function Warehouse() {
  const z = -6;
  return (
    <group>
      <Floor x={0} z={z} w={15} d={12} color="#2a2418" />
      <WallX z={z - 6} x0={-7.5} x1={7.5} openings={[{ x: 0, w: HALL * 2 }]} color={WALL_ALT} />
      <WallX z={z + 6} x0={-7.5} x1={7.5} openings={[{ x: 0, w: HALL * 2 }]} color={WALL_ALT} />
      <WallZ x={-7.5} z0={z - 6} z1={z + 6} color={WALL_ALT} />
      <WallZ x={7.5} z0={z - 6} z1={z + 6} color={WALL_ALT} />
      <Ceiling x={0} z={z} w={15.4} d={12.4} />
      <Crate x={-5.2} z={z - 2.2} s={1.3} />
      <Crate x={-3.9} z={z - 2.4} s={0.95} />
      <Crate x={5.0} z={z + 2.2} s={1.35} />
      <Crate x={-5.0} z={z + 3.5} s={1.1} />
      <Crate x={6.2} z={z - 3.8} s={0.9} />
      <Barrel x={6.5} z={z + 4.5} color={METAL} />
      <Barrel x={-6.2} z={z + 4.2} color={RUST} />
      <Barrel x={6.8} z={z - 1.5} color={METAL} />
      <Debris x={2.5} z={z - 4.5} rot={1.2} />
      <Debris x={-2.0} z={z + 5.0} rot={-0.6} />
      <Pipe x={-7.2} z={z - 3} />
      <Pipe x={7.2} z={z + 3} />
      <pointLight position={[0, 3.3, z]} intensity={1.05} distance={16} color="#e8c07a" />
      <pointLight position={[-5, 2.8, z - 3]} intensity={0.4} distance={8} color="#f59e0b" />
      <pointLight position={[5, 2.8, z + 3]} intensity={0.35} distance={8} color="#fbbf24" />
    </group>
  );
}

function SideRoom() {
  const z = 8;
  return (
    <group>
      <Floor x={8.6} z={z} w={13} d={8} color="#1a2030" />
      <WallX z={z - 4} x0={HALL} x1={15} color="#2c3544" />
      <WallX z={z + 4} x0={HALL} x1={15} color="#2c3544" />
      <WallZ x={15} z0={z - 4} z1={z + 4} color="#2c3544" />
      <Ceiling x={8.6} z={z} w={13.4} d={8.4} />
      <Crate x={11.5} z={z - 1.6} s={1.1} />
      <Crate x={7.4} z={z + 1.8} s={0.85} />
      <Crate x={13.0} z={z + 1.2} s={0.7} />
      <Barrel x={13.5} z={z - 2.5} color={RUST} />
      <Barrel x={7.2} z={z - 2.8} color={METAL} />
      <Debris x={10.0} z={z + 2.5} rot={0.5} />
      <Pipe x={14.5} z={z - 1} />
      <pointLight position={[9, 3.1, z]} intensity={0.85} distance={12} color="#93c5fd" />
      <pointLight position={[13, 2.5, z - 2]} intensity={0.3} distance={6} color="#60a5fa" />
    </group>
  );
}

function HallB() {
  const z0 = 0;
  const z1 = L4D_FINISH_Z - 8;
  const midZ = (z0 + z1) / 2;
  const sideZ = 8;
  return (
    <group>
      <Floor x={0} z={midZ} w={HALL * 2} d={z1 - z0} color="#1c241c" />
      <WallZ x={-HALL} z0={z0} z1={z1} />
      <WallZ x={HALL} z0={z0} z1={z1} openings={[{ z: sideZ, w: 3.0 }]} />
      <Ceiling x={0} z={midZ} w={HALL * 2 + 0.5} d={z1 - z0 + 0.2} />
      <pointLight position={[0, 3, 8]} intensity={0.5} distance={12} color="#c4b48a" />
      <pointLight position={[0, 3, 16]} intensity={0.45} distance={12} color="#a8b8c4" />
      <pointLight position={[0, 3, 24]} intensity={0.4} distance={10} color="#d4a574" />
      <Pipe x={-HALL + 0.3} z={4} />
      <Pipe x={HALL - 0.3} z={12} />
      <Pipe x={-HALL + 0.3} z={20} />
      <Debris x={0.4} z={6} rot={-0.3} />
      <Debris x={-0.2} z={14} rot={0.7} />
      <Debris x={0.6} z={22} rot={-1.1} />
    </group>
  );
}

function RescuePad() {
  const z = L4D_FINISH_Z;
  const arrived = useL4DStore(s => s.rescueVehicleArrived);
  const finale = useL4DStore(s => s.finaleState);
  return (
    <group>
      <Floor x={0} z={z} w={18} d={16} color={arrived ? "#14532d" : "#1e293b"} />
      <WallZ x={-9} z0={z - 8} z1={z + 8} />
      <WallZ x={9} z0={z - 8} z1={z + 8} />
      <WallX z={z - 8} x0={-9} x1={9} openings={[{ x: 0, w: HALL * 2 }]} />
      <WallX z={z + 8} x0={-9} x1={9} />
      <group position={[0, 1.15, z + 1.5]}>
        <mesh>
          <boxGeometry args={[5.6, 1.4, 3.2]} />
          <meshStandardMaterial color="#d6d3d1" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 6.4, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[-2.2, -0.3, 1.2]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[2.2, -0.3, 1.2]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      {arrived && <pointLight position={[0, 4, z]} intensity={2.2} distance={24} color="#4ade80" />}
      <mesh position={[0, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <ringGeometry args={[6.4, 7.0, 32]} />
        <meshBasicMaterial
          color={finale === "holdout" ? "#f59e0b" : finale === "escape" ? "#22c55e" : "#38bdf8"}
          transparent
          opacity={0.5}
          side={2}
        />
      </mesh>
      <Ceiling x={0} z={z} w={18.4} d={16.4} />
      <Crate x={-6.5} z={z - 5.5} s={1.2} />
      <Crate x={6.5} z={z - 5.5} s={1.0} />
      <Crate x={-6.5} z={z + 5.5} s={0.9} />
      <Crate x={6.5} z={z + 5.5} s={1.1} />
      <Barrel x={-7.5} z={z} color={METAL} />
      <Barrel x={7.5} z={z} color={RUST} />
      <Debris x={-3} z={z + 4} rot={0.4} />
      <Debris x={3} z={z - 4} rot={-0.8} />
      <Pipe x={-8.5} z={z - 4} />
      <Pipe x={8.5} z={z + 4} />
      <pointLight position={[0, 3.3, z - 3]} intensity={0.85} distance={14} color="#fde68a" />
      <pointLight position={[-5, 2.8, z + 5]} intensity={0.35} distance={8} color="#fbbf24" />
      <pointLight position={[5, 2.8, z + 5]} intensity={0.35} distance={8} color="#fbbf24" />
    </group>
  );
}

export function L4DCampaignMap() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, -2]}>
        <mesh receiveShadow userData={{ skipShot: true }}>
          <boxGeometry args={[36, 1, 80]} />
          <meshStandardMaterial color="#0a100c" roughness={1} />
        </mesh>
        <CuboidCollider args={[18, 0.5, 40]} />
      </RigidBody>

      <SafeRoom />
      <HallA />
      <Warehouse />
      <HallB />
      <SideRoom />
      <RescuePad />
    </group>
  );
}
