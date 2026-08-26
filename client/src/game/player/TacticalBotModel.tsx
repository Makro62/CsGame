import { useRef, useEffect, useState } from "react";
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

// ─── 3D Weapon Meshes for Third-Person Bots ───

function BotWeaponMesh({ weapon = "ak47", isFiring = false }: { weapon?: string; isFiring?: boolean }) {
  const w = weapon.toLowerCase();

  if (w.includes("awp")) {
    return (
      <group position={[0, -0.05, 0.32]} rotation={[0, 0, 0]}>
        {/* Long Green Stock */}
        <mesh position={[0, -0.02, -0.15]}>
          <boxGeometry args={[0.07, 0.1, 0.45]} />
          <meshStandardMaterial color="#2d4a22" roughness={0.6} />
        </mesh>
        {/* Black Receiver */}
        <mesh position={[0, 0.02, 0.15]}>
          <boxGeometry args={[0.08, 0.09, 0.35]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Long Barrel */}
        <mesh position={[0, 0.03, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.55, 8]} />
          <meshStandardMaterial color="#111" metalness={0.9} />
        </mesh>
        {/* Muzzle Brake */}
        <mesh position={[0, 0.03, 0.84]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.06, 8]} />
          <meshStandardMaterial color="#222" metalness={0.9} />
        </mesh>
        {/* Large Sniper Scope */}
        <mesh position={[0, 0.11, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.32, 8]} />
          <meshStandardMaterial color="#111" metalness={0.8} />
        </mesh>
        {/* Scope Mount Rings */}
        <mesh position={[0, 0.07, 0.05]}>
          <boxGeometry args={[0.04, 0.05, 0.03]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, 0.07, 0.2]}>
          <boxGeometry args={[0.04, 0.05, 0.03]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Muzzle Flash Burst */}
        {isFiring && (
          <group position={[0, 0.03, 0.95]}>
            <mesh>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshBasicMaterial color="#ffeedd" />
            </mesh>
            <mesh scale={[1.8, 1.8, 2.5]}>
              <coneGeometry args={[0.14, 0.45, 8]} />
              <meshBasicMaterial color="#ffaa00" transparent opacity={0.85} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (w.includes("ak47")) {
    return (
      <group position={[0, -0.04, 0.25]}>
        {/* Wood Stock */}
        <mesh position={[0, -0.04, -0.16]}>
          <boxGeometry args={[0.06, 0.09, 0.26]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
        {/* Dark Metal Receiver */}
        <mesh position={[0, 0.02, 0.08]}>
          <boxGeometry args={[0.07, 0.08, 0.28]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Curved Banana Magazine */}
        <mesh position={[0, -0.12, 0.08]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.045, 0.16, 0.07]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} />
        </mesh>
        {/* Wood Handguard */}
        <mesh position={[0, 0.02, 0.28]}>
          <boxGeometry args={[0.065, 0.07, 0.16]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
        {/* Barrel & Gas Tube */}
        <mesh position={[0, 0.03, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.018, 0.24, 8]} />
          <meshStandardMaterial color="#111" metalness={0.9} />
        </mesh>
        {/* Front Sight */}
        <mesh position={[0, 0.07, 0.52]}>
          <boxGeometry args={[0.015, 0.05, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        {/* Muzzle Flash Burst */}
        {isFiring && (
          <group position={[0, 0.03, 0.62]}>
            <mesh>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh scale={[1.4, 1.4, 1.8]}>
              <coneGeometry args={[0.1, 0.35, 8]} />
              <meshBasicMaterial color="#ff9900" transparent opacity={0.85} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (w.includes("m4a1") || w.includes("mp5")) {
    return (
      <group position={[0, -0.04, 0.24]}>
        {/* Tactical Stock */}
        <mesh position={[0, -0.02, -0.14]}>
          <boxGeometry args={[0.05, 0.08, 0.22]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} />
        </mesh>
        {/* Receiver */}
        <mesh position={[0, 0.02, 0.06]}>
          <boxGeometry args={[0.065, 0.08, 0.24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        {/* Magazine */}
        <mesh position={[0, -0.11, 0.06]}>
          <boxGeometry args={[0.04, 0.14, 0.06]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
        {/* Tactical Rail Handguard */}
        <mesh position={[0, 0.02, 0.25]}>
          <boxGeometry args={[0.06, 0.065, 0.18]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} />
        </mesh>
        {/* Silencer / Barrel */}
        <mesh position={[0, 0.02, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.24, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} />
        </mesh>
        {/* Muzzle Flash Burst */}
        {isFiring && (
          <group position={[0, 0.02, 0.6]}>
            <mesh>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh scale={[1.2, 1.2, 1.5]}>
              <coneGeometry args={[0.08, 0.3, 8]} />
              <meshBasicMaterial color="#ffaa22" transparent opacity={0.8} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  if (w.includes("deagle") || w.includes("glock") || w.includes("tec9") || w.includes("autopistol") || w.includes("pistol")) {
    return (
      <group position={[0, -0.02, 0.16]}>
        {/* Pistol Grip */}
        <mesh position={[0, -0.06, -0.02]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.045, 0.11, 0.05]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
        {/* Pistol Slide */}
        <mesh position={[0, 0.02, 0.04]}>
          <boxGeometry args={[0.05, 0.05, 0.18]} />
          <meshStandardMaterial color={w.includes("deagle") ? "#cbd5e1" : "#1e293b"} metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Muzzle Flash Burst */}
        {isFiring && (
          <group position={[0, 0.02, 0.18]}>
            <mesh>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh scale={[1.0, 1.0, 1.2]}>
              <coneGeometry args={[0.06, 0.22, 8]} />
              <meshBasicMaterial color="#ffbb33" transparent opacity={0.8} />
            </mesh>
          </group>
        )}
      </group>
    );
  }

  // Combat Knife
  return (
    <group position={[0, -0.02, 0.12]} rotation={[0.4, 0, 0]}>
      {/* Handle */}
      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[0.035, 0.09, 0.035]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>
      {/* Blade */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.015, 0.14, 0.04]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Tactical CS Character Component ───

export function TacticalBotModel({
  id,
  team = "CT",
  currentWeapon = "ak47",
  isDead = false,
  isMoving = false,
  isPlanting = false,
  isDefusing = false,
  lastShootTime = 0,
  rotationY: _rotationY = 0,
}: TacticalBotModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const [isFiring, setIsFiring] = useState(false);
  const lastShotRef = useRef(lastShootTime);

  // Muzzle flash trigger on fire
  useEffect(() => {
    if (lastShootTime && lastShootTime !== lastShotRef.current) {
      lastShotRef.current = lastShootTime;
      setIsFiring(true);
      const timer = setTimeout(() => setIsFiring(false), 70);
      return () => clearTimeout(timer);
    }
  }, [lastShootTime]);

  const isCT = team === "CT";
  const uniformColor = isCT ? "#1e293b" : "#451a03";
  const vestColor = isCT ? "#0f172a" : "#292524";
  const camoPantsColor = isCT ? "#334155" : "#365314";
  const helmetColor = isCT ? "#0f172a" : "#1c1917";
  const skinTone = "#d4a574";
  const bootColor = "#0f172a";

  const isRifleOrSniper =
    currentWeapon.includes("ak") ||
    currentWeapon.includes("m4") ||
    currentWeapon.includes("awp") ||
    currentWeapon.includes("mp5");

  useFrame((_, delta) => {
    if (isDead) {
      if (bodyRef.current) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0.2, delta * 8);
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, -Math.PI / 2.2, delta * 8);
      }
      return;
    }

    if (bodyRef.current) {
      bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, 0, delta * 10);
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, delta * 10);
    }

    // Walking / sprinting animation
    if (isMoving) {
      const time = performance.now() * 0.008;
      const legSwing = Math.sin(time) * 0.65;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = legSwing;

      if (!isRifleOrSniper && leftArmRef.current) {
        leftArmRef.current.rotation.x = legSwing * 0.5;
      }
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, delta * 10);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, delta * 10);
    }

    // Weapon Aim Stance
    if (isRifleOrSniper) {
      // Both hands holding rifle aimed forward
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-1.25, -0.22, 0.15);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(-1.18, 0.42, -0.2);
      }
    } else if (currentWeapon.includes("knife")) {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-0.7, -0.3, 0.2);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(0, 0, 0);
      }
    } else {
      // Pistol stance
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(-1.3, -0.1, 0.05);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(-1.25, 0.25, -0.1);
      }
    }

    // Planting / Defusing pose
    if (isPlanting || isDefusing) {
      if (bodyRef.current) bodyRef.current.position.y = -0.25;
      if (rightArmRef.current) rightArmRef.current.rotation.set(-0.6, 0, 0);
      if (leftArmRef.current) leftArmRef.current.rotation.set(-0.6, 0, 0);
    }
  });

  return (
    <group ref={rootRef} name={`bot-${id}`}>
      <group ref={bodyRef}>
        {/* ── Head & Helmet with Headshot Hitbox ── */}
        <group ref={headRef} position={[0, 1.48, 0]}>
          {/* Head Box (Hitbox) */}
          <mesh castShadow userData={{ playerId: id, isHead: true }}>
            <boxGeometry args={[0.34, 0.34, 0.34]} />
            <meshStandardMaterial color={skinTone} roughness={0.7} />
          </mesh>

          {/* Tactical Helmet */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.38, 0.22, 0.38]} />
            <meshStandardMaterial color={helmetColor} roughness={0.5} metalness={0.4} />
          </mesh>

          {/* Dark Visor / Goggles */}
          <mesh position={[0, 0.02, 0.185]}>
            <boxGeometry args={[0.3, 0.09, 0.04]} />
            <meshStandardMaterial color={isCT ? "#1e3a8a" : "#b91c1c"} metalness={0.9} roughness={0.1} />
          </mesh>

          {/* Balaclava / Face Mask */}
          <mesh position={[0, -0.08, 0.05]}>
            <boxGeometry args={[0.35, 0.16, 0.32]} />
            <meshStandardMaterial color={isCT ? "#0f172a" : "#78350f"} roughness={0.9} />
          </mesh>
        </group>

        {/* ── Torso & Heavy Kevlar Vest (Body Hitbox) ── */}
        <group position={[0, 0.82, 0]}>
          {/* Torso */}
          <mesh castShadow userData={{ playerId: id, isHead: false }}>
            <boxGeometry args={[0.48, 0.72, 0.28]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>

          {/* Kevlar Body Armor Vest */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.52, 0.58, 0.32]} />
            <meshStandardMaterial color={vestColor} roughness={0.6} metalness={0.2} />
          </mesh>

          {/* Tactical Ammo Pouches (Front) */}
          <mesh position={[-0.12, -0.1, 0.18]} castShadow>
            <boxGeometry args={[0.1, 0.15, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.12, -0.1, 0.18]} castShadow>
            <boxGeometry args={[0.1, 0.15, 0.06]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Team Back Patch */}
          <mesh position={[0, 0.12, -0.165]}>
            <boxGeometry args={[0.26, 0.12, 0.02]} />
            <meshStandardMaterial color={isCT ? "#2563eb" : "#dc2626"} roughness={0.5} />
          </mesh>
        </group>

        {/* ── Left Arm ── */}
        <group ref={leftArmRef} position={[-0.34, 1.1, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.58, 0.16]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Tactical Glove */}
          <mesh position={[0, -0.58, 0]} castShadow>
            <boxGeometry args={[0.15, 0.14, 0.15]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
        </group>

        {/* ── Right Arm & Attached Weapon ── */}
        <group ref={rightArmRef} position={[0.34, 1.1, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <boxGeometry args={[0.16, 0.58, 0.16]} />
            <meshStandardMaterial color={uniformColor} roughness={0.8} />
          </mesh>
          {/* Tactical Glove */}
          <mesh position={[0, -0.58, 0]} castShadow>
            <boxGeometry args={[0.15, 0.14, 0.15]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>

          {/* 3D Weapon Model Attached to Right Hand */}
          <group position={[0, -0.58, 0.1]}>
            <BotWeaponMesh weapon={currentWeapon} isFiring={isFiring} />
          </group>
        </group>

        {/* ── Left Leg ── */}
        <group ref={leftLegRef} position={[-0.14, 0.44, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.19, 0.56, 0.19]} />
            <meshStandardMaterial color={camoPantsColor} roughness={0.9} />
          </mesh>
          {/* Tactical Combat Boot */}
          <mesh position={[0, -0.54, 0.03]} castShadow>
            <boxGeometry args={[0.2, 0.14, 0.25]} />
            <meshStandardMaterial color={bootColor} roughness={0.5} />
          </mesh>
        </group>

        {/* ── Right Leg ── */}
        <group ref={rightLegRef} position={[0.14, 0.44, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.19, 0.56, 0.19]} />
            <meshStandardMaterial color={camoPantsColor} roughness={0.9} />
          </mesh>
          {/* Tactical Combat Boot */}
          <mesh position={[0, -0.54, 0.03]} castShadow>
            <boxGeometry args={[0.2, 0.14, 0.25]} />
            <meshStandardMaterial color={bootColor} roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default TacticalBotModel;
