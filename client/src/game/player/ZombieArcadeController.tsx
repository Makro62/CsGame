import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { useGameStore } from "../../stores/useGameStore";
import { useAimStore } from "../../stores/useAimStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { MAP_BOUNDARY, MAP_OBSTACLES } from "@cs-game/shared";

const WALK_SPEED = 4;
const SPRINT_SPEED = 7;
const PLAYER_RADIUS = 0.6;

// Mode-specific bounds
const BOUNDS_TRAINING = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };
const BOUNDS_ZOMBIE = { minX: -59, maxX: 59, minZ: -59, maxZ: 59 };
const BOUNDS_L4D = { minX: -35, maxX: 35, minZ: -42, maxZ: 42 };
const BOUNDS_CONTAINER = { minX: MAP_BOUNDARY.minX + 0.8, maxX: MAP_BOUNDARY.maxX - 0.8, minZ: MAP_BOUNDARY.minZ + 0.8, maxZ: MAP_BOUNDARY.maxZ - 0.8 };

// Reusable temp vectors — zero allocations per frame
const _tGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _tHit = new THREE.Vector3();
const _tMove = new THREE.Vector3();
const _tOrigin = new THREE.Vector3();
const _tDir = new THREE.Vector3();

function pushOutOfObstacles(x: number, z: number): { x: number; z: number } {
  let px = x, pz = z;
  for (const obs of MAP_OBSTACLES) {
    if (obs.material === "wood") continue;
    const cx = Math.max(obs.minX, Math.min(px, obs.maxX));
    const cz = Math.max(obs.minZ, Math.min(pz, obs.maxZ));
    const dx = px - cx, dz = pz - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < PLAYER_RADIUS && dist > 0) {
      const push = PLAYER_RADIUS - dist;
      px += (dx / dist) * push;
      pz += (dz / dist) * push;
    }
  }
  return { x: px, z: pz };
}

export function ZombieArcadeController({ engineRef }: { engineRef?: React.RefObject<typeof zombieEngine | null> }) {
  const { camera, pointer, raycaster } = useThree();
  const { getInput } = usePlayerInput();
  const mode = useGameStore(s => s.mode);
  const posRef = useRef(new THREE.Vector3(0, 0, -30));
  const yawRef = useRef(0);
  const yawTargetRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const activeEngine = engineRef?.current ?? zombieEngine;

  const getBounds = () => {
    if (mode === "l4d") return BOUNDS_L4D;
    if (mode === "training") return BOUNDS_TRAINING;
    if (mode === "offline5v5") return BOUNDS_CONTAINER;
    return BOUNDS_ZOMBIE;
  };

  useFrame((_, dt) => {
    const input = getInput();
    useGameStore.getState().setLastInput({
      forward: input.forward, backward: input.backward, left: input.left, right: input.right,
      sprint: input.sprint, slide: false, airborne: false,
    });

    if (isDead) return;

    // ── Aim at mouse on ground plane ──────────────────────────────────────
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(_tGround, _tHit)) {
      const dx = _tHit.x - posRef.current.x;
      const dz = _tHit.z - posRef.current.z;
      if (dx * dx + dz * dz > 0.04) yawTargetRef.current = Math.atan2(dx, dz);
    }
    const deltaYaw = Math.atan2(
      Math.sin(yawTargetRef.current - yawRef.current),
      Math.cos(yawTargetRef.current - yawRef.current),
    );
    yawRef.current += deltaYaw * (1 - Math.exp(-14 * dt));

    // ── Movement ──────────────────────────────────────────────────────────
    _tMove.set(0, 0, 0);
    if (input.forward) _tMove.z -= 1;
    if (input.backward) _tMove.z += 1;
    if (input.left) _tMove.x -= 1;
    if (input.right) _tMove.x += 1;
    const lenSq = _tMove.lengthSq();
    if (lenSq > 0) {
      const invLen = 1 / Math.sqrt(lenSq);
      _tMove.x *= invLen;
      _tMove.z *= invLen;
    }

    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    const b = getBounds();
    posRef.current.x += _tMove.x * speed * dt;
    posRef.current.z += _tMove.z * speed * dt;

    // Clamp to mode bounds
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, b.minX, b.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, b.minZ, b.maxZ);

    // Push out of solid obstacles (only for competitive map with MAP_OBSTACLES)
    if (mode === "offline5v5" || mode === "training") {
      const pushed = pushOutOfObstacles(posRef.current.x, posRef.current.z);
      posRef.current.x = pushed.x;
      posRef.current.z = pushed.z;
    }

    // ── Engine sync ───────────────────────────────────────────────────────
    activeEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    // ── Camera follow (exponential decay — framerate independent) ─────────
    const camLag = 1 - Math.exp(-8 * dt);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, camLag);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 16, camLag);
    camera.lookAt(posRef.current.x, 0, posRef.current.z);

    // ── Aim broadcast (zero allocations) ──────────────────────────────────
    const sin = Math.sin(yawRef.current);
    const cos = Math.cos(yawRef.current);
    _tOrigin.set(
      posRef.current.x + sin * 0.55,
      0.35,
      posRef.current.z + cos * 0.55,
    );
    _tDir.set(sin, 0, cos);
    useAimStore.getState().setAim(_tOrigin, _tDir, yawRef.current, posRef.current);
  });

  return null;
}
