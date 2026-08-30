import { Sound } from "../../components/AudioManager";
import { useGameStore } from "../../stores/useGameStore";
import { gameEvents } from "../../lib/gameEvents";
import {
  SPAWN,
  DEFAULT_PISTOL,
  isMeleeWeapon,
  BOMB_SITES,
} from "@cs-game/shared";
import {
  clampToMap,
  distToBombSite,
  fireIntervalMs,
  hasLineOfSight,
  hideBehindCover,
  botPath,
  nextWaypointIndex,
  resolveBotShot,
  steerAroundObstacles,
  stepToward,
  type BotLane,
} from "./offlineCombat";
import { getWeaponStats } from "./EconomySystem";
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

function clamp(p: { x: number; z: number }) {
  const c = clampToMap(p);
  p.x = c.x;
  p.z = c.z;
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function spawnYaw(team: "T" | "CT"): number {
  return team === "T" ? 0 : Math.PI;
}

export function mkPlayer(
  id: string,
  team: "T" | "CT",
  nickname: string,
  isBot: boolean,
  difficulty: BotDifficultyLevel = "medium"
): LocalPlayer {
  const sp = SPAWN[team];
  const pistol = DEFAULT_PISTOL[team];
  const pStats = getWeaponStats(pistol);
  const diffCfg = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;

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
    botSpeed: isBot ? diffCfg.speed : 4,
    botViewDist: isBot ? diffCfg.viewDist : 25,
    plantSite: "A",
    botLane: "mid",
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

  const pri = bot.team === "T" ? "ak47" : "m4a1";
  const pStats = getWeaponStats(pri);
  if (pStats && bot.money >= pStats.price) {
    bot.primaryWeapon = pri;
    bot.currentWeapon = pri;
    bot.money -= pStats.price;
    bot.botAmmoInMag = pStats.mag;
    bot.ammo = pStats.mag;
    bot.reserveAmmo = pStats.reserveAmmo;
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

export function botThink(
  bot: LocalPlayer,
  players: Map<string, LocalPlayer>,
  dt: number,
  now: number,
  bombState: BombState,
  queueReload?: (botId: string, duration: number) => void
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

      // Bot Gunshot Audio & Tracer VFX
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
          // Emit typed gameEvents and fallback window event
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

  // Reload: frame-based instead of setTimeout (P0.4 fix)
  if (bot.botAmmoInMag <= 5 && !bot.isReloading && bot.reserveAmmo > 0) {
    bot.isReloading = true;
    const rt = ws?.reload || 2;
    if (queueReload) {
      queueReload(bot.id, rt);
    }
  }

  // Switch to pistol when out of ammo
  if (bot.botAmmoInMag <= 0 && bot.reserveAmmo <= 0 && bot.secondaryWeapon) {
    bot.currentWeapon = bot.secondaryWeapon;
    const sws = getWeaponStats(bot.secondaryWeapon);
    if (sws) {
      bot.botAmmoInMag = sws.mag;
      bot.ammo = sws.mag;
      bot.reserveAmmo = sws.reserveAmmo;
    }
  }

  return patch;
}
