import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { zombieEngine, zombieEvents, type ZombieEvent } from "./ZombieEngine";
import {
  zombieVisualScale,
  ZOMBIE_BODY_HEX,
  ZOMBIE_PANTS_HEX,
  ZOMBIE_SKIN_HEX,
} from "./zombieVisual";

const MAX = 64;
const BLOOD_POOL_SIZE = 48;

interface BloodParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const _root = new THREE.Object3D();
const _local = new THREE.Object3D();
const _combined = new THREE.Matrix4();

function setPart(
  mesh: THREE.InstancedMesh,
  i: number,
  x: number,
  z: number,
  yaw: number,
  scale: number,
  lx: number,
  ly: number,
  lz: number,
  rotX: number,
) {
  _root.position.set(x, 0, z);
  _root.rotation.set(0, yaw, 0);
  _root.scale.set(scale, scale, scale);
  _root.updateMatrix();
  _local.position.set(lx, ly, lz);
  _local.rotation.set(rotX, 0, 0);
  _local.scale.set(1, 1, 1);
  _local.updateMatrix();
  _combined.multiplyMatrices(_root.matrix, _local.matrix);
  mesh.setMatrixAt(i, _combined);
}

export function InstancedZombieRenderer() {
  const torsoRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const eyesRef = useRef<THREE.InstancedMesh>(null);
  const armLRef = useRef<THREE.InstancedMesh>(null);
  const armRRef = useRef<THREE.InstancedMesh>(null);
  const legLRef = useRef<THREE.InstancedMesh>(null);
  const legRRef = useRef<THREE.InstancedMesh>(null);
  const bloodGroup = useRef<THREE.Group>(null);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const armGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.14, 0.62, 0.14);
    g.translate(0, -0.31, 0);
    return g;
  }, []);

  const legGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.18, 0.62, 0.18);
    g.translate(0, -0.31, 0);
    return g;
  }, []);

  const eyesGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.22, 0.06, 0.04);
    return g;
  }, []);

  const hitFlash = useRef(new Map<string, number>());
  const bloodParticles = useRef<BloodParticle[]>([]);
  const bloodPool = useRef<THREE.Mesh[]>([]);

  // Pre-initialize instance colors and disable frustum culling to prevent invisible zombies
  useEffect(() => {
    const meshes = [
      torsoRef.current,
      headRef.current,
      eyesRef.current,
      armLRef.current,
      armRRef.current,
      legLRef.current,
      legRRef.current,
    ];
    for (const mesh of meshes) {
      if (mesh) {
        mesh.frustumCulled = false;
        if (!mesh.instanceColor) {
          const colors = new Float32Array(MAX * 3);
          for (let i = 0; i < MAX * 3; i++) colors[i] = 1;
          mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => { m.needsUpdate = true; });
          } else {
            mesh.material.needsUpdate = true;
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    const geo = new THREE.SphereGeometry(0.05, 5, 5);
    for (let i = 0; i < BLOOD_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xaa1111, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      bloodPool.current.push(mesh);
      bloodGroup.current?.add(mesh);
    }
    return () => {
      bloodPool.current.forEach(m => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      bloodPool.current = [];
    };
  }, []);

  useEffect(() => {
    const handler = (ev: ZombieEvent) => {
      if (ev.type !== "zombieHit") return;
      hitFlash.current.set(ev.id, performance.now());
      spawnBlood(ev.x, ev.y, ev.z);
    };
    zombieEvents.on(handler);
    return () => zombieEvents.off(handler);
  }, []);

  const spawnBlood = (x: number, y: number, z: number) => {
    for (let i = 0; i < 5; i++) {
      const mesh = bloodPool.current.pop();
      if (!mesh) break;
      mesh.position.set(x + (Math.random() - 0.5) * 0.12, y, z + (Math.random() - 0.5) * 0.12);
      mesh.visible = true;
      bloodParticles.current.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.8 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.25,
      });
    }
  };

  useFrame((_, dt) => {
    const torso = torsoRef.current;
    const head = headRef.current;
    const eyes = eyesRef.current;
    const armL = armLRef.current;
    const armR = armRRef.current;
    const legL = legLRef.current;
    const legR = legRRef.current;
    if (!torso || !head || !eyes || !armL || !armR || !legL || !legR) return;

    const zombies = zombieEngine.getZombies();
    const now = performance.now();
    let i = 0;

    for (const z of zombies) {
      if (i >= MAX || z.isDead) continue;
      const s = zombieVisualScale(z.type);
      const swing = z.isAttacking ? Math.sin(z.animTime * 10) * 0.7 : Math.sin(z.animTime * 7.5) * 0.55;
      const yaw = z.rotationY;

      setPart(torso, i, z.x, z.z, yaw, s, 0, 0.86, 0, 0);
      setPart(head, i, z.x, z.z, yaw, s, 0, 1.42, 0, 0);
      setPart(eyes, i, z.x, z.z, yaw, s, 0, 1.44, 0.165, 0);
      setPart(armL, i, z.x, z.z, yaw, s, -0.32, 1.16, 0, swing);
      setPart(armR, i, z.x, z.z, yaw, s, 0.32, 1.16, 0, -swing);
      setPart(legL, i, z.x, z.z, yaw, s, -0.12, 0.65, 0, z.isAttacking ? 0.05 : -swing);
      setPart(legR, i, z.x, z.z, yaw, s, 0.12, 0.65, 0, z.isAttacking ? 0.05 : swing);

      const flashing = now - (hitFlash.current.get(z.id) ?? 0) < 90;
      if (flashing) {
        tempColor.setHex(0xffffff);
        torso.setColorAt(i, tempColor);
        head.setColorAt(i, tempColor);
        eyes.setColorAt(i, tempColor);
        armL.setColorAt(i, tempColor);
        armR.setColorAt(i, tempColor);
        legL.setColorAt(i, tempColor);
        legR.setColorAt(i, tempColor);
      } else {
        tempColor.setHex(ZOMBIE_BODY_HEX[z.type]);
        torso.setColorAt(i, tempColor);
        armL.setColorAt(i, tempColor);
        armR.setColorAt(i, tempColor);
        tempColor.setHex(ZOMBIE_SKIN_HEX[z.type]);
        head.setColorAt(i, tempColor);
        tempColor.setHex(z.type === "boss" ? 0xff0044 : z.type === "tank" ? 0xff4400 : 0xff1111);
        eyes.setColorAt(i, tempColor);
        tempColor.setHex(ZOMBIE_PANTS_HEX[z.type]);
        legL.setColorAt(i, tempColor);
        legR.setColorAt(i, tempColor);
      }
      i++;
    }

    for (const mesh of [torso, head, eyes, armL, armR, legL, legR]) {
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    for (let b = bloodParticles.current.length - 1; b >= 0; b--) {
      const p = bloodParticles.current[b];
      p.life += dt;
      p.velocity.y -= 11 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.mesh.position.y < 0.04) {
        p.mesh.position.y = 0.04;
        p.velocity.y *= -0.2;
        p.velocity.x *= 0.45;
        p.velocity.z *= 0.45;
      }
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        bloodParticles.current.splice(b, 1);
        bloodPool.current.push(p.mesh);
      }
    }
  });

  return (
    <group>
      <instancedMesh ref={torsoRef} args={[undefined, undefined, MAX]} castShadow>
        <boxGeometry args={[0.46, 0.7, 0.26]} />
        <meshStandardMaterial roughness={0.78} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX]} castShadow>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={eyesRef} args={[eyesGeo, undefined, MAX]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={armLRef} args={[armGeo, undefined, MAX]} castShadow>
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={armRRef} args={[armGeo, undefined, MAX]} castShadow>
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={legLRef} args={[legGeo, undefined, MAX]} castShadow>
        <meshStandardMaterial roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={legRRef} args={[legGeo, undefined, MAX]} castShadow>
        <meshStandardMaterial roughness={0.82} />
      </instancedMesh>
      <group ref={bloodGroup} />
    </group>
  );
}
