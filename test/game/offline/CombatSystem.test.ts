import { describe, it, expect } from "vitest";
import {
  executeLocalShoot,
} from "../../../client/src/game/offline/CombatSystem";
import type { LocalPlayer, KillEvent } from "../../../client/src/game/offline/types";

function mkPlayer(overrides: Partial<LocalPlayer> = {}): LocalPlayer {
  return {
    id: "local",
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    hp: 100,
    isDead: false,
    team: "T",
    nickname: "Test",
    money: 800,
    kills: 0,
    deaths: 0,
    currentWeapon: "ak47",
    primaryWeapon: "ak47",
    secondaryWeapon: "glock",
    knifeSlot: "knife",
    ammo: 30,
    reserveAmmo: 90,
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
    botAmmoInMag: 30,
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

describe("CombatSystem", () => {
  describe("executeLocalShoot", () => {
    it("returns no hit when local player is dead", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ isDead: true }));
      const result = executeLocalShoot(players, [], null, false);
      expect(result.didHitEnemy).toBe(false);
    });

    it("returns no hit when targetId is null", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      const result = executeLocalShoot(players, [], null, false);
      expect(result.didHitEnemy).toBe(false);
    });

    it("damages enemy on hit", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 100,
      }));
      const result = executeLocalShoot(players, [], "enemy", false);
      expect(result.didHitEnemy).toBe(true);
      const enemy = result.players.get("enemy")!;
      expect(enemy.hp).toBeLessThan(100);
    });

    it("kills enemy on lethal damage", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 10,
      }));
      const result = executeLocalShoot(players, [], "enemy", false);
      expect(result.didKillEnemy).toBe(true);
      const enemy = result.players.get("enemy")!;
      expect(enemy.isDead).toBe(true);
      const local = result.players.get("local")!;
      expect(local.kills).toBe(1);
    });

    it("adds kill feed entry", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 10,
      }));
      const result = executeLocalShoot(players, [], "enemy", false);
      expect(result.killFeed).toHaveLength(1);
      expect(result.killFeed[0].headshot).toBe(false);
    });

    it("drops bomb when victim has it", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 10,
        hasBomb: true,
      }));
      const result = executeLocalShoot(players, [], "enemy", false);
      expect(result.bombDropped).toBe(true);
    });

    it("does not damage teammate", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer({ team: "T" }));
      players.set("ally", mkPlayer({
        id: "ally",
        team: "T",
        hp: 100,
      }));
      const result = executeLocalShoot(players, [], "ally", false);
      expect(result.didHitEnemy).toBe(false);
    });

    it("applies headshot multiplier", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 200,
      }));
      const normal = executeLocalShoot(players, [], "enemy", false);
      const normalDmg = 200 - normal.players.get("enemy")!.hp;

      const players2 = new Map<string, LocalPlayer>();
      players2.set("local", mkPlayer());
      players2.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 200,
      }));
      const hs = executeLocalShoot(players2, [], "enemy", true);
      const hsDmg = 200 - hs.players.get("enemy")!.hp;
      expect(hsDmg).toBeGreaterThan(normalDmg);
    });

    it("armor absorbs part of body damage", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 100,
        armor: 100,
      }));
      const result = executeLocalShoot(players, [], "enemy", false);
      const enemy = result.players.get("enemy")!;
      expect(enemy.hp).toBeGreaterThan(65);
      expect(enemy.armor).toBeLessThan(100);
    });

    it("helmet reduces rifle headshot below lethal one-tap", () => {
      const players = new Map<string, LocalPlayer>();
      players.set("local", mkPlayer());
      players.set("enemy", mkPlayer({
        id: "enemy",
        team: "CT",
        hp: 100,
        armor: 100,
        hasHelmet: true,
      }));
      const result = executeLocalShoot(players, [], "enemy", true);
      const enemy = result.players.get("enemy")!;
      expect(enemy.isDead).toBe(false);
      expect(enemy.hp).toBeGreaterThan(0);
    });
  });
});
