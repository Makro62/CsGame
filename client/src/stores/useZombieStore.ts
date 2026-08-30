import { create } from "zustand";

export type ZombieType = "walker"|"runner"|"tank"|"spitter"|"exploder"|"boss";
type WaveState = "buy_phase"|"wave_active"|"wave_clear"|"game_over";
export type PowerUpType = "max_ammo"|"insta_kill"|"double_points"|"nuke"|"speed_cola"|"juggernog";
export type LootKind = "health"|"ammo"|"armor"|"weapon";

export interface LootDrop {
  id: string; kind: LootKind; x: number; z: number;
  weapon?: string; spawnTime: number;
}

export interface ZombieState {
  id: string; type: ZombieType; x: number; y: number; z: number;
  rotationY: number; hp: number; maxHp: number; speed: number; damage: number;
  isDead: boolean; isAttacking: boolean; attackCooldown: number; animTime: number;
}

interface PowerUpState {
  id: string; type: PowerUpType; x: number; z: number;
  spawnTime: number; duration: number;
}

interface PlayerState {
  hp: number; maxHp: number; armor: number; points: number;
  isDowned: boolean; downedTimer: number; reviveProgress: number;
  activePowerUps: Map<PowerUpType, number>;
  weaponTiers: Record<string, number>;
  perks: string[];
}

interface ZombieGameState {
  currentWave: number; waveState: WaveState;
  zombiesRemaining: number; totalZombiesInWave: number; interWaveTimer: number;
  purchasedWeapons: string[];
  powerUps: PowerUpState[];
  loot: LootDrop[];
  player: PlayerState;

  setWaveState: (s: WaveState) => void;
  setCurrentWave: (w: number) => void;
  setZombiesRemaining: (n: number) => void;
  setInterWaveTimer: (n: number) => void;
  addPurchasedWeapon: (weapon: string) => void;
  addPowerUp: (p: PowerUpState) => void; removePowerUp: (id: string) => void;
  addLoot: (p: LootDrop) => void; removeLoot: (id: string) => void;
  setPlayer: (fn: (p: PlayerState) => PlayerState) => void;
  addPoints: (n: number) => void;
  upgradeWeaponTier: (weapon: string, cost: number) => boolean;
  addPerk: (perk: string, cost: number) => boolean;
  resetGame: (full?: boolean) => void;
}

const INITIAL_PLAYER: PlayerState = {
  hp: 100, maxHp: 100, armor: 0, points: 800,
  isDowned: false, downedTimer: 0, reviveProgress: 0,
  activePowerUps: new Map(),
  weaponTiers: {},
  perks: [],
};

const INITIAL_STATE = {
  currentWave: 0, waveState: "buy_phase" as WaveState,
  zombiesRemaining: 0, totalZombiesInWave: 0, interWaveTimer: 8,
  purchasedWeapons: ["mp5", "glock", "knife"] as string[],
  powerUps: [] as PowerUpState[],
  loot: [] as LootDrop[],
};

export const useZombieStore = create<ZombieGameState>((set, get) => ({
  ...INITIAL_STATE,
  player: INITIAL_PLAYER,

  setWaveState: (waveState) => set({ waveState }),
  setCurrentWave: (currentWave) => set({ currentWave }),
  setZombiesRemaining: (zombiesRemaining) => set({ zombiesRemaining }),
  setInterWaveTimer: (interWaveTimer) => set({ interWaveTimer }),
  addPurchasedWeapon: (weapon) => {
    const list = get().purchasedWeapons;
    if (!list.includes(weapon)) {
      set({ purchasedWeapons: [...list, weapon] });
    }
  },
  addPowerUp: (p) => set({ powerUps: [...get().powerUps, p] }),
  removePowerUp: (id) => set({ powerUps: get().powerUps.filter(p => p.id !== id) }),
  addLoot: (p) => set({ loot: [...get().loot, p] }),
  removeLoot: (id) => set({ loot: get().loot.filter(p => p.id !== id) }),
  setPlayer: (fn) => set((s) => ({ player: fn({...s.player}) })),
  addPoints: (amount) => {
    const double = amount > 0 && get().player.activePowerUps.has("double_points");
    const pts = double ? amount * 2 : amount;
    set(s => ({ player: { ...s.player, points: s.player.points + pts } }));
  },
  upgradeWeaponTier: (weapon, cost) => {
    const currentPoints = get().player.points;
    if (currentPoints < cost) return false;
    const currentTier = get().player.weaponTiers[weapon] ?? 0;
    if (currentTier >= 3) return false;
    set(s => ({
      player: {
        ...s.player,
        points: s.player.points - cost,
        weaponTiers: {
          ...s.player.weaponTiers,
          [weapon]: currentTier + 1,
        },
      },
    }));
    return true;
  },
  addPerk: (perk, cost) => {
    const currentPoints = get().player.points;
    if (currentPoints < cost) return false;
    if (get().player.perks.includes(perk)) return false;
    set(s => ({
      player: {
        ...s.player,
        points: s.player.points - cost,
        perks: [...s.player.perks, perk],
      },
    }));
    return true;
  },
  resetGame: (full) => set({
    ...INITIAL_STATE,
    player: { ...INITIAL_PLAYER, activePowerUps: new Map() },
    ...(full ? {} : { currentWave: get().currentWave }),
  }),
}));
