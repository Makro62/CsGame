import { describe, it, expect, beforeEach, vi } from "vitest";
import { localZombieEngine } from "../client/src/game/zombie/LocalZombieEngine";
import { useZombieStore } from "../client/src/stores/useZombieStore";
import { useWeaponStore } from "../client/src/stores/useWeaponStore";
import { useZombieNetworkStore } from "../client/src/stores/useZombieNetworkStore";
import { PAP_WEAPON_VARIANTS, ZOMBIE_TYPES, WEAPONS } from "@cs-game/shared";
import { ZombieController } from "../server/src/ai/ZombieController";

describe("Zombie Survival Mode Features & Expansions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useZombieStore.getState().resetMatch();
    useWeaponStore.getState().resetUpgrades();
    localZombieEngine.init("normal");
  });

  describe("Pack-a-Punch Elemental Effects", () => {
    it("defines valid elemental effects for all PaP weapon variants", () => {
      expect(PAP_WEAPON_VARIANTS.ak47.effect).toBe("fire_dot");
      expect(PAP_WEAPON_VARIANTS.m4a1.effect).toBe("explosive");
      expect(PAP_WEAPON_VARIANTS.awp.effect).toBe("chain_lightning");
      expect(PAP_WEAPON_VARIANTS.mp5.effect).toBe("poison_dot");
      expect(PAP_WEAPON_VARIANTS.deagle.effect).toBe("pierce");
      expect(PAP_WEAPON_VARIANTS.glock.effect).toBe("stun");
      expect(PAP_WEAPON_VARIANTS.arccaster.effect).toBe("chain_lightning");
    });

    it("applies Pack-a-Punch upgrade and boosts weapon stats", () => {
      useZombieStore.getState().setPoints(6000);
      useWeaponStore.getState().equipWeapon("ak47");
      localZombieEngine.handlePackAPunch();
      expect(useZombieStore.getState().points).toBe(1000); // 6000 - 5000
      expect(useWeaponStore.getState().hasPackAPunch).toBe(true);
    });
  });

  describe("Zombie AI Controller (Server)", () => {
    it("determines appropriate zombie types based on wave number", () => {
      const ctrl = new ZombieController();
      // Wave 1-2 only walker
      expect(ctrl.determineType(1)).toBe("walker");
      expect(ctrl.determineType(2)).toBe("walker");

      // Wave 10+ can roll all special types (walker, runner, exploder, tank, spitter)
      const types = new Set<string>();
      for (let i = 0; i < 100; i++) {
        types.add(ctrl.determineType(10));
      }
      expect(types.size).toBeGreaterThanOrEqual(3);
    });

    it("spawns exploder and handles priming / detonation", () => {
      const ctrl = new ZombieController();
      const exploder = ctrl.spawnSingle("exploder", 0, 0, 1);
      exploder.x = 0;
      exploder.z = 0;
      expect(exploder.type).toBe("exploder");
      expect(exploder.hp).toBe(ZOMBIE_TYPES.exploder.hp);

      const players = new Map([
        ["p1", { x: 2, y: 0, z: 2, hp: 100, isDead: false, isDowned: false }],
      ]);

      // Update AI within priming range (< 4m)
      const result1 = ctrl.update(0.1, players);
      expect(exploder.isAttacking).toBe(true); // Priming started

      // Fast forward past 1.5s priming timer
      const result2 = ctrl.update(1.6, players);
      expect(result2.explodingZombies.length).toBe(1);
      expect(result2.explodingZombies[0].zombieId).toBe(exploder.id);
    });

    it("handles spitter kiting and ranged attack AI", () => {
      const ctrl = new ZombieController();
      const spitter = ctrl.spawnSingle("spitter", 0, 0, 1);
      spitter.x = 0;
      spitter.z = 0;
      expect(spitter.type).toBe("spitter");

      // Player at 8m (within 5-11m attack range)
      const players = new Map([
        ["p1", { x: 0, y: 0, z: 8, hp: 100, isDead: false, isDowned: false }],
      ]);

      const result = ctrl.update(0.1, players);
      expect(result.spitterAttacks.length).toBe(1);
      expect(result.spitterAttacks[0].zombieId).toBe(spitter.id);
    });
  });

  describe("Wonder Weapon: Arc Caster", () => {
    it("has valid stats in WEAPONS config", () => {
      expect(WEAPONS.arccaster).toBeDefined();
      expect(WEAPONS.arccaster.dmg).toBe(40);
      expect(WEAPONS.arccaster.mag).toBe(12);
      expect(WEAPONS.arccaster.reserveAmmo).toBe(36);
    });

    it("can be obtained via Mystery Box spin", () => {
      useZombieStore.getState().setPoints(5000);
      useWeaponStore.getState().equipWeapon("deagle");
      
      // Simulate box spin
      const weapon = localZombieEngine.handleMysteryBox();
      expect(weapon).toBeDefined();
      expect(useZombieStore.getState().points).toBe(4050); // 5000 - 950
    });
  });
});
