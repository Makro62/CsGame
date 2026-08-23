import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useL4DStore } from "../../stores/useL4DStore";

function SafeRoom({ position, isStart }: { position: [number, number, number]; isStart?: boolean }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.elapsedTime;
      pulseRef.current.material = pulseRef.current.material as THREE.MeshBasicMaterial;
      (pulseRef.current.material as unknown as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(t*2)*0.08;
    }
  });
  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color={isStart ? "#14532d" : "#1e3a8a"} roughness={0.9} />
      </mesh>
      {/* Walls safe room */}
      <mesh position={[0, 2, -7]}><boxGeometry args={[14,4,0.6]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh position={[-7,2,0]}><boxGeometry args={[0.6,4,14]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh position={[7,2,0]}><boxGeometry args={[0.6,4,14]} /><meshStandardMaterial color="#334155" /></mesh>
      {/* Door gate */}
      <mesh position={[0,1.5,7]}><boxGeometry args={[6,3,0.4]} /><meshStandardMaterial color={isStart ? "#22c55e" : "#f59e0b"} emissive={isStart ? "#22c55e" : "#f59e0b"} emissiveIntensity={0.6} /></mesh>
      {/* Light */}
      <pointLight position={[0,4,0]} intensity={1.5} distance={18} color={isStart ? "#4ade80" : "#fbbf24"} />
      <mesh ref={pulseRef} position={[0,0.1,0]} rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[5,5.6,32]} />
        <meshBasicMaterial color={isStart ? "#22c55e" : "#38bdf8"} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RescueVehicle({ position }: { position: [number, number, number] }) {
  const finale = useL4DStore(s=> s.finaleState);
  const arrived = useL4DStore(s=> s.rescueVehicleArrived);
  return (
    <group position={position}>
      <mesh position={[0,0.05,0]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color={arrived ? "#22c55e" : "#475569"} roughness={0.8} />
      </mesh>
      {/* Helicopter / Boat */}
      <group position={[0, 1.2, 0]}>
        <mesh><boxGeometry args={[6,1.4,3.5]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
        <mesh position={[0,0.9,0]}><cylinderGeometry args={[0.2,0.2,7,8]} /><meshStandardMaterial color="#334155" /></mesh>
        {arrived && <pointLight intensity={2.5} distance={30} color="#4ade80" />}
      </group>
      <mesh position={[0,0.12,0]} rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[8.2,8.7,32]} />
        <meshBasicMaterial color={finale==="holdout" ? "#f59e0b" : finale==="escape" ? "#22c55e" : "#38bdf8"} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Corridor({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const mid: [number, number, number] = [(from[0]+to[0])/2, 0, (from[2]+to[2])/2];
  const len = Math.hypot(to[0]-from[0], to[2]-from[2]);
  const ang = Math.atan2(to[0]-from[0], to[2]-from[2]);
  return (
    <group position={mid} rotation={[0, ang, 0]}>
      <mesh position={[0,0.015,0]}><boxGeometry args={[6, 0.03, len]} /><meshStandardMaterial color="#2a3a2a" /></mesh>
      <mesh position={[-3.2,1.5,0]}><boxGeometry args={[0.4,3, len]} /><meshStandardMaterial color="#1f2937" /></mesh>
      <mesh position={[3.2,1.5,0]}><boxGeometry args={[0.4,3, len]} /><meshStandardMaterial color="#1f2937" /></mesh>
      {/* debris */}
      <mesh position={[1.2,0.3, len*0.2]}><boxGeometry args={[0.8,0.6,0.8]} /><meshStandardMaterial color="#57534e" /></mesh>
      <mesh position={[-1.0,0.25, -len*0.15]}><boxGeometry args={[1.1,0.5,0.7]} /><meshStandardMaterial color="#44403c" /></mesh>
    </group>
  );
}

export function L4DCampaignMap() {
  // Chapter layout START safeRoom -> 3 corridors -> FINALE rescue
  // All chapters share same modular layout but different lengths for progression feel
  const chapter = useL4DStore(s=> s.chapter);
  const lenScale = chapter===1? 1 : chapter===2? 1.15 : chapter===3? 1.35 : 1.5;
  const start: [number, number, number] = [0,0,-36];
  const cp1: [number, number, number] = [0,0,-18*lenScale];
  const cp2: [number, number, number] = [8*lenScale,0,0];
  const cp3: [number, number, number] = [0,0,18*lenScale];
  const finale: [number, number, number] = [0,0,36*lenScale];

  return (
    <group>
      {/* Ground large */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#0f1a0f" />
      </mesh>
      <SafeRoom position={start} isStart />
      <Corridor from={start} to={cp1} />
      <mesh position={[cp1[0],0.02,cp1[2]]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[12,12]} /><meshStandardMaterial color="#1c2a1c" />
      </mesh>
      <Corridor from={cp1} to={cp2} />
      <mesh position={[cp2[0],0.02,cp2[2]]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[6, 16]} /><meshStandardMaterial color="#1c2a1c" />
      </mesh>
      <Corridor from={cp2} to={cp3} />
      <mesh position={[cp3[0],0.02,cp3[2]]} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[14,14]} /><meshStandardMaterial color="#1c2a1c" />
      </mesh>
      <Corridor from={cp3} to={finale} />
      <RescueVehicle position={finale} />

      {/* Crescendo event props */}
      <group position={[cp2[0],0,cp2[2]]}>
        <mesh position={[0,1.5,0]}><boxGeometry args={[2.5,3,0.4]} /><meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.7} /></mesh>
        <pointLight position={[0,3,0]} intensity={1.2} distance={12} color="#ef4444" />
      </group>

      {/* Fog */}
      <fog attach="fog" args={["#0a1410", 35, 95]} />
    </group>
  );
}
