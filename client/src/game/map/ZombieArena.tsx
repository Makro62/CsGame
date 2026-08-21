import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { MYSTERY_BOX_POS, PACK_A_PUNCH_POS, ZOMBIE_MAP_AREAS, ZOMBIE_SHOP, WALL_BUYS, AMMO_CRATE_POSITIONS, PERK_MACHINE_POSITIONS, MED_STATION } from "@cs-game/shared";
import { InteractiveBarricades } from "./InteractiveBarricades";
import { useZombieStore } from "../../stores/useZombieStore";

// ============================================================================
// Zombie Arena - Outpost Z-7 3D Facility Map
// ============================================================================

function ArenaFloor() {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c2230",
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

function ArcadeZoneFloors() {
  const zones: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [
    { pos: [0, 0.03, -40], size: [32, 0.05, 22], color: "#4a3b22" },
    { pos: [25, 0.03, -15], size: [22, 0.05, 22], color: "#1a3358" },
    { pos: [-25, 0.03, -15], size: [22, 0.05, 22], color: "#2a3d22" },
    { pos: [0, 0.03, 0], size: [18, 0.05, 18], color: "#2a1a44" },
    { pos: [25, 0.03, 25], size: [14, 0.05, 14], color: "#2a3344" },
    { pos: [-25, 0.03, 25], size: [16, 0.05, 16], color: "#3a2418" },
  ];

  return (
    <group>
      {zones.map((zone, i) => (
        <mesh key={i} position={zone.pos} receiveShadow>
          <boxGeometry args={zone.size} />
          <meshStandardMaterial color={zone.color} roughness={0.92} metalness={0.05} />
        </mesh>
      ))}
      {[-4, -2, 0, 2, 4].map((x, i) => (
        <mesh key={`stripe-${i}`} position={[x, 0.04, -10]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.4, 3.2]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#facc15" : "#111827"}
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function ArcadeProps() {
  return (
    <group>
      {[
        [-10, -32],
        [10, -32],
        [18, -8],
        [-18, -8],
        [8, 18],
        [-8, 18],
      ].map(([x, z], i) => (
        <mesh key={`barrel-${i}`} position={[x, 0.55, z]} castShadow>
          <cylinderGeometry args={[0.35, 0.38, 1.1, 10]} />
          <meshStandardMaterial color="#c2410c" roughness={0.55} metalness={0.25} />
        </mesh>
      ))}
      {[
        [-6, -12],
        [6, -12],
        [0, 12],
      ].map(([x, z], i) => (
        <mesh key={`cone-${i}`} position={[x, 0.4, z]} castShadow>
          <coneGeometry args={[0.28, 0.8, 8]} />
          <meshStandardMaterial color="#f97316" roughness={0.45} emissive="#f97316" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function MedStation() {
  return (
    <group position={[MED_STATION.x, 0, MED_STATION.z]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.1, 2.2, 0.7]} />
        <meshStandardMaterial color="#14532d" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.35, 0.38]}>
        <boxGeometry args={[0.7, 0.7, 0.06]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 1.35, 0.42]}>
        <boxGeometry args={[0.45, 0.12, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 1.35, 0.45]}>
        <boxGeometry args={[0.12, 0.45, 0.05]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <pointLight position={[0, 1.6, 0.6]} intensity={1.4} distance={10} color="#4ade80" />
      <Html position={[0, 2.5, 0]} center distanceFactor={18}>
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            border: "1px solid #22c55e",
            borderRadius: "6px",
            padding: "4px 10px",
            color: "#bbf7d0",
            fontSize: "12px",
            fontWeight: 800,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          MED STATION [F] ({MED_STATION.price} PTS)
        </div>
      </Html>
    </group>
  );
}

function WallBuyRacks() {
  return (
    <group>
      {WALL_BUYS.map((buy) => {
        const price = ZOMBIE_SHOP.weaponPrices[buy.weapon] ?? 0;
        return (
          <group key={buy.weapon} position={[buy.x, 0, buy.z]}>
            <mesh position={[0, 1.35, 0]} castShadow>
              <boxGeometry args={[1.6, 0.7, 0.18]} />
              <meshStandardMaterial color="#111827" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, 1.38, 0.12]} rotation={[0, 0, 0.15]}>
              <boxGeometry args={[1.15, 0.14, 0.14]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0.35, 1.28, 0.12]}>
              <boxGeometry args={[0.35, 0.28, 0.12]} />
              <meshStandardMaterial color="#e5e7eb" metalness={0.7} roughness={0.3} />
            </mesh>
            <pointLight position={[0, 1.6, 0.4]} intensity={0.8} distance={6} color="#fbbf24" />
            <Html position={[0, 2.05, 0]} center distanceFactor={18}>
              <div
                style={{
                  backgroundColor: "rgba(0,0,0,0.85)",
                  border: "1px solid #fbbf24",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#fde68a",
                  fontSize: "11px",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {buy.weapon.toUpperCase()} [F] ({price.toLocaleString()} PTS)
              </div>
            </Html>
          </group>
        );
      })}
    </group>
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

  const wallHeight = 7;
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

// ─── 1. Safe House (Spawn Area) ─────────────────────────────────────
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
        emissiveIntensity: 1.5,
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

      {/* Left Wall (West) with doorway opening at z = 5 */}
      <RigidBody type="fixed" position={[-15, 2.5, -5]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 5, 10]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.5, 5]} />
      </RigidBody>
      {/* West Doorway header */}
      <RigidBody type="fixed" position={[-15, 4.0, 5]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 2, 4]} />
        </mesh>
        <CuboidCollider args={[0.5, 1.0, 2]} />
      </RigidBody>

      {/* Right Wall (East) with doorway opening at z = 5 */}
      <RigidBody type="fixed" position={[15, 2.5, -5]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 5, 10]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.5, 5]} />
      </RigidBody>
      {/* East Doorway header */}
      <RigidBody type="fixed" position={[15, 4.0, 5]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[1, 2, 4]} />
        </mesh>
        <CuboidCollider args={[0.5, 1.0, 2]} />
      </RigidBody>

      {/* Front Wall (South toward Courtyard) with center archway */}
      <RigidBody type="fixed" position={[-10, 2.5, 10]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[10, 5, 1]} />
        </mesh>
        <CuboidCollider args={[5, 2.5, 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[10, 2.5, 10]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[10, 5, 1]} />
        </mesh>
        <CuboidCollider args={[5, 2.5, 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[0, 4.0, 10]} colliders={false}>
        <mesh castShadow receiveShadow material={concreteMat}>
          <boxGeometry args={[10, 2, 1]} />
        </mesh>
        <CuboidCollider args={[5, 1.0, 0.5]} />
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
      <pointLight position={[0, 3.5, -2]} intensity={2.0} distance={25} color="#ffd8a8" />
    </group>
  );
}

// ─── 2. East Wing (Warehouse & Cargo Depot) ──────────────────────────
function EastWingWarehouse() {
  const containerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e3a8a",
        roughness: 0.6,
        metalness: 0.5,
      }),
    []
  );
  const containerMat2 = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#991b1b",
        roughness: 0.6,
        metalness: 0.5,
      }),
    []
  );

  return (
    <group position={[25, 0, -15]}>
      {/* Shipping Containers forming Warehouse Walls & Chokepoints */}
      <RigidBody type="fixed" position={[0, 1.5, -10]} colliders={false}>
        <mesh castShadow receiveShadow material={containerMat}>
          <boxGeometry args={[16, 3, 3]} />
        </mesh>
        <CuboidCollider args={[8, 1.5, 1.5]} />
      </RigidBody>

      <RigidBody type="fixed" position={[8, 1.5, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={containerMat2}>
          <boxGeometry args={[3, 3, 16]} />
        </mesh>
        <CuboidCollider args={[1.5, 1.5, 8]} />
      </RigidBody>

      {/* Stacked Cargo Crates */}
      <RigidBody type="fixed" position={[-4, 1.0, 2]} colliders={false}>
        <mesh castShadow receiveShadow material={containerMat}>
          <boxGeometry args={[2.5, 2.0, 2.5]} />
        </mesh>
        <CuboidCollider args={[1.25, 1.0, 1.25]} />
      </RigidBody>

      {/* Industrial Work Light */}
      <pointLight position={[0, 4.0, 0]} intensity={1.5} distance={20} color="#60a5fa" />
    </group>
  );
}

// ─── 3. West Wing (Barracks & Training Loops) ────────────────────────
function WestWingBarracks() {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#334155",
        roughness: 0.8,
        metalness: 0.2,
      }),
    []
  );

  return (
    <group position={[-25, 0, -15]}>
      {/* L-Shaped Barracks Perimeter */}
      <RigidBody type="fixed" position={[0, 2.0, -10]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[16, 4, 1]} />
        </mesh>
        <CuboidCollider args={[8, 2.0, 0.5]} />
      </RigidBody>

      <RigidBody type="fixed" position={[-8, 2.0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[1, 4, 18]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.0, 9]} />
      </RigidBody>

      {/* Interior Dividing Partition for Kiting Loop */}
      <RigidBody type="fixed" position={[0, 1.5, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={wallMat}>
          <boxGeometry args={[8, 3, 0.8]} />
        </mesh>
        <CuboidCollider args={[4, 1.5, 0.4]} />
      </RigidBody>

      {/* Interior Barracks Light */}
      <pointLight position={[-2, 3.5, 2]} intensity={1.5} distance={20} color="#f59e0b" />
    </group>
  );
}

// ─── 4. Armory Central Hub (Pack-a-Punch Fort) ──────────────────────
function ArmoryHub() {
  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        roughness: 0.7,
        metalness: 0.5,
      }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Fortified Octagonal/Square Chamber Walls around Pack-a-Punch */}
      {/* North Archway Doorway */}
      <RigidBody type="fixed" position={[-4.5, 2.0, -6]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[3, 4, 1]} />
        </mesh>
        <CuboidCollider args={[1.5, 2.0, 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[4.5, 2.0, -6]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[3, 4, 1]} />
        </mesh>
        <CuboidCollider args={[1.5, 2.0, 0.5]} />
      </RigidBody>

      {/* South Archway Doorway */}
      <RigidBody type="fixed" position={[-4.5, 2.0, 6]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[3, 4, 1]} />
        </mesh>
        <CuboidCollider args={[1.5, 2.0, 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[4.5, 2.0, 6]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[3, 4, 1]} />
        </mesh>
        <CuboidCollider args={[1.5, 2.0, 0.5]} />
      </RigidBody>

      {/* East & West Walls */}
      <RigidBody type="fixed" position={[6, 2.0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[1, 4, 8]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.0, 4]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-6, 2.0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={steelMat}>
          <boxGeometry args={[1, 4, 8]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.0, 4]} />
      </RigidBody>
    </group>
  );
}

// ─── 5. Watch Tower (2-Story Vertical Sniper Platform) ───────────────
function WatchTower() {
  const steelTrussMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#475569",
        roughness: 0.5,
        metalness: 0.8,
      }),
    []
  );

  return (
    <group position={[25, 0, 25]}>
      {/* 4 Steel Support Pillars */}
      <RigidBody type="fixed" position={[-2.5, 2.5, -2.5]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
        </mesh>
        <CuboidCollider args={[0.2, 2.5, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[2.5, 2.5, -2.5]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
        </mesh>
        <CuboidCollider args={[0.2, 2.5, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-2.5, 2.5, 2.5]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
        </mesh>
        <CuboidCollider args={[0.2, 2.5, 0.2]} />
      </RigidBody>
      <RigidBody type="fixed" position={[2.5, 2.5, 2.5]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <cylinderGeometry args={[0.2, 0.2, 5, 8]} />
        </mesh>
        <CuboidCollider args={[0.2, 2.5, 0.2]} />
      </RigidBody>

      {/* 2nd Floor Elevated Deck */}
      <RigidBody type="fixed" position={[0, 4.8, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <boxGeometry args={[6, 0.4, 6]} />
        </mesh>
        <CuboidCollider args={[3, 0.2, 3]} />
      </RigidBody>

      {/* Walkable Stairs Ramp */}
      <RigidBody type="fixed" position={[0, 2.4, -4.5]} rotation={[0.45, 0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={steelTrussMat}>
          <boxGeometry args={[2, 0.2, 6.2]} />
        </mesh>
        <CuboidCollider args={[1, 0.1, 3.1]} />
      </RigidBody>

      {/* Platform Perimeter Railings */}
      <mesh position={[0, 5.5, 2.9]} material={steelTrussMat}>
        <boxGeometry args={[5.8, 1.0, 0.1]} />
      </mesh>
      <mesh position={[-2.9, 5.5, 0]} material={steelTrussMat}>
        <boxGeometry args={[0.1, 1.0, 5.8]} />
      </mesh>
      <mesh position={[2.9, 5.5, 0]} material={steelTrussMat}>
        <boxGeometry args={[0.1, 1.0, 5.8]} />
      </mesh>

      {/* Tower Spotlight */}
      <pointLight position={[0, 6.5, 0]} intensity={2.5} distance={30} color="#f8fafc" />
    </group>
  );
}

// ─── 6. Underground Bunker (Defensive Dead-End) ──────────────────────
function UndergroundBunker() {
  const bunkerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e293b",
        roughness: 0.9,
        metalness: 0.3,
      }),
    []
  );

  return (
    <group position={[-25, 0, 25]}>
      {/* Bunker Concrete Shell */}
      <RigidBody type="fixed" position={[0, 2.0, 6]} colliders={false}>
        <mesh castShadow receiveShadow material={bunkerMat}>
          <boxGeometry args={[12, 4, 1]} />
        </mesh>
        <CuboidCollider args={[6, 2.0, 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" position={[-6, 2.0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={bunkerMat}>
          <boxGeometry args={[1, 4, 12]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.0, 6]} />
      </RigidBody>
      <RigidBody type="fixed" position={[6, 2.0, 0]} colliders={false}>
        <mesh castShadow receiveShadow material={bunkerMat}>
          <boxGeometry args={[1, 4, 12]} />
        </mesh>
        <CuboidCollider args={[0.5, 2.0, 6]} />
      </RigidBody>

      {/* Heavy Steel Blast Door Header */}
      <RigidBody type="fixed" position={[0, 3.5, -6]} colliders={false}>
        <mesh castShadow receiveShadow material={bunkerMat}>
          <boxGeometry args={[12, 1.5, 1]} />
        </mesh>
        <CuboidCollider args={[6, 0.75, 0.5]} />
      </RigidBody>

      {/* Bunker Roof */}
      <RigidBody type="fixed" position={[0, 4.2, 0]} colliders={false}>
        <mesh receiveShadow material={bunkerMat}>
          <boxGeometry args={[13, 0.4, 13]} />
        </mesh>
        <CuboidCollider args={[6.5, 0.2, 6.5]} />
      </RigidBody>

      {/* Hazard Warning Amber Light */}
      <pointLight position={[0, 3.0, 0]} intensity={1.8} distance={18} color="#ea580c" />
    </group>
  );
}

// ─── 7. Helipad (Extraction Zone at z: 30) ───────────────────────────
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
        emissiveIntensity: isLit ? 1.2 : 0.4,
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
    <group position={[0, 0.05, 30]}>
      {/* Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={padMat}>
        <circleGeometry args={[12, 32]} />
      </mesh>
      {/* H marking ring */}
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
      <Html position={[0, 1.3, 0]} center distanceFactor={18}>
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            border: "1px solid #f59e0b",
            borderRadius: "4px",
            padding: "2px 8px",
            color: "#fde68a",
            fontSize: "10px",
            fontWeight: 800,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          AMMO [F]
        </div>
      </Html>
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
      {/* Gold Trim */}
      <mesh position={[0, 0.4, 0.51]} material={trimMat}>
        <boxGeometry args={[1.8, 0.1, 0.05]} />
      </mesh>
      <mesh position={[0, 0.4, -0.51]} material={trimMat}>
        <boxGeometry args={[1.8, 0.1, 0.05]} />
      </mesh>
      {/* Glowing Core */}
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
  const perks = PERK_MACHINE_POSITIONS.map((machine) => ({
    id: machine.perk,
    name: machine.perk.toUpperCase(),
    color:
      machine.perk === "juggernog"
        ? "#dc2626"
        : machine.perk === "speedcola"
          ? "#16a34a"
          : machine.perk === "quickrevive"
            ? "#0284c7"
            : "#ea580c",
    pos: [machine.x, 0, machine.z] as [number, number, number],
    price: ZOMBIE_SHOP.perks[machine.perk].price,
  }));

  return (
    <group>
      {perks.map((p) => (
        <group key={p.id} position={p.pos}>
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
              🥤 {p.name} [F] ({p.price} PTS)
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
        color: "#7f1d1d",
        emissive: "#dc2626",
        emissiveIntensity: 0.55,
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
            <mesh position={[0, 1.6, 0]} material={barrierMat}>
              <boxGeometry args={[4.2, 3.2, 0.35]} />
            </mesh>
            <mesh position={[-1.6, 1.6, 0.22]}>
              <boxGeometry args={[0.28, 2.6, 0.12]} />
              <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[1.6, 1.6, 0.22]}>
              <boxGeometry args={[0.28, 2.6, 0.12]} />
              <meshStandardMaterial color="#facc15" emissive="#eab308" emissiveIntensity={0.8} />
            </mesh>
            <CuboidCollider args={[2.1, 1.6, 0.2]} position={[0, 1.6, 0]} />
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
      <ArcadeZoneFloors />
      <ArenaBoundary />
      <SafeHouse />
      <EastWingWarehouse />
      <WestWingBarracks />
      <ArmoryHub />
      <WatchTower />
      <UndergroundBunker />
      <Helipad />
      <InteractiveBarricades />
      <MysteryBoxStation />
      <PackAPunchStation />
      <PerkVendingMachines />
      <MedStation />
      <WallBuyRacks />
      <ArcadeProps />
      <AreaGates />
      {AMMO_CRATE_POSITIONS.map((crate) => (
        <AmmoCrate key={`${crate.x},${crate.z}`} position={[crate.x, 0, crate.z]} />
      ))}
      <SpecialStationLights />
      <PerimeterLights />
    </group>
  );
}
