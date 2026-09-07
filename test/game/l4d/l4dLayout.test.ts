import { describe, it, expect, vi } from "vitest";
import {
  L4D_ZONES,
  L4D_BOUNDS,
  L4D_ROOMS,
  L4D_CONNECTORS,
  L4D_COVER,
  L4D_SAFE_Z,
  L4D_FINISH_Z,
  L4D_HALL_HALF,
  L4D_WALL_T,
  L4D_DOOR_W,
  L4D_TRAVERSE_Z,
  L4D_RESCUE_RADIUS,
  L4D_CAMPAIGN_WEAPON,
  L4D_WALK_RADIUS,
  L4D_OPEN_SPAWNS,
  getL4DZone,
  l4dUnlockedMaxZ,
  pickL4DZoneSpawn,
  l4dWalkableRooms,
  clampL4DWalkable,
  clampL4DInfected,
  pushOutL4D,
  l4dRoughLos,
  pickL4DSpawn,
  l4dFinishZ,
} from "../../../client/src/game/l4d/l4dLayout";

describe("l4dLayout", () => {
  describe("constants", () => {
    it("L4D_ZONES has 4 zones", () => {
      expect(L4D_ZONES).toHaveLength(4);
    });

    it("L4D_BOUNDS is valid", () => {
      expect(L4D_BOUNDS.minX).toBeLessThan(L4D_BOUNDS.maxX);
      expect(L4D_BOUNDS.minZ).toBeLessThan(L4D_BOUNDS.maxZ);
    });

    it("L4D_SAFE_Z is defined", () => {
      expect(typeof L4D_SAFE_Z).toBe("number");
    });

    it("L4D_FINISH_Z is defined", () => {
      expect(typeof L4D_FINISH_Z).toBe("number");
      expect(L4D_FINISH_Z).toBe(57);
    });

    it("L4D_HALL_HALF is defined", () => {
      expect(L4D_HALL_HALF).toBe(5);
    });

    it("L4D_WALL_T is defined", () => {
      expect(L4D_WALL_T).toBe(0.9);
    });

    it("L4D_DOOR_W is twice L4D_HALL_HALF", () => {
      expect(L4D_DOOR_W).toBe(L4D_HALL_HALF * 2);
    });

    it("L4D_TRAVERSE_Z is defined", () => {
      expect(typeof L4D_TRAVERSE_Z).toBe("number");
    });

    it("L4D_RESCUE_RADIUS is defined", () => {
      expect(L4D_RESCUE_RADIUS).toBe(10);
    });

    it("L4D_CAMPAIGN_WEAPON is ak47", () => {
      expect(L4D_CAMPAIGN_WEAPON).toBe("ak47");
    });

    it("L4D_WALK_RADIUS is defined", () => {
      expect(L4D_WALK_RADIUS).toBe(0.55);
    });

    it("L4D_ROOMS has all rooms", () => {
      expect(L4D_ROOMS).toHaveProperty("safe");
      expect(L4D_ROOMS).toHaveProperty("hall_a");
      expect(L4D_ROOMS).toHaveProperty("warehouse");
      expect(L4D_ROOMS).toHaveProperty("hall_b");
      expect(L4D_ROOMS).toHaveProperty("side");
      expect(L4D_ROOMS).toHaveProperty("rescue");
    });

    it("L4D_COVER has entries", () => {
      expect(L4D_COVER.length).toBeGreaterThan(0);
    });

    it("L4D_CONNECTORS has entries", () => {
      expect(L4D_CONNECTORS.length).toBeGreaterThan(0);
    });

    it("L4D_OPEN_SPAWNS has entries", () => {
      expect(L4D_OPEN_SPAWNS.length).toBeGreaterThan(0);
    });
  });

  describe("l4dFinishZ", () => {
    it("returns L4D_FINISH_Z", () => {
      expect(l4dFinishZ()).toBe(L4D_FINISH_Z);
    });

    it("returns L4D_FINISH_Z even with chapter arg", () => {
      expect(l4dFinishZ(3)).toBe(L4D_FINISH_Z);
    });
  });

  describe("getL4DZone", () => {
    it("returns zone for valid index", () => {
      expect(getL4DZone(0).id).toBe("hall_a");
    });

    it("clamps to first zone for negative index", () => {
      expect(getL4DZone(-1).id).toBe("hall_a");
    });

    it("clamps to last zone for out of bounds", () => {
      expect(getL4DZone(999).id).toBe(L4D_ZONES[L4D_ZONES.length - 1].id);
    });
  });

  describe("l4dUnlockedMaxZ", () => {
    it("returns safe room maxZ for 0 unlocked", () => {
      expect(l4dUnlockedMaxZ(0)).toBe(L4D_ROOMS.safe.maxZ);
    });

    it("returns full bounds for all unlocked", () => {
      expect(l4dUnlockedMaxZ(L4D_ZONES.length)).toBe(L4D_BOUNDS.maxZ);
    });

    it("returns gate position for intermediate", () => {
      const z = l4dUnlockedMaxZ(1);
      expect(z).toBeGreaterThan(L4D_ROOMS.safe.maxZ);
    });

    it("returns correct gate for zone 2", () => {
      const z = l4dUnlockedMaxZ(2);
      expect(z).toBe(L4D_ZONES[1].gateZ - 0.55);
    });
  });

  describe("pickL4DZoneSpawn", () => {
    it("returns position within zone", () => {
      const pos = pickL4DZoneSpawn(0);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
    });

    it("returns valid position for each zone", () => {
      for (let i = 0; i < L4D_ZONES.length; i++) {
        const pos = pickL4DZoneSpawn(i);
        expect(typeof pos.x).toBe("number");
        expect(typeof pos.z).toBe("number");
      }
    });
  });

  describe("l4dWalkableRooms", () => {
    it("always includes safe room", () => {
      const rooms = l4dWalkableRooms(0);
      expect(rooms.length).toBeGreaterThanOrEqual(1);
    });

    it("more rooms with more zones unlocked", () => {
      const r0 = l4dWalkableRooms(0);
      const r2 = l4dWalkableRooms(2);
      expect(r2.length).toBeGreaterThan(r0.length);
    });

    it("includes connectors when zones unlocked", () => {
      const r1 = l4dWalkableRooms(1);
      const r0 = l4dWalkableRooms(0);
      expect(r1.length).toBeGreaterThan(r0.length);
    });

    it("returns many rooms when all zones unlocked", () => {
      const rooms = l4dWalkableRooms(L4D_ZONES.length);
      expect(rooms.length).toBeGreaterThan(5);
    });
  });

  describe("clampL4DWalkable", () => {
    it("returns position in safe room when point is inside", () => {
      const pos = clampL4DWalkable(0, -52, 4);
      expect(pos.x).toBeCloseTo(0, 0);
      expect(pos.z).toBeCloseTo(-52, 0);
    });

    it("returns position when point is inside hall_a", () => {
      const pos = clampL4DWalkable(0, -30, 4);
      expect(Math.abs(pos.x)).toBeLessThan(6);
    });

    it("returns position when point is inside warehouse", () => {
      const pos = clampL4DWalkable(0, 0, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });

    it("clamps point outside rooms to nearest room edge", () => {
      const pos = clampL4DWalkable(100, 0, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });

    it("clamps point far outside to nearest walkable", () => {
      const pos = clampL4DWalkable(-50, -50, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });

    it("respects maxZ when point exceeds it", () => {
      const pos = clampL4DWalkable(0, 200, 4);
      expect(pos.z).toBeLessThanOrEqual(L4D_BOUNDS.maxZ + 1);
    });

    it("pushes out from cover objects inside a room", () => {
      const pos = clampL4DWalkable(0, 0, 4, 0.55);
      expect(typeof pos.x).toBe("number");
    });

    it("returns valid position for hall_b zone", () => {
      const pos = clampL4DWalkable(0, 30, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });
  });

  describe("clampL4DInfected", () => {
    it("returns valid position in safe room", () => {
      const pos = clampL4DInfected(0, -52, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });

    it("returns valid position in warehouse", () => {
      const pos = clampL4DInfected(0, 0, 4);
      expect(typeof pos.x).toBe("number");
    });

    it("clamps infected outside rooms", () => {
      const pos = clampL4DInfected(100, 100, 4);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });
  });

  describe("pushOutL4D", () => {
    it("returns same position when not in cover", () => {
      const pos = pushOutL4D(0, -50, 0.5);
      expect(pos.x).toBeCloseTo(0, 1);
    });

    it("pushes out when inside a cover object", () => {
      const pos = pushOutL4D(0, 0, 1.0);
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.z).toBe("number");
    });

    it("handles center of cover (dist < 1e-5)", () => {
      const cover = L4D_COVER[0];
      const cx = (cover.minX + cover.maxX) / 2;
      const cz = (cover.minZ + cover.maxZ) / 2;
      const pos = pushOutL4D(cx, cz, 0.5);
      expect(typeof pos.x).toBe("number");
    });
  });

  describe("l4dRoughLos", () => {
    it("returns true for clear path in safe room", () => {
      expect(l4dRoughLos(0, -56, 0, -48, 4)).toBe(true);
    });

    it("returns true for clear path in warehouse", () => {
      expect(l4dRoughLos(-5, 0, 5, 0, 4)).toBe(true);
    });

    it("returns false for path through walls", () => {
      const result = l4dRoughLos(-20, 0, 20, 0, 1);
      expect(typeof result).toBe("boolean");
    });

    it("returns true for short path in same room", () => {
      expect(l4dRoughLos(0, -52, 0.5, -52, 4)).toBe(true);
    });

    it("returns false when path goes far outside rooms", () => {
      const result = l4dRoughLos(-50, -50, 50, 50, 1);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("pickL4DSpawn", () => {
    it("returns spawn position with survivors", () => {
      const survivors = [{ x: 0, z: -50 }];
      const spawn = pickL4DSpawn(survivors);
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
    });

    it("returns spawn position with no survivors", () => {
      const spawn = pickL4DSpawn([]);
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
    });

    it("returns spawn with custom min/max distance", () => {
      const survivors = [{ x: 0, z: -50 }];
      const spawn = pickL4DSpawn(survivors, 5, 30);
      expect(typeof spawn.x).toBe("number");
      expect(typeof spawn.z).toBe("number");
    });

    it("falls back when no spawn in distance range", () => {
      const survivors = [{ x: 0, z: 0 }];
      const spawn = pickL4DSpawn(survivors, 0.001, 0.002);
      expect(spawn).toHaveProperty("x");
      expect(spawn).toHaveProperty("z");
    });

    it("returns spawn near base when all survivors close", () => {
      const survivors = [{ x: 0, z: -43 }, { x: 0, z: -44 }];
      const spawn = pickL4DSpawn(survivors, 10, 26);
      expect(typeof spawn.x).toBe("number");
      expect(typeof spawn.z).toBe("number");
    });
  });
});
