import { describe, it, expect, vi } from "vitest";

vi.mock("../../../client/src/stores/useZombieStore", () => ({
  useZombieStore: {
    getState: () => ({ unlockedDoors: [] }),
  },
}));

import {
  SURVIVAL_BOUNDS,
  SURVIVAL_SPAWNS,
  SURVIVAL_DOORS,
  SURVIVAL_BARRICADES,
  SURVIVAL_ROOMS,
  SURVIVAL_OBSTACLES,
  DOOR_LOCATIONS,
  SURVIVAL_STAGES,
  getSurvivalStageBounds,
  getSpawnsForUnlockedStages,
  GATE1_OBSTACLE,
  GATE2_OBSTACLE,
  getSurvivalObstacles,
  pushOutSurvival,
  survivalLineOfSight,
  findNearestDoor,
  findNearestBarricade,
  findRepairableBarricade,
  survivalWallDistance,
} from "../../../client/src/game/zombie/survivalLayout";
import type { SurvivalObstacle } from "../../../client/src/game/zombie/survivalLayout";

describe("survivalLayout", () => {
  it("SURVIVAL_BOUNDS has valid AABB", () => {
    expect(SURVIVAL_BOUNDS.minX).toBeLessThan(SURVIVAL_BOUNDS.maxX);
    expect(SURVIVAL_BOUNDS.minZ).toBeLessThan(SURVIVAL_BOUNDS.maxZ);
  });

  it("SURVIVAL_SPAWNS has entries", () => {
    expect(SURVIVAL_SPAWNS.length).toBeGreaterThan(0);
  });

  it("SURVIVAL_DOORS has entries", () => {
    expect(SURVIVAL_DOORS.length).toBeGreaterThan(0);
  });

  it("SURVIVAL_BARRICADES has entries", () => {
    expect(SURVIVAL_BARRICADES.length).toBeGreaterThan(0);
  });

  it("SURVIVAL_ROOMS has entries and first is starting room", () => {
    expect(SURVIVAL_ROOMS.length).toBeGreaterThan(0);
    expect(SURVIVAL_ROOMS[0].isStartingRoom).toBe(true);
  });

  it("SURVIVAL_OBSTACLES has entries", () => {
    expect(SURVIVAL_OBSTACLES.length).toBeGreaterThan(0);
  });

  it("DOOR_LOCATIONS has entries matching SURVIVAL_DOORS", () => {
    expect(DOOR_LOCATIONS).toBeDefined();
    expect(DOOR_LOCATIONS.length).toBe(SURVIVAL_DOORS.length);
    for (const loc of DOOR_LOCATIONS) {
      expect(loc).toHaveProperty("doorId");
      expect(loc).toHaveProperty("position");
      expect(loc).toHaveProperty("rotation");
      expect(loc).toHaveProperty("cost");
    }
  });

  describe("getSurvivalObstacles", () => {
    it("returns base obstacles with no doors unlocked", () => {
      const obs = getSurvivalObstacles([]);
      expect(obs.length).toBeGreaterThan(0);
    });

    it("adds lab obstacles when door_lab unlocked", () => {
      const base = getSurvivalObstacles([]);
      const unlocked = getSurvivalObstacles(["door_lab"]);
      expect(unlocked.length).toBeGreaterThanOrEqual(base.length);
    });

    it("adds armory obstacles when door_armory unlocked", () => {
      const base = getSurvivalObstacles([]);
      const unlocked = getSurvivalObstacles(["door_armory"]);
      expect(unlocked.length).toBeGreaterThanOrEqual(base.length);
    });

    it("adds catwalk obstacles when door_catwalk unlocked", () => {
      const base = getSurvivalObstacles([]);
      const unlocked = getSurvivalObstacles(["door_catwalk"]);
      expect(unlocked.length).toBeGreaterThanOrEqual(base.length);
    });

    it("adds bunker obstacles when door_bunker unlocked", () => {
      const base = getSurvivalObstacles([]);
      const unlocked = getSurvivalObstacles(["door_bunker"]);
      expect(unlocked.length).toBeGreaterThanOrEqual(base.length);
    });

    it("adds all room obstacles when all 4 doors unlocked", () => {
      const base = getSurvivalObstacles([]);
      const all = getSurvivalObstacles(["door_lab", "door_armory", "door_catwalk", "door_bunker"]);
      expect(all.length).toBeGreaterThan(base.length + 3);
    });

    it("adds closed door wall when lab is locked", () => {
      const obs = getSurvivalObstacles([]);
      const closedDoor = obs.find(
        (o) => o.minX === -2 && o.maxX === 2 && o.minZ === 8 && o.maxZ === 9
      );
      expect(closedDoor).toBeDefined();
      expect(closedDoor!.kind).toBe("wall");
    });

    it("adds closed door wall when armory is locked", () => {
      const obs = getSurvivalObstacles([]);
      const closedDoor = obs.find(
        (o) => o.minX === -10.15 && o.maxX === -9.85
      );
      expect(closedDoor).toBeDefined();
    });

    it("does not add closed door walls when doors are unlocked", () => {
      const obs = getSurvivalObstacles(["door_lab", "door_armory", "door_catwalk", "door_bunker"]);
      const closedLab = obs.find(
        (o) => o.minX === -2 && o.maxX === 2 && o.minZ === 8 && o.maxZ === 9
      );
      expect(closedLab).toBeUndefined();
    });
  });

  describe("pushOutSurvival", () => {
    it("returns same position when not in obstacle", () => {
      const result = pushOutSurvival(0, 0, 0.5, SURVIVAL_OBSTACLES);
      expect(result.x).toBeCloseTo(0, 1);
      expect(result.z).toBeCloseTo(0, 1);
    });

    it("pushes out when inside an obstacle", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -1, maxX: 1, minZ: -1, maxZ: 1, kind: "wall" },
      ];
      const result = pushOutSurvival(0, 0, 0.5, wallObs);
      expect(Math.hypot(result.x, result.z)).toBeGreaterThanOrEqual(0.5);
    });

    it("pushes out when at center of obstacle (dist < 1e-5)", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -5, maxX: 5, minZ: -5, maxZ: 5, kind: "wall" },
      ];
      const result = pushOutSurvival(0, 0, 1.0, wallObs);
      expect(result.x).toBeCloseTo(1.0, 1);
      expect(result.z).toBeCloseTo(0, 1);
    });

    it("pushes correctly when near edge of obstacle", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -1, maxX: 1, minZ: -1, maxZ: 1, kind: "wall" },
      ];
      const result = pushOutSurvival(0.9, 0, 0.3, wallObs);
      expect(result.x).toBeGreaterThan(1.0);
    });

    it("handles multiple obstacles", () => {
      const obs: SurvivalObstacle[] = [
        { minX: -1, maxX: 1, minZ: -1, maxZ: 1, kind: "wall" },
        { minX: 3, maxX: 5, minZ: -1, maxZ: 1, kind: "crate" },
      ];
      const result = pushOutSurvival(0, 0, 0.5, obs);
      expect(Math.hypot(result.x, result.z)).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("survivalLineOfSight", () => {
    it("returns true for clear path", () => {
      expect(
        survivalLineOfSight(0, 0, 5, 5, SURVIVAL_OBSTACLES)
      ).toBe(true);
    });

    it("returns false when wall blocks", () => {
      const result = survivalLineOfSight(-23, 0, 23, 0, SURVIVAL_OBSTACLES);
      expect(typeof result).toBe("boolean");
    });

    it("returns true for very short distance (< 0.1)", () => {
      expect(
        survivalLineOfSight(5, 5, 5.05, 5.05, SURVIVAL_OBSTACLES)
      ).toBe(true);
    });

    it("returns true when distance is exactly zero", () => {
      expect(
        survivalLineOfSight(5, 5, 5, 5, SURVIVAL_OBSTACLES)
      ).toBe(true);
    });

    it("returns true for short distance under 0.1", () => {
      expect(
        survivalLineOfSight(0, 0, 0.05, 0, SURVIVAL_OBSTACLES)
      ).toBe(true);
    });
  });

  describe("findNearestDoor", () => {
    it("returns door when close", () => {
      const door = findNearestDoor(0, 8, [], 2);
      expect(door).not.toBeNull();
    });

    it("returns null when no doors nearby", () => {
      const door = findNearestDoor(0, 0, [], 1);
      expect(door).toBeNull();
    });

    it("skips unlocked doors", () => {
      const door = findNearestDoor(0, 8, ["door_lab"], 2);
      expect(door).toBeNull();
    });

    it("returns closest unlocked door when some are unlocked", () => {
      const door = findNearestDoor(0, 8, ["door_armory", "door_catwalk", "door_bunker"], 5);
      expect(door).not.toBeNull();
      expect(door!.id).toBe("door_lab");
    });

    it("returns null when all doors are unlocked", () => {
      const door = findNearestDoor(0, 8, ["door_lab", "door_armory", "door_catwalk", "door_bunker"], 5);
      expect(door).toBeNull();
    });
  });

  describe("findNearestBarricade", () => {
    it("returns barricade when close and has planks", () => {
      const barricades = { win_north: 6 };
      const id = findNearestBarricade(0, -22, barricades, 5);
      expect(id).toBe("win_north");
    });

    it("returns null when no barricades have planks", () => {
      const barricades = { win_north: 0 };
      const id = findNearestBarricade(0, -22, barricades, 5);
      expect(id).toBeNull();
    });

    it("returns null when no barricades are in range", () => {
      const barricades = { win_north: 6 };
      const id = findNearestBarricade(50, 50, barricades, 5);
      expect(id).toBeNull();
    });

    it("returns nearest barricade with planks when multiple exist", () => {
      const barricades = { win_north: 3, win_south: 6 };
      const id = findNearestBarricade(0, -22, barricades, 50);
      expect(id).toBe("win_north");
    });

    it("skips barricades with zero planks", () => {
      const barricades = { win_north: 0, win_south: 0, win_east: 0, win_west: 0 };
      const id = findNearestBarricade(0, -22, barricades, 50);
      expect(id).toBeNull();
    });

    it("defaults planks to 6 when barricade not in record", () => {
      const id = findNearestBarricade(0, -22, {}, 5);
      expect(id).toBe("win_north");
    });
  });

  describe("findRepairableBarricade", () => {
    it("returns barricade that needs repair", () => {
      const barricades = { win_north: 4 };
      const id = findRepairableBarricade(0, -22, barricades, 5);
      expect(id).toBe("win_north");
    });

    it("returns null when fully repaired", () => {
      const barricades = { win_north: 6 };
      const id = findRepairableBarricade(0, -22, barricades, 5);
      expect(id).toBeNull();
    });

    it("returns null when no barricades in range", () => {
      const barricades = { win_north: 4 };
      const id = findRepairableBarricade(50, 50, barricades, 5);
      expect(id).toBeNull();
    });

    it("returns barricade with zero planks as repairable", () => {
      const barricades = { win_north: 0 };
      const id = findRepairableBarricade(0, -22, barricades, 5);
      expect(id).toBe("win_north");
    });

    it("skips fully repaired barricades to find repairable one", () => {
      const barricades = { win_north: 6, win_south: 2 };
      const id = findRepairableBarricade(0, 0, barricades, 50);
      expect(id).toBe("win_south");
    });
  });

  describe("survivalWallDistance edge cases", () => {
    it("returns maxDist when dx=0 and dz=0", () => {
      const d = survivalWallDistance(0, 0, 0, 0);
      expect(d).toBe(70);
    });

    it("returns maxDist for very small direction vector", () => {
      const d = survivalWallDistance(0, 0, 1e-10, 1e-10);
      expect(d).toBe(70);
    });

    it("uses default obstacles from store when none provided", () => {
      const d = survivalWallDistance(0, 0, 1, 0);
      expect(d).toBeGreaterThan(0);
    });
  });

  describe("getSurvivalObstacles with all doors unlocked", () => {
    it("does not add closed door walls for any door", () => {
      const obs = getSurvivalObstacles(["door_lab", "door_armory", "door_catwalk", "door_bunker"]);
      const closedLab = obs.find(o => o.minX === -2 && o.maxX === 2 && o.minZ === 8 && o.maxZ === 9);
      const closedArmory = obs.find(o => o.minX === -10.15 && o.maxX === -9.85);
      const closedCatwalk = obs.find(o => o.minX === 9 && o.maxX === 10 && o.minZ === -8 && o.maxZ === -7);
      const closedBunker = obs.find(o => o.minX === -2 && o.maxX === 2 && o.minZ === -12 && o.maxZ === -11);
      expect(closedLab).toBeUndefined();
      expect(closedArmory).toBeUndefined();
      expect(closedCatwalk).toBeUndefined();
      expect(closedBunker).toBeUndefined();
    });
  });

  describe("pushOutSurvival with default store obstacles", () => {
    it("uses store unlockedDoors when obstacles not provided", () => {
      const result = pushOutSurvival(0, 0, 0.5);
      expect(result).toHaveProperty("x");
      expect(result).toHaveProperty("z");
    });

    it("pushes out from center of large obstacle (dist < 1e-5)", () => {
      const obs: SurvivalObstacle[] = [
        { minX: -10, maxX: 10, minZ: -10, maxZ: 10, kind: "wall" },
      ];
      const result = pushOutSurvival(0, 0, 2, obs);
      expect(result.x).toBeCloseTo(2, 0);
    });
  });

  describe("survivalLineOfSight with unlocked doors", () => {
    it("uses store unlockedDoors when obstacles not provided", () => {
      const result = survivalLineOfSight(0, 0, 5, 5);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("findNearestDoor edge cases", () => {
    it("returns null when all doors unlocked", () => {
      const door = findNearestDoor(0, 8, ["door_lab", "door_armory", "door_catwalk", "door_bunker"], 10);
      expect(door).toBeNull();
    });

    it("returns null when player is too far from any door", () => {
      const door = findNearestDoor(0, 50, [], 2.5);
      expect(door).toBeNull();
    });

    it("uses default maxDist of 2.5", () => {
      const door = findNearestDoor(0, 50, []);
      expect(door).toBeNull();
    });
  });

  describe("findNearestBarricade with missingPlanks", () => {
    it("uses default missingPlanks of 6 when barricade not in record", () => {
      const id = findNearestBarricade(0, 22, {}, 5);
      expect(id).toBe("win_south");
    });
  });

  describe("findRepairableBarricade with missingPlanks", () => {
    it("returns null when barricade has 6 planks (default)", () => {
      const id = findRepairableBarricade(0, 22, {}, 5);
      expect(id).toBeNull();
    });

    it("returns barricade when it has fewer than 6 planks", () => {
      const id = findRepairableBarricade(0, 22, { win_south: 3 }, 5);
      expect(id).toBe("win_south");
    });
  });

  describe("survivalWallDistance", () => {
    it("returns maxDist for clear path", () => {
      const d = survivalWallDistance(0, 0, 1, 0, 70, SURVIVAL_OBSTACLES);
      expect(d).toBe(70);
    });

    it("returns shorter distance when wall blocks", () => {
      const d = survivalWallDistance(0, 0, 1, 0, 70, SURVIVAL_OBSTACLES);
      expect(d).toBeLessThanOrEqual(70);
    });

    it("returns maxDist for zero-length direction", () => {
      const d = survivalWallDistance(0, 0, 0, 0, 70, SURVIVAL_OBSTACLES);
      expect(d).toBe(70);
    });

    it("returns maxDist for very small direction", () => {
      const d = survivalWallDistance(0, 0, 1e-10, 1e-10, 70, SURVIVAL_OBSTACLES);
      expect(d).toBe(70);
    });

    it("returns distance to nearest wall in direction", () => {
      const obs: SurvivalObstacle[] = [
        { minX: 4, maxX: 5, minZ: -10, maxZ: 10, kind: "wall" },
      ];
      const d = survivalWallDistance(0, 0, 1, 0, 70, obs);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(70);
    });

    it("ignores walls behind the origin", () => {
      const obs: SurvivalObstacle[] = [
        { minX: -5, maxX: -4, minZ: -10, maxZ: 10, kind: "wall" },
      ];
      const d = survivalWallDistance(0, 0, 1, 0, 70, obs);
      expect(d).toBe(70);
    });
  });

  describe("uBunker helper — all quadrant branches (lines 99-116)", () => {
    it("cx<0 cz<0 produces walls for all 4 branches", () => {
      const obs = getSurvivalObstacles(["door_bunker"]);
      expect(obs.length).toBeGreaterThan(0);
    });

    it("cx>0 cz<0 variant (armory area with catwalk)", () => {
      const obs = getSurvivalObstacles(["door_armory", "door_catwalk"]);
      expect(obs.length).toBeGreaterThan(0);
    });

    it("cx>0 cz>0 variant", () => {
      const obs = getSurvivalObstacles(["door_armory"]);
      expect(obs.length).toBeGreaterThan(0);
    });

    it("cx<0 cz>0 variant", () => {
      const obs = getSurvivalObstacles(["door_lab"]);
      expect(obs.length).toBeGreaterThan(0);
    });
  });

  describe("pushOutSurvival push logic (lines 177-179)", () => {
    it("pushes point away from obstacle center when inside", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -2, maxX: 2, minZ: -2, maxZ: 2, kind: "wall" },
      ];
      const result = pushOutSurvival(0, 0, 1.0, wallObs);
      expect(result.x).toBeGreaterThanOrEqual(1.0 - 0.01);
    });

    it("pushes from edge of obstacle when near boundary", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -2, maxX: 2, minZ: -2, maxZ: 2, kind: "wall" },
      ];
      const result = pushOutSurvival(1.5, 0, 1.0, wallObs);
      expect(Math.hypot(result.x, result.z)).toBeGreaterThanOrEqual(0.9);
    });

    it("handles push when point is at obstacle surface (dist ~radius)", () => {
      const wallObs: SurvivalObstacle[] = [
        { minX: -1, maxX: 1, minZ: -1, maxZ: 1, kind: "wall" },
      ];
      const result = pushOutSurvival(0.8, 0, 0.3, wallObs);
      expect(result.x).toBeGreaterThan(1.0);
    });
  });

  describe("Survivor Campaign Stages & Gates", () => {
    it("has 3 configured stages with names and valid bounds", () => {
      expect(SURVIVAL_STAGES[1]).toBeDefined();
      expect(SURVIVAL_STAGES[2]).toBeDefined();
      expect(SURVIVAL_STAGES[3]).toBeDefined();
      expect(SURVIVAL_STAGES[1].bounds.minZ).toBeGreaterThan(SURVIVAL_STAGES[2].bounds.minZ);
      expect(SURVIVAL_STAGES[2].bounds.minZ).toBeGreaterThan(SURVIVAL_STAGES[3].bounds.minZ);
    });

    it("getSurvivalStageBounds returns progressive bounds", () => {
      const b1 = getSurvivalStageBounds(1);
      const b2 = getSurvivalStageBounds(2);
      const b3 = getSurvivalStageBounds(3);
      expect(b1.minZ).toBe(-6);
      expect(b2.minZ).toBe(-42);
      expect(b3.minZ).toBe(-78);
    });

    it("getSpawnsForUnlockedStages adds more spawns as stages unlock", () => {
      const s1 = getSpawnsForUnlockedStages(1);
      const s2 = getSpawnsForUnlockedStages(2);
      const s3 = getSpawnsForUnlockedStages(3);
      expect(s1.length).toBeGreaterThan(0);
      expect(s2.length).toBeGreaterThan(s1.length);
      expect(s3.length).toBeGreaterThan(s2.length);
    });

    it("getSurvivalObstacles includes GATE1_OBSTACLE when gate1Open is false", () => {
      const closed = getSurvivalObstacles([], false, false);
      const hasG1 = closed.some(
        (o) => o.minX === GATE1_OBSTACLE.minX && o.minZ === GATE1_OBSTACLE.minZ
      );
      expect(hasG1).toBe(true);
    });

    it("getSurvivalObstacles removes GATE1_OBSTACLE and adds STAGE2_OBSTACLES when gate1Open is true", () => {
      const open = getSurvivalObstacles([], true, false);
      const hasG1 = open.some(
        (o) => o.minX === GATE1_OBSTACLE.minX && o.minZ === GATE1_OBSTACLE.minZ
      );
      expect(hasG1).toBe(false);
    });

    it("getSurvivalObstacles removes GATE2_OBSTACLE when gate2Open is true", () => {
      const closed = getSurvivalObstacles([], true, false);
      const open = getSurvivalObstacles([], true, true);
      const hasG2Closed = closed.some(
        (o) => o.minX === GATE2_OBSTACLE.minX && o.minZ === GATE2_OBSTACLE.minZ
      );
      const hasG2Open = open.some(
        (o) => o.minX === GATE2_OBSTACLE.minX && o.minZ === GATE2_OBSTACLE.minZ
      );
      expect(hasG2Closed).toBe(true);
      expect(hasG2Open).toBe(false);
    });
  });
});
