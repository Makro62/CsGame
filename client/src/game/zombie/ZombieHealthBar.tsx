import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ZombieHealthBarProps {
  hp: number;
  maxHp: number;
  position: [number, number, number];
  type: string;
}

export function ZombieHealthBar({ hp, maxHp, position, type }: ZombieHealthBarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const isBoss = type === "boss";
  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 1;
  const visible = hp > 0 && (isBoss || hp < maxHp);
  const width = isBoss ? 1.8 : 0.72;

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.visible = visible;
    groupRef.current.quaternion.copy(camera.quaternion);
    if (fillRef.current) {
      fillRef.current.scale.x = Math.max(0.04, hpPercent);
      fillRef.current.position.x = -((1 - hpPercent) * width) / 2;
    }
  });

  return (
    <group ref={groupRef} position={position} visible={visible}>
      <mesh>
        <planeGeometry args={[width + 0.08, isBoss ? 0.16 : 0.1]} />
        <meshBasicMaterial color="#0b0f14" />
      </mesh>
      <mesh ref={fillRef} position={[0, 0, 0.01]}>
        <planeGeometry args={[width, isBoss ? 0.1 : 0.06]} />
        <meshBasicMaterial color={isBoss ? "#ef4444" : "#22c55e"} />
      </mesh>
    </group>
  );
}
