import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
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
      <mesh position={[0, 5.8, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={1.2} />
      </mesh>
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
      <mesh position={[0, 0.5, 0]} material={markingMat}>
        <sphereGeometry args={[0.4, 16, 16]} />
      </mesh>
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

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow material={crateMat}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
      </mesh>
      <CuboidCollider args={[0.6, 0.4, 0.4]} position={[0, 0.4, 0]} />
    </RigidBody>
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
      <AmmoCrate position={[-5, 0, -33]} />
      <AmmoCrate position={[5, 0, -33]} />
      <AmmoCrate position={[0, 0, -37]} />
      <SpecialStationLights />
      <PerimeterLights />
    </group>
  );
}
