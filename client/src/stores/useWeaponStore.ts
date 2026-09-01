// @ts-nocheck
import { create } from "zustand";
import {
  WEAPONS,
  isPrimaryWeapon,
  isSecondaryWeapon,
  isMeleeWeapon,
} from "@cs-game/shared";
import { Sound } from "../components/AudioManager";
import { useNetworkStore } from "./useNetworkStore";
import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "./useGameStore";
import { applySwitchAmmo, slotOfWeapon, type AmmoSlot } from "./weaponAmmo";
import { sanitizeFireRateMultiplier } from "../lib/numericGuards";

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
  /** Reserve pool for the active weapon (finite in offline economy). */
  reserveAmmo: number;
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
  /** Per-weapon mag/reserve so swapping owned guns (zombie arsenal) does not refill or wipe ammo. */
  ammoByWeapon: Record<string, { mag: number; reserve: number }>;

  equipWeapon: (weapon: WeaponKey, options?: EquipOptions) => void;
  switchToSlot: (slot: 1 | 2 | 3 | 4) => void;
  syncLoadout: (loadout: Loadout) => void;
  cycleGrenadeType: () => void;
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
  resetAmmoInventory: () => void;
  incrementBullets: () => void;
  resetBullets: () => void;
  setSwitching: (switching: boolean) => void;
  setLastFireTime: (time: number) => void;
  canFire: () => boolean;
}

type GrenadeType = "he" | "smoke" | "flash";

const GRENADE_CYCLE: GrenadeType[] = ["he", "smoke", "flash"];

let switchTimeoutId: ReturnType<typeof setTimeout> | null = null;
const WEAPON_DRAW_SECONDS = 0.25;
const WEAPON_DRAW_MS = WEAPON_DRAW_SECONDS * 1000;

function clearSwitchTimeout() {
  if (switchTimeoutId) {
    clearTimeout(switchTimeoutId);
    switchTimeoutId = null;
  }
}

function isAmmoWeapon(weapon: WeaponKey | null): weapon is WeaponKey {
  if (!weapon) return false;
  return !isMeleeWeapon(weapon) && weapon !== "he" && weapon !== "smoke" && weapon !== "flash";
}

function snapshotActiveAmmo(state: WeaponState): Record<string, { mag: number; reserve: number }> {
  if (!isAmmoWeapon(state.activeWeapon)) return state.ammoByWeapon;
  return {
    ...state.ammoByWeapon,
    [state.activeWeapon]: { mag: state.currentAmmo, reserve: state.reserveAmmo },
  };
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
  reserveAmmo: 0,
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
  ammoByWeapon: {},

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

  equipWeapon: (weapon: WeaponKey, options?: EquipOptions) => {
    const stats = WEAPONS[weapon];
    const melee = isMeleeWeapon(weapon);
    const isGrenade = weapon === "he" || weapon === "smoke" || weapon === "flash";
    const prev = get();
    const bag = snapshotActiveAmmo(prev);
    const saved = bag[weapon];
    const ammoCount = melee
      ? 0
      : isGrenade
        ? 1
        : (options?.ammo ?? saved?.mag ?? stats.mag);
    const reserveCount = melee || isGrenade
      ? 0
      : (options?.reserveAmmo ?? saved?.reserve ?? stats.reserveAmmo);
    const nextBag = isAmmoWeapon(weapon)
      ? { ...bag, [weapon]: { mag: ammoCount, reserve: reserveCount } }
      : bag;

    // Already holding it: reconcile the magazine without replaying the draw.
    if (prev.activeWeapon === weapon) {
      const patch: Partial<WeaponState> = { ammoByWeapon: nextBag };
      if (options?.ammo !== undefined) patch.currentAmmo = ammoCount;
      if (options?.reserveAmmo !== undefined) patch.reserveAmmo = reserveCount;
      if (isPrimaryWeapon(weapon)) {
        if (options?.ammo !== undefined) patch.primaryAmmo = ammoCount;
        if (options?.reserveAmmo !== undefined) patch.primaryReserve = reserveCount;
      }
      if (isSecondaryWeapon(weapon)) {
        if (options?.ammo !== undefined) patch.secondaryAmmo = ammoCount;
        if (options?.reserveAmmo !== undefined) patch.secondaryReserve = reserveCount;
      }
      if (Object.keys(patch).length > 1 || options) set(patch);
      return;
    }

    const { upgradedWeapons, dualWieldWeapons } = prev;
    const isUpgraded = upgradedWeapons.includes(weapon);
    const isDual = dualWieldWeapons.includes(weapon);

    set((state) => ({
      activeWeapon: weapon,
      hasPackAPunch: isUpgraded,
      dualWield: isDual,
      ammoByWeapon: nextBag,
      primaryWeapon: isPrimaryWeapon(weapon) ? weapon : state.primaryWeapon,
      secondaryWeapon: isSecondaryWeapon(weapon) ? weapon : state.secondaryWeapon,
      knifeSlot: melee ? weapon : state.knifeSlot,
      currentAmmo: ammoCount,
      maxAmmo: melee ? 0 : stats.mag,
      reserveAmmo: reserveCount,
      primaryAmmo: isPrimaryWeapon(weapon) ? ammoCount : state.primaryAmmo,
      secondaryAmmo: isSecondaryWeapon(weapon) ? ammoCount : state.secondaryAmmo,
      primaryReserve: isPrimaryWeapon(weapon) ? reserveCount : state.primaryReserve,
      secondaryReserve: isSecondaryWeapon(weapon) ? reserveCount : state.secondaryReserve,
      primaryMaxAmmo: isPrimaryWeapon(weapon) ? stats.mag : state.primaryMaxAmmo,
      secondaryMaxAmmo: isSecondaryWeapon(weapon) ? stats.mag : state.secondaryMaxAmmo,
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      recoilAim: { yaw: 0, pitch: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: WEAPON_DRAW_SECONDS,
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    Sound.cancelReload();
    if (!options?.silent) Sound.deploy(weapon);

    clearSwitchTimeout();
    switchTimeoutId = setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
      switchTimeoutId = null;
    }, WEAPON_DRAW_MS);
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

    const from: AmmoSlot | null = activeWeapon
      ? slotOfWeapon(isPrimaryWeapon(activeWeapon), isSecondaryWeapon(activeWeapon))
      : null;
    const to: AmmoSlot = slot === 1 ? "primary" : slot === 2 ? "secondary" : "melee";
    const ammoSlots = applySwitchAmmo(
      {
        currentAmmo,
        reserveAmmo: state.reserveAmmo,
        primaryAmmo: state.primaryAmmo,
        primaryReserve: state.primaryReserve,
        secondaryAmmo: state.secondaryAmmo,
        secondaryReserve: state.secondaryReserve,
      },
      from,
      to,
    );

    const { upgradedWeapons, dualWieldWeapons } = state;
    const isUpgraded = upgradedWeapons.includes(target);
    const isDual = dualWieldWeapons.includes(target);
    const bag = snapshotActiveAmmo(state);
    const nextBag = isAmmoWeapon(target)
      ? { ...bag, [target]: { mag: ammoSlots.currentAmmo, reserve: ammoSlots.reserveAmmo } }
      : bag;

    set(() => ({
      activeWeapon: target,
      hasPackAPunch: isUpgraded,
      dualWield: isDual,
      ammoByWeapon: nextBag,
      ...ammoSlots,
      maxAmmo: slot === 3 ? 0 : (stats.mag as number),
      isReloading: false,
      reloadStartTime: null,
      isADS: false,
      recoilOffset: { x: 0, y: 0 },
      recoilAim: { yaw: 0, pitch: 0 },
      lastFireTime: 0,
      isSwitching: true,
      switchTimer: WEAPON_DRAW_SECONDS,
      bulletsFired: 0,
      lastFireTimestamp: 0,
    }));

    Sound.cancelReload();
    Sound.deploy(target);

    if (useGameStore.getState().mode === "offline5v5") {
      useOffline5v5Store.getState().localSwitchWeapon(slot);
    } else {
      useNetworkStore.getState().sendSwitchWeapon(slot);
    }

    clearSwitchTimeout();
    switchTimeoutId = setTimeout(() => {
      set({ isSwitching: false, switchTimer: 0 });
      switchTimeoutId = null;
    }, WEAPON_DRAW_MS);
  },

  /** Mirror the slots the server says we own, without touching what's in hand. */
  syncLoadout: ({ primary, secondary, knife }: Loadout) => {
    const state = get();
    const toKey = (id: string): WeaponKey | null =>
      id && id in WEAPONS ? (id as WeaponKey) : null;

    const primaryKey = toKey(primary);
    const secondaryKey = toKey(secondary);
    const knifeKey = toKey(knife) ?? "knife";

    const primaryChanged = state.primaryWeapon !== primaryKey;
    const secondaryChanged = state.secondaryWeapon !== secondaryKey;
    if (
      !primaryChanged &&
      !secondaryChanged &&
      state.knifeSlot === knifeKey
    ) {
      return;
    }

    const bag = snapshotActiveAmmo(state);
    const primarySaved = primaryKey ? bag[primaryKey] : undefined;
    const secondarySaved = secondaryKey ? bag[secondaryKey] : undefined;

    set({
      ammoByWeapon: bag,
      primaryWeapon: primaryKey,
      secondaryWeapon: secondaryKey,
      knifeSlot: knifeKey,
      ...(primaryChanged && primaryKey
        ? {
            primaryAmmo: primarySaved?.mag ?? WEAPONS[primaryKey].mag,
            primaryMaxAmmo: WEAPONS[primaryKey].mag,
            primaryReserve: primarySaved?.reserve ?? WEAPONS[primaryKey].reserveAmmo,
          }
        : {}),
      ...(secondaryChanged && secondaryKey
        ? {
            secondaryAmmo: secondarySaved?.mag ?? WEAPONS[secondaryKey].mag,
            secondaryMaxAmmo: WEAPONS[secondaryKey].mag,
            secondaryReserve: secondarySaved?.reserve ?? WEAPONS[secondaryKey].reserveAmmo,
          }
        : {}),
    });
  },

  startReload: () => {
    const { activeWeapon, isReloading, isSwitching, currentAmmo, maxAmmo, reserveAmmo, infiniteAmmo } = get();
    if (!activeWeapon || isReloading || isSwitching || currentAmmo === maxAmmo) return;
    if (!infiniteAmmo && reserveAmmo <= 0) return;
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

    set((state) => {
      // Deduct from reserve when finite (offline economy). Training uses
      // infiniteAmmo so reserve stays untouched there.
      const needed = stats.mag - state.currentAmmo;
      const load = Math.min(needed, Math.max(0, state.reserveAmmo));
      const newAmmo = state.currentAmmo + load;
      const newReserve = state.infiniteAmmo ? state.reserveAmmo : Math.max(0, state.reserveAmmo - load);
      const ammoByWeapon = isAmmoWeapon(activeWeapon)
        ? { ...state.ammoByWeapon, [activeWeapon]: { mag: newAmmo, reserve: newReserve } }
        : state.ammoByWeapon;
      return {
        currentAmmo: newAmmo,
        primaryAmmo: isPrimaryWeapon(activeWeapon) ? newAmmo : state.primaryAmmo,
        secondaryAmmo: isSecondaryWeapon(activeWeapon) ? newAmmo : state.secondaryAmmo,
        reserveAmmo: newReserve,
        primaryReserve: isPrimaryWeapon(activeWeapon) ? newReserve : state.primaryReserve,
        secondaryReserve: isSecondaryWeapon(activeWeapon) ? newReserve : state.secondaryReserve,
        ammoByWeapon,
        isReloading: false,
        reloadStartTime: null,
      };
    });
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
    set({ fireRateMultiplier: sanitizeFireRateMultiplier(multiplier) });
  },

  resetAmmoInventory: () => {
    set({ ammoByWeapon: {} });
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
      ammoByWeapon: isAmmoWeapon(activeWeapon)
        ? { ...state.ammoByWeapon, [activeWeapon]: { mag: newAmmo, reserve: state.reserveAmmo } }
        : state.ammoByWeapon,
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
