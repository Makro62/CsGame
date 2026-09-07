import { useRef, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCharacterLook } from "./characterLooks";
import { CharacterGear } from "./CharacterGear";
import {
  SharedThirdPersonWeaponMesh,
} from "../weapons/weaponGeometries";
import {
  BLOCKY_WEAPON_ATTACH,
  THIRD_PERSON_ARM_POSES,
  weaponCategoryFromType,
  weaponCategoryFromId,
} from "./thirdPersonWeaponRig";

function createFaceTexture(team: string, accent?: string, skin = "#d4a574"): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(16, 24, 12, 10);
  ctx.fillRect(36, 24, 12, 10);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(20, 26, 6, 6);
  ctx.fillRect(40, 26, 6, 6);
  ctx.fillStyle = accent ?? (team === "T" ? "#8b0000" : "#1e3a8a");
  ctx.fillRect(14, 20, 16, 3);
  ctx.fillRect(34, 20, 16, 3);
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(24, 42, 16, 6);
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

  ctx.fillStyle = team === "T" ? "#1c1917" : "#111827";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = accent ?? (team === "T" ? "#b91c1c" : "#1e3a8a");
  ctx.fillRect(0, 32, 64, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

interface MinecraftCharacterProps {
  team: "T" | "CT" | string;
  isSprinting?: boolean;
  isCrouching?: boolean;
  isJumping?: boolean;
  isDead?: boolean;
  limbSwingSpeed?: number;
  holdWeapon?: boolean;
  weaponType?: "rifle" | "pistol" | "knife";
  currentWeapon?: string | null;
  weaponScale?: number;
  muzzleUntil?: number;
  motionRef?: MutableRefObject<{ moving: boolean; sprinting: boolean }>;
  playerId?: string;
  heroColor?: string;
  heroAccent?: string;
  bodyStyle?: string;
}

export function MinecraftCharacter({
  team,
  isSprinting = false,
  isCrouching = false,
  isJumping: _isJumping = false,
  isDead = false,
  limbSwingSpeed = 0,
  holdWeapon = false,
  weaponType = "rifle",
  currentWeapon,
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
  const category = currentWeapon ? weaponCategoryFromId(currentWeapon) : weaponCategoryFromType(weaponType);
  const armPose = THIRD_PERSON_ARM_POSES[category];
  const weaponAttach = BLOCKY_WEAPON_ATTACH[category];

  const faceTexture = useMemo(() => createFaceTexture(team, heroAccent, look.skin), [team, heroAccent, look.skin]);
  const helmetTexture = useMemo(() => createHelmetTexture(team, heroAccent), [team, heroAccent]);

  const shirtColor = heroColor ?? (team === "T" ? "#b91c1c" : "#1e3a8a");
  const vestColor = heroAccent ?? (team === "T" ? "#7f1d1d" : "#1e3a8a");
  const pantsColor = look.pants;
  const skinColor = look.skin;
  const shoeColor = look.shoes;
  const gloveColor = "#1c1917";
  const beltColor = team === "T" ? "#3f2a1a" : "#0f172a";
  const [torsoW, torsoH, torsoD] = look.torso;
  const [vestW, vestH, vestD] = look.vest;
  const armW = look.armW;
  const legW = look.legW;

  useFrame(() => {
    if (isDead) {
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.3, 0, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.3, 0, 0);
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0.2;
      return;
    }

    const sprinting = motionRef?.current.sprinting ?? isSprinting;
    const moving = motionRef?.current.moving ?? limbSwingSpeed > 0;
    const speed = limbSwingSpeed > 0 ? limbSwingSpeed : sprinting ? 10 : 6;
    const amplitude = isCrouching ? 0.4 : sprinting ? 0.8 : 0.5;
    const firing = Date.now() < muzzleUntil;
    const fireKick = firing ? armPose.fireKick : 0;

    if (holdWeapon) {
      const [rx, ry, rz] = armPose.right;
      const [lx, ly, lz] = armPose.left;
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(rx - fireKick, ry, rz);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(lx, ly, lz);
      }
    } else if ((moving || sprinting) && !firing) {
      const time = performance.now() / 1000;
      const swing = Math.sin(time * speed) * amplitude;
      if (leftArmRef.current) leftArmRef.current.rotation.set(swing, 0, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(-swing, 0, 0);
    } else {
      if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, 0);
      if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, 0);
    }

    if ((moving || sprinting) && !isDead) {
      const time = performance.now() / 1000;
      const swing = Math.sin(time * speed) * amplitude;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }

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

      {/* Neck */}
      <mesh position={[0, 1.22, 0]} castShadow userData={playerId ? { playerId, isHead: true } : undefined}>
        <cylinderGeometry args={[0.065, 0.075, 0.1, 8]} />
        <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
      </mesh>

      {/* Torso — upper chest taper */}
      <mesh position={[0, 0.9, 0]} castShadow userData={playerId ? { playerId, isHead: false } : undefined}>
        <boxGeometry args={[torsoW * 0.96, torsoH * 0.42, torsoD * 0.94]} />
        <meshStandardMaterial color={shirtColor} emissive={shirtColor} emissiveIntensity={0.08} opacity={opacity} transparent />
      </mesh>
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[torsoW, torsoH * 0.58, torsoD]} />
        <meshStandardMaterial color={shirtColor} emissive={shirtColor} emissiveIntensity={0.1} opacity={opacity} transparent />
      </mesh>

      {/* Tactical vest */}
      <mesh position={[0, 0.84, 0.01]} castShadow>
        <boxGeometry args={[vestW, vestH, vestD]} />
        <meshStandardMaterial color={vestColor} roughness={0.6} metalness={0.14} opacity={opacity} transparent />
      </mesh>
      <mesh position={[0, 0.84, vestD * 0.48]} castShadow>
        <boxGeometry args={[vestW * 0.55, vestH * 0.35, 0.03]} />
        <meshStandardMaterial color={vestColor} emissive={vestColor} emissiveIntensity={0.15} opacity={opacity} transparent />
      </mesh>

      {/* Belt & pouches */}
      <mesh position={[-torsoW * 0.22, 0.72, vestD * 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.05]} />
        <meshStandardMaterial color={beltColor} opacity={opacity} transparent />
      </mesh>
      <mesh position={[torsoW * 0.22, 0.72, vestD * 0.45]} castShadow>
        <boxGeometry args={[0.08, 0.1, 0.05]} />
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

      {/* Left arm */}
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
        <mesh position={[0, -0.62, 0.02]} castShadow>
          <boxGeometry args={[armW - 0.02, 0.1, armW + 0.02]} />
          <meshStandardMaterial color={gloveColor} roughness={0.75} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.68, 0.02]} castShadow>
          <boxGeometry args={[armW - 0.04, 0.06, armW - 0.02]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
      </group>

      {/* Right arm + weapon */}
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
        <mesh position={[0, -0.62, 0.02]} castShadow>
          <boxGeometry args={[armW - 0.02, 0.1, armW + 0.02]} />
          <meshStandardMaterial color={gloveColor} roughness={0.75} opacity={opacity} transparent />
        </mesh>
        <mesh position={[0, -0.68, 0.02]} castShadow>
          <boxGeometry args={[armW - 0.04, 0.06, armW - 0.02]} />
          <meshStandardMaterial color={skinColor} opacity={opacity} transparent />
        </mesh>
        {holdWeapon && (
          <group
            position={weaponAttach.position}
            rotation={weaponAttach.rotation}
            scale={weaponScale * weaponAttach.scale}
          >
            <SharedThirdPersonWeaponMesh
              weapon={currentWeapon ?? (category === "knife" ? "combatknife" : category === "pistol" ? (team === "T" ? "glock" : "deagle") : (team === "T" ? "ak47" : "m4a1"))}
              isFiring={Date.now() < muzzleUntil}
            />
          </group>
        )}
      </group>

      {/* Legs */}
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
