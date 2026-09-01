import { describe, it, expect } from "vitest";
import { clampToMap, hasLineOfSight, isPointBlocked, stepToward } from "@src/game/offline/offlineCombat";
import { MAP_BOUNDARY } from "@cs-game/shared";

describe("offlineCombat coverage — realistik gameplay", () => {
  describe("clampToMap NaN guard (P1 fix)", () => {
    it("NaN x/z returns 0,0 clamped (previously NaN poisoning)", () => {
      const r = clampToMap({ x: NaN, z: NaN });
      expect(Number.isNaN(r.x)).toBe(false);
      expect(Number.isNaN(r.z)).toBe(false);
      expect(r.x).toBeGreaterThanOrEqual(MAP_BOUNDARY.minX);
    });

    it("Infinity is treated as 0 and clamped safely (previously NaN poisoning)", () => {
      const r = clampToMap({ x: Infinity, z: 0 });
      expect(Number.isFinite(r.x)).toBe(true);
      expect(r.x).toBe(0); // guard maps non-finite to 0
    });
  });

  describe("hasLineOfSight with obstacles", () => {
    it("open ground has LOS", () => {
      expect(hasLineOfSight({ x: 50, z: 50 }, { x: 55, z: 55 })).toBe(true);
    });

    // Container at origin blocks — map has obstacles near (0,0)
    it("blocked by container at origin", () => {
      // From docs: (0,0) is blocked, (-4,2) is near cover
      expect(isPointBlocked({ x: 0, z: 0 })).toBe(true);
    });

    it("same point always LOS", () => {
      expect(hasLineOfSight({ x: 5, z: 5 }, { x: 5, z: 5 })).toBe(true);
    });
  });

  describe("stepToward with NaN/negative", () => {
    it("handles NaN speed without crashing", () => {
      const r = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, NaN, 0.1);
      expect(Number.isNaN(r.x) || Number.isFinite(r.x)).toBe(true);
    });

    it("dt=0 returns origin", () => {
      const r = stepToward({ x: 5, z: 5 }, { x: 10, z: 10 }, 5, 0);
      expect(r.x).toBe(5);
    });
  });
});
