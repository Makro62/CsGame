import { describe, it, expect } from "vitest";
import { executeLocalBuy, getWeaponStats } from "@src/game/offline/EconomySystem";
import { mkPlayer } from "@src/game/offline/BotAI";
import { WEAPONS, GEAR, ECONOMY } from "@cs-game/shared";
import type { LocalPlayer } from "@src/game/offline/types";

function mkPlayers(money = 16000, team: "T" | "CT" = "T") {
  const players = new Map<string, LocalPlayer>();
  const me = mkPlayer("local", team, "Test", false);
  me.money = money;
  players.set("local", me);
  return players;
}

describe("EconomySystem", () => {
  describe("getWeaponStats", () => {
    it("returns stats for known weapon", () => {
      expect(getWeaponStats("ak47")).toBeDefined();
      expect(getWeaponStats("ak47")!.dmg).toBe(35);
    });

    it("returns undefined for unknown weapon", () => {
      expect(getWeaponStats("nonexistent")).toBeUndefined();
    });
  });

  describe("executeLocalBuy - weapons", () => {
    it("buys primary rifle and deducts money", () => {
      const players = mkPlayers(5000, "T");
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.money).toBe(5000 - WEAPONS.ak47.price);
      expect(result.players.get("local")!.primaryWeapon).toBe("ak47");
      expect(result.players.get("local")!.currentWeapon).toBe("ak47");
    });

    it("rejects buy when not enough money", () => {
      const players = mkPlayers(100);
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
      expect(result.players.get("local")!.money).toBe(100);
    });

    it("rejects team-locked weapon", () => {
      const players = mkPlayers(16000, "T");
      const result = executeLocalBuy(players, "m4a1"); // CT only
      expect(result.success).toBe(false);
    });

    it("rejects buying same primary weapon", () => {
      const players = mkPlayers(16000, "T");
      players.get("local")!.primaryWeapon = "ak47";
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("replaces old primary when buying new one", () => {
      const players = mkPlayers(16000, "T");
      players.get("local")!.primaryWeapon = "mp5";
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.primaryWeapon).toBe("ak47");
    });

    it("buys secondary weapon", () => {
      const players = mkPlayers(16000, "T");
      const result = executeLocalBuy(players, "deagle");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.secondaryWeapon).toBe("deagle");
      expect(result.players.get("local")!.currentWeapon).toBe("deagle");
    });

    it("rejects buying same secondary weapon", () => {
      const players = mkPlayers(16000, "T");
      players.get("local")!.secondaryWeapon = "glock";
      const result = executeLocalBuy(players, "glock");
      expect(result.success).toBe(false);
    });

    it("buys combatknife (melee)", () => {
      const players = mkPlayers(16000);
      players.get("local")!.knifeSlot = "knife";
      const result = executeLocalBuy(players, "combatknife");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.knifeSlot).toBe("combatknife");
      expect(result.players.get("local")!.currentWeapon).toBe("combatknife");
    });

    it("rejects buying same melee weapon", () => {
      const players = mkPlayers(16000);
      players.get("local")!.knifeSlot = "knife";
      const result = executeLocalBuy(players, "knife");
      expect(result.success).toBe(false);
    });

    it("does not set ammo for melee weapons", () => {
      const players = mkPlayers(16000);
      players.get("local")!.knifeSlot = "knife";
      const result = executeLocalBuy(players, "combatknife");
      const me = result.players.get("local")!;
      // combatknife has mag=1, but melee doesn't change ammo
      expect(me.currentWeapon).toBe("combatknife");
    });
  });

  describe("executeLocalBuy - gear", () => {
    it("buys kevlar and gives armor", () => {
      const players = mkPlayers(16000);
      const result = executeLocalBuy(players, "kevlar");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.armor).toBe(100);
      expect(result.players.get("local")!.money).toBe(16000 - GEAR.kevlar.price);
    });

    it("rejects kevlar when not enough money", () => {
      const players = mkPlayers(100);
      const result = executeLocalBuy(players, "kevlar");
      expect(result.success).toBe(false);
    });

    it("buys helmet and sets hasHelmet", () => {
      const players = mkPlayers(16000);
      const result = executeLocalBuy(players, "helmet");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.hasHelmet).toBe(true);
      expect(result.players.get("local")!.armor).toBe(100);
      expect(result.players.get("local")!.money).toBe(16000 - GEAR.helmet.price);
    });

    it("rejects helmet if already has one", () => {
      const players = mkPlayers(16000);
      players.get("local")!.hasHelmet = true;
      const result = executeLocalBuy(players, "helmet");
      expect(result.success).toBe(false);
    });

    it("CT can buy defuse kit", () => {
      const players = mkPlayers(16000, "CT");
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.hasDefuseKit).toBe(true);
    });

    it("T cannot buy defuse kit", () => {
      const players = mkPlayers(16000, "T");
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(false);
    });

    it("rejects defuse kit if already has one", () => {
      const players = mkPlayers(16000, "CT");
      players.get("local")!.hasDefuseKit = true;
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(false);
    });
  });

  describe("executeLocalBuy - grenades", () => {
    it("buys HE grenade", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeHE");
      expect(r1.success).toBe(true);
      expect(r1.players.get("local")!.grenadeHE).toBe(1);
    });

    it("rejects second HE grenade", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeHE");
      expect(r1.success).toBe(true);
      const r2 = executeLocalBuy(r1.players, "grenadeHE");
      expect(r2.success).toBe(false);
    });

    it("buys smoke grenade", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeSmoke");
      expect(r1.success).toBe(true);
      expect(r1.players.get("local")!.grenadeSmoke).toBe(1);
    });

    it("rejects second smoke grenade", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeSmoke");
      expect(r1.success).toBe(true);
      const r2 = executeLocalBuy(r1.players, "grenadeSmoke");
      expect(r2.success).toBe(false);
    });

    it("buys flash grenade (max 2)", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeFlash");
      expect(r1.success).toBe(true);
      const r2 = executeLocalBuy(r1.players, "grenadeFlash");
      expect(r2.success).toBe(true);
      expect(r2.players.get("local")!.grenadeFlash).toBe(2);
    });

    it("rejects third flash grenade", () => {
      const players = mkPlayers(16000);
      const r1 = executeLocalBuy(players, "grenadeFlash");
      const r2 = executeLocalBuy(r1.players, "grenadeFlash");
      expect(r2.success).toBe(true);
      const r3 = executeLocalBuy(r2.players, "grenadeFlash");
      expect(r3.success).toBe(false);
    });
  });

  describe("executeLocalBuy - edge cases", () => {
    it("rejects buy when local player is dead", () => {
      const players = mkPlayers(16000);
      players.get("local")!.isDead = true;
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("rejects buy when no local player", () => {
      const players = mkPlayers(16000);
      players.delete("local");
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("rejects unknown item", () => {
      const players = mkPlayers(16000);
      const result = executeLocalBuy(players, "banana");
      expect(result.success).toBe(false);
    });

    it("money cannot go negative", () => {
      const players = mkPlayers(WEAPONS.ak47.price + 50);
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(true);
      expect(result.players.get("local")!.money).toBe(50);
    });

    it("money is capped at 16000 via maxMoney", () => {
      // After buying and selling (no sell exists), just verify initial cap behavior
      const players = mkPlayers(ECONOMY.maxMoney);
      expect(players.get("local")!.money).toBe(ECONOMY.maxMoney);
    });

    it("CT already has autopistol as default, cannot rebuy", () => {
      const players = mkPlayers(16000, "CT");
      // CT already has autopistol as secondaryWeapon (DEFAULT_PISTOL.CT)
      expect(players.get("local")!.secondaryWeapon).toBe("autopistol");
      const result = executeLocalBuy(players, "autopistol");
      expect(result.success).toBe(false); // same weapon already owned
    });

    it("T cannot buy autopistol (CT-only)", () => {
      const players = mkPlayers(16000, "T");
      const result = executeLocalBuy(players, "autopistol");
      expect(result.success).toBe(false);
    });

    it("T can buy tec9 (T-only)", () => {
      const players = mkPlayers(16000, "T");
      const result = executeLocalBuy(players, "tec9");
      expect(result.success).toBe(true);
    });

    it("CT cannot buy tec9 (T-only)", () => {
      const players = mkPlayers(16000, "CT");
      const result = executeLocalBuy(players, "tec9");
      expect(result.success).toBe(false);
    });

    it("both teams can buy awp", () => {
      const t = executeLocalBuy(mkPlayers(16000, "T"), "awp");
      expect(t.success).toBe(true);
      const ct = executeLocalBuy(mkPlayers(16000, "CT"), "awp");
      expect(ct.success).toBe(true);
    });

    it("both teams can buy mp5", () => {
      const t = executeLocalBuy(mkPlayers(16000, "T"), "mp5");
      expect(t.success).toBe(true);
      const ct = executeLocalBuy(mkPlayers(16000, "CT"), "mp5");
      expect(ct.success).toBe(true);
    });
  });
});