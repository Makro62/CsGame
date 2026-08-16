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
};

export function StaticBox({
  position,
  size,
  color,
  materialType = "default",
  rotation = [0, 0, 0],
  receiveShadow = true,
  castShadow = true,
}: BoxProps) {
  const preset = MATERIAL_PRESETS[materialType];

  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <mesh receiveShadow={receiveShadow} castShadow={castShadow}>
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
