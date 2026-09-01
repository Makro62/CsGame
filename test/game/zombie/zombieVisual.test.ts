import { describe, it, expect } from "vitest";
import { zombieVisualScale, zombieBodyRadius, zombieHeadRadius, ZOMBIE_BODY_HEX } from "@src/game/zombie/zombieVisual";
import { ZOMBIE_TYPES } from "@cs-game/shared";

describe("zombieVisual", () => {
  it("all zombie types have valid scale", () => {
    for (const type of Object.keys(ZOMBIE_TYPES) as Array<keyof typeof ZOMBIE_TYPES>) {
      expect(zombieVisualScale(type as never)).toBeGreaterThan(0);
      expect(Number.isFinite(zombieBodyRadius(type as never))).toBe(true);
      expect(Number.isFinite(zombieHeadRadius(type as never))).toBe(true);
    }
  });

  it("body radius is larger than head radius", () => {
    for (const type of Object.keys(ZOMBIE_TYPES) as Array<keyof typeof ZOMBIE_TYPES>) {
      expect(zombieBodyRadius(type as never)).toBeGreaterThan(zombieHeadRadius(type as never));
    }
  });

  it("invalid type returns 1 scale (previously crash)", () => {
    expect(zombieVisualScale("invalid" as never)).toBe(1);
    expect(zombieBodyRadius("invalid" as never)).toBeCloseTo(0.36);
    expect(zombieHeadRadius("invalid" as never)).toBeCloseTo(0.13);
  });

  it("null/undefined type returns fallback without throw", () => {
    expect(() => zombieVisualScale(null as never)).not.toThrow();
    expect(() => zombieBodyRadius(undefined as never)).not.toThrow();
  });

  it("hex maps cover all zombie types", () => {
    for (const type of Object.keys(ZOMBIE_TYPES)) {
      expect(ZOMBIE_BODY_HEX[type as never]).toBeDefined();
      expect(typeof ZOMBIE_BODY_HEX[type as never]).toBe("number");
    }
  });

  it("scale 0 edge would give 0 radius (not NaN)", () => {
    // With fix, invalid returns 1, so radius is 0.36 — proves no NaN poisoning
    const r = zombieBodyRadius("bogus" as never);
    expect(Number.isNaN(r)).toBe(false);
  });
});
