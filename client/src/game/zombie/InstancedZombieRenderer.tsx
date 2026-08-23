import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useZombieStore, ZombieType } from "../../stores/useZombieStore";

const COLORS: Record<ZombieType, number> = {
  walker: 0x5a7a28, runner: 0xc45c18, tank: 0x3d5a5a,
  spitter: 0x6f9a2a, exploder: 0xc9b22a, boss: 0xb01010,
};
const MAX = 100;

export function InstancedZombieRenderer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const zombies = useZombieStore(s => s.zombies);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (const z of zombies) {
      if (i >= MAX || z.isDead) continue;
      const s = z.type === "tank" ? 1.4 : z.type === "boss" ? 2.0 : 1.0;
      dummy.position.set(z.x, z.y + 0.75, z.z);
      dummy.rotation.y = z.rotationY;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      color.setHex(COLORS[z.type]);
      meshRef.current.setColorAt(i, color);
      i++;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]}>
      <boxGeometry args={[0.6, 1.5, 0.4]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
