import { describe, it, expect } from "vitest";
import {
  generate5v5Map,
  randomizeSeed,
  getMapSeed,
  setMapSeed,
  PROC_BOUNDS,
} from "../../shared/proceduralMaps";

describe("proceduralMaps", () => {
  describe("generate5v5Map", () => {
    it("returns deterministic result for same seed", () => {
      const m1 = generate5v5Map(42);
      const m2 = generate5v5Map(42);
      expect(m1.obstacles.length).toBe(m2.obstacles.length);
      expect(m1.spawns.T.x).toBe(m2.spawns.T.x);
      expect(m1.bombSites.A.x).toBe(m2.bombSites.A.x);
    });

    it("returns different results for different seeds", () => {
      const m1 = generate5v5Map(1);
      const m2 = generate5v5Map(2);
      expect(m1.obstacles.length).not.toBe(m2.obstacles.length);
    });

    it("has perimeter walls", () => {
      const m = generate5v5Map(42);
      const wallIds = m.obstacles.map((o) => o.id);
      expect(wallIds).toContain("wall_north");
      expect(wallIds).toContain("wall_south");
      expect(wallIds).toContain("wall_west");
      expect(wallIds).toContain("wall_east");
    });

    it("has spawn points", () => {
      const m = generate5v5Map(42);
      expect(m.spawns.T.x).toBeLessThan(0);
      expect(m.spawns.CT.x).toBeGreaterThan(0);
    });

    it("has bomb sites", () => {
      const m = generate5v5Map(42);
      expect(m.bombSites.A.radius).toBe(6);
      expect(m.bombSites.B.radius).toBe(6);
    });

    it("has callouts", () => {
      const m = generate5v5Map(42);
      expect(m.callouts.length).toBeGreaterThan(0);
    });

    it("hard difficulty adds more obstacles", () => {
      const easy = generate5v5Map(42, "easy");
      const hard = generate5v5Map(42, "hard");
      expect(hard.obstacles.length).toBeGreaterThanOrEqual(easy.obstacles.length);
    });
  });

  describe("seed management", () => {
    it("setMapSeed/getMapSeed round-trips", () => {
      setMapSeed(12345);
      expect(getMapSeed()).toBe(12345);
    });

    it("randomizeSeed returns new seed", () => {
      const before = getMapSeed();
      const after = randomizeSeed();
      expect(after).not.toBe(before);
    });
  });

  it("PROC_BOUNDS is valid", () => {
    expect(PROC_BOUNDS.minX).toBeLessThan(PROC_BOUNDS.maxX);
    expect(PROC_BOUNDS.minZ).toBeLessThan(PROC_BOUNDS.maxZ);
  });
});
