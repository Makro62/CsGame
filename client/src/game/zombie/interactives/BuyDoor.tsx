import { useMemo } from "react";
import { Text } from "@react-three/drei";
import { useZombieStore } from "../../../stores/useZombieStore";

interface BuyDoorProps {
  doorId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  cost: number;
}

export function BuyDoor({ doorId, position, rotation = [0, 0, 0], cost }: BuyDoorProps) {
  const points = useZombieStore((s) => s.player.points);
  const unlockedDoors = useZombieStore((s) => s.unlockedDoors);
  const unlockDoor = useZombieStore((s) => s.unlockDoor);

  const isUnlocked = unlockedDoors.includes(doorId);
  const handleInteract = useMemo(
    () => () => {
      if (!isUnlocked && points >= cost) unlockDoor(doorId, cost);
    },
    [isUnlocked, points, cost, doorId, unlockDoor]
  );

  if (isUnlocked) return null;

  const canAfford = points >= cost;

  return (
    <group
      position={position}
      rotation={rotation}
      userData={{ interactiveType: "door", onInteract: handleInteract }}
    >
      <mesh castShadow>
        <boxGeometry args={[4, 5, 0.2]} />
        <meshStandardMaterial color={canAfford ? "#1e3a5f" : "#2a2a2a"} metalness={0.8} roughness={0.4} />
      </mesh>
      <Text
        position={[0, 2.8, 0.2]}
        fontSize={0.45}
        color={canAfford ? "#22c55e" : "#ef4444"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {`UNLOCK: ${cost} PTS [F]`}
      </Text>
    </group>
  );
}
