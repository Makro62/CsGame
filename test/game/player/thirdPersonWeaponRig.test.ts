import { describe, it, expect } from "vitest";
import {
  weaponCategoryFromType,
  weaponCategoryFromId,
  THIRD_PERSON_ARM_POSES,
  TACTICAL_ELBOW_POSES,
  BLOCKY_WEAPON_ATTACH,
  TACTICAL_WEAPON_ATTACH,
} from "../../../client/src/game/player/thirdPersonWeaponRig";

describe("thirdPersonWeaponRig", () => {
  describe("weaponCategoryFromType", () => {
    it("returns knife for knife type", () => {
      expect(weaponCategoryFromType("knife")).toBe("knife");
    });

    it("returns pistol for pistol type", () => {
      expect(weaponCategoryFromType("pistol")).toBe("pistol");
    });

    it("returns rifle for rifle type", () => {
      expect(weaponCategoryFromType("rifle")).toBe("rifle");
    });

    it("returns rifle for unknown type", () => {
      expect(weaponCategoryFromType("unknown")).toBe("rifle");
    });

    it("returns rifle for empty string", () => {
      expect(weaponCategoryFromType("")).toBe("rifle");
    });
  });

  describe("weaponCategoryFromId", () => {
    it("returns rifle for null/undefined", () => {
      expect(weaponCategoryFromId(null)).toBe("rifle");
      expect(weaponCategoryFromId(undefined)).toBe("rifle");
    });

    it("returns knife for combatknife", () => {
      expect(weaponCategoryFromId("combatknife")).toBe("knife");
    });

    it("returns knife for knife", () => {
      expect(weaponCategoryFromId("knife")).toBe("knife");
    });

    it("returns pistol for deagle", () => {
      expect(weaponCategoryFromId("deagle")).toBe("pistol");
    });

    it("returns pistol for glock", () => {
      expect(weaponCategoryFromId("glock")).toBe("pistol");
    });

    it("returns pistol for tec9", () => {
      expect(weaponCategoryFromId("tec9")).toBe("pistol");
    });

    it("returns pistol for autopistol", () => {
      expect(weaponCategoryFromId("autopistol")).toBe("pistol");
    });

    it("returns pistol for he grenade", () => {
      expect(weaponCategoryFromId("he")).toBe("pistol");
    });

    it("returns pistol for smoke grenade", () => {
      expect(weaponCategoryFromId("smoke")).toBe("pistol");
    });

    it("returns pistol for flash grenade", () => {
      expect(weaponCategoryFromId("flash")).toBe("pistol");
    });

    it("returns pistol for grenade", () => {
      expect(weaponCategoryFromId("grenade")).toBe("pistol");
    });

    it("returns rifle for ak47", () => {
      expect(weaponCategoryFromId("ak47")).toBe("rifle");
    });

    it("returns rifle for m4a1", () => {
      expect(weaponCategoryFromId("m4a1")).toBe("rifle");
    });

    it("returns rifle for awp", () => {
      expect(weaponCategoryFromId("awp")).toBe("rifle");
    });

    it("returns rifle for mp5", () => {
      expect(weaponCategoryFromId("mp5")).toBe("rifle");
    });

    it("returns rifle for arccaster", () => {
      expect(weaponCategoryFromId("arccaster")).toBe("rifle");
    });

    it("is case-insensitive", () => {
      expect(weaponCategoryFromId("DEAGLE")).toBe("pistol");
      expect(weaponCategoryFromId("CombatKnife")).toBe("knife");
      expect(weaponCategoryFromId("AK47")).toBe("rifle");
      expect(weaponCategoryFromId("AWP")).toBe("rifle");
      expect(weaponCategoryFromId("MP5")).toBe("rifle");
    });

    it("returns rifle for unknown weapon", () => {
      expect(weaponCategoryFromId("unknown_weapon")).toBe("rifle");
    });
  });

  describe("pose data", () => {
    it("has all 3 categories for arm poses", () => {
      expect(THIRD_PERSON_ARM_POSES).toHaveProperty("rifle");
      expect(THIRD_PERSON_ARM_POSES).toHaveProperty("pistol");
      expect(THIRD_PERSON_ARM_POSES).toHaveProperty("knife");
    });

    it("each arm pose has right/left arrays of length 3", () => {
      for (const [cat, pose] of Object.entries(THIRD_PERSON_ARM_POSES)) {
        expect(pose.right).toHaveLength(3);
        expect(pose.left).toHaveLength(3);
        expect(typeof pose.fireKick).toBe("number");
      }
    });

    it("has all 3 categories for elbow poses", () => {
      expect(TACTICAL_ELBOW_POSES).toHaveProperty("rifle");
      expect(TACTICAL_ELBOW_POSES).toHaveProperty("pistol");
      expect(TACTICAL_ELBOW_POSES).toHaveProperty("knife");
    });

    it("has all 3 categories for blocky attach", () => {
      expect(BLOCKY_WEAPON_ATTACH).toHaveProperty("rifle");
      expect(BLOCKY_WEAPON_ATTACH).toHaveProperty("pistol");
      expect(BLOCKY_WEAPON_ATTACH).toHaveProperty("knife");
      for (const [cat, attach] of Object.entries(BLOCKY_WEAPON_ATTACH)) {
        expect(attach.position).toHaveLength(3);
        expect(attach.rotation).toHaveLength(3);
        expect(typeof attach.scale).toBe("number");
        expect(typeof attach.muzzleZ).toBe("number");
      }
    });

    it("has all 3 categories for tactical attach", () => {
      expect(TACTICAL_WEAPON_ATTACH).toHaveProperty("rifle");
      expect(TACTICAL_WEAPON_ATTACH).toHaveProperty("pistol");
      expect(TACTICAL_WEAPON_ATTACH).toHaveProperty("knife");
      for (const [cat, attach] of Object.entries(TACTICAL_WEAPON_ATTACH)) {
        expect(attach.position).toHaveLength(3);
        expect(attach.rotation).toHaveLength(3);
        expect(typeof attach.scale).toBe("number");
        expect(typeof attach.muzzleZ).toBe("number");
      }
    });

    it("rifle and pistol arm poses differ", () => {
      expect(THIRD_PERSON_ARM_POSES.rifle.right).not.toEqual(
        THIRD_PERSON_ARM_POSES.pistol.right
      );
    });
  });
});
