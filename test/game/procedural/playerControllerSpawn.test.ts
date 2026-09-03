import { describe, it, expect, beforeEach } from "vitest";
import {
  registerProceduralMap,
  getProceduralMapData,
  clearProceduralMapRegistry,
} from "@src/game/map/ProceduralMapRegistry";
import { SPAWN } from "@cs-game/shared";

function resolveSpawnPosition(mapId: string): [number, number, number] {
  const TOTAL_HEIGHT = 1.8;
  const proc = getProceduralMapData(mapId);
  if (proc) {
    const spawn = proc.spawns.T;
    return [spawn.x, TOTAL_HEIGHT / 2 + 0.01, spawn.z];
  }
  return [SPAWN.T.x, TOTAL_HEIGHT / 2 + 0.01, SPAWN.T.z];
}

describe("PlayerController spawn resolution", () => {
  beforeEach(() => { clearProceduralMapRegistry(); });

  it("returns procedural T spawn when registered", () => {
    registerProceduralMap("procedural_5v5", {
      obstacles: [], callouts: [],
      bombSites: { A: { x: 18, z: -15, radius: 6 }, B: { x: -18, z: 15, radius: 6 } },
      spawns: { T: { x: -33, z: 0 }, CT: { x: 33, z: 0 } },
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed: 42,
    });
    const spawn = resolveSpawnPosition("procedural_5v5");
    expect(spawn[0]).toBe(-33);
    expect(spawn[2]).toBe(0);
  });

  it("returns default T spawn for unknown map", () => {
    const spawn = resolveSpawnPosition("unknown_map");
    expect(spawn[0]).toBe(SPAWN.T.x);
    expect(spawn[2]).toBe(SPAWN.T.z);
  });

  it("spawn Y is above ground (positive)", () => {
    registerProceduralMap("procedural_5v5", {
      obstacles: [], callouts: [],
      bombSites: { A: { x: 18, z: -15, radius: 6 }, B: { x: -18, z: 15, radius: 6 } },
      spawns: { T: { x: -33, z: 0 }, CT: { x: 33, z: 0 } },
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed: 42,
    });
    expect(resolveSpawnPosition("procedural_5v5")[1]).toBeGreaterThan(0);
  });

  it("100 seeds all produce valid spawn Y", () => {
    for (let seed = 0; seed < 100; seed++) {
      registerProceduralMap("procedural_5v5", {
        obstacles: [], callouts: [],
        bombSites: { A: { x: 0, z: 0, radius: 6 }, B: { x: 5, z: 5, radius: 6 } },
        spawns: { T: { x: -30 - (seed % 10), z: 0 }, CT: { x: 30 + (seed % 10), z: 0 } },
        bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed,
      });
      expect(resolveSpawnPosition("procedural_5v5")[1]).toBeGreaterThan(0);
      clearProceduralMapRegistry();
    }
  });

  it("spawn position matches what mkPlayer would use", () => {
    registerProceduralMap("procedural_5v5", {
      obstacles: [], callouts: [],
      bombSites: { A: { x: 18, z: -15, radius: 6 }, B: { x: -18, z: 15, radius: 6 } },
      spawns: { T: { x: -33, z: 0 }, CT: { x: 33, z: 0 } },
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed: 42,
    });
    const procData = getProceduralMapData("procedural_5v5")!;
    const spawn = resolveSpawnPosition("procedural_5v5");
    expect(spawn[0]).toBe(procData.spawns.T.x);
    expect(spawn[2]).toBe(procData.spawns.T.z);
  });
});
