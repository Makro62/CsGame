export type RankTier = "Silver" | "Gold" | "Platinum" | "Diamond" | "Global";

export const RANK_THRESHOLDS: ReadonlyArray<{ tier: RankTier; min: number }> = [
  { tier: "Silver", min: 0 },
  { tier: "Gold", min: 400 },
  { tier: "Platinum", min: 800 },
  { tier: "Diamond", min: 1200 },
  { tier: "Global", min: 1600 },
];

export const RANK_WIN_DELTA = 25;
export const RANK_LOSS_DELTA = 15;

export function applyRankResult(points: number, won: boolean): number {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  const next = won ? safe + RANK_WIN_DELTA : safe - RANK_LOSS_DELTA;
  return Math.max(0, next);
}

export function rankTier(points: number): RankTier {
  const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
  let tier: RankTier = "Silver";
  for (const entry of RANK_THRESHOLDS) {
    if (safe >= entry.min) tier = entry.tier;
  }
  return tier;
}

export function rankTierColor(tier: RankTier): string {
  switch (tier) {
    case "Gold":
      return "#facc15";
    case "Platinum":
      return "#22d3ee";
    case "Diamond":
      return "#a855f7";
    case "Global":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}
