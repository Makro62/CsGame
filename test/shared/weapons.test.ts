import { describe, it, expect } from "vitest";
import { getWeaponStats } from "../../client/src/game/offline/EconomySystem";
import { WEAPONS } from "@cs-game/shared";

describe("shared WEAPONS", () => {
  it("has all weapon types", () => {
    expect(WEAPONS).toHaveProperty("ak47");
    expect(WEAPONS).toHaveProperty("m4a1");
    expect(WEAPONS).toHaveProperty("awp");
    expect(WEAPONS).toHaveProperty("mp5");
    expect(WEAPONS).toHaveProperty("deagle");
    expect(WEAPONS).toHaveProperty("glock");
    expect(WEAPONS).toHaveProperty("tec9");
    expect(WEAPONS).toHaveProperty("autopistol");
    expect(WEAPONS).toHaveProperty("knife");
    expect(WEAPONS).toHaveProperty("combatknife");
    expect(WEAPONS).toHaveProperty("he");
    expect(WEAPONS).toHaveProperty("smoke");
    expect(WEAPONS).toHaveProperty("flash");
  });

  it("every weapon has required fields", () => {
    for (const [id, w] of Object.entries(WEAPONS)) {
      expect(w.dmg).toBeGreaterThanOrEqual(0);
      expect(w.mag).toBeGreaterThan(0);
      expect(w.reload).toBeGreaterThanOrEqual(0);
      expect(w.price).toBeGreaterThanOrEqual(0);
      expect(w.team).toBeTruthy();
    }
  });

  describe("getWeaponStats", () => {
    it("returns stats for valid weapon", () => {
      const stats = getWeaponStats("ak47");
      expect(stats).toBeDefined();
      expect(stats?.dmg).toBe(35);
    });

    it("returns undefined for invalid weapon", () => {
      expect(getWeaponStats("nonexistent")).toBeUndefined();
    });
  });
});
