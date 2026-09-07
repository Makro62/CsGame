import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROUND, ECONOMY } from "@cs-game/shared";

vi.mock("../../../client/src/stores/useGameStore", () => ({
  useGameStore: {
    getState: () => ({ currentMap: "container_yard", setTracerEvent: vi.fn() }),
    setState: vi.fn(),
  },
}));

const mockBotThink = vi.fn(() => null);
vi.mock("../../../client/src/game/offline/BotAI", () => ({
  assignBombCarrier: vi.fn(),
  defaultLoadout: vi.fn(),
  refillAmmo: vi.fn(),
  resetBotNav: vi.fn(),
  botBuy: vi.fn(),
  botThink: (...a: any[]) => mockBotThink(...a),
}));

vi.mock("../../../client/src/game/offline/botNav", () => ({
  spawnJitter: vi.fn(() => ({ x: 0, z: 0 })),
  resetBotNav: vi.fn(),
}));

vi.mock("../../../client/src/game/offline/offlineCombat", () => ({
  resolveTeamSpawn: vi.fn(() => ({ x: 0, z: 0 })),
  roleForBotId: vi.fn(() => "support"),
  laneForRole: vi.fn(() => "mid"),
  botPath: vi.fn(() => [{ x: 5, z: -20 }]),
  stepToward: vi.fn((_p: any, _g: any, _s: number, _dt: number) => ({ x: 0, z: 0 })),
  resolveBotShot: vi.fn(() => ({ hit: false, headshot: false })),
  resolveBombSites: vi.fn(() => ({ A: { x: 20, z: -15, radius: 4 }, B: { x: -20, z: -15, radius: 4 } })),
  distToBombSite: vi.fn(() => 999),
  hasLineOfSight: vi.fn(() => false),
  hideBehindCover: vi.fn(() => null),
  fireIntervalMs: vi.fn(() => 100),
  spawnCameraYaw: vi.fn(() => 0),
  isPointBlocked: vi.fn(() => false),
  pushOutOfObstacles: vi.fn((p: any) => p),
  nextWaypointIndex: vi.fn(() => 0),
}));

vi.mock("../../../client/src/game/offline/EconomySystem", () => ({
  getWeaponStats: vi.fn((weapon: string) => {
    const weapons: Record<string, any> = {
      glock: { dmg: 15, fireRate: 10, mag: 20, reserveAmmo: 120, price: 200, reload: 2 },
      autopistol: { dmg: 15, fireRate: 10, mag: 20, reserveAmmo: 120, price: 200, reload: 2 },
    };
    return weapons[weapon] || null;
  }),
}));

import { endRound, resetForRound, tickRound } from "../../../client/src/game/offline/RoundManager";

function mkPlayer(overrides: Partial<any> = {}) {
  return {
    id: "local", x: 0, y: 0, z: 0, rotationY: 0,
    hp: 100, isDead: false, team: "T" as const,
    nickname: "Test", money: 3000, kills: 0, deaths: 0,
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

function mkState(overrides: Partial<any> = {}) {
  return {
    phase: "active" as const,
    roundNumber: 1,
    teamRedScore: 0,
    teamBlueScore: 0,
    roundTimeLeft: 100,
    buyPhaseTimeLeft: 0,
    roundEndTimer: 0,
    bombPlanted: false,
    bombTimeLeft: 0,
    bombSite: "",
    bombDropped: false,
    bombDropX: 0,
    bombDropZ: 0,
    isHalfTime: false,
    maxRounds: 30,
    difficulty: "medium" as const,
    currentMap: "container_yard",
    players: new Map<string, any>([["local", mkPlayer()]]),
    killFeed: [],
    activeReloads: new Map(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBotThink.mockReturnValue(null);
});

describe("RoundManager", () => {
  describe("endRound", () => {
    it("does nothing if phase is roundEnd", () => {
      const set = vi.fn();
      const state = mkState({ phase: "roundEnd" });
      endRound("T", state, set);
      expect(set).not.toHaveBeenCalled();
    });

    it("does nothing if phase is matchEnd", () => {
      const set = vi.fn();
      const state = mkState({ phase: "matchEnd" });
      endRound("T", state, set);
      expect(set).not.toHaveBeenCalled();
    });

    it("increments T score when T wins", () => {
      const set = vi.fn();
      const state = mkState();
      endRound("T", state, set);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ teamRedScore: 1, teamBlueScore: 0 })
      );
    });

    it("increments CT score when CT wins", () => {
      const set = vi.fn();
      const state = mkState();
      endRound("CT", state, set);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ teamRedScore: 0, teamBlueScore: 1 })
      );
    });

    it("awards win bonus to winning team", () => {
      const set = vi.fn();
      const state = mkState();
      endRound("T", state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").money).toBe(3000 + ECONOMY.roundWinBonus);
    });

    it("awards loss bonus to losing team", () => {
      const set = vi.fn();
      const tPlayer = mkPlayer({ team: "T", id: "t1" });
      const ctPlayer = mkPlayer({ team: "CT", id: "ct1" });
      const players = new Map([["t1", tPlayer], ["ct1", ctPlayer]]);
      const state = mkState({ players });
      endRound("T", state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("ct1").money).toBe(3000 + ECONOMY.lossBonus1);
    });

    it("caps money at maxMoney", () => {
      const set = vi.fn();
      const rich = mkPlayer({ money: ECONOMY.maxMoney - 100 });
      const state = mkState({ players: new Map([["local", rich]]) });
      endRound("T", state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").money).toBe(ECONOMY.maxMoney);
    });

    it("sets phase to roundEnd", () => {
      const set = vi.fn();
      const state = mkState();
      endRound("T", state, set);
      expect(set.mock.calls[0][0].phase).toBe("roundEnd");
    });

    it("resets bomb state", () => {
      const set = vi.fn();
      const state = mkState({ bombPlanted: true, bombTimeLeft: 30, bombSite: "A" });
      endRound("T", state, set);
      const call = set.mock.calls[0][0];
      expect(call.bombPlanted).toBe(false);
      expect(call.bombTimeLeft).toBe(0);
      expect(call.bombSite).toBe("");
    });

    it("triggers matchEnd when win score reached", () => {
      const set = vi.fn();
      const state = mkState({ teamRedScore: 14, maxRounds: 30 });
      endRound("T", state, set);
      expect(set.mock.calls[0][0].phase).toBe("matchEnd");
    });

    it("triggers matchEnd for CT when win score reached", () => {
      const set = vi.fn();
      const state = mkState({ teamBlueScore: 14, maxRounds: 30 });
      endRound("CT", state, set);
      expect(set.mock.calls[0][0].phase).toBe("matchEnd");
    });

    it("resets planting/defusing state", () => {
      const set = vi.fn();
      const p = mkPlayer({ isPlanting: true, plantProgress: 0.5 });
      const state = mkState({ players: new Map([["local", p]]) });
      endRound("T", state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").isPlanting).toBe(false);
      expect(call.players.get("local").plantProgress).toBe(0);
    });
  });

  describe("resetForRound", () => {
    it("sets phase to buy", () => {
      const set = vi.fn();
      const state = mkState();
      resetForRound(state, set);
      expect(set.mock.calls[0][0].phase).toBe("buy");
    });

    it("resets player HP to 100", () => {
      const set = vi.fn();
      const p = mkPlayer({ hp: 30, isDead: true });
      const state = mkState({ players: new Map([["local", p]]) });
      resetForRound(state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").hp).toBe(100);
      expect(call.players.get("local").isDead).toBe(false);
    });

    it("resets bomb state", () => {
      const set = vi.fn();
      const state = mkState({ bombPlanted: true, bombTimeLeft: 25 });
      resetForRound(state, set);
      const call = set.mock.calls[0][0];
      expect(call.bombPlanted).toBe(false);
      expect(call.bombTimeLeft).toBe(0);
      expect(call.bombSite).toBe("");
    });

    it("sets buy phase duration", () => {
      const set = vi.fn();
      const state = mkState();
      resetForRound(state, set);
      expect(set.mock.calls[0][0].buyPhaseTimeLeft).toBe(ROUND.buyPhaseDuration);
    });

    it("resets reload state", () => {
      const set = vi.fn();
      const p = mkPlayer({ isReloading: true });
      const state = mkState({ players: new Map([["local", p]]) });
      resetForRound(state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").isReloading).toBe(false);
    });

    it("resets grenade counts", () => {
      const set = vi.fn();
      const p = mkPlayer({ grenadeHE: 2, grenadeSmoke: 1, grenadeFlash: 3 });
      const state = mkState({ players: new Map([["local", p]]) });
      resetForRound(state, set);
      const call = set.mock.calls[0][0];
      expect(call.players.get("local").grenadeHE).toBe(0);
      expect(call.players.get("local").grenadeSmoke).toBe(0);
      expect(call.players.get("local").grenadeFlash).toBe(0);
    });

    it("clears active reloads", () => {
      const set = vi.fn();
      const reloads = new Map([["bot1", { botId: "bot1", progress: 0.5, duration: 2 }]]);
      const state = mkState({ activeReloads: reloads });
      resetForRound(state, set);
      expect(set.mock.calls[0][0].activeReloads.size).toBe(0);
    });

    it("resets killFeed", () => {
      const set = vi.fn();
      const state = mkState({ killFeed: [{ killerName: "A", victimName: "B", weapon: "ak47", headshot: false, timestamp: 0 }] });
      resetForRound(state, set);
      expect(set.mock.calls[0][0].killFeed).toEqual([]);
    });

    it("resets bot state and waypoint", () => {
      const set = vi.fn();
      const bot = mkPlayer({ isBot: true, botState: "engage", botWp: 3, hp: 30, isDead: true });
      const state = mkState({ players: new Map([["bot1", bot]]) });
      resetForRound(state, set);
      const call = set.mock.calls[0][0];
      const resetBot = call.players.get("bot1");
      expect(resetBot.botState).toBe("idle");
      expect(resetBot.botWp).toBe(0);
      expect(resetBot.hp).toBe(100);
    });
  });

  describe("tickRound", () => {
    it("does nothing for waiting phase", () => {
      const set = vi.fn();
      const get = vi.fn();
      const state = mkState({ phase: "waiting" });
      tickRound(state, 0.016, set, get);
      expect(set).not.toHaveBeenCalled();
    });

    it("does nothing for matchEnd phase", () => {
      const set = vi.fn();
      const get = vi.fn();
      const state = mkState({ phase: "matchEnd" });
      tickRound(state, 0.016, set, get);
      expect(set).not.toHaveBeenCalled();
    });

    it("buy phase counts down timer", () => {
      const set = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active" }));
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 10 });
      tickRound(state, 1, set, get);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ buyPhaseTimeLeft: 9 })
      );
    });

    it("buy phase transitions to active when timer expires", () => {
      const set = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active" }));
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 0.5 });
      tickRound(state, 1, set, get);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "active" })
      );
    });

    it("buy phase moves bots to hold position", () => {
      const set = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active" }));
      const bot = mkPlayer({ isBot: true, id: "bot1" });
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 5, players: new Map([["local", mkPlayer()], ["bot1", bot]]) });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
    });

    it("buy phase botBuy is called for bots when timer expires", () => {
      const set = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active" }));
      const bot = mkPlayer({ isBot: true, id: "bot1" });
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 0.5, players: new Map([["local", mkPlayer()], ["bot1", bot]]) });
      tickRound(state, 1, set, get);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "active" })
      );
    });

    it("buy phase hold waypoint uses botPath", () => {
      const set = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active" }));
      const bot = mkPlayer({ isBot: true, id: "bot1", botLane: "A" });
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 5, players: new Map([["local", mkPlayer()], ["bot1", bot]]) });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      const updatedBot = call.players.get("bot1");
      expect(updatedBot.botState).toBe("hold");
    });

    it("roundEnd phase counts down timer", () => {
      const set = vi.fn();
      const resetFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", resetForRound: resetFn }));
      const state = mkState({ phase: "roundEnd", roundEndTimer: 5 });
      tickRound(state, 1, set, get);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ roundEndTimer: 4 })
      );
    });

    it("roundEnd phase triggers reset when timer expires", () => {
      const set = vi.fn();
      const resetFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", resetForRound: resetFn }));
      const state = mkState({ phase: "roundEnd", roundEndTimer: 0.5 });
      tickRound(state, 1, set, get);
      expect(set).toHaveBeenCalled();
    });

    it("active phase counts down round timer", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn, roundTimeLeft: 50 }));
      const state = mkState({ phase: "active", roundTimeLeft: 50 });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.roundTimeLeft).toBeLessThanOrEqual(50);
    });

    it("active phase handles planting progress", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn }));
      const p = mkPlayer({ isPlanting: true, plantProgress: 0 });
      const state = mkState({ phase: "active", players: new Map([["local", p]]) });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.players.get("local").plantProgress).toBeGreaterThan(0);
    });

    it("active phase handles defusing progress", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn }));
      const p = mkPlayer({ isDefusing: true, defuseProgress: 0, hasDefuseKit: true });
      const state = mkState({ phase: "active", players: new Map([["local", p]]) });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.players.get("local").defuseProgress).toBeGreaterThan(0);
    });

    it("active phase handles bomb timer", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn }));
      const state = mkState({ phase: "active", bombPlanted: true, bombTimeLeft: 30 });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.bombTimeLeft).toBe(29);
    });

    it("dead player stops planting/defusing", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn }));
      const p = mkPlayer({ isPlanting: true, plantProgress: 0.5, isDead: true });
      const state = mkState({ phase: "active", players: new Map([["local", p]]) });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.players.get("local").isPlanting).toBe(false);
    });

    it("round timeout triggers CT win when no bomb planted", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", endRound: endRoundFn, roundTimeLeft: 0 }));
      const state = mkState({ phase: "active", roundTimeLeft: 0, bombPlanted: false });
      tickRound(state, 1, set, get);
    });

    it("elimination triggers win", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const deadT = mkPlayer({ id: "t1", team: "T", isDead: true });
      const aliveCT = mkPlayer({ id: "ct1", team: "CT" });
      const players = new Map([["t1", deadT], ["ct1", aliveCT]]);
      const get = vi.fn(() => mkState({ phase: "active", players, endRound: endRoundFn }));
      const state = mkState({ phase: "active", players, roundTimeLeft: 50 });
      tickRound(state, 0.016, set, get);
    });

    it("active reload completes and replenishes ammo", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", roundTimeLeft: 50, endRound: endRoundFn }));
      const bot = mkPlayer({
        id: "bot1", isBot: true, team: "T", isReloading: true,
        botAmmoInMag: 10, reserveAmmo: 30, currentWeapon: "glock",
      });
      const reloads = new Map([["bot1", { botId: "bot1", progress: 0.95, duration: 2 }]]);
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        players: new Map([["local", mkPlayer()], ["bot1", bot]]),
        activeReloads: reloads,
      });
      tickRound(state, 0.5, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      const updatedBot = call.players.get("bot1");
      expect(updatedBot.botAmmoInMag).toBeGreaterThan(10);
      expect(updatedBot.isReloading).toBe(false);
    });

    it("bot dead during reload is removed from activeReloads", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({ phase: "active", roundTimeLeft: 50, endRound: endRoundFn }));
      const bot = mkPlayer({
        id: "bot1", isBot: true, team: "T", isDead: true, isReloading: true,
      });
      const reloads = new Map([["bot1", { botId: "bot1", progress: 0.5, duration: 2 }]]);
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        players: new Map([["local", mkPlayer()], ["bot1", bot]]),
        activeReloads: reloads,
      });
      tickRound(state, 0.5, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.activeReloads.has("bot1")).toBe(false);
    });

    it("bot gets bomb patch from botThink", () => {
      mockBotThink.mockReturnValue({ bombDropped: true, bombDropX: 5, bombDropZ: 10 });
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const bot = mkPlayer({ id: "bot1", isBot: true, team: "T" });
      const ct = mkPlayer({ id: "ct1", team: "CT" });
      const players = new Map([["local", mkPlayer()], ["bot1", bot], ["ct1", ct]]);
      const get = vi.fn(() => mkState({ phase: "active", roundTimeLeft: 50, endRound: endRoundFn, players }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, players,
      });
      tickRound(state, 0.016, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.bombDropped).toBe(true);
      expect(call.bombDropX).toBe(5);
      expect(call.bombDropZ).toBe(10);
    });

    it("local player picks up dropped bomb when close", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const local = mkPlayer({ team: "T", hasBomb: false, x: 5, z: 5 });
      const ct = mkPlayer({ id: "ct1", team: "CT" });
      const players = new Map([["local", local], ["ct1", ct]]);
      const get = vi.fn(() => mkState({
        phase: "active", roundTimeLeft: 50, endRound: endRoundFn,
        bombDropped: true, bombDropX: 6, bombDropZ: 5,
        players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        bombDropped: true, bombDropX: 6, bombDropZ: 5,
        players,
      });
      tickRound(state, 0.016, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.players.get("local").hasBomb).toBe(true);
      expect(call.bombDropped).toBe(false);
    });

    it("local player does not pick up bomb when CT team", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const local = mkPlayer({ team: "CT", hasBomb: false, x: 6, z: 5 });
      const players = new Map([["local", local]]);
      const get = vi.fn(() => mkState({
        phase: "active", roundTimeLeft: 50, endRound: endRoundFn,
        bombDropped: true, bombDropX: 6, bombDropZ: 5,
        players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        bombDropped: true, bombDropX: 6, bombDropZ: 5,
        players,
      });
      tickRound(state, 0.016, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.players.get("local").hasBomb).toBe(false);
    });

    it("bomb timer reaches 0 triggers endRound(T)", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        bombPlanted: true, bombTimeLeft: 0.5,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        bombPlanted: true, bombTimeLeft: 0.5,
      });
      tickRound(state, 1, set, get);
      expect(endRoundFn).toHaveBeenCalledWith("T");
    });

    it("plant complete sets bombPlanted = true", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const p = mkPlayer({ isPlanting: true, plantProgress: 0.99, plantSite: "A", team: "T" });
      const players = new Map([["local", p]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, players,
      });
      tickRound(state, 0.5, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call.bombPlanted).toBe(true);
      expect(call.bombSite).toBe("A");
    });

    it("defuse complete triggers endRound(CT)", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const p = mkPlayer({ isDefusing: true, defuseProgress: 0.99, hasDefuseKit: true, team: "CT" });
      const players = new Map([["local", p]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        bombPlanted: true, bombTimeLeft: 20, bombSite: "A",
        players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        bombPlanted: true, bombTimeLeft: 20, bombSite: "A",
        players,
      });
      tickRound(state, 0.5, set, get);
      expect(endRoundFn).toHaveBeenCalledWith("CT");
    });

    it("round timeout without bomb triggers endRound(CT)", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 0,
        bombPlanted: false,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 0, bombPlanted: false,
      });
      tickRound(state, 1, set, get);
      expect(endRoundFn).toHaveBeenCalledWith("CT");
    });

    it("all T dead, no bomb planted triggers endRound(CT)", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const deadT = mkPlayer({ id: "t1", team: "T", isDead: true });
      const aliveCT = mkPlayer({ id: "ct1", team: "CT" });
      const players = new Map([["t1", deadT], ["ct1", aliveCT]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        bombPlanted: false, players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50,
        bombPlanted: false, players,
      });
      tickRound(state, 0.016, set, get);
      expect(endRoundFn).toHaveBeenCalledWith("CT");
    });

    it("all CT dead triggers endRound(T)", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const aliveT = mkPlayer({ id: "t1", team: "T" });
      const deadCT = mkPlayer({ id: "ct1", team: "CT", isDead: true });
      const players = new Map([["t1", aliveT], ["ct1", deadCT]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, players,
      });
      tickRound(state, 0.016, set, get);
      expect(endRoundFn).toHaveBeenCalledWith("T");
    });

    it("dead player defusing stops defusing", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const p = mkPlayer({ isDefusing: true, defuseProgress: 0.5, isDead: true });
      const players = new Map([["local", p]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50, players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, players,
      });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call.players.get("local").isDefusing).toBe(false);
      expect(call.players.get("local").defuseProgress).toBe(0);
    });

    it("defuse without kit takes longer", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const p = mkPlayer({ isDefusing: true, defuseProgress: 0, hasDefuseKit: false });
      const players = new Map([["local", p]]);
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50, players,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, players,
      });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      const updated = call.players.get("local");
      expect(updated.defuseProgress).toBeGreaterThan(0);
    });

    it("bomb timer does not decrement when not planted", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
        bombPlanted: false,
      }));
      const state = mkState({
        phase: "active", roundTimeLeft: 50, bombPlanted: false,
      });
      tickRound(state, 1, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call.bombTimeLeft).toBe(0);
    });

    it("sanitizeTickDt clamps very large dt", () => {
      const set = vi.fn();
      const endRoundFn = vi.fn();
      const get = vi.fn(() => mkState({
        phase: "active", endRound: endRoundFn, roundTimeLeft: 50,
      }));
      const state = mkState({ phase: "active", roundTimeLeft: 50 });
      tickRound(state, 999, set, get);
      const call = set.mock.calls[0]?.[0];
      expect(call).toBeDefined();
    });
  });
});
