import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { useGameStore } from "../../stores/useGameStore";
import { useAimStore } from "../../stores/useAimStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { MAP_BOUNDARY, MAP_OBSTACLES } from "@cs-game/shared";
import { SURVIVAL_BOUNDS, pushOutSurvival } from "../zombie/survivalLayout";

const WALK_SPEED = 5.4;
const SPRINT_SPEED = 8.4;
const PLAYER_RADIUS = 0.55;

const BOUNDS_TRAINING = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };
const BOUNDS_CONTAINER = { minX: MAP_BOUNDARY.minX + 0.8, maxX: MAP_BOUNDARY.maxX - 0.8, minZ: MAP_BOUNDARY.minZ + 0.8, maxZ: MAP_BOUNDARY.maxZ - 0.8 };

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
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0);
  const yawTargetRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const activeEngine = engineRef?.current ?? zombieEngine;

  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const armRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Mesh>(null);

  const getBounds = () => {
    if (mode === "training") return BOUNDS_TRAINING;
    if (mode === "offline5v5") return BOUNDS_CONTAINER;
    return SURVIVAL_BOUNDS;
  };

  useFrame((_, dt) => {
    const input = getInput();
    useGameStore.getState().setLastInput({
      forward: input.forward, backward: input.backward, left: input.left, right: input.right,
      sprint: input.sprint, slide: false, airborne: false,
    });

    if (isDead) return;

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
    yawRef.current += deltaYaw * (1 - Math.exp(-16 * dt));

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

    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, b.minX, b.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, b.minZ, b.maxZ);

    if (mode === "zombie") {
      const pushed = pushOutSurvival(posRef.current.x, posRef.current.z, PLAYER_RADIUS);
      posRef.current.x = pushed.x;
      posRef.current.z = pushed.z;
    } else if (mode === "offline5v5" || mode === "training") {
      const pushed = pushOutOfObstacles(posRef.current.x, posRef.current.z);
      posRef.current.x = pushed.x;
      posRef.current.z = pushed.z;
    }

    activeEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    const camLag = 1 - Math.exp(-9 * dt);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, camLag);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 22, camLag);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 11, camLag);
    camera.lookAt(posRef.current.x, 0.45, posRef.current.z);

    const sin = Math.sin(yawRef.current);
    const cos = Math.cos(yawRef.current);
    _tOrigin.set(
      posRef.current.x + sin * 0.55,
      0.9,
      posRef.current.z + cos * 0.55,
    );
    _tDir.set(sin, 0, cos);
    useAimStore.getState().setAim(_tOrigin, _tDir, yawRef.current, posRef.current);

    if (groupRef.current) {
      groupRef.current.position.set(posRef.current.x, 0, posRef.current.z);
      groupRef.current.rotation.y = yawRef.current;
      groupRef.current.visible = !isDead;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} position={[0, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.5, 4, 8]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.55} />
      </mesh>
      <mesh ref={headRef} position={[0, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#f0c090" roughness={0.5} />
      </mesh>
      <mesh ref={armRef} position={[0.35, 0.75, 0.3]} rotation={[0.5, 0, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.35, 4, 6]} />
        <meshStandardMaterial color="#f0c090" roughness={0.5} />
      </mesh>
      <mesh ref={weaponRef} position={[0.35, 0.7, 0.6]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.4]} />
        <meshStandardMaterial color="#222" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
