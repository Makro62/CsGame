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
  const tempColor = useMemo(() => new THREE.Color(), []);

  // Persistent colored tracking — reused across frames (no new Set per frame)
  const coloredBits = useRef(new Uint8Array(MAX)); // 0 = uncolored, 1 = colored

  useFrame(() => {
    if (!meshRef.current) return;
    const zombies = zombieEngine.getZombies();
    let i = 0;
    for (const z of zombies) {
      if (i >= MAX || z.isDead) continue;
      const s = z.type === "tank" ? 1.4 : z.type === "boss" ? 2.0 : 1.0;
      dummy.position.set(z.x, z.y + 0.75, z.z);
      dummy.rotation.y = z.rotationY;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Set color only on first render for this slot
      if (!coloredBits.current[i]) {
        tempColor.setHex(COLORS[z.type]);
        meshRef.current.setColorAt(i, tempColor);
        coloredBits.current[i] = 1;
      }
      i++;
    }
    // Clear leftover slots from previous frame
    for (let j = i; j < prevCountRef.current && j < MAX; j++) {
      coloredBits.current[j] = 0;
    }
    meshRef.current.count = i;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (i !== prevCountRef.current && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    prevCountRef.current = i;
  });

  // Initialize all instance colors once
  useEffect(() => {
    if (!meshRef.current) return;
    tempColor.setHex(COLORS.walker);
    for (let i = 0; i < MAX; i++) {
      meshRef.current.setColorAt(i, tempColor);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [tempColor]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]}>
      <boxGeometry args={[0.6, 1.5, 0.4]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
