import { RigidBody } from "@react-three/rapier";

export function Ground() {
  return (
    <RigidBody type="fixed">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[60, 40, 1]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
    </RigidBody>
  );
}
