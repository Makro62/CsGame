import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { MYSTERY_BOX_POS, PACK_A_PUNCH_POS, ZOMBIE_MAP_AREAS, ZOMBIE_SHOP } from "@cs-game/shared";
import { InteractiveBarricades } from "./InteractiveBarricades";
import { useZombieStore } from "../../stores/useZombieStore";

// ============================================================================
// Zombie Arena - Outpost Z-7 Arena Map
// ============================================================================

function ArenaFloor() {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#181a1f",
        roughness: 0.95,
        metalness: 0.05,
      }),
    []
  );

  useEffect(() => {
    return () => { floorMat.dispose(); };
  }, []);

  return (
    <RigidBody type="fixed" position={[0, -0.25, 0]} colliders={false}>
      <mesh receiveShadow position={[0, 0.24, 0]} material={floorMat}>
        <boxGeometry args={[200, 0.5, 200]} />
      </mesh>
      <CuboidCollider args={[100, 0.25, 100]} />
    </RigidBody>
  );
}

function ArenaBoundary() {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2d34",
        roughness: 0.9,
        metalness: 0.1,
      }),
    []
  );

  useEffect(() => {
    return () => { wallMat.dispose(); };
  }, []);

  const wallHeight = 6;
  const wallThickness = 2;
  const size = 60;

  return (
    <group>
      {/* North wall */}
      <RigidBody type="fixed" position={[0, wallHeight / 2, -size]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[size * 2 + wallThickness * 2, wallHeight, wallThickness]} />
        </mesh>
        <CuboidCollider args={[(size * 2 + wallThickness * 2) / 2, wallHeight / 2, wallThickness / 2]} />
      </RigidBody>

      {/* South wall */}
      <RigidBody type="fixed" position={[0, wallHeight / 2, size]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[size * 2 + wallThickness * 2, wallHeight, wallThickness]} />
        </mesh>
        <CuboidCollider args={[(size * 2 + wallThickness * 2) / 2, wallHeight / 2, wallThickness / 2]} />
      </RigidBody>

      {/* West wall */}
      <RigidBody type="fixed" position={[-size, wallHeight / 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        </mesh>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, size]} />
      </RigidBody>

      {/* East wall */}
      <RigidBody type="fixed" position={[size, wallHeight / 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        </mesh>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, size]} />
      </RigidBody>
    </group>
  );
}

function SafeHouse() {
  const concreteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#35383f",
        roughness: 0.85,
        metalness: 0.1,
      }),
    []
  );

  const beaconGeo = useMemo(() => new THREE.SphereGeometry(0.35, 16, 16), []);
  const beaconMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#dc2626",
        emissive: "#dc2626",
        emissiveIntensity: 1.2,
      }),
    []
  );

  useEffect(() => {
    return () => {
      concreteMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
    };
  }, []);

  return (
    <group position={[0, 0, -40]}>
      {/* Back Wall */}
      <RigidBody type="fixed" position={[0, 2.5, -10]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[30, 5, 1]} />
        </mesh>
        <CuboidCollider args={[15, 2.5, 0.5]} />
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" position={[-15, 2.5, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 5, 20]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.5, 10]} />
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" position={[15, 2.5, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 5, 20]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.5, 10]} />
      </RigidBody>

      {/* Roof */}
      <RigidBody type="fixed" position={[0, 5.2, 0]} colliders={false}>
        <mesh receiveShadow material={concreteMat}>
          <boxGeometry args={[32, 0.4, 22]} />
        </mesh>
        <CuboidCollider args={[16, 0.2, 11]} />
      </RigidBody>

      {/* Red Hazard Beacon on Safe House Roof */}
      <mesh position={[0, 5.8, 0]} geometry={beaconGeo} material={beaconMat} />
      <pointLight position={[0, 6, 0]} intensity={1.5} distance={35} color="#dc2626" />

      {/* Interior warm safe light */}
      <pointLight position={[0, 3.5, -2]} intensity={1.8} distance={25} color="#ffd8a8" />
    </group>
  );
}

function Helipad() {
  const extractionActive = useZombieStore((s) => s.extractionActive);
  const extractionAvailable = useZombieStore((s) => s.extractionAvailable);

  const padMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#282a30",
        roughness: 0.8,
        metalness: 0.3,
      }),
    []
  );

  const isLit = extractionActive || extractionAvailable;
  const markingColor = isLit ? (extractionActive ? "#10b981" : "#f59e0b") : "#dc2626";

  const markingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: markingColor,
        emissive: markingColor,
        emissiveIntensity: isLit ? 1.0 : 0.4,
        roughness: 0.7,
        metalness: 0.2,
      }),
    [markingColor, isLit]
  );

  const beaconGeo = useMemo(() => new THREE.SphereGeometry(0.4, 16, 16), []);

  useEffect(() => {
    return () => {
      padMat.dispose();
      markingMat.dispose();
      beaconGeo.dispose();
    };
  }, []);

  return (
    <group position={[0, 0.05, 50]}>
      {/* Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={padMat}>
        <circleGeometry args={[12, 32]} />
      </mesh>
      {/* H marking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={markingMat}>
        <ringGeometry args={[3, 4.5, 32]} />
      </mesh>
      {/* Center beacon light */}
      <mesh position={[0, 0.5, 0]} material={markingMat} geometry={beaconGeo} />
      <pointLight
        position={[0, 3, 0]}
        intensity={extractionActive ? 3.5 : isLit ? 2.0 : 1.0}
        distance={45}
        color={markingColor}
      />
    </group>
  );
}

function AmmoCrate({ position }: { position: [number, number, number] }) {
  const crateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4a3c20",
        roughness: 0.9,
        metalness: 0.15,
      }),
    []
  );

  useEffect(() => {
    return () => { crateMat.dispose(); };
  }, []);

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={crateMat}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
      </mesh>
      <CuboidCollider args={[0.6, 0.4, 0.4]} position={[0, 0.4, 0]} />
    </RigidBody>
  );
}

function MysteryBoxStation() {
  const boxMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#92400e",
        emissive: "#b45309",
        emissiveIntensity: 0.35,
        roughness: 0.6,
        metalness: 0.3,
      }),
    []
  );

  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#f59e0b",
        emissiveIntensity: 0.8,
        roughness: 0.4,
        metalness: 0.8,
      }),
    []
  );

  useEffect(() => {
    return () => {
      boxMat.dispose();
      trimMat.dispose();
    };
  }, []);

  return (
    <group position={[MYSTERY_BOX_POS.x, 0, MYSTERY_BOX_POS.z]}>
      {/* Base Chest */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]} material={boxMat}>
        <boxGeometry args={[2.0, 0.8, 1.0]} />
      </mesh>
      {/* Gold Trim / Corners */}
      <mesh position={[0, 0.4, 0.51]} material={trimMat}>
        <boxGeometry args={[1.8, 0.1, 0.05]} />
      </mesh>
      <mesh position={[0, 0.4, -0.51]} material={trimMat}>
        <boxGeometry args={[1.8, 0.1, 0.05]} />
      </mesh>
      {/* Glowing Question Mark Core */}
      <mesh position={[0, 0.9, 0]} material={trimMat}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={2.5} distance={18} color="#f59e0b" />
      {/* 3D Label */}
      <Html position={[0, 1.5, 0]} center distanceFactor={18}>
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            padding: "4px 10px",
            color: "#fbbf24",
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 0 10px rgba(245, 158, 11, 0.4)",
          }}
        >
          🎁 MYSTERY BOX [F] (950 PTS)
        </div>
      </Html>
    </group>
  );
}

function PackAPunchStation() {
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e1b4b",
        roughness: 0.5,
        metalness: 0.8,
      }),
    []
  );

  const neonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a855f7",
        emissive: "#9333ea",
        emissiveIntensity: 2.5,
        roughness: 0.2,
        metalness: 0.1,
      }),
    []
  );

  useEffect(() => {
    return () => {
      frameMat.dispose();
      neonMat.dispose();
    };
  }, []);

  return (
    <group position={[PACK_A_PUNCH_POS.x, 0, PACK_A_PUNCH_POS.z]}>
      {/* Machine Base */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]} material={frameMat}>
        <boxGeometry args={[2.2, 1.4, 1.4]} />
      </mesh>
      {/* Glowing Neon Coils */}
      <mesh position={[0, 1.5, 0]} material={neonMat}>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
      </mesh>
      {/* Top Arch */}
      <mesh position={[0, 2.0, 0]} material={frameMat}>
        <boxGeometry args={[1.6, 0.3, 0.8]} />
      </mesh>
      <pointLight position={[0, 1.8, 0]} intensity={3.0} distance={20} color="#c084fc" />
      {/* 3D Label */}
      <Html position={[0, 2.4, 0]} center distanceFactor={18}>
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            border: "1px solid #c084fc",
            borderRadius: "6px",
            padding: "4px 10px",
            color: "#e9d5ff",
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 0 12px rgba(192, 132, 252, 0.5)",
          }}
        >
          ⚡ PACK-A-PUNCH [F] (5,000 PTS)
        </div>
      </Html>
    </group>
  );
}

function PerkVendingMachines() {
  const perks = [
    { name: "JUGGERNOG", color: "#dc2626", pos: [-8, 0, -32] as [number, number, number], price: ZOMBIE_SHOP.perks.juggernog.price },
    { name: "SPEED COLA", color: "#16a34a", pos: [8, 0, -32] as [number, number, number], price: ZOMBIE_SHOP.perks.speedcola.price },
    { name: "QUICK REVIVE", color: "#0284c7", pos: [-12, 0, -35] as [number, number, number], price: ZOMBIE_SHOP.perks.quickrevive.price },
    { name: "DOUBLE TAP", color: "#ea580c", pos: [12, 0, -35] as [number, number, number], price: ZOMBIE_SHOP.perks.doubletap.price },
  ];

  return (
    <group>
      {perks.map((p, i) => (
        <group key={i} position={p.pos}>
          {/* Machine Body */}
          <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
            <boxGeometry args={[1.0, 2.2, 0.8]} />
            <meshStandardMaterial color={p.color} roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Glowing Front Display */}
          <mesh position={[0, 1.4, 0.41]}>
            <boxGeometry args={[0.7, 0.8, 0.05]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={1.2} />
          </mesh>
          <pointLight position={[0, 1.5, 0.6]} intensity={1.2} distance={8} color={p.color} />
          <Html position={[0, 2.4, 0]} center distanceFactor={18}>
            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.85)",
                border: `1px solid ${p.color}`,
                borderRadius: "4px",
                padding: "3px 8px",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              🥤 {p.name} ({p.price} PTS)
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function AreaGates() {
  const unlockedAreas = useZombieStore((s) => s.unlockedAreas);

  const lockedGates = ZOMBIE_MAP_AREAS.filter(
    (area) => area.price > 0 && !unlockedAreas.includes(area.id)
  );

  const barrierMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#b91c1c",
        emissive: "#7f1d1d",
        emissiveIntensity: 0.4,
        roughness: 0.8,
        metalness: 0.2,
      }),
    []
  );

  useEffect(() => {
    return () => { barrierMat.dispose(); };
  }, []);

  return (
    <group>
      {lockedGates.map((area) => (
        <group key={area.id} position={[area.x, 0, area.z]}>
          {/* Barricade / Gate Mesh */}
          <RigidBody type="fixed" colliders={false}>
            <mesh position={[0, 1.5, 0]} material={barrierMat}>
              <boxGeometry args={[4, 3, 0.4]} />
            </mesh>
            <CuboidCollider args={[2, 1.5, 0.2]} position={[0, 1.5, 0]} />
          </RigidBody>
          <pointLight position={[0, 2.5, 0]} intensity={1.5} distance={12} color="#ef4444" />
          <Html position={[0, 3.2, 0]} center distanceFactor={18}>
            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.85)",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                padding: "4px 10px",
                color: "#fca5a5",
                fontSize: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              🔒 {area.name} [F] ({area.price.toLocaleString()} PTS)
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function SpecialStationLights() {
  return (
    <group>
      {/* Mystery Box [0, 5] Amber Spotlight */}
      <pointLight position={[0, 3.5, 5]} intensity={1.5} distance={15} color="#f59e0b" />

      {/* Pack-a-Punch [0, 0] Purple Spotlight */}
      <pointLight position={[0, 3.5, 0]} intensity={1.8} distance={15} color="#a855f7" />
    </group>
  );
}

function PerimeterLights() {
  const lightPositions: [number, number, number][] = [
    [-30, 8, -30],
    [30, 8, -30],
    [-30, 8, 30],
    [30, 8, 30],
    [0, 8, -50],
    [0, 8, 50],
  ];

  return (
    <group>
      {lightPositions.map(([x, y, z], i) => (
        <pointLight
          key={i}
          position={[x, y, z]}
          intensity={0.5}
          distance={55}
          color="#ff9944"
        />
      ))}
    </group>
  );
}

// ============================================================================
// Main Arena Component
// ============================================================================

export function ZombieArena() {
  return (
    <group>
      <ArenaFloor />
      <ArenaBoundary />
      <SafeHouse />
      <Helipad />
      <InteractiveBarricades />
      <MysteryBoxStation />
      <PackAPunchStation />
      <PerkVendingMachines />
      <AreaGates />
      <AmmoCrate position={[-5, 0, -33]} />
      <AmmoCrate position={[5, 0, -33]} />
      <AmmoCrate position={[0, 0, -37]} />
      <SpecialStationLights />
      <PerimeterLights />
    </group>
  );
}

