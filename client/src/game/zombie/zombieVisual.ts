import type { ZombieType } from "../../stores/useZombieStore";
import { ZOMBIE_TYPES } from "@cs-game/shared";

/** Visual / hitbox scale. Matches the humanoid rig, not the old capsule. */
export function zombieVisualScale(type: ZombieType): number {
  const entry = ZOMBIE_TYPES[type as keyof typeof ZOMBIE_TYPES];
  return entry?.scale ?? 1;
}

/** Half-width of torso + arms in XZ, matching the box rig. */
export function zombieBodyRadius(type: ZombieType): number {
  return 0.36 * zombieVisualScale(type);
}

/** Head disc from above — only dead-center shots count as headshots. */
export function zombieHeadRadius(type: ZombieType): number {
  return 0.13 * zombieVisualScale(type);
}

export const ZOMBIE_BODY_HEX: Record<ZombieType, number> = {
  walker: 0x4a6741,
  runner: 0x8b3a12,
  tank: 0x3a3a42,
  spitter: 0x6a8a22,
  exploder: 0xb8a428,
  boss: 0x7a1010,
};

export const ZOMBIE_PANTS_HEX: Record<ZombieType, number> = {
  walker: 0x2f3a28,
  runner: 0x4a220c,
  tank: 0x1c1c22,
  spitter: 0x3a4a14,
  exploder: 0x6a5a14,
  boss: 0x3a0808,
};

export const ZOMBIE_SKIN_HEX: Record<ZombieType, number> = {
  walker: 0x7a8f4a,
  runner: 0xa07040,
  tank: 0x6a6a62,
  spitter: 0x8aaa3a,
  exploder: 0xc9c06a,
  boss: 0x8a4040,
};
