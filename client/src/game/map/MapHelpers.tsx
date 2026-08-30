import * as THREE from "three";
import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";

export type MaterialType = "wood" | "metal" | "concrete" | "iron" | "default";

const MATERIAL_PRESETS: Record<MaterialType, { roughness: number; metalness: number }> = {
  wood: { roughness: 0.9, metalness: 0.05 },
  metal: { roughness: 0.45, metalness: 0.65 },
  concrete: { roughness: 0.85, metalness: 0.02 },
  iron: { roughness: 0.5, metalness: 0.8 },
  default: { roughness: 0.6, metalness: 0.2 },
};

export type BoxProps = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  materialType?: MaterialType;
  rotation?: [number, number, number];
  receiveShadow?: boolean;
  castShadow?: boolean;
  skipShot?: boolean;
};

export function StaticBox({
  position,
  size,
  color,
  materialType = "default",
  rotation = [0, 0, 0],
  receiveShadow = true,
  castShadow = true,
  skipShot = false,
}: BoxProps) {
  const preset = MATERIAL_PRESETS[materialType];

  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <mesh receiveShadow={receiveShadow} castShadow={castShadow} userData={{ skipShot }}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          roughness={preset.roughness}
          metalness={preset.metalness}
        />
      </mesh>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </RigidBody>
  );
}

export type CylinderProps = {
  position: [number, number, number];
  radius: number;
  height: number;
  color: string;
  materialType?: MaterialType;
  segments?: number;
};

export function StaticCylinder({
  position,
  radius,
  height,
  color,
  materialType = "iron",
  segments = 16,
}: CylinderProps) {
  const preset = MATERIAL_PRESETS[materialType];

  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, segments]} />
        <meshStandardMaterial
          color={color}
          roughness={preset.roughness}
          metalness={preset.metalness}
        />
      </mesh>
      <CylinderCollider args={[height / 2, radius]} />
    </RigidBody>
  );
}

// ============================================================================
// Floor Zone Indicator (visual-only, no collider)
// ============================================================================

export type FloorZoneProps = {
  position: [number, number, number];
  size: [number, number];
  color: string;
  opacity?: number;
  label?: string;
};

export function FloorZone({ position, size, color, opacity = 0.25 }: FloorZoneProps) {
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow={false}
    >
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// Site Marker (ring + letter) — shared between maps
// ============================================================================

const letterCache = new Map<string, THREE.CanvasTexture>();

function siteLetterTexture(letter: string, color: string): THREE.CanvasTexture {
  const key = `${letter}:${color}`;
  const hit = letterCache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = "bold 92px Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 8;
    ctx.strokeText(letter, 64, 70);
    ctx.fillStyle = color;
    ctx.fillText(letter, 64, 70);
  }
  const tex = new THREE.CanvasTexture(canvas);
  letterCache.set(key, tex);
  return tex;
}

export type SiteMarkerProps = {
  x: number;
  z: number;
  color: string;
  letter: string;
};

export function SiteMarker({ x, z, color, letter }: SiteMarkerProps) {
  const tex = siteLetterTexture(letter, color);
  return (
    <group position={[x, 0.04, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.7, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Spawn Zone Indicator
// ============================================================================

export type SpawnZoneProps = {
  position: [number, number, number];
  color: string;
  radius?: number;
};

export function SpawnZone({ position, color, radius = 3 }: SpawnZoneProps) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={false}>
      <ringGeometry args={[radius - 0.3, radius, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}
