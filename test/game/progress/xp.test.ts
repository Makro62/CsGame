import { describe, it, expect } from "vitest";
import {
  XP,
  levelFromXp,
  xpToReachLevel,
  killXp,
  trainingScoreToXp,
} from "../../../client/src/game/progress/xp";

describe("progress/xp", () => {
  it("levelFromXp starts at 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it("levelFromXp grows with xp", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(900)).toBe(4);
  });

  it("levelFromXp handles negative and non-finite", () => {
    expect(levelFromXp(-50)).toBe(1);
    expect(levelFromXp(NaN)).toBe(1);
    expect(levelFromXp(Infinity)).toBeGreaterThanOrEqual(1);
  });

  it("xpToReachLevel matches levelFromXp boundary", () => {
    for (let level = 1; level <= 10; level++) {
      const xp = xpToReachLevel(level);
      expect(levelFromXp(xp)).toBe(level);
    }
  });

  it("killXp includes headshot bonus", () => {
    expect(killXp(false)).toBe(XP.kill);
    expect(killXp(true)).toBe(XP.kill + XP.headshotBonus);
  });

  it("trainingScoreToXp floors and clamps", () => {
    expect(trainingScoreToXp(12.7)).toBe(12);
    expect(trainingScoreToXp(-5)).toBe(0);
    expect(trainingScoreToXp(NaN)).toBe(0);
  });
});
