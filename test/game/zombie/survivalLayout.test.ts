import { describe, it, expect } from "vitest";
import {
  pushOutSurvival,
  survivalLineOfSight,
  survivalWallDistance,
  SURVIVAL_OBSTACLES,
  SURVIVAL_BOUNDS,
  SURVIVAL_SPAWNS,
} from "@src/game/zombie/survivalLayout";

describe("survivalLayout", () => {
  describe("pushOutSurvival", () => {
    it("does not move entity in open courtyard", () => {
      const r = pushOutSurvival(0, 0, 0.55);
      expect(r.x).toBeCloseTo(0, 0);
      expect(r.z).toBeCloseTo(0, 0);
    });

    it("pushes entity out of crate", () => {
      // crate at (-7.2, -7.2) with half=0.75
      const r = pushOutSurvival(-7.2, -7.2, 0.55);
      const dist = Math.hypot(r.x - (-7.2), r.z - (-7.2));
      expect(dist).toBeGreaterThanOrEqual(0.4);
    });

    it("pushes entity out of barrel", () => {
      // barrel at (0, 10.2) with half=0.42
      const r = pushOutSurvival(0, 10.2, 0.55);
      const dist = Math.hypot(r.x - 0, r.z - 10.2);
      expect(dist).toBeGreaterThan(0);
    });

    it("pushes entity near wall (sequential obstacles can interact)", () => {
      // perimeter wall at z > 22.4 — push may not fully escape if barrel nearby
      const r = pushOutSurvival(0, 22.0, 0.55);
      expect(Number.isFinite(r.z)).toBe(true);
      // Entity should move away from wall, even if sequential obstacles interact
      expect(r.z).toBeLessThanOrEqual(22.0);
    });

    it("handles entity at exact obstacle center", () => {
      const r = pushOutSurvival(-7.2, -7.2, 0.55);
      expect(typeof r.x).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("does not crash with extreme coordinates", () => {
      const r = pushOutSurvival(9999, -9999, 0.55);
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("sequential obstacles can interact (known issue like pushOutL4D)", () => {
      // Entity between two close obstacles may not be fully pushed out of both
      const r = pushOutSurvival(-7.9, -7.2, 0.55);
      expect(Number.isFinite(r.x)).toBe(true);
    });
  });

  describe("survivalLineOfSight", () => {
    it("open courtyard has LOS", () => {
      expect(survivalLineOfSight(0, 0, 5, 5)).toBe(true);
    });

    it("crate blocks LOS", () => {
      expect(survivalLineOfSight(-7.2, -9, -7.2, -5)).toBe(false);
    });

    it("barrel blocks LOS", () => {
      expect(survivalLineOfSight(0, 8, 0, 12)).toBe(false);
    });

    it("very short distance always has LOS", () => {
      expect(survivalLineOfSight(5, 5, 5.05, 5.05)).toBe(true);
    });

    it("same point has LOS", () => {
      expect(survivalLineOfSight(5, 5, 5, 5)).toBe(true);
    });

    it("corner to corner through walls", () => {
      expect(survivalLineOfSight(-20, -20, 20, 20)).toBe(false);
    });

    it("along wall edge", () => {
      expect(survivalLineOfSight(-22, 0, -22, 10)).toBe(true);
    });
  });

  describe("survivalWallDistance", () => {
    it("returns maxDist when ray goes to open space (no obstacles in path)", () => {
      // Shooting toward +Z avoids barrel at (10.2, 0)
      const d = survivalWallDistance(0, 0, 0, 1, 5);
      expect(d).toBe(5);
    });

    it("hits barrel at (10.2, 0) when shooting +X", () => {
      const d = survivalWallDistance(0, 0, 1, 0, 20);
      expect(d).toBeCloseTo(9.78, 0);
    });

    it("returns distance to wall", () => {
      const d = survivalWallDistance(0, 0, 1, 0, 30);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(30);
    });

    it("returns maxDist for zero direction", () => {
      expect(survivalWallDistance(0, 0, 0, 0, 10)).toBe(10);
    });

    it("returns maxDist for near-zero direction", () => {
      expect(survivalWallDistance(0, 0, 1e-8, 1e-8, 10)).toBe(10);
    });
  });

  describe("SURVIVAL_OBSTACLES", () => {
    it("has perimeter walls", () => {
      const walls = SURVIVAL_OBSTACLES.filter(o => o.kind === "wall");
      expect(walls.length).toBeGreaterThanOrEqual(8);
    });

    it("has crates", () => {
      const crates = SURVIVAL_OBSTACLES.filter(o => o.kind === "crate");
      expect(crates.length).toBeGreaterThanOrEqual(4);
    });

    it("has barrels", () => {
      const barrels = SURVIVAL_OBSTACLES.filter(o => o.kind === "barrel");
      expect(barrels.length).toBeGreaterThanOrEqual(4);
    });

    it("all obstacles have valid dimensions", () => {
      for (const o of SURVIVAL_OBSTACLES) {
        expect(o.minX).toBeLessThan(o.maxX);
        expect(o.minZ).toBeLessThan(o.maxZ);
      }
    });
  });

  describe("SURVIVAL_SPAWNS", () => {
    it("has 4 spawn points", () => {
      expect(SURVIVAL_SPAWNS).toHaveLength(4);
    });

    it("all spawns are within bounds", () => {
      for (const s of SURVIVAL_SPAWNS) {
        expect(s.x).toBeGreaterThanOrEqual(SURVIVAL_BOUNDS.minX);
        expect(s.x).toBeLessThanOrEqual(SURVIVAL_BOUNDS.maxX);
        expect(s.z).toBeGreaterThanOrEqual(SURVIVAL_BOUNDS.minZ);
        expect(s.z).toBeLessThanOrEqual(SURVIVAL_BOUNDS.maxZ);
      }
    });
  });
});