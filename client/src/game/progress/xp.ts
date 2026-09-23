export const XP = {
  kill: 50,
  headshotBonus: 25,
  roundWin: 200,
  roundLoss: 75,
  matchWin: 500,
  matchLoss: 150,
  waveClear: 150,
  zoneClear: 250,
  trainingScoreUnit: 1,
} as const;

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  return Math.floor(Math.sqrt(safe / 100)) + 1;
}

export function xpToReachLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 * (safeLevel - 1) * (safeLevel - 1);
}

export function killXp(headshot: boolean): number {
  return XP.kill + (headshot ? XP.headshotBonus : 0);
}

export function trainingScoreToXp(score: number): number {
  const safe = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  return safe * XP.trainingScoreUnit;
}
