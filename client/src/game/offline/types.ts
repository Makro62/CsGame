import type { BotLane, BotRole } from "./offlineCombat";

export type BotTacticalState =
  | "idle"
  | "patrol"
  | "hold"
  | "peek"
  | "engage"
  | "retreat"
  | "plant"
  | "defuse";

export type RoundPhase = "waiting" | "buy" | "active" | "roundEnd" | "matchEnd";

export type BotDifficultyLevel = "easy" | "medium" | "hard" | "expert";

export interface BotDifficultyConfig {
  accuracy: number;
  hsRate: number;
  reactionTime: number;
  speed: number;
  viewDist: number;
  fov?: number;
}

export interface LocalPlayer {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  hp: number;
  isDead: boolean;
  team: "T" | "CT";
  nickname: string;
  money: number;
  kills: number;
  deaths: number;
  currentWeapon: string;
  primaryWeapon: string;
  secondaryWeapon: string;
  knifeSlot: string;
  ammo: number;
  reserveAmmo: number;
  armor: number;
  hasHelmet: boolean;
  hasDefuseKit: boolean;
  grenadeHE: number;
  grenadeSmoke: number;
  grenadeFlash: number;
  hasBomb: boolean;
  isBot: boolean;
  isReloading: boolean;
  isPlanting: boolean;
  isDefusing: boolean;
  plantProgress: number;
  defuseProgress: number;
  botTargetId: string | null;
  botState: BotTacticalState;
  botLastShootTime: number;
  botStrafeDir: number;
  botStrafeTimer: number;
  botStrafeDuration: number;
  botAmmoInMag: number;
  botAccuracy: number;
  botHsRate: number;
  botSpeed: number;
  botViewDist: number;
  plantSite: string;
  botLane: BotLane;
  botRole: BotRole;
  botWp: number;
}

export interface KillEvent {
  killerName: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

export interface BombState {
  bombPlanted: boolean;
  bombTimeLeft: number;
  bombSite: string;
  bombDropped: boolean;
  bombDropX: number;
  bombDropZ: number;
}

export interface BombPatch {
  bombPlanted?: boolean;
  bombTimeLeft?: number;
  bombSite?: string;
  bombDropped?: boolean;
  bombDropX?: number;
  bombDropZ?: number;
}

export interface BotReloadState {
  botId: string;
  progress: number;
  duration: number;
}

export interface OfflineGameState {
  phase: RoundPhase;
  roundNumber: number;
  teamRedScore: number;
  teamBlueScore: number;
  roundTimeLeft: number;
  buyPhaseTimeLeft: number;
  roundEndTimer: number;
  bombPlanted: boolean;
  bombTimeLeft: number;
  bombSite: string;
  bombDropped: boolean;
  bombDropX: number;
  bombDropZ: number;
  isHalfTime: boolean;
  maxRounds: number;
  difficulty: BotDifficultyLevel;
  players: Map<string, LocalPlayer>;
  killFeed: KillEvent[];
  activeReloads: Map<string, BotReloadState>;

  setDifficulty: (level: BotDifficultyLevel) => void;
  initMatch: (nickname: string, team: "T" | "CT", difficulty?: BotDifficultyLevel) => void;
  tick: (dt: number) => void;
  setLocalPos: (x: number, z: number, rotY: number) => void;
  localShoot: (targetId: string | null, headshot: boolean) => boolean;
  localBuy: (item: string) => boolean;
  localReload: () => void;
  localPlantStart: (site: string) => void;
  localPlantCancel: () => void;
  localDefuseStart: () => void;
  localDefuseCancel: () => void;
  localSwitchWeapon: (slot: number) => void;
  checkRoundEnd: () => void;
  endRound: (winner: "T" | "CT") => void;
  resetForRound: () => void;
  clearBotTimers: () => void;
}
