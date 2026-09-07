import { describe, it, expect } from "vitest";
import {
  isPrimaryWeapon,
  isSecondaryWeapon,
  isMeleeWeapon,
  isGrenadeWeapon,
  MELEE,
  DEFAULT_PISTOL,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
  MELEE_WEAPONS,
  GRENADE_WEAPONS,
  WAVE_CONFIG,
  ZOMBIE_TYPES,
  ZOMBIE_POINTS,
  ROUND,
  ECONOMY,
  PHYSICS,
  GRENADE,
} from "@cs-game/shared";

describe("shared constants and helpers", () => {
  describe("weapon category helpers", () => {
    it("isPrimaryWeapon", () => {
      expect(isPrimaryWeapon("ak47")).toBe(true);
      expect(isPrimaryWeapon("glock")).toBe(false);
    });

    it("isSecondaryWeapon", () => {
      expect(isSecondaryWeapon("deagle")).toBe(true);
      expect(isSecondaryWeapon("ak47")).toBe(false);
    });

    it("isMeleeWeapon", () => {
      expect(isMeleeWeapon("knife")).toBe(true);
      expect(isMeleeWeapon("ak47")).toBe(false);
    });

    it("isGrenadeWeapon", () => {
      expect(isGrenadeWeapon("he")).toBe(true);
      expect(isGrenadeWeapon("ak47")).toBe(false);
    });
  });

  it("MELEE has valid config", () => {
    expect(MELEE.range).toBeGreaterThan(0);
    expect(MELEE.backstabMultiplier).toBeGreaterThan(1);
  });

  it("DEFAULT_PISTOL has entries for both teams", () => {
    expect(DEFAULT_PISTOL.T).toBeTruthy();
    expect(DEFAULT_PISTOL.CT).toBeTruthy();
  });

  it("weapon arrays are consistent", () => {
    expect(PRIMARY_WEAPONS.length).toBeGreaterThan(0);
    expect(SECONDARY_WEAPONS.length).toBeGreaterThan(0);
    expect(MELEE_WEAPONS.length).toBeGreaterThan(0);
    expect(GRENADE_WEAPONS.length).toBeGreaterThan(0);
  });

  it("WAVE_CONFIG has valid values", () => {
    expect(WAVE_CONFIG.baseZombieCount).toBeGreaterThan(0);
    expect(WAVE_CONFIG.zombiesPerWave).toBeGreaterThan(0);
    expect(WAVE_CONFIG.buyPhaseDuration).toBeGreaterThan(0);
  });

  it("ZOMBIE_TYPES has all types", () => {
    expect(ZOMBIE_TYPES).toHaveProperty("walker");
    expect(ZOMBIE_TYPES).toHaveProperty("runner");
    expect(ZOMBIE_TYPES).toHaveProperty("tank");
    expect(ZOMBIE_TYPES).toHaveProperty("spitter");
    expect(ZOMBIE_TYPES).toHaveProperty("exploder");
    expect(ZOMBIE_TYPES).toHaveProperty("boss");
  });

  it("ZOMBIE_POINTS has all types", () => {
    expect(ZOMBIE_POINTS).toHaveProperty("walker");
    expect(ZOMBIE_POINTS).toHaveProperty("headshotBonus");
    expect(ZOMBIE_POINTS).toHaveProperty("knifeBonus");
  });

  it("ROUND has valid durations", () => {
    expect(ROUND.buyPhaseDuration).toBeGreaterThan(0);
    expect(ROUND.activePhaseDuration).toBeGreaterThan(0);
    expect(ROUND.plantDuration).toBeGreaterThan(0);
    expect(ROUND.bombTimer).toBeGreaterThan(0);
  });

  it("ECONOMY has valid values", () => {
    expect(ECONOMY.startMoney).toBeGreaterThan(0);
    expect(ECONOMY.maxMoney).toBeGreaterThan(ECONOMY.startMoney);
    expect(ECONOMY.roundWinBonus).toBeGreaterThan(0);
  });

  it("PHYSICS has valid values", () => {
    expect(PHYSICS.walkSpeed).toBeGreaterThan(0);
    expect(PHYSICS.sprintSpeed).toBeGreaterThan(PHYSICS.walkSpeed);
    expect(PHYSICS.gravity).toBeGreaterThan(0);
  });

  it("GRENADE has valid values", () => {
    expect(GRENADE.fuse).toBeGreaterThan(0);
    expect(GRENADE.heRadius).toBeGreaterThan(0);
    expect(GRENADE.throwSpeed).toBeGreaterThan(0);
  });
});
