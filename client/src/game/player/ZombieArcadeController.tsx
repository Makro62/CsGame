import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  RigidBody,
  useRapier,
  RapierRigidBody,
  CapsuleCollider,
} from "@react-three/rapier";
import * as THREE from "three";
import { KinematicCharacterController } from "@dimforge/rapier3d-compat";
import { PHYSICS } from "@cs-game/shared";
import { MinecraftCharacter } from "./MinecraftCharacter";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useGameStore } from "../../stores/useGameStore";
import { useZombieNetworkStore } from "../../stores/useZombieNetworkStore";
import { localZombieEngine } from "../zombie/LocalZombieEngine";
import { zombieAim } from "../zombie/zombieAim";
import { updateAudioListener } from "../../components/AudioManager";
import { useWeaponStore } from "../../stores/useWeaponStore";

const CAPSULE_RADIUS = 0.3;
const CAPSULE_HALF_HEIGHT = 0.6;
const TOTAL_HEIGHT = (CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS) * 2;
const SPAWN: [number, number, number] = [0, TOTAL_HEIGHT / 2 + 0.05, -30];
const BOUNDS = { minX: -59, maxX: 59, minZ: -59, maxZ: 59 };
const WALK_SPEED = PHYSICS.walkSpeed as number;
const SPRINT_SPEED = PHYSICS.sprintSpeed as number;
const GRAVITY = PHYSICS.gravity as number;

const CAM_OFFSET = new THREE.Vector3(0, 18, 16);
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _desired = new THREE.Vector3();
const _currentPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _groundHit = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

function HeldWeapon() {
  const weapon = useWeaponStore((s) => s.activeWeapon);
  const color =
    weapon === "ak47" || weapon === "m4a1"
      ? "#374151"
      : weapon === "awp"
        ? "#1e3a5f"
        : weapon === "mp5"
          ? "#4b5563"
          : "#6b7280";
  const length = weapon === "awp" ? 1.05 : weapon === "deagle" || weapon === "glock" ? 0.45 : 0.75;

  return (
    <group position={[0.42, 0.95, 0.38]} rotation={[0.08, 0, 0.05]}>
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.12, length]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.08, -length * 0.15]}>
        <boxGeometry args={[0.08, 0.16, 0.14]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
}

export function ZombieArcadeController({ paused }: { paused: boolean }) {
  const { camera, pointer, raycaster } = useThree();
  const { world } = useRapier();
  const { getInput } = usePlayerInput();
  const isDead = useZombieNetworkStore((s) => s.localIsDead);

  const [initialSpawn] = useState<[number, number, number]>(() => SPAWN);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const controllerRef = useRef<KinematicCharacterController | null>(null);
  const visualRef = useRef<THREE.Group>(null);
  const aimMarkerRef = useRef<THREE.Mesh>(null);
  const initDone = useRef(false);
  const velocityY = useRef(0);
  const grounded = useRef(true);
  const lastFrame = useRef(performance.now());
  const moving = useRef(false);
  const sprinting = useRef(false);
  const motionRef = useRef({ moving: false, sprinting: false });

  useFrame(() => {
    if (!controllerRef.current) {
      controllerRef.current = world.createCharacterController(0.01);
      controllerRef.current.enableAutostep(0.5, 0.3, true);
      controllerRef.current.enableSnapToGround(1.0);
    }

    const now = performance.now();
    const dt = Math.min((now - lastFrame.current) / 1000, 0.05);
    lastFrame.current = now;

    zombieAim.paused = paused;
    if (paused || isDead) {
      motionRef.current.moving = false;
      motionRef.current.sprinting = false;
    }

    const rb = rigidBodyRef.current;
    const controller = controllerRef.current;
    if (!rb || !controller) return;

    const pos = rb.translation();
    _currentPos.set(pos.x, pos.y, pos.z);

    if (!initDone.current) {
      initDone.current = true;
      _currentPos.set(SPAWN[0], SPAWN[1], SPAWN[2]);
      rb.setNextKinematicTranslation({ x: _currentPos.x, y: _currentPos.y, z: _currentPos.z });
    }

    raycaster.setFromCamera(pointer, camera);
    const aimed = raycaster.ray.intersectPlane(GROUND_PLANE, _groundHit);
    if (aimed) {
      const dx = _groundHit.x - _currentPos.x;
      const dz = _groundHit.z - _currentPos.z;
      if (dx * dx + dz * dz > 0.04) {
        zombieAim.yaw = Math.atan2(dx, dz);
        zombieAim.aimX = _groundHit.x;
        zombieAim.aimZ = _groundHit.z;
      }
    }

    const sin = Math.sin(zombieAim.yaw);
    const cos = Math.cos(zombieAim.yaw);
    zombieAim.origin.x = _currentPos.x + sin * 0.55;
    zombieAim.origin.y = _currentPos.y + 0.35;
    zombieAim.origin.z = _currentPos.z + cos * 0.55;
    zombieAim.direction.x = sin;
    zombieAim.direction.y = 0;
    zombieAim.direction.z = cos;

    if (!paused && !isDead) {
      const input = getInput();
      _moveDir.set(0, 0, 0);
      if (input.forward) _moveDir.z -= 1;
      if (input.backward) _moveDir.z += 1;
      if (input.left) _moveDir.x -= 1;
      if (input.right) _moveDir.x += 1;
      if (_moveDir.lengthSq() > 0) _moveDir.normalize();

      const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
      moving.current = _moveDir.lengthSq() > 0.01;
      sprinting.current = moving.current && input.sprint;
      motionRef.current.moving = moving.current;
      motionRef.current.sprinting = sprinting.current;

      if (!grounded.current) {
        velocityY.current -= GRAVITY * dt;
        velocityY.current = Math.max(velocityY.current, -30);
      } else {
        velocityY.current = -2;
      }

      _desired.set(_moveDir.x * speed * dt, velocityY.current * dt, _moveDir.z * speed * dt);
      const collider = rb.collider(0);
      if (collider) controller.computeColliderMovement(collider, _desired);
      _currentPos.add(controller.computedMovement());

      _currentPos.x = THREE.MathUtils.clamp(_currentPos.x, BOUNDS.minX, BOUNDS.maxX);
      _currentPos.z = THREE.MathUtils.clamp(_currentPos.z, BOUNDS.minZ, BOUNDS.maxZ);
      if (_currentPos.y < TOTAL_HEIGHT / 2) {
        _currentPos.y = TOTAL_HEIGHT / 2;
        velocityY.current = 0;
        grounded.current = true;
      } else {
        grounded.current = controller.computedGrounded();
      }

      rb.setNextKinematicTranslation({
        x: _currentPos.x,
        y: _currentPos.y,
        z: _currentPos.z,
      });

      useGameStore.getState().setLastInput({
        forward: input.forward,
        backward: input.backward,
        left: input.left,
        right: input.right,
        sprint: input.sprint,
        slide: false,
        airborne: !grounded.current,
      });

      if (useZombieNetworkStore.getState().isLocal) {
        localZombieEngine.setPlayerPosition(_currentPos.x, _currentPos.y, _currentPos.z, zombieAim.yaw);
      }
      useZombieNetworkStore.getState().sendInput({
        forward: input.forward,
        backward: input.backward,
        left: input.left,
        right: input.right,
        sprint: input.sprint,
        rotationY: zombieAim.yaw,
        seq: Date.now(),
      });
    }

    if (visualRef.current) {
      visualRef.current.position.set(
        _currentPos.x,
        _currentPos.y - TOTAL_HEIGHT / 2,
        _currentPos.z
      );
      visualRef.current.rotation.y = zombieAim.yaw;
    }

    if (aimMarkerRef.current) {
      aimMarkerRef.current.position.set(zombieAim.aimX, 0.08, zombieAim.aimZ);
    }

    _camTarget.set(_currentPos.x + CAM_OFFSET.x, _currentPos.y + CAM_OFFSET.y, _currentPos.z + CAM_OFFSET.z);
    camera.position.lerp(_camTarget, 0.12);
    _lookAt.set(_currentPos.x, _currentPos.y + 0.8, _currentPos.z);
    camera.lookAt(_lookAt);

    updateAudioListener(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      _lookAt.x,
      _lookAt.y,
      _lookAt.z
    );
  });

  return (
    <group>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={initialSpawn}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
      </RigidBody>
      <group ref={visualRef} name="local-player">
        <MinecraftCharacter
          team="CT"
          isDead={isDead}
          holdWeapon
          motionRef={motionRef}
        />
        <HeldWeapon />
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 20]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
        </mesh>
      </group>
      <mesh ref={aimMarkerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.42, 20]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}
