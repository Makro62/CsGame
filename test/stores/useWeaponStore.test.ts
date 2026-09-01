import { describe, it, expect } from "vitest";
import { useWeaponStore } from "@src/stores/useWeaponStore";

describe("useWeaponStore fireRateMultiplier", () => {
  it("NaN multiplier becomes 1", () => {
    useWeaponStore.getState().setFireRateMultiplier(NaN);
    expect(useWeaponStore.getState().fireRateMultiplier).toBe(1);
  });

  it("keeps values >= 1", () => {
    useWeaponStore.getState().setFireRateMultiplier(1.4);
    expect(useWeaponStore.getState().fireRateMultiplier).toBe(1.4);
    useWeaponStore.getState().setFireRateMultiplier(0.2);
    expect(useWeaponStore.getState().fireRateMultiplier).toBe(1);
  });
});
