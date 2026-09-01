import { describe, expect, it } from "vitest";
import { applySwitchAmmo } from "@src/stores/weaponAmmo";
import { WEAPONS } from "@cs-game/shared";
import { weaponDisplay } from "@src/game/weapons/weaponDisplay";

describe("applySwitchAmmo", () => {
  it("keeps each slot's reserve when swapping 1 ↔ 2", () => {
    const after = applySwitchAmmo(
      {
        currentAmmo: 12,
        reserveAmmo: 90,
        primaryAmmo: 12,
        primaryReserve: 90,
        secondaryAmmo: 20,
        secondaryReserve: 120,
      },
      "primary",
      "secondary",
    );
    expect(after.currentAmmo).toBe(20);
    expect(after.reserveAmmo).toBe(120);
    expect(after.primaryAmmo).toBe(12);
    expect(after.primaryReserve).toBe(90);
  });

  it("restores primary reserve when switching back", () => {
    const toSecondary = applySwitchAmmo(
      {
        currentAmmo: 5,
        reserveAmmo: 60,
        primaryAmmo: 5,
        primaryReserve: 60,
        secondaryAmmo: 7,
        secondaryReserve: 35,
      },
      "primary",
      "secondary",
    );
    const back = applySwitchAmmo(toSecondary, "secondary", "primary");
    expect(back.currentAmmo).toBe(5);
    expect(back.reserveAmmo).toBe(60);
    expect(back.secondaryAmmo).toBe(7);
    expect(back.secondaryReserve).toBe(35);
  });
});

describe("weaponDisplay", () => {
  it("reads mag and damage from WEAPONS", () => {
    expect(weaponDisplay("awp").mag).toBe(WEAPONS.awp.mag);
    expect(weaponDisplay("awp").dmg).toBe(WEAPONS.awp.dmg);
    expect(weaponDisplay("ak47").mag).toBe(30);
    expect(weaponDisplay("glock").reserveAmmo).toBe(120);
  });
});
