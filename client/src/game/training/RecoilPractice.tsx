import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { gameEvents } from "../../lib/gameEvents";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { TRAINING_ARENA } from "./TrainingArena";

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
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "white",
        fontFamily: "monospace",
        fontSize: "12px",
        background: "rgba(0,0,0,0.7)",
        padding: "8px 16px",
        borderRadius: "4px",
        zIndex: 100,
        textAlign: "center",
      }}
    >
      <div>
        RECOIL PRACTICE — {activeWeapon?.toUpperCase() ?? "NO WEAPON"} · WALL{" "}
        {WALL_DISTANCE}M
      </div>
      <div style={{ fontSize: "10px", color: "#9ca3af" }}>
        Burst: {bulletsFired} shots • Infinite ammo • Bullet holes last 10s
      </div>
    </div>
  );
}
