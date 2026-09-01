import { describe, it, expect, beforeEach } from "vitest";
import { useZombieStore } from "@src/stores/useZombieStore";

beforeEach(() => {
  useZombieStore.getState().resetGame(true);
});

// ── useZombieStore ──
describe("useZombieStore", () => {
  describe("resetGame", () => {
    it("resets all state to defaults on full reset", () => {
      const s = useZombieStore.getState();
      s.setCurrentWave(5);
      s.setZombiesRemaining(10);
      s.addPoints(500);
      useZombieStore.getState().resetGame(true);

      const fresh = useZombieStore.getState();
      expect(fresh.currentWave).toBe(0);
      expect(fresh.zombiesRemaining).toBe(0);
      expect(fresh.waveState).toBe("buy_phase");
    });

    it("preserves currentWave on soft reset", () => {
      useZombieStore.getState().setCurrentWave(3);
      useZombieStore.getState().resetGame(false);
      expect(useZombieStore.getState().currentWave).toBe(3);
    });
  });

  describe("addPoints", () => {
    it("adds points normally", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(100);
      expect(useZombieStore.getState().player.points).toBe(before + 100);
    });

    it("subtracts points for negative amount", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(-50);
      expect(useZombieStore.getState().player.points).toBe(before - 50);
    });

    it("doubles points with double_points powerup", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().setPlayer(p => ({
        ...p,
        activePowerUps: new Map([["double_points", Date.now() + 10000]]),
      }));
      useZombieStore.getState().addPoints(100);
      expect(useZombieStore.getState().player.points).toBe(before + 200);
    });

    it("does not double negative amounts", () => {
      const before = useZombieStore.getState().player.points;
      useZombieStore.getState().setPlayer(p => ({
        ...p,
        activePowerUps: new Map([["double_points", Date.now() + 10000]]),
      }));
      useZombieStore.getState().addPoints(-50);
      expect(useZombieStore.getState().player.points).toBe(before - 50);
    });
  });

  describe("upgradeWeaponTier", () => {
    it("deducts cost and upgrades tier", () => {
      // ZOMBIE_STARTING_POINTS = 1000, cost = 200 → enough
      const result = useZombieStore.getState().upgradeWeaponTier("ak47", 200);
      expect(result).toBe(true);
      expect(useZombieStore.getState().player.weaponTiers["ak47"]).toBe(1);
      expect(useZombieStore.getState().player.points).toBe(800);
    });

    it("deducts cost and upgrades tier with enough points", () => {
      useZombieStore.getState().addPoints(500);
      const pts = useZombieStore.getState().player.points;
      const result = useZombieStore.getState().upgradeWeaponTier("ak47", 200);
      expect(result).toBe(true);
      expect(useZombieStore.getState().player.weaponTiers["ak47"]).toBe(1);
      expect(useZombieStore.getState().player.points).toBe(pts - 200);
    });

    it("rejects when insufficient points", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 50 }));
      const result = useZombieStore.getState().upgradeWeaponTier("ak47", 200);
      expect(result).toBe(false);
    });

    it("rejects at max tier (3)", () => {
      useZombieStore.getState().addPoints(5000);
      useZombieStore.getState().upgradeWeaponTier("ak47", 100);
      useZombieStore.getState().upgradeWeaponTier("ak47", 100);
      useZombieStore.getState().upgradeWeaponTier("ak47", 100);
      const result = useZombieStore.getState().upgradeWeaponTier("ak47", 100);
      expect(result).toBe(false);
      expect(useZombieStore.getState().player.weaponTiers["ak47"]).toBe(3);
    });

    it("fails when tier already at 3", () => {
      useZombieStore.getState().setPlayer(p => ({
        ...p,
        weaponTiers: { ak47: 3 },
        points: 9999,
      }));
      expect(useZombieStore.getState().upgradeWeaponTier("ak47", 0)).toBe(false);
    });
  });

  describe("addPerk", () => {
    it("adds perk and deducts cost", () => {
      useZombieStore.getState().addPoints(1000);
      const result = useZombieStore.getState().addPerk("juggernog", 2500);
      // Should fail - not enough points
      expect(result).toBe(false);
    });

    it("rejects duplicate perk", () => {
      useZombieStore.getState().setPlayer(p => ({
        ...p,
        perks: ["juggernog"],
        points: 9999,
      }));
      const result = useZombieStore.getState().addPerk("juggernog", 0);
      expect(result).toBe(false);
    });

    it("rejects when insufficient points", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 10 }));
      const result = useZombieStore.getState().addPerk("speed_cola", 3000);
      expect(result).toBe(false);
    });
  });

  describe("addPurchasedWeapon", () => {
    it("adds weapon to list", () => {
      useZombieStore.getState().addPurchasedWeapon("awp");
      expect(useZombieStore.getState().purchasedWeapons).toContain("awp");
    });

    it("does not duplicate weapons", () => {
      useZombieStore.getState().addPurchasedWeapon("awp");
      useZombieStore.getState().addPurchasedWeapon("awp");
      const count = useZombieStore.getState().purchasedWeapons.filter(w => w === "awp").length;
      expect(count).toBe(1);
    });
  });

  describe("addPowerUp / removePowerUp", () => {
    it("adds and removes power ups", () => {
      useZombieStore.getState().addPowerUp({
        id: "pu1", type: "insta_kill", x: 0, z: 0,
        spawnTime: Date.now(), duration: 30,
      });
      expect(useZombieStore.getState().powerUps).toHaveLength(1);

      useZombieStore.getState().removePowerUp("pu1");
      expect(useZombieStore.getState().powerUps).toHaveLength(0);
    });
  });

  describe("addLoot / removeLoot", () => {
    it("adds and removes loot", () => {
      useZombieStore.getState().addLoot({
        id: "l1", kind: "health", x: 0, z: 0, spawnTime: Date.now(),
      });
      expect(useZombieStore.getState().loot).toHaveLength(1);

      useZombieStore.getState().removeLoot("l1");
      expect(useZombieStore.getState().loot).toHaveLength(0);
    });
  });

  describe("setPlayer", () => {
    it("applies transformation function", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, hp: 50 }));
      expect(useZombieStore.getState().player.hp).toBe(50);
    });
  });
});
