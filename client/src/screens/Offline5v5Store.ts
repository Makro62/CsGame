import { create } from "zustand";
import {
  WEAPONS,
  SPAWN,
  ROUND,
  ECONOMY,
  MAP_BOUNDARY,
  MAP_OBSTACLES,
  DEFAULT_PISTOL,
  isMeleeWeapon,
  BOMB_SITES,
} from "@cs-game/shared";

export type BotTacticalState =
  | "idle"
  | "patrol"
  | "hold"
  | "peek"
  | "engage"
  | "retreat"
  | "plant"
  | "defuse";

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
}

export type RoundPhase = "waiting" | "buy" | "active" | "roundEnd" | "matchEnd";

interface KillEvent {
  killerName: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

interface BombPatch {
  bombPlanted?: boolean;
  bombTimeLeft?: number;
  bombSite?: string;
  bombDropped?: boolean;
  bombDropX?: number;
  bombDropZ?: number;
}

interface OfflineGameState {
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
  localPlayerId: string;
  players: Map<string, LocalPlayer>;
  killFeed: KillEvent[];
  hitEnemy: boolean;
  hitHeadshot: boolean;
  botTimers: Map<string, ReturnType<typeof setTimeout>[]>;

  initMatch: (nickname: string, team: "T" | "CT") => void;
  tick: (dt: number) => void;
  setLocalPos: (x: number, z: number, rotY: number) => void;
  localShoot: (targetId: string | null, headshot: boolean) => void;
  localBuy: (item: string) => boolean;
  localReload: () => void;
  localPlantStart: (site: string) => void;
  localPlantCancel: () => void;
  localDefuseStart: () => void;
  localDefuseCancel: () => void;
  localSwitchWeapon: (slot: number) => void;
  clearHit: () => void;
  checkRoundEnd: () => void;
  endRound: (winner: "T" | "CT") => void;
  resetForRound: () => void;
  clearBotTimers: () => void;
}

// ─── Helpers ───

function stats(weapon: string) {
  return WEAPONS[weapon as keyof typeof WEAPONS] || null;
}

function clamp(p: { x: number; z: number }) {
  p.x = Math.max(MAP_BOUNDARY.minX + 1, Math.min(MAP_BOUNDARY.maxX - 1, p.x));
  p.z = Math.max(MAP_BOUNDARY.minZ + 1, Math.min(MAP_BOUNDARY.maxZ - 1, p.z));
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

export function hasLineOfSight(
  from: { x: number; z: number },
  to: { x: number; z: number }
): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.001) return true;

  const steps = Math.ceil(distance * 2); // Sample every 0.5m
  const stepX = dx / steps;
  const stepZ = dz / steps;

  for (let i = 1; i < steps; i++) {
    const cx = from.x + stepX * i;
    const cz = from.z + stepZ * i;

    for (const obs of MAP_OBSTACLES) {
      if (
        cx >= obs.minX &&
        cx <= obs.maxX &&
        cz >= obs.minZ &&
        cz <= obs.maxZ
      ) {
        return false;
      }
    }
  }
  return true;
}

function mkPlayer(id: string, team: "T" | "CT", nickname: string, isBot: boolean): LocalPlayer {
  const sp = SPAWN[team];
  const pistol = DEFAULT_PISTOL[team as keyof typeof DEFAULT_PISTOL] ?? "glock";
  const ws = stats(pistol);
  return {
    id,
    x: sp.x + (isBot ? (Math.random() - 0.5) * 8 : 0),
    y: 0,
    z: sp.z + (isBot ? (Math.random() - 0.5) * 8 : 0),
    rotationY: 0,
    hp: 100,
    isDead: false,
    team,
    nickname,
    money: ECONOMY.startMoney,
    kills: 0,
    deaths: 0,
    currentWeapon: pistol,
    primaryWeapon: "",
    secondaryWeapon: pistol,
    knifeSlot: "knife",
    ammo: ws?.mag || 20,
    reserveAmmo: ws?.reserveAmmo || 120,
    armor: 0,
    hasHelmet: false,
    hasDefuseKit: false,
    grenadeHE: 0,
    grenadeSmoke: 0,
    grenadeFlash: 0,
    hasBomb: false,
    isBot,
    isReloading: false,
    isPlanting: false,
    isDefusing: false,
    plantProgress: 0,
    defuseProgress: 0,
    botTargetId: null,
    botState: "idle",
    botLastShootTime: 0,
    botStrafeDir: 1,
    botStrafeTimer: 0.8,
    botStrafeDuration: 0.8,
    botAmmoInMag: ws?.mag || 20,
    botAccuracy: 0.65,
    botHsRate: 0.25,
    botSpeed: 4,
    botViewDist: 25,
    plantSite: "A",
  };
}

function defaultLoadout(p: LocalPlayer) {
  const pistol = DEFAULT_PISTOL[p.team as keyof typeof DEFAULT_PISTOL] ?? "glock";
  const ws = stats(pistol);
  p.currentWeapon = pistol;
  p.primaryWeapon = "";
  p.secondaryWeapon = pistol;
  p.knifeSlot = "knife";
  p.ammo = ws?.mag || 20;
  p.reserveAmmo = ws?.reserveAmmo || 120;
  p.isReloading = false;
  p.isPlanting = false;
  p.isDefusing = false;
}

function refillAmmo(p: LocalPlayer) {
  const cur = stats(p.currentWeapon);
  if (cur && !isMeleeWeapon(p.currentWeapon)) {
    p.ammo = cur.mag;
    p.reserveAmmo = cur.reserveAmmo;
  }
}

// ─── Bot AI ───

function botBuy(bot: LocalPlayer) {
  let m = bot.money;

  // Armor & Helmet
  if (bot.armor < 100 && m >= 650) {
    bot.armor = 100;
    m -= 650;
  }
  if (!bot.hasHelmet && m >= 350) {
    bot.hasHelmet = true;
    m -= 350;
  }

  // Primary weapon
  if (!bot.primaryWeapon) {
    const wk = bot.team === "T" ? "ak47" : "m4a1";
    const ws = stats(wk);
    if (ws && m >= ws.price) {
      bot.primaryWeapon = wk;
      m -= ws.price;
    } else if (m >= 1500) {
      bot.primaryWeapon = "mp5";
      m -= 1500;
    }
  }

  // Secondary weapon
  if (!bot.secondaryWeapon) {
    if (m >= 700) {
      bot.secondaryWeapon = "deagle";
      m -= 700;
    } else if (m >= 200) {
      bot.secondaryWeapon = "glock";
      m -= 200;
    }
  }

  // Grenades
  if (m >= 300 && bot.grenadeHE < 1) {
    bot.grenadeHE++;
    m -= 300;
  }
  if (m >= 200 && bot.grenadeFlash < 2) {
    bot.grenadeFlash++;
    m -= 200;
  }
  if (m >= 300 && bot.grenadeSmoke < 1) {
    bot.grenadeSmoke++;
    m -= 300;
  }

  // CT defuse kit
  if (bot.team === "CT" && m >= 400 && !bot.hasDefuseKit) {
    bot.hasDefuseKit = true;
    m -= 400;
  }

  bot.money = m;

  // Equip best weapon
  if (bot.primaryWeapon) {
    bot.currentWeapon = bot.primaryWeapon;
    const ws = stats(bot.primaryWeapon);
    if (ws) {
      bot.ammo = ws.mag;
      bot.reserveAmmo = ws.reserveAmmo;
      bot.botAmmoInMag = ws.mag;
    }
  } else {
    bot.currentWeapon = bot.secondaryWeapon || "glock";
    const ws = stats(bot.currentWeapon);
    if (ws) {
      bot.ammo = ws.mag;
      bot.reserveAmmo = ws.reserveAmmo;
      bot.botAmmoInMag = ws.mag;
    }
  }
}

function botThink(
  bot: LocalPlayer,
  players: Map<string, LocalPlayer>,
  dt: number,
  now: number,
  bombState: { bombDropped: boolean; bombDropX: number; bombDropZ: number; bombPlanted: boolean },
  registerTimer?: (botId: string, timer: ReturnType<typeof setTimeout>) => void
): BombPatch | null {
  if (bot.isDead || bot.isReloading) return null;
  if (bot.botAmmoInMag <= 0 && bot.ammo > 0) bot.botAmmoInMag = bot.ammo;

  let patch: BombPatch | null = null;
  const addPatch = (extra: BombPatch) => {
    patch = { ...patch, ...extra };
  };

  // ── Tactical Retreat when HP is very low (< 30%) ──
  const hpRatio = bot.hp / 100;
  if (hpRatio < 0.3 && !bot.isPlanting && !bot.isDefusing) {
    bot.botState = "retreat";
    const spawn = SPAWN[bot.team];
    const rdx = spawn.x - bot.x;
    const rdz = spawn.z - bot.z;
    const rdist = Math.hypot(rdx, rdz);
    if (rdist > 3) {
      bot.x += (rdx / rdist) * bot.botSpeed * 0.7 * dt;
      bot.z += (rdz / rdist) * bot.botSpeed * 0.7 * dt;
      bot.rotationY = Math.atan2(rdx, rdz);
      clamp(bot);
      return patch;
    }
  }

  // ── Bomb: pick up / move toward / plant ──
  if (bot.team === "T" && !bot.isDead) {
    // Pick up dropped bomb
    if (bombState.bombDropped && !bot.hasBomb) {
      const bdx = bombState.bombDropX - bot.x;
      const bdz = bombState.bombDropZ - bot.z;
      const bdd = Math.hypot(bdx, bdz);
      if (bdd < 2) {
        bot.hasBomb = true;
        addPatch({ bombDropped: false });
      } else {
        // Move toward bomb
        bot.x += (bdx / bdd) * bot.botSpeed * 0.6 * dt;
        bot.z += (bdz / bdd) * bot.botSpeed * 0.6 * dt;
        bot.rotationY = Math.atan2(bdx, bdz);
        clamp(bot);
        return patch;
      }
    }

    // Plant bomb at bombsite
    if (bot.hasBomb && !bot.isPlanting && !bombState.bombPlanted) {
      const nearA = Math.hypot(bot.x - BOMB_SITES.A.x, bot.z - BOMB_SITES.A.z) <= 3.0;
      const nearB = Math.hypot(bot.x - BOMB_SITES.B.x, bot.z - BOMB_SITES.B.z) <= 3.0;
      if (nearA || nearB) {
        bot.isPlanting = true;
        bot.plantProgress = 0;
        bot.plantSite = nearA ? "A" : "B";
        bot.botState = "plant";
      }
    }

    if (bot.isPlanting) return patch;
  }

  // ── Find nearest visible enemy (Line of Sight check) ──
  let nearestId: string | null = null;
  let nearestDist = Infinity;
  players.forEach((o, id) => {
    if (id === bot.id || o.isDead || o.team === bot.team) return;
    const dd = dist(bot, o);
    if (dd < bot.botViewDist && dd < nearestDist) {
      if (hasLineOfSight(bot, o)) {
        nearestId = id;
        nearestDist = dd;
      }
    }
  });

  if (!nearestId) {
    // ── CT Hold angle near bombsite ──
    if (bot.team === "CT" && !bombState.bombPlanted) {
      const nearSiteA = Math.hypot(bot.x - BOMB_SITES.A.x, bot.z - BOMB_SITES.A.z) < 8;
      const nearSiteB = Math.hypot(bot.x - BOMB_SITES.B.x, bot.z - BOMB_SITES.B.z) < 8;
      if (nearSiteA || nearSiteB) {
        bot.botState = "hold";
        bot.botTargetId = null;
        bot.rotationY = Math.atan2(SPAWN.T.x - bot.x, SPAWN.T.z - bot.z);
        return patch;
      }
    }

    // ── Patrol ──
    bot.botTargetId = null;
    bot.botState = "patrol";
    let tgtX: number, tgtZ: number;
    if (bot.hasBomb) {
      const site = Math.random() < 0.5 ? BOMB_SITES.A : BOMB_SITES.B;
      tgtX = site.x;
      tgtZ = site.z;
    } else {
      const enemySpawn = bot.team === "T" ? SPAWN.CT : SPAWN.T;
      tgtX = enemySpawn.x;
      tgtZ = enemySpawn.z;
    }
    const dx = tgtX - bot.x;
    const dz = tgtZ - bot.z;
    const dd = Math.hypot(dx, dz);
    if (dd > 3) {
      const spd = bot.botSpeed * 0.6;
      bot.x += (dx / dd) * spd * dt;
      bot.z += (dz / dd) * spd * dt;
      const perpX = -dz / dd;
      const perpZ = dx / dd;
      const zigzag = Math.sin(now * 0.0015 + bot.id.charCodeAt(4)) * 0.6;
      bot.x += perpX * zigzag * spd * dt;
      bot.z += perpZ * zigzag * spd * dt;
      bot.rotationY = Math.atan2(dx, dz);
    }
    clamp(bot);
    return patch;
  }

  // ── Engage ──
  bot.botTargetId = nearestId;
  bot.botState = "engage";
  const tgt = players.get(nearestId)!;
  const dx = tgt.x - bot.x;
  const dz = tgt.z - bot.z;
  const dd = Math.hypot(dx, dz);

  // Aim
  const err = (1 - bot.botAccuracy) * (Math.random() - 0.5) * 0.3;
  bot.rotationY = Math.atan2(dx, dz) + err;

  // State-based Strafe timer
  bot.botStrafeTimer -= dt;
  if (bot.botStrafeTimer <= 0) {
    bot.botStrafeDir = Math.random() < 0.5 ? 1 : -1;
    bot.botStrafeDuration = 0.5 + Math.random() * 0.8;
    bot.botStrafeTimer = bot.botStrafeDuration;
  }

  // Movement
  const perpX = -dz / dd;
  const perpZ = dx / dd;
  const strafeSpd = bot.botSpeed * 0.45;
  const rushSpd = bot.botSpeed * 0.7;

  if (dd > 18) {
    // Far: rush + light strafe
    bot.x += (dx / dd) * rushSpd * dt + perpX * bot.botStrafeDir * strafeSpd * 0.5 * dt;
    bot.z += (dz / dd) * rushSpd * dt + perpZ * bot.botStrafeDir * strafeSpd * 0.5 * dt;
  } else if (dd > 8) {
    // Mid: strafe + micro-adjust
    bot.x += perpX * bot.botStrafeDir * strafeSpd * dt;
    bot.z += perpZ * bot.botStrafeDir * strafeSpd * dt;
    if (dd > 12) {
      bot.x += (dx / dd) * rushSpd * 0.2 * dt;
      bot.z += (dz / dd) * rushSpd * 0.2 * dt;
    } else if (dd < 10) {
      bot.x -= (dx / dd) * rushSpd * 0.15 * dt;
      bot.z -= (dz / dd) * rushSpd * 0.15 * dt;
    }
  } else if (dd > 4) {
    // Close: aggressive strafe
    bot.x += perpX * bot.botStrafeDir * strafeSpd * 1.2 * dt;
    bot.z += perpZ * bot.botStrafeDir * strafeSpd * 1.2 * dt;
  } else {
    // Too close: back away + strafe
    bot.x -= (dx / dd) * rushSpd * 0.5 * dt + perpX * bot.botStrafeDir * strafeSpd * dt;
    bot.z -= (dz / dd) * rushSpd * 0.5 * dt + perpZ * bot.botStrafeDir * strafeSpd * dt;
  }
  clamp(bot);

  // Shoot
  const ws = stats(bot.currentWeapon);
  if (ws && bot.botAmmoInMag > 0) {
    const fi = bot.currentWeapon === "awp" ? 1400 : 1000 / ws.fireRate;
    if (now - bot.botLastShootTime > fi) {
      const distPenalty = Math.min(dd / bot.botViewDist, 0.5);
      if (Math.random() < bot.botAccuracy * (1 - distPenalty * 0.3)) {
        const hs = Math.random() < bot.botHsRate;
        const dmg = hs ? ws.headshot : ws.dmg;
        tgt.hp = Math.max(0, tgt.hp - dmg);
        if (tgt.hp <= 0) {
          tgt.isDead = true;
          bot.kills++;
          tgt.deaths++;
          if (tgt.hasBomb) {
            tgt.hasBomb = false;
            addPatch({ bombDropped: true, bombDropX: tgt.x, bombDropZ: tgt.z });
          }
        }
        bot.botAmmoInMag--;
        bot.ammo = bot.botAmmoInMag;
        bot.botLastShootTime = now;
      }
    }
  }

  // Reload with registered timer cleanup
  if (bot.botAmmoInMag <= 5 && !bot.isReloading && bot.reserveAmmo > 0) {
    bot.isReloading = true;
    const rt = (ws?.reload || 2) * 1000;
    const botId = bot.id;
    const timer = setTimeout(() => {
      if (bot.isDead) return;
      const mag = ws?.mag || 30;
      const load = Math.min(mag - bot.botAmmoInMag, bot.reserveAmmo);
      bot.botAmmoInMag += load;
      bot.reserveAmmo -= load;
      bot.ammo = bot.botAmmoInMag;
      bot.isReloading = false;
    }, rt);
    if (registerTimer) {
      registerTimer(botId, timer);
    }
  }

  // Switch to pistol when out of ammo
  if (bot.botAmmoInMag <= 0 && bot.reserveAmmo <= 0 && bot.secondaryWeapon) {
    bot.currentWeapon = bot.secondaryWeapon;
    const sws = stats(bot.secondaryWeapon);
    if (sws) {
      bot.botAmmoInMag = sws.mag;
      bot.ammo = sws.mag;
      bot.reserveAmmo = sws.reserveAmmo;
    }
  }

  return patch;
}

// ─── Store ───

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
  localPlayerId: "local",
  players: new Map(),
  killFeed: [],
  hitEnemy: false,
  hitHeadshot: false,
  botTimers: new Map(),

  clearBotTimers: () => {
    const timersMap = get().botTimers;
    timersMap.forEach((timers) => {
      timers.forEach((t) => clearTimeout(t));
    });
    timersMap.clear();
  },

  initMatch: (nickname: string, team: "T" | "CT") => {
    get().clearBotTimers();
    const players = new Map<string, LocalPlayer>();
    const local = mkPlayer("local", team, nickname, false);
    local.money = ECONOMY.startMoney;
    players.set("local", local);

    for (let i = 1; i <= 4; i++) {
      players.set(`bot_t${i}`, mkPlayer(`bot_t${i}`, "T", `Bot T${i}`, true));
    }
    for (let i = 1; i <= 4; i++) {
      players.set(`bot_ct${i}`, mkPlayer(`bot_ct${i}`, "CT", `Bot CT${i}`, true));
    }

    if (team === "T") local.hasBomb = true;

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
      players,
      killFeed: [],
    });
  },

  tick: (dt: number) => {
    const s = get();

    // ── Buy phase ──
    if (s.phase === "buy") {
      const t = s.buyPhaseTimeLeft - dt;
      if (t <= 0) {
        const players = new Map(s.players);
        players.forEach((p, id) => {
          if (p.isBot) {
            const cloned = { ...p };
            botBuy(cloned);
            players.set(id, cloned);
          }
        });
        set({ phase: "active", buyPhaseTimeLeft: 0, roundTimeLeft: ROUND.activePhaseDuration, players });
      } else {
        set({ buyPhaseTimeLeft: t });
      }
      return;
    }

    // ── Round end phase ──
    if (s.phase === "roundEnd") {
      const t = s.roundEndTimer - dt;
      if (t <= 0) {
        const next = s.roundNumber + 1;
        const isHalf = !s.isHalfTime && next > Math.floor(ROUND.maxRounds / 2);
        set({ roundNumber: next, isHalfTime: isHalf || s.isHalfTime });
        get().resetForRound();
      } else {
        set({ roundEndTimer: t });
      }
      return;
    }

    if (s.phase !== "active") return;

    const now = Date.now();
    const players = new Map(s.players);

    // ── Apply player plant/defuse progress ──
    players.forEach((p, id) => {
      if (p.isPlanting) {
        const updated = { ...p, plantProgress: p.plantProgress + dt / 3 };
        players.set(id, updated);
      }
      if (p.isDefusing) {
        const updated = {
          ...p,
          defuseProgress: p.defuseProgress + dt / (p.hasDefuseKit ? 5 : 10),
        };
        players.set(id, updated);
      }
    });

    // ── Update bots + apply bomb patches ──
    const bombState = {
      bombDropped: s.bombDropped,
      bombDropX: s.bombDropX,
      bombDropZ: s.bombDropZ,
      bombPlanted: s.bombPlanted,
      bombTimeLeft: s.bombTimeLeft,
      bombSite: s.bombSite,
    };

    const registerBotTimer = (botId: string, timer: ReturnType<typeof setTimeout>) => {
      const timersMap = get().botTimers;
      const list = timersMap.get(botId) || [];
      list.push(timer);
      timersMap.set(botId, list);
    };

    players.forEach((p, id) => {
      if (p.isBot && !p.isDead) {
        const botClone = { ...p };
        const result = botThink(botClone, players, dt, now, bombState, registerBotTimer);
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
        set({ players, bombPlanted: false, bombTimeLeft: 0, bombDropped, bombDropX, bombDropZ });
        get().endRound("T");
        return;
      }
    }

    // ── Check plant complete (local player or bot) ──
    players.forEach((p, id) => {
      if (p.isPlanting && p.plantProgress >= 1 && !bombPlanted) {
        const updated = { ...p, isPlanting: false, plantProgress: 0, hasBomb: false };
        players.set(id, updated);
        bombPlanted = true;
        bombTimeLeft = 40;
        bombSite = p.plantSite || "A";
      }
    });

    // ── Check defuse complete ──
    players.forEach((p, id) => {
      if (p.isDefusing && p.defuseProgress >= 1) {
        const updated = { ...p, isDefusing: false, defuseProgress: 0 };
        players.set(id, updated);
        set({ players, bombPlanted: false, bombTimeLeft: 0, bombDropped, bombDropX, bombDropZ });
        get().endRound("CT");
        return;
      }
    });

    // ── Round timeout ──
    const newTime = s.roundTimeLeft - dt;
    if (newTime <= 0 && !bombPlanted) {
      set({ players, bombPlanted, bombTimeLeft, bombSite, bombDropped, bombDropX, bombDropZ });
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
    const me = s.players.get("local");
    if (!me || me.isDead || me.isReloading) return;
    const ws = stats(me.currentWeapon);
    if (!ws || me.ammo <= 0) return;

    const players = new Map(s.players);
    const newMe = { ...me, ammo: me.ammo - 1 };
    const updates: Partial<OfflineGameState> = {};

    if (targetId) {
      const victim = s.players.get(targetId);
      if (victim && !victim.isDead && victim.team !== me.team) {
        const newVictim = { ...victim };
        const dmg = headshot ? ws.headshot : ws.dmg;
        newVictim.hp = Math.max(0, newVictim.hp - dmg);
        updates.hitEnemy = true;
        updates.hitHeadshot = headshot;

        if (newVictim.hp <= 0) {
          newVictim.isDead = true;
          newMe.kills = newMe.kills + 1;
          newVictim.deaths = newVictim.deaths + 1;

          if (newVictim.hasBomb) {
            newVictim.hasBomb = false;
            updates.bombDropped = true;
            updates.bombDropX = newVictim.x;
            updates.bombDropZ = newVictim.z;
          }

          const newEntry: KillEvent = {
            killerName: newMe.nickname,
            victimName: newVictim.nickname,
            weapon: newMe.currentWeapon,
            headshot,
            timestamp: Date.now(),
          };

          const kf = s.killFeed.length >= 5
            ? [...s.killFeed.slice(1), newEntry]
            : [...s.killFeed, newEntry];
          updates.killFeed = kf;
        }
        players.set(targetId, newVictim);
      }
    }

    players.set("local", newMe);
    set({ players, ...updates });
    if (updates.bombDropped || updates.hitEnemy) get().checkRoundEnd();
  },

  localBuy: (item: string) => {
    const s = get();
    if (s.phase !== "buy") return false;
    const me = s.players.get("local");
    if (!me) return false;
    const ws = stats(item);
    const players = new Map(s.players);

    if (ws) {
      if (ws.price > me.money) return false;
      if (ws.team !== "both" && ws.team !== me.team) return false;
      const newMe = { ...me, money: me.money - ws.price };
      if (item === "ak47" || item === "m4a1" || item === "awp" || item === "mp5") {
        newMe.primaryWeapon = item;
        newMe.currentWeapon = item;
        newMe.ammo = ws.mag;
        newMe.reserveAmmo = ws.reserveAmmo;
      } else if (item === "deagle" || item === "glock" || item === "tec9" || item === "autopistol") {
        newMe.secondaryWeapon = item;
        newMe.currentWeapon = item;
        newMe.ammo = ws.mag;
        newMe.reserveAmmo = ws.reserveAmmo;
      }
      players.set("local", newMe);
      set({ players });
      return true;
    }

    if (item === "kevlar" && me.money >= 650) {
      players.set("local", { ...me, armor: 100, money: me.money - 650 });
      set({ players });
      return true;
    }
    if (item === "helmet" && me.money >= 350 && !me.hasHelmet) {
      players.set("local", { ...me, hasHelmet: true, money: me.money - 350 });
      set({ players });
      return true;
    }
    if (item === "defuseKit" && me.money >= 400 && me.team === "CT" && !me.hasDefuseKit) {
      players.set("local", { ...me, hasDefuseKit: true, money: me.money - 400 });
      set({ players });
      return true;
    }
    if (item === "grenadeHE" && me.money >= 300 && me.grenadeHE < 1) {
      players.set("local", { ...me, grenadeHE: me.grenadeHE + 1, money: me.money - 300 });
      set({ players });
      return true;
    }
    if (item === "grenadeSmoke" && me.money >= 300 && me.grenadeSmoke < 1) {
      players.set("local", { ...me, grenadeSmoke: me.grenadeSmoke + 1, money: me.money - 300 });
      set({ players });
      return true;
    }
    if (item === "grenadeFlash" && me.money >= 200 && me.grenadeFlash < 2) {
      players.set("local", { ...me, grenadeFlash: me.grenadeFlash + 1, money: me.money - 200 });
      set({ players });
      return true;
    }
    return false;
  },

  localReload: () => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.isReloading) return;
    const ws = stats(me.currentWeapon);
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

    const sitePos = BOMB_SITES[site as keyof typeof BOMB_SITES] || BOMB_SITES.A;
    const distToSite = Math.hypot(me.x - sitePos.x, me.z - sitePos.z);
    if (distToSite > 3.5) return; // Distance validation

    const players = new Map(s.players);
    players.set("local", { ...me, isPlanting: true, plantProgress: 0, plantSite: site });
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
    if (distToBomb > 3.0) return; // Distance validation

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

  clearHit: () => set({ hitEnemy: false, hitHeadshot: false }),

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
    const s = get();
    if (s.phase === "roundEnd" || s.phase === "matchEnd") return;
    get().clearBotTimers();

    const tScore = s.teamRedScore + (winner === "T" ? 1 : 0);
    const ctScore = s.teamBlueScore + (winner === "CT" ? 1 : 0);
    const target = s.maxRounds / 2;
    if (tScore >= target || ctScore >= target) {
      set({ phase: "matchEnd", teamRedScore: tScore, teamBlueScore: ctScore });
      return;
    }

    const players = new Map(s.players);
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
      bombDropped: false,
      players,
    });
  },

  resetForRound: () => {
    const s = get();
    get().clearBotTimers();
    const players = new Map<string, LocalPlayer>();

    s.players.forEach((p, id) => {
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

      const sp = SPAWN[cloned.team as keyof typeof SPAWN];
      cloned.x = sp.x + (cloned.isBot ? (Math.random() - 0.5) * 8 : 0);
      cloned.z = sp.z + (cloned.isBot ? (Math.random() - 0.5) * 8 : 0);

      if (cloned.isBot) {
        defaultLoadout(cloned);
        cloned.botAmmoInMag = cloned.ammo;
        cloned.botState = "idle";
      } else {
        refillAmmo(cloned);
      }
      players.set(id, cloned);
    });

    const local = players.get("local");
    if (local && local.team === "T") local.hasBomb = true;

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
    });
  },
}));
