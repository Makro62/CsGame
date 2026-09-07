import { describe, it, expect } from "vitest";
import {
  HEROES,
  HERO_IDS,
  getHero,
} from "../../../client/src/game/zombie/heroes";

describe("heroes", () => {
  describe("HEROES", () => {
    it("has nova7 and titan", () => {
      expect(HEROES).toHaveProperty("nova7");
      expect(HEROES).toHaveProperty("titan");
    });

    it("nova7 is assault class", () => {
      const h = HEROES.nova7;
      expect(h.heroClass).toBe("assault");
      expect(h.ability).toBe("berserk");
      expect(h.primaryWeapon).toBe("mp5");
      expect(h.secondaryWeapon).toBe("glock");
      expect(h.knifeWeapon).toBe("knife");
      expect(h.weaponType).toBe("rifle");
    });

    it("titan is heavy class", () => {
      const h = HEROES.titan;
      expect(h.heroClass).toBe("heavy");
      expect(h.ability).toBe("shield");
      expect(h.primaryWeapon).toBe("ak47");
      expect(h.secondaryWeapon).toBe("deagle");
    });

    it("nova7 has valid stats", () => {
      const s = HEROES.nova7.stats;
      expect(s.maxHp).toBe(100);
      expect(s.speed).toBeGreaterThan(0);
      expect(s.damage).toBeGreaterThan(0);
      expect(s.accuracy).toBeGreaterThan(0);
      expect(s.accuracy).toBeLessThanOrEqual(100);
    });

    it("titan has higher HP than nova7", () => {
      expect(HEROES.titan.stats.maxHp).toBeGreaterThan(HEROES.nova7.stats.maxHp);
    });

    it("titan has armor", () => {
      expect(HEROES.titan.stats.armor).toBeGreaterThan(0);
    });

    it("nova7 is faster than titan", () => {
      expect(HEROES.nova7.stats.speed).toBeGreaterThan(HEROES.titan.stats.speed);
    });

    it("every hero has valid colors", () => {
      for (const [id, hero] of Object.entries(HEROES)) {
        expect(hero.armorColor).toMatch(/^#[0-9a-f]{3,6}$/i);
        expect(hero.accentColor).toMatch(/^#[0-9a-f]{3,6}$/i);
        expect(hero.neonColor).toMatch(/^#[0-9a-f]{3,6}$/i);
      }
    });

    it("every hero has non-empty description", () => {
      for (const [id, hero] of Object.entries(HEROES)) {
        expect(hero.description.length).toBeGreaterThan(10);
      }
    });

    it("every hero has valid abilityCooldown", () => {
      for (const [id, hero] of Object.entries(HEROES)) {
        expect(hero.abilityCooldown).toBeGreaterThan(0);
        expect(hero.abilityCooldown).toBeLessThanOrEqual(60);
      }
    });
  });

  describe("HERO_IDS", () => {
    it("has both hero ids", () => {
      expect(HERO_IDS).toContain("nova7");
      expect(HERO_IDS).toContain("titan");
      expect(HERO_IDS).toHaveLength(2);
    });
  });

  describe("getHero", () => {
    it("returns nova7 for unknown id", () => {
      const h = getHero("nonexistent");
      expect(h.id).toBe("nova7");
    });

    it("returns nova7 for nova7", () => {
      const h = getHero("nova7");
      expect(h.id).toBe("nova7");
      expect(h.name).toBe("NOVA-7");
    });

    it("returns titan for titan", () => {
      const h = getHero("titan");
      expect(h.id).toBe("titan");
      expect(h.name).toBe("TITAN");
    });
  });
});
