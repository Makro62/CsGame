import { describe, it, expect } from "vitest";
import { applySwitchAmmo, slotOfWeapon } from "@src/stores/weaponAmmo";

describe("applySwitchAmmo — missing branches (realistik gameplay)", () => {
  const base = { currentAmmo: 10, reserveAmmo: 30, primaryAmmo: 25, primaryReserve: 90, secondaryAmmo: 12, secondaryReserve: 40 };

  it("null -> primary loads primary slot", () => {
    const r = applySwitchAmmo(base, null, "primary");
    expect(r.currentAmmo).toBe(25);
    expect(r.reserveAmmo).toBe(90);
  });

  it("null -> secondary loads secondary slot", () => {
    const r = applySwitchAmmo(base, null, "secondary");
    expect(r.currentAmmo).toBe(12);
  });

  it("null -> melee returns 0 ammo", () => {
    const r = applySwitchAmmo(base, null, "melee");
    expect(r.currentAmmo).toBe(0);
    expect(r.reserveAmmo).toBe(0);
  });

  it("primary -> melee saves primary then zeros current", () => {
    const r = applySwitchAmmo({ ...base, currentAmmo: 7, reserveAmmo: 20 }, "primary", "melee");
    expect(r.primaryAmmo).toBe(7);
    expect(r.primaryReserve).toBe(20);
    expect(r.currentAmmo).toBe(0);
  });

  it("secondary -> primary saves secondary and loads primary", () => {
    const r = applySwitchAmmo({ ...base, currentAmmo: 5, reserveAmmo: 10 }, "secondary", "primary");
    expect(r.secondaryAmmo).toBe(5);
    expect(r.currentAmmo).toBe(25);
  });

  it("melee -> primary loads primary", () => {
    const r = applySwitchAmmo(base, "melee", "primary");
    expect(r.currentAmmo).toBe(25);
  });

  it("primary -> primary saves then reloads same slot (no-op but consistent)", () => {
    const r = applySwitchAmmo({ ...base, currentAmmo: 3, reserveAmmo: 15 }, "primary", "primary");
    expect(r.currentAmmo).toBe(3);
    expect(r.primaryAmmo).toBe(3);
  });

  it("secondary -> secondary same slot", () => {
    const r = applySwitchAmmo({ ...base, currentAmmo: 8, reserveAmmo: 18 }, "secondary", "secondary");
    expect(r.currentAmmo).toBe(8);
  });
});

describe("slotOfWeapon", () => {
  it("primary true -> primary", () => expect(slotOfWeapon(true, false)).toBe("primary"));
  it("secondary true -> secondary", () => expect(slotOfWeapon(false, true)).toBe("secondary"));
  it("both false -> melee", () => expect(slotOfWeapon(false, false)).toBe("melee"));
  it("both true -> primary (first wins, hides caller bug)", () => expect(slotOfWeapon(true, true)).toBe("primary"));
});
