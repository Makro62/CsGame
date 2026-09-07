import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerInput } from "../../hooks/usePlayerInput";
import { useZombieStore } from "../../stores/useZombieStore";
import { useGameStore } from "../../stores/useGameStore";
import { useHeroStore } from "../../stores/useHeroStore";
import { useAimStore } from "../../stores/useAimStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { MinecraftCharacter, weaponCategoryFromId } from "../characterWeaponKit";
import { getSurvivalStageBounds, pushOutSurvival } from "../zombie/survivalLayout";
import { arcadeScreenMove } from "./arcadeScreenMove";
import { consumeScreenShake } from "../effects/screenShake";
import { Sound } from "../../components/AudioManager";

const BASE_WALK_SPEED = 5.4;
const BASE_SPRINT_SPEED = 8.4;
const PLAYER_RADIUS = 0.55;

const _tGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _tHit = new THREE.Vector3();
const _tMove = new THREE.Vector3();
const _tOrigin = new THREE.Vector3();
const _tDir = new THREE.Vector3();
const _aimNdc = new THREE.Vector2();

export function ZombieArcadeController() {
  const { camera, pointer, raycaster, size } = useThree();
  const { getInput } = usePlayerInput();
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const yawTargetRef = useRef(0);
  const isDead = useZombieStore(s => s.player.isDowned);
  const unlockedStages = useZombieStore(s => s.unlockedStages);
  const cameraPerspective = useZombieStore(s => s.cameraPerspective ?? "arcade");
  const groupRef = useRef<THREE.Group>(null);
  const motionRef = useRef({ moving: false, sprinting: false });
  const hero = useHeroStore(s => s.hero);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const weaponType = weaponCategoryFromId(activeWeapon);
  const lockedNdc = useRef({ x: 0, y: 0 });
  const pointerRef = useRef(pointer);
  pointerRef.current = pointer;
  const stepAccum = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      if (useZombieStore.getState().cameraPerspective === "fps") {
        yawRef.current -= e.movementX * 0.0024;
        pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - e.movementY * 0.0024, -1.35, 1.35);
        return;
      }
      const nx = size.width || window.innerWidth;
      const ny = size.height || window.innerHeight;
      lockedNdc.current.x = THREE.MathUtils.clamp(lockedNdc.current.x + e.movementX / (nx * 0.5), -0.98, 0.98);
      lockedNdc.current.y = THREE.MathUtils.clamp(lockedNdc.current.y - e.movementY / (ny * 0.5), -0.98, 0.98);
      useAimStore.getState().setCursorNdc(lockedNdc.current.x, lockedNdc.current.y);
    };
    const onLock = () => {
      if (document.pointerLockElement) {
        lockedNdc.current.x = pointerRef.current.x;
        lockedNdc.current.y = pointerRef.current.y;
        useAimStore.getState().setCursorNdc(pointerRef.current.x, pointerRef.current.y);
      }
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, [size.width, size.height]);

  useFrame((_, dt) => {
    const input = getInput();
    useGameStore.getState().setLastInput({
      forward: input.forward, backward: input.backward, left: input.left, right: input.right,
      sprint: input.sprint, slide: false, airborne: false,
    });

    if (isDead) return;

    const isFps = cameraPerspective === "fps";

    if (!isFps) {
      if (document.pointerLockElement) {
        _aimNdc.set(lockedNdc.current.x, lockedNdc.current.y);
      } else {
        _aimNdc.set(pointer.x, pointer.y);
      }
      raycaster.setFromCamera(_aimNdc, camera);
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
    }

    const move = isFps
      ? (() => {
          // Standard FPS WASD movement along camera yaw
          const fwd = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
          const str = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          const sin = Math.sin(yawRef.current);
          const cos = Math.cos(yawRef.current);
          const mx = sin * fwd + cos * str;
          const mz = cos * fwd - sin * str;
          const len = Math.hypot(mx, mz);
          return len > 0 ? { x: mx / len, z: mz / len } : { x: 0, z: 0 };
        })()
      : arcadeScreenMove(input.forward, input.backward, input.left, input.right);

    _tMove.set(move.x, 0, move.z);
    const lenSq = _tMove.lengthSq();
    motionRef.current.moving = lenSq > 0;
    motionRef.current.sprinting = input.sprint && lenSq > 0;

    const speedFactor = hero.stats.speed / 5.4;
    const speed = input.sprint ? BASE_SPRINT_SPEED * speedFactor : BASE_WALK_SPEED * speedFactor;
    posRef.current.x += _tMove.x * speed * dt;
    posRef.current.z += _tMove.z * speed * dt;
    if (lenSq > 0) {
      stepAccum.current += speed * dt;
      if (stepAccum.current > (input.sprint ? 1.6 : 2.1)) {
        stepAccum.current = 0;
        Sound.footstep(input.sprint ? "sprint" : "walk");
      }
    }

    const stageBounds = getSurvivalStageBounds(unlockedStages);
    posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, stageBounds.minX, stageBounds.maxX);
    posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, stageBounds.minZ, stageBounds.maxZ);

    const pushed = pushOutSurvival(posRef.current.x, posRef.current.z, PLAYER_RADIUS);
    posRef.current.x = pushed.x;
    posRef.current.z = pushed.z;

    zombieEngine.setPlayerPos(posRef.current.x, posRef.current.y, posRef.current.z);

    const shake = consumeScreenShake(dt);

    if (isFps) {
      camera.position.set(posRef.current.x + shake.x * 0.4, 1.62 + shake.y * 0.3, posRef.current.z);
      camera.rotation.order = "YXZ";
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
      camera.rotation.z = 0;

      camera.getWorldDirection(_tDir);
      _tOrigin.set(posRef.current.x, 1.62, posRef.current.z);
      useAimStore.getState().setAim(_tOrigin, _tDir, yawRef.current, posRef.current);

      if (groupRef.current) {
        groupRef.current.visible = false;
      }
    } else {
      const camLag = 1 - Math.exp(-9 * dt);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, posRef.current.x, camLag);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 22, camLag);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, posRef.current.z + 11, camLag);
      camera.position.x += shake.x * 3;
      camera.position.y += shake.y * 2;
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
    }
  });

  return (
    <group ref={groupRef}>
      <spotLight
        position={[0.15, 1.1, 0.3]}
        angle={0.68}
        penumbra={0.45}
        intensity={2.8}
        distance={26}
        color="#fef9c3"
      >
        <object3D attach="target" position={[0.15, 0.2, 14]} />
      </spotLight>

      {/* Local player illumination so the character is always crisp and visible */}
      <pointLight position={[0, 1.8, 0]} intensity={1.4} distance={14} color="#f1f5f9" />

      {/* Subtle tactical floor indicator under player */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.68, 24]} />
        <meshBasicMaterial color={hero.accentColor} transparent opacity={0.6} />
      </mesh>

      <MinecraftCharacter
        team="CT"
        holdWeapon
        weaponType={weaponType}
        currentWeapon={activeWeapon}
        motionRef={motionRef}
        isDead={isDead}
        heroColor={hero.armorColor}
        heroAccent={hero.accentColor}
        bodyStyle={hero.id}
      />
    </group>
  );
}
