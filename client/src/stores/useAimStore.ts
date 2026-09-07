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

const _origin = new THREE.Vector3(0, 0.35, -30);
const _direction = new THREE.Vector3(0, 0, 1);
const _pos = new THREE.Vector3(0, 0, -30);

export const useAimStore = create<AimState>((set, get) => ({
  origin: _origin,
  direction: _direction,
  yaw: 0,
  pos: _pos,
  cursorNdc: { x: 0, y: 0 },
  setAim: (origin, direction, yaw, pos) => {
    if (!origin || !direction || !pos) return;
    if (!Number.isFinite(yaw)) return;
    _origin.copy(origin);
    _direction.copy(direction);
    _pos.copy(pos);
    const s = get();
    if (s.yaw !== yaw) {
      set({ yaw });
    }
  },
  setCursorNdc: (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const cur = get().cursorNdc;
    if (Math.abs(cur.x - x) < 0.0002 && Math.abs(cur.y - y) < 0.0002) return;
    set({ cursorNdc: { x, y } });
  },
}));
