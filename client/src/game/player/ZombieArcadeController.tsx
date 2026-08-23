import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { zombieEngine } from "../zombie/ZombieEngine";

const WALK_SPEED = 4;
const SPRINT_SPEED = 7;
const BOUNDS = { minX: -59, maxX: 59, minZ: -59, maxZ: 59 };

export function ZombieArcadeController({ engineRef }: { engineRef?: React.RefObject<typeof zombieEngine | null> }) {
  const { camera, pointer, raycaster } = useThree();
  const { getInput } = usePlayerInput();
  const posRef = useRef(new THREE.Vector3(0, 0, -30));
  const yawRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const activeEngine = engineRef?.current ?? zombieEngine;

  useFrame((_, dt) => {
    if (isDead) return;
    const input = getInput();

    // Aim at mouse position on ground
    raycaster.setFromCamera(pointer, camera);
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(ground, hit)) {
      const dx = hit.x - posRef.current.x;
      const dz = hit.z - posRef.current.z;
      if (dx*dx + dz*dz > 0.04) yawRef.current = Math.atan2(dx, dz);
    }

    // Movement
    const move = new THREE.Vector3();
    if (input.forward) move.z -= 1;
    if (input.backward) move.z += 1;
    if (input.left) move.x -= 1;
    if (input.right) move.x += 1;
    if (move.lengthSq() > 0) move.normalize();

    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    posRef.current.x += move.x * speed * dt;
    posRef.current.z += move.z * speed * dt;
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, BOUNDS.minX, BOUNDS.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, BOUNDS.minZ, BOUNDS.maxZ);

    // Update engine player position (offline)
    activeEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    // Camera follow top-down
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 16, 0.1);
    camera.lookAt(posRef.current.x, 0, posRef.current.z);

    // Broadcast aim for shooting system
    const sin = Math.sin(yawRef.current);
    const cos = Math.cos(yawRef.current);
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__zombieAim = {
        origin: posRef.current.clone().add(new THREE.Vector3(sin*0.55, 0.35, cos*0.55)),
        direction: new THREE.Vector3(sin, 0, cos),
        yaw: yawRef.current,
        pos: posRef.current.clone(),
      };
    }
  });

  return null;
}
