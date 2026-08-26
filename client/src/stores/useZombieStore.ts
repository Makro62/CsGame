import { create } from "zustand";

export type ZombieType = "walker"|"runner"|"tank"|"spitter"|"exploder"|"boss";
export type WaveState = "waiting"|"buy_phase"|"wave_active"|"wave_clear"|"game_over"|"extraction";
export type PowerUpType = "max_ammo"|"insta_kill"|"double_points"|"nuke"|"speed_cola"|"juggernog";

export interface ZombieState {
  id: string; type: ZombieType; x: number; y: number; z: number;
  rotationY: number; hp: number; maxHp: number; speed: number; damage: number;
  isDead: boolean; isAttacking: boolean; attackCooldown: number; animTime: number;
}

export interface PowerUpState {
  id: string; type: PowerUpType; x: number; z: number;
  spawnTime: number; duration: number;
}

export interface BarricadeState {
  id: string; x: number; z: number; health: number; maxHealth: number;
  planks: number; maxPlanks: number;
}

export interface PlayerState {
  hp: number; maxHp: number; armor: number; points: number;
  isDowned: boolean; downedTimer: number; reviveProgress: number;
  activePowerUps: Map<PowerUpType, number>;
}

interface ZombieGameState {
  currentWave: number; waveState: WaveState;
  zombiesRemaining: number; totalZombiesInWave: number; interWaveTimer: number;
  powerUps: PowerUpState[]; barricades: BarricadeState[];
  player: PlayerState;
  extractionActive: boolean; extractionTimer: number; extractionAvailable: boolean;
  evacSuccess: boolean;

  setWaveState: (s: WaveState) => void;
  setCurrentWave: (w: number) => void;
  setZombiesRemaining: (n: number) => void;
  setInterWaveTimer: (n: number) => void;
  addPowerUp: (p: PowerUpState) => void; removePowerUp: (id: string) => void;
  setBarricades: (b: BarricadeState[]) => void;
  updateBarricade: (id: string, fn: (b: BarricadeState) => BarricadeState) => void;
  setPlayer: (fn: (p: PlayerState) => PlayerState) => void;
  addPoints: (n: number) => void;
  setExtractionState: (active: boolean, timer: number, available: boolean) => void;
  /** Reset to initial state. Pass true to also clear wave progress. */
  resetGame: (full?: boolean) => void;
}

const INITIAL_PLAYER: PlayerState = {
  hp: 100, maxHp: 100, armor: 0, points: 500,
  isDowned: false, downedTimer: 0, reviveProgress: 0,
  activePowerUps: new Map(),
};

const INITIAL_STATE = {
  currentWave: 0, waveState: "waiting" as WaveState,
  zombiesRemaining: 0, totalZombiesInWave: 0, interWaveTimer: 0,
  powerUps: [] as PowerUpState[], barricades: [] as BarricadeState[],
  extractionActive: false, extractionTimer: 0, extractionAvailable: false, evacSuccess: false,
};

export const useZombieStore = create<ZombieGameState>((set, get) => ({
  ...INITIAL_STATE,
  player: INITIAL_PLAYER,

  setWaveState: (waveState) => set({ waveState }),
  setCurrentWave: (currentWave) => set({ currentWave }),
  setZombiesRemaining: (zombiesRemaining) => set({ zombiesRemaining }),
  setInterWaveTimer: (interWaveTimer) => set({ interWaveTimer }),
  setBarricades: (barricades) => set({ barricades }),
  addPowerUp: (p) => set({ powerUps: [...get().powerUps, p] }),
  removePowerUp: (id) => set({ powerUps: get().powerUps.filter(p => p.id !== id) }),
  updateBarricade: (id, fn) => set({ barricades: get().barricades.map(b => b.id === id ? fn({...b}) : b) }),
  setPlayer: (fn) => set((s) => ({ player: fn({...s.player}) })),
  addPoints: (amount) => {
    const double = get().player.activePowerUps.has("double_points");
    const pts = double ? amount * 2 : amount;
    set(s => ({ player: { ...s.player, points: s.player.points + pts } }));
  },
  setExtractionState: (active, timer, available) => set({ extractionActive: active, extractionTimer: timer, extractionAvailable: available }),
  resetGame: (full) => set({
    ...INITIAL_STATE,
    player: { ...INITIAL_PLAYER, activePowerUps: new Map() },
    ...(full ? {} : { currentWave: get().currentWave }),
  }),
}));
