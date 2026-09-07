import { WAVE_CONFIG, type ZombieType } from "@cs-game/shared";

export const ZOMBIE_PICK_WEIGHTS: Record<ZombieType, number> = {
  walker: 50, runner: 25, tank: 10, spitter: 8, exploder: 5, boss: 2,
};

export function waveCount(wave: number): number {
  const w = Math.max(1, wave);
  return WAVE_CONFIG.baseZombieCount + (w - 1) * WAVE_CONFIG.zombiesPerWave;
}

export function waveInterval(wave: number): number {
  return Math.max(400, 2000 - wave * 80);
}

export function waveHpScale(wave: number): number {
  return 1 + Math.max(0, wave - 1) * WAVE_CONFIG.hpMultiplierPerWave;
}

export function waveDamageScale(wave: number): number {
  return 1 + Math.max(0, wave - 1) * WAVE_CONFIG.damageMultiplierPerWave;
}

export function waveSpeedScale(wave: number): number {
  return 1 + Math.max(0, wave - 1) * WAVE_CONFIG.speedBonusPerWave;
}

/** Dedicated boss + small horde every 5 waves. */
export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 5 === 0;
}

export function pickZombieType(wave: number, rng: () => number = Math.random): ZombieType {
  const unlock = WAVE_CONFIG.specialUnlock;
  const candidates: ZombieType[] = ["walker"];
  if (wave >= unlock.runner) candidates.push("runner");
  if (wave >= unlock.tank) candidates.push("tank");
  if (wave >= unlock.spitter) candidates.push("spitter");
  if (wave >= unlock.exploder) candidates.push("exploder");

  let total = 0;
  for (const t of candidates) total += ZOMBIE_PICK_WEIGHTS[t];
  let r = rng() * total;
  for (const t of candidates) {
    r -= ZOMBIE_PICK_WEIGHTS[t];
    if (r <= 0) return t;
  }
  return "walker";
}
