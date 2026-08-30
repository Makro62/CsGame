// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GRENADE } from "@cs-game/shared";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useGameStore } from "../../stores/useGameStore";
import { gameEvents } from "../../lib/gameEvents";
import { Sound } from "../../components/AudioManager";
import { triggerScreenShake } from "../effects/screenShake";

// ─── Object Pool: reusable Vector3 instances ───
const _dir = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

interface ThrownGrenade {
  id: string;
  type: "he" | "smoke" | "flash";
  throwerId: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotSpeed: THREE.Vector3;
  detonated: boolean;
  detonateTime: number;
  fuseEndTime: number;
}

const COLORS: Record<string, string> = {
  he: "#2d5a2d",
  smoke: "#4b5563",
  flash: "#1e293b",
};

interface LocalSmokeCloud {
  id: string;
  x: number;
  z: number;
  startTime: number;
  duration: number;
}

export function GrenadeSystem() {
  const { camera } = useThree();
  const [grenades, setGrenades] = useState<ThrownGrenade[]>([]);
  const [localSmokes, setLocalSmokes] = useState<LocalSmokeCloud[]>([]);
  const charge = useRef(0);
  const charging = useRef(false);
  const lastThrow = useRef(0);

  // Cycle grenade type with X
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyX") {
        e.preventDefault();
        useWeaponStore.getState().cycleGrenadeType();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Handle detonation effects (Audio, Visuals, Damage, Flash)
  const triggerDetonationEffects = (g: ThrownGrenade) => {
    if (g.type === "he") {
      Sound.explosion();
      triggerScreenShake(0.22);
      // Apply splash damage in training mode
      const gameMode = useGameStore.getState().mode;
      if (gameMode === "training") {
        // Broadcast targetDamaged to training bots within 4m
        const targets = useGameStore.getState().targets;
        Object.values(targets).forEach((target) => {
          const dist = Math.sqrt(
            (target.x - g.position.x) ** 2 + (target.z - g.position.z) ** 2
          );
          if (dist <= 4) {
            const dmg = Math.round(80 * (1 - dist / 4));
            useGameStore.getState().damageTarget(target.id, dmg, false);
          }
        });
      }
    } else if (g.type === "smoke") {
      Sound.smokeHiss();
      setLocalSmokes((prev) => [
        ...prev,
        {
          id: `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x: g.position.x,
          z: g.position.z,
          startTime: performance.now(),
          duration: GRENADE.smokeDuration * 1000,
        },
      ]);
    } else if (g.type === "flash") {
      Sound.flashbangBang();
      gameEvents.emit("flashbang", {
        x: g.position.x,
        y: g.position.y,
        z: g.position.z,
        throwerId: g.throwerId,
      });
    }
  };

  // Listen to throw and detonation events
  useEffect(() => {
    const onThrown = (data: {
      id: string;
      type: string;
      throwerId: string;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
    }) => {
      Sound.grenadeThrow();
      const now = performance.now();
      setGrenades((prev) => [
        ...prev.filter((g) => g.id !== data.id),
        {
          id: data.id,
          type: data.type as "he" | "smoke" | "flash",
          throwerId: data.throwerId,
          position: new THREE.Vector3(data.x, data.y, data.z),
          velocity: new THREE.Vector3(data.vx, data.vy, data.vz),
          rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          ),
          detonated: false,
          detonateTime: 0,
          fuseEndTime: now + GRENADE.fuse * 1000,
        },
      ]);
    };

    const onDetonated = (data: { id: string; type: string; x: number; y: number; z: number }) => {
      setGrenades((prev) =>
        prev.map((g) => {
          if (g.id === data.id && !g.detonated) {
            const updated = {
              ...g,
              position: new THREE.Vector3(data.x, data.y, data.z),
              detonated: true,
              detonateTime: performance.now(),
            };
            triggerDetonationEffects(updated);
            return updated;
          }
          return g;
        })
      );
    };

    gameEvents.on("nadeThrown", onThrown);
    gameEvents.on("nadeDetonated", onDetonated);
    return () => {
      gameEvents.off("nadeThrown", onThrown);
      gameEvents.off("nadeDetonated", onDetonated);
    };
  }, []);

  // Throw input: hold G to charge, release to throw
  const [chargingState, setChargingState] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyG" && !charging.current) {
        charging.current = true;
        charge.current = 0;
        setChargingState(true);
        Sound.grenadePin();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyG" && charging.current) {
        charging.current = false;
        setChargingState(false);
        const { sendThrowGrenade } = useNetworkStore.getState();
        const { grenadeType } = useWeaponStore.getState();

        if (performance.now() - lastThrow.current < GRENADE.cooldownMs) return;
        lastThrow.current = performance.now();

        const power = 0.4 + charge.current * 0.6; // 0.4x .. 1x throw speed

        camera.getWorldDirection(_dir);
        camera.getWorldPosition(_pos);
        _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        _origin
          .copy(_pos)
          .addScaledVector(_dir, GRENADE.startPosOffset)
          .addScaledVector(_right, 0.16)
          .addScaledVector(_up, -0.12);
        _velocity.copy(_dir).multiplyScalar(GRENADE.throwSpeed * power);
        _velocity.y += GRENADE.throwUpSpeed;

        const nadeData = {
          id: `nade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: grenadeType,
          throwerId: "local",
          x: _origin.x,
          y: _origin.y,
          z: _origin.z,
          vx: _velocity.x,
          vy: _velocity.y,
          vz: _velocity.z,
        };

        gameEvents.emit("nadeThrown", nadeData);

        const gameMode = useGameStore.getState().mode;
        if (gameMode !== "training" && gameMode !== "zombie") {
          sendThrowGrenade({
            type: grenadeType,
            origin: { x: _origin.x, y: _origin.y, z: _origin.z },
            velocity: { x: _velocity.x, y: _velocity.y, z: _velocity.z },
          });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera]);

  // Frame update: simulate arc trajectory, bouncing, rotation, and fuse timer
  useFrame((_, dt) => {
    if (charging.current) {
      charge.current = Math.min(1, charge.current + dt * 1.4);
    }

    const now = performance.now();

    // Clean up expired smoke clouds
    setLocalSmokes((prev) =>
      prev.filter((s) => now - s.startTime < s.duration)
    );

    if (grenades.length === 0) return;

    setGrenades((prev) => {
      let changed = false;
      const next = prev
        .map((g) => {
          // Remove explosion visual after 1.5s
          if (g.detonated) {
            if (now - g.detonateTime > 1500) {
              changed = true;
              return null;
            }
            return g;
          }

          // Check if fuse timer expired
          if (now >= g.fuseEndTime) {
            changed = true;
            const detonated = {
              ...g,
              detonated: true,
              detonateTime: now,
            };
            triggerDetonationEffects(detonated);
            return detonated;
          }

          changed = true;
          // Fixed-size substeps keep fast throws and bounces stable when a
          // rendered frame is late.
          const frameDt = Math.min(dt, 0.05);
          const steps = Math.max(1, Math.ceil(frameDt / (1 / 120)));
          const stepDt = frameDt / steps;
          for (let step = 0; step < steps; step++) {
            g.velocity.y -= 9.81 * stepDt;
            g.position.addScaledVector(g.velocity, stepDt);
            g.rotation.x += g.rotSpeed.x * stepDt;
            g.rotation.y += g.rotSpeed.y * stepDt;
            g.rotation.z += g.rotSpeed.z * stepDt;

            if (g.position.y <= 0.15) {
              g.position.y = 0.15;
              if (g.velocity.y < 0) {
                g.velocity.y = -g.velocity.y * GRENADE.bounce;
                g.velocity.x *= GRENADE.bounceXZ;
                g.velocity.z *= GRENADE.bounceXZ;
                g.rotSpeed.multiplyScalar(0.7);
              }
              if (g.velocity.lengthSq() < 0.16) g.velocity.set(0, 0, 0);
            }
          }
          return g;
        })
        .filter((g): g is ThrownGrenade => g !== null);

      return changed ? next : prev;
    });
  });

  const serverSmokes = useNetworkStore((s) => s.smokes);

  return (
    <group>
      {chargingState && <PreviewArc powerRef={charge} />}
      {grenades.map((g) => (
        <GrenadeMesh key={g.id} grenade={g} />
      ))}
      {serverSmokes.map((s, i) => (
        <SmokeCloud key={`srv-${i}`} x={s.x} z={s.z} timeLeft={s.timeLeft} />
      ))}
      {localSmokes.map((s) => (
        <SmokeCloud
          key={s.id}
          x={s.x}
          z={s.z}
          timeLeft={Math.max(0, (s.duration - (performance.now() - s.startTime)) / 1000)}
        />
      ))}
    </group>
  );
}

const PREVIEW_POINT_COUNT = 60;

function PreviewArc({ powerRef }: { powerRef: MutableRefObject<number> }) {
  const { camera } = useThree();
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(
      new Float32Array(PREVIEW_POINT_COUNT * 3),
      3
    );
    attribute.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", attribute);
    return geo;
  }, []);
  const vectors = useRef({
    direction: new THREE.Vector3(),
    origin: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    position: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
  });

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const v = vectors.current;
    camera.getWorldDirection(v.direction);
    camera.getWorldPosition(v.origin);
    v.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    v.origin
      .addScaledVector(v.direction, GRENADE.startPosOffset)
      .addScaledVector(v.right, 0.16)
      .addScaledVector(v.up, -0.12);

    const power = 0.4 + powerRef.current * 0.6;
    v.velocity.copy(v.direction).multiplyScalar(GRENADE.throwSpeed * power);
    v.velocity.y += GRENADE.throwUpSpeed;
    v.position.copy(v.origin);

    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const stepDt = 0.03;
    for (let i = 0; i < PREVIEW_POINT_COUNT; i++) {
      v.velocity.y -= 9.81 * stepDt;
      v.position.addScaledVector(v.velocity, stepDt);
      if (v.position.y <= 0.15) {
        v.position.y = 0.15;
        if (v.velocity.y < 0) {
          v.velocity.y = -v.velocity.y * GRENADE.bounce;
          v.velocity.x *= GRENADE.bounceXZ;
          v.velocity.z *= GRENADE.bounceXZ;
        }
      }
      positions.setXYZ(i, v.position.x, v.position.y, v.position.z);
    }
    positions.needsUpdate = true;
  });

  return (
    <points>
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial
        color="#ffd54a"
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

function GrenadeMesh({ grenade }: { grenade: ThrownGrenade }) {
  const age = (performance.now() - grenade.detonateTime) / 1000;

  if (grenade.detonated) {
    if (grenade.type === "he") {
      const radius = Math.min(1.2 + age * 8, 7.5);
      const opacity = Math.max(0, 1 - age * 2.2);

      return (
        <group position={grenade.position.toArray()}>
          {/* Expanding fireball */}
          <mesh>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshBasicMaterial color="#ff5500" transparent opacity={opacity * 0.9} depthWrite={false} />
          </mesh>
          {/* Inner core flash */}
          <mesh>
            <sphereGeometry args={[radius * 0.55, 12, 12]} />
            <meshBasicMaterial color="#ffffaa" transparent opacity={opacity} depthWrite={false} />
          </mesh>
          {/* Dynamic point light for explosion */}
          <pointLight color="#ff7700" intensity={Math.max(0, 15 * (1 - age * 3))} distance={18} />
        </group>
      );
    }
    return null;
  }

  return (
    <group position={grenade.position.toArray()} rotation={grenade.rotation}>
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 0.12, 12]} />
        <meshStandardMaterial color={COLORS[grenade.type] ?? "#2d5a2d"} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.03, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
    </group>
  );
}

function SmokeCloud({ x, z, timeLeft }: { x: number; z: number; timeLeft: number }) {
  const opacity = Math.min(0.95, Math.max(0.2, timeLeft / 3));
  const scale = Math.min(1.8, 1 + (GRENADE.smokeDuration - timeLeft) * 0.05);

  return (
    <group position={[x, 0.8, z]}>
      <mesh position={[0, 0.6, 0]} scale={[scale, scale * 0.75, scale]}>
        <sphereGeometry args={[GRENADE.smokeRadius, 14, 14]} />
        <meshStandardMaterial
          color="#64748b"
          transparent
          opacity={opacity * 0.85}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[1.0, 0.3, 0.6]} scale={[scale * 0.8, scale * 0.6, scale * 0.8]}>
        <sphereGeometry args={[GRENADE.smokeRadius, 12, 12]} />
        <meshStandardMaterial
          color="#475569"
          transparent
          opacity={opacity * 0.75}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.8, 0.4, -0.7]} scale={[scale * 0.75, scale * 0.55, scale * 0.75]}>
        <sphereGeometry args={[GRENADE.smokeRadius, 12, 12]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={opacity * 0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}