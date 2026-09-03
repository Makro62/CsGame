import { ROUND, ECONOMY } from "@cs-game/shared";
import { sanitizeTickDt } from "../../lib/numericGuards";
import { botPath, laneForRole, resolveTeamSpawn, roleForBotId, stepToward } from "./offlineCombat";
import { botBuy, botThink, defaultLoadout, refillAmmo, assignBombCarrier, resetBotNav } from "./BotAI";
import { spawnJitter } from "./botNav";
import { getWeaponStats } from "./EconomySystem";
import type {
  LocalPlayer,
  OfflineGameState,
  BombState,
} from "./types";

export function tickRound(
  state: OfflineGameState,
  dt: number,
  set: (partial: Partial<OfflineGameState>) => void,
  get: () => OfflineGameState
) {
  dt = sanitizeTickDt(dt);
  // ── Buy phase ──
  if (state.phase === "buy") {
    const t = state.buyPhaseTimeLeft - dt;
    const players = new Map(state.players);
    players.forEach((p, id) => {
      if (!p.isBot || p.isDead) return;
      const cloned = { ...p };
      const path = botPath(cloned.botLane, cloned.team);
      const hold = path[0];
      const moved = stepToward(cloned, hold, cloned.botSpeed * 0.55, dt);
      cloned.x = moved.x;
      cloned.z = moved.z;
      cloned.rotationY = Math.atan2(hold.x - cloned.x, hold.z - cloned.z);
      cloned.botState = "hold";
      players.set(id, cloned);
    });

    if (t <= 0) {
      players.forEach((p, id) => {
        if (p.isBot) {
          const cloned = { ...p };
          botBuy(cloned);
          players.set(id, cloned);
        }
      });
      set({
        phase: "active",
        buyPhaseTimeLeft: 0,
        roundTimeLeft: ROUND.activePhaseDuration,
        players,
      });
    } else {
      set({ buyPhaseTimeLeft: t, players });
    }
    return;
  }

  // ── Round end phase ──
  if (state.phase === "roundEnd") {
    const t = state.roundEndTimer - dt;
    if (t <= 0) {
      const next = state.roundNumber + 1;
      const isHalf = !state.isHalfTime && next > Math.floor(ROUND.maxRounds / 2);
      set({ roundNumber: next, isHalfTime: isHalf || state.isHalfTime });
      get().resetForRound();
    } else {
      set({ roundEndTimer: t });
    }
    return;
  }

  if (state.phase !== "active") return;

  const now = Date.now();
  const players = new Map(state.players);
  const activeReloads = new Map(state.activeReloads);

  // ── Apply player plant/defuse progress ──
  players.forEach((p, id) => {
    if (p.isDead && (p.isPlanting || p.isDefusing)) {
      players.set(id, {
        ...p,
        isPlanting: false,
        isDefusing: false,
        plantProgress: 0,
        defuseProgress: 0,
      });
      return;
    }
    if (p.isPlanting) {
      const updated = {
        ...p,
        plantProgress: p.plantProgress + dt / ROUND.plantDuration,
      };
      players.set(id, updated);
    }
    if (p.isDefusing) {
      const duration = p.hasDefuseKit ? ROUND.defuseKitDuration : ROUND.defuseDuration;
      const updated = {
        ...p,
        defuseProgress: p.defuseProgress + dt / duration,
      };
      players.set(id, updated);
    }
  });

  // ── Update active bot reloads (Frame-based P0.4) ──
  activeReloads.forEach((reload, botId) => {
    const bot = players.get(botId);
    if (!bot || bot.isDead) {
      activeReloads.delete(botId);
      return;
    }
    reload.progress += dt / Math.max(reload.duration, 0.1);
    if (reload.progress >= 1) {
      const ws = getWeaponStats(bot.currentWeapon);
      const mag = ws?.mag || 30;
      const load = Math.min(mag - bot.botAmmoInMag, bot.reserveAmmo);
      bot.botAmmoInMag += load;
      bot.reserveAmmo -= load;
      bot.ammo = bot.botAmmoInMag;
      bot.isReloading = false;
      players.set(botId, { ...bot });
      activeReloads.delete(botId);
    }
  });

  // ── Update bots + apply bomb patches ──
  const bombState: BombState = {
    bombDropped: state.bombDropped,
    bombDropX: state.bombDropX,
    bombDropZ: state.bombDropZ,
    bombPlanted: state.bombPlanted,
    bombTimeLeft: state.bombTimeLeft,
    bombSite: state.bombSite,
  };

  const queueReload = (botId: string, duration: number) => {
    activeReloads.set(botId, {
      botId,
      progress: 0,
      duration,
    });
  };

  players.forEach((p, id) => {
    if (p.isBot && !p.isDead) {
      const botClone = { ...p };
      const result = botThink(botClone, players, dt, now, bombState, queueReload);
      players.set(id, botClone);
      if (result) {
        if (result.bombPlanted !== undefined) bombState.bombPlanted = result.bombPlanted;
        if (result.bombDropped !== undefined) bombState.bombDropped = result.bombDropped;
        if (result.bombDropX !== undefined) bombState.bombDropX = result.bombDropX;
        if (result.bombDropZ !== undefined) bombState.bombDropZ = result.bombDropZ;
        if (result.bombTimeLeft !== undefined) bombState.bombTimeLeft = result.bombTimeLeft;
        if (result.bombSite !== undefined) bombState.bombSite = result.bombSite;
      }
    }
  });

  // ── Local player pick up dropped bomb ──
  if (bombState.bombDropped) {
    const local = players.get("local");
    if (local && !local.isDead && local.team === "T" && !local.hasBomb) {
      const dx = bombState.bombDropX - local.x;
      const dz = bombState.bombDropZ - local.z;
      if (Math.hypot(dx, dz) < 2) {
        const updated = { ...local, hasBomb: true };
        players.set("local", updated);
        bombState.bombDropped = false;
        bombState.bombDropX = 0;
        bombState.bombDropZ = 0;
      }
    }
  }

  // ── Bomb timer ──
  let bombPlanted = bombState.bombPlanted;
  let bombTimeLeft = bombState.bombTimeLeft;
  let bombSite = bombState.bombSite;
  const bombDropped = bombState.bombDropped;
  const bombDropX = bombState.bombDropX;
  const bombDropZ = bombState.bombDropZ;

  if (bombPlanted) {
    bombTimeLeft -= dt;
    if (bombTimeLeft <= 0) {
      set({
        players,
        activeReloads,
        bombPlanted: false,
        bombTimeLeft: 0,
        bombDropped,
        bombDropX,
        bombDropZ,
      });
      get().endRound("T");
      return;
    }
  }

  // ── Check plant complete ──
  for (const [id, p] of players) {
    if (p.isPlanting && p.plantProgress >= 1 && !bombPlanted) {
      const updated = { ...p, isPlanting: false, plantProgress: 0, hasBomb: false };
      players.set(id, updated);
      bombPlanted = true;
      bombTimeLeft = ROUND.bombTimer;
      bombSite = p.plantSite || "A";
    }
  }

  // ── Check defuse complete ──
  for (const [id, p] of players) {
    if (p.isDefusing && p.defuseProgress >= 1) {
      const updated = { ...p, isDefusing: false, defuseProgress: 0 };
      players.set(id, updated);
      set({
        players,
        activeReloads,
        bombPlanted: false,
        bombTimeLeft: 0,
        bombDropped,
        bombDropX,
        bombDropZ,
      });
      get().endRound("CT");
      return;
    }
  }

  // ── Round timeout ──
  const newTime = state.roundTimeLeft - dt;
  if (newTime <= 0 && !bombPlanted) {
    set({
      players,
      activeReloads,
      bombPlanted,
      bombTimeLeft,
      bombSite,
      bombDropped,
      bombDropX,
      bombDropZ,
    });
    get().endRound("CT");
    return;
  }

  // ── Check elimination ──
  let aliveT = 0;
  let aliveCT = 0;
  players.forEach((p) => {
    if (!p.isDead) {
      if (p.team === "T") aliveT++;
      else aliveCT++;
    }
  });

  set({
    players,
    activeReloads,
    roundTimeLeft: Math.max(0, newTime),
    bombPlanted,
    bombTimeLeft,
    bombSite,
    bombDropped,
    bombDropX,
    bombDropZ,
  });

  if (aliveT === 0 && !bombPlanted) {
    get().endRound("CT");
    return;
  }
  if (aliveCT === 0) {
    get().endRound("T");
    return;
  }
}

export function endRound(
  winner: "T" | "CT",
  state: OfflineGameState,
  set: (partial: Partial<OfflineGameState>) => void
) {
  if (state.phase === "roundEnd" || state.phase === "matchEnd") return;

  const tScore = state.teamRedScore + (winner === "T" ? 1 : 0);
  const ctScore = state.teamBlueScore + (winner === "CT" ? 1 : 0);
  const WIN_SCORE = Math.ceil(state.maxRounds / 2);

  if (tScore >= WIN_SCORE || ctScore >= WIN_SCORE) {
    set({
      phase: "matchEnd",
      teamRedScore: tScore,
      teamBlueScore: ctScore,
      activeReloads: new Map(),
    });
    return;
  }

  const players = new Map(state.players);
  players.forEach((p, id) => {
    const bonus = p.team === winner ? ECONOMY.roundWinBonus : ECONOMY.lossBonus1;
    players.set(id, {
      ...p,
      money: Math.min(p.money + bonus, ECONOMY.maxMoney),
      isPlanting: false,
      isDefusing: false,
      plantProgress: 0,
      defuseProgress: 0,
    });
  });

  set({
    phase: "roundEnd",
    teamRedScore: tScore,
    teamBlueScore: ctScore,
    roundEndTimer: ROUND.roundEndDuration,
    bombPlanted: false,
    bombTimeLeft: 0,
    bombSite: "",
    bombDropped: false,
    players,
    activeReloads: new Map(),
  });
}

export function resetForRound(
  state: OfflineGameState,
  set: (partial: Partial<OfflineGameState>) => void
) {
  const players = new Map<string, LocalPlayer>();

  state.players.forEach((p, id) => {
    const cloned = { ...p };
    cloned.hp = 100;
    cloned.isDead = false;
    cloned.isReloading = false;
    cloned.isPlanting = false;
    cloned.isDefusing = false;
    cloned.plantProgress = 0;
    cloned.defuseProgress = 0;
    cloned.hasBomb = false;
    cloned.grenadeHE = 0;
    cloned.grenadeSmoke = 0;
    cloned.grenadeFlash = 0;

    const sp = resolveTeamSpawn(state.currentMap, cloned.team);
    if (cloned.isBot) {
      const pos = spawnJitter(cloned.team, state.currentMap);
      cloned.x = pos.x;
      cloned.z = pos.z;
    } else {
      cloned.x = sp.x;
      cloned.z = sp.z;
    }

    if (cloned.isBot) {
      defaultLoadout(cloned);
      cloned.botAmmoInMag = cloned.ammo;
      cloned.botState = "idle";
      cloned.botWp = 0;
      cloned.botRole = roleForBotId(id);
      cloned.botLane = laneForRole(cloned.botRole, id);
      cloned.plantSite = cloned.botLane === "B" ? "B" : "A";
    } else {
      refillAmmo(cloned);
    }
    players.set(id, cloned);
  });

  assignBombCarrier(players);
  resetBotNav();

  set({
    phase: "buy",
    bombPlanted: false,
    bombTimeLeft: 0,
    bombSite: "",
    bombDropped: false,
    bombDropX: 0,
    bombDropZ: 0,
    buyPhaseTimeLeft: ROUND.buyPhaseDuration,
    roundTimeLeft: ROUND.activePhaseDuration,
    players,
    activeReloads: new Map(),
    killFeed: [],
  });
}
