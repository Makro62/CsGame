import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { levelFromXp, killXp, XP, trainingScoreToXp } from "../game/progress/xp";
import { applyRankResult } from "../game/progress/rank";

const memoryStorage = createJSONStorage(() => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}));

const progressStorage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? createJSONStorage(() => window.localStorage)
    : memoryStorage;

export interface TrainingBests {
  aimBestKills: number;
  recoilBestBurst: number;
}

interface ProgressState {
  totalXp: number;
  level: number;
  kills: number;
  deaths: number;
  headshots: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  rankPoints: number;
  trainingBests: TrainingBests;
  unlockedWeapons: string[];
  unlockedCosmetics: string[];
  recentUnlock: string | null;
  lastLevelUp: number | null;

  addXp: (amount: number) => void;
  recordKill: (opts?: { headshot?: boolean }) => void;
  recordDeath: () => void;
  recordRoundResult: (won: boolean) => void;
  recordMatchResult: (won: boolean) => void;
  recordTrainingScore: (drill: "aim" | "recoil", score: number) => void;
  clearLevelUp: () => void;
  clearRecentUnlock: () => void;
}

function unlockForLevel(level: number, current: string[]): string[] {
  const unlocks: string[] = [];
  if (level >= 3 && !current.includes("ssg") && !unlocks.includes("ssg")) unlocks.push("ssg");
  if (level >= 5 && !current.includes("aug") && !unlocks.includes("aug")) unlocks.push("aug");
  if (level >= 7 && !current.includes("fiveseven") && !unlocks.includes("fiveseven")) unlocks.push("fiveseven");
  return unlocks;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      level: 1,
      kills: 0,
      deaths: 0,
      headshots: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      rankPoints: 0,
      trainingBests: { aimBestKills: 0, recoilBestBurst: 0 },
      unlockedWeapons: [],
      unlockedCosmetics: [],
      recentUnlock: null,
      lastLevelUp: null,

      addXp: (amount) => {
        const safe = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
        if (safe === 0) return;
        const prev = get();
        const totalXp = prev.totalXp + safe;
        const level = levelFromXp(totalXp);
        const gained = unlockForLevel(level, prev.unlockedWeapons);
        const unlockedWeapons = gained.length ? [...prev.unlockedWeapons, ...gained] : prev.unlockedWeapons;
        set({
          totalXp,
          level,
          unlockedWeapons,
          lastLevelUp: level > prev.level ? level : prev.lastLevelUp,
          recentUnlock: gained.length ? gained[gained.length - 1] : prev.recentUnlock,
        });
      },

      recordKill: (opts) => {
        const headshot = !!opts?.headshot;
        const prev = get();
        set({
          kills: prev.kills + 1,
          headshots: prev.headshots + (headshot ? 1 : 0),
        });
        get().addXp(killXp(headshot));
      },

      recordDeath: () => {
        set({ deaths: get().deaths + 1 });
      },

      recordRoundResult: (won) => {
        get().addXp(won ? XP.roundWin : XP.roundLoss);
      },

      recordMatchResult: (won) => {
        const prev = get();
        set({
          wins: prev.wins + (won ? 1 : 0),
          losses: prev.losses + (won ? 0 : 1),
          matchesPlayed: prev.matchesPlayed + 1,
          rankPoints: applyRankResult(prev.rankPoints, won),
        });
        get().addXp(won ? XP.matchWin : XP.matchLoss);
      },

      recordTrainingScore: (drill, score) => {
        const prev = get();
        const bests = { ...prev.trainingBests };
        if (drill === "aim") {
          bests.aimBestKills = Math.max(bests.aimBestKills, score);
        } else {
          bests.recoilBestBurst = Math.max(bests.recoilBestBurst, score);
        }
        set({ trainingBests: bests });
        get().addXp(trainingScoreToXp(score));
      },

      clearLevelUp: () => set({ lastLevelUp: null }),
      clearRecentUnlock: () => set({ recentUnlock: null }),
    }),
    {
      name: "cs-game-progress",
      storage: progressStorage,
      partialize: (state) => ({
        totalXp: state.totalXp,
        level: state.level,
        kills: state.kills,
        deaths: state.deaths,
        headshots: state.headshots,
        wins: state.wins,
        losses: state.losses,
        matchesPlayed: state.matchesPlayed,
        rankPoints: state.rankPoints,
        trainingBests: state.trainingBests,
        unlockedWeapons: state.unlockedWeapons,
        unlockedCosmetics: state.unlockedCosmetics,
      }),
    }
  )
);
