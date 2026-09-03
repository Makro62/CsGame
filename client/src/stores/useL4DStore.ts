import { create } from "zustand";
import { L4D_SAFE_Z, L4D_ZONES } from "../game/l4d/l4dLayout";

type L4DChapter = 1 | 2 | 3 | 4;
export type SpecialType = "common" | "hunter" | "smoker" | "boomer" | "tank" | "witch";

export interface L4DSurvivor {
  id: string; name: string; x: number; z: number; hp: number; maxHp: number;
  speed: number;
  rotationY: number;
  shootingUntil: number;
  isDowned: boolean; isDead: boolean; isBot: boolean; hasPills: boolean; hasMedkit: boolean;
  downedTimer: number;
  pinnedBy: string | null;
  grabbedBy: string | null;
  bileUntil: number;
}

export interface L4DInfected {
  id: string; type: SpecialType; x: number; y: number; z: number;
  hp: number; maxHp: number; rotationY: number; isDead: boolean; isAttacking: boolean; speed: number;
  alerted?: boolean;
  pinTarget?: string | null;
  grabTarget?: string | null;
}

interface L4DState {
  chapter: L4DChapter;
  currentZone: number;
  unlockedZones: number;
  zoneQuota: number;
  zombiesRemaining: number;
  zoneBanner: string | null;
  survivors: L4DSurvivor[];
  infected: L4DInfected[];
  isGameOver: boolean;
  isVictory: boolean;
  abilityCooldownRemaining: number;
  sprintBoostUntil: number;
  luckyShotUntil: number;

  updateSurvivor: (id: string, fn: (s: L4DSurvivor) => L4DSurvivor) => void;
  addInfected: (inf: L4DInfected) => void;
  damageInfected: (id: string, dmg: number) => boolean;
  resetCampaign: (chapter?: L4DChapter) => void;
  setVictory: (v: boolean) => void;
  setGameOver: (g: boolean) => void;
  tickAbility: (dt: number) => void;
  resetAbility: () => void;
  setZombiesRemaining: (n: number) => void;
  setZoneBanner: (banner: string | null) => void;
  unlockNextZone: () => boolean;
}

const SURVIVOR_NAMES = ["Coach", "Rochelle", "Ellis", "Nick"];

function mkSurvivors(): L4DSurvivor[] {
  return SURVIVOR_NAMES.map((name, i) => ({
    id: `survivor_${i}`,
    name,
    x: (i % 2 ? 1.8 : -1.8),
    z: L4D_SAFE_Z + Math.floor(i / 2) * 1.6,
    hp: 100, maxHp: 100, speed: 5.4,
    rotationY: 0,
    shootingUntil: 0,
    isDowned: false, isDead: false, isBot: i !== 0,
    hasPills: false, hasMedkit: i === 0,
    downedTimer: 0, pinnedBy: null, grabbedBy: null, bileUntil: 0,
  }));
}

function releaseFrom(survivors: L4DSurvivor[], infectedId: string): L4DSurvivor[] {
  return survivors.map(s => {
    if (s.pinnedBy === infectedId) {
      return { ...s, pinnedBy: null, isDowned: false, hp: Math.max(s.hp, 25), downedTimer: 0 };
    }
    if (s.grabbedBy === infectedId) {
      return { ...s, grabbedBy: null };
    }
    return s;
  });
}

function campaignReset(chapter?: L4DChapter): Partial<L4DState> {
  const ch = Math.max(1, Math.min(L4D_ZONES.length, chapter ?? 1)) as L4DChapter;
  const zone = ch - 1;
  return {
    chapter: ch,
    currentZone: zone,
    unlockedZones: zone + 1,
    zoneQuota: L4D_ZONES[zone].zombieCount,
    zombiesRemaining: L4D_ZONES[zone].zombieCount,
    zoneBanner: null,
    survivors: mkSurvivors(),
    infected: [],
    isGameOver: false,
    isVictory: false,
    abilityCooldownRemaining: 0,
    sprintBoostUntil: 0,
    luckyShotUntil: 0,
  };
}

export const useL4DStore = create<L4DState>((set, get) => ({
  ...campaignReset(1) as L4DState,

  updateSurvivor: (id, fn) => set({ survivors: get().survivors.map(s => s.id === id ? fn({ ...s }) : s) }),
  addInfected: (inf) => set({ infected: [...get().infected, inf] }),
  damageInfected: (id, dmg) => {
    const st = get();
    const inf = st.infected.find(i => i.id === id);
    if (!inf || inf.isDead) return false;
    const nhp = inf.hp - dmg;
    if (nhp <= 0) {
      const infected = st.infected.map(x => x.id === id ? { ...x, isDead: true, hp: 0, pinTarget: null, grabTarget: null } : x);
      set({
        infected,
        survivors: releaseFrom(st.survivors, id),
        zombiesRemaining: Math.max(0, st.zombiesRemaining - 1),
      });
      return true;
    }
    set({ infected: st.infected.map(x => x.id === id ? { ...x, hp: nhp } : x) });
    return false;
  },
  resetCampaign: (chapter) => set(campaignReset(chapter)),
  setVictory: (isVictory) => set({ isVictory }),
  setGameOver: (isGameOver) => set({ isGameOver }),
  tickAbility: (dt) => {
    const cd = get().abilityCooldownRemaining;
    if (cd <= 0) return;
    set({ abilityCooldownRemaining: Math.max(0, cd - dt) });
  },
  resetAbility: () => set({ abilityCooldownRemaining: 0, sprintBoostUntil: 0, luckyShotUntil: 0 }),
  setZombiesRemaining: (zombiesRemaining) => set({ zombiesRemaining: Math.max(0, zombiesRemaining) }),
  setZoneBanner: (zoneBanner) => set({ zoneBanner }),
  unlockNextZone: () => {
    const st = get();
    if (st.currentZone >= L4D_ZONES.length - 1) {
      set({ isVictory: true, zoneBanner: "SEMUA WILAYAH AMAN", zombiesRemaining: 0 });
      return false;
    }
    const next = st.currentZone + 1;
    set({
      currentZone: next,
      unlockedZones: next + 1,
      chapter: (next + 1) as L4DChapter,
      zoneQuota: L4D_ZONES[next].zombieCount,
      zombiesRemaining: L4D_ZONES[next].zombieCount,
      zoneBanner: `${L4D_ZONES[next].name} terbuka`,
      infected: [],
    });
    return true;
  },
}));
