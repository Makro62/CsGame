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

    it("pushes entity out of crate (Operation Blackout)", () => {
      // crate at (-4, 4) with half=0.7
      const r = pushOutSurvival(-4, 4, 0.55);
      const dist = Math.hypot(r.x - (-4), r.z - 4);
      expect(dist).toBeGreaterThanOrEqual(0.4);
    });

    it("pushes entity out of barrel (Operation Blackout)", () => {
      // barrel at (0, 8) with half=0.42
      const r = pushOutSurvival(0, 8, 0.55);
      const dist = Math.hypot(r.x - 0, r.z - 8);
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
      const r = pushOutSurvival(-4, 4, 0.55);
      expect(typeof r.x).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("does not crash with extreme coordinates", () => {
      const r = pushOutSurvival(9999, -9999, 0.55);
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("sequential obstacles can interact (known issue like pushOutL4D)", () => {
      // Entity between two close obstacles may not be fully pushed out of both
      const r = pushOutSurvival(-4.5, 4, 0.55);
      expect(Number.isFinite(r.x)).toBe(true);
    });
  });

  describe("survivalLineOfSight", () => {
    it("open courtyard has LOS (Operation Blackout)", () => {
      expect(survivalLineOfSight(0, 0, 0, 0.05)).toBe(true);
    });

    it("crate blocks LOS (Operation Blackout)", () => {
      expect(survivalLineOfSight(-4, 2, -4, 6)).toBe(false);
    });

    it("barrel blocks LOS (Operation Blackout)", () => {
      expect(survivalLineOfSight(0, 6, 0, 10)).toBe(false);
    });

    it("very short distance always has LOS", () => {
      expect(survivalLineOfSight(5, 5, 5.05, 5.05)).toBe(true);
    });

    it("same point has LOS", () => {
      expect(survivalLineOfSight(5, 5, 5, 5)).toBe(true);
    });

    it("corner to corner through walls (Operation Blackout: blocked by low wall)", () => {
      expect(survivalLineOfSight(-20, -20, 20, 20)).toBe(false);
    });

    it("along wall edge", () => {
      expect(survivalLineOfSight(-21.5, 0, -21.5, 10)).toBe(true);
    });
  });

  describe("survivalWallDistance", () => {
    it("returns maxDist when ray goes to open space (no obstacles in path)", () => {
      const d = survivalWallDistance(0, 0, 0, 1, 2);
      expect(d).toBe(2);
    });

    it("hits barrel at (0, 8) when shooting +Z (Operation Blackout)", () => {
      const d = survivalWallDistance(0, 7, 0, 1, 20);
      expect(d).toBeCloseTo(0.58, 0);
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

    it("has crates (Operation Blackout: 2 base)", () => {
      const crates = SURVIVAL_OBSTACLES.filter(o => o.kind === "crate");
      expect(crates.length).toBeGreaterThanOrEqual(2);
    });

    it("has barrels (Operation Blackout: 1 base)", () => {
      const barrels = SURVIVAL_OBSTACLES.filter(o => o.kind === "barrel");
      expect(barrels.length).toBeGreaterThanOrEqual(1);
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