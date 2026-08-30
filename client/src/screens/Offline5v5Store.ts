import { create } from "zustand";
import { Sound } from "../components/AudioManager";
import { useGameStore } from "../stores/useGameStore";
import {
  WEAPONS,
  SPAWN,
  ROUND,
  ECONOMY,
  DEFAULT_PISTOL,
  isMeleeWeapon,
  GEAR,
  BOMB_SITES,
} from "@cs-game/shared";
import {
  clampToMap,
  distToBombSite,
  fireIntervalMs,
  hasLineOfSight,
  hideBehindCover,
  laneForBotId,
  botPath,
  nearestBombSite,
  nextWaypointIndex,
  resolveBotShot,
  steerAroundObstacles,
  stepToward,
  type BotLane,
} from "../game/offline/offlineCombat";

type BotTacticalState =
  | "idle"
  | "patrol"
  | "hold"
  | "peek"
  | "engage"
  | "retreat"
  | "plant"
  | "defuse";

interface LocalPlayer {
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
  botWp: number;
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
  players: Map<string, LocalPlayer>;
  killFeed: KillEvent[];
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
  const next = clampToMap(p);
  p.x = next.x;
  p.z = next.z;
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

function spawnYaw(team: "T" | "CT"): number {
  const from = SPAWN[team];
  const to = team === "T" ? SPAWN.CT : SPAWN.T;
  return Math.atan2(to.x - from.x, to.z - from.z);
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
    rotationY: spawnYaw(team),
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
    plantSite: laneForBotId(id) === "B" ? "B" : "A",
    botLane: laneForBotId(id),
    botWp: 0,
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
  if (bot.armor < 100 && m >= GEAR.kevlar.price) {
    bot.armor = 100;
    m -= GEAR.kevlar.price;
  }
  if (!bot.hasHelmet && m >= GEAR.helmet.price) {
    bot.hasHelmet = true;
    bot.armor = 100;
    m -= GEAR.helmet.price;
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
  bombState: { bombDropped: boolean; bombDropX: number; bombDropZ: number; bombPlanted: boolean; bombSite?: string; bombTimeLeft?: number },
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
    const path = botPath(bot.botLane, bot.team);
    const back = path[0] ?? SPAWN[bot.team];
    const moved = stepToward(bot, back, bot.botSpeed * 0.75, dt);
    bot.x = moved.x;
    bot.z = moved.z;
    bot.rotationY = Math.atan2(back.x - bot.x, back.z - bot.z);
    return patch;
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
        addPatch({ bombDropped: false, bombDropX: 0, bombDropZ: 0 });
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
      const site = (bot.plantSite === "B" ? "B" : "A") as "A" | "B";
      if (distToBombSite(bot, site) <= BOMB_SITES[site].radius) {
        bot.isPlanting = true;
        bot.plantProgress = 0;
        bot.plantSite = site;
        bot.botState = "plant";
      }
    }

    if (bot.isPlanting) return patch;
  }

  if (bot.team === "CT" && bombState.bombPlanted) {
    const siteKey = bombState.bombSite === "B" ? "B" : "A";
    const site = BOMB_SITES[siteKey];
    const toSite = distToBombSite(bot, siteKey);
    if (toSite <= site.radius) {
      bot.isDefusing = true;
      bot.botState = "defuse";
      return patch;
    }
    const intended = {
      x: bot.x + ((site.x - bot.x) / Math.max(toSite, 0.01)) * bot.botSpeed * 0.7 * dt,
      z: bot.z + ((site.z - bot.z) / Math.max(toSite, 0.01)) * bot.botSpeed * 0.7 * dt,
    };
    const steered = clampToMap(steerAroundObstacles(bot, intended));
    bot.x = steered.x;
    bot.z = steered.z;
    bot.rotationY = Math.atan2(site.x - bot.x, site.z - bot.z);
    bot.botState = "defuse";
    return patch;
  }

  if (bot.isDefusing) return patch;

  // ── Find nearest visible enemy (Line of Sight check) ──
  let nearestId: string | null = null;
  let nearestDist = Infinity;
  players.forEach((o, id) => {
    if (id === bot.id || o.isDead || o.team === bot.team) return;
    const dd = dist(bot, o);
    if (dd < bot.botViewDist && dd < nearestDist && hasLineOfSight(bot, o)) {
      nearestId = id;
      nearestDist = dd;
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

    // ── Patrol along a lane (A / mid / B), weaving past cover ──
    bot.botTargetId = null;
    bot.botState = "patrol";
    const lane: BotLane = bot.hasBomb
      ? (bot.plantSite === "B" ? "B" : "A")
      : bot.botLane;
    const path = botPath(lane, bot.team);
    bot.botWp = nextWaypointIndex(bot, path, bot.botWp);
    const wp = path[bot.botWp] ?? path[path.length - 1];
    const moved = stepToward(bot, wp, bot.botSpeed * 0.85, dt);
    bot.x = moved.x;
    bot.z = moved.z;
    bot.rotationY = Math.atan2(wp.x - bot.x, wp.z - bot.z);
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

  // Movement: hide behind a wall, then peek-strafe
  bot.botStrafeTimer -= dt;
  if (bot.botStrafeTimer <= 0) {
    bot.botStrafeDir = Math.random() < 0.5 ? 1 : -1;
    bot.botStrafeDuration = 0.45 + Math.random() * 0.7;
    bot.botStrafeTimer = bot.botStrafeDuration;
  }

  const cover = hideBehindCover(bot, tgt);
  const perpX = -dz / Math.max(dd, 0.01);
  const perpZ = dx / Math.max(dd, 0.01);
  const peek = bot.botStrafeDir > 0;
  const dest = cover
    ? peek
      ? {
          x: cover.x + (dx / dd) * 1.7 + perpX * bot.botStrafeDir * 1.15,
          z: cover.z + (dz / dd) * 1.7 + perpZ * bot.botStrafeDir * 1.15,
        }
      : cover
    : {
        x: bot.x + perpX * bot.botStrafeDir * 2.4,
        z: bot.z + perpZ * bot.botStrafeDir * 2.4,
      };
  const movedCombat = stepToward(bot, dest, bot.botSpeed * (cover && !peek ? 0.95 : 0.7), dt);
  bot.x = movedCombat.x;
  bot.z = movedCombat.z;

  // Shoot
  const ws = stats(bot.currentWeapon);
  if (ws && bot.botAmmoInMag > 0) {
    const fi = fireIntervalMs(bot.currentWeapon, ws.fireRate);
    if (now - bot.botLastShootTime > fi) {
      const shot = resolveBotShot({
        accuracy: bot.botAccuracy,
        headshotRate: bot.botHsRate,
        distance: dd,
        viewDistance: bot.botViewDist,
      });
      bot.botAmmoInMag--;
      bot.ammo = bot.botAmmoInMag;
      bot.botLastShootTime = now;

      // ── Bot Gunshot Audio & Tracer VFX ──
      try {
        Sound.gunshot(bot.currentWeapon);
      } catch {
        /* audio error ignored */
      }

      // Calculate gun barrel starting position
      const barrelDist = 0.55;
      const startX = bot.x + Math.sin(bot.rotationY) * barrelDist + Math.cos(bot.rotationY) * 0.2;
      const startY = 1.15;
      const startZ = bot.z + Math.cos(bot.rotationY) * barrelDist - Math.sin(bot.rotationY) * 0.2;

      let endX = tgt.x;
      let endY = shot.headshot ? 1.55 : 1.05;
      let endZ = tgt.z;

      if (!shot.hit) {
        // Missed shot: bullet flies slightly past target
        endX += (Math.random() - 0.5) * 2.2;
        endY += (Math.random() - 0.5) * 1.5;
        endZ += (Math.random() - 0.5) * 2.2;
      }

      useGameStore.getState().setTracerEvent({
        start: { x: startX, y: startY, z: startZ },
        end: { x: endX, y: endY, z: endZ },
        color: bot.team === "CT" ? "#60a5fa" : "#f87171",
      });

      if (shot.hit) {
        const dmg = shot.headshot ? ws.headshot : ws.dmg;
        tgt.hp = Math.max(0, tgt.hp - dmg);

        if (tgt.id === "local") {
          // Local player was hit by an enemy bot!
          try {
            Sound.playerHurt();
          } catch {
            /* audio error ignored */
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("playerHitFeedback", {
                detail: { shooterX: bot.x, shooterZ: bot.z, damage: dmg },
              })
            );
          }
        } else {
          try {
            Sound.fleshHit();
          } catch {
            /* audio error ignored */
          }
        }

        if (tgt.hp <= 0) {
          tgt.isDead = true;
          bot.kills++;
          tgt.deaths++;
          if (tgt.hasBomb) {
            tgt.hasBomb = false;
            addPatch({ bombDropped: true, bombDropX: tgt.x, bombDropZ: tgt.z });
          }
        }
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
  players: new Map(),
  killFeed: [],
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

    const tBots = team === "T" ? 4 : 5;
    const ctBots = team === "CT" ? 4 : 5;
    for (let i = 1; i <= tBots; i++) {
      players.set(`bot_t${i}`, mkPlayer(`bot_t${i}`, "T", `Bot T${i}`, true));
    }
    for (let i = 1; i <= ctBots; i++) {
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
      const players = new Map(s.players);
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
        set({ phase: "active", buyPhaseTimeLeft: 0, roundTimeLeft: ROUND.activePhaseDuration, players });
      } else {
        set({ buyPhaseTimeLeft: t, players });
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
      if (p.isDead && (p.isPlanting || p.isDefusing)) {
        players.set(id, { ...p, isPlanting: false, isDefusing: false, plantProgress: 0, defuseProgress: 0 });
        return;
      }
      if (p.isPlanting) {
        const updated = { ...p, plantProgress: p.plantProgress + dt / ROUND.plantDuration };
        players.set(id, updated);
      }
      if (p.isDefusing) {
        const updated = {
          ...p,
          defuseProgress: p.defuseProgress + dt / (p.hasDefuseKit ? ROUND.defuseKitDuration : ROUND.defuseDuration),
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
        bombTimeLeft = ROUND.bombTimer;
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
    if (!ws) return;

    const players = new Map(s.players);
    const newMe = { ...me };
    const updates: Partial<OfflineGameState> = {};
    let didHitEnemy = false;

    if (targetId) {
      const victim = s.players.get(targetId);
      if (victim && !victim.isDead && victim.team !== me.team) {
        const newVictim = { ...victim };
        const dmg = headshot ? ws.headshot : ws.dmg;
        newVictim.hp = Math.max(0, newVictim.hp - dmg);
        didHitEnemy = true;

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
    if (updates.bombDropped || didHitEnemy) get().checkRoundEnd();
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
      if (item === "ak47" || item === "m4a1" || item === "awp" || item === "mp5") {
        if (me.primaryWeapon === item) return false;
      } else if (item === "deagle" || item === "glock" || item === "tec9" || item === "autopistol") {
        if (me.secondaryWeapon === item) return false;
      }
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

    if (item === "kevlar" && me.money >= GEAR.kevlar.price) {
      players.set("local", { ...me, armor: 100, money: me.money - GEAR.kevlar.price });
      set({ players });
      return true;
    }
    if (item === "helmet" && me.money >= GEAR.helmet.price && !me.hasHelmet) {
      players.set("local", { ...me, hasHelmet: true, armor: 100, money: me.money - GEAR.helmet.price });
      set({ players });
      return true;
    }
    if (item === "defuseKit" && me.money >= GEAR.defuseKit.price && me.team === "CT" && !me.hasDefuseKit) {
      players.set("local", { ...me, hasDefuseKit: true, money: me.money - GEAR.defuseKit.price });
      set({ players });
      return true;
    }
    if (item === "grenadeHE" && me.money >= GEAR.grenadeHE.price && me.grenadeHE < 1) {
      players.set("local", { ...me, grenadeHE: me.grenadeHE + 1, money: me.money - GEAR.grenadeHE.price });
      set({ players });
      return true;
    }
    if (item === "grenadeSmoke" && me.money >= GEAR.grenadeSmoke.price && me.grenadeSmoke < 1) {
      players.set("local", { ...me, grenadeSmoke: me.grenadeSmoke + 1, money: me.money - GEAR.grenadeSmoke.price });
      set({ players });
      return true;
    }
    if (item === "grenadeFlash" && me.money >= GEAR.grenadeFlash.price && me.grenadeFlash < 2) {
      players.set("local", { ...me, grenadeFlash: me.grenadeFlash + 1, money: me.money - GEAR.grenadeFlash.price });
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
    const s = get();
    if (s.phase === "roundEnd" || s.phase === "matchEnd") return;
    get().clearBotTimers();

    const tScore = s.teamRedScore + (winner === "T" ? 1 : 0);
    const ctScore = s.teamBlueScore + (winner === "CT" ? 1 : 0);
    // Win score 8 per GDD (first-to-8 of 15 rounds)
    const WIN_SCORE = Math.ceil(s.maxRounds / 2);
    if (tScore >= WIN_SCORE || ctScore >= WIN_SCORE) {
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
        cloned.botWp = 0;
        cloned.botLane = laneForBotId(id);
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
