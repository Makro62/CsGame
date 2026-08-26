import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { useGameStore } from "../../stores/useGameStore";
import { useAimStore } from "../../stores/useAimStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { MinecraftCharacter } from "./MinecraftCharacter";
import { SURVIVAL_BOUNDS, pushOutSurvival } from "../zombie/survivalLayout";

const WALK_SPEED = 5.4;
const SPRINT_SPEED = 8.4;
const PLAYER_RADIUS = 0.55;

const _tGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _tHit = new THREE.Vector3();
const _tMove = new THREE.Vector3();
const _tOrigin = new THREE.Vector3();
const _tDir = new THREE.Vector3();

export function ZombieArcadeController() {
  const { camera, pointer, raycaster } = useThree();
  const { getInput } = usePlayerInput();
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0);
  const yawTargetRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const groupRef = useRef<THREE.Group>(null);
  const motionRef = useRef({ moving: false, sprinting: false });

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
    motionRef.current.moving = lenSq > 0;
    motionRef.current.sprinting = input.sprint && lenSq > 0;

    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
    posRef.current.x += _tMove.x * speed * dt;
    posRef.current.z += _tMove.z * speed * dt;

    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, SURVIVAL_BOUNDS.minX, SURVIVAL_BOUNDS.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, SURVIVAL_BOUNDS.minZ, SURVIVAL_BOUNDS.maxZ);

    const pushed = pushOutSurvival(posRef.current.x, posRef.current.z, PLAYER_RADIUS);
    posRef.current.x = pushed.x;
    posRef.current.z = pushed.z;

    zombieEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    const camLag = 1 - Math.exp(-9 * dt);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, camLag);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 22, camLag);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 11, camLag);
    camera.lookAt(posRef.current.x, 0.45, posRef.current.z);

    const sin = Math.sin(yawRef.current);
    const cos = Math.cos(yawRef.current);
    _tOrigin.set(posRef.current.x + sin * 0.55, 0.9, posRef.current.z + cos * 0.55);
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
      <MinecraftCharacter team="CT" holdWeapon motionRef={motionRef} isDead={isDead} />
      <mesh position={[0.38, 0.82, 0.42]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.07, 0.08, 0.42]} />
        <meshStandardMaterial color="#1c1917" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
