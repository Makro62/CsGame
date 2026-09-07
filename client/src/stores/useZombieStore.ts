import { WAVE_CONFIG, ZOMBIE_STARTING_POINTS } from "@cs-game/shared";
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
  soloRevivesLeft: number;
  activePowerUps: Map<PowerUpType, number>;
  weaponTiers: Record<string, number>;
  perks: string[];
}

export interface StagePerkOption {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rarity: "rare" | "epic" | "legendary";
}

interface ZombieGameState {
  currentWave: number; waveState: WaveState;
  zombiesRemaining: number; totalZombiesInWave: number; interWaveTimer: number;
  purchasedWeapons: string[];
  powerUps: PowerUpState[];
  loot: LootDrop[];
  player: PlayerState;
  // Operation Blackout: Room & Doors
  unlockedDoors: string[];
  barricades: Record<string, number>; // windowId -> plank count 0..6

  // Survivor Campaign Stage System
  currentStage: number;
  unlockedStages: number;
  stageBreakActive: boolean;
  stageBreakTimer: number;
  gate1Open: boolean;
  gate2Open: boolean;
  stagePerks: string[];
  stageBanner: string | null;
  cameraPerspective: "arcade" | "fps";

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
  unlockDoor: (doorId: string, cost: number) => boolean;
  repairBarricade: (windowId: string) => boolean;
  damageBarricade: (windowId: string, amount?: number) => void;
  resetGame: (full?: boolean) => void;
  toggleCameraPerspective: () => void;

  // Stage Campaign Actions
  startStageBreak: (stage: number) => void;
  advanceToNextStage: () => void;
  skipBreak: () => void;
  claimStagePerk: (perkId: string) => void;
  setStageBreakTimer: (n: number) => void;
  setGate1Open: (open: boolean) => void;
  setGate2Open: (open: boolean) => void;
  setStageBanner: (b: string | null) => void;
}

const INITIAL_PLAYER: PlayerState = {
  hp: 100, maxHp: 100, armor: 0, points: ZOMBIE_STARTING_POINTS,
  isDowned: false, downedTimer: 0, reviveProgress: 0, soloRevivesLeft: 1,
  activePowerUps: new Map(),
  weaponTiers: {},
  perks: [],
};

const INITIAL_STATE = {
  currentWave: 0, waveState: "buy_phase" as WaveState,
  zombiesRemaining: 0, totalZombiesInWave: 0, interWaveTimer: WAVE_CONFIG.firstWaveDelay,
  purchasedWeapons: ["mp5", "glock", "knife"] as string[],
  powerUps: [] as PowerUpState[],
  loot: [] as LootDrop[],
  unlockedDoors: ["door_lab", "door_armory", "door_catwalk", "door_bunker"] as string[],
  barricades: { win_north: 6, win_south: 6, win_east: 6, win_west: 6 } as Record<string, number>,
  // Survivor Campaign Initial State
  currentStage: 1,
  unlockedStages: 1,
  stageBreakActive: false,
  stageBreakTimer: 0,
  gate1Open: false,
  gate2Open: false,
  stagePerks: [] as string[],
  stageBanner: null as string | null,
  cameraPerspective: "arcade" as "arcade" | "fps",
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
  setPlayer: (fn) => set((s) => {
    const prev = s.player;
    const next = fn({ ...prev, activePowerUps: new Map(prev.activePowerUps), weaponTiers: { ...prev.weaponTiers }, perks: [...prev.perks] });
    // Ensure Map/Object refs are fresh even if fn mutated the clone
    if (next.activePowerUps === prev.activePowerUps) next.activePowerUps = new Map(next.activePowerUps);
    if (next.weaponTiers === prev.weaponTiers) next.weaponTiers = { ...next.weaponTiers };
    return { player: next };
  }),
  addPoints: (amount) => {
    if (!Number.isFinite(amount)) return;
    const double = amount > 0 && get().player.activePowerUps.has("double_points");
    const pts = double ? amount * 2 : amount;
    set(s => ({ player: { ...s.player, points: s.player.points + pts } }));
  },
  upgradeWeaponTier: (weapon, cost) => {
    if (!Number.isFinite(cost) || cost < 0) return false;
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
    if (!Number.isFinite(cost) || cost < 0) return false;
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
  unlockDoor: (doorId, cost) => {
    if (get().unlockedDoors.includes(doorId)) return false;
    if (!Number.isFinite(cost) || cost < 0) return false;
    if (get().player.points < cost) return false;
    set(s => ({
      unlockedDoors: [...s.unlockedDoors, doorId],
      player: { ...s.player, points: s.player.points - cost },
    }));
    return true;
  },
  repairBarricade: (windowId) => {
    const cur = get().barricades[windowId] ?? 0;
    if (cur >= 6) return false;
    if (get().player.isDowned) return false;
    set(s => ({
      barricades: { ...s.barricades, [windowId]: Math.min(6, cur + 1) },
      player: { ...s.player, points: s.player.points + 10 },
    }));
    return true;
  },
  damageBarricade: (windowId, amount = 1) => {
    const cur = get().barricades[windowId] ?? 0;
    if (cur <= 0) return;
    set(s => ({ barricades: { ...s.barricades, [windowId]: Math.max(0, cur - amount) } }));
  },
  startStageBreak: (stage) => {
    const nextStage = stage + 1;
    const banner = stage === 1
      ? "STAGE 1 BERSIH! JEDA SURVIVOR • GERBANG MENUJU SEKTOR 2 TERBUKA!"
      : "STAGE 2 BERSIH! JEDA SURVIVOR • GERBANG HELIPAD SEKTOR 3 TERBUKA!";
    set((s) => ({
      stageBreakActive: true,
      stageBreakTimer: 15,
      stageBanner: banner,
      gate1Open: stage >= 1 ? true : s.gate1Open,
      gate2Open: stage >= 2 ? true : s.gate2Open,
      unlockedStages: Math.max(s.unlockedStages, nextStage),
      player: {
        ...s.player,
        hp: s.player.maxHp,
        armor: Math.min(100, s.player.armor + 30),
      },
    }));
  },
  advanceToNextStage: () => {
    const st = get();
    const next = Math.min(3, st.currentStage + 1);
    set({
      stageBreakActive: false,
      stageBreakTimer: 0,
      currentStage: next,
      unlockedStages: Math.max(st.unlockedStages, next),
      gate1Open: true,
      gate2Open: next >= 3 ? true : st.gate2Open,
      stageBanner: null,
    });
  },
  skipBreak: () => {
    get().advanceToNextStage();
  },
  claimStagePerk: (perkId) => {
    const st = get();
    if (st.stagePerks.includes(perkId)) return;
    set({ stagePerks: [...st.stagePerks, perkId] });
    if (perkId === "titan_armor") {
      set(s => ({ player: { ...s.player, armor: 100, hp: s.player.maxHp } }));
    }
  },
  setStageBreakTimer: (n) => set({ stageBreakTimer: Math.max(0, n) }),
  setGate1Open: (gate1Open) => set({ gate1Open }),
  setGate2Open: (gate2Open) => set({ gate2Open }),
  setStageBanner: (stageBanner) => set({ stageBanner }),
  toggleCameraPerspective: () => set(s => ({
    cameraPerspective: s.cameraPerspective === "arcade" ? "fps" : "arcade",
  })),
  resetGame: (full) => set({
    ...INITIAL_STATE,
    player: { ...INITIAL_PLAYER, activePowerUps: new Map() },
    ...(full ? {} : { currentWave: get().currentWave }),
  }),
}));
