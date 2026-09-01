import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture, Billboard, Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { SURVIVAL_DOORS, SURVIVAL_BARRICADES, getSurvivalObstacles } from "./survivalLayout";
import { useZombieStore } from "../../stores/useZombieStore";

const WALL_H = 3.2;
const CRATE_H = 1.15;
const BARREL_H = 1.0;

// ─── PBR Crate (mahal) — fallback ke canvas jika texture belum ada ──
function SurvivalCrate({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  let mats: THREE.MeshStandardMaterial | null = null;
  try {
    // Coba load PBR — jika gagal, fallback ke color solid (tidak crash)
    const [albedo, normal, roughness] = useTexture([
      "/textures/crate_albedo.jpg",
      "/textures/crate_normal.jpg",
      "/textures/crate_roughness.jpg",
    ]) as unknown as [THREE.Texture, THREE.Texture, THREE.Texture];
    mats = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, roughnessMap: roughness, roughness: 0.8 });
  } catch {
    // fallback handled below
  }

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        {mats ? <primitive object={mats} attach="material" /> : <meshStandardMaterial color="#8b5a2b" roughness={0.86} metalness={0.04} />}
      </mesh>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </RigidBody>
  );
}

function makeYardTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1a1f2a";
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = "rgba(239,68,68,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = 4;
  return tex;
}

// ─── Buy Door ───────────────────────────────────────────────────
export function BuyDoor({ doorId, position, cost, toRoom }: { doorId: string; position: [number, number, number]; cost: number; toRoom: string }) {
  const unlocked = useZombieStore((s) => s.unlockedDoors.includes(doorId));
  const points = useZombieStore((s) => s.player.points);
  const unlockDoor = useZombieStore((s) => s.unlockDoor);
  if (unlocked) return null;

  const canAfford = points >= cost;

  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[4, 3, 0.2]} />
        <meshStandardMaterial color={canAfford ? "#1e3a5f" : "#222"} metalness={0.8} roughness={0.4} />
      </mesh>
      <Billboard position={[0, 1.8, 0.3]}>
        <Text fontSize={0.4} color={canAfford ? "#facc15" : "#64748b"} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          {`UNLOCK: ${cost} PTS`}
        </Text>
        <Text position={[0, -0.5, 0]} fontSize={0.25} color="#94a3b8" anchorX="center">
          {toRoom}
        </Text>
      </Billboard>
      {/* Click area */}
      <mesh
        position={[0, 0, 0.5]}
        onClick={(e) => {
          e.stopPropagation();
          unlockDoor(doorId, cost);
        }}
      >
        <boxGeometry args={[4.5, 3.5, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// ─── Barricade Window ───────────────────────────────────────────
export function BarricadeWindow({ windowId, x, z, w, h }: { windowId: string; x: number; z: number; w: number; h: number }) {
  const planks = useZombieStore((s) => s.barricades[windowId] ?? 6);
  const repair = useZombieStore((s) => s.repairBarricade);
  const isHorizontal = w > h;

  return (
    <group position={[x, 1.2, z]}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={isHorizontal ? [w, h, 0.2] : [h, w, 0.2]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.9} />
      </mesh>
      {/* Planks */}
      {Array.from({ length: planks }).map((_, i) => (
        <mesh key={i} position={[0, -h / 2 + 0.3 + i * 0.35, 0.15]}>
          <boxGeometry args={isHorizontal ? [w - 0.4, 0.25, 0.08] : [0.25, h - 0.4, 0.08]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
      ))}
      {/* Repair prompt when <6 */}
      {planks < 6 && (
        <Billboard position={[0, 1.8, 0]}>
          <Text fontSize={0.3} color="#22c55e" anchorX="center">
            [F] REPAIR (+10)
          </Text>
        </Billboard>
      )}
      {/* Click to repair */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          repair(windowId);
        }}
      >
        <boxGeometry args={[w + 1, h + 1, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// ─── Flickering Neon ────────────────────────────────────────────
export function FlickeringNeonLight({ position, color = "#a0e8ff" }: { position: [number, number, number]; color?: string }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useMemo(() => {
    let raf = 0;
    const flicker = () => {
      if (lightRef.current) {
        lightRef.current.intensity = Math.random() > 0.08 ? 1.8 : 0.15;
        // @ts-ignore emissiveIntensity on material
        if ((lightRef.current as any).material) (lightRef.current as any).material.emissiveIntensity = lightRef.current.intensity;
      }
      raf = requestAnimationFrame(flicker);
    };
    flicker();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} distance={14} intensity={1.5} castShadow />
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

// ─── Catwalk (verticality) ──────────────────────────────────────
function Catwalk() {
  return (
    <group>
      <RigidBody type="fixed" position={[0, 3, -10]} colliders={false}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[12, 0.2, 3]} />
          <meshStandardMaterial color="#2a3441" metalness={0.6} roughness={0.4} />
        </mesh>
        <CuboidCollider args={[6, 0.1, 1.5]} />
      </RigidBody>
      {/* Ramp up */}
      <RigidBody type="fixed" position={[0, 1.5, -6]} rotation={[0, 0, 0]} colliders={false}>
        <mesh castShadow rotation={[Math.PI / 6, 0, 0]}>
          <boxGeometry args={[1.2, 3, 0.2]} />
          <meshStandardMaterial color="#3a4556" metalness={0.5} />
        </mesh>
        <CuboidCollider args={[0.6, 1.5, 0.2]} rotation={[Math.PI / 6, 0, 0]} />
      </RigidBody>
    </group>
  );
}

export function SurvivalArena() {
  const yard = useMemo(() => makeYardTexture(), []);
  const unlockedDoors = useZombieStore((s) => s.unlockedDoors);
  const obstacles = useMemo(() => getSurvivalObstacles(unlockedDoors), [unlockedDoors]);
  const wave = useZombieStore((s) => s.currentWave);
  const isHorde = wave > 0 && wave % 5 === 0;

  return (
    <group>
      {/* Ground — dark horror */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0f1115" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow userData={{ skipShot: true }}>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial map={yard} roughness={0.95} />
      </mesh>

      {/* Obstacles from layout (doors aware) */}
      {obstacles.map((obs, i) => {
        const w = obs.maxX - obs.minX;
        const d = obs.maxZ - obs.minZ;
        const cx = (obs.minX + obs.maxX) / 2;
        const cz = (obs.minZ + obs.maxZ) / 2;
        if (obs.kind === "barrel") {
          return (
            <mesh key={i} position={[cx, BARREL_H / 2, cz]} castShadow receiveShadow>
              <cylinderGeometry args={[w * 0.48, w * 0.52, BARREL_H, 12]} />
              <meshStandardMaterial color="#6b3a1a" roughness={0.55} metalness={0.22} />
            </mesh>
          );
        }
        const h = obs.kind === "crate" ? CRATE_H : WALL_H;
        const isPBR = obs.kind === "crate" && Math.random() > 0.3;
        // Use PBR for 70% crates
        if (isPBR) {
          return <SurvivalCrate key={i} position={[cx, h / 2, cz]} size={[w, h, d]} />;
        }
        const color = obs.kind === "crate" ? "#3d2817" : "#1c2333";
        return (
          <mesh key={i} position={[cx, h / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={obs.kind === "crate" ? 0.9 : 0.7} metalness={obs.kind === "crate" ? 0.05 : 0.15} />
          </mesh>
        );
      })}

      {/* Buy Doors */}
      {SURVIVAL_DOORS.map((d) => (
        <BuyDoor key={d.id} doorId={d.id} position={[d.x, d.h / 2, d.z]} cost={d.cost} toRoom={d.toRoom} />
      ))}

      {/* Barricades */}
      {SURVIVAL_BARRICADES.map((b) => (
        <BarricadeWindow key={b.id} windowId={b.id} x={b.x} z={b.z} w={b.w} h={b.h} />
      ))}

      {/* Verticality */}
      <Catwalk />

      {/* Gates — spawn markers */}
      {([[0, 22.8], [0, -22.8], [22.8, 0], [-22.8, 0]] as const).map(([x, z], i) => (
        <group key={`gate-${i}`}>
          <mesh position={[x + (z === 0 ? 0 : -3.5), 1.7, z + (x === 0 ? 0 : -3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#1c2333" metalness={0.4} roughness={0.6} />
          </mesh>
          <mesh position={[x + (z === 0 ? 0 : 3.5), 1.7, z + (x === 0 ? 0 : 3.5)]} castShadow>
            <boxGeometry args={[0.55, 3.4, 0.55]} />
            <meshStandardMaterial color="#1c2333" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Horror Lighting — low ambient, flickering neon */}
      <ambientLight intensity={isHorde ? 0.08 : 0.18} color={isHorde ? "#ff1a1a" : "#0a0f1e"} />
      <hemisphereLight intensity={isHorde ? 0.1 : 0.35} color={isHorde ? "#ff0000" : "#1e293b"} groundColor="#020208" />
      <FlickeringNeonLight position={[-10, 3, 8]} color={isHorde ? "#ff0000" : "#a0e8ff"} />
      <FlickeringNeonLight position={[10, 3, -8]} color={isHorde ? "#ff0000" : "#ffcc88"} />
      <pointLight position={[0, 8, 0]} intensity={isHorde ? 0.4 : 0.9} distance={28} color={isHorde ? "#ff0000" : "#1e3a5f"} castShadow />
      {/* Decal darah (simple ring) */}
      <mesh position={[0, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.8, 16]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.35} />
      </mesh>
      <mesh position={[8, 0.02, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.2, 12]} />
        <meshBasicMaterial color="#7f1d1d" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
