import { useMemo } from "react";
import * as THREE from "three";
import { SURVIVAL_OBSTACLES } from "./survivalLayout";

const WALL_H = 3.2;
const CRATE_H = 1.15;
const BARREL_H = 1.0;

function makeYardTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a4530";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(28, 34, 22, 0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 62, 62);
  ctx.strokeStyle = "rgba(90, 110, 70, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(32, 60);
  ctx.moveTo(4, 32);
  ctx.lineTo(60, 32);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
}

export function SurvivalArena() {
  const yard = useMemo(() => makeYardTexture(), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#12160f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[46.4, 46.4]} />
        <meshStandardMaterial map={yard} roughness={0.9} />
      </mesh>

      {SURVIVAL_OBSTACLES.map((obs, i) => {
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
        const color = obs.kind === "crate" ? "#8b5a2b" : "#5c6570";
        return (
          <mesh key={i} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={color}
              roughness={obs.kind === "crate" ? 0.86 : 0.58}
              metalness={obs.kind === "crate" ? 0.04 : 0.18}
            />
          </mesh>
        );
      })}

      {/* Gate posts + spawn markers */}
      {([[0, 22.8], [0, -22.8], [22.8, 0], [-22.8, 0]] as const).map(([x, z], i) => (
        <group key={`gate-${i}`}>
          <mesh position={[x + (z === 0 ? 0 : -3.5), 1.7, z + (x === 0 ? 0 : -3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#3f4a52" metalness={0.25} roughness={0.5} />
          </mesh>
          <mesh position={[x + (z === 0 ? 0 : 3.5), 1.7, z + (x === 0 ? 0 : 3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#3f4a52" metalness={0.25} roughness={0.5} />
          </mesh>
          <mesh position={[x * 0.92, 0.06, z * 0.92]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.1, 1.55, 20]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.55} />
          </mesh>
        </group>
      ))}

      <pointLight position={[0, 10, 0]} intensity={1.35} distance={32} color="#d4c4a0" />
      <pointLight position={[-16, 5.5, -16]} intensity={0.7} distance={16} color="#9cbb7a" />
      <pointLight position={[16, 5.5, 16]} intensity={0.7} distance={16} color="#c4a878" />
    </group>
  );
}
