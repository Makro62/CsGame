import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameEvents } from "../../lib/gameEvents";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { HUD_FONT, HUD_MONO, hudPanel } from "../../ui/hudTheme";
import { TRAINING_ARENA } from "./TrainingArena";
import { TRAINING_PANEL_ANCHOR, TRAINING_PANEL_WIDTH } from "./trainingHud";

const MAX_DECALS = 50;
const DECAL_LIFETIME = 10000;
const WALL_DISTANCE = Math.abs(TRAINING_ARENA.recoilWallZ - TRAINING_ARENA.firingLineZ);

// Only decal impacts that actually landed on the recoil wall
const WALL_FACE_Z = TRAINING_ARENA.recoilWallZ + 0.3;
const WALL_HALF_WIDTH = 7;

interface Decal {
  createdAt: number;
  mesh: THREE.Mesh;
}

function disposeDecal(scene: THREE.Scene, decal: Decal) {
  scene.remove(decal.mesh);
  decal.mesh.geometry.dispose();
  (decal.mesh.material as THREE.Material).dispose();
}

export function RecoilPractice() {
  const { scene } = useThree();
  const decals = useRef<Decal[]>([]);

  // The UI promises infinite ammo, so make the magazine actually stay full
  useEffect(() => {
    const store = useWeaponStore.getState();
    store.setInfiniteAmmo(true);
    store.finishReload();
    return () => useWeaponStore.getState().setInfiniteAmmo(false);
  }, []);

  // Decals come from the shooting raycast, so they land exactly where the
  // bullet did instead of on an imaginary plane.
  useEffect(() => {
    const onImpact = (hit: {
      x: number;
      y: number;
      z: number;
      nx: number;
      ny: number;
      nz: number;
    }) => {
      const onWall =
        Math.abs(hit.z - TRAINING_ARENA.recoilWallZ) < 0.6 &&
        Math.abs(hit.x) <= WALL_HALF_WIDTH;
      if (!onWall) return;

      if (decals.current.length >= MAX_DECALS) {
        const oldest = decals.current.shift();
        if (oldest) disposeDecal(scene, oldest);
      }

      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.035, 8),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      mesh.position.set(hit.x, hit.y, WALL_FACE_Z + 0.01);
      scene.add(mesh);

      decals.current.push({ createdAt: performance.now(), mesh });
    };

    gameEvents.on("bulletImpact", onImpact);
    return () => {
      gameEvents.off("bulletImpact", onImpact);
      decals.current.forEach((decal) => disposeDecal(scene, decal));
      decals.current = [];
    };
  }, [scene]);

  useFrame(() => {
    const now = performance.now();
    decals.current = decals.current.filter((decal) => {
      if (now - decal.createdAt > DECAL_LIFETIME) {
        disposeDecal(scene, decal);
        return false;
      }
      return true;
    });
  });

  return null;
}

export function RecoilPracticeUI() {
  const bulletsFired = useWeaponStore((s) => s.bulletsFired);
  const activeWeapon = useWeaponStore((s) => s.activeWeapon);

  return (
    <div style={{ ...TRAINING_PANEL_ANCHOR, fontFamily: HUD_FONT, userSelect: "none" }}>
      <div
        style={{
          ...hudPanel("amber"),
          width: TRAINING_PANEL_WIDTH,
          padding: 16,
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15 }}>⚡</span>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: "#fbbf24" }}>
            RECOIL DRILL
          </span>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: 10,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: HUD_MONO, fontSize: 30, fontWeight: 900, color: "#f8fafc" }}>
            {bulletsFired}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 1 }}>SHOTS IN BURST</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
          <Row label="Weapon" value={activeWeapon?.toUpperCase() ?? "NONE"} valueColor="#fbbf24" />
          <Row label="Wall distance" value={`${WALL_DISTANCE} m`} />
          <Row label="Ammo" value="INFINITE" valueColor="#4ade80" />
          <Row label="Bullet holes" value="10 s" />
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 10,
            color: "#94a3b8",
            lineHeight: 1.5,
          }}
        >
          Tahan tembakan lalu tarik mouse mengikuti pola. Lepas 1–2 detik untuk reset spray.
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueColor = "#e2e8f0",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ fontWeight: 800, color: valueColor, fontFamily: HUD_MONO }}>{value}</span>
    </div>
  );
}
