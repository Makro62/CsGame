import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GRENADE } from "@cs-game/shared";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { gameEvents } from "../../lib/gameEvents";

interface ThrownGrenade {
  id: string;
  type: "he" | "smoke" | "flash";
  throwerId: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  detonated: boolean;
  detonateTime: number;
}

const COLORS: Record<string, string> = {
  he: "#2d5a2d",
  smoke: "#8b8b8b",
  flash: "#d4c84a",
};

export function GrenadeSystem() {
  const { camera } = useThree();
  const [grenades, setGrenades] = useState<ThrownGrenade[]>([]);
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

  // Server-driven events
  useEffect(() => {
    const onThrown = (data: { id: string; type: string; throwerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }) => {
      setGrenades((prev) => [
        ...prev.filter((g) => g.id !== data.id),
        {
          id: data.id,
          type: data.type as "he" | "smoke" | "flash",
          throwerId: data.throwerId,
          position: new THREE.Vector3(data.x, data.y, data.z),
          velocity: new THREE.Vector3(data.vx, data.vy, data.vz),
          detonated: false,
          detonateTime: 0,
        },
      ]);
    };

    const onDetonated = (data: { id: string; type: string; x: number; y: number; z: number }) => {
      setGrenades((prev) =>
        prev.map((g) =>
          g.id === data.id
            ? {
                ...g,
                position: new THREE.Vector3(data.x, data.y, data.z),
                detonated: true,
                detonateTime: performance.now(),
              }
            : g
        )
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
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyG" && charging.current) {
        charging.current = false;
        setChargingState(false);
        const { sendThrowGrenade, localGrenadeHE, localGrenadeSmoke, localGrenadeFlash } =
          useNetworkStore.getState();
        const { grenadeType, activeWeapon } = useWeaponStore.getState();

        const hasType =
          grenadeType === "he"
            ? localGrenadeHE > 0
            : grenadeType === "smoke"
              ? localGrenadeSmoke > 0
              : localGrenadeFlash > 0;
        if (!hasType) return;
        // Only throw while holding a non-grenade weapon slot
        if (activeWeapon === "knife" || activeWeapon === "combatknife") return;
        if (performance.now() - lastThrow.current < GRENADE.cooldownMs) return;
        lastThrow.current = performance.now();

        const dir = new THREE.Vector3();
        const pos = new THREE.Vector3();
        camera.getWorldDirection(dir);
        camera.getWorldPosition(pos);
        const origin = pos
          .clone()
          .add(dir.clone().multiplyScalar(GRENADE.startPosOffset));
        const power = 0.35 + charge.current * 0.65; // 0.35x .. 1x throw speed
        const velocity = dir
          .clone()
          .multiplyScalar(GRENADE.throwSpeed * power)
          .add(new THREE.Vector3(0, GRENADE.throwUpSpeed, 0));

        sendThrowGrenade({
          type: grenadeType,
          origin: { x: origin.x, y: origin.y, z: origin.z },
          velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera]);

  // Simulate local trajectory until server detonation arrives + charge while holding
  useFrame((_, dt) => {
    if (charging.current) {
      charge.current = Math.min(1, charge.current + dt * 1.4);
    }
    if (grenades.length === 0) return;
    setGrenades((prev) => {
      let changed = false;
      const next = prev.map((g) => {
        if (g.detonated) return g;
        changed = true;
        g.velocity.y -= 9.81 * dt;
        g.position.addScaledVector(g.velocity, dt);
        if (g.position.y <= 0.15) {
          g.position.y = 0.15;
          g.velocity.y = -g.velocity.y * GRENADE.bounce;
          g.velocity.x *= GRENADE.bounceXZ;
          g.velocity.z *= GRENADE.bounceXZ;
          if (g.velocity.length() < 0.5) g.velocity.set(0, 0, 0);
        }
        return g;
      });
      return changed ? next : prev;
    });
  });

  const smokes = useNetworkStore((s) => s.smokes);

  return (
    <group>
      {chargingState && <PreviewArc power={charge.current} />}
      {grenades.map((g) => (
        <GrenadeMesh key={g.id} grenade={g} />
      ))}
      {smokes.map((s, i) => (
        <SmokeCloud key={i} x={s.x} z={s.z} timeLeft={s.timeLeft} />
      ))}
    </group>
  );
}

function PreviewArc({ power }: { power: number }) {
  const { camera } = useThree();
  const points = useMemo(() => {
    const dir = new THREE.Vector3();
    const pos = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.getWorldPosition(pos);
    const origin = pos.clone().add(dir.clone().multiplyScalar(GRENADE.startPosOffset));
    const speed = 0.35 + power * 0.65;
    const velocity = dir
      .clone()
      .multiplyScalar(GRENADE.throwSpeed * speed)
      .add(new THREE.Vector3(0, GRENADE.throwUpSpeed, 0));

    const pts: THREE.Vector3[] = [];
    let p = origin.clone();
    let v = velocity.clone();
    const dt = 0.03;
    for (let t = 0; t < 1.8; t += dt) {
      v.y -= 9.81 * dt;
      p = p.clone().addScaledVector(v, dt);
      if (p.y <= 0.15) {
        p.y = 0.15;
        v.y = -v.y * GRENADE.bounce;
        v.x *= GRENADE.bounceXZ;
        v.z *= GRENADE.bounceXZ;
      }
      pts.push(p.clone());
    }
    return pts;
  }, [camera, power]);

  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <line>
      <primitive object={lineGeo} attach="geometry" />
      <lineBasicMaterial color="#ffd54a" transparent opacity={0.7} depthWrite={false} />
    </line>
  );
}

function GrenadeMesh({ grenade }: { grenade: ThrownGrenade }) {
  const age = (performance.now() - grenade.detonateTime) / 1000;

  if (grenade.detonated) {
    if (grenade.type === "he") {
      // Expanding explosion sphere, fades quickly
      return (
        <mesh position={grenade.position.toArray()}>
          <sphereGeometry args={[Math.min(1.5 + age * 6, 9), 12, 12]} />
          <meshBasicMaterial
            color="#ff8c00"
            transparent
            opacity={Math.max(0, 1 - age * 3)}
            depthWrite={false}
          />
        </mesh>
      );
    }
    return null; // smoke/flash visuals handled by SmokeCloud / FlashEffect
  }

  return (
    <mesh position={grenade.position.toArray()}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color={COLORS[grenade.type] ?? "#2d5a2d"} />
    </mesh>
  );
}

function SmokeCloud({ x, z, timeLeft }: { x: number; z: number; timeLeft: number }) {
  const opacity = Math.min(1, Math.max(0.15, timeLeft / 3));
  const scale = Math.min(1.6, 1 + (GRENADE.smokeDuration - timeLeft) * 0.04);
  return (
    <group position={[x, 0.8, z]}>
      <mesh position={[0, 0.5, 0]} scale={[scale, scale * 0.7, scale]}>
        <sphereGeometry args={[GRENADE.smokeRadius, 12, 12]} />
        <meshStandardMaterial
          color="#9a9a9a"
          transparent
          opacity={opacity * 0.85}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.9, 0.2, 0.5]} scale={[scale * 0.7, scale * 0.5, scale * 0.7]}>
        <sphereGeometry args={[GRENADE.smokeRadius, 10, 10]} />
        <meshStandardMaterial
          color="#8a8a8a"
          transparent
          opacity={opacity * 0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}