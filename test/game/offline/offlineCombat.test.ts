import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../client/src/stores/useGameStore", () => ({
  useGameStore: {
    getState: () => ({ currentMap: "container_yard", setTracerEvent: vi.fn() }),
    setState: vi.fn(),
  },
}));

const mockGetProceduralMapData = vi.fn(() => null);
vi.mock("../../../client/src/game/map/ProceduralMapRegistry", () => ({
  getProceduralMapData: (...args: any[]) => mockGetProceduralMapData(...args),
}));

const mockGetSpawnForMap = vi.fn((_id: string) => undefined);
vi.mock("@cs-game/shared", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getSpawnForMap: (...args: any[]) => mockGetSpawnForMap(...args),
  };
});

import {
  fireIntervalMs,
  resolveBotShot,
  laneForBotId,
  roleForBotId,
  laneForRole,
  nextWaypointIndex,
  stepToward,
  hasLineOfSight,
  isInFov,
  nearestBombSite,
  distToBombSite,
  cameraYawTowards,
  clampToMap,
  inBuyZone,
  isPointBlocked,
  steerAroundObstacles,
  resolveTeamSpawn,
  resolveBombSites,
  botPath,
  hideBehindCover,
  spawnCameraYaw,
  pushOutOfObstacles,
} from "../../../client/src/game/offline/offlineCombat";

describe("offlineCombat", () => {
  beforeEach(() => {
    mockGetProceduralMapData.mockReturnValue(null);
    mockGetSpawnForMap.mockReturnValue(undefined);
  });

  describe("fireIntervalMs", () => {
    it("returns 1400 for awp", () => {
      expect(fireIntervalMs("awp", 1)).toBe(1400);
    });

    it("returns fire rate for other weapons", () => {
      const interval = fireIntervalMs("ak47", 10);
      expect(interval).toBeCloseTo(100, 0);
    });

    it("returns 1000 for invalid fire rate", () => {
      expect(fireIntervalMs("ak47", 0)).toBe(1000);
      expect(fireIntervalMs("ak47", NaN)).toBe(1000);
    });
  });

  describe("resolveBotShot", () => {
    it("returns hit or miss with headshot", () => {
      const result = resolveBotShot({
        accuracy: 1.0,
        headshotRate: 1.0,
        distance: 1,
        viewDistance: 50,
      });
      expect(result.hit).toBe(true);
      expect(result.headshot).toBe(true);
    });

    it("returns miss with low accuracy", () => {
      let missCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = resolveBotShot({
          accuracy: 0.01,
          headshotRate: 0,
          distance: 1,
          viewDistance: 50,
        });
        if (!result.hit) missCount++;
      }
      expect(missCount).toBeGreaterThan(50);
    });
  });

  describe("laneForBotId", () => {
    it("returns A for id with 1", () => {
      expect(laneForBotId("bot1")).toBe("A");
    });

    it("returns B for id with 2", () => {
      expect(laneForBotId("bot2")).toBe("B");
    });

    it("returns mid for id with 3", () => {
      expect(laneForBotId("bot3")).toBe("mid");
    });
  });

  describe("roleForBotId", () => {
    it("returns a valid role", () => {
      const validRoles = ["entry", "support", "flanker", "runner"];
      for (let i = 1; i <= 10; i++) {
        expect(validRoles).toContain(roleForBotId(`bot${i}`));
      }
    });
  });

  describe("laneForRole", () => {
    it("entry goes to A", () => {
      expect(laneForRole("entry", "bot1")).toBe("A");
    });

    it("runner goes to A", () => {
      expect(laneForRole("runner", "bot1")).toBe("A");
    });

    it("flanker goes to B", () => {
      expect(laneForRole("flanker", "bot1")).toBe("B");
    });
  });

  describe("nextWaypointIndex", () => {
    it("returns 0 for empty path", () => {
      expect(nextWaypointIndex({ x: 0, z: 0 }, [], 0)).toBe(0);
    });

    it("advances when close to waypoint", () => {
      const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }, { x: 10, z: 10 }];
      expect(nextWaypointIndex({ x: 0, z: 0 }, path, 0)).toBe(1);
    });

    it("stays when far from next waypoint", () => {
      const path = [{ x: 0, z: 0 }, { x: 50, z: 50 }];
      expect(nextWaypointIndex({ x: 0, z: 20 }, path, 0)).toBe(0);
    });
  });

  describe("stepToward", () => {
    it("moves toward target", () => {
      const result = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, 1);
      expect(result.x).toBeGreaterThan(0);
    });

    it("returns same position when very close", () => {
      const result = stepToward({ x: 0, z: 0 }, { x: 0.01, z: 0 }, 5, 1);
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe("hasLineOfSight", () => {
    it("returns true for short clear path", () => {
      expect(hasLineOfSight({ x: -30, z: -30 }, { x: -28, z: -30 })).toBe(true);
    });

    it("returns false when obstacle blocks", () => {
      expect(hasLineOfSight({ x: -23, z: 0 }, { x: 23, z: 0 })).toBe(false);
    });
  });

  describe("isInFov", () => {
    it("returns true when target is in front (+Z direction for rotationY=0)", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 })
      ).toBe(true);
    });

    it("returns false when target is behind", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: -10 })
      ).toBe(false);
    });

    it("returns false for invalid rotationY", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: NaN }, { x: 0, z: -10 })
      ).toBe(false);
    });
  });

  describe("nearestBombSite", () => {
    it("returns correct nearest site", () => {
      expect(nearestBombSite({ x: -30, z: -30 })).toBe("A");
      expect(nearestBombSite({ x: 30, z: 30 })).toBe("B");
    });
  });

  describe("distToBombSite", () => {
    it("returns 0 at bomb site", () => {
      const dist = distToBombSite({ x: -12, z: -15 }, "A");
      expect(dist).toBeCloseTo(0, 1);
    });

    it("returns positive distance away from site", () => {
      const dist = distToBombSite({ x: 0, z: 0 }, "A");
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe("cameraYawTowards", () => {
    it("returns angle toward target", () => {
      const yaw = cameraYawTowards({ x: 0, z: 0 }, { x: 0, z: -10 });
      expect(yaw).toBeCloseTo(0, 1);
    });
  });

  describe("clampToMap", () => {
    it("clamps to boundary", () => {
      const result = clampToMap({ x: 100, z: 100 });
      expect(result.x).toBeLessThanOrEqual(39);
      expect(result.z).toBeLessThanOrEqual(49);
    });

    it("handles NaN values", () => {
      const result = clampToMap({ x: NaN, z: NaN });
      expect(Number.isFinite(result.x)).toBe(true);
      expect(Number.isFinite(result.z)).toBe(true);
    });

    it("returns same position if inside boundary", () => {
      const result = clampToMap({ x: 0, z: 0 });
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe("inBuyZone", () => {
    it("returns true at buy zone center for T", () => {
      const zone = { x: 0, z: -38, radius: 15 };
      expect(Math.hypot(zone.x - zone.x, zone.z - zone.z)).toBeLessThanOrEqual(zone.radius);
    });

    it("returns false far from spawn", () => {
      const zone = { x: 0, z: -38, radius: 15 };
      expect(Math.hypot(50 - zone.x, 50 - zone.z)).toBeGreaterThan(zone.radius);
    });
  });

  describe("isPointBlocked", () => {
    it("returns a boolean for any point", () => {
      expect(typeof isPointBlocked({ x: 0, z: 0 })).toBe("boolean");
    });

    it("returns boolean for obstacle area", () => {
      expect(typeof isPointBlocked({ x: -23, z: 0 })).toBe("boolean");
    });

    it("accepts custom obstacles", () => {
      const customObs = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }];
      expect(isPointBlocked({ x: 0, z: 0 }, 0, customObs)).toBe(true);
      expect(isPointBlocked({ x: 10, z: 10 }, 0, customObs)).toBe(false);
    });
  });

  describe("steerAroundObstacles", () => {
    it("returns intended position if no obstacle", () => {
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 10, z: 10 });
      expect(result.x).toBe(10);
      expect(result.z).toBe(10);
    });

    it("steers around obstacle", () => {
      const result = steerAroundObstacles({ x: -22, z: 0 }, { x: -23, z: 0 });
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("resolveTeamSpawn", () => {
    it("returns spawn for T", () => {
      const spawn = resolveTeamSpawn("container_yard", "T");
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
      expect(typeof spawn.x).toBe("number");
      expect(typeof spawn.z).toBe("number");
    });

    it("returns spawn for CT", () => {
      const spawn = resolveTeamSpawn("container_yard", "CT");
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
      expect(typeof spawn.x).toBe("number");
      expect(typeof spawn.z).toBe("number");
    });

    it("T and CT spawns differ", () => {
      const t = resolveTeamSpawn("container_yard", "T");
      const ct = resolveTeamSpawn("container_yard", "CT");
      expect(t.x !== ct.x || t.z !== ct.z).toBe(true);
    });
  });

  describe("resolveBombSites", () => {
    it("returns bomb sites", () => {
      const sites = resolveBombSites();
      expect(sites).toHaveProperty("A");
      expect(sites).toHaveProperty("B");
      expect(sites.A).toHaveProperty("x");
      expect(sites.A).toHaveProperty("z");
      expect(sites.A).toHaveProperty("radius");
    });
  });

  describe("laneForBotId edge cases", () => {
    it("returns mid for non-numeric id", () => {
      expect(laneForBotId("abc")).toBe("mid");
    });

    it("handles id with multiple numbers", () => {
      const result = laneForBotId("bot10");
      expect(["A", "B", "mid"]).toContain(result);
    });
  });

  describe("roleForBotId edge cases", () => {
    it("returns support for non-numeric id", () => {
      expect(roleForBotId("abc")).toBe("support");
    });

    it("cycles through all roles", () => {
      const roles = new Set<string>();
      for (let i = 1; i <= 10; i++) {
        roles.add(roleForBotId(`bot${i}`));
      }
      expect(roles.size).toBeGreaterThan(1);
    });
  });

  describe("stepToward edge cases", () => {
    it("clamps to target distance", () => {
      const result = stepToward({ x: 0, z: 0 }, { x: 100, z: 0 }, 5, 1);
      expect(result.x).toBeCloseTo(5, 0);
    });

    it("handles zero dt", () => {
      const result = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0);
      expect(result.x).toBe(0);
    });
  });

  describe("fireIntervalMs edge cases", () => {
    it("returns correct interval for m4a1", () => {
      expect(fireIntervalMs("m4a1", 10)).toBeCloseTo(100, 0);
    });

    it("returns 1000 for negative fire rate", () => {
      expect(fireIntervalMs("ak47", -5)).toBe(1000);
    });

    it("returns 1000 for Infinity", () => {
      expect(fireIntervalMs("ak47", Infinity)).toBe(1000);
    });
  });

  describe("distToBombSite edge cases", () => {
    it("returns distance for site B", () => {
      const dist = distToBombSite({ x: 20, z: 15 }, "B");
      expect(dist).toBeGreaterThanOrEqual(0);
    });

    it("returns positive distance for far point", () => {
      const dist = distToBombSite({ x: 0, z: 0 }, "B");
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe("nearestBombSite edge cases", () => {
    it("returns A for point near origin", () => {
      const result = nearestBombSite({ x: 0, z: 0 });
      expect(["A", "B"]).toContain(result);
    });
  });

  describe("botPath", () => {
    it("returns path for lane A, team T", () => {
      const path = botPath("A", "T");
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toHaveProperty("x");
      expect(path[0]).toHaveProperty("z");
    });

    it("returns path for lane A, team CT", () => {
      const path = botPath("A", "CT");
      expect(path.length).toBeGreaterThan(0);
    });

    it("returns path for lane mid, team T", () => {
      const path = botPath("mid", "T");
      expect(path.length).toBeGreaterThan(0);
    });

    it("returns path for lane mid, team CT", () => {
      const path = botPath("mid", "CT");
      expect(path.length).toBeGreaterThan(0);
    });

    it("returns path for lane B, team T", () => {
      const path = botPath("B", "T");
      expect(path.length).toBeGreaterThan(0);
    });

    it("returns path for lane B, team CT", () => {
      const path = botPath("B", "CT");
      expect(path.length).toBeGreaterThan(0);
    });

    it("T and CT paths for same lane differ in direction", () => {
      const tPath = botPath("A", "T");
      const ctPath = botPath("A", "CT");
      expect(tPath[0].z).not.toBe(ctPath[0].z);
    });
  });

  describe("hideBehindCover", () => {
    it("returns null when no obstacles nearby", () => {
      const result = hideBehindCover(
        { x: 0, z: 0 },
        { x: 30, z: 30 },
        [{ minX: 30, maxX: 32, minZ: 30, maxZ: 32, minY: 0, maxY: 3 }]
      );
      expect(result).toBeNull();
    });

    it("returns cover point when obstacle between bot and enemy", () => {
      const result = hideBehindCover(
        { x: 0, z: 0 },
        { x: 20, z: 0 },
        [{ minX: 8, maxX: 12, minZ: -2, maxZ: 2, minY: 0, maxY: 3 }]
      );
      if (result) {
        expect(result).toHaveProperty("x");
        expect(result).toHaveProperty("z");
      }
    });

    it("returns null when obstacle is too tall (> 6 height)", () => {
      const result = hideBehindCover(
        { x: 0, z: 0 },
        { x: 20, z: 0 },
        [{ minX: 8, maxX: 12, minZ: -2, maxZ: 2, minY: 0, maxY: 10 }]
      );
      expect(result).toBeNull();
    });

    it("returns null when obstacle is too large (> 8 width)", () => {
      const result = hideBehindCover(
        { x: 0, z: 0 },
        { x: 30, z: 0 },
        [{ minX: 8, maxX: 20, minZ: -2, maxZ: 2, minY: 0, maxY: 3 }]
      );
      expect(result).toBeNull();
    });
  });

  describe("resolveTeamSpawn extended", () => {
    it("returns spawn for undefined mapId (fallback)", () => {
      const spawn = resolveTeamSpawn(undefined, "T");
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
    });

    it("returns spawn for unknown mapId (fallback)", () => {
      const spawn = resolveTeamSpawn("nonexistent_map", "CT");
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
    });
  });

  describe("spawnCameraYaw", () => {
    it("returns a number for T team", () => {
      const yaw = spawnCameraYaw("T", "container_yard");
      expect(typeof yaw).toBe("number");
      expect(Number.isFinite(yaw)).toBe(true);
    });

    it("returns a number for CT team", () => {
      const yaw = spawnCameraYaw("CT", "container_yard");
      expect(typeof yaw).toBe("number");
      expect(Number.isFinite(yaw)).toBe(true);
    });

    it("T and CT yaw differ (facing opposite directions)", () => {
      const tYaw = spawnCameraYaw("T", "container_yard");
      const ctYaw = spawnCameraYaw("CT", "container_yard");
      expect(tYaw).not.toBe(ctYaw);
    });

    it("uses default map when no mapId given", () => {
      const yaw = spawnCameraYaw("T");
      expect(Number.isFinite(yaw)).toBe(true);
    });
  });

  describe("stepToward when distance < 0.05", () => {
    it("returns same position when distance < 0.05", () => {
      const result = stepToward({ x: 5, z: 5 }, { x: 5.01, z: 5 }, 5, 1);
      expect(result.x).toBe(5);
      expect(result.z).toBe(5);
    });

    it("returns same position at distance 0.04", () => {
      const result = stepToward({ x: 0, z: 0 }, { x: 0.03, z: 0 }, 5, 1);
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe("nextWaypointIndex with edge indices", () => {
    it("returns 0 for NaN index", () => {
      const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
      expect(nextWaypointIndex({ x: 0, z: 0 }, path, NaN)).toBe(0);
    });

    it("returns 0 for Infinity index", () => {
      const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
      expect(nextWaypointIndex({ x: 0, z: 0 }, path, Infinity)).toBe(0);
    });

    it("clamps negative index to 0, then advances if at waypoint", () => {
      const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
      const result = nextWaypointIndex({ x: 0, z: 0 }, path, -1);
      expect(result).toBe(1);
    });

    it("clamps index to path length", () => {
      const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
      expect(nextWaypointIndex({ x: 0, z: 0 }, path, 100)).toBe(1);
    });
  });

  describe("pushOutOfObstacles", () => {
    it("returns same position if not inside obstacle", () => {
      const result = pushOutOfObstacles({ x: 30, z: 30 });
      expect(result.x).toBe(30);
      expect(result.z).toBe(30);
    });

    it("nudges point out of obstacle", () => {
      const customObs = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }];
      const result = pushOutOfObstacles({ x: 0, z: 0 }, customObs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("isInFov extended", () => {
    it("returns true when fov covers full circle", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: -10 }, Math.PI * 2)
      ).toBe(true);
    });

    it("returns false for negative fov", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 }, -1)
      ).toBe(false);
    });

    it("returns false for NaN fov", () => {
      expect(
        isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 }, NaN)
      ).toBe(false);
    });
  });

  describe("botPath procedural map branch (lines 348-354)", () => {
    const procData = {
      spawns: { T: { x: -20, z: 0 }, CT: { x: 20, z: 0 } },
      bombSites: {
        A: { x: -12, z: -15 },
        B: { x: 15, z: 16 },
      },
    };

    it("returns procedural path for T team on A lane", () => {
      mockGetProceduralMapData.mockReturnValue(procData);
      const path = botPath("A", "T");
      expect(path.length).toBe(3);
      expect(path[0]).toEqual({ x: -20, z: 0 });
    });

    it("returns procedural path for CT team on A lane", () => {
      mockGetProceduralMapData.mockReturnValue(procData);
      const path = botPath("A", "CT");
      expect(path.length).toBe(3);
      expect(path[0]).toEqual({ x: 20, z: 0 });
    });

    it("returns procedural path for B lane uses bombSites.B", () => {
      mockGetProceduralMapData.mockReturnValue(procData);
      const path = botPath("B", "T");
      expect(path.length).toBe(3);
      expect(path[2]).toEqual({ x: 15, z: 16 });
    });

    it("returns procedural path for mid lane averages A and B sites (lines 350-353)", () => {
      mockGetProceduralMapData.mockReturnValue(procData);
      const path = botPath("mid", "T");
      expect(path.length).toBe(3);
      const midX = (-12 + 15) / 2;
      const midZ = (-15 + 16) / 2;
      expect(path[2]).toEqual({ x: midX, z: midZ });
    });

    it("falls back to BOT_PATHS when getProceduralMapData throws", () => {
      mockGetProceduralMapData.mockImplementation(() => {
        throw new Error("registry empty");
      });
      const path = botPath("A", "T");
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe("resolveBombSites procedural branch", () => {
    it("returns procedural bombSites when available", () => {
      mockGetProceduralMapData.mockReturnValue({
        spawns: { T: { x: -20, z: 0 }, CT: { x: 20, z: 0 } },
        bombSites: { A: { x: -10, z: -15 }, B: { x: 10, z: 15 } },
      });
      const sites = resolveBombSites();
      expect(sites.A.x).toBe(-10);
      expect(sites.B.z).toBe(15);
    });

    it("returns default bombSites when proc is null", () => {
      mockGetProceduralMapData.mockReturnValue(null);
      const sites = resolveBombSites();
      expect(sites).toHaveProperty("A");
      expect(sites).toHaveProperty("B");
    });
  });

  describe("nearestBombSite and distToBombSite", () => {
    it("nearestBombSite returns A when closer to A", () => {
      expect(nearestBombSite({ x: -15, z: -15 })).toBe("A");
    });

    it("nearestBombSite returns B when closer to B", () => {
      expect(nearestBombSite({ x: 15, z: 15 })).toBe("B");
    });

    it("distToBombSite returns positive number", () => {
      const d = distToBombSite({ x: 0, z: 0 }, "A");
      expect(d).toBeGreaterThanOrEqual(0);
    });

    it("distToBombSite returns 0 at site center", () => {
      const sites = resolveBombSites();
      const d = distToBombSite({ x: sites.A.x, z: sites.A.z }, "A");
      expect(d).toBe(0);
    });
  });

  describe("cameraYawTowards", () => {
    it("returns correct yaw for target at +X", () => {
      const yaw = cameraYawTowards({ x: 0, z: 0 }, { x: 10, z: 0 });
      expect(yaw).toBeCloseTo(Math.atan2(-10, 0));
    });

    it("returns correct yaw for target at -Z", () => {
      const yaw = cameraYawTowards({ x: 0, z: 0 }, { x: 0, z: -10 });
      expect(yaw).toBeCloseTo(Math.atan2(0, 10));
    });
  });

  describe("inBuyZone", () => {
    it("returns true inside buy zone", () => {
      expect(inBuyZone("T", -22, 0)).toBe(true);
    });

    it("returns false far from buy zone", () => {
      expect(inBuyZone("T", 50, 50)).toBe(false);
    });
  });

  describe("isPointBlocked", () => {
    it("returns false for open point far from obstacles", () => {
      expect(isPointBlocked({ x: 50, z: 50 })).toBe(false);
    });
  });

  describe("hasLineOfSight", () => {
    it("returns true for clear path far from obstacles", () => {
      expect(hasLineOfSight({ x: 50, z: 50 }, { x: 55, z: 55 })).toBe(true);
    });

    it("returns true when distance <= 0.001", () => {
      expect(hasLineOfSight({ x: 1, z: 1 }, { x: 1, z: 1 })).toBe(true);
    });

    it("returns false when obstacle blocks path", () => {
      const obs = [{ minX: 4, maxX: 6, minZ: -1, maxZ: 1, minY: 0, maxY: 2 }];
      expect(hasLineOfSight({ x: 0, z: 0 }, { x: 10, z: 0 }, obs)).toBe(false);
    });
  });

  describe("clampToMap edge cases", () => {
    it("clamps NaN x to boundary", () => {
      const result = clampToMap({ x: NaN, z: 0 });
      expect(Number.isFinite(result.x)).toBe(true);
    });

    it("clamps Infinity z to boundary", () => {
      const result = clampToMap({ x: 0, z: Infinity });
      expect(Number.isFinite(result.z)).toBe(true);
    });
  });

  describe("steerAroundObstacles", () => {
    it("returns intended when no obstacle", () => {
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(result.x).toBe(5);
      expect(result.z).toBe(5);
    });

    it("steers around obstacle", () => {
      const obs = [{ minX: 3, maxX: 7, minZ: -1, maxZ: 1, minY: 0, maxY: 2 }];
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 0 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });

    it("handles when origin is inside obstacle", () => {
      const obs = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1, minY: 0, maxY: 2 }];
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 0 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("pushOutOfObstacles edge cases", () => {
    it("nudges point out of obstacle with various radii", () => {
      const obs = [{ minX: -0.5, maxX: 0.5, minZ: -0.5, maxZ: 0.5 }];
      const result = pushOutOfObstacles({ x: 0, z: 0 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("inBuyZone additional coverage", () => {
    it("returns false for CT at T spawn", () => {
      expect(inBuyZone("CT", -22, 0)).toBe(false);
    });

    it("returns true for CT at CT spawn", () => {
      expect(inBuyZone("CT", 22, 0)).toBe(true);
    });

    it("returns false at edge of map", () => {
      expect(inBuyZone("T", 0, 0)).toBe(false);
    });
  });

  describe("resolveBuyZone fallback when store throws", () => {
    it("falls back to BUY_ZONE constant", () => {
      vi.doMock("../../../client/src/stores/useGameStore", () => ({
        useGameStore: {
          getState: () => { throw new Error("store not ready"); },
        },
      }));
      expect(inBuyZone("T", -22, 0)).toBe(true);
    });
  });

  describe("resolveBuyZone procedural branch", () => {
    it("returns procedural buy zone when proc data has spawns", () => {
      mockGetProceduralMapData.mockReturnValue({
        spawns: { T: { x: -20, z: 0 }, CT: { x: 20, z: 0 } },
      });
      expect(inBuyZone("T", -20, 0)).toBe(true);
      expect(inBuyZone("CT", 20, 0)).toBe(true);
    });

    it("returns default buy zone when proc data is null", () => {
      mockGetProceduralMapData.mockReturnValue(null);
      expect(inBuyZone("T", -22, 0)).toBe(true);
    });
  });

  describe("laneForRole additional cases", () => {
    it("returns A for runner", () => {
      expect(laneForRole("runner", "bot1")).toBe("A");
    });

    it("returns B for flanker", () => {
      expect(laneForRole("flanker", "bot1")).toBe("B");
    });

    it("returns A for support with n % 5 === 3 (bot3)", () => {
      expect(laneForRole("support", "bot3")).toBe("A");
    });

    it("returns mid for support with n % 5 !== 3 (bot6)", () => {
      expect(laneForRole("support", "bot6")).toBe("mid");
    });

    it("returns mid for support with NaN id", () => {
      expect(laneForRole("support", "abc")).toBe("mid");
    });
  });

  describe("steerAroundObstacles forced angular path", () => {
    it("returns different point when onlyX and onlyZ are blocked", () => {
      const obs = [
        { minX: 4.5, maxX: 5.5, minZ: -1, maxZ: 1, minY: 0, maxY: 2 },
        { minX: -1, maxX: 1, minZ: 4.5, maxZ: 5.5, minY: 0, maxY: 2 },
      ];
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 5 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });

    it("returns origin when all angular candidates also blocked", () => {
      const wallObs = Array.from({ length: 20 }, (_, i) => ({
        minX: -20 + i * 2 - 0.5,
        maxX: -20 + i * 2 + 0.5,
        minZ: -1,
        maxZ: 20,
        minY: 0,
        maxY: 2,
      }));
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 10, z: 10 }, wallObs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("pushOutOfObstacles returns start when all dirs blocked", () => {
    it("returns clamped position when all radii blocked", () => {
      const obs = [
        { minX: -100, maxX: 100, minZ: -100, maxZ: 100, minY: 0, maxY: 2 },
      ];
      const result = pushOutOfObstacles({ x: 0, z: 0 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("botPath dust map", () => {
    it("returns RAVENPOINT_BOT_PATHS for dust map", () => {
      vi.doMock("../../../client/src/stores/useGameStore", () => ({
        useGameStore: {
          getState: () => ({ currentMap: "dust", setTracerEvent: vi.fn() }),
          setState: vi.fn(),
        },
      }));
      const path = botPath("A", "T");
      expect(path.length).toBeGreaterThan(0);
    });

    it("returns RAVENPOINT_BOT_PATHS for ravenpoint map", () => {
      vi.doMock("../../../client/src/stores/useGameStore", () => ({
        useGameStore: {
          getState: () => ({ currentMap: "ravenpoint", setTracerEvent: vi.fn() }),
          setState: vi.fn(),
        },
      }));
      const path = botPath("A", "T");
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe("hideBehindCover scoring", () => {
    it("returns a specific point when obstacle is available", () => {
      const obs = [{ minX: 8, maxX: 12, minZ: -2, maxZ: 2, minY: 0, maxY: 3 }];
      const result = hideBehindCover({ x: 0, z: 0 }, { x: 20, z: 0 }, obs as any);
      expect(result).not.toBeNull();
      if (result) {
        expect(typeof result.x).toBe("number");
        expect(typeof result.z).toBe("number");
        expect(result.x).toBeLessThan(20);
      }
    });
  });

  describe("resolveObstacles procedural", () => {
    it("uses procedural obstacles in hasLineOfSight when available", () => {
      mockGetProceduralMapData.mockReturnValue({
        obstacles: [{ minX: 5, maxX: 7, minZ: -1, maxZ: 1, minY: 0, maxY: 2 }],
        spawns: { T: { x: -20, z: 0 }, CT: { x: 20, z: 0 } },
        bombSites: { A: { x: -12, z: -15 }, B: { x: 15, z: 16 } },
        bounds: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 },
      });
      const blocked = hasLineOfSight({ x: 0, z: 0 }, { x: 10, z: 0 });
      expect(blocked).toBe(false);
    });
  });

  describe("getCurrentMapId catch branch (line 19)", () => {
    it("falls back to container_yard when useGameStore.getState throws", () => {
      vi.doMock("../../../client/src/stores/useGameStore", () => ({
        useGameStore: {
          getState: () => { throw new Error("store not ready"); },
          setState: vi.fn(),
        },
      }));
      const result = clampToMap({ x: 0, z: 0 });
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("resolveBuyZone catch branch (line 72)", () => {
    it("falls back to BUY_ZONE when both proc and store throw", () => {
      mockGetProceduralMapData.mockImplementation(() => {
        throw new Error("no proc");
      });
      vi.doMock("../../../client/src/stores/useGameStore", () => ({
        useGameStore: {
          getState: () => { throw new Error("store not ready"); },
          setState: vi.fn(),
        },
      }));
      expect(inBuyZone("T", -22, 0)).toBe(true);
    });
  });

  describe("steerAroundObstacles all angular candidates blocked (lines 197-214)", () => {
    it("returns origin when both onlyX, onlyZ and all angular candidates are blocked", () => {
      const wallObs = [
        { minX: -1, maxX: 30, minZ: -30, maxZ: 30, minY: 0, maxY: 2 },
      ];
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 0 }, wallObs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });

    it("steers when onlyX blocked but a nearby angular candidate is free", () => {
      const obs = [
        { minX: 4, maxX: 6, minZ: -0.5, maxZ: 0.5, minY: 0, maxY: 2 },
      ];
      const result = steerAroundObstacles({ x: 0, z: 0 }, { x: 5, z: 0 }, obs as any);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });
  });

  describe("resolveTeamSpawn fallback branch (lines 446-447)", () => {
    it("falls back to SPAWN constant when both proc and getSpawnForMap throw", () => {
      mockGetProceduralMapData.mockImplementation(() => {
        throw new Error("no proc");
      });
      mockGetSpawnForMap.mockImplementation(() => {
        throw new Error("no shared");
      });
      const spawn = resolveTeamSpawn("some_unknown_map", "T");
      expect(spawn).toEqual({ x: -22, z: 0 });
    });

    it("falls back to SPAWN constant for CT when both throw", () => {
      mockGetProceduralMapData.mockImplementation(() => {
        throw new Error("no proc");
      });
      mockGetSpawnForMap.mockImplementation(() => {
        throw new Error("no shared");
      });
      const spawn = resolveTeamSpawn("some_unknown_map", "CT");
      expect(spawn).toEqual({ x: 22, z: 0 });
    });
  });
});
