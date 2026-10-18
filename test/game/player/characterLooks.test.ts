import { describe, it, expect } from "vitest";
import {
  CHARACTER_LOOKS,
  getCharacterLook,
} from "../../../client/src/game/player/characterLooks";

describe("characterLooks", () => {
  describe("CHARACTER_LOOKS", () => {
    it("has survivor characters", () => {
      expect(CHARACTER_LOOKS).toHaveProperty("nova7");
      expect(CHARACTER_LOOKS).toHaveProperty("titan");
      expect(CHARACTER_LOOKS).toHaveProperty("coach");
      expect(CHARACTER_LOOKS).toHaveProperty("rochelle");
      expect(CHARACTER_LOOKS).toHaveProperty("ellis");
      expect(CHARACTER_LOOKS).toHaveProperty("nick");
    });

    it("has CT models", () => {
      expect(CHARACTER_LOOKS).toHaveProperty("ct_sas");
      expect(CHARACTER_LOOKS).toHaveProperty("ct_fbi");
      expect(CHARACTER_LOOKS).toHaveProperty("ct_gign");
      expect(CHARACTER_LOOKS).toHaveProperty("ct_idf");
      expect(CHARACTER_LOOKS).toHaveProperty("ct_swat");
    });

    it("has T models", () => {
      expect(CHARACTER_LOOKS).toHaveProperty("t_phoenix");
      expect(CHARACTER_LOOKS).toHaveProperty("t_balkan");
      expect(CHARACTER_LOOKS).toHaveProperty("t_prof");
      expect(CHARACTER_LOOKS).toHaveProperty("t_arctic");
      expect(CHARACTER_LOOKS).toHaveProperty("t_elite");
    });

    it("every character has valid numeric dimensions", () => {
      for (const [id, look] of Object.entries(CHARACTER_LOOKS)) {
        expect(look.scale).toBeGreaterThan(0);
        expect(look.armW).toBeGreaterThan(0);
        expect(look.legW).toBeGreaterThan(0);
        expect(look.shoulder).toBeGreaterThan(0);
        expect(look.torso).toHaveLength(3);
        expect(look.vest).toHaveLength(3);
      }
    });

    it("every character has valid colors", () => {
      for (const [id, look] of Object.entries(CHARACTER_LOOKS)) {
        expect(look.skin).toMatch(/^#[0-9a-f]{3,6}$/i);
        expect(look.pants).toMatch(/^#[0-9a-f]{3,6}$/i);
        expect(look.shoes).toMatch(/^#[0-9a-f]{3,6}$/i);
        expect(look.hair).toMatch(/^#[0-9a-f]{3,6}$/i);
      }
    });

    it("titan is the largest character", () => {
      const titan = CHARACTER_LOOKS.titan;
      expect(titan.scale).toBeGreaterThanOrEqual(1.1);
      expect(titan.armW).toBeGreaterThanOrEqual(0.24);
    });

    it("rochelle is the smallest character", () => {
      const rochelle = CHARACTER_LOOKS.rochelle;
      expect(rochelle.scale).toBeLessThanOrEqual(0.92);
    });
  });

  describe("getCharacterLook", () => {
    it("returns default look for null", () => {
      const look = getCharacterLook(null);
      expect(look.scale).toBe(1);
      expect(look.head).toBe("tactical");
    });

    it("returns default look for undefined", () => {
      const look = getCharacterLook(undefined);
      expect(look.scale).toBe(1);
      expect(look.head).toBe("tactical");
    });

    it("returns default look for unknown style", () => {
      const look = getCharacterLook("nonexistent");
      expect(look.scale).toBe(1);
    });

    it("returns correct look for nova7", () => {
      const look = getCharacterLook("nova7");
      expect(look.head).toBe("visor");
      expect(look.scale).toBe(0.96);
      expect(look.gear).toContain("headset");
    });

    it("returns correct look for titan", () => {
      const look = getCharacterLook("titan");
      expect(look.head).toBe("heavy");
      expect(look.gear).toContain("pauldrons");
    });

    it("returns correct look for coach", () => {
      const look = getCharacterLook("coach");
      expect(look.head).toBe("baldCap");
      expect(look.skin).toBe("#6d4c41");
    });
  });
});
