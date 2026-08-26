import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZombieType } from "../../stores/useZombieStore";
import { zombieEngine, zombieEvents, type ZombieEvent } from "./ZombieEngine";

const COLORS: Record<ZombieType, number> = {
  walker: 0x5a7a28, runner: 0xc45c18, tank: 0x3d5a5a,
  spitter: 0x6f9a2a, exploder: 0xc9b22a, boss: 0xb01010,
};
const HEAD_COLORS: Record<ZombieType, number> = {
  walker: 0x6a8a38, runner: 0xd46c28, tank: 0x4d6a6a,
  spitter: 0x7faa3a, exploder: 0xd9c23a, boss: 0xc02020,
};
const MAX = 100;

// Blood particle pool
const BLOOD_POOL_SIZE = 40;
interface BloodParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function InstancedZombieRenderer() {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const prevCountRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const whiteColor = useMemo(() => new THREE.Color(0xffffff), []);

  // Hit flash tracking — timestamp when zombie was last hit
  const hitFlashTimers = useRef(new Map<string, number>());

  // Persistent colored tracking
  const coloredBits = useRef(new Uint8Array(MAX));

  // Blood particles
  const bloodParticles = useRef<BloodParticle[]>([]);
  const bloodPool = useRef<THREE.Mesh[]>([]);

  // Initialize blood pool
  useEffect(() => {
    const geo = new THREE.SphereGeometry(0.06, 4, 4);
    for (let i = 0; i < BLOOD_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xcc1111 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      bloodPool.current.push(mesh);
    }
    return () => {
      bloodPool.current.forEach(m => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
    };
  }, []);

  // Listen for zombie hit events to trigger blood
  useEffect(() => {
    const handler = (ev: ZombieEvent) => {
      if (ev.type === "zombieHit") {
        // Spawn blood at a zombie's position (approximate from last known pos)
        spawnBlood();
      }
    };
    zombieEvents.on(handler);
    return () => zombieEvents.off(handler);
  }, []);

  const spawnBlood = () => {
    const zombies = zombieEngine.getZombies();
    const hitZombies = zombies.filter(z => !z.isDead);
    if (hitZombies.length === 0) return;
    const target = hitZombies[Math.floor(Math.random() * hitZombies.length)];

    for (let i = 0; i < 3; i++) {
      if (bloodPool.current.length === 0) break;
      const mesh = bloodPool.current.pop()!;
      mesh.position.set(target.x, 0.8 + Math.random() * 0.4, target.z);
      mesh.visible = true;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        1.5 + Math.random() * 2,
        (Math.random() - 0.5) * 2,
      );
      bloodParticles.current.push({ mesh, velocity, life: 0, maxLife: 0.6 + Math.random() * 0.3 });
    }
  };

  useFrame((_, dt) => {
    if (!bodyRef.current || !headRef.current) return;
    const zombies = zombieEngine.getZombies();
    const now = performance.now();
    let i = 0;

    for (const z of zombies) {
      if (i >= MAX || z.isDead) continue;
      const s = z.type === "tank" ? 1.4 : z.type === "boss" ? 2.0 : 1.0;

      // Body position — capsule center at y=0.6
      dummy.position.set(z.x, z.y + 0.6, z.z);
      dummy.rotation.y = z.rotationY;
      dummy.scale.set(s * 0.45, s * 0.6, s * 0.35);
      dummy.updateMatrix();
      bodyRef.current.setMatrixAt(i, dummy.matrix);

      // Head position — sphere on top
      dummy.position.set(z.x, z.y + 1.35 * s, z.z);
      dummy.scale.set(s * 0.25, s * 0.25, s * 0.25);
      dummy.updateMatrix();
      headRef.current.setMatrixAt(i, dummy.matrix);

      // Hit flash: white tint for 120ms after hit
      const hitTime = hitFlashTimers.current.get(z.id) ?? 0;
      const flashDuration = 120;
      const isFlashing = (now - hitTime) < flashDuration;

      if (!coloredBits.current[i] || isFlashing) {
        if (isFlashing) {
          tempColor.copy(whiteColor);
        } else {
          tempColor.setHex(COLORS[z.type]);
        }
        bodyRef.current.setColorAt(i, tempColor);
        if (isFlashing) {
          tempColor.setHex(0xffffff);
        } else {
          tempColor.setHex(HEAD_COLORS[z.type]);
        }
        headRef.current.setColorAt(i, tempColor);
        coloredBits.current[i] = 1;
      }
      i++;
    }

    // Clear leftover slots
    for (let j = i; j < prevCountRef.current && j < MAX; j++) {
      coloredBits.current[j] = 0;
    }
    bodyRef.current.count = i;
    headRef.current.count = i;
    bodyRef.current.instanceMatrix.needsUpdate = true;
    headRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true;
    prevCountRef.current = i;

    // Animate blood particles
    for (let b = bloodParticles.current.length - 1; b >= 0; b--) {
      const p = bloodParticles.current[b];
      p.life += dt;
      p.velocity.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.5;
        p.velocity.z *= 0.5;
      }
      const alpha = 1 - (p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      (p.mesh.material as THREE.MeshBasicMaterial).transparent = true;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        bloodParticles.current.splice(b, 1);
        bloodPool.current.push(p.mesh);
      }
    }
  });

  // Initialize instance colors once
  useEffect(() => {
    if (!bodyRef.current || !headRef.current) return;
    tempColor.setHex(COLORS.walker);
    const headTemp = new THREE.Color(HEAD_COLORS.walker);
    for (let i = 0; i < MAX; i++) {
      bodyRef.current.setColorAt(i, tempColor);
      headRef.current.setColorAt(i, headTemp);
    }
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    if (headRef.current.instanceColor) headRef.current.instanceColor.needsUpdate = true;
  }, [tempColor]);

  return (
    <group>
      {/* Zombie bodies — capsules */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX]} castShadow>
        <capsuleGeometry args={[0.5, 0.6, 4, 8]} />
        <meshStandardMaterial roughness={0.7} metalness={0.1} />
      </instancedMesh>
      {/* Zombie heads — spheres */}
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX]} castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>
      {/* Blood particles — managed via pool in useFrame */}
    </group>
  );
}
