import { RigidBody, CuboidCollider, CylinderCollider } from "@react-three/rapier";

export type BoxProps = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  receiveShadow?: boolean;
  castShadow?: boolean;
};

export function StaticBox({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  receiveShadow = true,
  castShadow = true,
}: BoxProps) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <mesh receiveShadow={receiveShadow} castShadow={castShadow}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
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
  segments?: number;
};

export function StaticCylinder({
  position,
  radius,
  height,
  color,
  segments = 16,
}: CylinderProps) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, segments]} />
        <meshStandardMaterial color={color} />
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
