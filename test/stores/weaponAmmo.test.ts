import { describe, it, expect } from "vitest";
import { applySwitchAmmo, slotOfWeapon } from "../../client/src/stores/weaponAmmo";
import type { SlotAmmoState } from "../../client/src/stores/weaponAmmo";

function mkState(overrides: Partial<SlotAmmoState> = {}): SlotAmmoState {
  return {
    currentAmmo: 30,
    reserveAmmo: 60,
    primaryAmmo: 30,
    primaryReserve: 60,
    secondaryAmmo: 14,
    secondaryReserve: 70,
    ...overrides,
  };
}

describe("weaponAmmo", () => {
  describe("applySwitchAmmo", () => {
    it("saves primary ammo when switching from primary", () => {
      const state = mkState({ currentAmmo: 15, reserveAmmo: 45 });
      const result = applySwitchAmmo(state, "primary", "secondary");
      expect(result.primaryAmmo).toBe(15);
      expect(result.primaryReserve).toBe(45);
    });

    it("saves secondary ammo when switching from secondary", () => {
      const state = mkState({ currentAmmo: 8, reserveAmmo: 50 });
      const result = applySwitchAmmo(state, "secondary", "primary");
      expect(result.secondaryAmmo).toBe(8);
      expect(result.secondaryReserve).toBe(50);
    });

    it("loads primary ammo when switching to primary", () => {
      const state = mkState();
      const result = applySwitchAmmo(state, "secondary", "primary");
      expect(result.currentAmmo).toBe(state.primaryAmmo);
      expect(result.reserveAmmo).toBe(state.primaryReserve);
    });

    it("loads secondary ammo when switching to secondary", () => {
      const state = mkState();
      const result = applySwitchAmmo(state, "primary", "secondary");
      expect(result.currentAmmo).toBe(state.secondaryAmmo);
      expect(result.reserveAmmo).toBe(state.secondaryReserve);
    });

    it("returns zeroed ammo for melee slot", () => {
      const state = mkState();
      const result = applySwitchAmmo(state, "primary", "melee");
      expect(result.currentAmmo).toBe(0);
      expect(result.reserveAmmo).toBe(0);
    });

    it("handles null from slot (initial equip)", () => {
      const state = mkState();
      const result = applySwitchAmmo(state, null, "primary");
      expect(result.currentAmmo).toBe(state.primaryAmmo);
      expect(result.reserveAmmo).toBe(state.primaryReserve);
    });
  });

  describe("slotOfWeapon", () => {
    it("returns primary", () => {
      expect(slotOfWeapon(true, false)).toBe("primary");
    });
    it("returns secondary", () => {
      expect(slotOfWeapon(false, true)).toBe("secondary");
    });
    it("returns melee", () => {
      expect(slotOfWeapon(false, false)).toBe("melee");
    });

    it("returns null when both primary and secondary are set", () => {
      expect(slotOfWeapon(true, true)).toBeNull();
    });
  });
});
