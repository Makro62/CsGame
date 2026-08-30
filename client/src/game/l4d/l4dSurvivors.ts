// ============================================================================
// L4D Survivor Definitions
// ============================================================================

export interface L4DSurvivorStats {
  maxHp: number;
  speed: number;
  armor: number;
  damage: number;
  accuracy: number;
}

export interface L4DSurvivorDef {
  id: string;
  name: string;
  role: string;
  ability: string;
  abilityCooldown: number;
  description: string;
  stats: L4DSurvivorStats;
  primaryWeapon: string;
  secondaryWeapon: string;
  knifeWeapon: string;
  armorColor: string;
  accentColor: string;
  neonColor: string;
}

export const L4D_SURVIVORS: Record<string, L4DSurvivorDef> = {
  coach: {
    id: "coach",
    name: "Coach",
    role: "Tank",
    ability: "rally",
    abilityCooldown: 30,
    description: "Pemimpin yang kuat dengan HP tinggi. Mampu memulihkan HP seluruh tim dengan ability Rally.",
    stats: { maxHp: 120, speed: 4.8, armor: 15, damage: 30, accuracy: 70 },
    primaryWeapon: "ak47",
    secondaryWeapon: "deagle",
    knifeWeapon: "knife",
    armorColor: "#2d5a1e",
    accentColor: "#4ade80",
    neonColor: "#22c55e",
  },
  rochelle: {
    id: "rochelle",
    name: "Rochelle",
    role: "Support",
    ability: "heal_pulse",
    abilityCooldown: 25,
    description: "Support yang tangguh. Mampu menyembuhkan diri sendiri dan memberikan armor kepada tim.",
    stats: { maxHp: 100, speed: 5.2, armor: 10, damage: 25, accuracy: 85 },
    primaryWeapon: "m4a1",
    secondaryWeapon: "glock",
    knifeWeapon: "knife",
    armorColor: "#5a1e4a",
    accentColor: "#c084fc",
    neonColor: "#a855f7",
  },
  ellis: {
    id: "ellis",
    name: "Ellis",
    role: "Scout",
    ability: "sprint_burst",
    abilityCooldown: 20,
    description: "Pengintai cepat dengan speed tinggi. Mampu berlari lebih cepat untuk menghindari bahaya.",
    stats: { maxHp: 90, speed: 6.0, armor: 5, damage: 22, accuracy: 80 },
    primaryWeapon: "mp5",
    secondaryWeapon: "glock",
    knifeWeapon: "knife",
    armorColor: "#5a4a1e",
    accentColor: "#facc15",
    neonColor: "#eab308",
  },
  nick: {
    id: "nick",
    name: "Nick",
    role: "Gambler",
    ability: "lucky_shot",
    abilityCooldown: 22,
    description: "Penjudi yang beruntung. Damage tembakan bisa memberikan bonus damage secara acak.",
    stats: { maxHp: 100, speed: 5.4, armor: 8, damage: 28, accuracy: 90 },
    primaryWeapon: "arccaster",
    secondaryWeapon: "tec9",
    knifeWeapon: "knife",
    armorColor: "#1e3a5f",
    accentColor: "#38bdf8",
    neonColor: "#0ea5e9",
  },
};

export const L4D_SURVIVOR_IDS = Object.keys(L4D_SURVIVORS);

export function getL4DSurvivor(id: string): L4DSurvivorDef {
  return L4D_SURVIVORS[id] ?? L4D_SURVIVORS.coach;
}
