import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { StaticBox, FloorZone } from "../map/MapHelpers";
import { StaticTarget } from "./StaticTarget";

// Arena footprint: X [-20, 20], Z [-46, 10] => 40 x 56 m
export const TRAINING_ARENA = {
  minX: -20,
  maxX: 20,
  minZ: -46,
  maxZ: 10,
  wallHeight: 6,
  /** Firing line the distance markers are measured from */
  firingLineZ: 0,
  /** Flat wall used by recoil practice, 25 m from the firing line */
  recoilWallZ: -25,
  spawn: { x: 0, z: 6 },
} as const;

const WIDTH = TRAINING_ARENA.maxX - TRAINING_ARENA.minX;
const DEPTH = TRAINING_ARENA.maxZ - TRAINING_ARENA.minZ;
const CENTER_Z = (TRAINING_ARENA.minZ + TRAINING_ARENA.maxZ) / 2;

const COLORS = {
  floor: "#22262e",
  gridLine: "#333c4c",
  wall: "#2b3240",
  accent: "#38bdf8",
  target: "#f97316",
} as const;

const DISTANCE_MARKS = [5, 10, 15, 20, 25, 30];

// Single canvas texture tiled across the floor keeps the grid to one draw call.
function makeGridTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(WIDTH, DEPTH);
  return tex;
}

const labelCache = new Map<string, THREE.Texture>();

function makeLabelTexture(label: string): THREE.Texture {
  const cached = labelCache.get(label);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 8;
    ctx.strokeText(label, 128, 64);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(label, 128, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  labelCache.set(label, tex);
  return tex;
}

function DistanceLabel({ label, z }: { label: string; z: number }) {
  const texture = useMemo(() => makeLabelTexture(label), [label]);
  return (
    <mesh position={[-3.2, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.8, 0.9]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Floor() {
  const gridTexture = useMemo(() => makeGridTexture(), []);

  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.5, CENTER_Z]}>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshStandardMaterial map={gridTexture} roughness={0.9} metalness={0.05} />
      </mesh>
      <CuboidCollider args={[WIDTH / 2, 0.5, DEPTH / 2]} />
    </RigidBody>
  );
}

function Perimeter() {
  const h = TRAINING_ARENA.wallHeight;
  return (
    <group name="training_perimeter">
      {/* Far wall */}
      <StaticBox
        position={[0, h / 2, TRAINING_ARENA.minZ - 0.25]}
        size={[WIDTH + 1, h, 0.5]}
        color={COLORS.wall}
        materialType="concrete"
      />
      {/* Wall behind the spawn */}
      <StaticBox
        position={[0, h / 2, TRAINING_ARENA.maxZ + 0.25]}
        size={[WIDTH + 1, h, 0.5]}
        color={COLORS.wall}
        materialType="concrete"
      />
      {/* Side walls */}
      <StaticBox
        position={[TRAINING_ARENA.minX - 0.25, h / 2, CENTER_Z]}
        size={[0.5, h, DEPTH]}
        color={COLORS.wall}
        materialType="concrete"
      />
      <StaticBox
        position={[TRAINING_ARENA.maxX + 0.25, h / 2, CENTER_Z]}
        size={[0.5, h, DEPTH]}
        color={COLORS.wall}
        materialType="concrete"
      />
    </group>
  );
}

function FiringLine() {
  return (
    <group name="training_firing_line">
      {/* Firing line across the arena */}
      <FloorZone
        position={[0, 0.02, TRAINING_ARENA.firingLineZ]}
        size={[WIDTH - 1, 0.25]}
        color={COLORS.accent}
        opacity={0.5}
      />
      {/* Centre lane guides, kept clear of targets so spray patterns read cleanly */}
      <FloorZone position={[-2, 0.015, -15]} size={[0.1, 32]} color="#ffffff" opacity={0.07} />
      <FloorZone position={[2, 0.015, -15]} size={[0.1, 32]} color="#ffffff" opacity={0.07} />

      {/* Spawn pad */}
      <FloorZone
        position={[TRAINING_ARENA.spawn.x, 0.02, TRAINING_ARENA.spawn.z]}
        size={[4, 4]}
        color={COLORS.accent}
        opacity={0.14}
      />

      {DISTANCE_MARKS.map((d) => (
        <group key={d}>
          <FloorZone
            position={[0, 0.02, TRAINING_ARENA.firingLineZ - d]}
            size={[3, 0.12]}
            color="#94a3b8"
            opacity={0.45}
          />
          <DistanceLabel label={`${d}M`} z={TRAINING_ARENA.firingLineZ - d} />
        </group>
      ))}
    </group>
  );
}

function RecoilWall() {
  const z = TRAINING_ARENA.recoilWallZ;
  const faceZ = z + 0.35;

  return (
    <group name="training_recoil_wall">
      <StaticBox
        position={[0, 3, z]}
        size={[14, 6, 0.6]}
        color={COLORS.wall}
        materialType="concrete"
      />

      {/* Aim dot at eye height */}
      <mesh position={[0, 1.6, faceZ]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Vertical guide showing how far the spray climbs */}
      <mesh position={[0, 3.3, faceZ - 0.005]}>
        <planeGeometry args={[0.03, 3.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>

      {/* Height ticks every 0.5 m above the aim dot */}
      {[2.1, 2.6, 3.1, 3.6, 4.1, 4.6].map((y) => (
        <mesh key={y} position={[0, y, faceZ - 0.005]}>
          <planeGeometry args={[0.5, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
        </mesh>
      ))}
    </group>
  );
}

// Symmetric cover so both halves of the bot zone play the same.
const BOT_COVER: Array<{ x: number; z: number; height: number }> = [
  { x: 5, z: -16, height: 1.2 },
  { x: 11, z: -16, height: 1.8 },
  { x: 5, z: -24, height: 1.8 },
  { x: 11, z: -24, height: 1.2 },
  { x: 5, z: -32, height: 1.2 },
  { x: 11, z: -32, height: 1.8 },
];

function BotZone() {
  return (
    <group name="training_bot_zone">
      {BOT_COVER.flatMap((c) =>
        [-1, 1].map((side) => (
          <StaticBox
            key={`${c.x}-${c.z}-${side}`}
            position={[c.x * side, c.height / 2, c.z]}
            size={[2, c.height, 1.2]}
            color="#39404e"
            materialType="concrete"
          />
        ))
      )}
      <FloorZone position={[0, 0.015, -27]} size={[WIDTH - 2, 0.1]} color={COLORS.target} opacity={0.12} />
    </group>
  );
}

interface TrainingArenaProps {
  mode: "aim" | "recoil";
}

export function TrainingArena({ mode }: TrainingArenaProps) {
  return (
    <group name="training_arena">
      {/* Single lighting rig for the whole training scene */}
      <ambientLight intensity={0.6} color="#ffeedd" />
      <directionalLight
        castShadow
        position={[14, 26, 6]}
        intensity={1.15}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={16}
        shadow-camera-bottom={-50}
      />
      <directionalLight position={[-16, 14, -30]} intensity={0.28} />

      <Floor />
      <Perimeter />
      <FiringLine />

      {/* Warm-up dummies flanking the centre lane, present in both modes */}
      <StaticTarget id="dummy-l-10" position={[-6, 0, -10]} />
      <StaticTarget id="dummy-r-10" position={[6, 0, -10]} />

      {mode === "recoil" && (
        <>
          <RecoilWall />
          <StaticTarget id="dummy-l-20" position={[-6, 0, -20]} />
          <StaticTarget id="dummy-r-20" position={[6, 0, -20]} />
        </>
      )}

      {mode === "aim" && (
        <>
          <BotZone />
          <StaticTarget id="dummy-l-30" position={[-6, 0, -30]} />
          <StaticTarget id="dummy-r-30" position={[6, 0, -30]} />
        </>
      )}
    </group>
  );
}
