// ============================================================================
// Hero Definitions for Zombie Survival Mode
// ============================================================================

export type HeroClass = "assault" | "heavy";
export type HeroAbility = "berserk" | "shield";

export interface HeroStats {
  maxHp: number;
  speed: number;
  armor: number;
  damage: number;
  accuracy: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  heroClass: HeroClass;
  ability: HeroAbility;
  abilityCooldown: number;
  description: string;
  stats: HeroStats;
  primaryWeapon: string;
  secondaryWeapon: string;
  knifeWeapon: string;
  armorColor: string;
  accentColor: string;
  neonColor: string;
  weaponType: "rifle" | "pistol" | "knife";
}

export const HEROES: Record<string, HeroDefinition> = {
  nova7: {
    id: "nova7",
    name: "NOVA-7",
    heroClass: "assault",
    ability: "berserk",
    abilityCooldown: 25,
    description: "Soldat serangan cepat dengan damage tinggi. Mampu membunuh zombie dalam jumlah besar dengan kecepatan tembak yang cepat.",
    stats: {
      maxHp: 100,
      speed: 5.4,
      armor: 0,
      damage: 25,
      accuracy: 85,
    },
    primaryWeapon: "mp5",
    secondaryWeapon: "glock",
    knifeWeapon: "knife",
    armorColor: "#1e3a5f",
    accentColor: "#3b82f6",
    neonColor: "#00d4ff",
    weaponType: "rifle",
  },
  titan: {
    id: "titan",
    name: "TITAN",
    heroClass: "heavy",
    ability: "shield",
    abilityCooldown: 30,
    description: "Tank dengan HP tinggi dan armor kuat. Mampu menyerap banyak damage dan melindungi diri dengan energy shield.",
    stats: {
      maxHp: 150,
      speed: 4.6,
      armor: 25,
      damage: 35,
      accuracy: 70,
    },
    primaryWeapon: "ak47",
    secondaryWeapon: "deagle",
    knifeWeapon: "knife",
    armorColor: "#6b2121",
    accentColor: "#dc2626",
    neonColor: "#ff4444",
    weaponType: "rifle",
  },
};

export const HERO_IDS = Object.keys(HEROES);

export function getHero(id: string): HeroDefinition {
  return HEROES[id] ?? HEROES.nova7;
}
