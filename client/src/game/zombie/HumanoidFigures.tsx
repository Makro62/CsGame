import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SpecialType } from "../../stores/useL4DStore";

let _zombieFace: THREE.Texture | null = null;
export function createZombieFaceTexture(): THREE.Texture {
  if (_zombieFace) return _zombieFace;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#6d7a48";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#4a5530";
  ctx.fillRect(0, 0, 64, 10);
  ctx.fillStyle = "#2a1a10";
  ctx.fillRect(14, 22, 14, 10);
  ctx.fillRect(36, 22, 14, 10);
  ctx.fillStyle = "#ff2222";
  ctx.fillRect(18, 25, 6, 5);
  ctx.fillRect(40, 25, 6, 5);
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(22, 42, 20, 7);
  ctx.fillStyle = "#8a9a55";
  ctx.fillRect(8, 8, 6, 8);
  ctx.fillRect(50, 12, 5, 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  _zombieFace = tex;
  return tex;
}

const INFECTED_LOOK: Record<SpecialType, { shirt: string; pants: string; skin: string; scale: number; fat: number; crouch: number }> = {
  common: { shirt: "#4a6741", pants: "#2f3a28", skin: "#7a8f4a", scale: 1, fat: 1, crouch: 0 },
  hunter: { shirt: "#1e3a5f", pants: "#0f172a", skin: "#6a7a4a", scale: 0.95, fat: 0.9, crouch: 0.22 },
  smoker: { shirt: "#3f6212", pants: "#1a2e05", skin: "#8aaa5a", scale: 1.02, fat: 0.82, crouch: 0 },
  boomer: { shirt: "#a16207", pants: "#713f12", skin: "#c4b05a", scale: 1.08, fat: 1.55, crouch: 0.06 },
  tank: { shirt: "#44403c", pants: "#1c1917", skin: "#78716c", scale: 1.55, fat: 1.35, crouch: 0 },
  witch: { shirt: "#f5f5f4", pants: "#e7e5e4", skin: "#fafafa", scale: 0.92, fat: 0.85, crouch: 0.08 },
};

export function InfectedFigure({
  type,
  infectedId,
  attacking = false,
  moving = true,
}: {
  type: SpecialType;
  infectedId: string;
  attacking?: boolean;
  moving?: boolean;
}) {
  const look = INFECTED_LOOK[type];
  const face = useMemo(() => createZombieFaceTexture(), []);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const seed = useMemo(() => infectedId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 0.017, [infectedId]);
  const ud = { infectedId, isHead: false };
  const udHead = { infectedId, isHead: true };

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (attacking ? 10 : 7.2) + seed;
    const amp = attacking ? 0.7 : moving ? 0.55 : 0.08;
    const swing = Math.sin(t) * amp;
    if (leftArm.current) leftArm.current.rotation.x = type === "hunter" ? 1.1 + swing * 0.2 : swing;
    if (rightArm.current) {
      rightArm.current.rotation.x = type === "smoker" ? 0.9 : type === "hunter" ? 1.1 - swing * 0.2 : -swing;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = moving && !attacking ? -swing : 0.08;
    if (rightLeg.current) rightLeg.current.rotation.x = moving && !attacking ? swing : 0.08;
  });

  const s = look.scale;
  const fat = look.fat;
  const y0 = -look.crouch;

  return (
    <group scale={[s, s, s]} position={[0, y0, 0]} userData={ud}>
      <group position={[0, 1.42, 0]} userData={udHead}>
        <mesh castShadow userData={udHead}>
          <boxGeometry args={[0.34, 0.34, 0.34]} />
          <meshStandardMaterial color={look.skin} roughness={0.72} />
        </mesh>
        <mesh position={[0, -0.01, 0.175]} userData={udHead}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshStandardMaterial map={face} roughness={0.8} />
        </mesh>
        {type === "witch" && (
          <mesh position={[0, 0.22, -0.04]} userData={udHead}>
            <boxGeometry args={[0.38, 0.18, 0.42]} />
            <meshStandardMaterial color="#fafafa" />
          </mesh>
        )}
        {type === "tank" && (
          <mesh position={[0, 0.12, 0]} userData={udHead}>
            <boxGeometry args={[0.42, 0.16, 0.38]} />
            <meshStandardMaterial color="#292524" />
          </mesh>
        )}
      </group>

      <mesh position={[0, 0.82, 0]} castShadow userData={ud}>
        <boxGeometry args={[0.48 * fat, 0.72, 0.28 * fat]} />
        <meshStandardMaterial color={look.shirt} roughness={0.78} />
      </mesh>

      <group ref={leftArm} position={[-0.28 * fat - 0.08, 1.08, 0]}>
        <mesh position={[0, -0.32, 0]} castShadow userData={ud}>
          <boxGeometry args={[0.16, 0.64, 0.16]} />
          <meshStandardMaterial color={look.shirt} roughness={0.75} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.28 * fat + 0.08, 1.08, type === "smoker" ? 0.08 : 0]}>
        <mesh position={[0, type === "smoker" ? -0.42 : -0.32, 0]} castShadow userData={ud}>
          <boxGeometry args={[0.16, type === "smoker" ? 0.85 : 0.64, 0.16]} />
          <meshStandardMaterial color={look.shirt} roughness={0.75} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.12, 0.42, 0]}>
        <mesh position={[0, -0.32, 0]} castShadow userData={ud}>
          <boxGeometry args={[0.2, 0.64, 0.2]} />
          <meshStandardMaterial color={look.pants} roughness={0.82} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.12, 0.42, 0]}>
        <mesh position={[0, -0.32, 0]} castShadow userData={ud}>
          <boxGeometry args={[0.2, 0.64, 0.2]} />
          <meshStandardMaterial color={look.pants} roughness={0.82} />
        </mesh>
      </group>
    </group>
  );
}
