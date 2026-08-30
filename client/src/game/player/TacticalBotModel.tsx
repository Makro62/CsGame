import { useRef, useEffect, useMemo, useState } from "react";
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
}

function BotWeaponMesh({ weapon = "ak47", isFiring = false }: { weapon?: string; isFiring?: boolean }) {
  const w = weapon.toLowerCase();

  if (w.includes("awp")) {
    return (
      <group position={[0, 0, 0.28]} rotation={[0.12, 0, 0]}>
        <mesh position={[0, -0.02, -0.12]}>
          <boxGeometry args={[0.055, 0.08, 0.38]} />
          <meshStandardMaterial color="#2d4a22" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.015, 0.14]}>
          <boxGeometry args={[0.06, 0.07, 0.3]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.02, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.02, 0.42, 8]} />
          <meshStandardMaterial color="#111" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.09, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.024, 0.26, 8]} />
          <meshStandardMaterial color="#111" metalness={0.8} />
        </mesh>
        {isFiring && <MuzzleFlash z={0.7} />}
      </group>
    );
  }

  if (w.includes("ak47")) {
    return (
      <group position={[0, 0, 0.22]} rotation={[0.1, 0, 0]}>
        <mesh position={[0, -0.03, -0.12]}>
          <boxGeometry args={[0.05, 0.07, 0.22]} />
          <meshStandardMaterial color="#6b3d1f" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.01, 0.08]}>
          <boxGeometry args={[0.055, 0.065, 0.24]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.1, 0.06]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.038, 0.14, 0.055]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.015, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.016, 0.22, 8]} />
          <meshStandardMaterial color="#111" metalness={0.9} />
        </mesh>
        {isFiring && <MuzzleFlash z={0.5} />}
      </group>
    );
  }

  if (w.includes("m4a1") || w.includes("mp5")) {
    return (
      <group position={[0, 0, 0.2]} rotation={[0.1, 0, 0]}>
        <mesh position={[0, -0.015, -0.1]}>
          <boxGeometry args={[0.042, 0.065, 0.18]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.01, 0.06]}>
          <boxGeometry args={[0.05, 0.06, 0.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.09, 0.05]}>
          <boxGeometry args={[0.034, 0.12, 0.048]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.012, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} />
        </mesh>
        {isFiring && <MuzzleFlash z={0.46} />}
      </group>
    );
  }

  if (w.includes("deagle") || w.includes("glock") || w.includes("tec9") || w.includes("autopistol") || w.includes("pistol")) {
    return (
      <group position={[0.02, -0.02, 0.08]} rotation={[0.15, 0, 0]}>
        <mesh position={[0, -0.05, -0.01]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.038, 0.09, 0.042]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.015, 0.04]}>
          <boxGeometry args={[0.04, 0.04, 0.15]} />
          <meshStandardMaterial color={w.includes("deagle") ? "#cbd5e1" : "#1e293b"} metalness={0.85} roughness={0.2} />
        </mesh>
        {isFiring && <MuzzleFlash z={0.14} scale={0.7} />}
      </group>
    );
  }

  return (
    <group position={[0.02, 0, 0.06]} rotation={[0.5, 0, 0]}>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[0.03, 0.08, 0.03]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0.02]}>
        <boxGeometry args={[0.012, 0.12, 0.035]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
      </mesh>
    </group>
  );
}

function MuzzleFlash({ z, scale = 1 }: { z: number; scale?: number }) {
  return (
    <group position={[0, 0.02, z]} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.045, 6, 6]} />
        <meshBasicMaterial color="#fff7ed" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.04]}>
        <coneGeometry args={[0.035, 0.12, 6]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.8} />
      </mesh>
    </group>
  );
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
  const palette = team === "T" ? TEAM.T : TEAM.CT;
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
    currentWeapon.includes("mp5");
  const knife = currentWeapon.includes("knife");

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

    if (isPlanting || isDefusing) {
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.85, 0.1, 0.25);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.85, -0.1, -0.25);
      if (rightElbowRef.current) rightElbowRef.current.rotation.set(-0.7, 0, 0);
      if (leftElbowRef.current) leftElbowRef.current.rotation.set(-0.7, 0, 0);
      return;
    }

    if (rifle) {
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.42, 0.18, 0.38);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.55, -0.32, -0.42);
      if (rightElbowRef.current) rightElbowRef.current.rotation.set(-1.05, 0, 0.08);
      if (leftElbowRef.current) leftElbowRef.current.rotation.set(-0.95, 0, -0.06);
    } else if (knife) {
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.35, 0.25, 0.35);
      if (leftArmRef.current) leftArmRef.current.rotation.set(0.12, 0, 0.08);
      if (rightElbowRef.current) rightElbowRef.current.rotation.set(-0.55, 0, 0);
      if (leftElbowRef.current) leftElbowRef.current.rotation.set(-0.15, 0, 0);
    } else {
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.38, 0.08, 0.22);
      if (leftArmRef.current) leftArmRef.current.rotation.set(0.08 + walk * 0.2, 0, 0.12);
      if (rightElbowRef.current) rightElbowRef.current.rotation.set(-1.15, 0, 0);
      if (leftElbowRef.current) leftElbowRef.current.rotation.set(-0.2, 0, 0);
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
            <group position={[0.02, -0.28, 0.04]}>
              <BotWeaponMesh weapon={currentWeapon} isFiring={isFiring} />
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
