import { Text } from "@react-three/drei";
import { useZombieStore } from "../../../stores/useZombieStore";

interface BarricadeWindowProps {
  windowId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function BarricadeWindow({ windowId, position, rotation = [0, 0, 0] }: BarricadeWindowProps) {
  const planks = useZombieStore((s) => s.barricades[windowId] ?? 6);
  const repairBarricade = useZombieStore((s) => s.repairBarricade);

  const handleRepair = () => {
    repairBarricade(windowId);
  };

  return (
    <group
      position={position}
      rotation={rotation}
      userData={{ interactiveType: "barricade", onInteract: handleRepair }}
    >
      {/* Planks */}
      {Array.from({ length: planks }).map((_, i) => (
        <mesh key={i} position={[0, -0.9 + i * 0.32, 0.12]} castShadow>
          <boxGeometry args={[2.6, 0.22, 0.08]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.9} metalness={0.05} />
        </mesh>
      ))}

      {/* Frame */}
      <mesh>
        <boxGeometry args={[2.8, 2.2, 0.15]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.9} />
      </mesh>

      {planks < 6 && (
        <Text position={[0, 1.6, 0.2]} fontSize={0.28} color="#22c55e" anchorX="center" outlineWidth={0.02} outlineColor="#000">
          [F] REPAIR (+10)
        </Text>
      )}
    </group>
  );
}

// Helper for ZombieEngine to find nearest window
export function findNearestBarricade(x: number, z: number, barricades: Record<string, number>): string | null {
  const windows = [
    { id: "win_north", x: 0, z: -22 },
    { id: "win_south", x: 0, z: 22 },
    { id: "win_east", x: 22, z: 0 },
    { id: "win_west", x: -22, z: 0 },
  ];
  let best: string | null = null;
  let bestDist = Infinity;
  for (const w of windows) {
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < bestDist && (barricades[w.id] ?? 6) > 0) {
      bestDist = d;
      best = w.id;
    }
  }
  return bestDist < 4 ? best : null;
}
