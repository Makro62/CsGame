import { describe, it, expect } from "vitest";
import { executeLocalBuy, getWeaponStats } from "../../../client/src/game/offline/EconomySystem";
import type { LocalPlayer } from "../../../client/src/game/offline/types";

function mkPlayer(overrides: Partial<LocalPlayer> = {}): LocalPlayer {
  return {
    id: "local",
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    hp: 100,
    isDead: false,
    team: "CT",
    nickname: "Test",
    money: 5000,
    kills: 0,
    deaths: 0,
    currentWeapon: "glock",
    primaryWeapon: "",
    secondaryWeapon: "glock",
    knifeSlot: "knife",
    ammo: 20,
    reserveAmmo: 120,
    armor: 0,
    hasHelmet: false,
    hasDefuseKit: false,
    grenadeHE: 0,
    grenadeSmoke: 0,
    grenadeFlash: 0,
    hasBomb: false,
    isBot: false,
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
    botAmmoInMag: 20,
    botAccuracy: 0.55,
    botHsRate: 0.15,
    botSpeed: 3.8,
    botViewDist: 26,
    plantSite: "A",
    botLane: "mid",
    botRole: "support",
    botWp: 0,
    ...overrides,
  };
}

describe("EconomySystem", () => {
  describe("executeLocalBuy", () => {
    it("returns false when player is dead", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ isDead: true }));
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("buys weapon when enough money", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 5000, team: "T" }));
      const result = executeLocalBuy(players, "mp5");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.primaryWeapon).toBe("mp5");
      expect(me.money).toBe(5000 - 1500);
    });

    it("rejects buy when not enough money", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 100 }));
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("buys kevlar", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 1000 }));
      const result = executeLocalBuy(players, "kevlar");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.armor).toBe(100);
    });

    it("rejects kevlar when armor is already full", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 5000, armor: 100 }));
      const result = executeLocalBuy(players, "kevlar");
      expect(result.success).toBe(false);
      expect(result.players.get("local")!.money).toBe(5000);
    });

    it("buys helmet", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 2000 }));
      const result = executeLocalBuy(players, "helmet");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.hasHelmet).toBe(true);
      expect(me.armor).toBe(100);
    });

    it("buys defuse kit for CT", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "CT", money: 1000 }));
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.hasDefuseKit).toBe(true);
    });

    it("rejects defuse kit for T", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "T", money: 1000 }));
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(false);
    });

    it("rejects duplicate primary", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ primaryWeapon: "mp5", money: 5000, team: "T" }));
      const result = executeLocalBuy(players, "mp5");
      expect(result.success).toBe(false);
    });

    it("buys HE grenade", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 1000 }));
      const result = executeLocalBuy(players, "grenadeHE");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.grenadeHE).toBe(1);
    });

    it("buys secondary weapon glock", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ secondaryWeapon: "", money: 1000 }));
      const result = executeLocalBuy(players, "glock");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.secondaryWeapon).toBe("glock");
      expect(me.currentWeapon).toBe("glock");
      expect(me.money).toBe(800);
    });

    it("buys secondary weapon deagle", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ secondaryWeapon: "", money: 1000 }));
      const result = executeLocalBuy(players, "deagle");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.secondaryWeapon).toBe("deagle");
      expect(me.money).toBe(300);
    });

    it("buys secondary weapon tec9 (T only)", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "T", secondaryWeapon: "", money: 1000 }));
      const result = executeLocalBuy(players, "tec9");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.secondaryWeapon).toBe("tec9");
      expect(me.money).toBe(500);
    });

    it("buys secondary weapon autopistol (CT only)", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "CT", secondaryWeapon: "", money: 1000 }));
      const result = executeLocalBuy(players, "autopistol");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.secondaryWeapon).toBe("autopistol");
      expect(me.money).toBe(500);
    });

    it("buys melee weapon knife", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ knifeSlot: "knife", money: 1000 }));
      const result = executeLocalBuy(players, "knife");
      expect(result.success).toBe(false);
    });

    it("buys melee weapon combatknife", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ knifeSlot: "knife", money: 1000 }));
      const result = executeLocalBuy(players, "combatknife");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.knifeSlot).toBe("combatknife");
      expect(me.currentWeapon).toBe("combatknife");
      expect(me.money).toBe(500);
    });

    it("rejects duplicate secondary weapon", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ secondaryWeapon: "glock", money: 5000 }));
      const result = executeLocalBuy(players, "glock");
      expect(result.success).toBe(false);
    });

    it("rejects duplicate melee weapon", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ knifeSlot: "knife", money: 5000 }));
      const result = executeLocalBuy(players, "knife");
      expect(result.success).toBe(false);
    });

    it("rejects CT weapon (m4a1) bought by T player", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "T", money: 5000 }));
      const result = executeLocalBuy(players, "m4a1");
      expect(result.success).toBe(false);
    });

    it("rejects T weapon (ak47) bought by CT player", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "CT", money: 5000 }));
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });

    it("rejects kevlar when already has armor", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ armor: 100, money: 1000 }));
      const result = executeLocalBuy(players, "kevlar");
      expect(result.success).toBe(false);
      expect(result.players.get("local")!.money).toBe(1000);
    });

    it("rejects helmet when already has helmet", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ hasHelmet: true, money: 2000 }));
      const result = executeLocalBuy(players, "helmet");
      expect(result.success).toBe(false);
    });

    it("rejects defuseKit when already has kit", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "CT", hasDefuseKit: true, money: 1000 }));
      const result = executeLocalBuy(players, "defuseKit");
      expect(result.success).toBe(false);
    });

    it("rejects grenadeHE when already has 1", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ grenadeHE: 1, money: 1000 }));
      const result = executeLocalBuy(players, "grenadeHE");
      expect(result.success).toBe(false);
    });

    it("buys grenadeSmoke", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 1000 }));
      const result = executeLocalBuy(players, "grenadeSmoke");
      expect(result.success).toBe(true);
      const me = result.players.get("local")!;
      expect(me.grenadeSmoke).toBe(1);
      expect(me.money).toBe(700);
    });

    it("buys grenadeFlash up to max 2", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 5000 }));
      const r1 = executeLocalBuy(players, "grenadeFlash");
      expect(r1.success).toBe(true);
      expect(r1.players.get("local")!.grenadeFlash).toBe(1);
      const r2 = executeLocalBuy(r1.players, "grenadeFlash");
      expect(r2.success).toBe(true);
      expect(r2.players.get("local")!.grenadeFlash).toBe(2);
      const r3 = executeLocalBuy(r2.players, "grenadeFlash");
      expect(r3.success).toBe(false);
    });

    it("rejects unknown item", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ money: 5000 }));
      const result = executeLocalBuy(players, "nonexistent_item");
      expect(result.success).toBe(false);
    });

    it("returns false when no local player exists", () => {
      const players = new Map<string, LocalPlayer>();
      const result = executeLocalBuy(players, "ak47");
      expect(result.success).toBe(false);
    });
  });

  describe("getWeaponStats", () => {
    it("returns stats for valid weapon", () => {
      const stats = getWeaponStats("ak47");
      expect(stats).toBeDefined();
      expect(stats!.price).toBe(2700);
      expect(stats!.team).toBe("T");
    });

    it("returns undefined for invalid weapon", () => {
      const stats = getWeaponStats("nonexistent");
      expect(stats).toBeUndefined();
    });
  });
});
