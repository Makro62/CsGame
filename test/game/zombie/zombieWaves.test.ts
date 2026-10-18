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
} from "../../../client/src/game/zombie/zombieWaves";

describe("zombieWaves", () => {
  describe("waveCount", () => {
    it("returns base count for wave 1", () => {
      expect(waveCount(1)).toBeGreaterThanOrEqual(10);
    });
    it("increases with wave number", () => {
      expect(waveCount(5)).toBeGreaterThan(waveCount(1));
    });

    it("treats wave 0 as wave 1", () => {
      expect(waveCount(0)).toBe(waveCount(1));
    });
  });

  describe("waveInterval", () => {
    it("decreases as wave increases", () => {
      expect(waveInterval(10)).toBeLessThan(waveInterval(1));
    });
    it("has minimum of 400ms", () => {
      expect(waveInterval(100)).toBeGreaterThanOrEqual(400);
    });
  });

  describe("waveHpScale", () => {
    it("starts at 1 for wave 1", () => {
      expect(waveHpScale(1)).toBe(1);
    });
    it("increases with wave", () => {
      expect(waveHpScale(10)).toBeGreaterThan(1);
    });
  });

  describe("waveDamageScale", () => {
    it("starts at 1 for wave 1", () => {
      expect(waveDamageScale(1)).toBe(1);
    });
    it("increases with wave", () => {
      expect(waveDamageScale(10)).toBeGreaterThan(1);
    });
  });

  describe("waveSpeedScale", () => {
    it("starts at 1 for wave 1", () => {
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
    it("returns false for wave 1", () => {
      expect(isBossWave(1)).toBe(false);
    });
    it("returns true for wave 10", () => {
      expect(isBossWave(10)).toBe(true);
    });
    it("returns false for wave 0", () => {
      expect(isBossWave(0)).toBe(false);
    });
  });

  describe("pickZombieType", () => {
    it("returns walker for wave 1", () => {
      const rng = () => 0.5;
      const result = pickZombieType(1, rng);
      expect(result).toBe("walker");
    });

    it("can return runner at wave 3+", () => {
      const rng = () => 0.01;
      const result = pickZombieType(3, rng);
      expect(["walker", "runner"]).toContain(result);
    });

    it("returns valid zombie types", () => {
      const validTypes = ["walker", "runner", "tank", "spitter", "exploder"];
      for (let w = 1; w <= 20; w++) {
        const rng = () => Math.random();
        const result = pickZombieType(w, rng);
        expect(validTypes).toContain(result);
      }
    });
  });

  it("ZOMBIE_PICK_WEIGHTS has all types", () => {
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("walker");
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("runner");
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("tank");
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("spitter");
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("exploder");
    expect(ZOMBIE_PICK_WEIGHTS).toHaveProperty("boss");
  });
});
