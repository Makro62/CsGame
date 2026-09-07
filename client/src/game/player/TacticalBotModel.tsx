import { useRef, useEffect, useMemo, useState } from "react";
import {
  SharedThirdPersonWeaponMesh,
} from "../weapons/weaponGeometries";
import {
  THIRD_PERSON_ARM_POSES,
  TACTICAL_ELBOW_POSES,
  TACTICAL_WEAPON_ATTACH,
  weaponCategoryFromId,
} from "./thirdPersonWeaponRig";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TacticalBotModelProps {
  id: string;
  team: "T" | "CT" | string;
  currentWeapon?: string;
  isDead?: boolean;
  isMoving?: boolean;
  isPlanting?: boolean;
  isDefusing?: boolean;
  lastShootTime?: number;
  rotationY?: number;
  agentColors?: {
    shirt?: string;
    vest?: string;
    pants?: string;
    helmet?: string;
    accent?: string;
  };
}

function BotWeaponMesh({
  weapon = "ak47",
  isFiring = false,
  muzzleZ,
}: {
  weapon?: string;
  isFiring?: boolean;
  muzzleZ?: number;
}) {
  return <SharedThirdPersonWeaponMesh weapon={weapon} isFiring={isFiring} muzzleZ={muzzleZ} />;
}

function createOperatorFace(team: "T" | "CT"): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c9956c";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(14, 22, 12, 9);
  ctx.fillRect(38, 22, 12, 9);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(18, 25, 6, 5);
  ctx.fillRect(42, 25, 6, 5);
  ctx.fillStyle = team === "T" ? "#7f1d1d" : "#1e3a8a";
  ctx.fillRect(13, 18, 14, 3);
  ctx.fillRect(37, 18, 14, 3);
  ctx.fillStyle = "#8b5a3c";
  ctx.fillRect(28, 32, 8, 5);
  ctx.fillStyle = "#7c4a32";
  ctx.fillRect(24, 42, 16, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const TEAM = {
  T: {
    shirt: "#6b4423",
    vest: "#3f2a1a",
    pants: "#3f3b32",
    helmet: "#1c1917",
    accent: "#b91c1c",
  },
  CT: {
    shirt: "#1e3a5f",
    vest: "#0f172a",
    pants: "#1e293b",
    helmet: "#111827",
    accent: "#2563eb",
  },
} as const;

export function TacticalBotModel({
  id,
  team = "CT",
  currentWeapon = "ak47",
  isDead = false,
  isMoving = false,
  isPlanting = false,
  isDefusing = false,
  lastShootTime = 0,
  agentColors,
}: TacticalBotModelProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  const [isFiring, setIsFiring] = useState(false);
  const lastShotRef = useRef(lastShootTime);
  const defaultPalette = team === "T" ? TEAM.T : TEAM.CT;
  const palette = {
    shirt: agentColors?.shirt ?? defaultPalette.shirt,
    vest: agentColors?.vest ?? defaultPalette.vest,
    pants: agentColors?.pants ?? defaultPalette.pants,
    helmet: agentColors?.helmet ?? defaultPalette.helmet,
    accent: agentColors?.accent ?? defaultPalette.accent,
  };
  const face = useMemo(() => createOperatorFace(team === "T" ? "T" : "CT"), [team]);

  useEffect(() => {
    if (lastShootTime && lastShootTime !== lastShotRef.current) {
      lastShotRef.current = lastShootTime;
      setIsFiring(true);
      const timer = setTimeout(() => setIsFiring(false), 70);
      return () => clearTimeout(timer);
    }
  }, [lastShootTime]);

  const rifle =
    currentWeapon.includes("ak") ||
    currentWeapon.includes("m4") ||
    currentWeapon.includes("awp") ||
    currentWeapon.includes("mp5") ||
    currentWeapon.includes("arccaster");
  const weaponCategory = weaponCategoryFromId(currentWeapon);
  const armPose = THIRD_PERSON_ARM_POSES[weaponCategory];
  const elbowPose = TACTICAL_ELBOW_POSES[weaponCategory];
  const weaponAttach = TACTICAL_WEAPON_ATTACH[weaponCategory];

  useFrame((_, delta) => {
    const damp = 1 - Math.exp(-12 * delta);

    if (isDead) {
      if (bodyRef.current) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.15, damp);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, -Math.PI / 2.15, damp);
      }
      return;
    }

    if (bodyRef.current) {
      bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, isPlanting || isDefusing ? -0.22 : 0, damp);
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, damp);
    }

    const t = performance.now() * 0.007;
    const walk = isMoving ? Math.sin(t) : 0;
    const walkAmt = isMoving ? 0.55 : 0;

    if (leftLegRef.current) leftLegRef.current.rotation.x = -walk * walkAmt;
    if (rightLegRef.current) rightLegRef.current.rotation.x = walk * walkAmt;
    if (leftKneeRef.current) leftKneeRef.current.rotation.x = isMoving ? Math.max(0, -walk) * 0.45 : 0.08;
    if (rightKneeRef.current) rightKneeRef.current.rotation.x = isMoving ? Math.max(0, walk) * 0.45 : 0.08;

    const kick = isFiring ? armPose.fireKick : 0;

    if (isPlanting || isDefusing) {
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85, 0.1, 0.25);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, -0.1, -0.25);
      if (rightElbowRef.current) rightElbowRef.current.rotation.set(-0.7, 0, 0);
      if (leftElbowRef.current) leftElbowRef.current.rotation.set(-0.7, 0, 0);
      return;
    }

    const [rx, ry, rz] = armPose.right;
    const [lx, ly, lz] = armPose.left;
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(rx - kick, ry, rz);
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        lx + (rifle ? 0 : walk * 0.15),
        ly,
        lz,
      );
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.set(...elbowPose.right);
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.set(...elbowPose.left);
    }
  });

  const shirt = palette.shirt;
  const pants = palette.pants;

  return (
    <group name={`bot-${id}`}>
      <group ref={bodyRef}>
        <group position={[0, 1.52, 0]}>
          <mesh castShadow userData={{ playerId: id, isHead: true }}>
            <sphereGeometry args={[0.155, 10, 8]} />
            <meshStandardMaterial color="#c9956c" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.07, -0.01]} castShadow userData={{ playerId: id, isHead: true }}>
            <sphereGeometry args={[0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI / 1.85]} />
            <meshStandardMaterial color={palette.helmet} roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.02, 0.12]} userData={{ playerId: id, isHead: true }}>
            <boxGeometry args={[0.22, 0.07, 0.08]} />
            <meshStandardMaterial color="#0b1220" metalness={0.7} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.02, 0.152]} userData={{ playerId: id, isHead: true }}>
            <planeGeometry args={[0.22, 0.2]} />
            <meshStandardMaterial map={face} roughness={0.8} />
          </mesh>
        </group>

        <mesh position={[0, 1.34, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.1, 8]} />
          <meshStandardMaterial color="#c9956c" roughness={0.7} />
        </mesh>

        <mesh position={[0, 1.02, 0]} castShadow userData={{ playerId: id, isHead: false }}>
          <boxGeometry args={[0.4, 0.5, 0.22]} />
          <meshStandardMaterial color={palette.shirt} roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.04, 0.01]} castShadow>
          <boxGeometry args={[0.44, 0.4, 0.26]} />
          <meshStandardMaterial color={palette.vest} roughness={0.62} metalness={0.15} />
        </mesh>
        <mesh position={[-0.1, 0.92, 0.15]} castShadow>
          <boxGeometry args={[0.09, 0.12, 0.05]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0.1, 0.92, 0.15]} castShadow>
          <boxGeometry args={[0.09, 0.12, 0.05]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
        <mesh position={[0, 1.12, -0.12]}>
          <boxGeometry args={[0.18, 0.08, 0.02]} />
          <meshStandardMaterial color={palette.accent} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <boxGeometry args={[0.36, 0.14, 0.2]} />
          <meshStandardMaterial color={pants} roughness={0.86} />
        </mesh>

        <group ref={leftArmRef} position={[-0.26, 1.2, 0]}>
          <mesh position={[0, -0.14, 0]} rotation={[0, 0, 0.08]} castShadow>
            <cylinderGeometry args={[0.055, 0.06, 0.28, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.78} />
          </mesh>
          <group ref={leftElbowRef} position={[0, -0.28, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <cylinderGeometry args={[0.048, 0.052, 0.26, 8]} />
              <meshStandardMaterial color={shirt} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.27, 0.01]} castShadow>
              <boxGeometry args={[0.07, 0.08, 0.08]} />
              <meshStandardMaterial color="#c9956c" roughness={0.7} />
            </mesh>
          </group>
        </group>

        <group ref={rightArmRef} position={[0.26, 1.2, 0]}>
          <mesh position={[0, -0.14, 0]} rotation={[0, 0, -0.08]} castShadow>
            <cylinderGeometry args={[0.055, 0.06, 0.28, 8]} />
            <meshStandardMaterial color={shirt} roughness={0.78} />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.28, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <cylinderGeometry args={[0.048, 0.052, 0.26, 8]} />
              <meshStandardMaterial color={shirt} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.27, 0.01]} castShadow>
              <boxGeometry args={[0.07, 0.08, 0.08]} />
              <meshStandardMaterial color="#c9956c" roughness={0.7} />
            </mesh>
            <group position={weaponAttach.position}>
              <BotWeaponMesh weapon={currentWeapon} isFiring={isFiring} muzzleZ={weaponAttach.muzzleZ} />
            </group>
          </group>
        </group>

        <group ref={leftLegRef} position={[-0.1, 0.66, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.075, 0.32, 8]} />
            <meshStandardMaterial color={pants} roughness={0.86} />
          </mesh>
          <group ref={leftKneeRef} position={[0, -0.32, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.068, 0.32, 8]} />
              <meshStandardMaterial color={pants} roughness={0.86} />
            </mesh>
            <mesh position={[0, -0.34, 0.035]} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.2]} />
              <meshStandardMaterial color="#111827" roughness={0.5} />
            </mesh>
          </group>
        </group>

        <group ref={rightLegRef} position={[0.1, 0.66, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.075, 0.32, 8]} />
            <meshStandardMaterial color={pants} roughness={0.86} />
          </mesh>
          <group ref={rightKneeRef} position={[0, -0.32, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.068, 0.32, 8]} />
              <meshStandardMaterial color={pants} roughness={0.86} />
            </mesh>
            <mesh position={[0, -0.34, 0.035]} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.2]} />
              <meshStandardMaterial color="#111827" roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
