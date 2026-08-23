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
  zombies: ZombieState[]; powerUps: PowerUpState[]; barricades: BarricadeState[];
  player: PlayerState;
  extractionActive: boolean; extractionTimer: number; extractionAvailable: boolean;

  // legacy compat for old docs/components expecting these
  points: number;
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;

  setWaveState: (s: WaveState) => void;
  setCurrentWave: (w: number) => void;
  setZombies: (z: ZombieState[]) => void;
  setZombiesRemaining: (n: number) => void;
  setInterWaveTimer: (n: number) => void;
  updateZombie: (id: string, fn: (z: ZombieState) => ZombieState) => void;
  removeZombie: (id: string) => void;
  addPowerUp: (p: PowerUpState) => void; removePowerUp: (id: string) => void;
  setPowerUps: (p: PowerUpState[]) => void;
  setBarricades: (b: BarricadeState[]) => void;
  updateBarricade: (id: string, fn: (b: BarricadeState) => BarricadeState) => void;
  setPlayer: (fn: (p: PlayerState) => PlayerState) => void;
  setPoints: (n: number) => void;
  addPoints: (n: number) => void;
  setActivePowerUp: (type: PowerUpType | null, timer: number) => void;
  setExtractionState: (active: boolean, timer: number, available: boolean) => void;
  setDownedState: (isDowned: boolean, timer: number) => void;
  setHealProgress: (p: number) => void;
  setReviveProgress: (p: number, name?: string) => void;
  resetGame: () => void;
  resetMatch: () => void;
}

const INITIAL_PLAYER: PlayerState = {
  hp: 100, maxHp: 100, armor: 0, points: 500,
  isDowned: false, downedTimer: 0, reviveProgress: 0,
  activePowerUps: new Map(),
};

export const useZombieStore = create<ZombieGameState>((set, get) => ({
  currentWave: 0, waveState: "waiting", zombiesRemaining: 0, totalZombiesInWave: 0,
  interWaveTimer: 0, zombies: [], powerUps: [], barricades: [],
  player: INITIAL_PLAYER, extractionActive: false, extractionTimer: 0, extractionAvailable: false,
  points: 500, activePowerUp: null, powerUpTimer: 0,

  setWaveState: (waveState) => set({ waveState }),
  setCurrentWave: (currentWave) => set({ currentWave }),
  setZombies: (zombies) => set({ zombies }),
  setZombiesRemaining: (zombiesRemaining) => set({ zombiesRemaining }),
  setInterWaveTimer: (interWaveTimer) => set({ interWaveTimer }),
  setPowerUps: (powerUps) => set({ powerUps }),
  setBarricades: (barricades) => set({ barricades }),
  updateZombie: (id, fn) => set({ zombies: get().zombies.map(z => z.id === id ? fn({...z}) : z) }),
  removeZombie: (id) => set({ zombies: get().zombies.filter(z => z.id !== id) }),
  addPowerUp: (p) => set({ powerUps: [...get().powerUps, p] }),
  removePowerUp: (id) => set({ powerUps: get().powerUps.filter(p => p.id !== id) }),
  updateBarricade: (id, fn) => set({ barricades: get().barricades.map(b => b.id === id ? fn({...b}) : b) }),
  setPlayer: (fn) => set((s) => {
    const newPlayer = fn({...s.player});
    return { player: newPlayer, points: newPlayer.points };
  }),
  setPoints: (points) => set((s) => ({ points, player: { ...s.player, points } })),
  addPoints: (amount) => {
    const double = get().player.activePowerUps.has("double_points");
    const pts = double ? amount*2 : amount;
    set(s => ({ 
      points: s.points + pts,
      player: {...s.player, points: s.player.points + pts}
    }));
  },
  setActivePowerUp: (type, timer) => set({ activePowerUp: type, powerUpTimer: timer }),
  setExtractionState: (active, timer, available) => set({ extractionActive: active, extractionTimer: timer, extractionAvailable: available }),
  setDownedState: (isDowned, downedTimer) => set((s) => ({ player: { ...s.player, isDowned, downedTimer } })),
  setHealProgress: () => {},
  setReviveProgress: (reviveProgress) => set((s) => ({ player: { ...s.player, reviveProgress } })),
  resetGame: () => set({ currentWave:0, waveState:"waiting", zombies:[], powerUps:[], barricades:[], player: {...INITIAL_PLAYER, activePowerUps: new Map()}, extractionActive:false, extractionAvailable:false, points: 500, activePowerUp: null, powerUpTimer: 0 }),
  resetMatch: () => set({ currentWave:0, waveState:"waiting", zombies:[], powerUps:[], barricades:[], player: {...INITIAL_PLAYER, activePowerUps: new Map()}, extractionActive:false, extractionAvailable:false, points: 500, activePowerUp: null, powerUpTimer: 0, zombiesRemaining: 0, totalZombiesInWave: 0, interWaveTimer: 0 }),
}));
