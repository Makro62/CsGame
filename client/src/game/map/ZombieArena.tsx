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
        color: "#2b2d31",
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
        color: "#4a4a4a",
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

      {/* East wall */}
      <RigidBody type="fixed" position={[size, wallHeight / 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        </mesh>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, size]} />
      </RigidBody>

      {/* West wall */}
      <RigidBody type="fixed" position={[-size, wallHeight / 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[wallThickness, wallHeight, size * 2]} />
        </mesh>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, size]} />
      </RigidBody>
    </group>
  );
}

function SafeHouse() {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4f4133",
        roughness: 0.85,
        metalness: 0.1,
      }),
    []
  );

  const roofMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2a2a",
        roughness: 0.9,
        metalness: 0.2,
      }),
    []
  );

  return (
    <group position={[0, 0, -40]}>
      {/* Back wall */}
      <RigidBody type="fixed" position={[0, 2, -5.5]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[14, 4, 1]} />
        </mesh>
        <CuboidCollider args={[7, 2, 0.5]} />
      </RigidBody>

      {/* Left wall */}
      <RigidBody type="fixed" position={[-6.5, 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[1, 4, 12]} />
        </mesh>
        <CuboidCollider args={[0.5, 2, 6]} />
      </RigidBody>

      {/* Right wall */}
      <RigidBody type="fixed" position={[6.5, 2, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[1, 4, 12]} />
        </mesh>
        <CuboidCollider args={[0.5, 2, 6]} />
      </RigidBody>

      {/* Front Left Wall */}
      <RigidBody type="fixed" position={[-4.5, 2, 5.5]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[4, 4, 1]} />
        </mesh>
        <CuboidCollider args={[2, 2, 0.5]} />
      </RigidBody>

      {/* Front Right Wall */}
      <RigidBody type="fixed" position={[4.5, 2, 5.5]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[4, 4, 1]} />
        </mesh>
        <CuboidCollider args={[2, 2, 0.5]} />
      </RigidBody>

      {/* Roof */}
      <mesh position={[0, 4.2, 0]} castShadow receiveShadow material={roofMat}>
        <boxGeometry args={[16, 0.4, 14]} />
      </mesh>
    </group>
  );
}

function Helipad() {
  const extractionActive = useZombieStore((s) => s.extractionActive);
  const extractionAvailable = useZombieStore((s) => s.extractionAvailable);

  const padMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a3a3a",
        roughness: 0.8,
        metalness: 0.3,
      }),
    []
  );

  const isLit = extractionActive || extractionAvailable;
  const markingColor = isLit ? (extractionActive ? "#10b981" : "#f59e0b") : "#ff6600";

  const markingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: markingColor,
        emissive: markingColor,
        emissiveIntensity: isLit ? 0.9 : 0.3,
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
      {isLit && (
        <pointLight
          position={[0, 3, 0]}
          intensity={extractionActive ? 3.0 : 1.5}
          distance={40}
          color={extractionActive ? "#10b981" : "#f59e0b"}
        />
      )}
    </group>
  );
}

function AmmoCrate({ position }: { position: [number, number, number] }) {
  const crateMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5c4a2a",
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
          intensity={0.6}
          distance={65}
          color="#ffaa55"
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
      <PerimeterLights />
    </group>
  );
}
