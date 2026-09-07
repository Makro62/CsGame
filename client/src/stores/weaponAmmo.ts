export type AmmoSlot = "primary" | "secondary" | "melee";

export interface SlotAmmoState {
  currentAmmo: number;
  reserveAmmo: number;
  primaryAmmo: number;
  primaryReserve: number;
  secondaryAmmo: number;
  secondaryReserve: number;
}

/** Save mag/reserve of the slot we leave, then load the slot we switch to. */
export function applySwitchAmmo(
  state: SlotAmmoState,
  from: AmmoSlot | null,
  to: AmmoSlot,
): SlotAmmoState {
  let primaryAmmo = state.primaryAmmo;
  let primaryReserve = state.primaryReserve;
  let secondaryAmmo = state.secondaryAmmo;
  let secondaryReserve = state.secondaryReserve;

  if (from === "primary") {
    primaryAmmo = state.currentAmmo;
    primaryReserve = state.reserveAmmo;
  } else if (from === "secondary") {
    secondaryAmmo = state.currentAmmo;
    secondaryReserve = state.reserveAmmo;
  }

  if (to === "primary") {
    return {
      currentAmmo: primaryAmmo,
      reserveAmmo: primaryReserve,
      primaryAmmo,
      primaryReserve,
      secondaryAmmo,
      secondaryReserve,
    };
  }
  if (to === "secondary") {
    return {
      currentAmmo: secondaryAmmo,
      reserveAmmo: secondaryReserve,
      primaryAmmo,
      primaryReserve,
      secondaryAmmo,
      secondaryReserve,
    };
  }
  return {
    currentAmmo: 0,
    reserveAmmo: 0,
    primaryAmmo,
    primaryReserve,
    secondaryAmmo,
    secondaryReserve,
  };
}

export function slotOfWeapon(
  isPrimary: boolean,
  isSecondary: boolean,
): AmmoSlot | null {
  if (isPrimary && isSecondary) return null;
  if (isPrimary) return "primary";
  if (isSecondary) return "secondary";
  return "melee";
}
