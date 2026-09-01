import { describe, it, expect, vi } from "vitest";
import { endRound, resetForRound, tickRound } from "@src/game/offline/RoundManager";
import { ROUND, ECONOMY } from "@cs-game/shared";
import type { OfflineGameState, LocalPlayer } from "@src/game/offline/types";

function mkPlayer(overrides: Partial<LocalPlayer> = {}): LocalPlayer {
  return {
    id: "local", x: 0, y: 0, z: 0, rotationY: 0,
    hp: 100, isDead: false, team: "T", nickname: "Test",
    money: 800, kills: 0, deaths: 0,
    currentWeapon: "ak47", primaryWeapon: "ak47", secondaryWeapon: "glock",
    knifeSlot: "knife", ammo: 30, reserveAmmo: 90,
    armor: 0, hasHelmet: false, hasDefuseKit: false,
    grenadeHE: 0, grenadeSmoke: 0, grenadeFlash: 0,
    hasBomb: false, isBot: false,
    isReloading: false, isPlanting: false, isDefusing: false,
    plantProgress: 0, defuseProgress: 0,
    botTargetId: null, botState: "idle",
    botLastShootTime: 0, botStrafeDir: 0, botStrafeTimer: 0, botStrafeDuration: 0,
    botAmmoInMag: 30, botAccuracy: 0.5, botHsRate: 0.1,
    botSpeed: 3.8, botViewDist: 26,
    plantSite: "A", botLane: "A", botRole: "entry", botWp: 0,
    ...overrides,
  };
}

function mkState(overrides: Partial<OfflineGameState> = {}): OfflineGameState {
  const players = new Map<string, LocalPlayer>();
  players.set("local", mkPlayer());
  players.set("bot_t1", mkPlayer({ id: "bot_t1", isBot: true, team: "T" }));
  players.set("bot_t2", mkPlayer({ id: "bot_t2", isBot: true, team: "T" }));
  players.set("bot_ct1", mkPlayer({ id: "bot_ct1", isBot: true, team: "CT" }));
  players.set("bot_ct2", mkPlayer({ id: "bot_ct2", isBot: true, team: "CT" }));
  return {
    phase: "active", roundNumber: 1, teamRedScore: 0, teamBlueScore: 0,
    roundTimeLeft: ROUND.activePhaseDuration, buyPhaseTimeLeft: ROUND.buyPhaseDuration,
    roundEndTimer: 0, bombPlanted: false, bombTimeLeft: 0, bombSite: "",
    bombDropped: false, bombDropX: 0, bombDropZ: 0,
    isHalfTime: false, maxRounds: ROUND.maxRounds, difficulty: "medium",
    players, killFeed: [], activeReloads: new Map(),
    setDifficulty: vi.fn(), initMatch: vi.fn(), tick: vi.fn(),
    setLocalPos: vi.fn(), localShoot: vi.fn(), localBuy: vi.fn(),
    localReload: vi.fn(), localPlantStart: vi.fn(), localPlantCancel: vi.fn(),
    localDefuseStart: vi.fn(), localDefuseCancel: vi.fn(),
    localSwitchWeapon: vi.fn(), checkRoundEnd: vi.fn(),
    endRound: vi.fn(), resetForRound: vi.fn(), clearBotTimers: vi.fn(),
    ...overrides,
    currentMap: overrides.currentMap ?? "dust",
  };
}

describe("RoundManager deep edge cases", () => {
  describe("endRound - money capping", () => {
    it("money capped at maxMoney", () => {
      const state = mkState();
      state.players.get("local")!.money = ECONOMY.maxMoney;
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.players.get("local")!.money).toBe(ECONOMY.maxMoney);
    });

    it("winner gets roundWinBonus", () => {
      const state = mkState();
      state.players.get("local")!.money = 1000;
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.players.get("local")!.money).toBe(1000 + ECONOMY.roundWinBonus);
    });

    it("loser gets lossBonus1", () => {
      const state = mkState();
      state.players.get("local")!.money = 1000;
      const setFn = vi.fn();
      endRound("CT", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.players.get("local")!.money).toBe(1000 + ECONOMY.lossBonus1);
    });
  });

  describe("endRound - guard clauses", () => {
    it("does nothing if already roundEnd", () => {
      const state = mkState({ phase: "roundEnd" });
      const setFn = vi.fn();
      endRound("T", state, setFn);
      expect(setFn).not.toHaveBeenCalled();
    });

    it("does nothing if matchEnd", () => {
      const state = mkState({ phase: "matchEnd" });
      const setFn = vi.fn();
      endRound("T", state, setFn);
      expect(setFn).not.toHaveBeenCalled();
    });
  });

  describe("endRound - match end detection", () => {
    it("ends match when team reaches winScore", () => {
      const state = mkState();
      state.teamRedScore = 7; // one more to 8 = ceil(15/2)
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.phase).toBe("matchEnd");
      expect(call.teamRedScore).toBe(8);
    });

    it("CT reaches winScore", () => {
      const state = mkState();
      state.teamBlueScore = 7;
      const setFn = vi.fn();
      endRound("CT", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.phase).toBe("matchEnd");
      expect(call.teamBlueScore).toBe(8);
    });

    it("does not end match before winScore", () => {
      const state = mkState();
      state.teamRedScore = 6;
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.phase).toBe("roundEnd");
    });
  });

  describe("endRound - player state cleanup", () => {
    it("clears isPlanting and isDefusing for all players", () => {
      const state = mkState();
      state.players.get("local")!.isPlanting = true;
      state.players.get("bot_t1")!.isDefusing = true;
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      for (const p of call.players.values()) {
        expect(p.isPlanting).toBe(false);
        expect(p.isDefusing).toBe(false);
        expect(p.plantProgress).toBe(0);
        expect(p.defuseProgress).toBe(0);
      }
    });

    it("clears bombState", () => {
      const state = mkState({ bombPlanted: true, bombTimeLeft: 30, bombSite: "A" });
      const setFn = vi.fn();
      endRound("T", state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.bombPlanted).toBe(false);
      expect(call.bombTimeLeft).toBe(0);
      expect(call.bombSite).toBe("");
    });
  });

  describe("resetForRound - player state", () => {
    it("resets hp to 100", () => {
      const state = mkState();
      state.players.get("local")!.hp = 30;
      state.players.get("bot_t1")!.hp = 0;
      state.players.get("bot_t1")!.isDead = true;
      const setFn = vi.fn();
      resetForRound(state, setFn);
      const call = setFn.mock.calls[0][0];
      for (const p of call.players.values()) {
        expect(p.hp).toBe(100);
        expect(p.isDead).toBe(false);
      }
    });

    it("resets planting/defusing state", () => {
      const state = mkState();
      state.players.get("local")!.isPlanting = true;
      state.players.get("local")!.plantProgress = 0.8;
      state.players.get("bot_ct1")!.isDefusing = true;
      state.players.get("bot_ct1")!.defuseProgress = 0.5;
      const setFn = vi.fn();
      resetForRound(state, setFn);
      const call = setFn.mock.calls[0][0];
      for (const p of call.players.values()) {
        expect(p.isPlanting).toBe(false);
        expect(p.isDefusing).toBe(false);
        expect(p.plantProgress).toBe(0);
        expect(p.defuseProgress).toBe(0);
      }
    });

    it("resets bomb state", () => {
      const state = mkState({ bombPlanted: true, bombTimeLeft: 20, bombSite: "A" });
      const setFn = vi.fn();
      resetForRound(state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.bombPlanted).toBe(false);
      expect(call.bombTimeLeft).toBe(0);
      expect(call.bombSite).toBe("");
      expect(call.bombDropped).toBe(false);
    });

    it("sets phase to buy", () => {
      const state = mkState({ phase: "active" });
      const setFn = vi.fn();
      resetForRound(state, setFn);
      const call = setFn.mock.calls[0][0];
      expect(call.phase).toBe("buy");
    });
  });

  describe("tickRound - buy phase transitions", () => {
    it("transitions to active when buy timer expires", () => {
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 0.01 });
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.1, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.phase).toBe("active");
    });

    it("decrements buy timer without transitioning", () => {
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 10 });
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 1, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.buyPhaseTimeLeft).toBe(9);
    });

    it("does not poison buy timer when dt is NaN", () => {
      const state = mkState({ phase: "buy", buyPhaseTimeLeft: 10 });
      const setFn = vi.fn();
      tickRound(state, NaN, setFn, () => state);
      const t = setFn.mock.calls[0][0].buyPhaseTimeLeft;
      expect(Number.isFinite(t)).toBe(true);
      expect(t).toBeLessThan(10);
      expect(t).toBeGreaterThan(9);
    });
  });

  describe("tickRound - bomb mechanics", () => {
    it("bomb explodes and T wins", () => {
      const state = mkState({ bombPlanted: true, bombTimeLeft: 0.01 });
      const mockEndRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).endRound = mockEndRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.1, setFn, getFn);
      expect(mockEndRound).toHaveBeenCalledWith("T");
    });

    it("bomb timer decrements", () => {
      const state = mkState({ bombPlanted: true, bombTimeLeft: 30 });
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 1, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.bombTimeLeft).toBe(29);
    });

    it("plant complete triggers bomb planted", () => {
      const state = mkState();
      state.players.get("local")!.isPlanting = true;
      state.players.get("local")!.plantProgress = 0.99;
      state.players.get("local")!.plantSite = "A";
      state.players.get("local")!.hasBomb = true;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.1, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.bombPlanted).toBe(true);
      expect(call.bombSite).toBe("A");
    });

    it("CT wins on round timeout without bomb planted", () => {
      const state = mkState({ roundTimeLeft: 0.01, bombPlanted: false });
      const mockEndRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).endRound = mockEndRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.1, setFn, getFn);
      expect(mockEndRound).toHaveBeenCalledWith("CT");
    });
  });

  describe("tickRound - elimination wins", () => {
    it("CT wins when all T eliminated", () => {
      const state = mkState();
      state.players.get("local")!.isDead = true;
      state.players.get("bot_t1")!.isDead = true;
      state.players.get("bot_t2")!.isDead = true;
      const mockEndRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).endRound = mockEndRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.016, setFn, getFn);
      expect(mockEndRound).toHaveBeenCalledWith("CT");
    });

    it("T wins when all CT eliminated", () => {
      const state = mkState();
      state.players.get("bot_ct1")!.isDead = true;
      state.players.get("bot_ct2")!.isDead = true;
      const mockEndRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).endRound = mockEndRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.016, setFn, getFn);
      expect(mockEndRound).toHaveBeenCalledWith("T");
    });

    it("does not end if bomb planted even if all T dead", () => {
      const state = mkState({ bombPlanted: true, bombTimeLeft: 30 });
      state.players.get("local")!.isDead = true;
      state.players.get("bot_t1")!.isDead = true;
      state.players.get("bot_t2")!.isDead = true;
      const mockEndRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).endRound = mockEndRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.016, setFn, getFn);
      expect(mockEndRound).not.toHaveBeenCalled();
    });
  });

  describe("tickRound - dead player cleanup", () => {
    it("clears isPlanting/isDefusing for dead players", () => {
      const state = mkState();
      state.players.get("bot_t1")!.isDead = true;
      state.players.get("bot_t1")!.isPlanting = true;
      state.players.get("bot_t1")!.plantProgress = 0.5;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.016, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      const dead = call.players.get("bot_t1");
      expect(dead.isPlanting).toBe(false);
      expect(dead.plantProgress).toBe(0);
    });
  });

  describe("tickRound - roundEnd phase", () => {
    it("decrements roundEnd timer", () => {
      const state = mkState({ phase: "roundEnd", roundEndTimer: 3 });
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 1, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.roundEndTimer).toBe(2);
    });

    it("resets for next round when timer expires", () => {
      const state = mkState({ phase: "roundEnd", roundEndTimer: 0.1 });
      const mockResetForRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).resetForRound = mockResetForRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.2, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.roundNumber).toBe(2);
      expect(mockResetForRound).toHaveBeenCalled();
    });

    it("detects halftime", () => {
      const state = mkState({ phase: "roundEnd", roundEndTimer: 0.1, roundNumber: 7, isHalfTime: false });
      const mockResetForRound = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any).resetForRound = mockResetForRound;
      const setFn = vi.fn();
      const getFn = () => state;
      tickRound(state, 0.2, setFn, getFn);
      const call = setFn.mock.calls[0][0];
      expect(call.isHalfTime).toBe(true);
    });
  });
});