import { describe, it, expect, beforeEach } from "vitest";
import { useHeroStore } from "@src/stores/useHeroStore";

beforeEach(() => {
  useHeroStore.getState().selectHero("nova7");
  useHeroStore.getState().resetAbility();
});

describe("useHeroStore", () => {
  describe("selectHero", () => {
    it("updates selected hero to titan", () => {
      useHeroStore.getState().selectHero("titan");
      const state = useHeroStore.getState();
      expect(state.selectedHeroId).toBe("titan");
      expect(state.hero.id).toBe("titan");
      expect(state.hero.name).toBe("TITAN");
    });

    it("resets ability cooldown on hero switch", () => {
      useHeroStore.getState().triggerAbility();
      expect(useHeroStore.getState().abilityReady).toBe(false);

      useHeroStore.getState().selectHero("titan");
      expect(useHeroStore.getState().abilityReady).toBe(true);
      expect(useHeroStore.getState().abilityCooldownRemaining).toBe(0);
    });

    it("falls back to nova7 for unknown id", () => {
      useHeroStore.getState().selectHero("nonexistent");
      const state = useHeroStore.getState();
      expect(state.selectedHeroId).toBe("nonexistent");
      expect(state.hero.id).toBe("nova7");
    });
  });

  describe("triggerAbility", () => {
    it("returns true and starts cooldown when ready", () => {
      const result = useHeroStore.getState().triggerAbility();
      expect(result).toBe(true);
      const state = useHeroStore.getState();
      expect(state.abilityReady).toBe(false);
      expect(state.abilityCooldownRemaining).toBeGreaterThan(0);
    });

    it("returns false when ability is on cooldown", () => {
      useHeroStore.getState().triggerAbility();
      const result = useHeroStore.getState().triggerAbility();
      expect(result).toBe(false);
    });

    it("sets correct cooldown for nova7", () => {
      useHeroStore.getState().selectHero("nova7");
      useHeroStore.getState().triggerAbility();
      expect(useHeroStore.getState().abilityCooldownRemaining).toBe(25);
    });

    it("sets correct cooldown for titan", () => {
      useHeroStore.getState().selectHero("titan");
      useHeroStore.getState().triggerAbility();
      expect(useHeroStore.getState().abilityCooldownRemaining).toBe(30);
    });
  });

  describe("tickCooldown", () => {
    it("decrements cooldown over time", () => {
      useHeroStore.getState().triggerAbility();
      useHeroStore.getState().tickCooldown(5);
      const state = useHeroStore.getState();
      expect(state.abilityCooldownRemaining).toBe(20); // 25 - 5
      expect(state.abilityReady).toBe(false);
    });

    it("sets ability ready when cooldown reaches zero", () => {
      useHeroStore.getState().triggerAbility();
      useHeroStore.getState().tickCooldown(25);
      const state = useHeroStore.getState();
      expect(state.abilityCooldownRemaining).toBe(0);
      expect(state.abilityReady).toBe(true);
    });

    it("does nothing when ability is already ready", () => {
      useHeroStore.getState().tickCooldown(10);
      expect(useHeroStore.getState().abilityReady).toBe(true);
      expect(useHeroStore.getState().abilityCooldownRemaining).toBe(0);
    });

    it("handles over-tick (cooldown goes below zero)", () => {
      useHeroStore.getState().triggerAbility();
      useHeroStore.getState().tickCooldown(100);
      const state = useHeroStore.getState();
      expect(state.abilityCooldownRemaining).toBe(0);
      expect(state.abilityReady).toBe(true);
    });
  });

  describe("resetAbility", () => {
    it("instantly resets cooldown to ready", () => {
      useHeroStore.getState().triggerAbility();
      expect(useHeroStore.getState().abilityReady).toBe(false);

      useHeroStore.getState().resetAbility();
      expect(useHeroStore.getState().abilityReady).toBe(true);
      expect(useHeroStore.getState().abilityCooldownRemaining).toBe(0);
    });
  });

  describe("hero stats", () => {
    it("nova7 has correct stats", () => {
      useHeroStore.getState().selectHero("nova7");
      const hero = useHeroStore.getState().hero;
      expect(hero.stats.maxHp).toBe(100);
      expect(hero.stats.armor).toBe(0);
      expect(hero.stats.speed).toBe(5.4);
      expect(hero.stats.damage).toBe(25);
      expect(hero.ability).toBe("berserk");
    });

    it("titan has correct stats", () => {
      useHeroStore.getState().selectHero("titan");
      const hero = useHeroStore.getState().hero;
      expect(hero.stats.maxHp).toBe(150);
      expect(hero.stats.armor).toBe(25);
      expect(hero.stats.speed).toBe(4.6);
      expect(hero.stats.damage).toBe(35);
      expect(hero.ability).toBe("shield");
    });
  });
});
