import { create } from "zustand";
import {
  WEAPONS,
  isPrimaryWeapon,
  isSecondaryWeapon,
  isMeleeWeapon,
} from "@cs-game/shared";
import { Sound } from "../components/AudioManager";
import { useNetworkStore } from "./useNetworkStore";

export type WeaponKey = keyof typeof WEAPONS;

interface EquipOptions {
  /** Ammo reported by the server, so a slot keeps the magazine it was left with */
  ammo?: number;
  reserveAmmo?: number;
  /** Skip the deploy sound/animation (used when reconciling with the server) */
  silent?: boolean;
}

interface Loadout {
  primary: string;
  secondary: string;
  knife: string;
}

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
  /** Accumulated recoil applied to the camera, in radians */
  recoilAim: { yaw: number; pitch: number };
  lastFireTime: number;
  isSwitching: boolean;
  switchTimer: number;
  bulletsFired: number;
  lastFireTimestamp: number;
  grenadeType: "he" | "smoke" | "flash";
  /** Training modes fire without draining the magazine */
  infiniteAmmo: boolean;
  dualWield: boolean;
  hasPackAPunch: boolean;
  upgradedWeapons: string[];
  dualWieldWeapons: string[];

  fireRateMultiplier: number;

  equipWeapon: (weapon: WeaponKey, options?: EquipOptions) => void;
  switchToSlot: (slot: 1 | 2 | 3 | 4) => void;
  syncLoadout: (loadout: Loadout) => void;
  cycleGrenadeType: () => void;
  setGrenadeType: (type: "he" | "smoke" | "flash") => void;
  startReload: () => void;
  cancelReload: () => void;
  finishReload: () => void;
  setADS: (ads: boolean) => void;
  updateRecoil: (x: number, y: number) => void;
  setRecoilAim: (yaw: number, pitch: number) => void;
  setInfiniteAmmo: (enabled: boolean) => void;
  setDualWield: (enabled: boolean) => void;
  setHasPackAPunch: (enabled: boolean) => void;
  addUpgradedWeapon: (weapon: string, dualWield?: boolean) => void;
  resetUpgrades: () => void;
  setFireRateMultiplier: (multiplier: number) => void;
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
  // Slots stay empty until a mode fills them (server loadout, training preset,
  // zombie starter pistol). Faking an AK-47 here desyncs us from the server.
  activeWeapon: null,
  primaryWeapon: null,
  secondaryWeapon: null,
  knifeSlot: "knife",
  currentAmmo: 0,
  maxAmmo: 0,
  primaryAmmo: 0,
  primaryMaxAmmo: 0,
  primaryReserve: 0,
  secondaryAmmo: 0,
  secondaryMaxAmmo: 0,
  secondaryReserve: 0,
  isReloading: false,
  reloadStartTime: null,
  isADS: false,
  recoilOffset: { x: 0, y: 0 },
  recoilAim: { yaw: 0, pitch: 0 },
  lastFireTime: 0,
  isSwitching: false,
  switchTimer: 0,
  bulletsFired: 0,
  lastFireTimestamp: 0,
  grenadeType: "he",
  infiniteAmmo: false,
  dualWield: false,
  hasPackAPunch: false,
  upgradedWeapons: [],
  dualWieldWeapons: [],
  fireRateMultiplier: 1,

  cycleGrenadeType: () => {
    const { grenadeType, activeWeapon } = get();
    const isCurrentlyHoldingGrenade =
      activeWeapon === "he" || activeWeapon === "smoke" || activeWeapon === "flash";

    if (!isCurrentlyHoldingGrenade) {
      get().equipWeapon(grenadeType as WeaponKey);
      return;
    }

    const idx = GRENADE_CYCLE.indexOf(grenadeType);
    const nextType = GRENADE_CYCLE[(idx + 1) % GRENADE_CYCLE.length];
    set({ grenadeType: nextType });
    get().equipWeapon(nextType as WeaponKey);
  },

  setGrenadeType: (type: GrenadeType) => {
    set({ grenadeType: type });
    if (get().activeWeapon === "he" || get().activeWeapon === "smoke" || get().activeWeapon === "flash") {
      get().equipWeapon(type as WeaponKey);
    }
  },

  equipWeapon: (weapon: WeaponKey, options?: EquipOptions) => {
    const stats = WEAPONS[weapon];
    const melee = isMeleeWeapon(weapon);
    const isGrenade = weapon === "he" || weapon === "smoke" || weapon === "flash";
    const ammoCount = melee ? 0 : isGrenade ? 1 : (options?.ammo ?? stats.mag);

    // Already holding it: reconcile the magazine without replaying the draw.
    if (get().activeWeapon === weapon) {
      if (options?.ammo !== undefined) set({ currentAmmo: ammoCount });
      return;
    }

    const { upgradedWeapons, dualWieldWeapons } = get();
    const isUpgraded = upgradedWeapons.includes(weapon);
    const isDual = dualWieldWeapons.includes(weapon);

    set((state) => ({
      activeWeapon: weapon,
      hasPackAPunch: isUpgraded,
      dualWield: isDual,
      primaryWeapon: isPrimaryWeapon(weapon) ? weapon : state.primaryWeapon,
      secondaryWeapon: isSecondaryWeapon(weapon) ? weapon : state.secondaryWeapon,
      knifeSlot: melee ? weapon : state.knifeSlot,
      currentAmmo: ammoCount,
      maxAmmo: melee ? 0 : stats.mag,
      primaryAmmo: isPrimaryWeapon(weapon) ? ammoCount : state.primaryAmmo,
      secondaryAmmo: isSecondaryWeapon(weapon) ? ammoCount : state.secondaryAmmo,
      primaryMaxAmmo: isPrimaryWeapon(weapon) ? stats.mag : state.primaryMaxAmmo,
      secondaryMaxAmmo: isSecondaryWeapon(weapon) ? stats.mag : state.secondaryMaxAmmo,
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      recoilAim: { yaw: 0, pitch: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: 0.15,
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    Sound.cancelReload();
    if (!options?.silent) Sound.deploy(weapon);

    clearSwitchTimeout();
    switchTimeoutId = setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
      switchTimeoutId = null;
    }, 150);
  },

  switchToSlot: (slot: 1 | 2 | 3 | 4) => {
    if (slot === 4) {
      get().cycleGrenadeType();
      return;
    }
    const state = get();
    const { primaryWeapon, secondaryWeapon, knifeSlot, activeWeapon, currentAmmo } = state;

    const target: WeaponKey | null =
      slot === 1 ? primaryWeapon : slot === 2 ? secondaryWeapon : knifeSlot;

    // Empty slot: nothing to draw. A dry click tells the player why.
    if (!target) {
      Sound.dryFire();
      return;
    }
    if (target === activeWeapon) return;

    const stats = WEAPONS[target];

    // Save current active weapon's ammo
    let currentPrimaryAmmo = state.primaryAmmo;
    let currentSecondaryAmmo = state.secondaryAmmo;
    if (activeWeapon && isPrimaryWeapon(activeWeapon)) {
      currentPrimaryAmmo = currentAmmo;
    } else if (activeWeapon && isSecondaryWeapon(activeWeapon)) {
      currentSecondaryAmmo = currentAmmo;
    }

    const ammo = slot === 1 ? currentPrimaryAmmo : slot === 2 ? currentSecondaryAmmo : 0;
    const { upgradedWeapons, dualWieldWeapons } = state;
    const isUpgraded = upgradedWeapons.includes(target);
    const isDual = dualWieldWeapons.includes(target);

    set(() => ({
      activeWeapon: target,
      hasPackAPunch: isUpgraded,
      dualWield: isDual,
      primaryAmmo: currentPrimaryAmmo,
      secondaryAmmo: currentSecondaryAmmo,
      currentAmmo: ammo,
      maxAmmo: slot === 3 ? 0 : (stats.mag as number),
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      recoilAim: { yaw: 0, pitch: 0 },
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

  /** Mirror the slots the server says we own, without touching what's in hand. */
  syncLoadout: ({ primary, secondary, knife }: Loadout) => {
    const state = get();
    const toKey = (id: string): WeaponKey | null =>
      id && id in WEAPONS ? (id as WeaponKey) : null;

    const primaryKey = toKey(primary);
    const secondaryKey = toKey(secondary);
    const knifeKey = toKey(knife) ?? "knife";

    if (
      state.primaryWeapon === primaryKey &&
      state.secondaryWeapon === secondaryKey &&
      state.knifeSlot === knifeKey
    ) {
      return;
    }

    set({
      primaryWeapon: primaryKey,
      secondaryWeapon: secondaryKey,
      knifeSlot: knifeKey,
    });
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

    set((state) => ({
      currentAmmo: stats.mag,
      primaryAmmo: isPrimaryWeapon(activeWeapon) ? stats.mag : state.primaryAmmo,
      secondaryAmmo: isSecondaryWeapon(activeWeapon) ? stats.mag : state.secondaryAmmo,
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

  setRecoilAim: (yaw: number, pitch: number) => {
    set({ recoilAim: { yaw, pitch } });
  },

  setInfiniteAmmo: (enabled: boolean) => {
    set({ infiniteAmmo: enabled });
  },

  setDualWield: (enabled: boolean) => {
    set({ dualWield: enabled });
  },

  setHasPackAPunch: (enabled: boolean) => {
    set({ hasPackAPunch: enabled });
  },

  addUpgradedWeapon: (weapon: string, dualWield?: boolean) => {
    const { upgradedWeapons, dualWieldWeapons, activeWeapon } = get();
    const newUpgraded = upgradedWeapons.includes(weapon) ? upgradedWeapons : [...upgradedWeapons, weapon];
    const newDual = dualWield
      ? (dualWieldWeapons.includes(weapon) ? dualWieldWeapons : [...dualWieldWeapons, weapon])
      : dualWieldWeapons;
    set({
      upgradedWeapons: newUpgraded,
      dualWieldWeapons: newDual,
      hasPackAPunch: activeWeapon === weapon ? true : get().hasPackAPunch,
      dualWield: activeWeapon === weapon ? !!dualWield : get().dualWield,
    });
  },

  resetUpgrades: () => {
    set({
      upgradedWeapons: [],
      dualWieldWeapons: [],
      hasPackAPunch: false,
      dualWield: false,
      fireRateMultiplier: 1,
    });
  },

  setFireRateMultiplier: (multiplier: number) => {
    set({ fireRateMultiplier: Math.max(1, multiplier) });
  },

  incrementBullets: () => {
    const { bulletsFired, currentAmmo, activeWeapon, infiniteAmmo } = get();
    const melee = !!activeWeapon && isMeleeWeapon(activeWeapon);
    const newAmmo = infiniteAmmo || melee ? currentAmmo : Math.max(0, currentAmmo - 1);

    set((state) => ({
      bulletsFired: bulletsFired + 1,
      currentAmmo: newAmmo,
      primaryAmmo: activeWeapon && isPrimaryWeapon(activeWeapon) ? newAmmo : state.primaryAmmo,
      secondaryAmmo: activeWeapon && isSecondaryWeapon(activeWeapon) ? newAmmo : state.secondaryAmmo,
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
    const { activeWeapon, currentAmmo, isReloading, isSwitching, lastFireTime, fireRateMultiplier } = get();
    if (!activeWeapon || isReloading || isSwitching) return false;
    // Knives swing without a magazine.
    if (currentAmmo <= 0 && !isMeleeWeapon(activeWeapon)) return false;

    const now = performance.now();
    const stats = WEAPONS[activeWeapon];
    const minInterval = 1000 / (stats.fireRate * fireRateMultiplier);

    return now - lastFireTime >= minInterval;
  },
}));
