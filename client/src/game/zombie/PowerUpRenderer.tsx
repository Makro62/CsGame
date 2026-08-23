import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PowerUpType } from "../../stores/useZombieStore";

const COLORS: Record<PowerUpType, string> = {
  max_ammo: "#FFD700", insta_kill: "#FF0000", double_points: "#00FF00",
  nuke: "#FFA500", speed_cola: "#00CED1", juggernog: "#FF1493",
};

export function PowerUpRenderer({ type, x, z }: { id: string; type: PowerUpType; x: number; z: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = 0.5 + Math.sin(t*3)*0.2;
    meshRef.current.rotation.y = t*2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={COLORS[type]} emissive={COLORS[type]} emissiveIntensity={0.5} transparent opacity={0.9} />
      </mesh>
      <pointLight color={COLORS[type]} intensity={2} distance={5} />
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial color={COLORS[type]} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Batch renderer for all powerUps from store
import { useZombieStore } from "../../stores/useZombieStore";

export function PowerUpBatch({ onCollect }: { onCollect?: (id: string) => void }) {
  const powerUps = useZombieStore(s => s.powerUps);
  // auto collect when player near (handled in ZombieEngine via proximity, but also click)
  return (
    <group>
      {powerUps.map(p => (
        <group key={p.id} position={[p.x, 0, p.z]} onClick={() => onCollect?.(p.id)}>
          <PowerUpRenderer id={p.id} type={p.type} x={0} z={0} />
        </group>
      ))}
    </group>
  );
}
