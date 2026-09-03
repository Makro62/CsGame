import { describe, it, expect, beforeEach } from "vitest";
import { generate5v5Map } from "@cs-game/shared/proceduralMaps";
import {
  registerProceduralMap,
  getProceduralMapData,
  clearProceduralMapRegistry,
} from "@src/game/map/ProceduralMapRegistry";

describe("generate5v5Map → ProceduralMapRegistry integration", () => {
  beforeEach(() => {
    clearProceduralMapRegistry();
  });

  it("registers map data compatible with registry interface", () => {
    const mapData = generate5v5Map(42);
    registerProceduralMap("procedural_5v5", {
      obstacles: mapData.obstacles,
      callouts: mapData.callouts.map((c) => ({ id: c.id, label: c.label, x: c.x, z: c.z })),
      bombSites: mapData.bombSites,
      spawns: mapData.spawns,
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 },
      seed: mapData.seed,
    });
    const retrieved = getProceduralMapData("procedural_5v5");
    expect(retrieved).toBeDefined();
    expect(retrieved!.seed).toBe(42);
    expect(retrieved!.obstacles.length).toBeGreaterThan(0);
  });

  it("100 seeds produce valid maps", () => {
    for (let seed = 0; seed < 100; seed++) {
      const mapData = generate5v5Map(seed);
      registerProceduralMap("procedural_5v5", {
        obstacles: mapData.obstacles,
        callouts: mapData.callouts.map((c) => ({ id: c.id, label: c.label, x: c.x, z: c.z })),
        bombSites: mapData.bombSites,
        spawns: mapData.spawns,
        bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 },
        seed: mapData.seed,
      });
      const result = getProceduralMapData("procedural_5v5")!;
      expect(result.obstacles.length).toBeGreaterThan(0);
      expect(result.bombSites.A.radius).toBeGreaterThan(0);
      expect(result.bombSites.B.radius).toBeGreaterThan(0);
      clearProceduralMapRegistry();
    }
  });
});

describe("5v5 map structural guarantees", () => {
  it("perimeter walls always exist for every seed", () => {
    for (const seed of [1, 42, 100, 999, 12345]) {
      const map = generate5v5Map(seed);
      const wallIds = map.obstacles.filter((o) => o.id.startsWith("wall_")).map((o) => o.id);
      expect(wallIds).toContain("wall_north");
      expect(wallIds).toContain("wall_south");
      expect(wallIds).toContain("wall_west");
      expect(wallIds).toContain("wall_east");
    }
  });

  it("spawn walls always exist for both teams", () => {
    for (const seed of [1, 50, 100, 500]) {
      const map = generate5v5Map(seed);
      expect(map.obstacles.some((o) => o.id === "t_spawn_wall_n")).toBe(true);
      expect(map.obstacles.some((o) => o.id === "t_spawn_wall_s")).toBe(true);
      expect(map.obstacles.some((o) => o.id === "ct_spawn_wall_n")).toBe(true);
      expect(map.obstacles.some((o) => o.id === "ct_spawn_wall_s")).toBe(true);
    }
  });

  it("mid cover always has at least 2 obstacles", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      const midCount = map.obstacles.filter((o) => o.id.startsWith("mid_cover_")).length;
      expect(midCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("A Long always has at least 2 cover obstacles", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      const aLongCount = map.obstacles.filter((o) => o.id.startsWith("a_long_")).length;
      expect(aLongCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("B Long always has at least 2 cover obstacles", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      const bLongCount = map.obstacles.filter((o) => o.id.startsWith("b_long_")).length;
      expect(bLongCount).toBeGreaterThanOrEqual(2);
    }
  });

  it("site A always has main structure + boxes", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      expect(map.obstacles.some((o) => o.id === "site_a_main")).toBe(true);
      expect(map.obstacles.filter((o) => o.id.startsWith("site_a_box_")).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("site B always has main structure + boxes", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      expect(map.obstacles.some((o) => o.id === "site_b_main")).toBe(true);
      expect(map.obstacles.filter((o) => o.id.startsWith("site_b_box_")).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("callouts always include T SPAWN, CT SPAWN, MID", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      const labels = map.callouts.map((c) => c.label);
      expect(labels).toContain("T SPAWN");
      expect(labels).toContain("CT SPAWN");
      expect(labels).toContain("MID");
    }
  });

  it("callouts always include SITE A and SITE B", () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generate5v5Map(seed);
      const labels = map.callouts.map((c) => c.label);
      expect(labels).toContain("SITE A");
      expect(labels).toContain("SITE B");
    }
  });

  it("obstacles never have zero-width X", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const obs of generate5v5Map(seed).obstacles) {
        expect(obs.maxX - obs.minX).toBeGreaterThan(0);
      }
    }
  });

  it("obstacles never have zero-height Y", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const obs of generate5v5Map(seed).obstacles) {
        expect(obs.maxY - obs.minY).toBeGreaterThan(0);
      }
    }
  });

  it("obstacles never have zero-depth Z", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const obs of generate5v5Map(seed).obstacles) {
        expect(obs.maxZ - obs.minZ).toBeGreaterThan(0);
      }
    }
  });
});
