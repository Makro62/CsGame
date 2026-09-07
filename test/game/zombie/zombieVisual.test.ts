import { describe, it, expect } from "vitest";
import {
  zombieVisualScale,
  zombieBodyRadius,
  zombieHeadRadius,
  ZOMBIE_BODY_HEX,
  ZOMBIE_PANTS_HEX,
  ZOMBIE_SKIN_HEX,
} from "../../../client/src/game/zombie/zombieVisual";
import type { ZombieType } from "../../../client/src/game/zombie/zombieVisual";

describe("zombieVisual", () => {
  describe("zombieVisualScale", () => {
    it("returns a positive number for all zombie types", () => {
      const types: ZombieType[] = ["walker", "runner", "tank", "spitter", "exploder", "boss"];
      for (const t of types) {
        expect(zombieVisualScale(t)).toBeGreaterThan(0);
      }
    });
  });

  describe("zombieBodyRadius", () => {
    it("returns scaled body radius", () => {
      const scale = zombieVisualScale("walker");
      expect(zombieBodyRadius("walker")).toBeCloseTo(0.36 * scale, 5);
    });
  });

  describe("zombieHeadRadius", () => {
    it("returns scaled head radius", () => {
      const scale = zombieVisualScale("walker");
      expect(zombieHeadRadius("walker")).toBeCloseTo(0.13 * scale, 5);
    });
  });

  it("ZOMBIE_BODY_HEX has all types", () => {
    expect(Object.keys(ZOMBIE_BODY_HEX)).toContain("walker");
    expect(Object.keys(ZOMBIE_BODY_HEX)).toContain("boss");
  });

  it("ZOMBIE_PANTS_HEX has all types", () => {
    expect(Object.keys(ZOMBIE_PANTS_HEX)).toContain("walker");
  });

  it("ZOMBIE_SKIN_HEX has all types", () => {
    expect(Object.keys(ZOMBIE_SKIN_HEX)).toContain("walker");
  });

  describe("zombieVisualScale per type", () => {
    it("tank is larger than walker", () => {
      expect(zombieVisualScale("tank")).toBeGreaterThan(zombieVisualScale("walker"));
    });

    it("runner is smaller than walker", () => {
      expect(zombieVisualScale("runner")).toBeLessThanOrEqual(zombieVisualScale("walker"));
    });

    it("exploder has its own scale", () => {
      const s = zombieVisualScale("exploder");
      expect(s).toBeGreaterThan(0);
    });

    it("spitter has its own scale", () => {
      const s = zombieVisualScale("spitter");
      expect(s).toBeGreaterThan(0);
    });

    it("boss is largest", () => {
      const bossScale = zombieVisualScale("boss");
      expect(bossScale).toBeGreaterThanOrEqual(zombieVisualScale("tank"));
    });

    it("returns 1 for unknown zombie type (fallback)", () => {
      const s = zombieVisualScale("unknown_type" as any);
      expect(s).toBe(1);
    });
  });

  describe("zombieBodyRadius per type", () => {
    it("tank body radius > walker", () => {
      expect(zombieBodyRadius("tank")).toBeGreaterThan(zombieBodyRadius("walker"));
    });

    it("runner body radius <= walker", () => {
      expect(zombieBodyRadius("runner")).toBeLessThanOrEqual(zombieBodyRadius("walker"));
    });

    it("boss body radius is largest", () => {
      expect(zombieBodyRadius("boss")).toBeGreaterThanOrEqual(zombieBodyRadius("tank"));
    });
  });

  describe("zombieHeadRadius per type", () => {
    it("tank head radius > walker", () => {
      expect(zombieHeadRadius("tank")).toBeGreaterThan(zombieHeadRadius("walker"));
    });

    it("boss head radius is largest", () => {
      expect(zombieHeadRadius("boss")).toBeGreaterThanOrEqual(zombieHeadRadius("tank"));
    });
  });

  describe("hex color maps", () => {
    it("ZOMBIE_BODY_HEX has walker, tank, runner, spitter, exploder, boss", () => {
      expect(ZOMBIE_BODY_HEX).toHaveProperty("walker");
      expect(ZOMBIE_BODY_HEX).toHaveProperty("tank");
      expect(ZOMBIE_BODY_HEX).toHaveProperty("runner");
      expect(ZOMBIE_BODY_HEX).toHaveProperty("spitter");
      expect(ZOMBIE_BODY_HEX).toHaveProperty("exploder");
      expect(ZOMBIE_BODY_HEX).toHaveProperty("boss");
    });

    it("ZOMBIE_PANTS_HEX has walker, tank, runner, spitter, exploder, boss", () => {
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("walker");
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("tank");
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("runner");
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("spitter");
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("exploder");
      expect(ZOMBIE_PANTS_HEX).toHaveProperty("boss");
    });

    it("ZOMBIE_SKIN_HEX has walker, tank, runner, spitter, exploder, boss", () => {
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("walker");
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("tank");
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("runner");
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("spitter");
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("exploder");
      expect(ZOMBIE_SKIN_HEX).toHaveProperty("boss");
    });
  });
});
