import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useZombieStore, type LootKind } from "../../stores/useZombieStore";

const COLORS: Record<LootKind, string> = {
  health: "#ef4444",
  ammo: "#eab308",
  armor: "#3b82f6",
  weapon: "#a855f7",
};

function LootMesh({ kind, x, z }: { kind: LootKind; x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = 0.45 + Math.sin(t * 3) * 0.12;
    ref.current.rotation.y = t * 1.6;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={ref}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color={COLORS[kind]} emissive={COLORS[kind]} emissiveIntensity={0.55} />
      </mesh>
      <pointLight color={COLORS[kind]} intensity={1.4} distance={4} />
    </group>
  );
}

export function LootRenderer() {
  const loot = useZombieStore(s => s.loot);
  return (
    <group>
      {loot.map(item => (
        <LootMesh key={item.id} kind={item.kind} x={item.x} z={item.z} />
      ))}
    </group>
  );
}
