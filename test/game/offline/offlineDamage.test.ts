import { describe, it, expect } from "vitest";
import {
  resolveBulletDamage,
  applyArmorToDamage,
  applyBulletDamageToPlayer,
} from "../../../client/src/game/offline/offlineDamage";
import type { LocalPlayer } from "../../../client/src/game/offline/types";

function mkVictim(overrides: Partial<LocalPlayer> = {}): LocalPlayer {
  return {
    id: "victim",
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    hp: 100,
    isDead: false,
    team: "CT",
    nickname: "Victim",
    money: 0,
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

describe("offlineDamage", () => {
  describe("resolveBulletDamage", () => {
    it("returns body damage without headshot", () => {
      expect(resolveBulletDamage(35, 100, false, false)).toBe(35);
    });

    it("returns full headshot without helmet", () => {
      expect(resolveBulletDamage(35, 100, true, false)).toBe(100);
    });

    it("reduces rifle headshot with helmet", () => {
      expect(resolveBulletDamage(35, 100, true, true)).toBe(70);
    });

    it("AWP still one-taps through helmet", () => {
      expect(resolveBulletDamage(115, 115, true, true)).toBe(115);
    });
  });

  describe("applyArmorToDamage", () => {
    it("absorbs half damage with armor", () => {
      const r = applyArmorToDamage({ hp: 100, armor: 100 }, 40);
      expect(r.hp).toBe(80);
      expect(r.armor).toBe(80);
    });
  });

  describe("applyBulletDamageToPlayer", () => {
    it("applies armor then hp reduction", () => {
      const victim = mkVictim({ armor: 100 });
      const updated = applyBulletDamageToPlayer(victim, 35, 100, false);
      expect(updated.hp).toBeLessThan(100);
      expect(updated.armor).toBeLessThan(100);
    });
  });
});
