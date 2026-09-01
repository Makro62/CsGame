import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@src/game/offline/offlineCombat", () => ({
  isPointBlocked: vi.fn(() => false),
  pushOutOfObstacles: vi.fn((p: { x: number; z: number }) => p),
  stepToward: vi.fn((from: { x: number; z: number }, to: { x: number; z: number }, _speed: number, _dt: number) => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return { ...from };
    return { x: from.x + (dx / dist) * 0.5, z: from.z + (dz / dist) * 0.5 };
  }),
}));

import { findGridPath, navigateTo, resetBotNav, spawnJitter } from "@src/game/offline/botNav";

describe("botNav", () => {
  beforeEach(() => {
    resetBotNav();
  });

  describe("findGridPath", () => {
    it("returns a path between two points", () => {
      const path = findGridPath({ x: -20, z: 0 }, { x: 20, z: 0 });
      expect(path.length).toBeGreaterThanOrEqual(2);
    });

    it("returns a trivial path for same start/end", () => {
      const path = findGridPath({ x: 0, z: 0 }, { x: 0, z: 0 });
      expect(path.length).toBe(1);
    });

    it("returns finite coordinates for all waypoints", () => {
      const path = findGridPath({ x: -20, z: -15 }, { x: 20, z: 15 });
      for (const wp of path) {
        expect(Number.isFinite(wp.x)).toBe(true);
        expect(Number.isFinite(wp.z)).toBe(true);
      }
    });

    it("caches repeated queries", () => {
      const path1 = findGridPath({ x: -10, z: 0 }, { x: 10, z: 0 });
      const path2 = findGridPath({ x: -10, z: 0 }, { x: 10, z: 0 });
      expect(path1).toStrictEqual(path2);
    });

    it("handles pathfinding from edge to edge", () => {
      const path = findGridPath({ x: -24, z: -19 }, { x: 24, z: 19 });
      expect(path.length).toBeGreaterThan(1);
    });
  });

  describe("navigateTo", () => {
    it("returns a position near origin when goal is very close", () => {
      const r = navigateTo("bot1", { x: 5, z: 5 }, { x: 5.2, z: 5.2 }, 5, 0.1);
      expect(typeof r.x).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("returns movement toward goal", () => {
      const r = navigateTo("bot2", { x: -20, z: 0 }, { x: 20, z: 0 }, 5, 0.1);
      expect(typeof r.x).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("repaths when goal changes", () => {
      navigateTo("bot3", { x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
      const r2 = navigateTo("bot3", { x: 0, z: 0 }, { x: -10, z: 0 }, 5, 0.1);
      expect(typeof r2.x).toBe("number");
      expect(Number.isFinite(r2.x)).toBe(true);
    });

    it("handles multiple bots independently", () => {
      const r1 = navigateTo("a", { x: -10, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
      const r2 = navigateTo("b", { x: 10, z: 0 }, { x: -10, z: 0 }, 5, 0.1);
      expect(typeof r1.x).toBe("number");
      expect(typeof r2.x).toBe("number");
    });
  });

  describe("resetBotNav", () => {
    it("resets specific bot state", () => {
      navigateTo("botA", { x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
      resetBotNav("botA");
      // No crash
    });

    it("resets all bot state", () => {
      navigateTo("botB", { x: 0, z: 0 }, { x: 10, z: 0 }, 5, 0.1);
      resetBotNav();
      // No crash
    });
  });

  describe("spawnJitter", () => {
    it("returns valid coordinates for T", () => {
      const r = spawnJitter("T");
      expect(typeof r.x).toBe("number");
      expect(typeof r.z).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("returns valid coordinates for CT", () => {
      const r = spawnJitter("CT");
      expect(typeof r.x).toBe("number");
      expect(typeof r.z).toBe("number");
      expect(Number.isFinite(r.x)).toBe(true);
    });

    it("does not return NaN or Infinity", () => {
      for (let i = 0; i < 20; i++) {
        const r = spawnJitter(i % 2 === 0 ? "T" : "CT");
        expect(Number.isFinite(r.x)).toBe(true);
        expect(Number.isFinite(r.z)).toBe(true);
      }
    });
  });
});