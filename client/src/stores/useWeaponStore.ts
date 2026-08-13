import { create } from "zustand";
import { WEAPONS } from "@cs-game/shared";
import { useNetworkStore } from "./useNetworkStore";

export type WeaponKey = keyof typeof WEAPONS;

interface WeaponState {
  activeWeapon: WeaponKey | null;
  primaryWeapon: WeaponKey | null;
  secondaryWeapon: WeaponKey | null;
  knifeSlot: WeaponKey;
  currentAmmo: number;
  maxAmmo: number;
  primaryAmmo: number;
  primaryMaxAmmo: number;
  primaryReserve: number;
  secondaryAmmo: number;
  secondaryMaxAmmo: number;
  secondaryReserve: number;
  isReloading: boolean;
  reloadStartTime: number | null;
  isADS: boolean;
  recoilOffset: { x: number; y: number };
  lastFireTime: number;
  isSwitching: boolean;
  switchTimer: number;
  bulletsFired: number;
  lastFireTimestamp: number;
  grenadeType: "he" | "smoke" | "flash";

  equipWeapon: (weapon: WeaponKey) => void;
  switchToSlot: (slot: 1 | 2 | 3) => void;
  cycleGrenadeType: () => void;
  setGrenadeType: (type: "he" | "smoke" | "flash") => void;
  startReload: () => void;
  cancelReload: () => void;
  finishReload: () => void;
  setADS: (ads: boolean) => void;
  updateRecoil: (x: number, y: number) => void;
  incrementBullets: () => void;
  resetBullets: () => void;
  setSwitching: (switching: boolean) => void;
  setLastFireTime: (time: number) => void;
  canFire: () => boolean;
}

export type GrenadeType = "he" | "smoke" | "flash";

const GRENADE_CYCLE: GrenadeType[] = ["he", "smoke", "flash"];

const DEPLOY_TIMES: Record<WeaponKey, number> = {
  ak47: 0.6,
  m4a1: 0.6,
  awp: 1.0,
  deagle: 0.4,
  mp5: 0.5,
  glock: 0.35,
  tec9: 0.4,
  autopistol: 0.35,
  knife: 0.3,
  combatknife: 0.25,
};

export const useWeaponStore = create<WeaponState>()((set, get) => ({
  activeWeapon: null,
  primaryWeapon: null,
  secondaryWeapon: "deagle",
  knifeSlot: "knife",
  currentAmmo: 0,
  maxAmmo: 0,
  primaryAmmo: 0,
  primaryMaxAmmo: 0,
  primaryReserve: 0,
  secondaryAmmo: 7,
  secondaryMaxAmmo: 7,
  secondaryReserve: 42,
  isReloading: false,
  reloadStartTime: null,
  isADS: false,
  recoilOffset: { x: 0, y: 0 },
  lastFireTime: 0,
  isSwitching: false,
  switchTimer: 0,
  bulletsFired: 0,
  lastFireTimestamp: 0,
  grenadeType: "he",

  cycleGrenadeType: () => {
    const { grenadeType } = get();
    const idx = GRENADE_CYCLE.indexOf(grenadeType);
    set({ grenadeType: GRENADE_CYCLE[(idx + 1) % GRENADE_CYCLE.length] });
  },

  setGrenadeType: (type: GrenadeType) => {
    set({ grenadeType: type });
  },

  equipWeapon: (weapon: WeaponKey) => {
    const stats = WEAPONS[weapon];
    const isPrimary = ["ak47", "m4a1", "awp", "mp5"].includes(weapon);
    const isSecondary = ["deagle", "glock", "tec9", "autopistol"].includes(weapon);
    const isKnife = ["knife", "combatknife"].includes(weapon);

    set((state) => ({
      activeWeapon: weapon,
      primaryWeapon: isPrimary ? weapon : state.primaryWeapon,
      secondaryWeapon: isSecondary ? weapon : state.secondaryWeapon,
      knifeSlot: isKnife ? weapon : state.knifeSlot,
      currentAmmo: stats.mag,
      maxAmmo: stats.mag,
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: DEPLOY_TIMES[weapon],
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
    }, DEPLOY_TIMES[weapon] * 1000);
  },

  switchToSlot: (slot: 1 | 2 | 3) => {
    const { primaryWeapon, secondaryWeapon, knifeSlot, activeWeapon, currentAmmo } = get();
    let target: WeaponKey | null = null;

    if (slot === 1) target = primaryWeapon;
    else if (slot === 2) target = secondaryWeapon;
    else if (slot === 3) target = knifeSlot;

    if (!target || target === activeWeapon) return;

    const stats = WEAPONS[target];

    // Save current slot's ammo before switching
    if (activeWeapon && (activeWeapon === primaryWeapon)) {
      set({ primaryAmmo: currentAmmo });
    } else if (activeWeapon && (activeWeapon === secondaryWeapon)) {
      set({ secondaryAmmo: currentAmmo });
    }

    // Load target slot's saved ammo
    let ammo: number = stats.mag;
    if (slot === 1) {
      const saved = get().primaryAmmo;
      ammo = saved > 0 ? saved : stats.mag;
    } else if (slot === 2) {
      const saved = get().secondaryAmmo;
      ammo = saved > 0 ? saved : stats.mag;
    }
    // Knife: ammo = 0

    set({
      activeWeapon: target,
      currentAmmo: slot === 3 ? 0 : ammo,
      maxAmmo: slot === 3 ? 0 : (stats.mag as number),
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: DEPLOY_TIMES[target],
      bulletsFired: 0,
      lastFireTimestamp: 0,
    });

    // Send to server
    useNetworkStore.getState().sendSwitchWeapon(slot);

    setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
    }, DEPLOY_TIMES[target] * 1000);
  },

  startReload: () => {
    const { activeWeapon, isReloading, currentAmmo, maxAmmo } = get();
    if (!activeWeapon || isReloading || currentAmmo === maxAmmo) return;
    set({ isReloading: true, reloadStartTime: Date.now() });
  },

  cancelReload: () => {
    const { isReloading } = get();
    if (!isReloading) return;
    set({ isReloading: false, reloadStartTime: null });
  },

  finishReload: () => {
    const { activeWeapon } = get();
    if (!activeWeapon) return;
    const stats = WEAPONS[activeWeapon];
    set({ currentAmmo: stats.mag, isReloading: false, reloadStartTime: null });
  },

  setADS: (ads: boolean) => {
    set({ isADS: ads });
  },

  updateRecoil: (x: number, y: number) => {
    set({ recoilOffset: { x, y } });
  },

  incrementBullets: () => {
    const { bulletsFired, currentAmmo } = get();
    set({
      bulletsFired: bulletsFired + 1,
      currentAmmo: Math.max(0, currentAmmo - 1),
      lastFireTimestamp: performance.now(),
    });
  },

  resetBullets: () => {
    set({ bulletsFired: 0 });
  },

  setSwitching: (switching: boolean) => {
    set({ isSwitching: switching });
  },

  setLastFireTime: (time: number) => {
    set({ lastFireTime: time });
  },

  canFire: () => {
    const { activeWeapon, currentAmmo, isReloading, isSwitching, lastFireTime } = get();
    if (!activeWeapon || currentAmmo <= 0 || isReloading || isSwitching) return false;

    const now = performance.now();
    const stats = WEAPONS[activeWeapon];
    const minInterval = 1000 / stats.fireRate;

    return now - lastFireTime >= minInterval;
  },
}));
