import { WAVE_CONFIG, type ZombieType } from "@cs-game/shared";

export const ZOMBIE_PICK_WEIGHTS: Record<ZombieType, number> = {
  walker: 50, runner: 25, tank: 10, spitter: 8, exploder: 5, boss: 2,
};

export function waveCount(wave: number): number {
  return WAVE_CONFIG.baseZombieCount + (wave - 1) * WAVE_CONFIG.zombiesPerWave;
}

export function waveInterval(wave: number): number {
  return Math.max(400, 2000 - wave * 80);
}

export function waveHpScale(wave: number): number {
  return 1 + Math.max(0, wave - 1) * WAVE_CONFIG.hpMultiplierPerWave;
}

export function waveSpeedScale(wave: number): number {
  return 1 + Math.max(0, wave - 1) * WAVE_CONFIG.speedBonusPerWave;
}

export function pickZombieType(wave: number, rng: () => number = Math.random): ZombieType {
  const unlock = WAVE_CONFIG.specialUnlock;
  const chances = WAVE_CONFIG.specialChances;
  const candidates: ZombieType[] = ["walker"];
  if (wave >= unlock.runner) candidates.push("runner");
  if (wave >= unlock.tank) candidates.push("tank");
  if (wave >= unlock.spitter) candidates.push("spitter");
  if (wave >= unlock.exploder) candidates.push("exploder");
  if (wave >= unlock.boss && rng() < chances.boss) return "boss";

  let total = 0;
  for (const t of candidates) total += ZOMBIE_PICK_WEIGHTS[t];
  let r = rng() * total;
  for (const t of candidates) {
    r -= ZOMBIE_PICK_WEIGHTS[t];
    if (r <= 0) return t;
  }
  return "walker";
}
