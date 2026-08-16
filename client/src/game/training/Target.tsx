import { useRef, useState, useEffect } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

interface TargetProps {
  id?: string;
  position: [number, number, number];
  onHit: (headshot: boolean) => void;
  respawnTime?: number;
}

export function Target({ id, position, onHit, respawnTime = 2000 }: TargetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isAlive, setIsAlive] = useState(true);
  const [hp, setHp] = useState(100);
  const respawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetId = id || `target_${position.join("_")}`;

  // Respawn logic
  useEffect(() => {
    if (!isAlive) {
      respawnTimer.current = setTimeout(() => {
        setIsAlive(true);
        setHp(100);
      }, respawnTime);
    }

    return () => {
      if (respawnTimer.current) {
        clearTimeout(respawnTimer.current);
      }
    };
  }, [isAlive, respawnTime]);

  // Animation
  useFrame(({ clock }) => {
    if (!groupRef.current || !isAlive) return;
    const time = clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.1;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isAlive) return;
    e.stopPropagation?.();

    // Check if headshot (click on top part)
    const point = e.point;
    const headY = position[1] + 1.4;
    const isHeadshot = point.y > headY - 0.2;

    const damage = isHeadshot ? 100 : 35;
    const newHp = hp - damage;

    if (newHp <= 0) {
      setIsAlive(false);
      setHp(0);
      onHit(isHeadshot);
    } else {
      setHp(newHp);
    }
  };

  if (!isAlive) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh
        position={[0, 1.4, 0]}
        onClick={handleClick}
        name="target-head"
        userData={{ targetId, isHead: true }}
      >
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>

      {/* Torso */}
      <mesh
        position={[0, 0.8, 0]}
        onClick={handleClick}
        name="target-torso"
        userData={{ targetId, isHead: false }}
      >
        <boxGeometry args={[0.5, 0.8, 0.3]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      {/* Legs */}
      <mesh position={[0, 0.2, 0]} userData={{ targetId, isHead: false }}>
        <boxGeometry args={[0.5, 0.4, 0.3]} />
        <meshStandardMaterial color="#991b1b" />
      </mesh>

      {/* HP Bar */}
      {hp < 100 && (
        <group position={[0, 2.2, 0]}>
          <mesh>
            <planeGeometry args={[0.6, 0.08]} />
            <meshBasicMaterial color="#374151" />
          </mesh>
          <mesh position={[(hp / 100 - 1) * 0.3, 0, 0.001]}>
            <planeGeometry args={[(hp / 100) * 0.6, 0.08]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}
    </group>
  );
}
