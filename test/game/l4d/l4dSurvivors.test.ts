import { describe, it, expect } from "vitest";
import { L4D_SURVIVORS, L4D_SURVIVOR_IDS, getL4DSurvivor } from "@src/game/l4d/l4dSurvivors";

describe("l4dSurvivors", () => {
  describe("L4D_SURVIVORS data", () => {
    it("has all 4 survivors", () => {
      expect(Object.keys(L4D_SURVIVORS)).toHaveLength(4);
    });

    it("has coach", () => {
      const coach = L4D_SURVIVORS.coach;
      expect(coach.name).toBe("Coach");
      expect(coach.role).toBe("Tank");
      expect(coach.ability).toBe("rally");
      expect((coach as unknown as Record<string, unknown>).team).toBeUndefined(); // L4D survivors don't have team
    });

    it("has rochelle", () => {
      const rochelle = L4D_SURVIVORS.rochelle;
      expect(rochelle.name).toBe("Rochelle");
      expect(rochelle.role).toBe("Support");
      expect(rochelle.ability).toBe("heal_pulse");
    });

    it("has ellis", () => {
      const ellis = L4D_SURVIVORS.ellis;
      expect(ellis.name).toBe("Ellis");
      expect(ellis.role).toBe("Scout");
      expect(ellis.ability).toBe("sprint_burst");
    });

    it("has nick", () => {
      const nick = L4D_SURVIVORS.nick;
      expect(nick.name).toBe("Nick");
      expect(nick.role).toBe("Gambler");
      expect(nick.ability).toBe("lucky_shot");
    });

    it("all survivors have unique abilities", () => {
      const abilities = Object.values(L4D_SURVIVORS).map(s => s.ability);
      expect(new Set(abilities).size).toBe(4); // all different
    });

    it("all survivors have unique roles", () => {
      const roles = Object.values(L4D_SURVIVORS).map(s => s.role);
      expect(new Set(roles).size).toBe(4); // all different
    });

    it("all survivors have weapons", () => {
      for (const s of Object.values(L4D_SURVIVORS)) {
        expect(s.primaryWeapon).toBeTruthy();
        expect(s.secondaryWeapon).toBeTruthy();
        expect(s.knifeWeapon).toBe("knife");
      }
    });

    it("all survivors have colors", () => {
      for (const s of Object.values(L4D_SURVIVORS)) {
        expect(s.armorColor).toMatch(/^#/);
        expect(s.accentColor).toMatch(/^#/);
        expect(s.neonColor).toMatch(/^#/);
      }
    });

    it("all survivors have positive ability cooldowns", () => {
      for (const s of Object.values(L4D_SURVIVORS)) {
        expect(s.abilityCooldown).toBeGreaterThan(0);
      }
    });
  });

  describe("L4D_SURVIVOR_IDS", () => {
    it("contains all survivor ids", () => {
      expect(L4D_SURVIVOR_IDS).toEqual(["coach", "rochelle", "ellis", "nick"]);
    });
  });

  describe("getL4DSurvivor", () => {
    it("returns correct survivor by id", () => {
      expect(getL4DSurvivor("coach").name).toBe("Coach");
      expect(getL4DSurvivor("rochelle").name).toBe("Rochelle");
      expect(getL4DSurvivor("ellis").name).toBe("Ellis");
      expect(getL4DSurvivor("nick").name).toBe("Nick");
    });

    it("falls back to coach for unknown id", () => {
      expect(getL4DSurvivor("nonexistent").name).toBe("Coach");
    });

    it("falls back to coach for empty string", () => {
      expect(getL4DSurvivor("").name).toBe("Coach");
    });
  });
});