import { describe, it, expect } from "vitest";
import {
  waveCount,
  waveInterval,
  waveHpScale,
  waveDamageScale,
  waveSpeedScale,
  isBossWave,
  pickZombieType,
  ZOMBIE_PICK_WEIGHTS,
} from "@src/game/zombie/zombieWaves";

describe("zombieWaves", () => {
  describe("waveCount", () => {
    it("returns base count for wave 1", () => {
      expect(waveCount(1)).toBe(10);
    });

    it("increases with wave", () => {
      expect(waveCount(5)).toBeGreaterThan(waveCount(1));
    });

    it("scales linearly", () => {
      const d = waveCount(2) - waveCount(1);
      expect(waveCount(3) - waveCount(2)).toBe(d);
    });
  });

  describe("waveInterval", () => {
    it("decreases with wave", () => {
      expect(waveInterval(10)).toBeLessThan(waveInterval(1));
    });

    it("never goes below 400ms", () => {
      expect(waveInterval(100)).toBeGreaterThanOrEqual(400);
    });

    it("returns a reasonable value for wave 1", () => {
      expect(waveInterval(1)).toBeGreaterThan(0);
    });
  });

  describe("waveHpScale", () => {
    it("returns 1 for wave 1", () => {
      expect(waveHpScale(1)).toBe(1);
    });

    it("increases with wave", () => {
      expect(waveHpScale(10)).toBeGreaterThan(1);
    });
  });

  describe("waveDamageScale", () => {
    it("returns 1 for wave 1", () => {
      expect(waveDamageScale(1)).toBe(1);
    });

    it("increases with wave", () => {
      expect(waveDamageScale(10)).toBeGreaterThan(1);
    });
  });

  describe("waveSpeedScale", () => {
    it("returns 1 for wave 1", () => {
      expect(waveSpeedScale(1)).toBe(1);
    });

    it("increases with wave", () => {
      expect(waveSpeedScale(10)).toBeGreaterThan(1);
    });
  });

  describe("isBossWave", () => {
    it("returns true for wave 5", () => {
      expect(isBossWave(5)).toBe(true);
    });

    it("returns true for wave 10", () => {
      expect(isBossWave(10)).toBe(true);
    });

    it("returns false for wave 1", () => {
      expect(isBossWave(1)).toBe(false);
    });

    it("returns false for wave 3", () => {
      expect(isBossWave(3)).toBe(false);
    });

    it("returns false for wave 0", () => {
      expect(isBossWave(0)).toBe(false);
    });

    it("returns true for wave 15", () => {
      expect(isBossWave(15)).toBe(true);
    });
  });

  describe("pickZombieType", () => {
    it("returns walker for wave 1", () => {
      const type = pickZombieType(1, () => 0.5);
      expect(type).toBe("walker");
    });

    it("can return runner for wave 3+", () => {
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        results.add(pickZombieType(3, () => Math.random()));
      }
      expect(results.has("runner")).toBe(true);
    });

    it("can return tank for wave 5+", () => {
      const results = new Set<string>();
      for (let i = 0; i < 200; i++) {
        results.add(pickZombieType(5, () => Math.random()));
      }
      expect(results.has("tank")).toBe(true);
    });

    it("returns walker when rng is 0", () => {
      expect(pickZombieType(10, () => 0)).toBe("walker");
    });

    it("returns last candidate when rng is close to 1", () => {
      // With all candidates unlocked, high rng should still return something valid
      const type = pickZombieType(10, () => 0.999);
      expect(type).toBeTruthy();
    });

    it("returns walker when rng returns exactly 0 (edge case)", () => {
      // r = 0 * total = 0, first iteration r <= 0 → returns first candidate
      expect(pickZombieType(1, () => 0)).toBe("walker");
    });
  });

  describe("ZOMBIE_PICK_WEIGHTS", () => {
    it("has all zombie types", () => {
      expect(Object.keys(ZOMBIE_PICK_WEIGHTS)).toHaveLength(6);
    });

    it("all weights are positive", () => {
      for (const w of Object.values(ZOMBIE_PICK_WEIGHTS)) {
        expect(w).toBeGreaterThan(0);
      }
    });

    it("walker has highest weight", () => {
      expect(ZOMBIE_PICK_WEIGHTS.walker).toBe(
        Math.max(...Object.values(ZOMBIE_PICK_WEIGHTS)),
      );
    });
  });
});