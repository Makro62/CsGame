import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { useZombieNetworkStore } from "../../stores/useZombieNetworkStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useGameStore } from "../../stores/useGameStore";
import { RecoilController, getSpreadRadius } from "./RecoilController";
import { Sound } from "../../components/AudioManager";

const raycaster = new THREE.Raycaster();
const spreadDir = new THREE.Vector2();
const shootOrigin = new THREE.Vector3();
const shootDirection = new THREE.Vector3();
const _muzzleOffset = new THREE.Vector3();
const _casingOffset = new THREE.Vector3();
const _tempVec3 = new THREE.Vector3();

// Impact pool for reuse
const impactPool: THREE.Mesh[] = [];
const MAX_IMPACTS = 30;

function getImpactMesh(): THREE.Mesh {
  if (impactPool.length > 0) {
    return impactPool.pop()!;
  }
  const geo = new THREE.SphereGeometry(0.03, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  return new THREE.Mesh(geo, mat);
}

function recycleImpact(mesh: THREE.Mesh) {
  mesh.visible = false;
  if (impactPool.length < MAX_IMPACTS) {
    impactPool.push(mesh);
  } else {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
}

// Muzzle flash pool
const muzzleFlashPool: THREE.Mesh[] = [];
const MAX_MUZZLE_FLASHES = 5;

function getMuzzleFlashMesh(): THREE.Mesh {
  if (muzzleFlashPool.length > 0) {
    return muzzleFlashPool.pop()!;
  }
  const geo = new THREE.PlaneGeometry(0.15, 0.15);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(geo, mat);
}

function recycleMuzzleFlash(mesh: THREE.Mesh) {
  mesh.visible = false;
  if (muzzleFlashPool.length < MAX_MUZZLE_FLASHES) {
    muzzleFlashPool.push(mesh);
  } else {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
}

// Shell casing pool
const shellCasingPool: THREE.Mesh[] = [];
const MAX_SHELLCASINGS = 10;

function getShellCasingMesh(): THREE.Mesh {
  if (shellCasingPool.length > 0) {
    return shellCasingPool.pop()!;
  }
  const geo = new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  return new THREE.Mesh(geo, mat);
}

function recycleShellCasing(mesh: THREE.Mesh) {
  mesh.visible = false;
  if (shellCasingPool.length < MAX_SHELLCASINGS) {
    shellCasingPool.push(mesh);
  } else {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
}

export function ShootingSystem() {
  const { camera, scene } = useThree();
  const {
    activeWeapon,
    isADS,
    bulletsFired,
    canFire,
    updateRecoil,
    incrementBullets,
    setLastFireTime,
  } = useWeaponStore();
  const { sendShoot, round } = useNetworkStore();
  const { sensitivity } = useSettingsStore();

  const recoilController = useRef<RecoilController | null>(null);
  const lastWeapon = useRef<string | null>(null);
  const seqRef = useRef(0);
  const mouseHeld = useRef(false);
  const muzzleFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeWeapon && activeWeapon !== lastWeapon.current) {
      recoilController.current = new RecoilController(activeWeapon);
      lastWeapon.current = activeWeapon;
    }
  }, [activeWeapon]);

  const createMuzzleFlash = useCallback(() => {
    const flash = getMuzzleFlashMesh();
    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);

    _muzzleOffset.set(0.1, -0.05, -0.5);
    _muzzleOffset.applyQuaternion(camera.quaternion);
    flash.position.copy(shootOrigin).add(_muzzleOffset);
    flash.rotation.set(0, 0, Math.random() * Math.PI * 2);
    flash.visible = true;
    scene.add(flash);

    if (muzzleFlashTimer.current) clearTimeout(muzzleFlashTimer.current);
    muzzleFlashTimer.current = setTimeout(() => {
      scene.remove(flash);
      recycleMuzzleFlash(flash);
    }, 50);
  }, [camera, scene]);

  const createShellCasing = useCallback(() => {
    const casing = getShellCasingMesh();
    camera.getWorldPosition(shootOrigin);

    _casingOffset.set(0.15, 0, -0.3);
    _casingOffset.applyQuaternion(camera.quaternion);
    casing.position.copy(shootOrigin).add(_casingOffset);
    casing.visible = true;
    scene.add(casing);

    const casingDir = new THREE.Vector3(
      0.5 + Math.random() * 0.3,
      0.8 + Math.random() * 0.4,
      -0.2 + Math.random() * 0.2
    );
    casingDir.applyQuaternion(camera.quaternion);

    let velocity = casingDir.clone().multiplyScalar(0.08);
    const gravity = new THREE.Vector3(0, -0.005, 0);
    let frames = 0;
    const maxFrames = 60;

    const animate = () => {
      frames++;
      velocity.add(gravity);
      casing.position.add(velocity);
      casing.rotation.x += 0.2;
      casing.rotation.y += 0.15;

      if (casing.position.y < 0.05) {
        casing.position.y = 0.05;
        velocity.y = -velocity.y * 0.3;
        velocity.x *= 0.5;
        velocity.z *= 0.5;
      }

      if (frames < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(casing);
        recycleShellCasing(casing);
      }
    };
    requestAnimationFrame(animate);
  }, [camera, scene]);

  const shoot = useCallback(() => {
    if (!activeWeapon || !canFire()) return;
    const gameMode = useGameStore.getState().mode;
    if (gameMode !== "training" && gameMode !== "zombie" && round.phase !== "active") return;

    const controller = recoilController.current;
    if (!controller) return;

    controller.fire();

    // Detect actual movement state for spread calculation
    const lastInput = useGameStore.getState().lastInput;
    let movementState: 'idle' | 'walk' | 'sprint' | 'slide' | 'airborne' = 'idle';
    if (lastInput) {
      if (lastInput.sprint) movementState = 'sprint';
      else if (lastInput.forward || lastInput.backward || lastInput.left || lastInput.right) movementState = 'walk';
    }

    const spread = getSpreadRadius(
      activeWeapon,
      movementState,
      isADS,
      bulletsFired
    );

    spreadDir.set(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread
    );

    raycaster.setFromCamera(spreadDir, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validHits = intersects.filter((hit) => {
      if (hit.distance < 0.4) return false;
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        if (current.name && current.name.includes("weapon")) return false;
        current = current.parent;
      }
      return true;
    });

    if (validHits.length > 0) {
      const hit = validHits[0];
      createImpactEffect(hit.point, scene);

      // Tracer via Zustand instead of window.dispatchEvent
      const startPos = camera.getWorldPosition(_tempVec3);
      useGameStore.getState().setTracerEvent({
        start: { x: startPos.x, y: startPos.y, z: startPos.z },
        end: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
      });

      if (gameMode === "training") {
        useGameStore.getState().incrementShots();
        let currentObj: THREE.Object3D | null = hit.object;
        let targetId: string | null = null;
        let isHead = false;

        while (currentObj) {
          if (currentObj.userData && currentObj.userData.targetId) {
            targetId = currentObj.userData.targetId;
            if (currentObj.userData.isHead) isHead = true;
            break;
          }
          currentObj = currentObj.parent;
        }

        if (targetId) {
          const wStats = WEAPONS[activeWeapon as keyof typeof WEAPONS];
          const dmg = isHead ? (wStats?.headshot || 100) : (wStats?.dmg || 35);
          useGameStore.getState().damageTarget(targetId, dmg, isHead);
          useGameStore.getState().incrementHits();
          useNetworkStore.getState().showHitMarker(isHead);
        }
      }
    } else if (gameMode === "training") {
      useGameStore.getState().incrementShots();
    }

    // Create visual effects
    createMuzzleFlash();
    createShellCasing();

    // Trigger shoot event via Zustand instead of window.dispatchEvent
    useGameStore.getState().triggerShoot();

    // Play gunshot sound
    Sound.gunshot(activeWeapon);

    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);

    if (gameMode === "zombie") {
      useZombieNetworkStore.getState().sendShoot({
        direction: { x: shootDirection.x, y: shootDirection.y, z: shootDirection.z },
      });
    } else if (gameMode !== "training") {
      seqRef.current++;
      sendShoot({
        origin: { x: shootOrigin.x, y: shootOrigin.y, z: shootOrigin.z },
        direction: { x: shootDirection.x, y: shootDirection.y, z: shootDirection.z },
        timestamp: performance.now(),
        seq: seqRef.current,
        weapon: activeWeapon,
        latency: useNetworkStore.getState().latency,
      });
    }

    incrementBullets();
    setLastFireTime(performance.now());
  }, [
    activeWeapon,
    canFire,
    camera,
    scene,
    isADS,
    bulletsFired,
    incrementBullets,
    sendShoot,
    setLastFireTime,
    round.phase,
    createMuzzleFlash,
    createShellCasing,
  ]);

  // Mouse down/up tracking
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const weaponState = useWeaponStore.getState();
        if (
          weaponState.activeWeapon &&
          weaponState.currentAmmo === 0 &&
          !weaponState.isReloading &&
          !weaponState.isSwitching
        ) {
          const stats = WEAPONS[weaponState.activeWeapon];
          if (stats && stats.reload > 0) {
            Sound.dryFire();
            weaponState.startReload();
            useNetworkStore.getState().sendReload();
          }
          return;
        }
        mouseHeld.current = true;
        shoot();
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseHeld.current = false;
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [shoot]);

  // Auto-fire + recoil recovery in frame loop
  useFrame(() => {
    if (mouseHeld.current && activeWeapon) {
      shoot();
    }

    const controller = recoilController.current;
    if (!controller) return;

    // Update recoil controller recovery with ADS-aware damping for a cleaner feel
    const { offsetX, offsetY } = controller.update(1 / 60);
    const recoilScale = isADS ? 0.55 : 1;
    updateRecoil(
      offsetX * sensitivity * recoilScale,
      offsetY * sensitivity * recoilScale
    );
  });

  return null;
}

function createImpactEffect(point: THREE.Vector3, scene: THREE.Scene) {
  const spark = getImpactMesh();
  spark.position.copy(point);
  spark.visible = true;
  scene.add(spark);

  setTimeout(() => {
    scene.remove(spark);
    recycleImpact(spark);
  }, 200);
}
