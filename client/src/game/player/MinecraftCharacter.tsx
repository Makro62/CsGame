import { useRef, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCharacterLook } from "./characterLooks";
import { CharacterGear } from "./CharacterGear";

// ============================================================================
// Face Texture (Canvas-based, no external images)
// ============================================================================

function createFaceTexture(team: string, accent?: string, skin = "#d4a574"): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // Skin color
  ctx.fillStyle = skin;
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
  ctx.fillStyle = accent ?? (team === "T" ? "#8b0000" : "#1e3a8a");
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

function createHelmetTexture(team: string, accent?: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  // Helmet base
  ctx.fillStyle = team === "T" ? "#1c1917" : "#111827";
  ctx.fillRect(0, 0, 64, 64);

  // Visor line
  ctx.fillStyle = accent ?? (team === "T" ? "#b91c1c" : "#1e3a8a");
  ctx.fillRect(0, 32, 64, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// ============================================================================
// Minecraft-style Weapon Meshes
// ============================================================================

function MinecraftRifle({ team }: { team: string }) {
  const metal = team === "T" ? "#2d2d2d" : "#1a1a1a";
  const wood = team === "T" ? "#6b3d1f" : "#5c3518";
  return (
    <group position={[0, 0, 0]} rotation={[0.1, 0, 0]}>
      {/* Receiver body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.045, 0.055, 0.2]} />
        <meshStandardMaterial color={metal} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Barrel */}
      <mesh position={[0, 0.005, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.18, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Muzzle */}
      <mesh position={[0, 0.005, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Handguard - wood */}
      <mesh position={[0, -0.008, -0.1]}>
        <boxGeometry args={[0.04, 0.03, 0.12]} />
        <meshStandardMaterial color={wood} roughness={0.75} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.05, 0.03]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.03, 0.05, 0.04]} />
        <meshStandardMaterial color={metal} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Stock */}
      <mesh position={[0, 0, 0.15]}>
        <boxGeometry args={[0.038, 0.04, 0.1]} />
        <meshStandardMaterial color={wood} roughness={0.75} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.05, 0.08]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.025, 0.06, 0.025]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {/* Sight - front post */}
      <mesh position={[0, 0.035, -0.16]}>
        <boxGeometry args={[0.003, 0.012, 0.003]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Sight - rear notch */}
      <mesh position={[0, 0.032, 0.06]}>
        <boxGeometry args={[0.018, 0.008, 0.008]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}

function MinecraftPistol({ team }: { team: string }) {
  const metal = team === "T" ? "#1e293b" : "#111827";
  return (
    <group position={[0.01, -0.01, 0]} rotation={[0.15, 0, 0]}>
      {/* Slide */}
      <mesh position={[0, 0.012, 0]}>
        <boxGeometry args={[0.032, 0.04, 0.12]} />
        <meshStandardMaterial color={metal} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Barrel tip */}
      <mesh position={[0, 0.012, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.03, 8]} />
        <meshStandardMaterial color="#111" metalness={0.85} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, -0.015, 0.01]}>
        <boxGeometry args={[0.03, 0.02, 0.1]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.06, 0.04]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.028, 0.06, 0.028]} />
        <meshStandardMaterial color="#1c1917" roughness={0.7} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.032, 0.03]}>
        <boxGeometry args={[0.026, 0.012, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
      {/* Magazine */}
      <mesh position={[0, -0.075, 0.04]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.022, 0.04, 0.022]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.038, -0.05]}>
        <boxGeometry args={[0.004, 0.008, 0.004]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function MinecraftKnife() {
  return (
    <group position={[0, 0, 0]} rotation={[0.1, 0, 0]}>
      {/* Blade */}
      <mesh position={[0, 0.005, -0.08]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.008, 0.035, 0.1]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Blade edge */}
      <mesh position={[0, -0.012, -0.08]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.004, 0.008, 0.1]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Guard */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[0.028, 0.012, 0.008]} />
        <meshStandardMaterial color="#8b4513" roughness={0.6} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.018, 0.028, 0.08]} />
        <meshStandardMaterial color="#5c3518" roughness={0.7} />
      </mesh>
      {/* Handle rivets */}
      <mesh position={[0.01, 0, 0.03]}>
        <sphereGeometry args={[0.003, 6, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
      <mesh position={[-0.01, 0, 0.05]}>
        <sphereGeometry args={[0.003, 6, 6]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>
    </group>
  );
}

function MinecraftWeapon({ weaponType, team }: { weaponType: string; team: string }) {
  if (weaponType === "knife") return <MinecraftKnife />;
  if (weaponType === "pistol") return <MinecraftPistol team={team} />;
  return <MinecraftRifle team={team} />;
}

function MuzzleFlash({ until }: { until: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = Date.now() < until;
  });
  return (
    <group ref={ref} position={[0, 0.01, -0.32]} visible={false}>
      <mesh>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color="#ffe08a" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 8]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.85} />
      </mesh>
    </group>
  );
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
  weaponType?: "rifle" | "pistol" | "knife";
  weaponScale?: number;
  muzzleUntil?: number;
  motionRef?: MutableRefObject<{ moving: boolean; sprinting: boolean }>;
  playerId?: string;
  heroColor?: string;
  heroAccent?: string;
  bodyStyle?: string;
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
  weaponType = "rifle",
  weaponScale = 1,
  muzzleUntil = 0,
  motionRef,
  playerId,
  heroColor,
  heroAccent,
  bodyStyle,
}: MinecraftCharacterProps) {
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const look = getCharacterLook(bodyStyle);
  const faceTexture = useMemo(() => createFaceTexture(team, heroAccent, look.skin), [team, heroAccent, look.skin]);
  const helmetTexture = useMemo(() => createHelmetTexture(team, heroAccent), [team, heroAccent]);

  const shirtColor = heroColor ?? (team === "T" ? "#b91c1c" : "#1e3a8a");
  const vestColor = heroAccent ?? (team === "T" ? "#7f1d1d" : "#1e3a8a");
  const pantsColor = look.pants;
  const skinColor = look.skin;
  const shoeColor = look.shoes;
  const beltColor = team === "T" ? "#3f2a1a" : "#0f172a";
  const [torsoW, torsoH, torsoD] = look.torso;
  const [vestW, vestH, vestD] = look.vest;
  const armW = look.armW;
  const legW = look.legW;

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
    const firing = Date.now() < muzzleUntil;
    const aimPose = holdWeapon ? (firing ? -1.35 : -1.15) : 0;

    if ((moving || sprinting) && !firing) {
      const time = performance.now() / 1000;
      const swing = Math.sin(time * speed) * amplitude;

      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = holdWeapon ? aimPose : -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      if (leftArmRef.current) leftArmRef.current.rotation.x = firing ? 0.25 : 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = aimPose;
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
    <group ref={bodyRef} scale={look.scale}>
      <CharacterGear
        look={look}
        accent={heroAccent ?? vestColor}
        armor={shirtColor}
        opacity={opacity}
        helmetTex={helmetTexture}
        faceTex={faceTexture}
      />

      <mesh position={[0, 1.22, 0]} castShadow userData={playerId ? { playerId, isHead: true } : undefined}>
        <cylinderGeometry args={[0.06, 0.07, 0.08, 8]} />
        <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
      </mesh>

      <mesh position={[0, 0.82, 0]} castShadow userData={playerId ? { playerId, isHead: false } : undefined}>
        <boxGeometry args={[torsoW, torsoH, torsoD]} />
        <meshStandardMaterial color={shirtColor} emissive={shirtColor} emissiveIntensity={0.1} opacity={opacity} transparent />
      </mesh>

      <mesh position={[0, 0.84, 0.01]} castShadow>
        <boxGeometry args={[vestW, vestH, vestD]} />
        <meshStandardMaterial color={vestColor} roughness={0.65} metalness={0.12} opacity={opacity} transparent />
      </mesh>
      <mesh position={[-torsoW * 0.22, 0.72, vestD * 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.04]} />
        <meshStandardMaterial color={beltColor} opacity={opacity} transparent />
      </mesh>
      <mesh position={[torsoW * 0.22, 0.72, vestD * 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.04]} />
        <meshStandardMaterial color={beltColor} opacity={opacity} transparent />
      </mesh>
      <mesh position={[0, 1.0, -torsoD * 0.45]}>
        <boxGeometry args={[0.2, 0.06, 0.02]} />
        <meshStandardMaterial color={heroAccent ?? vestColor} roughness={0.5} opacity={opacity} transparent />
      </mesh>

      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[torsoW + 0.02, 0.06, torsoD + 0.02]} />
        <meshStandardMaterial color={beltColor} roughness={0.7} opacity={opacity} transparent />
      </mesh>

      <group ref={leftArmRef} position={[-look.shoulder, 1.12, 0]}>
        <mesh position={[0, -0.04, 0]} castShadow>
          <boxGeometry args={[armW + 0.02, 0.1, armW + 0.02]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[armW, 0.22, armW]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.44, 0]} castShadow>
          <boxGeometry args={[armW - 0.01, 0.26, armW - 0.01]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.65, 0]} castShadow>
          <boxGeometry args={[armW - 0.02, 0.12, armW - 0.02]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[look.shoulder, 1.12, 0]}>
        <mesh position={[0, -0.04, 0]} castShadow>
          <boxGeometry args={[armW + 0.02, 0.1, armW + 0.02]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[armW, 0.22, armW]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.44, 0]} castShadow>
          <boxGeometry args={[armW - 0.01, 0.26, armW - 0.01]} />
          <meshStandardMaterial color={shirtColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.65, 0]} castShadow>
          <boxGeometry args={[armW - 0.02, 0.12, armW - 0.02]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
        {holdWeapon && (
          <group position={[0, -0.68, -0.02]} scale={weaponScale}>
            <MinecraftWeapon weaponType={weaponType} team={team} />
            <MuzzleFlash until={muzzleUntil} />
          </group>
        )}
      </group>

      <group ref={leftLegRef} position={[-legW * 0.55, 0.38, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[legW, 0.32, legW]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.46, 0]} castShadow>
          <boxGeometry args={[legW - 0.01, 0.28, legW - 0.01]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.64, 0.02]} castShadow>
          <boxGeometry args={[legW + 0.02, 0.08, legW + 0.06]} />
          <meshStandardMaterial color={shoeColor} opacity={opacity} transparent />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[legW * 0.55, 0.38, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <boxGeometry args={[legW, 0.32, legW]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.46, 0]} castShadow>
          <boxGeometry args={[legW - 0.01, 0.28, legW - 0.01]} />
          <meshStandardMaterial color={pantsColor} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.64, 0.02]} castShadow>
          <boxGeometry args={[legW + 0.02, 0.08, legW + 0.06]} />
          <meshStandardMaterial color={shoeColor} opacity={opacity} transparent />
        </mesh>
      </group>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28 + look.scale * 0.12, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
