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
import { useZombieStore } from "../../stores/useZombieStore";
import { useL4DStore } from "../../stores/useL4DStore";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { useHeroStore } from "../../stores/useHeroStore";

function isZombieArcade() {
  return useGameStore.getState().mode === "zombie";
}
function getArcadeAim() {
  return useAimStore.getState();
}

function emitOfflineHitMarker(targetId: string | null, headshot: boolean, killed: boolean) {
  if (!targetId) return;
  const players = useOffline5v5Store.getState().players;
  const me = players.get("local");
  const victim = players.get(targetId);
  if (!me || !victim || victim.team === me.team) return;
  gameEvents.emit("hitMarker", { headshot, killed });
}

function shotIgnored(obj: THREE.Object3D) {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (current.userData?.skipShot) return true;
    if (current.name && String(current.name).includes("weapon")) return true;
    if (current.name === "local-player") return true;
    current = current.parent;
  }
  return false;
}

function infectedFrom(obj: THREE.Object3D): { id: string; isHead: boolean } | null {
  let current: THREE.Object3D | null = obj;
  while (current) {
    if (current.userData?.infectedId) {
      return { id: current.userData.infectedId as string, isHead: !!current.userData.isHead };
    }
    current = current.parent;
  }
  return null;
}

// Same idle window RecoilController uses to reset its pattern index
const SPRAY_RESET_MS = 260;

const CENTER_SCREEN = new THREE.Vector2(0, 0);
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

// Procedural Starburst Muzzle Flash Texture
let _muzzleTexture: THREE.CanvasTexture | null = null;
function getMuzzleTexture(): THREE.CanvasTexture {
  if (_muzzleTexture) return _muzzleTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Smooth transparent clear
  ctx.clearRect(0, 0, 128, 128);

  // Fiery radial gradient
  const grad = ctx.createRadialGradient(64, 64, 1, 64, 64, 58);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.18, "rgba(255, 230, 110, 0.95)");
  grad.addColorStop(0.42, "rgba(255, 130, 20, 0.7)");
  grad.addColorStop(0.75, "rgba(255, 50, 0, 0.25)");
  grad.addColorStop(1, "rgba(255, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // 4 sharp star spikes
  ctx.fillStyle = "rgba(255, 245, 180, 0.92)";
  // Horizontal spike
  ctx.beginPath();
  ctx.moveTo(64, 59);
  ctx.lineTo(124, 64);
  ctx.lineTo(64, 69);
  ctx.lineTo(4, 64);
  ctx.closePath();
  ctx.fill();

  // Vertical spike
  ctx.beginPath();
  ctx.moveTo(59, 64);
  ctx.lineTo(64, 124);
  ctx.lineTo(69, 64);
  ctx.lineTo(64, 4);
  ctx.closePath();
  ctx.fill();

  // 4 diagonal smaller sparks
  ctx.fillStyle = "rgba(255, 175, 40, 0.65)";
  ctx.beginPath();
  ctx.moveTo(64, 61);
  ctx.lineTo(104, 24);
  ctx.lineTo(67, 64);
  ctx.lineTo(104, 104);
  ctx.lineTo(64, 67);
  ctx.lineTo(24, 104);
  ctx.lineTo(61, 64);
  ctx.lineTo(24, 24);
  ctx.closePath();
  ctx.fill();

  _muzzleTexture = new THREE.CanvasTexture(canvas);
  _muzzleTexture.generateMipmaps = false;
  _muzzleTexture.minFilter = THREE.LinearFilter;
  _muzzleTexture.magFilter = THREE.LinearFilter;
  return _muzzleTexture;
}

// Muzzle flash pool
const muzzleFlashPool: THREE.Object3D[] = [];
const MAX_MUZZLE_FLASHES = 6;

function getMuzzleFlashMesh(): THREE.Object3D {
  if (muzzleFlashPool.length > 0) {
    return muzzleFlashPool.pop()!;
  }
  const group = new THREE.Group();
  const tex = getMuzzleTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Cross plane 1
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), mat);
  group.add(p1);

  // Cross plane 2 (perpendicular)
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), mat);
  p2.rotation.y = Math.PI / 2;
  group.add(p2);

  // Forward flame burst cone
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffaa11,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), coneMat);
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -0.06;
  group.add(cone);

  // Instantaneous point light at gun tip
  const light = new THREE.PointLight(0xffaa33, 2.2, 2.6);
  group.add(light);

  return group;
}

function disposeMuzzleFlash(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    } else if (child instanceof THREE.Light) {
      child.dispose?.();
    }
  });
  if (obj.parent) {
    obj.parent.remove(obj);
  }
}

function recycleMuzzleFlash(obj: THREE.Object3D) {
  obj.visible = false;
  if (muzzleFlashPool.length < MAX_MUZZLE_FLASHES) {
    muzzleFlashPool.push(obj);
  } else {
    disposeMuzzleFlash(obj);
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
  const mouseHeld = useRef(false);
  const impactTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const casingRafs = useRef<number[]>([]);
  const liveFx = useRef<Array<{ mesh: THREE.Object3D; recycle: (m: THREE.Object3D) => void }>>([]);
  // Akimbo weapons alternate hands, so every shot flips this.
  const akimboSide = useRef<AkimboSide>(1);

  const dropLiveFx = useCallback((mesh: THREE.Object3D) => {
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
    liveFx.current.push({ mesh: spark, recycle: (m) => recycleImpact(m as THREE.Mesh) });

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
    const it = impactTimers.current;
    const ft = flashTimers.current;
    const cr = casingRafs.current;
    const lf = liveFx.current;
    return () => {
      it.forEach(clearTimeout);
      ft.forEach(clearTimeout);
      cr.forEach((id) => cancelAnimationFrame(id));
      it.length = 0;
      ft.length = 0;
      cr.length = 0;
      lf.forEach(({ mesh, recycle }) => {
        if (mesh.parent) mesh.parent.remove(mesh);
        recycle(mesh);
      });
      lf.length = 0;
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
    liveFx.current.push({ mesh: casing, recycle: (m) => recycleShellCasing(m as THREE.Mesh) });

    const casingDir = new THREE.Vector3(
      (0.5 + Math.random() * 0.3) * side,
      0.8 + Math.random() * 0.4,
      -0.2 + Math.random() * 0.2
    );
    casingDir.applyQuaternion(camera.quaternion);

    // Frame-rate independent ejection physics using real delta-time
    const initialSpeed = 4.8; // m/s
    const velocity = casingDir.clone().multiplyScalar(initialSpeed);
    const gravityY = -9.8; // m/s^2 standard gravity
    const duration = 1.0; // 1.0s lifetime before recycling
    let elapsed = 0;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      elapsed += dt;

      velocity.y += gravityY * dt;
      casing.position.addScaledVector(velocity, dt);
      casing.rotation.x += 12 * dt;
      casing.rotation.y += 9 * dt;

      if (casing.position.y < 0.05) {
        casing.position.y = 0.05;
        velocity.y = -velocity.y * 0.3;
        const damp = Math.pow(0.5, dt * 60);
        velocity.x *= damp;
        velocity.z *= damp;
      }

      if (elapsed < duration) {
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
      gameEvents.emit("hitMarker", { headshot: isHead });
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

      if (gameMode === "zombie") {
        const aim = getArcadeAim();
        const meleeHit = zombieEngine.handleMelee({ direction: aim.direction });
        if (meleeHit) gameEvents.emit("hitMarker", { headshot: false, killed: meleeHit.killed });
      } else if (gameMode === "l4d") {
        camera.getWorldDirection(shootDirection);
        const st = useL4DStore.getState();
        const origin = camera.position;
        let bestId: string | null = null;
        let bestD = 2.4;
        for (const inf of st.infected) {
          if (inf.isDead) continue;
          const dx = inf.x - origin.x, dy = 0.9 - origin.y, dz = inf.z - origin.z;
          const d = Math.hypot(dx, dy, dz);
          if (d < bestD) {
            const dirDot = (dx * shootDirection.x + dz * shootDirection.z) / Math.max(0.01, Math.hypot(dx, dz));
            if (dirDot > 0.35) { bestD = d; bestId = inf.id; }
          }
        }
        if (bestId) {
          const lucky = Date.now() < useL4DStore.getState().luckyShotUntil ? 1.6 : 1;
          const killed = useL4DStore.getState().damageInfected(bestId, Math.round(70 * lucky));
          gameEvents.emit("hitMarker", { headshot: false, killed });
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
        const killed = useOffline5v5Store.getState().localShoot(targetId, false);
        emitOfflineHitMarker(targetId, false, killed);
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

    if (gameMode === "l4d") {
      const me = useL4DStore.getState().survivors[0];
      if (me && (me.isDowned || me.isDead || me.pinnedBy || me.grabbedBy)) return;
    }

    if (isMeleeWeapon(activeWeapon)) {
      meleeAttack(activeWeapon, gameMode);
      return;
    }

    if (isZombieArcade()) {
      if (activeWeapon === "he" || activeWeapon === "smoke" || activeWeapon === "flash") return;
      const aim = getArcadeAim();
      shootOrigin.copy(aim.origin);
      _arcadeDir.copy(aim.direction).normalize();
      const accSpread = ((100 - (useHeroStore.getState().hero.stats.accuracy || 85)) / 100) * 0.04;
      if (accSpread > 0) {
        _arcadeDir.x += (Math.random() - 0.5) * accSpread;
        _arcadeDir.z += (Math.random() - 0.5) * accSpread;
        _arcadeDir.normalize();
      }
      const stats = WEAPONS[activeWeapon];
      const baseDmg = stats?.dmg ?? 35;
      const zombiePlayer = useZombieStore.getState().player;
      const tier = zombiePlayer.weaponTiers?.[activeWeapon] ?? 0;
      // Tier 1: +75% DMG, Tier 2: +160% DMG, Tier 3: +260% DMG
      const tierMult = 1 + tier * 0.85;
      const doubleTapMult = zombiePlayer.perks?.includes("double_tap") ? 1.4 : 1.0;
      const heroDmgMult = (useHeroStore.getState().hero.stats.damage || 25) / 25;
      const finalDmg = Math.round(baseDmg * tierMult * doubleTapMult * heroDmgMult);
      const pierce = tier >= 3;
      const hit = zombieEngine.handleShoot(shootOrigin, _arcadeDir, finalDmg, pierce);
      const wallDist = zombieEngine.wallDistance(shootOrigin, _arcadeDir, 70);
      if (hit) {
        _tempVec3.set(hit.x, hit.y, hit.z);
        gameEvents.emit("hitMarker", { headshot: hit.headshot, killed: !!hit.killed });
      } else {
        _tempVec3.copy(shootOrigin).addScaledVector(_arcadeDir, wallDist);
      }
      spawnImpact(_tempVec3);
      useGameStore.getState().setTracerEvent({
        start: { x: shootOrigin.x, y: shootOrigin.y, z: shootOrigin.z },
        end: { x: _tempVec3.x, y: _tempVec3.y, z: _tempVec3.z },
      });
      const side: AkimboSide = isAkimboWeapon(activeWeapon, useWeaponStore.getState().dualWield) ? akimboSide.current : 1;
      akimboSide.current = side === 1 ? -1 : 1;
      createMuzzleFlash(side);
      createShellCasing(side);
      useGameStore.getState().triggerShoot();
      gameEvents.emit("weaponFired", { weapon: activeWeapon, akimboSide: side });
      Sound.gunshot(activeWeapon);
      incrementBullets();
      setLastFireTime(performance.now());
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
      (Math.random() - 0.5) * spread * (gameMode === "l4d" ? 0.45 : 1),
      (Math.random() - 0.5) * spread * (gameMode === "l4d" ? 0.45 : 1)
    );

    raycaster.far = 90;
    raycaster.setFromCamera(spreadDir, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validHits = intersects.filter((hit) => {
      if (hit.distance < 0.25) return false;
      return !shotIgnored(hit.object);
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
        const killed = useOffline5v5Store.getState().localShoot(targetId, isHead);
        emitOfflineHitMarker(targetId, isHead, killed);
      }

      if (gameMode === "l4d") {
        const inf = infectedFrom(hit.object);
        if (inf) {
          const stats = WEAPONS[activeWeapon];
          const lucky = Date.now() < useL4DStore.getState().luckyShotUntil ? 1.6 : 1;
          const dmgVal = Math.round((inf.isHead ? (stats?.headshot ?? 70) : (stats?.dmg ?? 35)) * lucky);
          const killed = useL4DStore.getState().damageInfected(inf.id, dmgVal);
          gameEvents.emit("hitMarker", { headshot: inf.isHead, killed });
        }
      }
    } else {
      // Missed / open air: spawn tracer along aim direction
      const startPos = gameMode === "zombie"
        ? shootOrigin.clone()
        : camera.getWorldPosition(_tempVec3);
      _muzzleOffset
        .copy(getMuzzleOffset(activeWeapon, side, useWeaponStore.getState().dualWield))
        .applyQuaternion(camera.quaternion);
      startPos.add(_muzzleOffset);
      const endPos = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(70));
      useGameStore.getState().setTracerEvent({
        start: { x: startPos.x, y: startPos.y, z: startPos.z },
        end: { x: endPos.x, y: endPos.y, z: endPos.z },
      });
      if (gameMode === "offline5v5") {
        useOffline5v5Store.getState().localShoot(null, false);
      } else if (gameMode === "training") {
        useGameStore.getState().incrementShots();
      }
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
          const locked = !!document.pointerLockElement;
          const tag = (e.target as HTMLElement | null)?.tagName;
          if (!locked && tag !== "CANVAS") return;
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
