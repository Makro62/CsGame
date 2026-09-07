import type { LocalPlayer } from "./types";

/** CS-style bullet damage: armor absorbs half, helmet reduces rifle headshots. */
export function resolveBulletDamage(
  bodyDmg: number,
  headshotDmg: number,
  headshot: boolean,
  hasHelmet: boolean,
): number {
  if (!headshot) return bodyDmg;
  if (hasHelmet && headshotDmg < 115) return bodyDmg * 2;
  return headshotDmg;
}

export function applyArmorToDamage(
  victim: Pick<LocalPlayer, "hp" | "armor">,
  rawDamage: number,
): { hp: number; armor: number; damageDealt: number } {
  let dmg = Math.max(0, rawDamage);
  let armorAbsorb = 0;
  if (victim.armor > 0 && dmg > 0) {
    armorAbsorb = Math.min(victim.armor, dmg * 0.5);
    dmg -= armorAbsorb;
  }
  return {
    hp: Math.max(0, victim.hp - dmg),
    armor: Math.max(0, victim.armor - armorAbsorb),
    damageDealt: dmg + armorAbsorb,
  };
}

export function applyBulletDamageToPlayer(
  victim: LocalPlayer,
  bodyDmg: number,
  headshotDmg: number,
  headshot: boolean,
): LocalPlayer {
  const raw = resolveBulletDamage(bodyDmg, headshotDmg, headshot, victim.hasHelmet);
  const { hp, armor } = applyArmorToDamage(victim, raw);
  return { ...victim, hp, armor };
}
