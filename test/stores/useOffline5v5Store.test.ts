import { describe, it, expect, beforeEach, vi } from "vitest";
import { useOffline5v5Store } from "@src/stores/useOffline5v5Store";
import { ECONOMY, BOMB_SITES } from "@cs-game/shared";

beforeEach(() => {
  useOffline5v5Store.getState().initMatch("Tester", "T");
});

describe("useOffline5v5Store", () => {
  describe("initMatch", () => {
    it("creates 10 players (1 local + 4T bots + 5CT bots)", () => {
      expect(useOffline5v5Store.getState().players.size).toBe(10);
    });

    it("local player is on T team", () => {
      expect(useOffline5v5Store.getState().players.get("local")!.team).toBe("T");
    });

    it("local player has startMoney", () => {
      expect(useOffline5v5Store.getState().players.get("local")!.money).toBe(ECONOMY.startMoney);
    });

    it("initializes in buy phase", () => {
      expect(useOffline5v5Store.getState().phase).toBe("buy");
    });

    it("resets scores to 0", () => {
      expect(useOffline5v5Store.getState().teamRedScore).toBe(0);
      expect(useOffline5v5Store.getState().teamBlueScore).toBe(0);
    });

    it("one player has bomb", () => {
      const bombCount = [...useOffline5v5Store.getState().players.values()]
        .filter(p => p.hasBomb).length;
      expect(bombCount).toBe(1);
    });

    it("local player does not have bomb when CT", () => {
      useOffline5v5Store.getState().initMatch("Tester", "CT");
      expect(useOffline5v5Store.getState().players.get("local")!.hasBomb).toBe(false);
    });

    it("local player has bomb when T", () => {
      expect(useOffline5v5Store.getState().players.get("local")!.hasBomb).toBe(true);
    });
  });

  describe("setLocalPos", () => {
    it("updates local player position", () => {
      useOffline5v5Store.getState().setLocalPos(10, 20, 1.5);
      const me = useOffline5v5Store.getState().players.get("local")!;
      expect(me.x).toBe(10);
      expect(me.z).toBe(20);
      expect(me.rotationY).toBe(1.5);
    });

    it("does nothing when local player doesn't exist", () => {
      useOffline5v5Store.setState({ players: new Map() });
      expect(() => useOffline5v5Store.getState().setLocalPos(10, 20, 0)).not.toThrow();
    });
  });

  describe("localBuy", () => {
    it("allows buying during buy phase", () => {
      const result = useOffline5v5Store.getState().localBuy("kevlar");
      expect(result).toBe(true);
    });

    it("rejects buying during active phase", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const result = useOffline5v5Store.getState().localBuy("kevlar");
      expect(result).toBe(false);
    });
  });

  describe("localSwitchWeapon", () => {
    it("switches to primary (slot 1)", () => {
      // Give player enough money to buy ak47
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, money: 5000 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localBuy("ak47");
      useOffline5v5Store.getState().localSwitchWeapon(1);
      const updated = useOffline5v5Store.getState().players.get("local")!;
      expect(updated.currentWeapon).toBe("ak47");
    });

    it("switches to secondary (slot 2)", () => {
      useOffline5v5Store.getState().localSwitchWeapon(2);
      const me = useOffline5v5Store.getState().players.get("local")!;
      expect(me.currentWeapon).toBe(me.secondaryWeapon);
    });

    it("switches to knife (slot 3)", () => {
      useOffline5v5Store.getState().localSwitchWeapon(3);
      const me = useOffline5v5Store.getState().players.get("local")!;
      expect(me.currentWeapon).toBe(me.knifeSlot);
    });

    it("does nothing for invalid slot", () => {
      const before = useOffline5v5Store.getState().players.get("local")!.currentWeapon;
      useOffline5v5Store.getState().localSwitchWeapon(99);
      expect(useOffline5v5Store.getState().players.get("local")!.currentWeapon).toBe(before);
    });

    it("cancels reload on switch", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isReloading: true });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localSwitchWeapon(1);
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(false);
    });
  });

  describe("localPlantStart", () => {
    it("starts planting when T with bomb near site", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const siteA = BOMB_SITES.A;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, x: siteA.x, z: siteA.z, hasBomb: true, team: "T" });
      useOffline5v5Store.setState({ players, phase: "active" });

      useOffline5v5Store.getState().localPlantStart("A");
      const updated = useOffline5v5Store.getState().players.get("local")!;
      expect(updated.isPlanting).toBe(true);
    });

    it("rejects plant when CT", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, team: "CT" });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localPlantStart("A");
      expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);
    });

    it("rejects plant when dead", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isDead: true, team: "T" });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localPlantStart("A");
      expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);
    });

    it("rejects plant when bomb already planted", () => {
      useOffline5v5Store.setState({ phase: "active", bombPlanted: true });
      useOffline5v5Store.getState().localPlantStart("A");
      expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);
    });

    it("rejects plant when no bomb", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, hasBomb: false, team: "T" });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localPlantStart("A");
      expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);
    });

    it("rejects plant when too far from site", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, x: 999, z: 999, hasBomb: true, team: "T" });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localPlantStart("A");
      expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);
    });
  });

  describe("localPlantCancel", () => {
    it("cancels planting", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isPlanting: true, plantProgress: 0.5 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localPlantCancel();
      const updated = useOffline5v5Store.getState().players.get("local")!;
      expect(updated.isPlanting).toBe(false);
      expect(updated.plantProgress).toBe(0);
    });
  });

  describe("localDefuseStart", () => {
    it("starts defusing when CT near planted bomb", () => {
      useOffline5v5Store.getState().initMatch("Tester", "CT");
      useOffline5v5Store.setState({
        phase: "active",
        bombPlanted: true,
        bombSite: "A",
      });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const siteA = BOMB_SITES.A;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, x: siteA.x, z: siteA.z, team: "CT" });
      useOffline5v5Store.setState({ players });

      useOffline5v5Store.getState().localDefuseStart();
      const updated = useOffline5v5Store.getState().players.get("local")!;
      expect(updated.isDefusing).toBe(true);
    });

    it("rejects defuse when T", () => {
      useOffline5v5Store.setState({ phase: "active", bombPlanted: true });
      useOffline5v5Store.getState().localDefuseStart();
      expect(useOffline5v5Store.getState().players.get("local")!.isDefusing).toBe(false);
    });

    it("rejects defuse when bomb not planted", () => {
      useOffline5v5Store.getState().initMatch("Tester", "CT");
      useOffline5v5Store.setState({ phase: "active", bombPlanted: false });
      useOffline5v5Store.getState().localDefuseStart();
      expect(useOffline5v5Store.getState().players.get("local")!.isDefusing).toBe(false);
    });

    it("rejects defuse when too far", () => {
      useOffline5v5Store.getState().initMatch("Tester", "CT");
      useOffline5v5Store.setState({ phase: "active", bombPlanted: true, bombSite: "A" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, x: 999, z: 999, team: "CT" });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localDefuseStart();
      expect(useOffline5v5Store.getState().players.get("local")!.isDefusing).toBe(false);
    });
  });

  describe("localDefuseCancel", () => {
    it("cancels defusing", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isDefusing: true, defuseProgress: 0.5 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localDefuseCancel();
      const updated = useOffline5v5Store.getState().players.get("local")!;
      expect(updated.isDefusing).toBe(false);
      expect(updated.defuseProgress).toBe(0);
    });
  });

  describe("checkRoundEnd", () => {
    it("CT wins when all T dead and no bomb planted", () => {
      useOffline5v5Store.setState({ phase: "active" });
      // Kill all T players
      const players = new Map(useOffline5v5Store.getState().players);
      for (const [id, p] of players) {
        if (p.team === "T") players.set(id, { ...p, isDead: true });
      }
      useOffline5v5Store.setState({ players, bombPlanted: false });
      useOffline5v5Store.getState().checkRoundEnd();
      expect(useOffline5v5Store.getState().phase).toBe("roundEnd");
      expect(useOffline5v5Store.getState().teamBlueScore).toBe(1); // CT win
    });

    it("T wins when all CT dead", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const players = new Map(useOffline5v5Store.getState().players);
      for (const [id, p] of players) {
        if (p.team === "CT") players.set(id, { ...p, isDead: true });
      }
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().checkRoundEnd();
      expect(useOffline5v5Store.getState().phase).toBe("roundEnd");
      expect(useOffline5v5Store.getState().teamRedScore).toBe(1); // T win
    });

    it("does not trigger during buy phase", () => {
      const players = new Map(useOffline5v5Store.getState().players);
      for (const [id, p] of players) {
        if (p.team === "CT") players.set(id, { ...p, isDead: true });
      }
      useOffline5v5Store.setState({ players, phase: "buy" });
      useOffline5v5Store.getState().checkRoundEnd();
      expect(useOffline5v5Store.getState().phase).toBe("buy");
    });
  });

  describe("localReload", () => {
    it("starts reload when ammo < magazine and has reserve", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", {
        ...me,
        currentWeapon: "ak47",
        ammo: 10,
        reserveAmmo: 30,
        isReloading: false,
      });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(true);
    });

    it("does not reload when already reloading", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isReloading: true, ammo: 10, reserveAmmo: 30 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();
      // Should still be reloading (no double reload)
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(true);
    });

    it("does not reload when dead", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, isDead: true, ammo: 10, reserveAmmo: 30 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(false);
    });

    it("does not reload when mag is full", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, currentWeapon: "ak47", ammo: 30, reserveAmmo: 30 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(false);
    });

    it("does not reload when no reserve ammo", () => {
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, currentWeapon: "ak47", ammo: 10, reserveAmmo: 0 });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();
      expect(useOffline5v5Store.getState().players.get("local")!.isReloading).toBe(false);
    });

    it("does not overfill mag if ammo grows during reload", () => {
      vi.useFakeTimers();
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", {
        ...me,
        currentWeapon: "ak47",
        ammo: 10,
        reserveAmmo: 30,
        isReloading: false,
      });
      useOffline5v5Store.setState({ players });
      useOffline5v5Store.getState().localReload();

      const mid = useOffline5v5Store.getState().players.get("local")!;
      const midPlayers = new Map(useOffline5v5Store.getState().players);
      midPlayers.set("local", { ...mid, ammo: 40 });
      useOffline5v5Store.setState({ players: midPlayers });

      vi.runAllTimers();
      const after = useOffline5v5Store.getState().players.get("local")!;
      expect(after.ammo).toBe(40);
      expect(after.reserveAmmo).toBe(30);
      expect(after.isReloading).toBe(false);
      vi.useRealTimers();
    });
  });

  describe("localShoot", () => {
    it("returns false when no kill", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const result = useOffline5v5Store.getState().localShoot("bot_ct1", false);
      expect(result).toBe(false);
    });

    it("returns true on kill", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const me = useOffline5v5Store.getState().players.get("local")!;
      const players = new Map(useOffline5v5Store.getState().players);
      players.set("local", { ...me, currentWeapon: "ak47", ammo: 30, reserveAmmo: 90 });
      useOffline5v5Store.setState({ players });

      // Give victim low HP
      const victim = useOffline5v5Store.getState().players.get("bot_ct1")!;
      const p2 = new Map(useOffline5v5Store.getState().players);
      p2.set("bot_ct1", { ...victim, hp: 1 });
      useOffline5v5Store.setState({ players: p2 });

      const result = useOffline5v5Store.getState().localShoot("bot_ct1", false);
      expect(result).toBe(true);
    });

    it("null target does not count as hit", () => {
      useOffline5v5Store.setState({ phase: "active" });
      const result = useOffline5v5Store.getState().localShoot(null, false);
      expect(result).toBe(false);
    });
  });

  describe("difficulty", () => {
    it("setDifficulty updates difficulty", () => {
      useOffline5v5Store.getState().setDifficulty("hard");
      expect(useOffline5v5Store.getState().difficulty).toBe("hard");
    });
  });
});
