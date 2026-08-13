import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useNetworkStore } from "../../stores/useNetworkStore";

const CULL_DISTANCE = 60;
const lerpVec3 = new THREE.Vector3();

function RemotePlayer({
  x,
  y,
  z,
  rotationY,
  team,
  nickname,
  hp,
  isDead,
  localX,
  localZ,
  isSprinting,
  isCrouching,
}: {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  team: string;
  nickname: string;
  hp: number;
  isDead: boolean;
  localX: number;
  localZ: number;
  isSprinting: boolean;
  isCrouching: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(x, y, z));
  const targetPos = useRef(new THREE.Vector3(x, y, z));
  const deathY = useRef(0);
  const swayRef = useRef({ x: 0, y: 0 });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const distSq =
      (x - localX) * (x - localX) + (z - localZ) * (z - localZ);
    groupRef.current.visible = distSq < CULL_DISTANCE * CULL_DISTANCE;

    targetPos.current.set(x, y, z);
    lerpVec3.copy(currentPos.current).lerp(targetPos.current, 0.3);
    currentPos.current.copy(lerpVec3);
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = rotationY;

    // Death fall animation (lerp towards ground, stays as corpse briefly)
    if (isDead) {
      deathY.current = Math.min(deathY.current + 0.05, 0.5);
      groupRef.current.position.y = y - deathY.current;
      groupRef.current.rotation.z = -Math.PI / 2.2;
    } else {
      deathY.current = 0;
      groupRef.current.rotation.z = 0;
      // Crouch: lower the character visually
      groupRef.current.scale.y = isCrouching ? 0.7 : 1;
    }

    // Weapon sway/bob for remote players
    if (weaponRef.current && !isDead) {
      const time = clock.getElapsedTime();
      const moveIntensity = isSprinting ? 1.5 : 1.0;
      
      // Sway
      const targetSwayX = Math.sin(time * 1.5) * 0.003 * moveIntensity;
      const targetSwayY = Math.sin(time * 2) * 0.0015 * moveIntensity;
      swayRef.current.x += (targetSwayX - swayRef.current.x) * 0.1;
      swayRef.current.y += (targetSwayY - swayRef.current.y) * 0.1;

      // Bob during sprint
      const sprintBob = isSprinting ? Math.sin(time * 8) * 0.008 : 0;
      const sprintBobY = isSprinting ? Math.abs(Math.sin(time * 8)) * 0.005 : 0;

      weaponRef.current.position.set(
        0.28 + swayRef.current.x + sprintBob,
        -0.28 + swayRef.current.y + sprintBobY,
        -0.45
      );
    }
  });

  const color = team === "CT" ? "#2f6fe4" : "#e4562f";
  const hpColor = hp > 60 ? "#4ade80" : hp > 25 ? "#fbbf24" : "#ef4444";

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {/* Legs */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.3]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Weapon model (simplified box) */}
      {!isDead && (
        <group ref={weaponRef} position={[0.28, -0.28, -0.45]}>
          <mesh>
            <boxGeometry args={[0.04, 0.04, 0.3]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          {/* Barrel */}
          <mesh position={[0, 0, -0.2]}>
            <boxGeometry args={[0.02, 0.02, 0.15]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      )}

      {!isDead && (
        <group position={[0, 2.05, 0]}>
          {/* Name tag */}
          <sprite scale={[1.6, 0.35, 1]}>
            <spriteMaterial
              map={makeTextTexture(nickname, team)}
              transparent
              depthTest={false}
              depthWrite={false}
            />
          </sprite>
          {/* HP bar */}
          <group position={[0, -0.35, 0]}>
            <mesh position={[0, 0, 0]} renderOrder={1}>
              <planeGeometry args={[1.4, 0.12]} />
              <meshBasicMaterial color="rgba(0,0,0,0.6)" transparent depthTest={false} depthWrite={false} />
            </mesh>
            <mesh position={[(-(1 - hp / 100) * 1.3) / 2, 0, 0.001]} renderOrder={2}>
              <planeGeometry args={[Math.max(0.001, (hp / 100) * 1.3), 0.08]} />
              <meshBasicMaterial color={hpColor} transparent depthTest={false} depthWrite={false} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}

// Cache nametag textures per nickname+team
const textureCache = new Map<string, THREE.Texture>();

function makeTextTexture(text: string, team: string): THREE.Texture {
  const key = `${team}:${text}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 4;
    ctx.strokeText(text, 128, 32);
    ctx.fillStyle = team === "CT" ? "#93c5fd" : "#fca5a5";
    ctx.fillText(text, 128, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

export function RemotePlayers() {
  const remotePlayers = useNetworkStore((s) => s.remotePlayers);
  const localX = useNetworkStore((s) => s.localX);
  const localZ = useNetworkStore((s) => s.localZ);

  return (
    <group>
      {Array.from(remotePlayers.entries()).map(([id, player]) => (
        <RemotePlayer
          key={id}
          x={player.x}
          y={player.y}
          z={player.z}
          rotationY={player.rotationY}
          team={player.team}
          nickname={player.nickname}
          hp={player.hp}
          isDead={player.isDead}
          localX={localX}
          localZ={localZ}
          isSprinting={player.isSprinting}
          isCrouching={player.isCrouching}
        />
      ))}
    </group>
  );
}