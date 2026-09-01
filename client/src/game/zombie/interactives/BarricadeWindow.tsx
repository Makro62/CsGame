import { Billboard, Text } from "@react-three/drei";
import { useZombieStore } from "../../../stores/useZombieStore";

export { findNearestBarricade } from "../survivalLayout";

interface BarricadeWindowProps {
  windowId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  w?: number;
  h?: number;
}

export function BarricadeWindow({
  windowId,
  position,
  rotation = [0, 0, 0],
  w = 2.8,
  h = 2.2,
}: BarricadeWindowProps) {
  const planks = useZombieStore((s) => s.barricades[windowId] ?? 6);
  const repairBarricade = useZombieStore((s) => s.repairBarricade);
  const span = Math.max(w, h);
  const height = Math.min(w, h);

  return (
    <group
      position={position}
      rotation={rotation}
      userData={{ interactiveType: "barricade", onInteract: () => { if (planks < 6) repairBarricade(windowId); } }}
    >
      {Array.from({ length: planks }).map((_, i) => (
        <mesh key={i} position={[0, -height / 2 + 0.28 + i * 0.32, 0.12]} castShadow>
          <boxGeometry args={[span - 0.4, 0.22, 0.08]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.9} metalness={0.05} />
        </mesh>
      ))}

      <mesh>
        <boxGeometry args={[span, height, 0.15]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.9} />
      </mesh>

      {planks < 6 && (
        <Billboard position={[0, height * 0.7, 0.2]}>
          <Text fontSize={0.28} color="#22c55e" anchorX="center" outlineWidth={0.02} outlineColor="#000">
            [F] REPAIR (+10)
          </Text>
        </Billboard>
      )}
    </group>
  );
}
