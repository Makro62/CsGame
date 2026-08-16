import { useEffect, useRef, useState } from "react";
import { gameEvents } from "../../lib/gameEvents";
import { useGameStore } from "../../stores/useGameStore";

interface StaticTargetProps {
  id: string;
  position: [number, number, number];
  respawnTime?: number;
}

/**
 * Stationary practice dummy. Hit detection is driven by ShootingSystem's raycast,
 * which walks up the parent chain looking for `userData.targetId`.
 */
export function StaticTarget({ id, position, respawnTime = 1500 }: StaticTargetProps) {
  const [hp, setHp] = useState(100);
  const [isAlive, setIsAlive] = useState(true);
  const respawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const register = () =>
      useGameStore.getState().addTarget({
        id,
        x: position[0],
        y: position[1],
        z: position[2],
        hp: 100,
        maxHp: 100,
        isAlive: true,
      });

    register();

    const onDamage = (data: {
      id: string;
      damage: number;
      isHeadshot: boolean;
      isDead: boolean;
      newHp: number;
    }) => {
      if (data.id !== id) return;
      if (data.isDead) {
        setHp(0);
        setIsAlive(false);
      } else {
        setHp(data.newHp);
      }
    };

    gameEvents.on("targetDamaged", onDamage);

    return () => {
      gameEvents.off("targetDamaged", onDamage);
      useGameStore.getState().removeTarget(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, position[0], position[1], position[2]]);

  useEffect(() => {
    if (isAlive) return;

    respawnTimer.current = setTimeout(() => {
      setHp(100);
      setIsAlive(true);
      useGameStore.getState().addTarget({
        id,
        x: position[0],
        y: position[1],
        z: position[2],
        hp: 100,
        maxHp: 100,
        isAlive: true,
      });
    }, respawnTime);

    return () => {
      if (respawnTimer.current) clearTimeout(respawnTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlive, id, respawnTime, position[0], position[1], position[2]]);

  if (!isAlive) {
    return (
      <group position={position}>
        {/* Base plate stays put so the row still reads as a firing lane */}
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
          <meshStandardMaterial color="#1c2129" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} userData={{ targetId: id, isHead: false }}>
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
        <meshStandardMaterial color="#1c2129" roughness={0.9} />
      </mesh>

      {/* Post */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.12, 0.6, 0.12]} />
        <meshStandardMaterial color="#3f4753" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.05, 0]} castShadow userData={{ targetId: id, isHead: false }}>
        <boxGeometry args={[0.55, 0.8, 0.25]} />
        <meshStandardMaterial color="#f97316" roughness={0.75} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.68, 0]} castShadow userData={{ targetId: id, isHead: true }}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.7} />
      </mesh>

      {hp < 100 && (
        <group position={[0, 2.05, 0]}>
          <mesh>
            <planeGeometry args={[0.6, 0.07]} />
            <meshBasicMaterial color="#374151" />
          </mesh>
          <mesh position={[(hp / 100 - 1) * 0.3, 0, 0.002]}>
            <planeGeometry args={[(hp / 100) * 0.6, 0.07]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}
    </group>
  );
}
