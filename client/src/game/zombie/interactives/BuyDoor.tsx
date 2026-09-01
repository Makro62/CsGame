import { useMemo } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useZombieStore } from "../../../stores/useZombieStore";

interface BuyDoorProps {
  doorId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  cost: number;
  toRoom?: string;
  size?: [number, number, number];
}

export function BuyDoor({
  doorId,
  position,
  rotation = [0, 0, 0],
  cost,
  toRoom,
  size = [4, 5, 0.2],
}: BuyDoorProps) {
  const points = useZombieStore((s) => s.player.points);
  const unlockedDoors = useZombieStore((s) => s.unlockedDoors);
  const unlockDoor = useZombieStore((s) => s.unlockDoor);

  const isUnlocked = unlockedDoors.includes(doorId);
  const handleInteract = useMemo(
    () => () => {
      if (!isUnlocked && points >= cost) unlockDoor(doorId, cost);
    },
    [isUnlocked, points, cost, doorId, unlockDoor],
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
        <boxGeometry args={size} />
        <meshStandardMaterial color={canAfford ? "#1e3a5f" : "#2a2a2a"} metalness={0.8} roughness={0.4} />
      </mesh>
      <Billboard position={[0, size[1] * 0.45, 0.25]}>
        <Text
          fontSize={0.4}
          color={canAfford ? "#22c55e" : "#ef4444"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          {`UNLOCK: ${cost} PTS [F]`}
        </Text>
        {toRoom ? (
          <Text position={[0, -0.5, 0]} fontSize={0.25} color="#94a3b8" anchorX="center">
            {toRoom}
          </Text>
        ) : null}
      </Billboard>
    </group>
  );
}
