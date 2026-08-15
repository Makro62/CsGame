import { create } from "zustand";
import { WEAPONS } from "@cs-game/shared";
import { Sound } from "../components/AudioManager";
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

let switchTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearSwitchTimeout() {
  if (switchTimeoutId) {
    clearTimeout(switchTimeoutId);
    switchTimeoutId = null;
  }
}

export const useWeaponStore = create<WeaponState>()((set, get) => ({
  activeWeapon: "ak47",
  primaryWeapon: "ak47",
  secondaryWeapon: "deagle",
  knifeSlot: "knife",
  currentAmmo: 30,
  maxAmmo: 30,
  primaryAmmo: 30,
  primaryMaxAmmo: 30,
  primaryReserve: 90,
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
      primaryWeapon: isPrimary ? weapon : (state.primaryWeapon || "ak47"),
      secondaryWeapon: isSecondary ? weapon : (state.secondaryWeapon || "deagle"),
      knifeSlot: isKnife ? weapon : (state.knifeSlot || "knife"),
      currentAmmo: isKnife ? 0 : stats.mag,
      maxAmmo: isKnife ? 0 : stats.mag,
      primaryAmmo: isPrimary ? stats.mag : state.primaryAmmo,
      secondaryAmmo: isSecondary ? stats.mag : state.secondaryAmmo,
      primaryMaxAmmo: isPrimary ? stats.mag : state.primaryMaxAmmo,
      secondaryMaxAmmo: isSecondary ? stats.mag : state.secondaryMaxAmmo,
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: 0.15,
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    Sound.cancelReload();
    Sound.deploy(weapon);

    clearSwitchTimeout();
    switchTimeoutId = setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
      switchTimeoutId = null;
    }, 150);
  },

  switchToSlot: (slot: 1 | 2 | 3) => {
    const state = get();
    const { primaryWeapon, secondaryWeapon, knifeSlot, activeWeapon, currentAmmo } = state;
    let target: WeaponKey | null = null;

    if (slot === 1) target = primaryWeapon || "ak47";
    else if (slot === 2) target = secondaryWeapon || "deagle";
    else if (slot === 3) target = knifeSlot || "knife";

    if (!target || target === activeWeapon) return;

    const stats = WEAPONS[target];

    // Save current active weapon's ammo
    let currentPrimaryAmmo = state.primaryAmmo;
    let currentSecondaryAmmo = state.secondaryAmmo;
    if (activeWeapon && ["ak47", "m4a1", "awp", "mp5"].includes(activeWeapon)) {
      currentPrimaryAmmo = currentAmmo;
    } else if (activeWeapon && ["deagle", "glock", "tec9", "autopistol"].includes(activeWeapon)) {
      currentSecondaryAmmo = currentAmmo;
    }

    // Determine target slot's ammo
    let ammo: number = stats.mag;
    if (slot === 1) {
      ammo = typeof currentPrimaryAmmo === 'number' ? currentPrimaryAmmo : stats.mag;
    } else if (slot === 2) {
      ammo = typeof currentSecondaryAmmo === 'number' ? currentSecondaryAmmo : stats.mag;
    } else if (slot === 3) {
      ammo = 0;
    }

    set((s) => ({
      activeWeapon: target,
      primaryWeapon: slot === 1 ? target : (s.primaryWeapon || "ak47"),
      secondaryWeapon: slot === 2 ? target : (s.secondaryWeapon || "deagle"),
      knifeSlot: slot === 3 ? target : (s.knifeSlot || "knife"),
      primaryAmmo: currentPrimaryAmmo,
      secondaryAmmo: currentSecondaryAmmo,
      currentAmmo: ammo,
      maxAmmo: slot === 3 ? 0 : (stats.mag as number),
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: 0.15,
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    Sound.cancelReload();
    Sound.deploy(target);

    // Send to server
    useNetworkStore.getState().sendSwitchWeapon(slot);

    clearSwitchTimeout();
    switchTimeoutId = setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
      switchTimeoutId = null;
    }, 150);
  },

  startReload: () => {
    const { activeWeapon, isReloading, isSwitching, currentAmmo, maxAmmo } = get();
    if (!activeWeapon || isReloading || isSwitching || currentAmmo === maxAmmo) return;
    const stats = WEAPONS[activeWeapon];
    if (!stats || !stats.reload || stats.reload <= 0) return;
    set({ isReloading: true, reloadStartTime: Date.now(), isADS: false });
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
    const isPrimary = ["ak47", "m4a1", "awp", "mp5"].includes(activeWeapon);
    const isSecondary = ["deagle", "glock", "tec9", "autopistol"].includes(activeWeapon);

    set((state) => ({
      currentAmmo: stats.mag,
      primaryAmmo: isPrimary ? stats.mag : state.primaryAmmo,
      secondaryAmmo: isSecondary ? stats.mag : state.secondaryAmmo,
      isReloading: false,
      reloadStartTime: null,
    }));
  },

  setADS: (ads: boolean) => {
    set({ isADS: ads });
  },

  updateRecoil: (x: number, y: number) => {
    set({ recoilOffset: { x, y } });
  },

  incrementBullets: () => {
    const { bulletsFired, currentAmmo, activeWeapon } = get();
    const newAmmo = Math.max(0, currentAmmo - 1);
    const isPrimary = activeWeapon && ["ak47", "m4a1", "awp", "mp5"].includes(activeWeapon);
    const isSecondary = activeWeapon && ["deagle", "glock", "tec9", "autopistol"].includes(activeWeapon);

    set((state) => ({
      bulletsFired: bulletsFired + 1,
      currentAmmo: newAmmo,
      primaryAmmo: isPrimary ? newAmmo : state.primaryAmmo,
      secondaryAmmo: isSecondary ? newAmmo : state.secondaryAmmo,
      lastFireTimestamp: performance.now(),
    }));
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
