import { describe, it, expect } from "vitest";
import {
  hordeSeparation,
  hordeSeparationFromIds,
  chaseStep,
  SURVIVAL_HORDE_SEP,
  L4D_HORDE_SEP,
} from "../../../client/src/game/zombie/hordeMovement";
import type { HordeAgent } from "../../../client/src/game/zombie/hordeMovement";

describe("hordeMovement", () => {
  describe("hordeSeparation", () => {
    it("returns zero when no neighbors", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparation(self, [], 2, 3);
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("pushes apart when agents are close", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const neighbor: HordeAgent = { id: "b", x: 1, z: 0 };
      const sep = hordeSeparation(self, [neighbor], 2, 3);
      expect(Math.abs(sep.x)).toBeGreaterThan(0);
    });

    it("does not push when agents are far", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const neighbor: HordeAgent = { id: "b", x: 10, z: 10 };
      const sep = hordeSeparation(self, [neighbor], 2, 3);
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("ignores self", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparation(self, [self], 2, 3);
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("pushes in z direction for neighbor above", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const neighbor: HordeAgent = { id: "b", x: 0, z: 1 };
      const sep = hordeSeparation(self, [neighbor], 2, 3);
      expect(sep.z).toBeLessThan(0);
      expect(sep.x).toBeCloseTo(0);
    });

    it("accumulates push from multiple close neighbors", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const n1: HordeAgent = { id: "b", x: 0.5, z: 0 };
      const n2: HordeAgent = { id: "c", x: -0.5, z: 0 };
      const sep = hordeSeparation(self, [n1, n2], 2, 3);
      expect(sep.x).toBeCloseTo(0, 5);
      expect(Math.abs(sep.z)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("hordeSeparationFromIds", () => {
    it("returns zero when ids iterable is empty", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparationFromIds(self, [], () => undefined, 2, 3);
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("filters out dead agents (getAgent returns undefined)", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparationFromIds(
        self,
        ["dead1", "dead2"],
        () => undefined,
        2,
        3,
      );
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("filters out dead agents (getAgent returns null)", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparationFromIds(
        self,
        ["dead1"],
        () => null,
        2,
        3,
      );
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });

    it("pushes apart when valid agent is close", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const neighbor: HordeAgent = { id: "b", x: 1, z: 0 };
      const sep = hordeSeparationFromIds(
        self,
        ["b"],
        (id) => (id === "b" ? neighbor : undefined),
        2,
        3,
      );
      expect(Math.abs(sep.x)).toBeGreaterThan(0);
    });

    it("mixes valid and dead agents", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const neighbor: HordeAgent = { id: "b", x: 1, z: 0 };
      const sep = hordeSeparationFromIds(
        self,
        ["dead", "b", "also_dead"],
        (id) => (id === "b" ? neighbor : undefined),
        2,
        3,
      );
      expect(Math.abs(sep.x)).toBeGreaterThan(0);
    });

    it("ignores self even if present in ids", () => {
      const self: HordeAgent = { id: "a", x: 0, z: 0 };
      const sep = hordeSeparationFromIds(
        self,
        ["a"],
        (id) => (id === "a" ? self : undefined),
        2,
        3,
      );
      expect(sep.x).toBe(0);
      expect(sep.z).toBe(0);
    });
  });

  describe("chaseStep", () => {
    it("returns self position when dist < 0.1", () => {
      const result = chaseStep(
        { x: 0, z: 0 },
        { x: 0.05, z: 0.05 },
        5,
        { x: 0, z: 0 },
        0.016
      );
      expect(result.x).toBe(0);
      expect(result.z).toBe(0);
      expect(result.dist).toBeLessThan(0.1);
    });

    it("returns self position when target is at same position", () => {
      const result = chaseStep(
        { x: 5, z: 3 },
        { x: 5, z: 3 },
        5,
        { x: 0, z: 0 },
        0.016
      );
      expect(result.x).toBe(5);
      expect(result.z).toBe(3);
      expect(result.dist).toBe(0);
    });

    it("returns self position when dist is exactly 0", () => {
      const result = chaseStep(
        { x: -10, z: 20 },
        { x: -10, z: 20 },
        10,
        { x: 1, z: 1 },
        1
      );
      expect(result.x).toBe(-10);
      expect(result.z).toBe(20);
    });

    it("moves toward target with normal movement", () => {
      const result = chaseStep(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        5,
        { x: 0, z: 0 },
        1
      );
      expect(result.x).toBeGreaterThan(0);
      expect(result.z).toBeCloseTo(0, 1);
      expect(result.dist).toBeCloseTo(10);
    });

    it("includes separation in movement", () => {
      const without = chaseStep(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        5,
        { x: 0, z: 0 },
        1
      );
      const withSep = chaseStep(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        5,
        { x: 2, z: 0 },
        1
      );
      expect(withSep.x).toBeGreaterThan(without.x);
    });

    it("separation affects z component", () => {
      const result = chaseStep(
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        5,
        { x: 0, z: 3 },
        1
      );
      expect(result.z).toBeCloseTo(3, 1);
    });

    it("small dt limits movement", () => {
      const result = chaseStep(
        { x: 0, z: 0 },
        { x: 100, z: 0 },
        5,
        { x: 0, z: 0 },
        0.001
      );
      expect(result.x).toBeCloseTo(0.005, 4);
    });

    it("returns correct rotationY", () => {
      const result = chaseStep(
        { x: 0, z: 0 },
        { x: 0, z: 10 },
        5,
        { x: 0, z: 0 },
        1
      );
      expect(result.rotationY).toBeCloseTo(Math.atan2(0, 10));
    });
  });

  it("SURVIVAL_HORDE_SEP has correct shape", () => {
    expect(SURVIVAL_HORDE_SEP).toHaveProperty("queryRadius");
    expect(SURVIVAL_HORDE_SEP).toHaveProperty("radius");
    expect(SURVIVAL_HORDE_SEP).toHaveProperty("strength");
  });

  it("L4D_HORDE_SEP has correct shape", () => {
    expect(L4D_HORDE_SEP).toHaveProperty("queryRadius");
    expect(L4D_HORDE_SEP).toHaveProperty("radius");
    expect(L4D_HORDE_SEP).toHaveProperty("strength");
  });
});
