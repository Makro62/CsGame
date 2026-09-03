import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProceduralMap,
  getProceduralMapData,
  clearProceduralMapRegistry,
} from "@src/game/map/ProceduralMapRegistry";
import type { MapObstacle, MapCallout } from "@cs-game/shared";

function makeTestMap(_id: string) {
  const obstacles: MapObstacle[] = [
    {
      id: "wall_1",
      shape: "box",
      material: "concrete",
      minX: -10, maxX: 10,
      minY: 0, maxY: 3,
      minZ: -10, maxZ: 10,
      cx: 0, cy: 1.5, cz: 0,
      sx: 20, sy: 3, sz: 20,
    },
    {
      id: "pillar_1",
      shape: "cylinder",
      material: "metal",
      minX: -5, maxX: 5,
      minY: 0, maxY: 4,
      minZ: -5, maxZ: 5,
      cx: 0, cy: 2, cz: 0,
      radius: 5,
      height: 4,
    },
  ];

  const callouts: MapCallout[] = [
    { id: "mid", label: "MID", x: 0, z: 0 },
    { id: "a_long", label: "A LONG", x: -15, z: -20 },
    { id: "b_long", label: "B LONG", x: 15, z: 20 },
  ];

  return {
    obstacles,
    callouts,
    bombSites: {
      A: { x: 18, z: -15, radius: 6 },
      B: { x: -18, z: 15, radius: 6 },
    },
    spawns: {
      T: { x: -33, z: 0 },
      CT: { x: 33, z: 0 },
    },
    bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 },
    seed: 12345,
  };
}

describe("ProceduralMapRegistry", () => {
  beforeEach(() => {
    clearProceduralMapRegistry();
  });

  describe("registerProceduralMap", () => {
    it("registers a map that can be retrieved", () => {
      const data = makeTestMap("test_map");
      registerProceduralMap("test_map", data);
      const result = getProceduralMapData("test_map");
      expect(result).toBeDefined();
      expect(result?.seed).toBe(12345);
    });

    it("overwrites existing registration with same id", () => {
      const data1 = makeTestMap("test_map");
      data1.seed = 111;
      registerProceduralMap("test_map", data1);

      const data2 = makeTestMap("test_map");
      data2.seed = 222;
      registerProceduralMap("test_map", data2);

      const result = getProceduralMapData("test_map");
      expect(result?.seed).toBe(222);
    });
  });

  describe("getProceduralMapData", () => {
    it("returns undefined for unknown map id", () => {
      expect(getProceduralMapData("nonexistent")).toBeUndefined();
    });

    it("returns full obstacle data", () => {
      const data = makeTestMap("obs_map");
      registerProceduralMap("obs_map", data);
      const result = getProceduralMapData("obs_map")!;
      expect(result.obstacles).toHaveLength(2);
      expect(result.obstacles[0].id).toBe("wall_1");
      expect(result.obstacles[0].material).toBe("concrete");
      expect(result.obstacles[1].shape).toBe("cylinder");
    });

    it("returns bomb sites", () => {
      const data = makeTestMap("bomb_map");
      registerProceduralMap("bomb_map", data);
      const result = getProceduralMapData("bomb_map")!;
      expect(result.bombSites.A.x).toBe(18);
      expect(result.bombSites.A.z).toBe(-15);
      expect(result.bombSites.A.radius).toBe(6);
      expect(result.bombSites.B.x).toBe(-18);
      expect(result.bombSites.B.z).toBe(15);
    });

    it("returns spawn points", () => {
      const data = makeTestMap("spawn_map");
      registerProceduralMap("spawn_map", data);
      const result = getProceduralMapData("spawn_map")!;
      expect(result.spawns.T.x).toBe(-33);
      expect(result.spawns.T.z).toBe(0);
      expect(result.spawns.CT.x).toBe(33);
      expect(result.spawns.CT.z).toBe(0);
    });

    it("returns callouts", () => {
      const data = makeTestMap("callout_map");
      registerProceduralMap("callout_map", data);
      const result = getProceduralMapData("callout_map")!;
      expect(result.callouts).toHaveLength(3);
      expect(result.callouts[0].label).toBe("MID");
      expect(result.callouts[1].label).toBe("A LONG");
    });

    it("returns bounds", () => {
      const data = makeTestMap("bounds_map");
      registerProceduralMap("bounds_map", data);
      const result = getProceduralMapData("bounds_map")!;
      expect(result.bounds.minX).toBe(-42);
      expect(result.bounds.maxX).toBe(42);
      expect(result.bounds.minZ).toBe(-52);
      expect(result.bounds.maxZ).toBe(52);
    });

    it("returns correct seed", () => {
      const data = makeTestMap("seed_map");
      data.seed = 99999;
      registerProceduralMap("seed_map", data);
      const result = getProceduralMapData("seed_map")!;
      expect(result.seed).toBe(99999);
    });
  });

  describe("clearProceduralMapRegistry", () => {
    it("removes all registered maps", () => {
      registerProceduralMap("map1", makeTestMap("map1"));
      registerProceduralMap("map2", makeTestMap("map2"));
      clearProceduralMapRegistry();
      expect(getProceduralMapData("map1")).toBeUndefined();
      expect(getProceduralMapData("map2")).toBeUndefined();
    });

    it("clearing empty registry does not throw", () => {
      expect(() => clearProceduralMapRegistry()).not.toThrow();
    });
  });

  describe("multiple maps coexist", () => {
    it("different map ids have independent data", () => {
      const dataA = makeTestMap("map_a");
      dataA.seed = 100;
      registerProceduralMap("map_a", dataA);

      const dataB = makeTestMap("map_b");
      dataB.seed = 200;
      registerProceduralMap("map_b", dataB);

      expect(getProceduralMapData("map_a")?.seed).toBe(100);
      expect(getProceduralMapData("map_b")?.seed).toBe(200);
    });

    it("clearing one map does not affect others", () => {
      registerProceduralMap("keep", makeTestMap("keep"));
      registerProceduralMap("remove", makeTestMap("remove"));
      clearProceduralMapRegistry();
      expect(getProceduralMapData("keep")).toBeUndefined();
      expect(getProceduralMapData("remove")).toBeUndefined();
    });
  });
});

describe("Procedural map data integrity", () => {
  beforeEach(() => {
    clearProceduralMapRegistry();
  });

  it("obstacle AABB is consistent with center + size", () => {
    const data = makeTestMap("aabb_test");
    registerProceduralMap("aabb_test", data);
    const obs = getProceduralMapData("aabb_test")!.obstacles[0];
    expect(obs.minX).toBe(obs.cx - obs.sx! / 2);
    expect(obs.maxX).toBe(obs.cx + obs.sx! / 2);
    expect(obs.minY).toBe(obs.cy - obs.sy! / 2);
    expect(obs.maxY).toBe(obs.cy + obs.sy! / 2);
    expect(obs.minZ).toBe(obs.cz - obs.sz! / 2);
    expect(obs.maxZ).toBe(obs.cz + obs.sz! / 2);
  });

  it("cylinder obstacle bounds are consistent with radius + height", () => {
    const data = makeTestMap("cyl_test");
    registerProceduralMap("cyl_test", data);
    const cyl = getProceduralMapData("cyl_test")!.obstacles[1];
    expect(cyl.minX).toBe(cyl.cx - cyl.radius!);
    expect(cyl.maxX).toBe(cyl.cx + cyl.radius!);
    expect(cyl.minZ).toBe(cyl.cz - cyl.radius!);
    expect(cyl.maxZ).toBe(cyl.cz + cyl.radius!);
    expect(cyl.minY).toBe(cyl.cy - cyl.height! / 2);
    expect(cyl.maxY).toBe(cyl.cy + cyl.height! / 2);
  });

  it("spawn points are inside map bounds", () => {
    const data = makeTestMap("spawn_bounds");
    registerProceduralMap("spawn_bounds", data);
    const result = getProceduralMapData("spawn_bounds")!;
    expect(result.spawns.T.x).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(result.spawns.T.x).toBeLessThanOrEqual(result.bounds.maxX);
    expect(result.spawns.CT.x).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(result.spawns.CT.x).toBeLessThanOrEqual(result.bounds.maxX);
  });

  it("bomb sites are inside map bounds", () => {
    const data = makeTestMap("site_bounds");
    registerProceduralMap("site_bounds", data);
    const result = getProceduralMapData("site_bounds")!;
    expect(result.bombSites.A.x).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(result.bombSites.A.x).toBeLessThanOrEqual(result.bounds.maxX);
    expect(result.bombSites.A.z).toBeGreaterThanOrEqual(result.bounds.minZ);
    expect(result.bombSites.A.z).toBeLessThanOrEqual(result.bounds.maxZ);
    expect(result.bombSites.B.x).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(result.bombSites.B.x).toBeLessThanOrEqual(result.bounds.maxX);
  });

  it("T and CT spawns are on opposite sides", () => {
    const data = makeTestMap("opposite_spawns");
    registerProceduralMap("opposite_spawns", data);
    const result = getProceduralMapData("opposite_spawns")!;
    const tSide = result.spawns.T.x < 0;
    const ctSide = result.spawns.CT.x > 0;
    expect(tSide).toBe(true);
    expect(ctSide).toBe(true);
  });
});
