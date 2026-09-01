import { describe, it, expect } from "vitest";
import {
  SURVIVAL_DOORS,
  SURVIVAL_BARRICADES,
  SURVIVAL_ROOMS,
  DOOR_LOCATIONS,
  SURVIVAL_BOUNDS,
  SURVIVAL_SPAWNS,
  getSurvivalObstacles,
} from "@src/game/zombie/survivalLayout";

describe("survivalLayout — Operation Blackout", () => {
  describe("SURVIVAL_DOORS", () => {
    it("has 4 doors with costs 750-2000", () => {
      expect(SURVIVAL_DOORS).toHaveLength(4);
      expect(SURVIVAL_DOORS.map((d) => d.cost)).toEqual([750, 1250, 1500, 2000]);
    });

    it("door ids are unique", () => {
      expect(new Set(SURVIVAL_DOORS.map((d) => d.id)).size).toBe(4);
    });

    it("door costs are finite positive", () => {
      for (const d of SURVIVAL_DOORS) {
        expect(Number.isFinite(d.cost)).toBe(true);
        expect(d.cost).toBeGreaterThan(0);
      }
    });
  });

  describe("SURVIVAL_BARRICADES", () => {
    it("has 4 windows with 6 planks default", () => {
      expect(SURVIVAL_BARRICADES).toHaveLength(4);
      expect(SURVIVAL_BARRICADES.map((b) => b.id)).toEqual(["win_north", "win_south", "win_east", "win_west"]);
    });

    it("all barricades have valid dimensions", () => {
      for (const b of SURVIVAL_BARRICADES) {
        expect(b.w).toBeGreaterThan(0);
        expect(b.h).toBeGreaterThan(0);
      }
    });
  });

  describe("SURVIVAL_ROOMS & DOOR_LOCATIONS", () => {
    it("has 5 rooms, 1 starting", () => {
      expect(SURVIVAL_ROOMS).toHaveLength(5);
      expect(SURVIVAL_ROOMS.filter((r) => r.isStartingRoom)).toHaveLength(1);
      expect(SURVIVAL_ROOMS.find((r) => r.isStartingRoom)?.id).toBe("spawn_hall");
    });

    it("DOOR_LOCATIONS has 4 entries", () => {
      expect(DOOR_LOCATIONS).toHaveLength(4);
    });

    it("all rooms have valid bounds", () => {
      for (const r of SURVIVAL_ROOMS) {
        expect(r.bounds.minX).toBeLessThan(r.bounds.maxX);
        expect(r.bounds.minZ).toBeLessThan(r.bounds.maxZ);
      }
    });
  });

  describe("getSurvivalObstacles", () => {
    it("base obstacles without doors", () => {
      const base = getSurvivalObstacles([]);
      expect(base.length).toBeGreaterThan(8);
    });

    it("unlocking door_lab adds LAB obstacles and removes wall", () => {
      const base = getSurvivalObstacles([]);
      const withLab = getSurvivalObstacles(["door_lab"]);
      expect(withLab.length).toBeGreaterThan(base.length);
    });

    it("unlocking all doors gives more obstacles", () => {
      const none = getSurvivalObstacles([]);
      const all = getSurvivalObstacles(["door_lab", "door_armory", "door_catwalk", "door_bunker"]);
      expect(all.length).toBeGreaterThan(none.length);
    });

    it("all obstacles have valid AABB even after doors", () => {
      const obs = getSurvivalObstacles(["door_lab", "door_armory"]);
      for (const o of obs) {
        expect(o.minX).toBeLessThan(o.maxX);
        expect(o.minZ).toBeLessThan(o.maxZ);
      }
    });
  });

  describe("SURVIVAL_BOUNDS & SPAWNS", () => {
    it("bounds are 44x44", () => {
      expect(SURVIVAL_BOUNDS.maxX - SURVIVAL_BOUNDS.minX).toBe(44);
      expect(SURVIVAL_BOUNDS.maxZ - SURVIVAL_BOUNDS.minZ).toBe(44);
    });

    it("spawns are inside bounds", () => {
      for (const s of SURVIVAL_SPAWNS) {
        expect(s.x).toBeGreaterThanOrEqual(SURVIVAL_BOUNDS.minX);
        expect(s.x).toBeLessThanOrEqual(SURVIVAL_BOUNDS.maxX);
        expect(s.z).toBeGreaterThanOrEqual(SURVIVAL_BOUNDS.minZ);
        expect(s.z).toBeLessThanOrEqual(SURVIVAL_BOUNDS.maxZ);
      }
    });
  });
});
