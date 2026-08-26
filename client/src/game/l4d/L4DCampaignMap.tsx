import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox } from "../map/MapHelpers";
import { useL4DStore } from "../../stores/useL4DStore";

function chapterScale(chapter: number) {
  return chapter === 1 ? 1 : chapter === 2 ? 1.15 : chapter === 3 ? 1.35 : 1.5;
}

export function l4dFinishZ(chapter: number) {
  return 36 * chapterScale(chapter);
}

function SafeRoom({ z, isStart }: { z: number; isStart?: boolean }) {
  const col = isStart ? "#14532d" : "#1e3a8a";
  const emissive = isStart ? "#22c55e" : "#f59e0b";
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={col} roughness={0.9} />
      </mesh>
      <StaticBox position={[0, 2, -6.2]} size={[12.4, 4, 0.5]} color="#2b3340" materialType="concrete" />
      <StaticBox position={[-6.2, 2, 0]} size={[0.5, 4, 12.4]} color="#2b3340" materialType="concrete" />
      <StaticBox position={[6.2, 2, 0]} size={[0.5, 4, 12.4]} color="#2b3340" materialType="concrete" />
      {/* Door wall with 3.6m gap in the center (+Z) */}
      <StaticBox position={[-4.4, 2, 6.2]} size={[3.6, 4, 0.5]} color="#2b3340" materialType="concrete" />
      <StaticBox position={[4.4, 2, 6.2]} size={[3.6, 4, 0.5]} color="#2b3340" materialType="concrete" />
      <mesh position={[0, 1.6, 6.15]}>
        <boxGeometry args={[3.4, 3.2, 0.12]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.45} />
      </mesh>
      <pointLight position={[0, 3.4, 0]} intensity={1.3} distance={16} color={isStart ? "#4ade80" : "#fbbf24"} />
      <StaticBox position={[0, 4.3, 0]} size={[12.4, 0.3, 12.4]} color="#1a1f24" materialType="concrete" receiveShadow={false} />
    </group>
  );
}

function CorridorSegment({ fromZ, toZ, x = 0 }: { fromZ: number; toZ: number; x?: number }) {
  const midZ = (fromZ + toZ) / 2;
  const len = Math.abs(toZ - fromZ);
  return (
    <group>
      <mesh position={[x, 0.02, midZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.2, len]} />
        <meshStandardMaterial color="#1c241c" roughness={0.92} />
      </mesh>
      <StaticBox position={[x - 3.7, 2, midZ]} size={[0.45, 4, len]} color="#252b32" materialType="concrete" />
      <StaticBox position={[x + 3.7, 2, midZ]} size={[0.45, 4, len]} color="#252b32" materialType="concrete" />
      <StaticBox position={[x, 4.3, midZ]} size={[7.4, 0.3, len]} color="#14181c" materialType="concrete" receiveShadow={false} />
      <pointLight position={[x, 3.2, midZ]} intensity={0.55} distance={14} color="#c4b48a" />
    </group>
  );
}

function SideRoom({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a2218" roughness={0.9} />
      </mesh>
      <StaticBox position={[0, 2, -5.1]} size={[10.2, 4, 0.4]} color="#2a3138" materialType="concrete" />
      <StaticBox position={[0, 2, 5.1]} size={[10.2, 4, 0.4]} color="#2a3138" materialType="concrete" />
      <StaticBox position={[x > 0 ? 5.1 : -5.1, 2, 0]} size={[0.4, 4, 10.2]} color="#2a3138" materialType="concrete" />
      <StaticBox position={[0, 4.3, 0]} size={[10.2, 0.3, 10.2]} color="#14181c" materialType="concrete" receiveShadow={false} />
      <StaticBox position={[x > 0 ? -2 : 2, 0.5, -2]} size={[1.4, 1, 1.4]} color="#57534e" materialType="wood" />
      <pointLight position={[0, 3, 0]} intensity={0.7} distance={12} color="#aa7744" />
    </group>
  );
}

function RescuePad({ z }: { z: number }) {
  const arrived = useL4DStore(s => s.rescueVehicleArrived);
  const finale = useL4DStore(s => s.finaleState);
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color={arrived ? "#14532d" : "#334155"} roughness={0.8} />
      </mesh>
      <group position={[0, 1.3, 0]}>
        <mesh>
          <boxGeometry args={[6, 1.4, 3.5]} />
          <meshStandardMaterial color="#d6d3d1" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 7, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
      {arrived && <pointLight intensity={2.2} distance={28} color="#4ade80" />}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8.1, 8.6, 32]} />
        <meshBasicMaterial
          color={finale === "holdout" ? "#f59e0b" : finale === "escape" ? "#22c55e" : "#38bdf8"}
          transparent
          opacity={0.55}
          side={2}
        />
      </mesh>
      <StaticBox position={[-10, 2, 0]} size={[0.5, 4, 18]} color="#1f2937" materialType="concrete" />
      <StaticBox position={[10, 2, 0]} size={[0.5, 4, 18]} color="#1f2937" materialType="concrete" />
    </group>
  );
}

export function L4DCampaignMap() {
  const chapter = useL4DStore(s => s.chapter);
  const scale = chapterScale(chapter);
  const startZ = -36;
  const midZ = 0;
  const endZ = l4dFinishZ(chapter);
  const floorLen = endZ - startZ + 28;
  const floorMid = (startZ + endZ) / 2;

  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, floorMid]}>
        <mesh receiveShadow>
          <boxGeometry args={[40, 1, floorLen]} />
          <meshStandardMaterial color="#0d140f" roughness={1} />
        </mesh>
        <CuboidCollider args={[20, 0.5, floorLen / 2]} />
      </RigidBody>

      <SafeRoom z={startZ} isStart />
      <CorridorSegment fromZ={startZ + 6.4} toZ={midZ - 6} />
      <SideRoom x={8.8} z={-12 * scale} />
      <mesh position={[5.4, 0.03, -12 * scale]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 3.2]} />
        <meshStandardMaterial color="#1c241c" />
      </mesh>
      {/* Opening in right corridor wall is visual-only; side room sits outside. */}
      <CorridorSegment fromZ={midZ - 6} toZ={endZ - 10} />
      <SideRoom x={-8.8} z={12 * scale} />
      <RescuePad z={endZ} />

      <fog attach="fog" args={["#070c09", 18, 55]} />
    </group>
  );
}
