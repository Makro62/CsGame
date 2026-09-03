import { describe, it, expect } from "vitest";
import {
  generate5v5Map,
  getMapSeed,
  setMapSeed,
  randomizeSeed,
} from "@cs-game/shared/proceduralMaps";

describe("proceduralMaps", () => {
  describe("generate5v5Map", () => {
    it("returns a valid map with obstacles, spawns, bombSites", () => {
      const map = generate5v5Map(42);
      expect(map.obstacles.length).toBeGreaterThan(0);
      expect(map.spawns.T).toBeDefined();
      expect(map.spawns.CT).toBeDefined();
      expect(map.bombSites.A).toBeDefined();
      expect(map.bombSites.B).toBeDefined();
      expect(map.seed).toBe(42);
    });

    it("is deterministic: same seed → same map", () => {
      const map1 = generate5v5Map(100);
      const map2 = generate5v5Map(100);
      expect(map1.obstacles.length).toBe(map2.obstacles.length);
      expect(map1.spawns).toEqual(map2.spawns);
      expect(map1.bombSites).toEqual(map2.bombSites);
      expect(map1.callouts.length).toBe(map2.callouts.length);
    });

    it("different seeds produce different maps", () => {
      const map1 = generate5v5Map(1);
      const map2 = generate5v5Map(2);
      const sameObstacles = map1.obstacles.every((o, i) =>
        o.id === map2.obstacles[i]?.id && o.cx === map2.obstacles[i]?.cx,
      );
      expect(sameObstacles).toBe(false);
    });

    it("has perimeter walls", () => {
      const map = generate5v5Map(42);
      const wallIds = map.obstacles.filter((o) => o.id.startsWith("wall_")).map((o) => o.id);
      expect(wallIds).toContain("wall_north");
      expect(wallIds).toContain("wall_south");
      expect(wallIds).toContain("wall_west");
      expect(wallIds).toContain("wall_east");
    });

    it("has spawn area walls for both teams", () => {
      const map = generate5v5Map(42);
      expect(map.obstacles.some((o) => o.id.startsWith("t_spawn"))).toBe(true);
      expect(map.obstacles.some((o) => o.id.startsWith("ct_spawn"))).toBe(true);
    });

    it("T and CT spawns are on opposite sides", () => {
      const map = generate5v5Map(42);
      expect(map.spawns.T.x).toBeLessThan(0);
      expect(map.spawns.CT.x).toBeGreaterThan(0);
    });

    it("bomb sites have valid radii", () => {
      const map = generate5v5Map(42);
      expect(map.bombSites.A.radius).toBeGreaterThan(0);
      expect(map.bombSites.B.radius).toBeGreaterThan(0);
    });

    it("has callouts", () => {
      const map = generate5v5Map(42);
      expect(map.callouts.some((c) => c.label === "T SPAWN")).toBe(true);
      expect(map.callouts.some((c) => c.label === "CT SPAWN")).toBe(true);
    });

    it("obstacles have valid AABB", () => {
      const map = generate5v5Map(42);
      for (const obs of map.obstacles) {
        expect(obs.minX).toBeLessThanOrEqual(obs.maxX);
        expect(obs.minY).toBeLessThanOrEqual(obs.maxY);
        expect(obs.minZ).toBeLessThanOrEqual(obs.maxZ);
      }
    });

    it("hard difficulty adds more obstacles", () => {
      const easy = generate5v5Map(42, "easy");
      const hard = generate5v5Map(42, "hard");
      expect(hard.obstacles.length).toBeGreaterThanOrEqual(easy.obstacles.length);
    });
  });

  describe("seed management", () => {
    it("setMapSeed updates getMapSeed", () => {
      setMapSeed(12345);
      expect(getMapSeed()).toBe(12345);
    });

    it("randomizeSeed returns a number", () => {
      const seed = randomizeSeed();
      expect(typeof seed).toBe("number");
      expect(seed).toBeGreaterThanOrEqual(0);
    });
  });
});
