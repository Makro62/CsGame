// Stub offline — original network store removed for full offline mode.
// This file exists only for backwards compatibility so legacy HUD imports don't break.
// All multiplayer logic has been moved to Offline5v5Store (screens/Offline5v5Store.ts).
import { create } from "zustand";

interface StubNetworkState {
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoomById: () => Promise<void>;
  sendInput: () => void;
  sendShoot: () => void;
  sendReload: () => void;
  sendBuy: () => void;
  sendReady: () => void;
  sendPlantStart: () => void;
  sendPlantCancel: () => void;
  sendDefuseStart: () => void;
  sendDefuseCancel: () => void;
  sendPickupBomb: () => void;
  sendSwitchWeapon: () => void;
  sendMelee: () => void;
  sendThrowGrenade: (payload?: unknown) => void;
  sendFFVote: () => void;
  sendGameMode: () => void;
  sendVoteRequest: () => void;
  sendVote: () => void;
  sendChat: () => void;
  addKillEvent: () => void;
  showHitMarker: () => void;
  measurePing: () => void;
  // compat fields used by HUDs
  round: { phase: string; buyPhaseTimeLeft: number; roundTimeLeft: number; roundNumber: number; teamRedScore: number; teamBlueScore: number; bombPlanted: boolean; bombTimeLeft: number; bombSite: string; isHalfTime: boolean; isOvertime: boolean; isSuddenDeath: boolean; readyCount: number; maxRounds: number; gameMode: string; kothCapturingTeam: string; kothCaptureProgress: number; kothScoreT: number; kothScoreCT: number };
  remotePlayers: Map<string, unknown>;
  playerScores: Map<string, unknown>;
  smokes: unknown[];
  localHp: number; localIsDead: boolean; localMoney: number; localTeam: string; localWeapon: string; localAmmo: number; localReserveAmmo: number; localArmor: number; localKills: number; localDeaths: number;
  ping: number; latency: number;
  killFeed: unknown[];
  hitMarker: unknown; chatMessages: unknown[]; reconnecting: boolean; connectionError: unknown; voteRequest: unknown;
}

export const useNetworkStore = create<StubNetworkState>(() => ({
  connected: false,
  connect: async () => {},
  disconnect: () => {},
  joinRoomById: async () => {},
  sendInput: () => {},
  sendShoot: () => {},
  sendReload: () => {},
  sendBuy: () => {},
  sendReady: () => {},
  sendPlantStart: () => {},
  sendPlantCancel: () => {},
  sendDefuseStart: () => {},
  sendDefuseCancel: () => {},
  sendPickupBomb: () => {},
  sendSwitchWeapon: () => {},
  sendMelee: () => {},
  sendThrowGrenade: () => {},
  sendFFVote: () => {},
  sendGameMode: () => {},
  sendVoteRequest: () => {},
  sendVote: () => {},
  sendChat: () => {},
  addKillEvent: () => {},
  showHitMarker: () => {},
  measurePing: () => {},
  round: { phase: "waiting", buyPhaseTimeLeft: 0, roundTimeLeft: 0, roundNumber: 1, teamRedScore: 0, teamBlueScore: 0, bombPlanted: false, bombTimeLeft: 0, bombSite: "", isHalfTime: false, isOvertime: false, isSuddenDeath: false, readyCount: 0, maxRounds: 15, gameMode: "bomb_defusal", kothCapturingTeam: "", kothCaptureProgress: 0, kothScoreT: 0, kothScoreCT: 0 },
  remotePlayers: new Map(),
  playerScores: new Map(),
  smokes: [],
  localHp: 100, localIsDead: false, localMoney: 800, localTeam: "", localWeapon: "", localAmmo: 0, localReserveAmmo: 0, localArmor: 0, localKills: 0, localDeaths: 0,
  ping: 0, latency: 0,
  killFeed: [],
  hitMarker: null, chatMessages: [], reconnecting: false, connectionError: null, voteRequest: null,
}));
