import { describe, it, expect } from "vitest";
import { weaponDisplay } from "@src/game/weapons/weaponDisplay";
import { WEAPONS } from "@cs-game/shared";

describe("weaponDisplay", () => {
  it("returns correct meta for known weapons", () => {
    const glock = weaponDisplay("glock");
    expect(glock.label).toBe("Glock-18");
    expect(glock.slot).toBe("2");
    expect(glock.dmg).toBe(WEAPONS.glock.dmg);
  });

  it("returns correct meta for arccaster (previously missing)", () => {
    const w = weaponDisplay("arccaster");
    expect(w.label).toBe("Arc Caster");
    expect(w.type).toBe("Wonder Weapon");
    expect(w.dmg).toBe(WEAPONS.arccaster.dmg);
  });

  it("returns correct meta for grenades (previously missing)", () => {
    expect(weaponDisplay("he").type).toBe("Grenade");
    expect(weaponDisplay("he").label).toBe("HE Grenade");
    expect(weaponDisplay("smoke").label).toBe("Smoke Grenade");
    expect(weaponDisplay("flash").label).toBe("Flashbang");
  });

  it("returns combatknife same as knife", () => {
    expect(weaponDisplay("combatknife").label).toBe("Combat Knife");
    expect(weaponDisplay("knife").label).toBe("Combat Knife");
  });

  it("fallback for unknown weapon uppercases id", () => {
    const w = weaponDisplay("unknown123");
    expect(w.label).toBe("UNKNOWN123");
    expect(w.dmg).toBe(0);
    expect(w.mag).toBe(0);
    expect(w.type).toBe("Weapon");
  });

  it("null and undefined return dash label", () => {
    expect(weaponDisplay(null).label).toBe("—");
    expect(weaponDisplay(undefined).label).toBe("—");
  });

  it("empty string returns empty label fallback", () => {
    const w = weaponDisplay("");
    expect(w.dmg).toBe(0);
  });

  it("all WEAPONS keys have either META or fallback without crash", () => {
    for (const key of Object.keys(WEAPONS)) {
      const w = weaponDisplay(key);
      expect(typeof w.label).toBe("string");
      expect(w.label.length).toBeGreaterThan(0);
      expect(typeof w.dmg).toBe("number");
    }
  });
});
