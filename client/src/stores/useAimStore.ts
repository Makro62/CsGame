import { create } from "zustand";
import * as THREE from "three";

interface AimState {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  yaw: number;
  pos: THREE.Vector3;
  cursorNdc: { x: number; y: number };
  setAim: (origin: THREE.Vector3, direction: THREE.Vector3, yaw: number, pos: THREE.Vector3) => void;
  setCursorNdc: (x: number, y: number) => void;
}

export const useAimStore = create<AimState>((set) => ({
  origin: new THREE.Vector3(0,0.35,-30),
  direction: new THREE.Vector3(0,0,1),
  yaw: 0,
  pos: new THREE.Vector3(0,0,-30),
  cursorNdc: { x: 0, y: 0 },
  setAim: (origin, direction, yaw, pos) => {
    if (!origin || !direction || !pos || typeof (origin as THREE.Vector3).clone !== "function") return;
    if (!Number.isFinite(yaw)) return;
    set({ origin: origin.clone(), direction: direction.clone(), yaw, pos: pos.clone() });
  },
  setCursorNdc: (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    set({ cursorNdc: { x, y } });
  },
}));
