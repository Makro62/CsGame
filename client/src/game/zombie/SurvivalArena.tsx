import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { SURVIVAL_DOORS, SURVIVAL_BARRICADES, getSurvivalObstacles } from "./survivalLayout";
import { BuyDoor } from "./interactives/BuyDoor";
import { BarricadeWindow } from "./interactives/BarricadeWindow";
import { useZombieStore } from "../../stores/useZombieStore";

const WALL_H = 3.2;
const CRATE_H = 1.15;
const BARREL_H = 1.0;

function makeYardTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  // Industrial concrete slab
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 0, 128, 128);

  // Subtle concrete texture noise
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const shade = Math.random() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)";
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, 2, 2);
  }

  // Grid / expansion joints
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Subtle inner highlight
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, 124, 124);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
}

function FlickeringNeonLight({ position, color = "#a0e8ff" }: { position: [number, number, number]; color?: string }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useEffect(() => {
    let raf = 0;
    const flicker = () => {
      if (lightRef.current) {
        lightRef.current.intensity = Math.random() > 0.08 ? 1.8 : 0.15;
      }
      raf = requestAnimationFrame(flicker);
    };
    flicker();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} distance={14} intensity={1.5} castShadow />
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function Catwalk() {
  return (
    <group>
      <RigidBody type="fixed" position={[0, 3, -10]} colliders={false}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[12, 0.2, 3]} />
          <meshStandardMaterial color="#2a3441" metalness={0.6} roughness={0.4} />
        </mesh>
        <CuboidCollider args={[6, 0.1, 1.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 1.5, -6]} rotation={[0, 0, 0]} colliders={false}>
        <mesh castShadow rotation={[Math.PI / 6, 0, 0]}>
          <boxGeometry args={[1.2, 3, 0.2]} />
          <meshStandardMaterial color="#3a4556" metalness={0.5} />
        </mesh>
        <CuboidCollider args={[0.6, 1.5, 0.2]} rotation={[Math.PI / 6, 0, 0]} />
      </RigidBody>
    </group>
  );
}

export function SurvivalArena() {
  const yard = useMemo(() => makeYardTexture(), []);
  const unlockedDoors = useZombieStore((s) => s.unlockedDoors);
  const obstacles = useMemo(() => getSurvivalObstacles(unlockedDoors), [unlockedDoors]);
  const wave = useZombieStore((s) => s.currentWave);
  const isHorde = wave > 0 && wave % 5 === 0;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial map={yard} roughness={0.7} metalness={0.1} />
      </mesh>

      {obstacles.map((obs, i) => {
        const w = obs.maxX - obs.minX;
        const d = obs.maxZ - obs.minZ;
        const cx = (obs.minX + obs.maxX) / 2;
        const cz = (obs.minZ + obs.maxZ) / 2;
        if (obs.kind === "barrel") {
          return (
            <mesh key={i} position={[cx, BARREL_H / 2, cz]} castShadow receiveShadow>
              <cylinderGeometry args={[w * 0.48, w * 0.52, BARREL_H, 12]} />
              <meshStandardMaterial color="#9a3412" roughness={0.4} metalness={0.35} />
            </mesh>
          );
        }
        const h = obs.kind === "crate" ? CRATE_H : WALL_H;
        const color = obs.kind === "crate" ? "#78350f" : "#334155";
        return (
          <mesh key={i} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={obs.kind === "crate" ? 0.75 : 0.5} metalness={obs.kind === "crate" ? 0.05 : 0.25} />
          </mesh>
        );
      })}

      {SURVIVAL_DOORS.map((d) => (
        <BuyDoor
          key={d.id}
          doorId={d.id}
          position={[d.x, d.h / 2, d.z]}
          rotation={[0, d.w < 1 ? Math.PI / 2 : 0, 0]}
          cost={d.cost}
          toRoom={d.toRoom}
          size={[Math.max(d.w, 3), d.h, 0.2]}
        />
      ))}

      {SURVIVAL_BARRICADES.map((b) => (
        <BarricadeWindow
          key={b.id}
          windowId={b.id}
          position={[b.x, 1.2, b.z]}
          rotation={[0, Math.abs(b.x) > Math.abs(b.z) ? Math.PI / 2 : 0, 0]}
          w={b.w}
          h={b.h}
        />
      ))}

      <Catwalk />

      {([[0, 22.8], [0, -22.8], [22.8, 0], [-22.8, 0]] as const).map(([x, z], i) => (
        <group key={`gate-${i}`}>
          <mesh position={[x + (z === 0 ? 0 : -3.5), 1.7, z + (x === 0 ? 0 : -3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[x + (z === 0 ? 0 : 3.5), 1.7, z + (x === 0 ? 0 : 3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Atmospheric Neon & Floodlights */}
      <FlickeringNeonLight position={[-10, 3, 8]} color={isHorde ? "#ff0000" : "#38bdf8"} />
      <FlickeringNeonLight position={[10, 3, -8]} color={isHorde ? "#ff0000" : "#f59e0b"} />

      {/* Main facility high-bay light */}
      <pointLight position={[0, 8, 0]} intensity={isHorde ? 1.8 : 2.5} distance={38} color={isHorde ? "#ef4444" : "#f1f5f9"} castShadow />

      {/* Perimeter bunker lights */}
      <pointLight position={[0, 4.5, 18]} intensity={1.2} distance={20} color="#bae6fd" />
      <pointLight position={[0, 4.5, -18]} intensity={1.2} distance={20} color="#bae6fd" />
      <pointLight position={[18, 4.5, 0]} intensity={1.2} distance={20} color="#bae6fd" />
      <pointLight position={[-18, 4.5, 0]} intensity={1.2} distance={20} color="#bae6fd" />

      <mesh position={[0, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.8, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.45} />
      </mesh>
      <mesh position={[8, 0.02, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 12]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
