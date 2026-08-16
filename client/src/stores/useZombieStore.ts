import { create } from "zustand";
import { WaveState, ZombieState, PowerUpState, PowerUpType, BarricadeState } from "@cs-game/shared";

interface ZombieStore {
  // Wave state
  currentWave: number;
  waveState: WaveState;
  zombiesRemaining: number;
  interWaveTimer: number;

  // Points
  points: number;

  // Zombies (render state from server)
  zombies: ZombieState[];

  // Power-ups
  powerUps: PowerUpState[];
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;

  // Barricades
  barricades: BarricadeState[];

  // Downed & Revive
  isDowned: boolean;
  downedTimer: number;
  reviveProgress: number;
  reviveTargetName: string;

  // Extraction
  extractionActive: boolean;
  extractionTimer: number;
  extractionAvailable: boolean;
  evacSuccess: boolean;

  // Map progression
  unlockedAreas: string[];

  // Actions
  setCurrentWave: (wave: number) => void;
  setWaveState: (state: WaveState) => void;
  setZombiesRemaining: (count: number) => void;
  setInterWaveTimer: (time: number) => void;
  setPoints: (points: number) => void;
  setZombies: (zombies: ZombieState[]) => void;
  setPowerUps: (powerUps: PowerUpState[]) => void;
  setBarricades: (barricades: BarricadeState[]) => void;
  setActivePowerUp: (type: PowerUpType | null, timer: number) => void;
  setDownedState: (isDowned: boolean, downedTimer: number) => void;
  setReviveProgress: (progress: number, targetName?: string) => void;
  setExtractionState: (active: boolean, timer: number, available: boolean, evacSuccess?: boolean) => void;
  setUnlockedAreas: (areas: string[]) => void;
  addPoints: (amount: number) => void;
}

export const useZombieStore = create<ZombieStore>((set) => ({
  currentWave: 0,
  waveState: "waiting",
  zombiesRemaining: 0,
  interWaveTimer: 0,
  points: 0,
  zombies: [],
  powerUps: [],
  barricades: [],
  activePowerUp: null,
  powerUpTimer: 0,

  isDowned: false,
  downedTimer: 0,
  reviveProgress: 0,
  reviveTargetName: "",

  extractionActive: false,
  extractionTimer: 0,
  extractionAvailable: false,
  evacSuccess: false,

  unlockedAreas: ["spawn"],

  setCurrentWave: (wave) => set({ currentWave: wave }),
  setWaveState: (state) => set({ waveState: state }),
  setZombiesRemaining: (count) => set({ zombiesRemaining: count }),
  setInterWaveTimer: (time) => set({ interWaveTimer: time }),
  setPoints: (points) => set({ points }),
  setZombies: (zombies) => set({ zombies }),
  setPowerUps: (powerUps) => set({ powerUps }),
  setBarricades: (barricades) => set({ barricades }),
  setActivePowerUp: (type, timer) => set({ activePowerUp: type, powerUpTimer: timer }),
  setDownedState: (isDowned, downedTimer) => set({ isDowned, downedTimer }),
  setReviveProgress: (reviveProgress, reviveTargetName = "") => set({ reviveProgress, reviveTargetName }),
  setExtractionState: (extractionActive, extractionTimer, extractionAvailable, evacSuccess = false) =>
    set({ extractionActive, extractionTimer, extractionAvailable, evacSuccess }),
  setUnlockedAreas: (areas) => set({ unlockedAreas: areas }),
  addPoints: (amount) => set((s) => ({ points: s.points + amount })),
}));
