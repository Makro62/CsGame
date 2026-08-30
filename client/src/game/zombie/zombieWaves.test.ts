import { describe, expect, it } from "vitest";
import { WAVE_CONFIG } from "@cs-game/shared";
import { isBossWave, pickZombieType, waveCount, waveDamageScale, waveHpScale, waveInterval, waveSpeedScale } from "./zombieWaves";

describe("waveCount", () => {
  it("starts at base count", () => {
    expect(waveCount(1)).toBe(WAVE_CONFIG.baseZombieCount);
  });
  it("adds zombiesPerWave each wave", () => {
    expect(waveCount(2)).toBe(WAVE_CONFIG.baseZombieCount + WAVE_CONFIG.zombiesPerWave);
    expect(waveCount(3)).toBe(WAVE_CONFIG.baseZombieCount + 2 * WAVE_CONFIG.zombiesPerWave);
  });
});

describe("waveInterval", () => {
  it("never goes below 400ms", () => {
    expect(waveInterval(100)).toBe(400);
  });
  it("shrinks as waves increase", () => {
    expect(waveInterval(2)).toBeLessThan(waveInterval(1));
  });
});

describe("wave scales", () => {
  it("wave 1 is baseline", () => {
    expect(waveHpScale(1)).toBe(1);
    expect(waveSpeedScale(1)).toBe(1);
    expect(waveDamageScale(1)).toBe(1);
  });
  it("later waves raise hp, damage, and speed", () => {
    expect(waveHpScale(2)).toBeCloseTo(1 + WAVE_CONFIG.hpMultiplierPerWave);
    expect(waveDamageScale(2)).toBeCloseTo(1 + WAVE_CONFIG.damageMultiplierPerWave);
    expect(waveSpeedScale(2)).toBeCloseTo(1 + WAVE_CONFIG.speedBonusPerWave);
  });
});

describe("isBossWave", () => {
  it("is every 5th wave", () => {
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(15)).toBe(true);
    expect(isBossWave(4)).toBe(false);
    expect(isBossWave(1)).toBe(false);
  });
});

describe("pickZombieType", () => {
  it("wave 1 only yields walker", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickZombieType(1, () => 0.99)).toBe("walker");
    }
  });
  it("unlocks runner from wave 3", () => {
    expect(pickZombieType(3, () => 0.99)).not.toBe("boss");
    const types = new Set(Array.from({ length: 40 }, (_, i) => pickZombieType(3, () => i / 40)));
    expect(types.has("walker")).toBe(true);
    expect(types.has("runner")).toBe(true);
  });
  it("does not randomly spawn boss — boss waves inject one separately", () => {
    for (let i = 0; i < 30; i++) {
      expect(pickZombieType(10, () => i / 30)).not.toBe("boss");
    }
  });
});
