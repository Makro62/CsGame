import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ZombieState, ZombieType, ZOMBIE_TYPES } from "@cs-game/shared";
import { ZombieHealthBar } from "./ZombieHealthBar";

const ZOMBIE_COLORS: Record<ZombieType, {
  body: string;
  head: string;
  eyes: string;
  arms: string;
  accent: string;
}> = {
  walker: { body: "#5a7a28", head: "#6d8a32", eyes: "#ff2a2a", arms: "#4a6820", accent: "#3d5418" },
  runner: { body: "#c45c18", head: "#d9782a", eyes: "#ffe14a", arms: "#a34710", accent: "#7a320c" },
  tank: { body: "#3d5a5a", head: "#4a6c6c", eyes: "#ff5c5c", arms: "#2e4848", accent: "#1a2e2e" },
  spitter: { body: "#6f9a2a", head: "#86b832", eyes: "#7cff3a", arms: "#587a20", accent: "#c8ff4a" },
  exploder: { body: "#c9b22a", head: "#e0c83a", eyes: "#fff04a", arms: "#9a8818", accent: "#111111" },
  boss: { body: "#b01010", head: "#c81818", eyes: "#ff3030", arms: "#8a0c0c", accent: "#3a0505" },
};

const SHARED_GEOMETRIES: Record<ZombieType, {
  body: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  eye: THREE.SphereGeometry;
  shoulder: THREE.BoxGeometry;
  chestPlate: THREE.BoxGeometry;
  auraRing: THREE.RingGeometry;
  extra: THREE.BufferGeometry;
}> = Object.fromEntries(
  Object.entries(ZOMBIE_TYPES).map(([type, cfg]) => {
    const s = cfg.scale ?? 1;
    const t = type as ZombieType;
    const body =
      t === "exploder"
        ? new THREE.SphereGeometry(0.55 * s, 12, 10)
        : t === "runner"
          ? new THREE.BoxGeometry(0.55 * s, 0.85 * s, 0.38 * s)
          : t === "tank"
            ? new THREE.BoxGeometry(1.15 * s, 1.15 * s, 0.7 * s)
            : new THREE.BoxGeometry(0.8 * s, 1.0 * s, 0.5 * s);
    const head =
      t === "spitter"
        ? new THREE.SphereGeometry(0.32 * s, 10, 8)
        : t === "boss"
          ? new THREE.BoxGeometry(0.72 * s, 0.62 * s, 0.55 * s)
          : new THREE.BoxGeometry(0.6 * s, 0.6 * s, 0.5 * s);
    const extra =
      t === "spitter"
        ? new THREE.SphereGeometry(0.16 * s, 8, 8)
        : t === "boss"
          ? new THREE.ConeGeometry(0.12 * s, 0.38 * s, 6)
          : t === "tank"
            ? new THREE.BoxGeometry(0.45 * s, 0.35 * s, 0.18 * s)
            : t === "exploder"
              ? new THREE.BoxGeometry(0.7 * s, 0.12 * s, 0.12 * s)
              : new THREE.BoxGeometry(0.55 * s, 0.22 * s, 0.35 * s);
    return [type, {
      body,
      head,
      arm: new THREE.BoxGeometry(
        0.2 * s,
        (t === "runner" ? 0.55 : 0.7) * s,
        0.2 * s
      ),
      leg: new THREE.BoxGeometry(
        0.25 * s,
        (t === "runner" ? 0.7 : 0.5) * s,
        0.25 * s
      ),
      eye: new THREE.SphereGeometry(0.06 * s, 8, 8),
      shoulder: new THREE.BoxGeometry(1.1 * s, 0.25 * s, 0.55 * s),
      chestPlate: new THREE.BoxGeometry(0.6 * s, 0.4 * s, 0.15 * s),
      auraRing: new THREE.RingGeometry(1.2 * s, 1.6 * s, 32),
      extra,
    }];
  })
) as unknown as Record<
  ZombieType,
  {
    body: THREE.BufferGeometry;
    head: THREE.BufferGeometry;
    arm: THREE.BoxGeometry;
    leg: THREE.BoxGeometry;
    eye: THREE.SphereGeometry;
    shoulder: THREE.BoxGeometry;
    chestPlate: THREE.BoxGeometry;
    auraRing: THREE.RingGeometry;
    extra: THREE.BufferGeometry;
  }
>;

const LEG_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.95, metalness: 0.05 });
const ARMOR_MAT = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.7, metalness: 0.5 });
const BOSS_AURA_MAT = new THREE.MeshBasicMaterial({ color: "#ff0000", transparent: true, opacity: 0.18, side: THREE.DoubleSide });

interface AnimatedZombieProps {
  zombie: ZombieState;
}

function AnimatedZombie({ zombie }: AnimatedZombieProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2);

  const colors = ZOMBIE_COLORS[zombie.type] || ZOMBIE_COLORS.walker;
  const isBoss = zombie.type === "boss";
  const isTank = zombie.type === "tank";
  const geos = SHARED_GEOMETRIES[zombie.type] || SHARED_GEOMETRIES.walker;

  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.body,
    roughness: 0.85,
    metalness: isBoss ? 0.3 : 0.08,
    emissive: colors.body,
    emissiveIntensity: 0.18,
  }), [colors.body, isBoss]);

  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.head, roughness: 0.8, metalness: isBoss ? 0.3 : 0.08,
    emissive: colors.head, emissiveIntensity: 0.12,
  }), [colors.head, isBoss]);

  const armMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.arms, roughness: 0.85, metalness: isBoss ? 0.3 : 0.08,
  }), [colors.arms, isBoss]);

  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.eyes, emissive: colors.eyes, emissiveIntensity: isBoss ? 3.5 : 2.4,
    roughness: 0.3, metalness: 0.0,
  }), [colors.eyes, isBoss]);

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: colors.accent, emissive: colors.accent, emissiveIntensity: 0.55, roughness: 0.5,
  }), [colors.accent]);

  useEffect(() => {
    return () => {
      bodyMat.dispose();
      headMat.dispose();
      armMat.dispose();
      eyeMat.dispose();
      accentMat.dispose();
    };
  }, [bodyMat, headMat, armMat, eyeMat, accentMat]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    timeRef.current += delta * (zombie.speed || 2.5);

    groupRef.current.position.set(zombie.x, zombie.y, zombie.z);
    groupRef.current.rotation.y = zombie.rotationY;

    const isExploder = zombie.type === "exploder";
    const speedMult = isBoss ? 0.6 : isTank ? 0.7 : zombie.type === "runner" ? 1.35 : 1.0;
    const swing = Math.sin(timeRef.current * 4 * speedMult) * (zombie.type === "runner" ? 0.55 : 0.4);
    const legSwing = Math.sin(timeRef.current * 4 * speedMult) * 0.3;

    if (isExploder && zombie.isAttacking) {
      const pulse = 1.0 + Math.sin(timeRef.current * 14) * 0.18;
      groupRef.current.scale.set(pulse, pulse, pulse);
      bodyMat.emissive.setHex(0xff6600);
      bodyMat.emissiveIntensity = 2.5;
    } else {
      groupRef.current.scale.set(1, 1, 1);
      bodyMat.emissive.set(colors.body);
      bodyMat.emissiveIntensity = 0.18;
    }

    if (leftArmRef.current) leftArmRef.current.rotation.x = zombie.isAttacking ? -1.35 : -0.5 + swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = zombie.isAttacking ? -1.35 : -0.5 - swing;
    if (leftLegRef.current) leftLegRef.current.position.z = legSwing * 0.22;
    if (rightLegRef.current) rightLegRef.current.position.z = -legSwing * 0.22;
  });

  const scale = ZOMBIE_TYPES[zombie.type]?.scale ?? 1;
  const showHealthBar = zombie.type === "boss" || (zombie.hp < zombie.maxHp && zombie.hp > 0);
  const barY = (isBoss ? 2.45 : 2.05) * scale;
  const bodyY = zombie.type === "exploder" ? 0.85 * scale : 0.75 * scale;
  const headY = zombie.type === "exploder" ? 1.45 * scale : 1.5 * scale;
  const armY = 1.0 * scale;
  const legY = zombie.type === "runner" ? 0.32 * scale : 0.25 * scale;

  return (
    <group ref={groupRef}>
      <mesh geometry={geos.body} material={bodyMat} position={[0, bodyY, 0]} />

      {isBoss && (
        <mesh geometry={geos.chestPlate} material={ARMOR_MAT} position={[0, 0.75 * scale, 0.3 * scale]} />
      )}
      {isTank && (
        <>
          <mesh geometry={geos.extra} material={ARMOR_MAT} position={[-0.55 * scale, 1.05 * scale, 0.28 * scale]} />
          <mesh geometry={geos.extra} material={ARMOR_MAT} position={[0.55 * scale, 1.05 * scale, 0.28 * scale]} />
        </>
      )}
      {zombie.type === "walker" && (
        <mesh geometry={geos.extra} material={accentMat} position={[0, 1.05 * scale, 0.12 * scale]} />
      )}
      {zombie.type === "spitter" && (
        <mesh geometry={geos.extra} material={accentMat} position={[0, headY, 0.38 * scale]} />
      )}
      {zombie.type === "exploder" && (
        <>
          <mesh geometry={geos.extra} material={accentMat} position={[0, bodyY, 0.42 * scale]} />
          <mesh geometry={geos.extra} material={accentMat} position={[0, bodyY + 0.18 * scale, 0.2 * scale]} rotation={[0, 0, Math.PI / 2]} />
        </>
      )}
      {isBoss && (
        <>
          <mesh geometry={geos.extra} material={accentMat} position={[-0.22 * scale, 1.92 * scale, 0]} rotation={[0, 0, -0.35]} />
          <mesh geometry={geos.extra} material={accentMat} position={[0.22 * scale, 1.92 * scale, 0]} rotation={[0, 0, 0.35]} />
        </>
      )}

      <mesh geometry={geos.head} material={headMat} position={[0, headY, 0]} />

      <mesh geometry={geos.eye} material={eyeMat} position={[-0.15 * scale, headY + 0.05 * scale, 0.25 * scale]} />
      <mesh geometry={geos.eye} material={eyeMat} position={[0.15 * scale, headY + 0.05 * scale, 0.25 * scale]} />

      {isBoss && (
        <>
          <mesh geometry={geos.eye} material={eyeMat} position={[-0.25 * scale, 1.65 * scale, 0.22 * scale]} />
          <mesh geometry={geos.eye} material={eyeMat} position={[0.25 * scale, 1.65 * scale, 0.22 * scale]} />
        </>
      )}

      <group ref={leftArmRef} position={[-0.55 * scale, armY, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={geos.arm} material={armMat} position={[0, -0.2 * scale, 0]} />
        {isBoss && <mesh geometry={geos.shoulder} material={ARMOR_MAT} position={[0, 0.3 * scale, 0]} />}
      </group>

      <group ref={rightArmRef} position={[0.55 * scale, armY, 0.15 * scale]} rotation={[-0.5, 0, 0]}>
        <mesh geometry={geos.arm} material={armMat} position={[0, -0.2 * scale, 0]} />
        {isBoss && <mesh geometry={geos.shoulder} material={ARMOR_MAT} position={[0, 0.3 * scale, 0]} />}
      </group>

      <mesh ref={leftLegRef} geometry={geos.leg} material={LEG_MAT} position={[-0.18 * scale, legY, 0]} />
      <mesh ref={rightLegRef} geometry={geos.leg} material={LEG_MAT} position={[0.18 * scale, legY, 0]} />

      {isBoss && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geos.auraRing} material={BOSS_AURA_MAT} />
      )}

      {showHealthBar && (
        <ZombieHealthBar
          hp={zombie.hp}
          maxHp={zombie.maxHp}
          position={[0, barY, 0]}
          type={zombie.type}
        />
      )}
    </group>
  );
}

interface ZombieRendererProps {
  zombies: ZombieState[];
}

export function ZombieRenderer({ zombies }: ZombieRendererProps) {
  return (
    <group>
      {zombies.map((zombie) => (
        !zombie.isDead && (
          <AnimatedZombie key={zombie.id} zombie={zombie} />
        )
      ))}
    </group>
  );
}
