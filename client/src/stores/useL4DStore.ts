import { create } from "zustand";
import { L4D_SAFE_Z } from "../game/l4d/l4dLayout";

type L4DChapter = 1 | 2 | 3 | 4;
type L4DFinaleState = "idle" | "call_rescue" | "holdout" | "escape" | "completed";
export type SpecialType = "common" | "hunter" | "smoker" | "boomer" | "tank" | "witch";

export interface L4DSurvivor {
  id: string; name: string; x: number; z: number; hp: number; maxHp: number;
  speed: number;
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
  chapterState: "safeRoom" | "traverse" | "finale";
  finaleState: L4DFinaleState;
  finaleTimer: number;
  rescueVehicleArrived: boolean;
  survivors: L4DSurvivor[];
  infected: L4DInfected[];
  hordeActive: boolean;
  hordeTimer: number;
  directorIntensity: number;
  panicLevel: number;
  crescendoActive: boolean;
  chapterProgress: number;
  isGameOver: boolean;
  isVictory: boolean;
  abilityCooldownRemaining: number;
  sprintBoostUntil: number;
  luckyShotUntil: number;

  setFinaleState: (s: L4DFinaleState, timer?: number) => void;
  updateSurvivor: (id: string, fn: (s: L4DSurvivor) => L4DSurvivor) => void;
  addInfected: (inf: L4DInfected) => void;
  damageInfected: (id: string, dmg: number) => boolean;
  setDirectorIntensity: (n: number) => void;
  setHorde: (active: boolean, timer?: number) => void;
  setPanic: (p: number) => void;
  resetCampaign: (chapter?: L4DChapter) => void;
  setVictory: (v: boolean) => void;
  setGameOver: (g: boolean) => void;
  tickAbility: (dt: number) => void;
  resetAbility: () => void;
}

const SURVIVOR_NAMES = ["Coach", "Rochelle", "Ellis", "Nick"];

function mkSurvivors(): L4DSurvivor[] {
  return SURVIVOR_NAMES.map((name, i) => ({
    id: `survivor_${i}`,
    name,
    x: (i % 2 ? 1.0 : -1.0),
    z: L4D_SAFE_Z + Math.floor(i / 2) * 1.15,
    hp: 100, maxHp: 100, speed: 5.4,
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

export const useL4DStore = create<L4DState>((set, get) => ({
  chapter: 1,
  chapterState: "safeRoom",
  finaleState: "idle",
  finaleTimer: 0,
  rescueVehicleArrived: false,
  survivors: mkSurvivors(),
  infected: [],
  hordeActive: false,
  hordeTimer: 0,
  directorIntensity: 0,
  panicLevel: 0,
  crescendoActive: false,
  chapterProgress: 0,
  isGameOver: false,
  isVictory: false,
  abilityCooldownRemaining: 0,
  sprintBoostUntil: 0,
  luckyShotUntil: 0,

  setFinaleState: (finaleState, finaleTimer) => set({ finaleState, finaleTimer: finaleTimer ?? get().finaleTimer }),
  updateSurvivor: (id, fn) => set({ survivors: get().survivors.map(s => s.id === id ? fn({ ...s }) : s) }),
  addInfected: (inf) => set({ infected: [...get().infected, inf] }),
  damageInfected: (id, dmg) => {
    const st = get();
    const inf = st.infected.find(i => i.id === id);
    if (!inf || inf.isDead) return false;
    const nhp = inf.hp - dmg;
    if (nhp <= 0) {
      let survivors = releaseFrom(st.survivors, id);
      let extra: Partial<L4DState> = {};
      if (inf.type === "boomer") {
        const now = Date.now();
        survivors = survivors.map(s => {
          if (s.isDead) return s;
          const d = Math.hypot(s.x - inf.x, s.z - inf.z);
          if (d < 7) return { ...s, bileUntil: now + 8000 };
          return s;
        });
        extra = { hordeActive: true, hordeTimer: Math.max(st.hordeTimer, 16), panicLevel: 85 };
      }
      set({
        infected: st.infected.map(x => x.id === id ? { ...x, isDead: true, hp: 0, pinTarget: null, grabTarget: null } : x),
        survivors,
        ...extra,
      });
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("l4dBoomerPop", { detail: { x: inf.x, z: inf.z } }));
      return true;
    }
    set({ infected: st.infected.map(x => x.id === id ? { ...x, hp: nhp } : x) });
    return true;
  },
  setDirectorIntensity: (directorIntensity) => set({ directorIntensity: Math.max(0, Math.min(100, directorIntensity)) }),
  setHorde: (hordeActive, hordeTimer) => set({ hordeActive, hordeTimer: hordeTimer ?? get().hordeTimer }),
  setPanic: (panicLevel) => set({ panicLevel: Math.max(0, Math.min(100, panicLevel)) }),
  resetCampaign: (chapter) => set({
    chapter: chapter ?? 1, chapterState: "safeRoom", finaleState: "idle", finaleTimer: 0, rescueVehicleArrived: false,
    survivors: mkSurvivors(), infected: [], hordeActive: false, hordeTimer: 0, directorIntensity: 0, panicLevel: 0,
    crescendoActive: false, chapterProgress: 0, isGameOver: false, isVictory: false,
    abilityCooldownRemaining: 0, sprintBoostUntil: 0, luckyShotUntil: 0,
  }),
  setVictory: (isVictory) => set({ isVictory }),
  setGameOver: (isGameOver) => set({ isGameOver }),
  tickAbility: (dt) => {
    const cd = get().abilityCooldownRemaining;
    if (cd <= 0) return;
    set({ abilityCooldownRemaining: Math.max(0, cd - dt) });
  },
  resetAbility: () => set({ abilityCooldownRemaining: 0, sprintBoostUntil: 0, luckyShotUntil: 0 }),
}));
