import { describe, it, expect } from "vitest";
import {
  finiteOr,
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
} from "../../client/src/lib/numericGuards";

describe("numericGuards", () => {
  describe("finiteOr", () => {
    it("returns n when finite", () => {
      expect(finiteOr(5, 0)).toBe(5);
    });
    it("returns fallback for NaN", () => {
      expect(finiteOr(NaN, 10)).toBe(10);
    });
    it("returns fallback for Infinity", () => {
      expect(finiteOr(Infinity, 7)).toBe(7);
    });
    it("returns fallback for -Infinity", () => {
      expect(finiteOr(-Infinity, 3)).toBe(3);
    });
    it("returns 0 for valid zero", () => {
      expect(finiteOr(0, 99)).toBe(0);
    });
  });

  describe("clampNumber", () => {
    it("clamps to min", () => {
      expect(clampNumber(-5, 0, 10)).toBe(0);
    });
    it("clamps to max", () => {
      expect(clampNumber(15, 0, 10)).toBe(10);
    });
    it("returns value within range", () => {
      expect(clampNumber(5, 0, 10)).toBe(5);
    });
    it("returns min for NaN", () => {
      expect(clampNumber(NaN, 2, 8)).toBe(2);
    });
  });

  describe("sanitizeTickDt", () => {
    it("returns dt when valid", () => {
      expect(sanitizeTickDt(0.016)).toBe(0.016);
    });
    it("returns default for NaN", () => {
      expect(sanitizeTickDt(NaN)).toBe(0.016);
    });
    it("returns default for negative", () => {
      expect(sanitizeTickDt(-1)).toBe(0.016);
    });
    it("caps at 1 second", () => {
      expect(sanitizeTickDt(5)).toBe(1);
    });
    it("returns default for Infinity", () => {
      expect(sanitizeTickDt(Infinity)).toBe(0.016);
    });
  });

  describe("sanitizeFireRateMultiplier", () => {
    it("returns multiplier when valid", () => {
      expect(sanitizeFireRateMultiplier(2)).toBe(2);
    });
    it("returns 1 for NaN", () => {
      expect(sanitizeFireRateMultiplier(NaN)).toBe(1);
    });
    it("clamps to minimum 1", () => {
      expect(sanitizeFireRateMultiplier(0.5)).toBe(1);
    });
  });

  describe("sanitizeDamage", () => {
    it("returns damage when valid", () => {
      expect(sanitizeDamage(50)).toBe(50);
    });
    it("returns null for NaN", () => {
      expect(sanitizeDamage(NaN)).toBeNull();
    });
    it("returns null for zero", () => {
      expect(sanitizeDamage(0)).toBeNull();
    });
    it("returns null for negative", () => {
      expect(sanitizeDamage(-10)).toBeNull();
    });
  });

  describe("sanitizeRegenAmount", () => {
    it("returns amount when valid", () => {
      expect(sanitizeRegenAmount(5)).toBe(5);
    });
    it("returns 0 for NaN", () => {
      expect(sanitizeRegenAmount(NaN)).toBe(0);
    });
    it("returns 0 for zero", () => {
      expect(sanitizeRegenAmount(0)).toBe(0);
    });
    it("returns 0 for negative", () => {
      expect(sanitizeRegenAmount(-3)).toBe(0);
    });
  });

  describe("computeReloadFill", () => {
    it("fills empty mag from reserve", () => {
      const r = computeReloadFill(30, 0, 60);
      expect(r.needed).toBe(30);
      expect(r.load).toBe(30);
      expect(r.ammoAfter).toBe(30);
      expect(r.reserveAfter).toBe(30);
    });
    it("fills partially when reserve is low", () => {
      const r = computeReloadFill(30, 10, 5);
      expect(r.needed).toBe(20);
      expect(r.load).toBe(5);
      expect(r.ammoAfter).toBe(15);
      expect(r.reserveAfter).toBe(0);
    });
    it("no fill when mag is full", () => {
      const r = computeReloadFill(30, 30, 60);
      expect(r.needed).toBe(0);
      expect(r.load).toBe(0);
    });
    it("handles NaN inputs", () => {
      const r = computeReloadFill(NaN, NaN, NaN);
      expect(r.needed).toBe(0);
      expect(r.load).toBe(0);
    });

    it("clamps ammo above mag capacity before refill", () => {
      const r = computeReloadFill(30, 40, 60);
      expect(r.needed).toBe(0);
      expect(r.load).toBe(0);
      expect(r.ammoAfter).toBe(30);
    });
  });

  describe("parseStoredFloat", () => {
    it("parses valid float", () => {
      expect(parseStoredFloat("3.14", 0, 0, 10)).toBeCloseTo(3.14);
    });
    it("returns fallback for invalid", () => {
      expect(parseStoredFloat("abc", 5, 0, 10)).toBe(5);
    });
    it("clamps to min", () => {
      expect(parseStoredFloat("-1", 5, 0, 10)).toBe(0);
    });
    it("clamps to max", () => {
      expect(parseStoredFloat("20", 5, 0, 10)).toBe(10);
    });
  });

  describe("parseStoredInt", () => {
    it("parses valid int", () => {
      expect(parseStoredInt("42", 0, 0, 100)).toBe(42);
    });
    it("returns fallback for invalid", () => {
      expect(parseStoredInt("abc", 10, 0, 100)).toBe(10);
    });
    it("rounds float", () => {
      expect(parseStoredInt("3.7", 0, 0, 10)).toBe(3);
    });
  });

  describe("parseCrosshairStyle", () => {
    it("returns valid styles", () => {
      expect(parseCrosshairStyle("dot")).toBe("dot");
      expect(parseCrosshairStyle("cross")).toBe("cross");
      expect(parseCrosshairStyle("dynamic")).toBe("dynamic");
    });
    it("defaults to dynamic for invalid", () => {
      expect(parseCrosshairStyle("invalid")).toBe("dynamic");
    });
  });

  describe("aabbValid", () => {
    it("returns true for valid AABB", () => {
      expect(aabbValid(0, 10, 0, 10)).toBe(true);
    });
    it("returns false when minX > maxX", () => {
      expect(aabbValid(10, 0, 0, 10)).toBe(false);
    });
    it("returns false when minZ > maxZ", () => {
      expect(aabbValid(0, 10, 10, 0)).toBe(false);
    });
  });

  describe("safeDiv", () => {
    it("divides normally", () => {
      expect(safeDiv(10, 2)).toBe(5);
    });
    it("returns 0 for NaN inputs", () => {
      expect(safeDiv(NaN, 5)).toBe(0);
      expect(safeDiv(5, NaN)).toBe(0);
    });
    it("handles zero denominator", () => {
      expect(safeDiv(10, 0)).toBe(10 / 0.01);
    });
  });
});
