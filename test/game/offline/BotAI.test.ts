import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../client/src/stores/useGameStore", () => ({
  useGameStore: {
    getState: () => ({
      currentMap: "container_yard",
      setTracerEvent: vi.fn(),
    }),
    setState: vi.fn(),
  },
}));

vi.mock("../../../client/src/components/AudioManager", () => ({
  Sound: {
    gunshot: vi.fn(),
    fleshHit: vi.fn(),
    playerHurt: vi.fn(),
  },
}));

vi.mock("../../../client/src/lib/gameEvents", () => ({
  gameEvents: { emit: vi.fn() },
}));

vi.mock("../../../client/src/game/offline/botNav", () => ({
  navigateTo: vi.fn((_id: string, from: any, to: any, speed: number, dt: number) => ({
    x: from.x + (to.x - from.x) * Math.min(1, speed * dt),
    z: from.z + (to.z - from.z) * Math.min(1, speed * dt),
  })),
  resetBotNav: vi.fn(),
  spawnJitter: vi.fn(() => ({ x: 0, z: 0 })),
}));

const mockResolveTeamSpawn = vi.fn(() => ({ x: 0, z: 0 }));
const mockBotPath = vi.fn(() => [{ x: 0, z: -20 }, { x: 10, z: -15 }, { x: 20, z: -10 }]);
const mockResolveBombSites = vi.fn(() => ({ A: { x: 20, z: -15, radius: 4 }, B: { x: -20, z: -15, radius: 4 } }));
const mockDistToBombSite = vi.fn(() => 999);
const mockHasLineOfSight = vi.fn(() => true);
const mockHideBehindCover = vi.fn(() => null);
const mockFireIntervalMs = vi.fn(() => 100);
const mockNextWaypointIndex = vi.fn(() => 0);
const mockResolveBotShot = vi.fn(() => ({ hit: false, headshot: false }));
const mockSpawnCameraYaw = vi.fn(() => 0);

vi.mock("../../../client/src/game/offline/offlineCombat", () => ({
  resolveTeamSpawn: (...a: any[]) => mockResolveTeamSpawn(...a),
  roleForBotId: vi.fn(() => "support"),
  laneForRole: vi.fn(() => "mid"),
  botPath: (...a: any[]) => mockBotPath(...a),
  stepToward: vi.fn((from: any, to: any, speed: number, dt: number) => ({
    x: from.x + (to.x - from.x) * Math.min(1, speed * dt),
    z: from.z + (to.z - from.z) * Math.min(1, speed * dt),
  })),
  resolveBotShot: (...a: any[]) => mockResolveBotShot(...a),
  resolveBombSites: (...a: any[]) => mockResolveBombSites(...a),
  distToBombSite: (...a: any[]) => mockDistToBombSite(...a),
  hasLineOfSight: (...a: any[]) => mockHasLineOfSight(...a),
  hideBehindCover: (...a: any[]) => mockHideBehindCover(...a),
  fireIntervalMs: (...a: any[]) => mockFireIntervalMs(...a),
  spawnCameraYaw: (...a: any[]) => mockSpawnCameraYaw(...a),
  isPointBlocked: vi.fn(() => false),
  pushOutOfObstacles: vi.fn((p: any) => p),
  nextWaypointIndex: (...a: any[]) => mockNextWaypointIndex(...a),
}));

vi.mock("../../../client/src/game/offline/EconomySystem", () => ({
  getWeaponStats: vi.fn((weapon: string) => {
    const weapons: Record<string, any> = {
      glock: { dmg: 15, headshot: 30, fireRate: 10, mag: 20, reserveAmmo: 120, price: 200, reload: 2 },
      autopistol: { dmg: 15, headshot: 30, fireRate: 10, mag: 20, reserveAmmo: 120, price: 200, reload: 2 },
      ak47: { dmg: 30, headshot: 100, fireRate: 10, mag: 30, reserveAmmo: 90, price: 2700, reload: 2.5 },
      m4a1: { dmg: 28, headshot: 92, fireRate: 10, mag: 30, reserveAmmo: 90, price: 3100, reload: 2.5 },
      mp5: { dmg: 20, headshot: 72, fireRate: 12, mag: 30, reserveAmmo: 120, price: 1500, reload: 2 },
      awp: { dmg: 100, headshot: 115, fireRate: 0.7, mag: 10, reserveAmmo: 30, price: 4750, reload: 3.5 },
      deagle: { dmg: 40, headshot: 100, fireRate: 4, mag: 7, reserveAmmo: 35, price: 700, reload: 2 },
    };
    return weapons[weapon] || null;
  }),
}));

vi.mock("../../../client/src/game/offline/offlineDamage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../client/src/game/offline/offlineDamage")>();
  return { ...actual };
});

vi.mock("../../../client/src/lib/numericGuards", () => ({
  safeDiv: (a: number, b: number) => (b === 0 ? 0 : a / b),
}));

import {
  assignBombCarrier,
  defaultLoadout,
  refillAmmo,
  botBuy,
  mkPlayer,
  nearestEnemy,
  botThink,
  DIFFICULTIES,
} from "../../../client/src/game/offline/BotAI";

function mkLocalPlayer(overrides: Partial<any> = {}) {
  return {
    id: "local",
    x: 0, y: 0, z: 0, rotationY: 0,
    hp: 100, isDead: false, team: "T" as const,
    nickname: "Test", money: 800, kills: 0, deaths: 0,
    currentWeapon: "glock", primaryWeapon: "", secondaryWeapon: "glock",
    knifeSlot: "knife", ammo: 20, reserveAmmo: 120,
    armor: 0, hasHelmet: false, hasDefuseKit: false,
    grenadeHE: 0, grenadeSmoke: 0, grenadeFlash: 0, hasBomb: false,
    isBot: false, isReloading: false, isPlanting: false, isDefusing: false,
    plantProgress: 0, defuseProgress: 0,
    botTargetId: null, botState: "idle" as const, botLastShootTime: 0,
    botStrafeDir: 1, botStrafeTimer: 0, botStrafeDuration: 0.6,
    botAmmoInMag: 20, botAccuracy: 0.55, botHsRate: 0.15,
    botSpeed: 3.8, botViewDist: 26, plantSite: "A",
    botLane: "mid" as const, botRole: "support" as const, botWp: 0,
    ...overrides,
  };
}

function mkBombState(overrides: Partial<any> = {}) {
  return {
    bombPlanted: false, bombTimeLeft: 0, bombSite: "",
    bombDropped: false, bombDropX: 0, bombDropZ: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDistToBombSite.mockReturnValue(999);
  mockHasLineOfSight.mockReturnValue(true);
  mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
  mockBotPath.mockReturnValue([{ x: 0, z: -20 }, { x: 10, z: -15 }, { x: 20, z: -10 }]);
  mockResolveBombSites.mockReturnValue({ A: { x: 20, z: -15, radius: 4 }, B: { x: -20, z: -15, radius: 4 } });
});

describe("BotAI", () => {
  describe("DIFFICULTIES", () => {
    it("has 4 difficulty levels", () => {
      expect(DIFFICULTIES).toHaveProperty("easy");
      expect(DIFFICULTIES).toHaveProperty("medium");
      expect(DIFFICULTIES).toHaveProperty("hard");
      expect(DIFFICULTIES).toHaveProperty("expert");
    });

    it("easy has lowest accuracy", () => {
      expect(DIFFICULTIES.easy.accuracy).toBeLessThan(DIFFICULTIES.hard.accuracy);
    });

    it("expert has highest accuracy", () => {
      expect(DIFFICULTIES.expert.accuracy).toBeGreaterThan(DIFFICULTIES.hard.accuracy);
    });

    it("expert has highest headshot rate", () => {
      expect(DIFFICULTIES.expert.hsRate).toBeGreaterThan(DIFFICULTIES.hard.hsRate);
    });

    it("easy has slowest speed", () => {
      expect(DIFFICULTIES.easy.speed).toBeLessThan(DIFFICULTIES.hard.speed);
    });

    it("expert has fastest speed", () => {
      expect(DIFFICULTIES.expert.speed).toBeGreaterThan(DIFFICULTIES.hard.speed);
    });
  });

  describe("assignBombCarrier", () => {
    it("gives bomb to local T player", () => {
      const players = new Map<string, any>();
      const local = mkLocalPlayer({ team: "T" });
      players.set("local", local);
      assignBombCarrier(players);
      expect(local.hasBomb).toBe(true);
    });

    it("gives bomb to T bot if no local T", () => {
      const players = new Map<string, any>();
      const bot = mkLocalPlayer({ id: "bot1", isBot: true, team: "T", botRole: "runner" });
      players.set("bot1", bot);
      assignBombCarrier(players);
      expect(bot.hasBomb).toBe(true);
    });

    it("does not give bomb to CT", () => {
      const players = new Map<string, any>();
      const ct = mkLocalPlayer({ team: "CT" });
      players.set("local", ct);
      assignBombCarrier(players);
      expect(ct.hasBomb).toBe(false);
    });

    it("local dead T does not get bomb", () => {
      const players = new Map<string, any>();
      const local = mkLocalPlayer({ team: "T", isDead: true });
      const bot1 = mkLocalPlayer({ id: "bot1", isBot: true, team: "T", botRole: "runner" });
      players.set("local", local);
      players.set("bot1", bot1);
      assignBombCarrier(players);
      expect(local.hasBomb).toBe(false);
      expect(bot1.hasBomb).toBe(true);
    });

    it("runner is preferred carrier over other roles", () => {
      const players = new Map<string, any>();
      const support = mkLocalPlayer({ id: "bot1", isBot: true, team: "T", botRole: "support" });
      const runner = mkLocalPlayer({ id: "bot2", isBot: true, team: "T", botRole: "runner" });
      players.set("bot1", support);
      players.set("bot2", runner);
      assignBombCarrier(players);
      expect(runner.hasBomb).toBe(true);
      expect(support.hasBomb).toBe(false);
    });
  });

  describe("defaultLoadout", () => {
    it("resets to default pistol for T", () => {
      const p = mkLocalPlayer({ team: "T", primaryWeapon: "ak47", currentWeapon: "ak47", ammo: 30 });
      defaultLoadout(p);
      expect(p.primaryWeapon).toBe("");
      expect(p.currentWeapon).toBe("glock");
      expect(p.knifeSlot).toBe("knife");
    });

    it("resets to default pistol for CT", () => {
      const p = mkLocalPlayer({ team: "CT", primaryWeapon: "m4a1", currentWeapon: "m4a1" });
      defaultLoadout(p);
      expect(p.primaryWeapon).toBe("");
      expect(p.currentWeapon).toBe("autopistol");
    });

    it("resets ammo to mag size", () => {
      const p = mkLocalPlayer({ team: "T", ammo: 5, reserveAmmo: 10 });
      defaultLoadout(p);
      expect(p.ammo).toBe(20);
      expect(p.reserveAmmo).toBe(120);
    });
  });

  describe("refillAmmo", () => {
    it("refills ammo for current weapon", () => {
      const p = mkLocalPlayer({ currentWeapon: "ak47", ammo: 10, reserveAmmo: 50 });
      refillAmmo(p);
      expect(p.ammo).toBe(30);
      expect(p.reserveAmmo).toBe(90);
    });

    it("does nothing for knife", () => {
      const p = mkLocalPlayer({ currentWeapon: "knife", ammo: 0, reserveAmmo: 0 });
      refillAmmo(p);
      expect(p.ammo).toBe(0);
    });
  });

  describe("mkPlayer", () => {
    it("creates a T player with correct spawn", () => {
      const p = mkPlayer("local", "T", "TestPlayer", false, "medium", "container_yard");
      expect(p.team).toBe("T");
      expect(p.nickname).toBe("TestPlayer");
      expect(p.isBot).toBe(false);
      expect(p.hp).toBe(100);
      expect(p.money).toBe(800);
    });

    it("creates a CT bot", () => {
      const p = mkPlayer("bot1", "CT", "Bot1", true, "easy", "container_yard");
      expect(p.team).toBe("CT");
      expect(p.isBot).toBe(true);
      expect(p.botAccuracy).toBe(DIFFICULTIES.easy.accuracy);
    });

    it("creates expert bot with high accuracy", () => {
      const p = mkPlayer("bot1", "T", "Bot1", true, "expert", "container_yard");
      expect(p.botAccuracy).toBe(DIFFICULTIES.expert.accuracy);
    });

    it("bot has correct default values", () => {
      const p = mkPlayer("bot_1_1", "T", "Bot", true, "medium", "container_yard");
      expect(p.isBot).toBe(true);
      expect(p.hp).toBe(100);
      expect(p.isDead).toBe(false);
    });

    it("without mapId falls back to container_yard", () => {
      const p = mkPlayer("bot1", "T", "Bot", true, "medium");
      expect(p.x).toBeDefined();
      expect(p.z).toBeDefined();
    });

    it("non-bot player has mid lane", () => {
      const p = mkPlayer("local", "T", "Player", false, "medium", "container_yard");
      expect(p.botLane).toBe("mid");
      expect(p.botRole).toBe("support");
    });

    it("bot speed scales with role", () => {
      const entry = mkPlayer("bot1", "T", "Bot", true, "medium", "container_yard");
      const support = mkPlayer("bot2", "T", "Bot", true, "medium", "container_yard");
      expect(entry.botSpeed).toBeGreaterThan(0);
      expect(support.botSpeed).toBeGreaterThan(0);
    });
  });

  describe("botBuy", () => {
    it("CT buys defuse kit if enough money", () => {
      const p = mkLocalPlayer({ team: "CT", money: 800, hasDefuseKit: false });
      botBuy(p);
      expect(p.hasDefuseKit).toBe(true);
      expect(p.money).toBe(400);
    });

    it("CT does not buy defuse kit if no money", () => {
      const p = mkLocalPlayer({ team: "CT", money: 300, hasDefuseKit: false });
      botBuy(p);
      expect(p.hasDefuseKit).toBe(false);
    });

    it("T buys rifle if enough money", () => {
      const p = mkLocalPlayer({ team: "T", money: 5000, botRole: "support" });
      botBuy(p);
      expect(p.primaryWeapon).toBeTruthy();
      expect(p.money).toBeLessThan(5000);
    });

    it("bot buys helmet with enough money", () => {
      const p = mkLocalPlayer({ team: "T", money: 5000, hasHelmet: false });
      botBuy(p);
      expect(p.hasHelmet).toBe(true);
      expect(p.armor).toBe(100);
    });

    it("entry buys mp5 instead of rifle", () => {
      const p = mkLocalPlayer({ team: "T", money: 5000, botRole: "entry" });
      botBuy(p);
      expect(p.primaryWeapon).toBe("mp5");
    });

    it("flanker buys awp", () => {
      const p = mkLocalPlayer({ team: "T", money: 5000, botRole: "flanker" });
      botBuy(p);
      expect(p.primaryWeapon).toBe("awp");
    });

    it("falls back to mp5 if cannot afford primary", () => {
      const p = mkLocalPlayer({ team: "T", money: 1500, botRole: "support" });
      botBuy(p);
      expect(p.primaryWeapon).toBe("mp5");
      expect(p.money).toBeLessThanOrEqual(1500);
    });

    it("does not buy armor if no money", () => {
      const p = mkLocalPlayer({ team: "T", money: 0 });
      botBuy(p);
      expect(p.armor).toBe(0);
      expect(p.hasHelmet).toBe(false);
    });

    it("CT buys armor without helmet when short on money", () => {
      const p = mkLocalPlayer({ team: "CT", money: 800, hasDefuseKit: true, hasHelmet: false, armor: 0 });
      botBuy(p);
      expect(p.armor).toBe(100);
      expect(p.hasHelmet).toBe(false);
    });

    it("runner buys mp5", () => {
      const p = mkLocalPlayer({ team: "T", money: 5000, botRole: "runner" });
      botBuy(p);
      expect(p.primaryWeapon).toBe("mp5");
    });

    it("CT buys deagle if no primary and money allows", () => {
      const p = mkLocalPlayer({ team: "CT", money: 1000, hasDefuseKit: true, primaryWeapon: "", armor: 100 });
      botBuy(p);
      expect(p.currentWeapon).toBe("deagle");
    });
  });

  describe("nearestEnemy", () => {
    it("returns null if no enemies", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T" });
      const players = new Map([["bot1", bot]]);
      expect(nearestEnemy(bot, players)).toBeNull();
    });

    it("returns null if enemy is dead", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T" });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", isDead: true });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      expect(nearestEnemy(bot, players)).toBeNull();
    });

    it("returns null if enemy is same team", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T" });
      const ally = mkLocalPlayer({ id: "ally1", team: "T" });
      const players = new Map([["bot1", bot], ["ally1", ally]]);
      expect(nearestEnemy(bot, players)).toBeNull();
    });

    it("returns nearest alive enemy with LOS", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0 });
      const enemy1 = mkLocalPlayer({ id: "enemy1", team: "CT", x: 5, z: 5 });
      const enemy2 = mkLocalPlayer({ id: "enemy2", team: "CT", x: 10, z: 10 });
      const players = new Map([["bot1", bot], ["enemy1", enemy1], ["enemy2", enemy2]]);
      const result = nearestEnemy(bot, players);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("enemy1");
    });

    it("returns null when no LOS to any enemy", () => {
      mockHasLineOfSight.mockReturnValue(false);
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0 });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 5, z: 5 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      expect(nearestEnemy(bot, players)).toBeNull();
    });

    it("respects custom maxDist", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0 });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 50, z: 50 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      expect(nearestEnemy(bot, players, 10)).toBeNull();
    });
  });

  describe("botThink", () => {
    it("returns null for dead bot", () => {
      const bot = mkLocalPlayer({ id: "bot1", isDead: true, team: "T" });
      const players = new Map([["bot1", bot]]);
      const result = botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(result).toBeNull();
    });

    it("sets retreat when low HP", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", hp: 20, botLane: "A" });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("retreat");
    });

    it("picks up dropped bomb when near drop point", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0, hasBomb: false });
      const players = new Map([["bot1", bot]]);
      const result = botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombDropped: true, bombDropX: 0.5, bombDropZ: 0.5,
      }));
      expect(bot.hasBomb).toBe(true);
      expect(result).toEqual({ bombDropped: false, bombDropX: 0, bombDropZ: 0 });
    });

    it("walks toward dropped bomb when far from drop point", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0, hasBomb: false, botSpeed: 4 });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombDropped: true, bombDropX: 20, bombDropZ: 20,
      }));
      expect(bot.botState).toBe("patrol");
      expect(bot.hasBomb).toBe(false);
    });

    it("returns empty patch when planting", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", isPlanting: true });
      const players = new Map([["bot1", bot]]);
      const result = botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(result).toBeNull();
    });

    it("returns empty patch when defusing", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "CT", isDefusing: true });
      const players = new Map([["bot1", bot]]);
      const result = botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 30, bombSite: "A",
      }));
      expect(result).toBeNull();
    });

    it("T bot with bomb near bomb site starts planting", () => {
      mockDistToBombSite.mockReturnValue(2);
      const bot = mkLocalPlayer({ id: "bot1", team: "T", hasBomb: true, x: 20, z: -15 });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.isPlanting).toBe(true);
      expect(bot.botState).toBe("plant");
    });

    it("T bot with bomb far from site walks to site", () => {
      mockDistToBombSite.mockReturnValue(20);
      const bot = mkLocalPlayer({ id: "bot1", team: "T", hasBomb: true, x: 0, z: 0, plantSite: "A" });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("plant");
      expect(bot.isPlanting).toBe(false);
    });

    it("T support bot without bomb, carrier distant → follows carrier", () => {
      const carrier = mkLocalPlayer({ id: "bot2", team: "T", hasBomb: true, x: 30, z: 30, isBot: true, botRole: "runner" });
      const support = mkLocalPlayer({ id: "bot1", team: "T", hasBomb: false, x: 0, z: 0, botRole: "support", isBot: true });
      const players = new Map([["bot1", support], ["bot2", carrier]]);
      botThink(support, players, 0.1, Date.now(), mkBombState());
      expect(support.botState).toBe("patrol");
    });

    it("CT bot, bomb planted, near site, mustDefuse → starts defusing", () => {
      mockDistToBombSite.mockReturnValue(2);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botRole: "runner", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 5, bombSite: "A",
      }));
      expect(bot.isDefusing).toBe(true);
      expect(bot.botState).toBe("defuse");
    });

    it("CT bot, bomb planted, close threat → engages", () => {
      mockDistToBombSite.mockReturnValue(10);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 10, z: 0,
        botRole: "support", isBot: true,
      });
      const threat = mkLocalPlayer({ id: "enemy1", team: "T", x: 12, z: 0 });
      const players = new Map([["bot1", bot], ["enemy1", threat]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.botState).toBe("engage");
    });

    it("No target, CT, not planted, near site → orbits", () => {
      mockDistToBombSite.mockReturnValue(3);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botLane: "A", botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("hold");
    });

    it("No target, T → walks bot path", () => {
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botLane: "A", hasBomb: false,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("patrol");
    });

    it("refills empty mag from reserve ammo", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", botAmmoInMag: 0, ammo: 10 });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botAmmoInMag).toBe(10);
    });

    it("T bot with bomb near B site plants on B", () => {
      mockDistToBombSite.mockReturnValue(2);
      mockResolveBombSites.mockReturnValue({ A: { x: 20, z: -15, radius: 4 }, B: { x: -20, z: -15, radius: 4 } });
      const bot = mkLocalPlayer({ id: "bot1", team: "T", hasBomb: true, x: -20, z: -15, plantSite: "B" });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.isPlanting).toBe(true);
      expect(bot.plantSite).toBe("B");
    });

    it("CT runner near site, bombTimeLeft > 8, close threat → walks to site", () => {
      mockDistToBombSite.mockReturnValue(2);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botRole: "runner", isBot: true,
      });
      const threat = mkLocalPlayer({ id: "enemy1", team: "T", x: 22, z: -15 });
      const players = new Map([["bot1", bot], ["enemy1", threat]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.isDefusing).toBe(false);
      expect(bot.botState).toBe("defuse");
    });

    it("T bot without bomb, no target, walks bomb path based on plantSite", () => {
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", hasBomb: false, plantSite: "B",
        botLane: "B",
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("patrol");
    });
  });

  describe("fireAt (via botThink engage)", () => {
    it("does not fire at same team target", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0 });
      const ally = mkLocalPlayer({ id: "ally1", team: "T", x: 5, z: 5 });
      const players = new Map([["bot1", bot], ["ally1", ally]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botAmmoInMag).toBe(20);
    });

    it("does not fire when reloading", () => {
      const bot = mkLocalPlayer({ id: "bot1", team: "T", x: 0, z: 0, isReloading: true });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 5, z: 5 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botAmmoInMag).toBe(20);
    });

    it("starts reload when ammo <= 5 and has reserve", () => {
      const queueReload = vi.fn();
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 5, reserveAmmo: 30,
        botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 2, z: 2 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      mockFireIntervalMs.mockReturnValue(0);
      botThink(bot, players, 0.1, Date.now(), mkBombState(), queueReload);
      expect(bot.isReloading).toBe(true);
    });

    it("switches to secondary when no ammo and no reserve", () => {
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 0, ammo: 0, reserveAmmo: 0,
        secondaryWeapon: "glock", currentWeapon: "ak47",
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 2, z: 2 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.currentWeapon).toBe("glock");
      expect(bot.botAmmoInMag).toBe(20);
    });

    it("fires weapon and decrements ammo on hit", () => {
      mockResolveBotShot.mockReturnValue({ hit: true, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 10, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 2, z: 2, hp: 100 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(bot.botAmmoInMag).toBe(9);
      expect(enemy.hp).toBeLessThan(100);
    });

    it("headshot kills enemy with bomb drop", () => {
      mockResolveBotShot.mockReturnValue({ hit: true, headshot: true });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 10, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({
        id: "enemy1", team: "CT", x: 2, z: 2, hp: 15, hasBomb: true,
      });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      const result = botThink(bot, players, 0.1, 1000, mkBombState());
      expect(enemy.isDead).toBe(true);
      expect(bot.kills).toBe(1);
      expect(enemy.deaths).toBe(1);
      expect(result).toEqual({ bombDropped: true, bombDropX: 2, bombDropZ: 2 });
    });

    it("fires at local player and emits hurt feedback", () => {
      mockResolveBotShot.mockReturnValue({ hit: true, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 10, botLastShootTime: 0,
      });
      const local = mkLocalPlayer({ id: "local", team: "CT", x: 2, z: 2, hp: 100 });
      const players = new Map([["bot1", bot], ["local", local]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(local.hp).toBeLessThan(100);
    });

    it("misses shot and does not deal damage", () => {
      mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 10, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 2, z: 2, hp: 100 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(enemy.hp).toBe(100);
      expect(bot.botAmmoInMag).toBe(9);
    });

    it("fireAt entry role pushes toward enemy", () => {
      mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botRole: "entry", botAmmoInMag: 20, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 10, z: 0 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(bot.botState).toBe("engage");
    });

    it("fireAt flanker role strafes away when close", () => {
      mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botRole: "flanker", botAmmoInMag: 20, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 10, z: 0 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(bot.botState).toBe("engage");
    });

    it("fireAt with cover available uses cover", () => {
      mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      mockHideBehindCover.mockReturnValue({ x: 5, z: 5 });
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botAmmoInMag: 20, botLastShootTime: 0,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 10, z: 0 });
      const players = new Map([["bot1", bot], ["enemy1", enemy]]);
      botThink(bot, players, 0.1, 1000, mkBombState());
      expect(bot.botState).toBe("engage");
    });

    it("CT bot, no target, near lane B site, orbits at flanker distance", () => {
      mockDistToBombSite.mockReturnValue(3);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: -20, z: -15,
        botLane: "B", botRole: "flanker", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("hold");
    });

    it("CT bot, no target, far from lane B site, patrols toward B", () => {
      mockDistToBombSite.mockReturnValue(20);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 0, z: 0,
        botLane: "B", botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("patrol");
    });

    it("CT bot, bomb planted, far from site, no close threat → walks to site", () => {
      mockDistToBombSite.mockReturnValue(12);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 0, z: 0,
        botLane: "A", botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.botState).toBe("defuse");
    });

    it("CT bot, bomb planted, near site, not runner, close threat, bombTimeLeft > 8 → engages", () => {
      mockDistToBombSite.mockReturnValue(3);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botRole: "support", isBot: true,
      });
      const threat = mkLocalPlayer({ id: "enemy1", team: "T", x: 22, z: -15 });
      const players = new Map([["bot1", bot], ["enemy1", threat]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.botState).toBe("engage");
    });

    it("CT bot, bomb planted, near site, not runner, bombTimeLeft < 12, no threat → orbits", () => {
      mockDistToBombSite.mockReturnValue(3);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 10, bombSite: "A",
      }));
      expect(bot.botState).toBe("defuse");
    });

    it("T bot, bomb planted, far from site, no close threat → holds and walks to site", () => {
      mockDistToBombSite.mockReturnValue(12);
      const bot = mkLocalPlayer({
        id: "bot1", team: "T", x: 0, z: 0,
        botLane: "A", botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.botState).toBe("hold");
    });

    it("CT entry role, no target, far from site → patrols at full speed", () => {
      mockDistToBombSite.mockReturnValue(20);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 0, z: 0,
        botLane: "A", botRole: "entry", isBot: true,
      });
      const players = new Map([["bot1", bot]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState());
      expect(bot.botState).toBe("patrol");
    });

    it("T bot with bomb carrier nearby, support follows carrier", () => {
      const carrier = mkLocalPlayer({
        id: "bot2", team: "T", hasBomb: true, x: 0, z: 0,
        isBot: true, botRole: "runner",
      });
      const support = mkLocalPlayer({
        id: "bot1", team: "T", hasBomb: false, x: 0, z: 0,
        botRole: "support", isBot: true,
      });
      const players = new Map([["bot1", support], ["bot2", carrier]]);
      botThink(support, players, 0.1, Date.now(), mkBombState());
      expect(support.botState).toBe("patrol");
    });

    it("T bot with bomb carrier far away, support walks toward carrier and peeks", () => {
      mockResolveBotShot.mockReturnValue({ hit: false, headshot: false });
      mockFireIntervalMs.mockReturnValue(0);
      const carrier = mkLocalPlayer({
        id: "bot2", team: "T", hasBomb: true, x: 20, z: 20,
        isBot: true, botRole: "runner",
      });
      const support = mkLocalPlayer({
        id: "bot1", team: "T", hasBomb: false, x: 0, z: 0,
        botRole: "support", isBot: true,
      });
      const enemy = mkLocalPlayer({ id: "enemy1", team: "CT", x: 5, z: 5 });
      const players = new Map([["bot1", support], ["bot2", carrier], ["enemy1", enemy]]);
      botThink(support, players, 0.1, 1000, mkBombState());
      expect(support.botState).toBe("patrol");
    });

    it("CT bot, bomb planted, close threat but mustDefuse=false (runner, timeLeft>8)", () => {
      mockDistToBombSite.mockReturnValue(2);
      const bot = mkLocalPlayer({
        id: "bot1", team: "CT", x: 20, z: -15,
        botRole: "runner", isBot: true,
      });
      const threat = mkLocalPlayer({ id: "enemy1", team: "T", x: 22, z: -15 });
      const players = new Map([["bot1", bot], ["enemy1", threat]]);
      botThink(bot, players, 0.1, Date.now(), mkBombState({
        bombPlanted: true, bombTimeLeft: 15, bombSite: "A",
      }));
      expect(bot.botState).toBe("defuse");
    });
  });
});
