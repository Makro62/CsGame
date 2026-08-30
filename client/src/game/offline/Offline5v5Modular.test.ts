import { describe, expect, it, beforeEach } from "vitest";
import { mkPlayer, DIFFICULTIES, botBuy, defaultLoadout } from "./BotAI";
import { executeLocalBuy } from "./EconomySystem";
import { executeLocalShoot } from "./CombatSystem";
import { tickRound } from "./RoundManager";
import { useOffline5v5Store } from "../../stores/useOffline5v5Store";
import type { LocalPlayer } from "./types";

describe("5v5 Offline Modular Subsystems", () => {
  beforeEach(() => {
    useOffline5v5Store.getState().initMatch("Tester", "T", "medium");
  });

  describe("BotAI Difficulty & Loadout", () => {
    it("scales bot stats with difficulty levels", () => {
      expect(DIFFICULTIES.easy.accuracy).toBeLessThan(DIFFICULTIES.medium.accuracy);
      expect(DIFFICULTIES.medium.accuracy).toBeLessThan(DIFFICULTIES.hard.accuracy);
      expect(DIFFICULTIES.hard.accuracy).toBeLessThan(DIFFICULTIES.expert.accuracy);

      const easyBot = mkPlayer("b_easy", "CT", "EasyBot", true, "easy");
      const expertBot = mkPlayer("b_expert", "CT", "ExpertBot", true, "expert");

      expect(easyBot.botAccuracy).toBe(DIFFICULTIES.easy.accuracy);
      expect(expertBot.botAccuracy).toBe(DIFFICULTIES.expert.accuracy);
      expect(easyBot.botSpeed).toBeLessThan(expertBot.botSpeed);
    });

    it("resets loadout to default pistol and knife", () => {
      const bot = mkPlayer("b1", "T", "Bot1", true);
      bot.primaryWeapon = "ak47";
      bot.currentWeapon = "ak47";

      defaultLoadout(bot);
      expect(bot.primaryWeapon).toBe("");
      expect(bot.currentWeapon).toBe("glock");
      expect(bot.secondaryWeapon).toBe("glock");
    });

    it("buys rifle and armor if bot has enough funds", () => {
      const bot = mkPlayer("bot_t2", "T", "Support", true);
      bot.money = 5000;
      botBuy(bot);

      expect(bot.botRole).toBe("support");
      expect(bot.primaryWeapon).toBe("ak47");
      expect(bot.currentWeapon).toBe("ak47");
      expect(bot.armor).toBe(100);
      expect(bot.hasHelmet).toBe(true);
      expect(bot.money).toBeLessThan(5000);
    });

    it("splits buy loadout by squad role", () => {
      const entry = mkPlayer("bot_t1", "T", "Entry", true);
      entry.money = 5000;
      botBuy(entry);
      expect(entry.botRole).toBe("entry");
      expect(entry.primaryWeapon).toBe("mp5");

      const flanker = mkPlayer("bot_t4", "T", "Flanker", true);
      flanker.money = 8000;
      botBuy(flanker);
      expect(flanker.botRole).toBe("flanker");
      expect(flanker.primaryWeapon).toBe("awp");
    });
  });

  describe("EconomySystem", () => {
    it("allows buying AK-47 only for T side and deducts correct price", () => {
      const players = new Map<string, LocalPlayer>();
      const tPlayer = mkPlayer("local", "T", "LocalT", false);
      tPlayer.money = 3500;
      players.set("local", tPlayer);

      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(true);
      const updated = result.players.get("local")!;
      expect(updated.primaryWeapon).toBe("ak47");
      expect(updated.currentWeapon).toBe("ak47");
      expect(updated.money).toBe(800); // 3500 - 2700
    });

    it("rejects purchases when player has insufficient money", () => {
      const players = new Map<string, LocalPlayer>();
      const brokePlayer = mkPlayer("local", "T", "LocalT", false);
      brokePlayer.money = 200;
      players.set("local", brokePlayer);

      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
      expect(result.players.get("local")?.money).toBe(200);
    });

    it("rejects team-restricted weapon purchases", () => {
      const players = new Map<string, LocalPlayer>();
      const ctPlayer = mkPlayer("local", "CT", "LocalCT", false);
      ctPlayer.money = 5000;
      players.set("local", ctPlayer);

      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("rejects buying a weapon already in that slot", () => {
      const players = new Map<string, LocalPlayer>();
      const tPlayer = mkPlayer("local", "T", "LocalT", false);
      tPlayer.money = 8000;
      tPlayer.primaryWeapon = "ak47";
      players.set("local", tPlayer);

      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
      expect(result.players.get("local")?.money).toBe(8000);
    });

    it("replaces the primary slot when buying a different rifle", () => {
      const players = new Map<string, LocalPlayer>();
      const tPlayer = mkPlayer("local", "T", "LocalT", false);
      tPlayer.money = 5000;
      tPlayer.primaryWeapon = "mp5";
      players.set("local", tPlayer);

      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(true);
      expect(result.players.get("local")?.primaryWeapon).toBe("ak47");
      expect(result.players.get("local")?.money).toBe(2300);
    });

    it("assigns combat knife to the melee slot", () => {
      const players = new Map<string, LocalPlayer>();
      const tPlayer = mkPlayer("local", "T", "LocalT", false);
      tPlayer.money = 800;
      players.set("local", tPlayer);

      const result = executeLocalBuy(players, "combatknife");
      expect(result.success).toBe(true);
      const updated = result.players.get("local")!;
      expect(updated.knifeSlot).toBe("combatknife");
      expect(updated.currentWeapon).toBe("combatknife");
      expect(updated.money).toBe(300);
    });
  });

  describe("CombatSystem", () => {
    it("applies headshot damage and drops bomb when carrier is killed", () => {
      const players = new Map<string, LocalPlayer>();
      const shooter = mkPlayer("local", "CT", "Shooter", false);
      shooter.primaryWeapon = "m4a1";
      shooter.currentWeapon = "m4a1";
      players.set("local", shooter);

      const victim = mkPlayer("bot_t1", "T", "Carrier", true);
      victim.hp = 50;
      victim.hasBomb = true;
      victim.x = 12;
      victim.z = -18;
      players.set("bot_t1", victim);

      const result = executeLocalShoot(players, [], "bot_t1", true);
      expect(result.didHitEnemy).toBe(true);
      expect(result.didKillEnemy).toBe(true);
      expect(result.bombDropped).toBe(true);
      expect(result.bombDropX).toBe(12);
      expect(result.bombDropZ).toBe(-18);

      const updatedVictim = result.players.get("bot_t1")!;
      expect(updatedVictim.isDead).toBe(true);
      expect(updatedVictim.hp).toBe(0);
      expect(updatedVictim.hasBomb).toBe(false);
      expect(result.killFeed.length).toBe(1);
      expect(result.killFeed[0].headshot).toBe(true);
    });
  });

  describe("RoundManager & Frame-Based Reload", () => {
    it("completes bot frame-based reload and refills ammo without setTimeout leaks", () => {
      const state = useOffline5v5Store.getState();
      state.initMatch("Tester", "CT");

      const store = useOffline5v5Store.getState();
      const bot = store.players.get("bot_t1")!;
      bot.ammo = 0;
      bot.botAmmoInMag = 0;
      bot.reserveAmmo = 90;
      bot.isReloading = true;
      store.players.set("bot_t1", bot);

      // Register active reload
      store.activeReloads.set("bot_t1", {
        botId: "bot_t1",
        duration: 2.0,
        progress: 0,
      });

      useOffline5v5Store.setState({ phase: "active" });

      // Tick 1 second (50% progress)
      useOffline5v5Store.getState().tick(1.0);
      let reloads = useOffline5v5Store.getState().activeReloads;
      expect(reloads.has("bot_t1")).toBe(true);
      expect(reloads.get("bot_t1")!.progress).toBeCloseTo(0.5, 1);

      // Tick another 1.1 seconds (105% progress -> complete)
      useOffline5v5Store.getState().tick(1.1);
      reloads = useOffline5v5Store.getState().activeReloads;
      expect(reloads.has("bot_t1")).toBe(false);

      const reloadedBot = useOffline5v5Store.getState().players.get("bot_t1")!;
      expect(reloadedBot.isReloading).toBe(false);
      expect(reloadedBot.botAmmoInMag).toBeGreaterThan(0);
    });

    it("cancels frame-based reload immediately if bot dies during reload", () => {
      const state = useOffline5v5Store.getState();
      state.initMatch("Tester", "CT");

      const store = useOffline5v5Store.getState();
      const bot = store.players.get("bot_t1")!;
      bot.isReloading = true;
      bot.isDead = true; // Bot eliminated during reload
      store.players.set("bot_t1", bot);

      store.activeReloads.set("bot_t1", {
        botId: "bot_t1",
        duration: 2.0,
        progress: 0.3,
      });

      useOffline5v5Store.setState({ phase: "active" });
      useOffline5v5Store.getState().tick(0.1);

      // Reload should be cancelled immediately
      expect(useOffline5v5Store.getState().activeReloads.has("bot_t1")).toBe(false);
    });
  });
});
