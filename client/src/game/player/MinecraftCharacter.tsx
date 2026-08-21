import { useRef, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// Face Texture (Canvas-based, no external images)
// ============================================================================

function createFaceTexture(team: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // Skin color
  ctx.fillStyle = "#d4a574";
  ctx.fillRect(0, 0, 64, 64);

  // Eyes (white)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(16, 24, 12, 10);
  ctx.fillRect(36, 24, 12, 10);

  // Pupils
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(20, 26, 6, 6);
  ctx.fillRect(40, 26, 6, 6);

  // Eyebrows
  ctx.fillStyle = team === "T" ? "#8b0000" : "#1e3a8a";
  ctx.fillRect(14, 20, 16, 3);
  ctx.fillRect(34, 20, 16, 3);

  // Mouth
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(24, 42, 16, 6);

  // Nose
  ctx.fillStyle = "#c49a6c";
  ctx.fillRect(28, 34, 8, 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function createHelmetTexture(team: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // Helmet base
  ctx.fillStyle = team === "T" ? "#1c1917" : "#111827";
  ctx.fillRect(0, 0, 64, 64);

  // Visor line
  ctx.fillStyle = team === "T" ? "#b91c1c" : "#1e3a8a";
  ctx.fillRect(0, 32, 64, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// ============================================================================
// Minecraft Character Props
// ============================================================================

interface MinecraftCharacterProps {
  team: "T" | "CT" | string;
  isSprinting?: boolean;
  isCrouching?: boolean;
  isJumping?: boolean;
  isDead?: boolean;
  limbSwingSpeed?: number;
  holdWeapon?: boolean;
  motionRef?: MutableRefObject<{ moving: boolean; sprinting: boolean }>;
}

// ============================================================================
// Minecraft Character Component
// ============================================================================

export function MinecraftCharacter({
  team,
  isSprinting = false,
  isCrouching = false,
  isJumping: _isJumping = false,
  isDead = false,
  limbSwingSpeed = 0,
  holdWeapon = false,
  motionRef,
}: MinecraftCharacterProps) {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  // Create textures once
  const faceTexture = useMemo(() => createFaceTexture(team), [team]);
  const helmetTexture = useMemo(() => createHelmetTexture(team), [team]);

  // Team colors
  const shirtColor = team === "T" ? "#b91c1c" : "#1e3a8a";
  const pantsColor = team === "T" ? "#4b5563" : "#374151";
  const skinColor = "#d4a574";
  const shoeColor = team === "T" ? "#1c1917" : "#111827";

  // Animation
  useFrame(() => {
    if (isDead) {
      // Ragdoll - arms and legs dangle
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.3;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.2;
      return;
    }

    const sprinting = motionRef?.current.sprinting ?? isSprinting;
    const moving = motionRef?.current.moving ?? limbSwingSpeed > 0;
    const speed = limbSwingSpeed > 0 ? limbSwingSpeed : sprinting ? 10 : 6;
    const amplitude = isCrouching ? 0.4 : sprinting ? 0.8 : 0.5;

    if (moving || sprinting) {
      const time = performance.now() / 1000;
      const swing = Math.sin(time * speed) * amplitude;

      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = holdWeapon ? -1.15 : -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = holdWeapon ? -1.15 : 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }

    // Crouch - lower body
    if (bodyRef.current) {
      const targetY = isCrouching ? -0.2 : 0;
      bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetY, 0.15);
    }
  });

  const opacity = isDead ? 0.6 : 1;

  return (
    <group ref={bodyRef}>
      {/* ── Head ── */}
      <group position={[0, 1.45, 0]}>
        {/* Helmet */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <boxGeometry args={[0.40, 0.40, 0.40]} />
          <meshStandardMaterial map={helmetTexture} opacity={opacity} transparent />
        </mesh>
        {/* Face */}
        <mesh position={[0, -0.02, 0.211]} castShadow>
          <planeGeometry args={[0.36, 0.36]} />
          <meshStandardMaterial map={faceTexture} opacity={opacity} transparent />
        </mesh>
      </group>

      {/* ── Torso ── */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.3]} />
        <meshStandardMaterial color={shirtColor} emissive={shirtColor} emissiveIntensity={0.15} opacity={opacity} transparent />
      </mesh>

      {/* ── Left Arm ── */}
      <group ref={leftArmRef} position={[-0.35, 1.1, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.72, 0]} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
      </group>

      {/* ── Right Arm ── */}
      <group ref={rightArmRef} position={[0.35, 1.1, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.72, 0]} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
      </group>

      {/* ── Left Leg ── */}
      <group ref={leftLegRef} position={[-0.12, 0.4, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.72, 0.03]} castShadow>
          <boxGeometry args={[0.24, 0.1, 0.28]} />
          <meshStandardMaterial color={shoeColor} opacity={opacity} transparent />
        </mesh>
      </group>

      {/* ── Right Leg ── */}
      <group ref={rightLegRef} position={[0.12, 0.4, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[0.22, 0.7, 0.22]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.72, 0.03]} castShadow>
          <boxGeometry args={[0.24, 0.1, 0.28]} />
          <meshStandardMaterial color={shoeColor} opacity={opacity} transparent />
        </mesh>
      </group>
    </group>
  );
}

export default MinecraftCharacter;
