import { describe, expect, it } from "vitest";
import { WAVE_CONFIG } from "@cs-game/shared";
import { pickZombieType, waveCount, waveHpScale, waveInterval, waveSpeedScale } from "./zombieWaves";

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
  });
  it("later waves raise hp and speed", () => {
    expect(waveHpScale(2)).toBeCloseTo(1 + WAVE_CONFIG.hpMultiplierPerWave);
    expect(waveSpeedScale(2)).toBeCloseTo(1 + WAVE_CONFIG.speedBonusPerWave);
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
  it("can spawn boss from wave 10 when rng hits chance", () => {
    expect(pickZombieType(10, () => 0)).toBe("boss");
  });
});
