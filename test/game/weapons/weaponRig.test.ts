import { describe, it, expect } from "vitest";
import {
  WEAPON_POSITIONS,
  WEAPON_ROTATIONS,
  ADS_ROTATIONS,
  getADSPosition,
  getMuzzleOffset,
  isAkimboWeapon,
  DEAGLE_HANDS,
  GLOCK_HANDS,
  TEC9_HANDS,
  AUTOPISTOL_HANDS,
  AKIMBO_HANDS,
} from "../../../client/src/game/weapons/weaponRig";

describe("weaponRig", () => {
  it("WEAPON_POSITIONS has all weapons", () => {
    expect(WEAPON_POSITIONS).toHaveProperty("ak47");
    expect(WEAPON_POSITIONS).toHaveProperty("m4a1");
    expect(WEAPON_POSITIONS).toHaveProperty("awp");
    expect(WEAPON_POSITIONS).toHaveProperty("knife");
  });

  it("WEAPON_ROTATIONS has all weapons", () => {
    expect(WEAPON_ROTATIONS).toHaveProperty("ak47");
    expect(WEAPON_ROTATIONS).toHaveProperty("knife");
  });

  it("ADS_ROTATIONS has all weapons aligned to [0, 0, 0] for straight sightlines", () => {
    expect(ADS_ROTATIONS).toHaveProperty("ak47");
    expect(ADS_ROTATIONS).toHaveProperty("awp");
    expect(ADS_ROTATIONS.ak47).toEqual([0, 0, 0]);
    expect(ADS_ROTATIONS.m4a1).toEqual([0, 0, 0]);
    expect(ADS_ROTATIONS.deagle).toEqual([0, 0, 0]);
  });

  describe("getADSPosition", () => {
    it("returns position for known weapon", () => {
      const pos = getADSPosition("ak47", false);
      expect(pos).toHaveLength(3);
    });

    it("returns dual-wield position when eligible", () => {
      const single = getADSPosition("deagle", false);
      const dual = getADSPosition("deagle", true);
      expect(dual).not.toEqual(single);
    });

    it("returns fallback for unknown weapon", () => {
      const pos = getADSPosition("unknown_weapon", false);
      expect(pos).toHaveLength(3);
    });
  });

  describe("getMuzzleOffset", () => {
    it("returns Vector3 for known weapon", () => {
      const offset = getMuzzleOffset("ak47");
      expect(offset).toHaveProperty("x");
      expect(offset).toHaveProperty("y");
      expect(offset).toHaveProperty("z");
    });

    it("returns fallback for null weapon", () => {
      const offset = getMuzzleOffset(null);
      expect(offset).toHaveProperty("x");
    });

    it("returns akimbo muzzle for dual-wield", () => {
      const offset = getMuzzleOffset("deagle", 1, true);
      expect(offset).toHaveProperty("x");
    });
  });

  describe("isAkimboWeapon", () => {
    it("returns false for null", () => {
      expect(isAkimboWeapon(null)).toBe(false);
    });

    it("returns false when not dual wield", () => {
      expect(isAkimboWeapon("deagle", false)).toBe(false);
    });

    it("returns true for eligible weapon with dual wield", () => {
      expect(isAkimboWeapon("deagle", true)).toBe(true);
    });

    it("returns false for ineligible weapon", () => {
      expect(isAkimboWeapon("ak47", true)).toBe(false);
    });
  });

  it("AKIMBO_HANDS has correct hands", () => {
    expect(AKIMBO_HANDS).toHaveProperty("deagle");
    expect(AKIMBO_HANDS).toHaveProperty("glock");
    expect(AKIMBO_HANDS.deagle).toHaveLength(2);
  });

  it("DEAGLE_HANDS has correct sides", () => {
    expect(DEAGLE_HANDS[0].side).toBe(-1);
    expect(DEAGLE_HANDS[1].side).toBe(1);
  });

  it("getADSPosition returns numeric array for ak47", () => {
    const pos = getADSPosition("ak47", false);
    expect(pos[0]).toBeTypeOf("number");
    expect(pos[1]).toBeTypeOf("number");
    expect(pos[2]).toBeTypeOf("number");
  });

  it("getMuzzleOffset ak47 has nonzero z", () => {
    const offset = getMuzzleOffset("ak47");
    expect(offset.z).not.toBe(0);
  });

  it("getMuzzleOffset awp has nonzero z", () => {
    const offset = getMuzzleOffset("awp");
    expect(offset.z).not.toBe(0);
  });

  it("getMuzzleOffset knife has small z", () => {
    const offset = getMuzzleOffset("knife");
    expect(typeof offset.z).toBe("number");
  });

  it("isAkimboWeapon returns true for glock with dual", () => {
    expect(isAkimboWeapon("glock", true)).toBe(true);
  });

  it("isAkimboWeapon returns false for glock without dual", () => {
    expect(isAkimboWeapon("glock", false)).toBe(false);
  });

  it("isAkimboWeapon returns true for tec9 with dual", () => {
    expect(isAkimboWeapon("tec9", true)).toBe(true);
  });

  it("isAkimboWeapon returns true for autopistol with dual", () => {
    expect(isAkimboWeapon("autopistol", true)).toBe(true);
  });

  it("isAkimboWeapon returns false for awp with dual", () => {
    expect(isAkimboWeapon("awp", true)).toBe(false);
  });

  it("GLOCK_HANDS has correct sides", () => {
    expect(GLOCK_HANDS[0].side).toBe(-1);
    expect(GLOCK_HANDS[1].side).toBe(1);
  });

  it("TEC9_HANDS has correct sides", () => {
    expect(TEC9_HANDS[0].side).toBe(-1);
    expect(TEC9_HANDS[1].side).toBe(1);
  });

  it("AUTOPISTOL_HANDS has correct sides", () => {
    expect(AUTOPISTOL_HANDS[0].side).toBe(-1);
    expect(AUTOPISTOL_HANDS[1].side).toBe(1);
  });
});
