import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZombieType } from "../../stores/useZombieStore";
import { zombieEngine } from "./ZombieEngine";

const COLORS: Record<ZombieType, number> = {
  walker: 0x5a7a28, runner: 0xc45c18, tank: 0x3d5a5a,
  spitter: 0x6f9a2a, exploder: 0xc9b22a, boss: 0xb01010,
};
const MAX = 100;

export function InstancedZombieRenderer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevCountRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-build color array — only rebuilt when new zombie type appears
  const colorArray = useMemo(() => {
    const arr = new Float32Array(MAX * 3);
    const c = new THREE.Color();
    for (let i = 0; i < MAX; i++) {
      c.setHex(COLORS.walker);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, []);

  const coloredRef = useRef(new Set<number>());

  useFrame(() => {
    if (!meshRef.current) return;
    // Read directly from engine — NO Zustand re-render
    const zombies = zombieEngine.getZombies();
    let i = 0;
    const newColored = new Set<number>();
    for (const z of zombies) {
      if (i >= MAX || z.isDead) continue;
      const s = z.type === "tank" ? 1.4 : z.type === "boss" ? 2.0 : 1.0;
      dummy.position.set(z.x, z.y + 0.75, z.z);
      dummy.rotation.y = z.rotationY;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      newColored.add(i);

      if (!coloredRef.current.has(i)) {
        const c = new THREE.Color(COLORS[z.type]);
        colorArray[i * 3] = c.r;
        colorArray[i * 3 + 1] = c.g;
        colorArray[i * 3 + 2] = c.b;
      }
      i++;
    }
    coloredRef.current = newColored;
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (i !== prevCountRef.current && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    prevCountRef.current = i;
  });

  useEffect(() => {
    if (!meshRef.current) return;
    const c = new THREE.Color();
    for (let i = 0; i < MAX; i++) {
      c.setHex(COLORS.walker);
      meshRef.current.setColorAt(i, c);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]}>
      <boxGeometry args={[0.6, 1.5, 0.4]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
