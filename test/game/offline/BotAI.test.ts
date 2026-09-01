import { describe, it, expect } from "vitest";
import { botBuy, defaultLoadout, refillAmmo, mkPlayer } from "@src/game/offline/BotAI";
import { WEAPONS } from "@cs-game/shared";

describe("BotAI deep tests", () => {
  describe("botBuy", () => {
    it("CT buys defuse kit first if affordable", () => {
      const bot = mkPlayer("bot_ct1", "CT", "Bot", true);
      bot.money = 800;
      botBuy(bot);
      expect(bot.hasDefuseKit).toBe(true);
      expect(bot.money).toBe(400); // 800 - 400
    });

    it("CT with low money cannot afford defuse kit", () => {
      const bot = mkPlayer("bot_ct1", "CT", "Bot", true);
      bot.money = 300;
      botBuy(bot);
      expect(bot.hasDefuseKit).toBe(false);
      expect(bot.money).toBe(300);
    });

    it("entry role buys mp5", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.money = 5000;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("mp5");
    });

    it("flanker role buys awp if affordable", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "flanker";
      bot.money = 5000;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("awp");
    });

    it("support role buys rifle", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "support";
      bot.money = 5000;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("ak47");
    });

    it("T support buys ak47", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "support";
      bot.money = 5000;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("ak47");
    });

    it("CT support buys m4a1", () => {
      const bot = mkPlayer("bot_ct1", "CT", "Bot", true);
      bot.botRole = "support";
      bot.money = 5000;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("m4a1");
    });

    it("entry with only 1500 buys mp5 exactly", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.money = 1500;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("mp5");
      expect(bot.money).toBe(0);
    });

    it("entry with 1499 buys helmet first, cannot afford deagle", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.money = 1499;
      botBuy(bot);
      // mp5 = 1500, can't afford. buyId = null.
      // helmet = 1000, 1499 >= 1000 → buys helmet (money=499)
      // deagle = 700, 499 < 700 → can't afford
      expect(bot.hasHelmet).toBe(true);
      expect(bot.money).toBe(499);
      expect(bot.currentWeapon).toBe("glock");
    });

    it("bot with very low money buys nothing", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.money = 100;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("");
      expect(bot.money).toBe(100);
    });

    it("flanker with money for awp buys awp", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "flanker";
      bot.money = 4750;
      botBuy(bot);
      expect(bot.primaryWeapon).toBe("awp");
    });

    it("flanker without awp money falls back to mp5", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "flanker";
      bot.money = 1500;
      botBuy(bot);
      // awp = 4750, can't afford. Fallback mp5 = 1500, can afford.
      expect(bot.primaryWeapon).toBe("mp5");
    });

    it("helmet + armor is bought when enough money after primary", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.money = 3000;
      botBuy(bot);
      // mp5 = 1500, remaining = 1500. 1500 >= 1000, buys helmet+armor
      expect(bot.hasHelmet).toBe(true);
      expect(bot.armor).toBe(100);
    });

    it("armor only bought when no helmet money", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.money = 2200;
      botBuy(bot);
      // mp5 = 1500, remaining = 700. 700 < 1000, but 700 >= 650, buys armor
      expect(bot.hasHelmet).toBe(false);
      expect(bot.armor).toBe(100);
    });

    it("does not buy armor if already has 100", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      bot.armor = 100;
      bot.money = 2200;
      const moneyBefore = bot.money;
      botBuy(bot);
      // mp5 = 1500, remaining = 700. armor check: 100 < 100 is false → no armor buy
      expect(bot.money).toBe(moneyBefore - 1500); // only mp5 cost deducted
    });
  });

  describe("defaultLoadout", () => {
    it("T gets glock", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      defaultLoadout(bot);
      expect(bot.secondaryWeapon).toBe("glock");
      expect(bot.currentWeapon).toBe("glock");
      expect(bot.primaryWeapon).toBe("");
    });

    it("CT gets autopistol", () => {
      const bot = mkPlayer("bot_ct1", "CT", "Bot", true);
      defaultLoadout(bot);
      expect(bot.secondaryWeapon).toBe("autopistol");
      expect(bot.currentWeapon).toBe("autopistol");
    });

    it("sets ammo from weapon stats", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      defaultLoadout(bot);
      const ws = WEAPONS.glock;
      expect(bot.ammo).toBe(ws.mag);
      expect(bot.reserveAmmo).toBe(ws.reserveAmmo);
    });
  });

  describe("refillAmmo", () => {
    it("refills ammo for current weapon", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.currentWeapon = "ak47";
      bot.ammo = 5;
      bot.reserveAmmo = 10;
      refillAmmo(bot);
      expect(bot.ammo).toBe(WEAPONS.ak47.mag);
      expect(bot.reserveAmmo).toBe(WEAPONS.ak47.reserveAmmo);
    });

    it("does not refill melee weapon", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.currentWeapon = "knife";
      bot.ammo = 0;
      refillAmmo(bot);
      expect(bot.ammo).toBe(0);
    });

    it("does nothing for unknown weapon", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.currentWeapon = "nonexistent";
      bot.ammo = 5;
      refillAmmo(bot);
      expect(bot.ammo).toBe(5);
    });
  });

  describe("mkPlayer", () => {
    it("creates player at correct spawn", () => {
      const t = mkPlayer("bot_t1", "T", "Bot", true);
      expect(t.x).toBeLessThan(0); // T spawn is west
      const ct = mkPlayer("bot_ct1", "CT", "Bot", true);
      expect(ct.x).toBeGreaterThan(0); // CT spawn is east
    });

    it("local player spawns at exact spawn point", () => {
      const local = mkPlayer("local", "T", "Player", false);
      expect(local.x).toBe(-22); // SPAWN.T.x
    });

    it("entry role has speed bonus", () => {
      const bot = mkPlayer("bot_t1", "T", "Bot", true);
      bot.botRole = "entry";
      const support = mkPlayer("bot_t2", "T", "Bot", true);
      support.botRole = "support";
      expect(bot.botSpeed).toBeGreaterThan(support.botSpeed);
    });

    it("flanker has extended view distance (set at creation time)", () => {
      // View distance is computed at mkPlayer time based on auto-assigned role
      // bot_t4 gets flanker role via roleForBotId
      const flanker = mkPlayer("bot_t4", "T", "Bot", true);
      const support = mkPlayer("bot_t2", "T", "Bot", true);
      expect(flanker.botViewDist).toBeGreaterThan(support.botViewDist);
    });

    it("local player is not a bot", () => {
      const local = mkPlayer("local", "T", "Player", false);
      expect(local.isBot).toBe(false);
    });

    it("difficulty affects stats", () => {
      const easy = mkPlayer("e1", "T", "Bot", true, "easy");
      const expert = mkPlayer("e2", "T", "Bot", true, "expert");
      expect(expert.botAccuracy).toBeGreaterThan(easy.botAccuracy);
      expect(expert.botSpeed).toBeGreaterThan(easy.botSpeed);
    });
  });
});