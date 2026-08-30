import { create } from "zustand";
import { ROUND, ECONOMY, BOMB_SITES } from "@cs-game/shared";
import { distToBombSite, nearestBombSite } from "../game/offline/offlineCombat";
import { mkPlayer, assignBombCarrier, resetBotNav } from "../game/offline/BotAI";
import { getWeaponStats, executeLocalBuy } from "../game/offline/EconomySystem";
import { executeLocalShoot } from "../game/offline/CombatSystem";
import { tickRound, endRound as handleEndRound, resetForRound as handleResetRound } from "../game/offline/RoundManager";
import type {
  OfflineGameState,
  LocalPlayer,
  BotDifficultyLevel,
} from "../game/offline/types";

export const useOffline5v5Store = create<OfflineGameState>()((set, get) => ({
  phase: "waiting",
  roundNumber: 1,
  teamRedScore: 0,
  teamBlueScore: 0,
  roundTimeLeft: ROUND.activePhaseDuration,
  buyPhaseTimeLeft: ROUND.buyPhaseDuration,
  roundEndTimer: 0,
  bombPlanted: false,
  bombTimeLeft: 0,
  bombSite: "",
  bombDropped: false,
  bombDropX: 0,
  bombDropZ: 0,
  isHalfTime: false,
  maxRounds: ROUND.maxRounds,
  difficulty: "medium",
  players: new Map(),
  killFeed: [],
  activeReloads: new Map(),

  setDifficulty: (level: BotDifficultyLevel) => {
    set({ difficulty: level });
  },

  clearBotTimers: () => {
    set({ activeReloads: new Map() });
  },

  initMatch: (nickname: string, team: "T" | "CT", difficulty: BotDifficultyLevel = "medium") => {
    get().clearBotTimers();
    const players = new Map<string, LocalPlayer>();
    const local = mkPlayer("local", team, nickname, false, difficulty);
    local.money = ECONOMY.startMoney;
    players.set("local", local);

    const tBots = team === "T" ? 4 : 5;
    const ctBots = team === "CT" ? 4 : 5;
    for (let i = 1; i <= tBots; i++) {
      players.set(`bot_t${i}`, mkPlayer(`bot_t${i}`, "T", `Bot T${i}`, true, difficulty));
    }
    for (let i = 1; i <= ctBots; i++) {
      players.set(`bot_ct${i}`, mkPlayer(`bot_ct${i}`, "CT", `Bot CT${i}`, true, difficulty));
    }

    assignBombCarrier(players);
    resetBotNav();

    set({
      phase: "buy",
      roundNumber: 1,
      teamRedScore: 0,
      teamBlueScore: 0,
      roundTimeLeft: ROUND.activePhaseDuration,
      buyPhaseTimeLeft: ROUND.buyPhaseDuration,
      bombPlanted: false,
      bombTimeLeft: 0,
      bombSite: "",
      bombDropped: false,
      bombDropX: 0,
      bombDropZ: 0,
      isHalfTime: false,
      difficulty,
      players,
      killFeed: [],
      activeReloads: new Map(),
    });
  },

  tick: (dt: number) => {
    tickRound(get(), dt, set, get);
  },

  setLocalPos: (x: number, z: number, rotY: number) => {
    const s = get();
    const p = s.players.get("local");
    if (p) {
      const players = new Map(s.players);
      players.set("local", { ...p, x, z, rotationY: rotY });
      set({ players });
    }
  },

  localShoot: (targetId: string | null, headshot: boolean) => {
    const s = get();
    const result = executeLocalShoot(s.players, s.killFeed, targetId, headshot);
    const updates: Partial<OfflineGameState> = {
      players: result.players,
      killFeed: result.killFeed,
    };
    if (result.bombDropped !== undefined) updates.bombDropped = result.bombDropped;
    if (result.bombDropX !== undefined) updates.bombDropX = result.bombDropX;
    if (result.bombDropZ !== undefined) updates.bombDropZ = result.bombDropZ;

    set(updates);
    if (result.bombDropped || result.didHitEnemy) {
      get().checkRoundEnd();
    }
    return result.didKillEnemy;
  },

  localBuy: (item: string) => {
    const s = get();
    if (s.phase !== "buy") return false;
    const { success, players } = executeLocalBuy(s.players, item);
    if (success) {
      set({ players });
    }
    return success;
  },

  localReload: () => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.isReloading) return;
    const ws = getWeaponStats(me.currentWeapon);
    if (!ws || me.ammo >= ws.mag || me.reserveAmmo <= 0) return;

    const players = new Map(s.players);
    players.set("local", { ...me, isReloading: true });
    set({ players });

    setTimeout(() => {
      const currentMe = get().players.get("local");
      if (!currentMe || currentMe.isDead) return;
      const needed = ws.mag - currentMe.ammo;
      const load = Math.min(needed, currentMe.reserveAmmo);
      const updatedPlayers = new Map(get().players);
      updatedPlayers.set("local", {
        ...currentMe,
        ammo: currentMe.ammo + load,
        reserveAmmo: currentMe.reserveAmmo - load,
        isReloading: false,
      });
      set({ players: updatedPlayers });
    }, ws.reload * 1000);
  },

  localPlantStart: (site: string) => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.team !== "T" || !me.hasBomb || s.bombPlanted) return;

    const resolved = site === "B" || site === "A" ? site : nearestBombSite(me);
    const sitePos = BOMB_SITES[resolved];
    if (distToBombSite(me, resolved) > sitePos.radius) return;

    const players = new Map(s.players);
    players.set("local", { ...me, isPlanting: true, plantProgress: 0, plantSite: resolved });
    set({ players });
  },

  localPlantCancel: () => {
    const s = get();
    const me = s.players.get("local");
    if (me) {
      const players = new Map(s.players);
      players.set("local", { ...me, isPlanting: false, plantProgress: 0 });
      set({ players });
    }
  },

  localDefuseStart: () => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.team !== "CT" || !s.bombPlanted) return;

    let bombX = s.bombDropX;
    let bombZ = s.bombDropZ;
    if (s.bombPlanted && s.bombSite) {
      const sitePos = BOMB_SITES[s.bombSite as keyof typeof BOMB_SITES];
      if (sitePos) {
        bombX = sitePos.x;
        bombZ = sitePos.z;
      }
    }

    const distToBomb = Math.hypot(me.x - bombX, me.z - bombZ);
    const radius = BOMB_SITES[s.bombSite as "A" | "B"]?.radius ?? 6;
    if (distToBomb > radius) return;

    const players = new Map(s.players);
    players.set("local", { ...me, isDefusing: true, defuseProgress: 0 });
    set({ players });
  },

  localDefuseCancel: () => {
    const s = get();
    const me = s.players.get("local");
    if (me) {
      const players = new Map(s.players);
      players.set("local", { ...me, isDefusing: false, defuseProgress: 0 });
      set({ players });
    }
  },

  localSwitchWeapon: (slot: number) => {
    const s = get();
    const me = s.players.get("local");
    if (!me) return;

    let newCurrent = me.currentWeapon;
    if (slot === 1 && me.primaryWeapon) newCurrent = me.primaryWeapon;
    else if (slot === 2 && me.secondaryWeapon) newCurrent = me.secondaryWeapon;
    else if (slot === 3 && me.knifeSlot) newCurrent = me.knifeSlot;

    const players = new Map(s.players);
    players.set("local", { ...me, currentWeapon: newCurrent, isReloading: false });
    set({ players });
  },

  checkRoundEnd: () => {
    const s = get();
    if (s.phase !== "active") return;
    let aliveT = 0;
    let aliveCT = 0;
    s.players.forEach((p) => {
      if (!p.isDead) {
        if (p.team === "T") aliveT++;
        else aliveCT++;
      }
    });
    if (aliveT === 0 && !s.bombPlanted) {
      get().endRound("CT");
      return;
    }
    if (aliveCT === 0) {
      get().endRound("T");
      return;
    }
  },

  endRound: (winner: "T" | "CT") => {
    handleEndRound(winner, get(), set);
  },

  resetForRound: () => {
    handleResetRound(get(), set);
  },
}));
