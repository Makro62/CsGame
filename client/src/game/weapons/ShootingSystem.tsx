// @ts-nocheck
import { useRef, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WEAPONS, MELEE, isMeleeWeapon } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useGameStore } from "../../stores/useGameStore";
import {
  RecoilController,
  getSpreadRadius,
  getMovementState,
} from "./RecoilController";
import { Sound } from "../../components/AudioManager";
import { gameEvents } from "../../lib/gameEvents";
import { getMuzzleOffset, isAkimboWeapon, type AkimboSide } from "./weaponRig";
import { useAimStore } from "../../stores/useAimStore";
import { useOffline5v5Store } from "../../screens/Offline5v5Store";
import { zombieEngine } from "../zombie/ZombieEngine";
import { useL4DStore } from "../../stores/useL4DStore";

function isZombieArcade() {
  const m = useGameStore.getState().mode;
  return m === "zombie" || m === "l4d";
}
function getArcadeAim() {
  const a = useAimStore.getState();
  return { origin: a.origin.clone(), direction: a.direction.clone(), yaw: a.yaw, pos: a.pos.clone() };
}

// Same idle window RecoilController uses to reset its pattern index
const SPRAY_RESET_MS = 260;

const CENTER_SCREEN = new THREE.Vector2(0, 0);
const _up = new THREE.Vector3(0, 1, 0);
const _arcadeDir = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const spreadDir = new THREE.Vector2();
const shootOrigin = new THREE.Vector3();
const shootDirection = new THREE.Vector3();
const _muzzleOffset = new THREE.Vector3();
const _casingOffset = new THREE.Vector3();
const _tempVec3 = new THREE.Vector3();
const _impactNormal = new THREE.Vector3();
const _normalMatrix = new THREE.Matrix3();

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
    setRecoilAim,
    incrementBullets,
    setLastFireTime,
  } = useWeaponStore();
  const { sensitivity } = useSettingsStore();

  const recoilController = useRef<RecoilController | null>(null);
  const lastWeapon = useRef<string | null>(null);
  const seqRef = useRef(0);
  const mouseHeld = useRef(false);
  const impactTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const casingRafs = useRef<number[]>([]);
  const liveFx = useRef<Array<{ mesh: THREE.Mesh; recycle: (m: THREE.Mesh) => void }>>([]);
  // Akimbo weapons alternate hands, so every shot flips this.
  const akimboSide = useRef<AkimboSide>(1);

  const dropLiveFx = useCallback((mesh: THREE.Mesh) => {
    const idx = liveFx.current.findIndex((fx) => fx.mesh === mesh);
    if (idx < 0) return;
    const { recycle } = liveFx.current[idx];
    liveFx.current.splice(idx, 1);
    if (mesh.parent) mesh.parent.remove(mesh);
    recycle(mesh);
  }, []);

  const spawnImpact = useCallback((point: THREE.Vector3) => {
    const spark = getImpactMesh();
    spark.position.copy(point);
    spark.visible = true;
    scene.add(spark);
    liveFx.current.push({ mesh: spark, recycle: recycleImpact });

    const timerId = setTimeout(() => {
      dropLiveFx(spark);
      const idx = impactTimers.current.indexOf(timerId);
      if (idx >= 0) impactTimers.current.splice(idx, 1);
    }, 200);
    impactTimers.current.push(timerId);
  }, [scene, dropLiveFx]);

  // Clear in-flight VFX on unmount. Module-level pools stay alive so React
  // Strict Mode remounts (and the next match) can reuse them.
  useEffect(() => {
    return () => {
      impactTimers.current.forEach(clearTimeout);
      flashTimers.current.forEach(clearTimeout);
      casingRafs.current.forEach((id) => cancelAnimationFrame(id));
      impactTimers.current.length = 0;
      flashTimers.current.length = 0;
      casingRafs.current.length = 0;
      liveFx.current.forEach(({ mesh, recycle }) => {
        if (mesh.parent) mesh.parent.remove(mesh);
        recycle(mesh);
      });
      liveFx.current.length = 0;
    };
  }, []);

  useEffect(() => {
    if (activeWeapon && activeWeapon !== lastWeapon.current) {
      recoilController.current = new RecoilController(activeWeapon);
      lastWeapon.current = activeWeapon;
    }
  }, [activeWeapon]);

  const createMuzzleFlash = useCallback((side: AkimboSide = 1) => {
    const flash = getMuzzleFlashMesh();
    if (isZombieArcade()) {
      const aim = getArcadeAim();
      shootOrigin.copy(aim.origin);
      shootDirection.copy(aim.direction);
    } else {
      camera.getWorldPosition(shootOrigin);
      camera.getWorldDirection(shootDirection);
    }

    _muzzleOffset
      .copy(getMuzzleOffset(activeWeapon, side, useWeaponStore.getState().dualWield))
      .applyQuaternion(camera.quaternion);
    if (isZombieArcade()) {
      flash.position.copy(shootOrigin).add(shootDirection.clone().multiplyScalar(0.4));
    } else {
      flash.position.copy(shootOrigin).add(_muzzleOffset);
    }
    flash.rotation.set(0, 0, Math.random() * Math.PI * 2);
    flash.visible = true;
    scene.add(flash);
    liveFx.current.push({ mesh: flash, recycle: recycleMuzzleFlash });

    const timerId = setTimeout(() => {
      dropLiveFx(flash);
      const idx = flashTimers.current.indexOf(timerId);
      if (idx >= 0) flashTimers.current.splice(idx, 1);
    }, 50);
    flashTimers.current.push(timerId);
  }, [camera, scene, activeWeapon, dropLiveFx]);

  const createShellCasing = useCallback((side: AkimboSide = 1) => {
    const casing = getShellCasingMesh();
    camera.getWorldPosition(shootOrigin);

    _casingOffset.set(0.15 * side, 0, -0.3);
    _casingOffset.applyQuaternion(camera.quaternion);
    casing.position.copy(shootOrigin).add(_casingOffset);
    casing.visible = true;
    scene.add(casing);
    liveFx.current.push({ mesh: casing, recycle: recycleShellCasing });

    const casingDir = new THREE.Vector3(
      (0.5 + Math.random() * 0.3) * side,
      0.8 + Math.random() * 0.4,
      -0.2 + Math.random() * 0.2
    );
    casingDir.applyQuaternion(camera.quaternion);

    const velocity = casingDir.clone().multiplyScalar(0.08);
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
        const rafId = requestAnimationFrame(animate);
        casingRafs.current.push(rafId);
      } else {
        dropLiveFx(casing);
      }
    };
    const rafId = requestAnimationFrame(animate);
    casingRafs.current.push(rafId);
  }, [camera, scene, dropLiveFx]);

  /** Damage the first training dummy the given hit belongs to. */
  const damageTrainingTarget = useCallback(
    (hitObject: THREE.Object3D, weapon: keyof typeof WEAPONS) => {
      let current: THREE.Object3D | null = hitObject;
      let targetId: string | null = null;
      let isHead = false;

      while (current) {
        if (current.userData && current.userData.targetId) {
          targetId = current.userData.targetId;
          if (current.userData.isHead) isHead = true;
          break;
        }
        current = current.parent;
      }

      if (!targetId) return;

      const stats = WEAPONS[weapon];
      const dmg = isHead ? (stats?.headshot ?? 100) : (stats?.dmg ?? 35);
      useGameStore.getState().damageTarget(targetId, dmg, isHead);
      useGameStore.getState().incrementHits();
      // hit marker local — no network
    },
    []
  );

  /** Knife swing: arm's length, no bullet, no muzzle flash, no casing. */
  const meleeAttack = useCallback(
    (weapon: keyof typeof WEAPONS, gameMode: string) => {
      raycaster.setFromCamera(CENTER_SCREEN, camera);
      raycaster.far = MELEE.range;
      const hits = raycaster
        .intersectObjects(scene.children, true)
        .filter((hit) => {
          let current: THREE.Object3D | null = hit.object;
          while (current) {
            if (current.name && current.name.includes("weapon")) return false;
            current = current.parent;
          }
          return true;
        });
      raycaster.far = Infinity;

      const hit = hits[0];
      Sound.melee(!!hit);

      if (hit) {
        spawnImpact(hit.point);
        if (gameMode === "training") damageTrainingTarget(hit.object, weapon);
      }

      if (gameMode === "training") useGameStore.getState().incrementShots();

      if (gameMode === "zombie" || gameMode === "l4d") {
        const aim = getArcadeAim();
        zombieEngine.handleMelee({ direction: aim.direction });
        // L4D hunter/smoker handled via L4DDirector infected
        if (gameMode === "l4d") {
          const st = useL4DStore.getState();
          // melee hits nearest special within 2m
          const aimPos = aim.pos;
          const hit = st.infected.find(i=> !i.isDead && Math.hypot(i.x-aimPos.x, i.z-aimPos.z) < 2);
          if (hit) {
            const nhp = hit.hp - 65;
            if (nhp <=0) useL4DStore.setState({ infected: st.infected.map(x=> x.id===hit.id? {...x, isDead:true}:x)});
            else useL4DStore.setState({ infected: st.infected.map(x=> x.id===hit.id? {...x, hp: nhp}:x)});
          }
        }
      } else if (gameMode === "offline5v5") {
        let current: THREE.Object3D | null = hit?.object ?? null;
        let targetId: string | null = null;
        while (current) {
          if (current.userData?.playerId) {
            targetId = current.userData.playerId as string;
            break;
          }
          current = current.parent;
        }
        useOffline5v5Store.getState().localShoot(targetId, false);
      } else if (gameMode !== "training") {
        // offline: no network melee
      }

      incrementBullets();
      setLastFireTime(performance.now());
    },
    [camera, scene, damageTrainingTarget, incrementBullets, setLastFireTime, spawnImpact]
  );

  const shoot = useCallback(() => {
    if (!activeWeapon || !canFire()) return;
    const gameMode = useGameStore.getState().mode;
    if (gameMode !== "training" && gameMode !== "zombie" && gameMode !== "offline5v5" && gameMode !== "l4d") return;
    // offline phases always active, no round.phase check needed (round removed for offline)

    if (isMeleeWeapon(activeWeapon)) {
      meleeAttack(activeWeapon, gameMode);
      return;
    }

    if (activeWeapon === "he" || activeWeapon === "smoke" || activeWeapon === "flash") {
      camera.getWorldDirection(shootDirection);
      const origin = camera.position.clone().add(shootDirection.clone().multiplyScalar(0.4));
      const velocity = shootDirection.clone().multiplyScalar(22).add(new THREE.Vector3(0, 3, 0));

      const nadeData = {
        id: `nade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: activeWeapon,
        throwerId: "local",
        x: origin.x,
        y: origin.y,
        z: origin.z,
        vx: velocity.x,
        vy: velocity.y,
        vz: velocity.z,
      };

      gameEvents.emit("nadeThrown", nadeData);

      if (gameMode !== "training" && gameMode !== "zombie") {
        useNetworkStore.getState().sendThrowGrenade({
          type: activeWeapon,
          origin: { x: origin.x, y: origin.y, z: origin.z },
          velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        });
      }

      // Auto switch back to primary weapon after throw
      const primary = useWeaponStore.getState().primaryWeapon || "ak47";
      setTimeout(() => {
        useWeaponStore.getState().equipWeapon(primary);
      }, 350);
      return;
    }

    const controller = recoilController.current;
    if (!controller) return;

    controller.fire();

    const side: AkimboSide = isAkimboWeapon(activeWeapon, useWeaponStore.getState().dualWield) ? akimboSide.current : 1;
    akimboSide.current = side === 1 ? -1 : 1;

    const movementState = getMovementState(useGameStore.getState().lastInput);

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

    raycaster.far = Infinity;
    if (isZombieArcade()) {
      const aim = getArcadeAim();
      shootOrigin.copy(aim.origin);
      _arcadeDir.copy(aim.direction).normalize();
      _arcadeDir.applyAxisAngle(_up, spreadDir.x * 0.45);
      raycaster.set(shootOrigin, _arcadeDir);
    } else {
      raycaster.setFromCamera(spreadDir, camera);
    }
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validHits = intersects.filter((hit) => {
      if (hit.distance < 0.4) return false;
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        if (current.name && current.name.includes("weapon")) return false;
        if (current.name === "local-player") return false;
        current = current.parent;
      }
      return true;
    });

    if (validHits.length > 0) {
      const hit = validHits[0];
      spawnImpact(hit.point);

      if (hit.face) {
        _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        _impactNormal
          .copy(hit.face.normal)
          .applyNormalMatrix(_normalMatrix)
          .normalize();
      } else {
        camera.getWorldDirection(_impactNormal).negate();
      }
      gameEvents.emit("bulletImpact", {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
        nx: _impactNormal.x,
        ny: _impactNormal.y,
        nz: _impactNormal.z,
        distance: hit.distance,
      });

      // Tracer via Zustand instead of window.dispatchEvent
      const startPos = gameMode === "zombie"
        ? shootOrigin.clone()
        : camera.getWorldPosition(_tempVec3);
      _muzzleOffset
        .copy(getMuzzleOffset(activeWeapon, side, useWeaponStore.getState().dualWield))
        .applyQuaternion(camera.quaternion);
      // Point blank: keep the tracer origin behind the impact point.
      if (hit.distance < _muzzleOffset.length() * 1.5) {
        _muzzleOffset.multiplyScalar((hit.distance * 0.5) / _muzzleOffset.length());
      }
      startPos.add(_muzzleOffset);
      useGameStore.getState().setTracerEvent({
        start: { x: startPos.x, y: startPos.y, z: startPos.z },
        end: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
      });

      if (gameMode === "training") {
        useGameStore.getState().incrementShots();
        damageTrainingTarget(hit.object, activeWeapon);
      }

      if (gameMode === "offline5v5") {
        let current: THREE.Object3D | null = hit.object;
        let targetId: string | null = null;
        let isHead = false;
        while (current) {
          if (current.userData?.playerId) {
            targetId = current.userData.playerId as string;
            isHead = !!current.userData.isHead;
            break;
          }
          current = current.parent;
        }
        useOffline5v5Store.getState().localShoot(targetId, isHead);
        if (targetId) {
          useNetworkStore.getState().showHitMarker(isHead);
        }
      }
    } else if (gameMode === "offline5v5") {
      useOffline5v5Store.getState().localShoot(null, false);
    } else if (gameMode === "training") {
      useGameStore.getState().incrementShots();
    }

    // Create visual effects
    createMuzzleFlash(side);
    createShellCasing(side);

    // Trigger shoot event via Zustand instead of window.dispatchEvent
    useGameStore.getState().triggerShoot();
    // Lets the viewmodel kick the hand that actually fired.
    gameEvents.emit("weaponFired", { weapon: activeWeapon, akimboSide: side });

    // Play gunshot sound
    Sound.gunshot(activeWeapon);

    if (isZombieArcade()) {
      const aim = getArcadeAim();
      shootOrigin.copy(aim.origin);
      if (_arcadeDir.lengthSq() > 0.01) {
        shootDirection.copy(_arcadeDir);
      } else {
        shootDirection.copy(aim.direction);
      }
    } else {
      camera.getWorldPosition(shootOrigin);
      camera.getWorldDirection(shootDirection);
    }

    if (isZombieArcade()) {
      const gameMode2 = useGameStore.getState().mode;
      const stats = WEAPONS[activeWeapon];
      const dmg = stats?.dmg ?? 35;
      const headDmg = stats?.headshot ?? dmg*2;
      // headshot random 18% for arcade, L4D also
      const isHead = Math.random() < 0.18;
      if (gameMode2 === "l4d") {
        // L4D damage to common + special
        const aim = getArcadeAim();
        const pos2D = aim.pos;
        // damageCommon via L4D store ray-ish: find nearest infected within cone
        const l4d = useL4DStore.getState();
        let best: typeof l4d.infected[0] | null = null;
        let bestDist = Infinity;
        for (const inf of l4d.infected) {
          if (inf.isDead) continue;
          const dx = inf.x - pos2D.x, dz = inf.z - pos2D.z;
          const d = Math.hypot(dx,dz);
          if (d < bestDist && d < 45) {
            // facing check
            const dir2 = aim.direction;
            const dot = (dx/d)*dir2.x + (dz/d)*dir2.z;
            if (dot > 0.78) { bestDist = d; best = inf as typeof l4d.infected[0]; }
          }
        }
        if (best) {
          const dmgVal = isHead ? headDmg : dmg;
          const nhp = best.hp - dmgVal;
          if (nhp <=0) useL4DStore.setState({ infected: l4d.infected.map(x=> x.id===best!.id? {...x, isDead:true}:x)});
          else useL4DStore.setState({ infected: l4d.infected.map(x=> x.id===best!.id? {...x, hp: nhp}:x)});
        }
      } else {
        const dmgVal = isHead ? headDmg : dmg;
        zombieEngine.handleShoot(shootOrigin, shootDirection, dmgVal, isHead);
      }
    } else if (gameMode !== "training" && gameMode !== "offline5v5") {
      // offline fallback no network
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
    setLastFireTime,
    createMuzzleFlash,
    createShellCasing,
    damageTrainingTarget,
    meleeAttack,
    spawnImpact,
  ]);

  // Mouse down/up tracking
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const arcade = isZombieArcade();
        if (arcade) {
          const tag = (e.target as HTMLElement | null)?.tagName;
          if (tag !== "CANVAS") return;
        } else if (!document.pointerLockElement) {
          return;
        }

        const weaponState = useWeaponStore.getState();
        const weapon = weaponState.activeWeapon;
        if (
          weapon &&
          !isMeleeWeapon(weapon) &&
          weaponState.currentAmmo === 0 &&
          !weaponState.isReloading &&
          !weaponState.isSwitching
        ) {
          const stats = WEAPONS[weapon];
          if (stats && stats.reload > 0) {
            Sound.dryFire();
            weaponState.startReload();
            // offline: no sendReload
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
  useFrame((_, frameDelta) => {
    if (!isZombieArcade() && !document.pointerLockElement) mouseHeld.current = false;
    // zombieArcade paused check via GameStore menu? keep simple
    if (isZombieArcade() && useGameStore.getState().mode==="menu") mouseHeld.current = false;
    if (mouseHeld.current && activeWeapon) {
      shoot();
    }

    // Spray recovers once the burst is over, matching RecoilController's window
    const weaponState = useWeaponStore.getState();
    if (
      weaponState.bulletsFired > 0 &&
      performance.now() - weaponState.lastFireTimestamp > SPRAY_RESET_MS
    ) {
      weaponState.resetBullets();
    }

    const controller = recoilController.current;
    if (!controller) return;
    if (isZombieArcade()) return;

    // Update recoil controller recovery with ADS-aware damping for a cleaner feel
    const { offsetX, offsetY } = controller.update(Math.min(frameDelta, 0.05));
    const recoilScale = isADS ? 0.55 : 1;
    updateRecoil(
      offsetX * sensitivity * recoilScale,
      offsetY * sensitivity * recoilScale
    );

    // The pattern is authored in screen space, so convert it to camera angles.
    // Mouse sensitivity is deliberately left out: recoil must be identical for
    // every player regardless of their sens.
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 75;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    setRecoilAim(
      -Math.atan(offsetX * recoilScale * tanHalfFov),
      Math.atan(offsetY * recoilScale * tanHalfFov)
    );
  });

  return null;
}
