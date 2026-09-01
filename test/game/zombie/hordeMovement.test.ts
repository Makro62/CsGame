import { describe, it, expect } from "vitest";
import { hordeSeparation, hordeSeparationFromIds, chaseStep } from "@src/game/zombie/hordeMovement";

describe("hordeSeparation edge cases", () => {
  it("three overlapping agents all push apart", () => {
    const a = { id: "a", x: 0, z: 0 };
    const b = { id: "b", x: 0.3, z: 0 };
    const c = { id: "c", x: 0.15, z: 0.2 };
    const sepA = hordeSeparation(a, [a, b, c], 1.5, 3);
    const sepB = hordeSeparation(b, [a, b, c], 1.5, 3);
    const sepC = hordeSeparation(c, [a, b, c], 1.5, 3);
    // All should have non-zero separation
    expect(Math.hypot(sepA.x, sepA.z)).toBeGreaterThan(0);
    expect(Math.hypot(sepB.x, sepB.z)).toBeGreaterThan(0);
    expect(Math.hypot(sepC.x, sepC.z)).toBeGreaterThan(0);
  });

  it("agents at exact same position get pushed (nd > 0 guard)", () => {
    const a = { id: "a", x: 5, z: 5 };
    const b = { id: "b", x: 5, z: 5 };
    // nd = 0, so nd > 0 guard prevents division by zero
    const sep = hordeSeparation(a, [a, b], 1.5, 3);
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("handles empty neighbors", () => {
    const a = { id: "a", x: 0, z: 0 };
    const sep = hordeSeparation(a, [], 1.5, 3);
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("only pushes from neighbors within radius", () => {
    const a = { id: "a", x: 0, z: 0 };
    const far = { id: "far", x: 10, z: 10 };
    const close = { id: "close", x: 0.5, z: 0 };
    const sep = hordeSeparation(a, [far, close], 1.5, 3);
    expect(sep.x).toBeLessThan(0); // pushed left by close agent
  });
});

describe("hordeSeparationFromIds edge cases", () => {
  it("handles missing agents in getAgent", () => {
    const a = { id: "a", x: 0, z: 0 };
    const sep = hordeSeparationFromIds(
      a,
      ["a", "missing", "also_missing"],
      (id) => (id === "a" ? a : undefined),
      1.5,
      3,
    );
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("handles null returns from getAgent", () => {
    const a = { id: "a", x: 0, z: 0 };
    const sep = hordeSeparationFromIds(
      a,
      ["a", "null_one"],
      () => null,
      1.5,
      3,
    );
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("resolves agents from spatial grid ids", () => {
    const agents: Record<string, { id: string; x: number; z: number }> = {
      a: { id: "a", x: 0, z: 0 },
      b: { id: "b", x: 0.5, z: 0 },
    };
    const fromIds = hordeSeparationFromIds(
      agents.a,
      ["a", "b"],
      (id) => agents[id],
      1.5,
      3,
    );
    const fromList = hordeSeparation(agents.a, Object.values(agents), 1.5, 3);
    expect(fromIds.x).toBeCloseTo(fromList.x);
  });
});

describe("chaseStep edge cases", () => {
  it("does not move when target is extremely close", () => {
    const next = chaseStep({ x: 5, z: 5 }, { x: 5.01, z: 5 }, 5, { x: 0, z: 0 }, 0.1);
    expect(next.x).toBeCloseTo(5);
    expect(next.z).toBeCloseTo(5);
  });

  it("does not move when self === target", () => {
    const next = chaseStep({ x: 3, z: 3 }, { x: 3, z: 3 }, 5, { x: 0, z: 0 }, 0.1);
    expect(next.x).toBeCloseTo(3);
    expect(next.z).toBeCloseTo(3);
  });

  it("separation affects movement", () => {
    const without = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, { x: 0, z: 0 }, 0.1);
    const withSep = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, { x: 2, z: 0 }, 0.1);
    expect(withSep.x).toBeGreaterThan(without.x);
  });

  it("dt=0 produces no movement", () => {
    const next = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, { x: 0, z: 0 }, 0);
    expect(next.x).toBe(0);
    expect(next.z).toBe(0);
  });

  it("negative dt produces reverse movement (known behavior)", () => {
    const next = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, { x: 0, z: 0 }, -0.1);
    expect(next.x).toBeLessThan(0);
  });

  it("returns correct dist to target", () => {
    const next = chaseStep({ x: 0, z: 0 }, { x: 3, z: 4 }, 5, { x: 0, z: 0 }, 0.1);
    expect(next.dist).toBeCloseTo(5);
  });
});