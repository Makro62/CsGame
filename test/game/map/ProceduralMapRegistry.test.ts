import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerProceduralMap,
  getProceduralMapData,
  ensureProcedural5v5,
  clearProceduralMapRegistry,
  PROCEDURAL_5V5_ID,
} from "../../../client/src/game/map/ProceduralMapRegistry";

vi.mock("../../../client/src/game/map/ProceduralMapRegistry", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../../client/src/game/map/ProceduralMapRegistry")>();
  return mod;
});

describe("ProceduralMapRegistry", () => {
  beforeEach(() => {
    clearProceduralMapRegistry();
  });

  describe("registerProceduralMap / getProceduralMapData", () => {
    it("returns undefined for unregistered map", () => {
      expect(getProceduralMapData("nonexistent")).toBeUndefined();
    });

    it("stores and retrieves map data", () => {
      const data = {
        obstacles: [],
        callouts: [],
        bombSites: { A: { x: 10, z: 10, radius: 3 }, B: { x: -10, z: -10, radius: 3 } },
        spawns: { T: { x: 0, z: -20 }, CT: { x: 0, z: 20 } },
        bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
        seed: 12345,
      };
      registerProceduralMap("test_map", data);
      expect(getProceduralMapData("test_map")).toBe(data);
    });

    it("overwrites existing registration", () => {
      const data1 = { obstacles: [], callouts: [], bombSites: {} as any, spawns: {} as any, bounds: {} as any, seed: 1 };
      const data2 = { obstacles: [], callouts: [], bombSites: {} as any, spawns: {} as any, bounds: {} as any, seed: 2 };
      registerProceduralMap("test_map", data1);
      registerProceduralMap("test_map", data2);
      expect(getProceduralMapData("test_map")?.seed).toBe(2);
    });
  });

  describe("clearProceduralMapRegistry", () => {
    it("clears all registered maps", () => {
      const data = { obstacles: [], callouts: [], bombSites: {} as any, spawns: {} as any, bounds: {} as any, seed: 1 };
      registerProceduralMap("test_map", data);
      clearProceduralMapRegistry();
      expect(getProceduralMapData("test_map")).toBeUndefined();
    });
  });

  describe("ensureProcedural5v5", () => {
    it("returns a ProceduralMapData object", () => {
      const data = ensureProcedural5v5(42);
      expect(data).toBeDefined();
      expect(data.seed).toBeDefined();
      expect(data.obstacles).toBeDefined();
      expect(data.callouts).toBeDefined();
      expect(data.bombSites).toBeDefined();
      expect(data.spawns).toBeDefined();
      expect(data.bounds).toBeDefined();
    });

    it("returns same data on second call without seed", () => {
      const d1 = ensureProcedural5v5(99);
      const d2 = ensureProcedural5v5();
      expect(d1).toBe(d2);
    });

    it("generates new data with different seed", () => {
      const d1 = ensureProcedural5v5(1);
      clearProceduralMapRegistry();
      const d2 = ensureProcedural5v5(2);
      expect(d1.seed).not.toBe(d2.seed);
    });
  });

  describe("PROCEDURAL_5V5_ID", () => {
    it("is a non-empty string", () => {
      expect(PROCEDURAL_5V5_ID).toBeTruthy();
      expect(typeof PROCEDURAL_5V5_ID).toBe("string");
    });
  });
});
