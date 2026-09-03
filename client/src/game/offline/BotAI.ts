import { Sound } from "../../components/AudioManager";
import { useGameStore } from "../../stores/useGameStore";
import { gameEvents } from "../../lib/gameEvents";
import {
  SPAWN,
  DEFAULT_PISTOL,
  isMeleeWeapon,
  getSpawnForMap,
} from "@cs-game/shared";
import {
  distToBombSite,
  fireIntervalMs,
  hasLineOfSight,
  hideBehindCover,
  botPath,
  nextWaypointIndex,
  resolveBotShot,
  resolveBombSites,
  roleForBotId,
  laneForRole,
  type BotLane,
  type BotRole,
} from "./offlineCombat";
import { navigateTo, resetBotNav, spawnJitter } from "./botNav";
import { getWeaponStats } from "./EconomySystem";
import { safeDiv } from "../../lib/numericGuards";
import { getProceduralMapData } from "../map/ProceduralMapRegistry";
import type {
  LocalPlayer,
  BombState,
  BombPatch,
  BotDifficultyLevel,
  BotDifficultyConfig,
} from "./types";

export const DIFFICULTIES: Record<BotDifficultyLevel, BotDifficultyConfig> = {
  easy: {
    accuracy: 0.35,
    hsRate: 0.05,
    reactionTime: 0.8,
    speed: 3.2,
    viewDist: 20,
    fov: Math.PI * 0.55,
  },
  medium: {
    accuracy: 0.55,
    hsRate: 0.15,
    reactionTime: 0.45,
    speed: 3.8,
    viewDist: 26,
    fov: Math.PI * 0.7,
  },
  hard: {
    accuracy: 0.72,
    hsRate: 0.3,
    reactionTime: 0.25,
    speed: 4.2,
    viewDist: 34,
    fov: Math.PI * 0.8,
  },
  expert: {
    accuracy: 0.88,
    hsRate: 0.45,
    reactionTime: 0.12,
    speed: 4.6,
    viewDist: 42,
    fov: Math.PI * 0.9,
  },
};

export function assignBombCarrier(players: Map<string, LocalPlayer>) {
  players.forEach((p) => {
    p.hasBomb = false;
  });
  const local = players.get("local");
  if (local && local.team === "T") {
    local.hasBomb = true;
    return;
  }
  const tBots = [...players.values()].filter((p) => p.isBot && p.team === "T");
  const carrier = tBots.find((p) => p.botRole === "runner") ?? tBots.find((p) => p.botLane === "A") ?? tBots[0];
  if (carrier) carrier.hasBomb = true;
}

export { resetBotNav };

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function plantedSite(bombState: BombState): "A" | "B" {
  return bombState.bombSite === "B" ? "B" : "A";
}

function face(bot: LocalPlayer, to: { x: number; z: number }) {
  bot.rotationY = Math.atan2(to.x - bot.x, to.z - bot.z);
}

function walkTo(bot: LocalPlayer, goal: { x: number; z: number }, speed: number, dt: number) {
  const moved = navigateTo(bot.id, bot, goal, speed, dt);
  bot.x = moved.x;
  bot.z = moved.z;
  face(bot, goal);
}

/** Diam = mati: even on a hold, keep a small orbit so the hitbox is never parked. */
function orbitAround(bot: LocalPlayer, center: { x: number; z: number }, dt: number, radius = 2.8) {
  bot.botStrafeTimer -= dt;
  if (bot.botStrafeTimer <= 0) {
    bot.botStrafeDir = bot.botStrafeDir < 0 ? 1 : -1;
    bot.botStrafeTimer = 0.4 + Math.random() * 0.35;
  }
  const sign = bot.id.charCodeAt(bot.id.length - 1) % 2 === 0 ? 1 : -1;
  const goal = {
    x: center.x + bot.botStrafeDir * radius,
    z: center.z + sign * radius * 0.7,
  };
  walkTo(bot, goal, bot.botSpeed * 0.55, dt);
}

function bombCarrier(players: Map<string, LocalPlayer>): LocalPlayer | null {
  for (const p of players.values()) {
    if (!p.isDead && p.hasBomb) return p;
  }
  return null;
}

function alliesNearSite(
  bot: LocalPlayer,
  players: Map<string, LocalPlayer>,
  site: "A" | "B",
  radius: number,
): number {
  let n = 0;
  players.forEach((p) => {
    if (p.id === bot.id || p.isDead || p.team !== bot.team) return;
    if (distToBombSite(p, site) < radius) n++;
  });
  return n;
}

function nearestEnemy(
  bot: LocalPlayer,
  players: Map<string, LocalPlayer>,
  maxDist = bot.botViewDist,
): LocalPlayer | null {
  let best: LocalPlayer | null = null;
  let bestD = maxDist;
  players.forEach((o, id) => {
    if (id === bot.id || o.isDead || o.team === bot.team) return;
    const dd = dist(bot, o);
    if (dd < bestD && hasLineOfSight(bot, o)) {
      best = o;
      bestD = dd;
    }
  });
  return best;
}

export function botThink(
  bot: LocalPlayer,
  players: Map<string, LocalPlayer>,
  dt: number,
  now: number,
  bombState: BombState,
  queueReload?: (botId: string, duration: number) => void
): BombPatch | null {
  if (bot.isDead) return null;
  if (bot.botAmmoInMag <= 0 && bot.ammo > 0) bot.botAmmoInMag = bot.ammo;

  let patch: BombPatch | null = null;
  const addPatch = (extra: BombPatch) => {
    patch = { ...patch, ...extra };
  };
  const canShoot = !bot.isReloading && !bot.isPlanting && !bot.isDefusing;

  if (bot.isPlanting || bot.isDefusing) return patch;

  const hpRatio = bot.hp / 100;
  if (hpRatio < 0.3 && !bombState.bombPlanted) {
    bot.botState = "retreat";
    const path = botPath(bot.botLane, bot.team);
    const back = path[0] ?? SPAWN[bot.team];
    walkTo(bot, back, bot.botSpeed * 0.75, dt);
    return patch;
  }

  if (bot.team === "T" && bombState.bombDropped && !bot.hasBomb) {
    const drop = { x: bombState.bombDropX, z: bombState.bombDropZ };
    if (dist(bot, drop) < 2) {
      bot.hasBomb = true;
      addPatch({ bombDropped: false, bombDropX: 0, bombDropZ: 0 });
    } else {
      bot.botState = "patrol";
      walkTo(bot, drop, bot.botSpeed * 0.9, dt);
      return patch;
    }
  }

  if (bot.team === "T" && bot.hasBomb && !bombState.bombPlanted) {
    const siteKey = (bot.plantSite === "B" ? "B" : "A") as "A" | "B";
    const site = resolveBombSites()[siteKey];
    if (distToBombSite(bot, siteKey) <= site.radius) {
      bot.isPlanting = true;
      bot.plantProgress = 0;
      bot.plantSite = siteKey;
      bot.botState = "plant";
      return patch;
    }
    bot.botState = "plant";
    const cleared = alliesNearSite(bot, players, siteKey, 12) >= 1;
    const rush = cleared || bot.botRole === "entry";
    walkTo(bot, site, bot.botSpeed * (rush ? 0.95 : 0.72), dt);
    const blocker = canShoot ? nearestEnemy(bot, players, 8) : null;
    if (blocker) fireAt(bot, blocker, dt, now, queueReload, addPatch);
    return patch;
  }

  if (bot.team === "T" && !bot.hasBomb && !bombState.bombPlanted && bot.botRole === "support") {
    const carrier = bombCarrier(players);
    if (carrier && dist(bot, carrier) > 4.5) {
      bot.botState = "patrol";
      walkTo(bot, { x: carrier.x, z: carrier.z }, bot.botSpeed * 0.9, dt);
      const peek = canShoot ? nearestEnemy(bot, players, 10) : null;
      if (peek) fireAt(bot, peek, dt, now, queueReload, addPatch);
      return patch;
    }
  }

  if (bombState.bombPlanted) {
    const siteKey = plantedSite(bombState);
    const site = resolveBombSites()[siteKey];
    const toSite = distToBombSite(bot, siteKey);
    const closeThreat = nearestEnemy(bot, players, 9);

    if (bot.team === "CT") {
      const runner = bot.botRole === "runner" || bot.botRole === "entry";
      const mustDefuse = bombState.bombTimeLeft < 8 || !closeThreat;
      if (toSite <= site.radius && mustDefuse && (runner || bombState.bombTimeLeft < 12)) {
        bot.isDefusing = true;
        bot.botState = "defuse";
        return patch;
      }
      if (closeThreat && bombState.bombTimeLeft > 8 && !runner) {
        engageTarget(bot, closeThreat, dt, now, queueReload, addPatch);
        return patch;
      }
      bot.botState = "defuse";
      if (toSite < 5 && !runner) {
        orbitAround(bot, site, dt, 4.2);
        if (closeThreat) fireAt(bot, closeThreat, dt, now, queueReload, addPatch);
        return patch;
      }
      walkTo(bot, site, bot.botSpeed * (runner ? 1.0 : 0.9), dt);
      return patch;
    }

    if (toSite > 8 && !closeThreat) {
      bot.botState = "hold";
      walkTo(bot, site, bot.botSpeed * 0.9, dt);
      return patch;
    }
  }

  const tgt = nearestEnemy(bot, players);
  if (!tgt) {
    if (bot.team === "CT" && !bombState.bombPlanted) {
      const laneSite = bot.botLane === "B" ? "B" : bot.botLane === "A" ? "A" : nearestHoldSite(bot);
      const site = resolveBombSites()[laneSite];
      if (distToBombSite(bot, laneSite) < 6) {
        bot.botState = "hold";
        bot.botTargetId = null;
        orbitAround(bot, site, dt, bot.botRole === "flanker" ? 5.5 : 3.2);
        return patch;
      }
      bot.botState = "patrol";
      walkTo(bot, site, bot.botSpeed * (bot.botRole === "entry" ? 1.0 : 0.85), dt);
      return patch;
    }

    bot.botTargetId = null;
    bot.botState = "patrol";
    const lane: BotLane = bot.hasBomb ? (bot.plantSite === "B" ? "B" : "A") : bot.botLane;
    const path = botPath(lane, bot.team);
    bot.botWp = nextWaypointIndex(bot, path, bot.botWp);
    const wp = path[bot.botWp] ?? path[path.length - 1];
    walkTo(bot, wp, bot.botSpeed * 0.85, dt);
    return patch;
  }

  engageTarget(bot, tgt, dt, now, queueReload, addPatch);
  return patch;
}

function nearestHoldSite(bot: LocalPlayer): "A" | "B" {
  return distToBombSite(bot, "A") <= distToBombSite(bot, "B") ? "A" : "B";
}

function engageTarget(
  bot: LocalPlayer,
  tgt: LocalPlayer,
  dt: number,
  now: number,
  queueReload: ((botId: string, duration: number) => void) | undefined,
  addPatch: (extra: BombPatch) => void,
) {
  bot.botTargetId = tgt.id;
  bot.botState = "engage";
  const dx = tgt.x - bot.x;
  const dz = tgt.z - bot.z;
  const dd = Math.hypot(dx, dz);

  const err = (1 - bot.botAccuracy) * (Math.random() - 0.5) * 0.3;
  bot.rotationY = Math.atan2(dx, dz) + err;

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
  const role = bot.botRole;
  let dest: { x: number; z: number };
  if (role === "entry") {
    dest = {
      x: bot.x + (dx / Math.max(dd, 0.01)) * 2.4 + perpX * bot.botStrafeDir * 1.4,
      z: bot.z + (dz / Math.max(dd, 0.01)) * 2.4 + perpZ * bot.botStrafeDir * 1.4,
    };
  } else if (role === "flanker" && dd < 14) {
    dest = {
      x: bot.x - (dx / Math.max(dd, 0.01)) * 2.2 + perpX * bot.botStrafeDir * 2.0,
      z: bot.z - (dz / Math.max(dd, 0.01)) * 2.2 + perpZ * bot.botStrafeDir * 2.0,
    };
  } else if (cover) {
    dest = peek
      ? {
          x: cover.x + safeDiv(dx, dd) * 1.7 + perpX * bot.botStrafeDir * 1.15,
          z: cover.z + safeDiv(dz, dd) * 1.7 + perpZ * bot.botStrafeDir * 1.15,
        }
      : cover;
  } else {
    dest = {
      x: bot.x + perpX * bot.botStrafeDir * 2.4,
      z: bot.z + perpZ * bot.botStrafeDir * 2.4,
    };
  }
  const pace = role === "entry" ? 1.05 : role === "flanker" ? 0.7 : 0.8;
  walkTo(bot, dest, bot.botSpeed * pace, dt);
  fireAt(bot, tgt, dt, now, queueReload, addPatch);
}

function fireAt(
  bot: LocalPlayer,
  tgt: LocalPlayer,
  _dt: number,
  now: number,
  queueReload: ((botId: string, duration: number) => void) | undefined,
  addPatch: (extra: BombPatch) => void,
) {
  if (bot.isReloading) return;
  const dd = dist(bot, tgt);
  const ws = getWeaponStats(bot.currentWeapon);
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

      try {
        Sound.gunshot(bot.currentWeapon);
      } catch {
        /* audio error ignored */
      }

      const barrelDist = 0.55;
      const startX = bot.x + Math.sin(bot.rotationY) * barrelDist + Math.cos(bot.rotationY) * 0.2;
      const startY = 1.15;
      const startZ = bot.z + Math.cos(bot.rotationY) * barrelDist - Math.sin(bot.rotationY) * 0.2;

      let endX = tgt.x;
      let endY = shot.headshot ? 1.55 : 1.05;
      let endZ = tgt.z;

      if (!shot.hit) {
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
          try {
            Sound.playerHurt();
          } catch {
            /* audio error ignored */
          }
          gameEvents.emit("playerHitFeedback", { shooterX: bot.x, shooterZ: bot.z, damage: dmg });
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

  if (bot.botAmmoInMag <= 5 && !bot.isReloading && bot.reserveAmmo > 0) {
    bot.isReloading = true;
    const rt = ws?.reload || 2;
    if (queueReload) {
      queueReload(bot.id, rt);
    }
  }

  if (bot.botAmmoInMag <= 0 && bot.reserveAmmo <= 0 && bot.secondaryWeapon) {
    bot.currentWeapon = bot.secondaryWeapon;
    const sws = getWeaponStats(bot.secondaryWeapon);
    if (sws) {
      bot.botAmmoInMag = sws.mag;
      bot.ammo = sws.mag;
      bot.reserveAmmo = sws.reserveAmmo;
    }
  }
}

function spawnYaw(team: "T" | "CT"): number {
  return team === "T" ? 0 : Math.PI;
}

export function mkPlayer(
  id: string,
  team: "T" | "CT",
  nickname: string,
  isBot: boolean,
  difficulty: BotDifficultyLevel = "medium",
  mapId?: string
): LocalPlayer {
  let effectiveMap = mapId;
  if (!effectiveMap) {
    try { effectiveMap = useGameStore.getState().currentMap; } catch { effectiveMap = "container_yard"; }
  }
  if (!effectiveMap) effectiveMap = "container_yard";

  // Check procedural map registry first, then fall back to shared helpers
  let sp: { x: number; y: number; z: number };
  const proc = getProceduralMapData(effectiveMap);
  if (proc) {
    const procSpawn = proc.spawns[team];
    sp = { x: procSpawn.x, y: 0, z: procSpawn.z };
  } else {
    const spawnMap = (() => { try { return getSpawnForMap(effectiveMap); } catch { return SPAWN; } })();
    sp = (spawnMap as Record<string, { x: number; y: number; z: number }>)[team] || SPAWN[team];
  }
  const pistol = DEFAULT_PISTOL[team];
  const pStats = getWeaponStats(pistol);
  const diffCfg = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const role: BotRole = isBot ? roleForBotId(id) : "support";
  const lane: BotLane = isBot ? laneForRole(role, id) : "mid";
  const pos = isBot ? spawnJitter(team) : { x: sp.x, z: sp.z };
  const speedMul = role === "entry" ? 1.12 : role === "flanker" ? 0.92 : 1;
  const viewMul = role === "flanker" ? 1.25 : role === "entry" ? 0.9 : 1;

  return {
    id,
    x: pos.x,
    y: 0,
    z: pos.z,
    rotationY: spawnYaw(team),
    hp: 100,
    isDead: false,
    team,
    nickname,
    money: 800,
    kills: 0,
    deaths: 0,
    currentWeapon: pistol,
    primaryWeapon: "",
    secondaryWeapon: pistol,
    knifeSlot: "knife",
    ammo: pStats?.mag || 20,
    reserveAmmo: pStats?.reserveAmmo || 120,
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
    botStrafeTimer: 0,
    botStrafeDuration: 0.6,
    botAmmoInMag: pStats?.mag || 20,
    botAccuracy: isBot ? diffCfg.accuracy : 0.65,
    botHsRate: isBot ? diffCfg.hsRate : 0.25,
    botSpeed: (isBot ? diffCfg.speed : 4) * speedMul,
    botViewDist: (isBot ? diffCfg.viewDist : 25) * viewMul,
    plantSite: lane === "B" ? "B" : "A",
    botLane: lane,
    botRole: role,
    botWp: 0,
  };
}

export function defaultLoadout(p: LocalPlayer) {
  const pistol = DEFAULT_PISTOL[p.team];
  const pStats = getWeaponStats(pistol);
  p.primaryWeapon = "";
  p.secondaryWeapon = pistol;
  p.knifeSlot = "knife";
  p.currentWeapon = pistol;
  p.ammo = pStats?.mag || 20;
  p.reserveAmmo = pStats?.reserveAmmo || 120;
}

export function refillAmmo(p: LocalPlayer) {
  if (p.currentWeapon && !isMeleeWeapon(p.currentWeapon)) {
    const ws = getWeaponStats(p.currentWeapon);
    if (ws) {
      p.ammo = ws.mag;
      p.reserveAmmo = ws.reserveAmmo;
    }
  }
}

export function botBuy(bot: LocalPlayer) {
  if (bot.team === "CT" && bot.money >= 400 && !bot.hasDefuseKit) {
    bot.hasDefuseKit = true;
    bot.money -= 400;
  }

  const rifle = bot.team === "T" ? "ak47" : "m4a1";
  const primary =
    bot.botRole === "entry" || bot.botRole === "runner"
      ? "mp5"
      : bot.botRole === "flanker"
        ? "awp"
        : rifle;

  const buyId = (() => {
    const wanted = getWeaponStats(primary);
    if (wanted && bot.money >= wanted.price) return primary;
    const fallback = getWeaponStats("mp5");
    if (fallback && bot.money >= fallback.price) return "mp5";
    const rif = getWeaponStats(rifle);
    if (rif && bot.money >= rif.price) return rifle;
    return null;
  })();

  if (buyId) {
    const pStats = getWeaponStats(buyId);
    if (pStats) {
      bot.primaryWeapon = buyId;
      bot.currentWeapon = buyId;
      bot.money -= pStats.price;
      bot.botAmmoInMag = pStats.mag;
      bot.ammo = pStats.mag;
      bot.reserveAmmo = pStats.reserveAmmo;
    }
  }

  if (bot.money >= 1000 && !bot.hasHelmet) {
    bot.armor = 100;
    bot.hasHelmet = true;
    bot.money -= 1000;
  } else if (bot.money >= 650 && bot.armor < 100) {
    bot.armor = 100;
    bot.money -= 650;
  }

  if (bot.money >= 700 && !bot.primaryWeapon) {
    const deagleStats = getWeaponStats("deagle");
    if (deagleStats) {
      bot.secondaryWeapon = "deagle";
      bot.currentWeapon = "deagle";
      bot.money -= 700;
      bot.botAmmoInMag = deagleStats.mag;
      bot.ammo = deagleStats.mag;
      bot.reserveAmmo = deagleStats.reserveAmmo;
    }
  }
}
