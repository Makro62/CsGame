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
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a1f2a";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(239,68,68,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 64, 64);
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
        <meshStandardMaterial color="#0f1115" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial map={yard} roughness={0.95} />
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
              <meshStandardMaterial color="#6b3a1a" roughness={0.55} metalness={0.22} />
            </mesh>
          );
        }
        const h = obs.kind === "crate" ? CRATE_H : WALL_H;
        const color = obs.kind === "crate" ? "#3d2817" : "#1c2333";
        return (
          <mesh key={i} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={obs.kind === "crate" ? 0.9 : 0.7} metalness={obs.kind === "crate" ? 0.05 : 0.15} />
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
            <meshStandardMaterial color="#1c2333" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[x + (z === 0 ? 0 : 3.5), 1.7, z + (x === 0 ? 0 : 3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#1c2333" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}

      <ambientLight intensity={isHorde ? 0.08 : 0.18} color={isHorde ? "#ff1a1a" : "#0a0f1e"} />
      <hemisphereLight intensity={isHorde ? 0.1 : 0.35} color={isHorde ? "#ff0000" : "#1e293b"} groundColor="#020208" />
      <FlickeringNeonLight position={[-10, 3, 8]} color={isHorde ? "#ff0000" : "#a0e8ff"} />
      <FlickeringNeonLight position={[10, 3, -8]} color={isHorde ? "#ff0000" : "#ffcc88"} />
      <pointLight position={[0, 8, 0]} intensity={isHorde ? 0.4 : 0.9} distance={28} color={isHorde ? "#ff0000" : "#1e3a5f"} castShadow />
      <mesh position={[0, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.8, 16]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.35} />
      </mesh>
      <mesh position={[8, 0.02, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 12]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
