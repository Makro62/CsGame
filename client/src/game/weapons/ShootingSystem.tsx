import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useGameStore } from "../../stores/useGameStore";
import { RecoilController, getSpreadRadius } from "./RecoilController";
import { Sound } from "../../components/AudioManager";

const raycaster = new THREE.Raycaster();
const spreadDir = new THREE.Vector2();
const shootOrigin = new THREE.Vector3();
const shootDirection = new THREE.Vector3();

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

    // Position flash at weapon muzzle
    const offset = new THREE.Vector3(0.1, -0.05, -0.5);
    offset.applyQuaternion(camera.quaternion);
    flash.position.copy(shootOrigin).add(offset);
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

    // Position at weapon ejection port
    const offset = new THREE.Vector3(0.15, 0, -0.3);
    offset.applyQuaternion(camera.quaternion);
    casing.position.copy(shootOrigin).add(offset);
    casing.visible = true;
    scene.add(casing);

    // Animate casing
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      2 + Math.random(),
      (Math.random() - 0.5) * 0.5
    );
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed > 1) {
        scene.remove(casing);
        recycleShellCasing(casing);
        return;
      }

      velocity.y -= 9.81 * 0.016;
      casing.position.add(velocity.clone().multiplyScalar(0.016));
      casing.rotation.x += 0.2;
      casing.rotation.z += 0.1;

      if (casing.position.y < 0) {
        casing.position.y = 0;
        velocity.y *= -0.3;
        velocity.x *= 0.8;
        velocity.z *= 0.8;
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [camera, scene]);

  const shoot = useCallback(() => {
    if (!activeWeapon || !canFire()) return;
    const gameMode = useGameStore.getState().mode;
    if (gameMode !== "training" && round.phase !== "active") return;

    const controller = recoilController.current;
    if (!controller) return;

    controller.fire();

    const movementState = "idle";
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

      // Tracer from the camera to the impact point (visual only)
      window.dispatchEvent(
        new CustomEvent("tracer", {
          detail: {
            start: camera.getWorldPosition(new THREE.Vector3()).clone(),
            end: hit.point.clone(),
          },
        })
      );

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
          useGameStore.getState().damageTarget(targetId, dmg);
          useGameStore.getState().incrementHits(isHead);
          useNetworkStore.getState().showHitMarker(isHead);
        }
      }
    } else if (gameMode === "training") {
      useGameStore.getState().incrementShots();
    }

    // Create visual effects
    createMuzzleFlash();
    createShellCasing();

    // Dispatch shoot event for screen shake
    window.dispatchEvent(new Event("shoot"));

    // Play gunshot sound
    Sound.gunshot(activeWeapon);

    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);

    if (gameMode !== "training") {
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
    sensitivity,
    createMuzzleFlash,
    createShellCasing,
  ]);

  // Mouse down/up tracking
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
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

    // Update recoil controller recovery
    const { offsetX, offsetY } = controller.update(1 / 60);
    updateRecoil(offsetX * sensitivity, offsetY * sensitivity);
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
