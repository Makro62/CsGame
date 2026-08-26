import { create } from "zustand";

export type L4DChapter = 1 | 2 | 3 | 4;
export type L4DFinaleState = "idle" | "call_rescue" | "holdout" | "escape" | "completed";
export type SpecialType = "common" | "hunter" | "smoker" | "boomer" | "tank" | "witch";

export interface L4DSurvivor {
  id: string; name: string; x: number; z: number; hp: number; maxHp: number;
  isDowned: boolean; isDead: boolean; isBot: boolean; hasPills: boolean; hasMedkit: boolean;
}

export interface L4DInfected {
  id: string; type: SpecialType; x: number; y: number; z: number;
  hp: number; maxHp: number; rotationY: number; isDead: boolean; isAttacking: boolean; speed: number;
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
  directorIntensity: number; // 0-100
  panicLevel: number; // 0-100
  crescendoActive: boolean;
  chapterProgress: number; // 0-1 along START->FINISH
  isGameOver: boolean;
  isVictory: boolean;

  setFinaleState: (s: L4DFinaleState, timer?: number) => void;
  updateSurvivor: (id: string, fn: (s: L4DSurvivor) => L4DSurvivor) => void;
  addInfected: (inf: L4DInfected) => void;
  setDirectorIntensity: (n: number) => void;
  setHorde: (active: boolean, timer?: number) => void;
  setPanic: (p: number) => void;
  resetCampaign: (chapter?: L4DChapter) => void;
  setVictory: (v: boolean) => void;
  setGameOver: (g: boolean) => void;
}

const SURVIVOR_NAMES = ["Coach","Rochelle","Ellis","Nick"];

function mkSurvivors(): L4DSurvivor[] {
  return SURVIVOR_NAMES.map((name, i) => ({
    id: `survivor_${i}`,
    name, x: 0 + (i%2? 1.2: -1.2), z: -28 + Math.floor(i/2)*1.4,
    hp: 100, maxHp: 100, isDowned: false, isDead: false, isBot: i!==0, hasPills: false, hasMedkit: i===0
  }));
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

  setFinaleState: (finaleState, finaleTimer) => set({ finaleState, finaleTimer: finaleTimer ?? get().finaleTimer }),
  updateSurvivor: (id, fn) => set({ survivors: get().survivors.map(s => s.id===id ? fn({...s}) : s)}),
  addInfected: (inf) => set({ infected: [...get().infected, inf]}),
  setDirectorIntensity: (directorIntensity) => set({ directorIntensity: Math.max(0, Math.min(100, directorIntensity))}),
  setHorde: (hordeActive, hordeTimer) => set({ hordeActive, hordeTimer: hordeTimer ?? get().hordeTimer}),
  setPanic: (panicLevel) => set({ panicLevel: Math.max(0, Math.min(100, panicLevel))}),
  resetCampaign: (chapter) => set({
    chapter: chapter ?? 1, chapterState: "safeRoom", finaleState: "idle", finaleTimer: 0, rescueVehicleArrived: false,
    survivors: mkSurvivors(), infected: [], hordeActive: false, hordeTimer: 0, directorIntensity: 0, panicLevel: 0, crescendoActive: false, chapterProgress: 0, isGameOver: false, isVictory: false
  }),
  setVictory: (isVictory) => set({ isVictory }),
  setGameOver: (isGameOver) => set({ isGameOver }),
}));
