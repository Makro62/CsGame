import { describe, it, expect } from "vitest";
import {
  clampNumber,
  sanitizeTickDt,
  sanitizeFireRateMultiplier,
  sanitizeDamage,
  sanitizeRegenAmount,
  computeReloadFill,
  parseStoredFloat,
  parseStoredInt,
  parseCrosshairStyle,
  aabbValid,
  safeDiv,
} from "@src/lib/numericGuards";

describe("numericGuards", () => {
  describe("clampNumber", () => {
    it("clamps into range", () => {
      expect(clampNumber(3, 0, 5)).toBe(3);
      expect(clampNumber(-2, 0, 5)).toBe(0);
      expect(clampNumber(9, 0, 5)).toBe(5);
    });

    it("falls back to min on NaN", () => {
      expect(clampNumber(NaN, 0.1, 5)).toBe(0.1);
    });
  });

  describe("sanitizeTickDt", () => {
    it("keeps a normal frame step", () => {
      expect(sanitizeTickDt(0.016)).toBe(0.016);
    });

    it("replaces NaN, Infinity, and negative dt", () => {
      expect(sanitizeTickDt(NaN)).toBe(0.016);
      expect(sanitizeTickDt(Infinity)).toBe(0.016);
      expect(sanitizeTickDt(-1)).toBe(0.016);
      expect(sanitizeTickDt(0)).toBe(0.016);
    });

    it("caps huge dt so timers cannot skip a whole round", () => {
      expect(sanitizeTickDt(4)).toBe(1);
      expect(sanitizeTickDt(1)).toBe(1);
    });
  });

  describe("sanitizeFireRateMultiplier", () => {
    it("returns 1 for NaN / non-finite", () => {
      expect(sanitizeFireRateMultiplier(NaN)).toBe(1);
      expect(sanitizeFireRateMultiplier(Infinity)).toBe(1);
    });

    it("never goes below 1", () => {
      expect(sanitizeFireRateMultiplier(0)).toBe(1);
      expect(sanitizeFireRateMultiplier(1.4)).toBe(1.4);
    });
  });

  describe("sanitizeDamage / regen", () => {
    it("rejects non-positive and NaN damage", () => {
      expect(sanitizeDamage(NaN)).toBeNull();
      expect(sanitizeDamage(0)).toBeNull();
      expect(sanitizeDamage(-10)).toBeNull();
      expect(sanitizeDamage(30)).toBe(30);
    });

    it("rejects NaN regen", () => {
      expect(sanitizeRegenAmount(NaN)).toBe(0);
      expect(sanitizeRegenAmount(-1)).toBe(0);
      expect(sanitizeRegenAmount(0.5)).toBe(0.5);
    });
  });

  describe("computeReloadFill", () => {
    it("fills from reserve up to mag", () => {
      expect(computeReloadFill(30, 10, 90)).toEqual({
        needed: 20,
        load: 20,
        ammoAfter: 30,
        reserveAfter: 70,
      });
    });

    it("does not overfill when ammo already exceeds mag", () => {
      const fill = computeReloadFill(30, 40, 10);
      expect(fill.needed).toBe(0);
      expect(fill.load).toBe(0);
      expect(fill.ammoAfter).toBe(40);
      expect(fill.reserveAfter).toBe(10);
    });

    it("partial fill when reserve is short", () => {
      expect(computeReloadFill(30, 25, 2).ammoAfter).toBe(27);
    });

    it("handles NaN ammo without producing NaN fill", () => {
      const fill = computeReloadFill(30, NaN, 10);
      expect(Number.isFinite(fill.ammoAfter)).toBe(true);
      expect(Number.isFinite(fill.reserveAfter)).toBe(true);
    });
  });

  describe("parseStored*", () => {
    it("falls back on corrupt float/int", () => {
      expect(parseStoredFloat("oops", 1.2, 0.1, 5)).toBe(1.2);
      expect(parseStoredFloat("99", 1.2, 0.1, 5)).toBe(5);
      expect(parseStoredInt("", 80, 0, 100)).toBe(80);
      expect(parseStoredInt("-5", 80, 0, 100)).toBe(0);
    });

    it("accepts only known crosshair styles", () => {
      expect(parseCrosshairStyle("dot")).toBe("dot");
      expect(parseCrosshairStyle("garbage")).toBe("dynamic");
    });
  });

  describe("aabbValid / safeDiv", () => {
    it("rejects inverted AABB", () => {
      expect(aabbValid(8, -14, 14, -13.2)).toBe(false);
      expect(aabbValid(8, 14, -14, -13.2)).toBe(true);
    });

    it("does not divide by zero", () => {
      expect(Number.isFinite(safeDiv(1, 0))).toBe(true);
      expect(safeDiv(4, 2)).toBe(2);
      expect(safeDiv(NaN, 1)).toBe(0);
    });
  });
});
