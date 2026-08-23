import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { useGameStore } from "../../stores/useGameStore";
import { useAimStore } from "../../stores/useAimStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { MAP_BOUNDARY } from "@cs-game/shared";

const WALK_SPEED = 4;
const SPRINT_SPEED = 7;
const BOUNDS_TRAINING = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };
const BOUNDS_ZOMBIE = { minX: -59, maxX: 59, minZ: -59, maxZ: 59 };
const BOUNDS_L4D = { minX: -35, maxX: 35, minZ: -42, maxZ: 42 };
const BOUNDS_CONTAINER = { minX: MAP_BOUNDARY.minX + 0.8, maxX: MAP_BOUNDARY.maxX - 0.8, minZ: MAP_BOUNDARY.minZ + 0.8, maxZ: MAP_BOUNDARY.maxZ - 0.8 };

export function ZombieArcadeController({ engineRef }: { engineRef?: React.RefObject<typeof zombieEngine | null> }) {
  const { camera, pointer, raycaster } = useThree();
  const { getInput } = usePlayerInput();
  const mode = useGameStore(s=> s.mode);
  const posRef = useRef(new THREE.Vector3(0, 0, -30));
  const yawRef = useRef(0);
  const yawTargetRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const activeEngine = engineRef?.current ?? zombieEngine;

  const getBounds = () => {
    if (mode === 'l4d') return BOUNDS_L4D;
    if (mode === 'training') return BOUNDS_TRAINING;
    if (mode === 'offline5v5') return BOUNDS_CONTAINER;
    return BOUNDS_ZOMBIE;
  };

  useFrame((_, dt) => {
    const input = getInput();
    useGameStore.getState().setLastInput({
      forward: input.forward, backward: input.backward, left: input.left, right: input.right,
      sprint: input.sprint, slide: false, airborne: false
    });

    if (isDead) {
      // still update aim for spectate? freeze
      return;
    }

    // Aim at mouse position on ground with smoothing
    raycaster.setFromCamera(pointer, camera);
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(ground, hit)) {
      const dx = hit.x - posRef.current.x;
      const dz = hit.z - posRef.current.z;
      if (dx*dx + dz*dz > 0.04) yawTargetRef.current = Math.atan2(dx, dz);
    }
    // damp yaw 14 rad/s like before but smoother
    const deltaYaw = Math.atan2(Math.sin(yawTargetRef.current - yawRef.current), Math.cos(yawTargetRef.current - yawRef.current));
    yawRef.current += deltaYaw * (1 - Math.exp(-14 * dt));

    // Movement normalized + sprint
    const move = new THREE.Vector3();
    if (input.forward) move.z -= 1;
    if (input.backward) move.z += 1;
    if (input.left) move.x -= 1;
    if (input.right) move.x += 1;
    if (move.lengthSq() > 0) move.normalize();

    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    const b = getBounds();
    posRef.current.x += move.x * speed * dt;
    posRef.current.z += move.z * speed * dt;
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, b.minX, b.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, b.minZ, b.maxZ);

    // Update engine player position (offline)
    activeEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    // Camera follow top-down with lerp, look slightly ahead
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, 1 - Math.exp(-8*dt));
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 16, 1 - Math.exp(-8*dt));
    camera.lookAt(posRef.current.x, 0, posRef.current.z);

    // Broadcast aim via Zustand (no window global)
    const sin = Math.sin(yawRef.current);
    const cos = Math.cos(yawRef.current);
    const origin = posRef.current.clone().add(new THREE.Vector3(sin*0.55, 0.35, cos*0.55));
    const direction = new THREE.Vector3(sin, 0, cos);
    useAimStore.getState().setAim(origin, direction, yawRef.current, posRef.current.clone());
    // keep legacy window for compat with old ShootingSystem until migrated
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__zombieAim = {
        origin, direction, yaw: yawRef.current, pos: posRef.current.clone(),
      };
    }
  });

  return null;
}
