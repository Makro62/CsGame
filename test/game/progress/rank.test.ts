import { describe, it, expect } from "vitest";
import {
  applyRankResult,
  rankTier,
  rankTierColor,
  RANK_WIN_DELTA,
  RANK_LOSS_DELTA,
} from "../../../client/src/game/progress/rank";

describe("progress/rank", () => {
  it("applies win and loss deltas", () => {
    expect(applyRankResult(100, true)).toBe(100 + RANK_WIN_DELTA);
    expect(applyRankResult(100, false)).toBe(100 - RANK_LOSS_DELTA);
  });

  it("clamps at zero", () => {
    expect(applyRankResult(5, false)).toBe(0);
    expect(applyRankResult(-10, false)).toBe(0);
  });

  it("maps thresholds to tiers", () => {
    expect(rankTier(0)).toBe("Silver");
    expect(rankTier(399)).toBe("Silver");
    expect(rankTier(400)).toBe("Gold");
    expect(rankTier(800)).toBe("Platinum");
    expect(rankTier(1200)).toBe("Diamond");
    expect(rankTier(1600)).toBe("Global");
  });

  it("returns a hex color for each tier", () => {
    expect(rankTierColor("Silver")).toMatch(/^#/);
    expect(rankTierColor("Gold")).toMatch(/^#/);
    expect(rankTierColor("Platinum")).toMatch(/^#/);
    expect(rankTierColor("Diamond")).toMatch(/^#/);
    expect(rankTierColor("Global")).toMatch(/^#/);
  });
});
