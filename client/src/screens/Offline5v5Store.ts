import { create } from "zustand";
import {
  WEAPONS,
  SPAWN,
  ROUND,
  ECONOMY,
  MAP_BOUNDARY,
  DEFAULT_PISTOL,
  isMeleeWeapon,
} from "@cs-game/shared";

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
  botState: string;
  botLastShootTime: number;
  botStrafeDir: number;
  botAmmoInMag: number;
  botAccuracy: number;
  botHsRate: number;
  botSpeed: number;
  botViewDist: number;
}

export type RoundPhase = "waiting" | "buy" | "active" | "roundEnd" | "matchEnd";

interface KillEvent {
  killerName: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
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
  isHalfTime: boolean;
  maxRounds: number;
  localPlayerId: string;
  players: Map<string, LocalPlayer>;
  killFeed: KillEvent[];
  hitEnemy: boolean;
  hitHeadshot: boolean;

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
}

function stats(weapon: string) {
  return WEAPONS[weapon as keyof typeof WEAPONS] || null;
}

function clamp(p: { x: number; z: number }) {
  p.x = Math.max(MAP_BOUNDARY.minX + 1, Math.min(MAP_BOUNDARY.maxX - 1, p.x));
  p.z = Math.max(MAP_BOUNDARY.minZ + 1, Math.min(MAP_BOUNDARY.maxZ - 1, p.z));
}

function d(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
}

function mkPlayer(id: string, team: "T" | "CT", nickname: string, isBot: boolean): LocalPlayer {
  const sp = SPAWN[team];
  const pistol = DEFAULT_PISTOL[team as keyof typeof DEFAULT_PISTOL] ?? "glock";
  const ws = stats(pistol);
  return {
    id, x: sp.x + (isBot ? (Math.random() - 0.5) * 8 : 0), y: 0,
    z: sp.z + (isBot ? (Math.random() - 0.5) * 8 : 0), rotationY: 0,
    hp: 100, isDead: false, team, nickname, money: ECONOMY.startMoney,
    kills: 0, deaths: 0, currentWeapon: pistol, primaryWeapon: "",
    secondaryWeapon: pistol, knifeSlot: "knife",
    ammo: ws?.mag || 20, reserveAmmo: ws?.reserveAmmo || 120,
    armor: 0, hasHelmet: false, hasDefuseKit: false,
    grenadeHE: 0, grenadeSmoke: 0, grenadeFlash: 0,
    hasBomb: false, isBot, isReloading: false, isPlanting: false,
    isDefusing: false, plantProgress: 0, defuseProgress: 0,
    botTargetId: null, botState: "idle", botLastShootTime: 0,
    botStrafeDir: 1, botAmmoInMag: ws?.mag || 20,
    botAccuracy: 0.65, botHsRate: 0.25, botSpeed: 4, botViewDist: 25,
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
  const pr = stats(p.primaryWeapon);
  const sc = stats(p.secondaryWeapon);
  const cur = stats(p.currentWeapon);
  if (pr) { p.ammo = pr.mag; p.reserveAmmo = pr.reserveAmmo; }
  else if (sc) { p.ammo = sc.mag; p.reserveAmmo = sc.reserveAmmo; }
  if (cur && !isMeleeWeapon(p.currentWeapon)) { p.ammo = cur.mag; p.reserveAmmo = cur.reserveAmmo; }
}

function botThink(bot: LocalPlayer, players: Map<string, LocalPlayer>, dt: number, now: number) {
  if (bot.isDead || bot.isReloading) return;

  // Sync ammo from player state after buy
  if (bot.botAmmoInMag <= 0 && bot.ammo > 0) {
    bot.botAmmoInMag = bot.ammo;
  }

  // Find nearest enemy
  let nearestId: string | null = null;
  let nearestDist = Infinity;
  players.forEach((o, id) => {
    if (id === bot.id || o.isDead || o.team === bot.team) return;
    const dd = d(bot, o);
    if (dd < bot.botViewDist && dd < nearestDist) { nearestId = id; nearestDist = dd; }
  });

  if (nearestId) {
    bot.botTargetId = nearestId;
    bot.botState = "engage";
    const tgt = players.get(nearestId)!;
    const dx = tgt.x - bot.x, dz = tgt.z - bot.z;
    const dd = Math.sqrt(dx * dx + dz * dz);

    // Aim at target with accuracy error
    const err = (1 - bot.botAccuracy) * (Math.random() - 0.5) * 0.3;
    bot.rotationY = Math.atan2(dx, dz) + err;

    // ─── Movement: strafe left-right like CS:GO ───
    const perpX = -dz / dd;
    const perpZ = dx / dd;
    const strafeSpeed = bot.botSpeed * 0.45;
    const rushSpeed = bot.botSpeed * 0.7;

    // Cycle strafe: hold each direction 0.6-1.2s before switching
    if (now % 2000 < 100) {
      // Periodic strafe direction flip (every ~1s based on hash)
      bot.botStrafeDir = ((now / 800) | 0) % 2 === 0 ? 1 : -1;
    }

    if (dd > 18) {
      // Far away: rush forward + slight strafe
      bot.x += (dx / dd) * rushSpeed * dt;
      bot.z += (dz / dd) * rushSpeed * dt;
      bot.x += perpX * bot.botStrafeDir * strafeSpeed * 0.5 * dt;
      bot.z += perpZ * bot.botStrafeDir * strafeSpeed * 0.5 * dt;
    } else if (dd > 8) {
      // Medium range: full strafe (A-D-A-D pattern)
      bot.x += perpX * bot.botStrafeDir * strafeSpeed * dt;
      bot.z += perpZ * bot.botStrafeDir * strafeSpeed * dt;
      // Slight forward/back micro-adjustment
      if (dd > 12) {
        bot.x += (dx / dd) * rushSpeed * 0.2 * dt;
        bot.z += (dz / dd) * rushSpeed * 0.2 * dt;
      } else if (dd < 10) {
        bot.x -= (dx / dd) * rushSpeed * 0.15 * dt;
        bot.z -= (dz / dd) * rushSpeed * 0.15 * dt;
      }
    } else if (dd > 4) {
      // Close-mid: aggressive strafe
      bot.x += perpX * bot.botStrafeDir * strafeSpeed * 1.2 * dt;
      bot.z += perpZ * bot.botStrafeDir * strafeSpeed * 1.2 * dt;
    } else {
      // Too close: back away + strafe
      bot.x -= (dx / dd) * rushSpeed * 0.5 * dt;
      bot.z -= (dz / dd) * rushSpeed * 0.5 * dt;
      bot.x += perpX * bot.botStrafeDir * strafeSpeed * dt;
      bot.z += perpZ * bot.botStrafeDir * strafeSpeed * dt;
    }
    clamp(bot);

    // ─── Shooting ───
    const ws = stats(bot.currentWeapon);
    if (ws && bot.botAmmoInMag > 0) {
      const isSniper = bot.currentWeapon === "awp";
      const fi = isSniper ? 1400 : 1000 / ws.fireRate;

      if (now - bot.botLastShootTime > fi) {
        // First shot has better accuracy
        const distPenalty = Math.min(dd / bot.botViewDist, 0.5);
        const shootChance = bot.botAccuracy * (1 - distPenalty * 0.3);

        if (Math.random() < shootChance) {
          const hs = Math.random() < bot.botHsRate;
          const dmg = hs ? ws.headshot : ws.dmg;
          tgt.hp -= dmg;
          if (tgt.hp <= 0) { tgt.hp = 0; tgt.isDead = true; bot.kills++; tgt.deaths++; }
          bot.botAmmoInMag--;
          bot.ammo = bot.botAmmoInMag;
          bot.botLastShootTime = now;
        }
      }
    }

    // ─── Reload when low ───
    if (bot.botAmmoInMag <= 5 && !bot.isReloading && bot.reserveAmmo > 0) {
      bot.isReloading = true;
      const rt = (ws?.reload || 2) * 1000;
      setTimeout(() => {
        if (bot.isDead) return;
        const magSize = ws?.mag || 30;
        const need = magSize - bot.botAmmoInMag;
        const load = Math.min(need, bot.reserveAmmo);
        bot.botAmmoInMag += load;
        bot.reserveAmmo -= load;
        bot.ammo = bot.botAmmoInMag;
        bot.reserveAmmo = bot.reserveAmmo;
        bot.isReloading = false;
      }, rt);
    }

    // ─── Switch to pistol if primary empty and has no reserve ───
    if (bot.botAmmoInMag <= 0 && bot.reserveAmmo <= 0 && bot.secondaryWeapon) {
      bot.currentWeapon = bot.secondaryWeapon;
      const sws = stats(bot.secondaryWeapon);
      if (sws) { bot.botAmmoInMag = sws.mag; bot.ammo = sws.mag; bot.reserveAmmo = sws.reserveAmmo; }
    }

  } else {
    // ─── Patrol: smart movement with random zigzag ───
    bot.botTargetId = null;
    bot.botState = "patrol";

    // Pick target: push toward enemy spawn or bomb site
    let tgtX: number, tgtZ: number;
    if (bot.hasBomb) {
      // Move toward bombsite A or B
      tgtX = bot.team === "T" ? (Math.random() < 0.5 ? 15 : 12) : SPAWN.T.x;
      tgtZ = bot.team === "T" ? (Math.random() < 0.5 ? -15 : 15) : SPAWN.T.z;
    } else {
      const enemySpawn = bot.team === "T" ? SPAWN.CT : SPAWN.T;
      tgtX = enemySpawn.x;
      tgtZ = enemySpawn.z;
    }

    const dx = tgtX - bot.x, dz = tgtZ - bot.z;
    const dd = Math.sqrt(dx * dx + dz * dz);

    if (dd > 3) {
      const moveSpeed = bot.botSpeed * 0.6;
      // Forward movement
      bot.x += (dx / dd) * moveSpeed * dt;
      bot.z += (dz / dd) * moveSpeed * dt;

      // Zigzag perpendicular movement
      const perpX = -dz / dd;
      const perpZ = dx / dd;
      const zigzagFreq = 1.5;
      const zigzagAmp = Math.sin(now * 0.001 * zigzagFreq + bot.id.charCodeAt(4)) * 0.6;
      bot.x += perpX * zigzagAmp * moveSpeed * dt;
      bot.z += perpZ * zigzagAmp * moveSpeed * dt;

      bot.rotationY = Math.atan2(dx, dz);
    }
    clamp(bot);
  }
}

function botBuy(bot: LocalPlayer) {
  let m = bot.money;

  // Always buy armor if can afford
  if (bot.armor < 100 && m >= 650) {
    if (m >= 1000 && !bot.hasHelmet) {
      bot.armor = 100; bot.hasHelmet = true; m -= 1000;
    } else {
      bot.armor = 100; m -= 650;
    }
  }

  // Buy primary weapon
  if (!bot.primaryWeapon) {
    const wk = bot.team === "T" ? "ak47" : "m4a1";
    const ws = stats(wk);
    if (ws && m >= ws.price) {
      bot.primaryWeapon = wk; m -= ws.price;
    } else if (m >= 1500) {
      bot.primaryWeapon = "mp5"; m -= 1500;
    } else if (m >= 700) {
      // Upgrade to deagle as primary if can't afford rifle/SMG
      bot.primaryWeapon = ""; // stay with pistol
    }
  }

  // Buy secondary (deagle) if no secondary
  if (!bot.secondaryWeapon || bot.secondaryWeapon === "") {
    if (m >= 700) { bot.secondaryWeapon = "deagle"; m -= 700; }
    else if (m >= 200) { bot.secondaryWeapon = "glock"; m -= 200; }
  }

  // Buy grenades
  if (m >= 300 && bot.grenadeHE < 1) { bot.grenadeHE++; m -= 300; }
  if (m >= 200 && bot.grenadeFlash < 2) { bot.grenadeFlash++; m -= 200; }
  if (m >= 300 && bot.grenadeSmoke < 1) { bot.grenadeSmoke++; m -= 300; }

  // CT: buy defuse kit
  if (bot.team === "CT" && m >= 400 && !bot.hasDefuseKit) {
    bot.hasDefuseKit = true; m -= 400;
  }

  bot.money = m;

  // ─── Equip weapon after buy ───
  if (bot.primaryWeapon) {
    bot.currentWeapon = bot.primaryWeapon;
    const ws = stats(bot.primaryWeapon);
    if (ws) {
      bot.ammo = ws.mag;
      bot.reserveAmmo = ws.reserveAmmo;
      bot.botAmmoInMag = ws.mag;
    }
  } else {
    // No primary bought, use secondary
    bot.currentWeapon = bot.secondaryWeapon || "glock";
    const ws = stats(bot.currentWeapon);
    if (ws) {
      bot.ammo = ws.mag;
      bot.reserveAmmo = ws.reserveAmmo;
      bot.botAmmoInMag = ws.mag;
    }
  }
}

export const useOffline5v5Store = create<OfflineGameState>()((set, get) => ({
  phase: "waiting", roundNumber: 1, teamRedScore: 0, teamBlueScore: 0,
  roundTimeLeft: ROUND.activePhaseDuration, buyPhaseTimeLeft: ROUND.buyPhaseDuration,
  roundEndTimer: 0, bombPlanted: false, bombTimeLeft: 0, bombSite: "",
  isHalfTime: false, maxRounds: ROUND.maxRounds, localPlayerId: "local",
  players: new Map(), killFeed: [], hitEnemy: false, hitHeadshot: false,

  initMatch: (nickname: string, team: "T" | "CT") => {
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
      phase: "buy", roundNumber: 1, teamRedScore: 0, teamBlueScore: 0,
      roundTimeLeft: ROUND.activePhaseDuration, buyPhaseTimeLeft: ROUND.buyPhaseDuration,
      bombPlanted: false, bombTimeLeft: 0, bombSite: "", isHalfTime: false,
      players, killFeed: [],
    });

    setTimeout(() => {
      const s = get();
      if (s.phase === "buy") {
        s.players.forEach((p) => { if (p.isBot) botBuy(p); });
        set({ phase: "active", roundTimeLeft: ROUND.activePhaseDuration });
      }
    }, 1000);
  },

  tick: (dt: number) => {
    const s = get();
    if (s.phase === "buy") {
      const newTime = s.buyPhaseTimeLeft - dt;
      if (newTime <= 0) {
        s.players.forEach((p) => { if (p.isBot) botBuy(p); });
        set({ phase: "active", buyPhaseTimeLeft: 0, roundTimeLeft: ROUND.activePhaseDuration });
      } else {
        set({ buyPhaseTimeLeft: newTime });
      }
      return;
    }

    if (s.phase === "roundEnd") {
      const newTime = s.roundEndTimer - dt;
      if (newTime <= 0) {
        const nextRound = s.roundNumber + 1;
        const isHalf = !s.isHalfTime && nextRound > Math.floor(ROUND.maxRounds / 2);
        set({ roundNumber: nextRound, isHalfTime: isHalf || s.isHalfTime });
        get().resetForRound();
      } else {
        set({ roundEndTimer: newTime });
      }
      return;
    }

    if (s.phase !== "active") return;

    const newTime = s.roundTimeLeft - dt;
    const now = Date.now();

    // Update bots
    const players = new Map(s.players);
    players.forEach((p) => {
      if (p.isBot && !p.isDead) botThink(p, players, dt, now);
    });

    // Bomb timer
    let bombPlanted = s.bombPlanted;
    let bombTimeLeft = s.bombTimeLeft;
    let bombSite = s.bombSite;
    if (bombPlanted) {
      bombTimeLeft -= dt;
      if (bombTimeLeft <= 0) {
        set({ phase: "active", bombPlanted: false, bombTimeLeft: 0 });
        get().endRound("T");
        return;
      }
    }

    // Plant progress
    players.forEach((p) => {
      if (p.isPlanting) {
        p.plantProgress += dt / 3;
        if (p.plantProgress >= 1) {
          p.isPlanting = false;
          p.plantProgress = 0;
          bombPlanted = true;
          bombTimeLeft = 40;
          bombSite = p.team === "T" ? (Math.random() < 0.5 ? "A" : "B") : bombSite;
          p.hasBomb = false;
        }
      }
      if (p.isDefusing) {
        p.defuseProgress += dt / (p.hasDefuseKit ? 5 : 10);
        if (p.defuseProgress >= 1) {
          p.isDefusing = false;
          p.defuseProgress = 0;
          set({ bombPlanted: false, bombTimeLeft: 0 });
          get().endRound("CT");
          return;
        }
      }
    });

    // Round timeout
    if (newTime <= 0 && !bombPlanted) {
      set({ players });
      get().endRound("CT");
      return;
    }

    // Check elimination
    let aliveT = 0, aliveCT = 0;
    players.forEach((p) => { if (!p.isDead) { if (p.team === "T") aliveT++; else aliveCT++; } });

    set({ players, roundTimeLeft: Math.max(0, newTime), bombPlanted, bombTimeLeft, bombSite });

    if (aliveT === 0 && !bombPlanted) { get().endRound("CT"); return; }
    if (aliveCT === 0) { get().endRound("T"); return; }
  },

  setLocalPos: (x: number, z: number, rotY: number) => {
    const s = get();
    const p = s.players.get("local");
    if (p) { p.x = x; p.z = z; p.rotationY = rotY; set({ players: new Map(s.players) }); }
  },

  localShoot: (targetId: string | null, headshot: boolean) => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.isReloading) return;
    const ws = stats(me.currentWeapon);
    if (!ws || me.ammo <= 0) return;

    me.ammo--;

    if (targetId) {
      const victim = s.players.get(targetId);
      if (victim && !victim.isDead && victim.team !== me.team) {
        const dmg = headshot ? ws.headshot : ws.dmg;
        victim.hp -= dmg;
        const hs = headshot;
        set({ hitEnemy: true, hitHeadshot: hs });
        if (victim.hp <= 0) {
          victim.hp = 0; victim.isDead = true;
          me.kills++; victim.deaths++;
          const kf = [...s.killFeed, { killerName: me.nickname, victimName: victim.nickname, weapon: me.currentWeapon, headshot: hs, timestamp: Date.now() }].slice(0, 5);
          set({ players: new Map(s.players), killFeed: kf });
          get().checkRoundEnd();
          return;
        }
      }
    }
    set({ players: new Map(s.players) });
  },

  localBuy: (item: string) => {
    const s = get();
    if (s.phase !== "buy") return false;
    const me = s.players.get("local");
    if (!me) return false;
    const ws = stats(item);
    if (ws) {
      if (ws.price > me.money) return false;
      if (ws.team !== "both" && ws.team !== me.team) return false;
      me.money -= ws.price;
      if (item === "ak47" || item === "m4a1" || item === "awp" || item === "mp5") {
        me.primaryWeapon = item;
        me.currentWeapon = item;
        me.ammo = ws.mag; me.reserveAmmo = ws.reserveAmmo;
      } else if (item === "deagle" || item === "glock" || item === "tec9" || item === "autopistol") {
        me.secondaryWeapon = item;
        me.currentWeapon = item;
        me.ammo = ws.mag; me.reserveAmmo = ws.reserveAmmo;
      }
      set({ players: new Map(s.players) });
      return true;
    }
    if (item === "kevlar" && me.money >= 650) { me.armor = 100; me.money -= 650; set({ players: new Map(s.players) }); return true; }
    if (item === "helmet" && me.money >= 1000) { me.armor = 100; me.hasHelmet = true; me.money -= 1000; set({ players: new Map(s.players) }); return true; }
    if (item === "defuseKit" && me.money >= 400 && me.team === "CT") { me.hasDefuseKit = true; me.money -= 400; set({ players: new Map(s.players) }); return true; }
    if (item === "grenadeHE" && me.money >= 300) { me.grenadeHE++; me.money -= 300; set({ players: new Map(s.players) }); return true; }
    if (item === "grenadeSmoke" && me.money >= 300) { me.grenadeSmoke++; me.money -= 300; set({ players: new Map(s.players) }); return true; }
    if (item === "grenadeFlash" && me.money >= 200) { me.grenadeFlash++; me.money -= 200; set({ players: new Map(s.players) }); return true; }
    return false;
  },

  localReload: () => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.isReloading) return;
    const ws = stats(me.currentWeapon);
    if (!ws || me.ammo >= ws.mag || me.reserveAmmo <= 0) return;
    me.isReloading = true;
    set({ players: new Map(s.players) });
    setTimeout(() => {
      const p = get().players.get("local");
      if (!p) return;
      const needed = ws.mag - p.ammo;
      const load = Math.min(needed, p.reserveAmmo);
      p.ammo += load; p.reserveAmmo -= load; p.isReloading = false;
      set({ players: new Map(get().players) });
    }, ws.reload * 1000);
  },

  localPlantStart: (_site: string) => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.team !== "T" || !me.hasBomb || s.bombPlanted) return;
    me.isPlanting = true; me.plantProgress = 0;
    set({ players: new Map(s.players) });
  },

  localPlantCancel: () => {
    const s = get();
    const me = s.players.get("local");
    if (me) { me.isPlanting = false; me.plantProgress = 0; set({ players: new Map(s.players) }); }
  },

  localDefuseStart: () => {
    const s = get();
    const me = s.players.get("local");
    if (!me || me.isDead || me.team !== "CT" || !s.bombPlanted) return;
    me.isDefusing = true; me.defuseProgress = 0;
    set({ players: new Map(s.players) });
  },

  localDefuseCancel: () => {
    const s = get();
    const me = s.players.get("local");
    if (me) { me.isDefusing = false; me.defuseProgress = 0; set({ players: new Map(s.players) }); }
  },

  localSwitchWeapon: (slot: number) => {
    const s = get();
    const me = s.players.get("local");
    if (!me) return;
    if (slot === 1 && me.primaryWeapon) me.currentWeapon = me.primaryWeapon;
    else if (slot === 2) me.currentWeapon = me.secondaryWeapon;
    else if (slot === 3) me.currentWeapon = me.knifeSlot;
    const ws = stats(me.currentWeapon);
    if (ws) { me.ammo = isMeleeWeapon(me.currentWeapon) ? 0 : ws.mag; me.reserveAmmo = isMeleeWeapon(me.currentWeapon) ? 0 : ws.reserveAmmo; }
    me.isReloading = false;
    set({ players: new Map(s.players) });
  },

  clearHit: () => set({ hitEnemy: false, hitHeadshot: false }),

  checkRoundEnd: () => {
    const s = get();
    if (s.phase !== "active") return;
    let aliveT = 0, aliveCT = 0;
    s.players.forEach((p) => { if (!p.isDead) { if (p.team === "T") aliveT++; else aliveCT++; } });
    if (aliveT === 0 && !s.bombPlanted) { get().endRound("CT"); return; }
    if (aliveCT === 0) { get().endRound("T"); return; }
  },

  endRound: (winner: "T" | "CT") => {
    const s = get();
    if (s.phase === "roundEnd" || s.phase === "matchEnd") return;
    const tScore = s.teamRedScore + (winner === "T" ? 1 : 0);
    const ctScore = s.teamBlueScore + (winner === "CT" ? 1 : 0);
    const target = s.maxRounds / 2;
    if (tScore >= target || ctScore >= target) {
      set({ phase: "matchEnd", teamRedScore: tScore, teamBlueScore: ctScore });
      return;
    }
    // Give money
    s.players.forEach((p) => {
      if (p.team === winner) p.money = Math.min(p.money + ECONOMY.roundWinBonus, ECONOMY.maxMoney);
      else p.money = Math.min(p.money + ECONOMY.lossBonus1, ECONOMY.maxMoney);
    });
    set({ phase: "roundEnd", teamRedScore: tScore, teamBlueScore: ctScore, roundEndTimer: ROUND.roundEndDuration, bombPlanted: false, bombTimeLeft: 0 });
  },

  resetForRound: () => {
    const s = get();
    s.players.forEach((p) => {
      p.hp = 100; p.isDead = false; p.isReloading = false;
      p.isPlanting = false; p.isDefusing = false;
      p.plantProgress = 0; p.defuseProgress = 0;
      p.hasBomb = false; p.grenadeHE = 0; p.grenadeSmoke = 0; p.grenadeFlash = 0;
      const sp = SPAWN[p.team as keyof typeof SPAWN];
      p.x = sp.x + (p.isBot ? (Math.random() - 0.5) * 8 : 0);
      p.z = sp.z + (p.isBot ? (Math.random() - 0.5) * 8 : 0);
      if (p.isBot) {
        defaultLoadout(p);
        p.botAmmoInMag = p.ammo;
      } else {
        refillAmmo(p);
      }
    });
    const local = s.players.get("local");
    if (local && local.team === "T") local.hasBomb = true;
    set({
      phase: "buy", bombPlanted: false, bombTimeLeft: 0, bombSite: "",
      buyPhaseTimeLeft: ROUND.buyPhaseDuration, roundTimeLeft: ROUND.activePhaseDuration,
      players: new Map(s.players),
    });
    setTimeout(() => {
      const s2 = get();
      if (s2.phase === "buy") {
        s2.players.forEach((p) => { if (p.isBot) botBuy(p); });
        set({ phase: "active", roundTimeLeft: ROUND.activePhaseDuration });
      }
    }, 1000);
  },
}));
