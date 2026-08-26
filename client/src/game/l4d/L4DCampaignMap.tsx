import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox } from "../map/MapHelpers";
import { useL4DStore } from "../../stores/useL4DStore";

function chapterScale(chapter: number) {
  return chapter === 1 ? 1 : chapter === 2 ? 1.12 : chapter === 3 ? 1.28 : 1.42;
}

export function l4dFinishZ(chapter: number) {
  return 38 * chapterScale(chapter);
}

const WALL = "#2a3238";
const WALL_ALT = "#3a3330";
const WOOD = "#5c4634";

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
    if (g.a > cursor + 0.25) segs.push([cursor, g.a]);
    cursor = Math.max(cursor, g.b);
  }
  if (hi - cursor > 0.25) segs.push([cursor, hi]);
  return (
    <>
      {segs.map(([a, b], i) => (
        <StaticBox key={`${x}-${a}-${i}`} position={[x, 2, (a + b) / 2]} size={[0.5, 4, b - a]} color={color} materialType="concrete" />
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
    if (g.a > cursor + 0.25) segs.push([cursor, g.a]);
    cursor = Math.max(cursor, g.b);
  }
  if (hi - cursor > 0.25) segs.push([cursor, hi]);
  return (
    <>
      {segs.map(([a, b], i) => (
        <StaticBox key={`${z}-${a}-${i}`} position={[(a + b) / 2, 2, z]} size={[b - a, 4, 0.5]} color={color} materialType="concrete" />
      ))}
    </>
  );
}

function Floor({ x, z, w, d, color = "#1a2218" }: { x: number; z: number; w: number; d: number; color?: string }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ skipShot: true }}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Ceiling({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <StaticBox position={[x, 4.25, z]} size={[w, 0.28, d]} color="#12161a" materialType="concrete" receiveShadow={false} skipShot />
  );
}

function Crate({ x, z, s = 1.2 }: { x: number; z: number; s?: number }) {
  return <StaticBox position={[x, s / 2, z]} size={[s, s, s]} color={WOOD} materialType="wood" />;
}

function SafeRoom({ z }: { z: number }) {
  return (
    <group>
      <Floor x={0} z={z} w={13} d={13} color="#14532d" />
      <WallX z={z - 6.4} x0={-6.5} x1={6.5} />
      <WallZ x={-6.5} z0={z - 6.4} z1={z + 6.4} />
      <WallZ x={6.5} z0={z - 6.4} z1={z + 6.4} />
      <WallX z={z + 6.4} x0={-6.5} x1={6.5} openings={[{ x: 0, w: 3.8 }]} />
      <mesh position={[0, 1.7, z + 6.35]} userData={{ skipShot: true }}>
        <boxGeometry args={[3.6, 3.3, 0.1]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.4} />
      </mesh>
      <Ceiling x={0} z={z} w={13.2} d={13.2} />
      <pointLight position={[0, 3.3, z]} intensity={1.4} distance={16} color="#86efac" />
      <Crate x={-4.2} z={z - 3.5} s={1.1} />
    </group>
  );
}

function RescuePad({ z }: { z: number }) {
  const arrived = useL4DStore(s => s.rescueVehicleArrived);
  const finale = useL4DStore(s => s.finaleState);
  return (
    <group>
      <Floor x={0} z={z} w={20} d={18} color={arrived ? "#14532d" : "#1e293b"} />
      <WallZ x={-10} z0={z - 9} z1={z + 9} />
      <WallZ x={10} z0={z - 9} z1={z + 9} />
      <WallX z={z - 9} x0={-10} x1={10} openings={[{ x: 0, w: 8.6 }]} />
      <WallX z={z + 9} x0={-10} x1={10} />
      <group position={[0, 1.25, z + 2]}>
        <mesh>
          <boxGeometry args={[6.2, 1.5, 3.6]} />
          <meshStandardMaterial color="#d6d3d1" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 7.2, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
      {arrived && <pointLight position={[0, 4, z]} intensity={2.4} distance={28} color="#4ade80" />}
      <mesh position={[0, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ skipShot: true }}>
        <ringGeometry args={[7.6, 8.2, 32]} />
        <meshBasicMaterial
          color={finale === "holdout" ? "#f59e0b" : finale === "escape" ? "#22c55e" : "#38bdf8"}
          transparent
          opacity={0.55}
          side={2}
        />
      </mesh>
      <Ceiling x={0} z={z} w={20.4} d={18.4} />
      <pointLight position={[0, 3.4, z - 4]} intensity={0.9} distance={16} color="#fde68a" />
    </group>
  );
}

export function L4DCampaignMap() {
  const chapter = useL4DStore(s => s.chapter);
  const scale = chapterScale(chapter);
  const startZ = -36;
  const wareZ = -14 * scale;
  const sideZ = 4 * scale;
  const endZ = l4dFinishZ(chapter);
  const floorLen = endZ - startZ + 32;
  const floorMid = (startZ + endZ) / 2;
  const hallEnd = endZ - 10;

  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, floorMid]}>
        <mesh receiveShadow userData={{ skipShot: true }}>
          <boxGeometry args={[48, 1, floorLen]} />
          <meshStandardMaterial color="#0a100c" roughness={1} />
        </mesh>
        <CuboidCollider args={[24, 0.5, floorLen / 2]} />
      </RigidBody>

      <SafeRoom z={startZ} />

      {/* Hall A: safe room → warehouse */}
      <Floor x={0} z={(startZ + 6.5 + wareZ - 7) / 2} w={8.4} d={Math.abs(wareZ - 7 - (startZ + 6.5))} color="#1c241c" />
      <WallZ x={-4.2} z0={startZ + 6.5} z1={wareZ - 7} />
      <WallZ x={4.2} z0={startZ + 6.5} z1={wareZ - 7} />
      <Ceiling x={0} z={(startZ + 6.5 + wareZ - 7) / 2} w={8.8} d={Math.abs(wareZ - 7 - (startZ + 6.5)) + 0.4} />
      <pointLight position={[0, 3.1, startZ + 14]} intensity={0.65} distance={14} color="#c4b48a" />

      {/* Warehouse */}
      <Floor x={0} z={wareZ} w={18} d={14} color="#2a2418" />
      <WallX z={wareZ - 7} x0={-9} x1={9} openings={[{ x: 0, w: 8.6 }]} color={WALL_ALT} />
      <WallX z={wareZ + 7} x0={-9} x1={9} openings={[{ x: 0, w: 8.6 }]} color={WALL_ALT} />
      <WallZ x={-9} z0={wareZ - 7} z1={wareZ + 7} color={WALL_ALT} />
      <WallZ x={9} z0={wareZ - 7} z1={wareZ + 7} color={WALL_ALT} />
      <Ceiling x={0} z={wareZ} w={18.4} d={14.4} />
      <Crate x={-5.5} z={wareZ - 2} s={1.4} />
      <Crate x={-4.1} z={wareZ - 2.2} s={1.0} />
      <Crate x={5.2} z={wareZ + 2.4} s={1.5} />
      <pointLight position={[0, 3.4, wareZ]} intensity={1.15} distance={18} color="#e8c07a" />

      {/* Hall B with door into side room */}
      <Floor x={0} z={(wareZ + 7 + hallEnd) / 2} w={8.4} d={Math.abs(hallEnd - (wareZ + 7))} color="#1c241c" />
      <WallZ x={-4.2} z0={wareZ + 7} z1={hallEnd} />
      <WallZ x={4.2} z0={wareZ + 7} z1={hallEnd} openings={[{ z: sideZ, w: 3.4 }]} />
      <Ceiling x={0} z={(wareZ + 7 + hallEnd) / 2} w={8.8} d={Math.abs(hallEnd - (wareZ + 7)) + 0.4} />
      <pointLight position={[0, 3.1, sideZ]} intensity={0.55} distance={12} color="#c4b48a" />
      <pointLight position={[0, 3.1, sideZ + 12]} intensity={0.5} distance={12} color="#a8b8c4" />
      <Crate x={-2.4} z={sideZ + 8} s={0.95} />

      {/* Side room (right) — enterable */}
      <Floor x={10.2} z={sideZ} w={12} d={10} color="#1a2030" />
      <WallX z={sideZ - 5} x0={4.2} x1={16.2} color="#2c3544" />
      <WallX z={sideZ + 5} x0={4.2} x1={16.2} color="#2c3544" />
      <WallZ x={16.2} z0={sideZ - 5} z1={sideZ + 5} color="#2c3544" />
      <Ceiling x={10.2} z={sideZ} w={12.4} d={10.4} />
      <Crate x={12.4} z={sideZ - 2} s={1.15} />
      <Crate x={8.6} z={sideZ + 2.4} s={0.9} />
      <pointLight position={[10, 3.2, sideZ]} intensity={0.95} distance={14} color="#93c5fd" />

      <RescuePad z={endZ} />
      <WallX z={hallEnd} x0={-4.2} x1={4.2} openings={[{ x: 0, w: 8 }]} />
    </group>
  );
}
