import { describe, it, expect, beforeEach } from "vitest";
import { useZombieStore } from "@src/stores/useZombieStore";

beforeEach(() => useZombieStore.getState().resetGame(true));

describe("useZombieStore P0 fixes", () => {
  describe("addPoints NaN guard", () => {
    it("ignores NaN amount (previously corrupted to NaN)", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(NaN);
      expect(useZombieStore.getState().player.points).toBe(before);
      expect(Number.isFinite(useZombieStore.getState().player.points)).toBe(true);
    });

    it("ignores Infinity amount", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(Infinity);
      expect(useZombieStore.getState().player.points).toBe(before);
    });

    it("double_points does not corrupt with NaN", () => {
      useZombieStore.getState().setPlayer(p => ({
        ...p, activePowerUps: new Map([["double_points", Date.now() + 10000]]),
      }));
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(NaN);
      expect(useZombieStore.getState().player.points).toBe(before);
    });
  });

  describe("setPlayer Map clone (previously shared ref mutation)", () => {
    it("does not mutate previous Map when fn mutates the clone", () => {
      useZombieStore.getState().setPlayer(p => ({
        ...p, activePowerUps: new Map([["double_points", 999]]),
      }));
      const beforeMap = useZombieStore.getState().player.activePowerUps;
      // This fn mutates the map it receives — should not leak to beforeMap
      useZombieStore.getState().setPlayer(p => {
        p.activePowerUps.set("juggernog", 12345);
        return p;
      });
      expect(beforeMap.has("juggernog")).toBe(false);
      expect(useZombieStore.getState().player.activePowerUps.has("juggernog")).toBe(true);
    });

    it("weaponTiers object is also cloned", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, weaponTiers: { ak47: 1 } }));
      const before = { ...useZombieStore.getState().player.weaponTiers };
      useZombieStore.getState().setPlayer(p => {
        p.weaponTiers["m4a1"] = 2;
        return p;
      });
      expect(before).not.toHaveProperty("m4a1");
    });
  });

  describe("upgradeWeaponTier cost validation", () => {
    it("rejects NaN cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().upgradeWeaponTier("ak47", NaN)).toBe(false);
      expect(useZombieStore.getState().player.weaponTiers["ak47"]).toBeUndefined();
    });

    it("rejects negative cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().upgradeWeaponTier("ak47", -100)).toBe(false);
    });

    it("rejects Infinity cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().upgradeWeaponTier("ak47", Infinity)).toBe(false);
    });
  });

  describe("addPerk cost validation", () => {
    it("rejects NaN cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().addPerk("juggernog", NaN)).toBe(false);
    });

    it("rejects negative cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().addPerk("juggernog", -100)).toBe(false);
    });
  });
});
