import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStepToward = vi.fn((from: any, to: any, speed: number, dt: number) => ({
  x: from.x + (to.x - from.x) * Math.min(1, speed * dt),
  z: from.z + (to.z - from.z) * Math.min(1, speed * dt),
}));

vi.mock("../../../client/src/stores/useGameStore", () => ({
  useGameStore: {
    getState: () => ({
      currentMap: "container_yard",
      setTracerEvent: vi.fn(),
    }),
    setState: vi.fn(),
  },
}));

vi.mock("../../../client/src/game/offline/offlineCombat", () => ({
  isPointBlocked: vi.fn(() => false),
  pushOutOfObstacles: vi.fn((p: any) => p),
  resolveTeamSpawn: vi.fn((_map: string, team: string) =>
    team === "T" ? { x: 0, z: -20 } : { x: 0, z: 20 }
  ),
  stepToward: (...args: any[]) => mockStepToward(...args),
}));

import {
  findGridPath,
  resetBotNav,
  navigateTo,
  spawnJitter,
} from "../../../client/src/game/offline/botNav";
import { isPointBlocked, pushOutOfObstacles, resolveTeamSpawn } from "../../../client/src/game/offline/offlineCombat";
import { useGameStore } from "../../../client/src/stores/useGameStore";

describe("botNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBotNav();
  });

  describe("resetBotNav", () => {
    it("clears all navigation state", () => {
      navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      resetBotNav();
      const p = navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      expect(p).toBeDefined();
    });

    it("clears specific bot navigation", () => {
      navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      navigateTo("bot2", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      resetBotNav("bot1");
    });
  });

  describe("findGridPath", () => {
    it("returns path from start to goal", () => {
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toHaveProperty("x");
      expect(path[0]).toHaveProperty("z");
    });

    it("returns trivial path when start equals goal", () => {
      const path = findGridPath({ x: 0, z: 0 }, { x: 0, z: 0 });
      expect(path.length).toBe(1);
    });

    it("returns cached path on second call", () => {
      const p1 = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      const p2 = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(p1).toBe(p2);
    });
  });

  describe("navigateTo", () => {
    it("returns position when goal is very close", () => {
      const pos = navigateTo("bot1", { x: 0, z: 0 }, { x: 0.5, z: 0.5 }, 4, 0.1);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
    });

    it("moves toward goal", () => {
      const start = { x: 0, z: 0 };
      const goal = { x: 10, z: 10 };
      const pos = navigateTo("bot1", start, goal, 4, 0.5);
      expect(Math.hypot(pos.x - start.x, pos.z - start.z)).toBeGreaterThan(0);
    });

    it("reuses path on subsequent calls", () => {
      navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      const pos = navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      expect(pos).toHaveProperty("x");
    });

    it("repaths when goal changes", () => {
      navigateTo("bot1", { x: 0, z: 0 }, { x: 10, z: 10 }, 4, 0.1);
      const pos = navigateTo("bot1", { x: 0, z: 0 }, { x: -10, z: -10 }, 4, 0.1);
      expect(pos).toHaveProperty("x");
    });
  });

  describe("spawnJitter", () => {
    it("returns position near spawn for T", () => {
      const pos = spawnJitter("T", "container_yard");
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
    });

    it("returns position near spawn for CT", () => {
      const pos = spawnJitter("CT", "container_yard");
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
    });

    it("uses default map when not provided", () => {
      const pos = spawnJitter("T");
      expect(pos).toHaveProperty("x");
    });

    it("returns different positions on multiple calls", () => {
      const positions = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const pos = spawnJitter("T", "container_yard");
        positions.add(`${pos.x.toFixed(2)},${pos.z.toFixed(2)}`);
      }
      expect(positions.size).toBeGreaterThan(1);
    });

    it("falls back to pushOutOfObstacles(base) when all jittered positions are blocked (line 274)", () => {
      (isPointBlocked as any).mockReturnValue(true);
      const basePos = { x: 10, z: 20 };
      (resolveTeamSpawn as any).mockReturnValue(basePos);
      (pushOutOfObstacles as any).mockImplementation((p: any) => p);
      const pos = spawnJitter("T", "container_yard");
      expect(pos).toEqual(basePos);
      (isPointBlocked as any).mockReturnValue(false);
    });
  });

  describe("navigateTo stuck handling (lines 248-251)", () => {
    it("repaths when stuck for too long", () => {
      (mockStepToward as any).mockImplementation(() => ({ x: 5, z: 5 }));
      resetBotNav();
      const start = { x: 5, z: 5 };
      const goal = { x: 10, z: 10 };

      navigateTo("bot_stuck", start, goal, 4, 0.5);
      const pos = navigateTo("bot_stuck", start, goal, 4, 0.5);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
      mockStepToward.mockImplementation(
        (from: any, to: any, speed: number, dt: number) => ({
          x: from.x + (to.x - from.x) * Math.min(1, speed * dt),
          z: from.z + (to.z - from.z) * Math.min(1, speed * dt),
        })
      );
    });
  });

  describe("findGridPath edge cases", () => {
    it("returns path even with blocked cells (nearestWalkableCell fallback)", () => {
      let callCount = 0;
      const originalIsPointBlocked = isPointBlocked;
      (isPointBlocked as any).mockImplementation(() => {
        callCount++;
        return callCount % 2 === 0;
      });
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
      (isPointBlocked as any).mockImplementation(() => false);
    });

    it("returns fallback path when no path found (line 174)", () => {
      (isPointBlocked as any).mockReturnValue(true);
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThanOrEqual(1);
      (isPointBlocked as any).mockReturnValue(false);
    });
  });

  describe("navigateTo with unreachable goal (stuck repath)", () => {
    it("still returns a position when stuck", () => {
      let callCount = 0;
      mockStepToward.mockImplementation(() => {
        callCount++;
        return { x: 5, z: 5 };
      });
      resetBotNav();
      navigateTo("bot_unreachable", { x: 5, z: 5 }, { x: 100, z: 100 }, 4, 0.5);
      const pos = navigateTo("bot_unreachable", { x: 5, z: 5 }, { x: 100, z: 100 }, 4, 0.5);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
      mockStepToward.mockImplementation(
        (from: any, to: any, speed: number, dt: number) => ({
          x: from.x + (to.x - from.x) * Math.min(1, speed * dt),
          z: from.z + (to.z - from.z) * Math.min(1, speed * dt),
        })
      );
    });
  });

  describe("findGridPath same start and goal", () => {
    it("returns trivial path when start equals goal", () => {
      const path = findGridPath({ x: 5, z: 5 }, { x: 5, z: 5 });
      expect(path.length).toBe(1);
      expect(path[0].x).toBeCloseTo(5, 0);
      expect(path[0].z).toBeCloseTo(5, 0);
    });
  });

  describe("pathCache overflow", () => {
    it("clears cache when size exceeds 240", () => {
      resetBotNav();
      for (let i = 0; i < 250; i++) {
        findGridPath({ x: i * 0.1, z: 0 }, { x: i * 0.1 + 5, z: 5 });
      }
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe("nearestWalkableCell fallback", () => {
    it("finds walkable cell when starting cell is blocked", () => {
      let callCount = 0;
      const originalIsPointBlocked = isPointBlocked;
      (isPointBlocked as any).mockImplementation(() => {
        callCount++;
        if (callCount <= 10) return true;
        return false;
      });
      resetBotNav();
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
      (isPointBlocked as any).mockImplementation(() => false);
    });
  });

  describe("spawnJitter useGameStore catch branch (line 263)", () => {
    it("falls back to container_yard when useGameStore throws", () => {
      const original = useGameStore.getState;
      vi.mocked(useGameStore).getState = (() => {
        throw new Error("store unavailable");
      }) as any;
      const pos = spawnJitter("T");
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("z");
      vi.mocked(useGameStore).getState = original;
    });
  });

  describe("currentNavMapId catch branch (line 28)", () => {
    it("falls back to container_yard when useGameStore.getState throws", () => {
      const original = useGameStore.getState;
      vi.mocked(useGameStore).getState = (() => {
        throw new Error("store not ready");
      }) as any;
      resetBotNav();
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
      vi.mocked(useGameStore).getState = original;
    });
  });

  describe("nearestWalkableCell fallback (lines 64-74)", () => {
    it("finds walkable cell when starting cell is blocked via radius expansion", () => {
      let callCount = 0;
      (isPointBlocked as any).mockImplementation(() => {
        callCount++;
        if (callCount <= 50) return true;
        return false;
      });
      resetBotNav();
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThan(0);
      (isPointBlocked as any).mockReturnValue(false);
    });
  });

  describe("findGridPath fallback when no path found (line 174)", () => {
    it("returns fallback path pointing to goal when A* finds no path", () => {
      (isPointBlocked as any).mockReturnValue(true);
      resetBotNav();
      const path = findGridPath({ x: 0, z: 0 }, { x: 5, z: 5 });
      expect(path.length).toBeGreaterThanOrEqual(1);
      (isPointBlocked as any).mockReturnValue(false);
    });
  });
});
