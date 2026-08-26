import { describe, expect, it } from "vitest";
import { hordeSeparation, hordeSeparationFromIds, chaseStep } from "./hordeMovement";

describe("hordeSeparation", () => {
  it("pushes two overlapping agents apart", () => {
    const a = { id: "a", x: 0, z: 0 };
    const b = { id: "b", x: 0.5, z: 0 };
    const sep = hordeSeparation(a, [a, b], 1.5, 3);
    expect(sep.x).toBeLessThan(0);
    expect(sep.z).toBeCloseTo(0);
  });

  it("does nothing when agents are farther than radius", () => {
    const a = { id: "a", x: 0, z: 0 };
    const b = { id: "b", x: 10, z: 0 };
    const sep = hordeSeparation(a, [b], 1.5, 3);
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("ignores self id", () => {
    const a = { id: "a", x: 0, z: 0 };
    const sep = hordeSeparation(a, [a], 1.5, 3);
    expect(sep.x).toBe(0);
    expect(sep.z).toBe(0);
  });

  it("resolves the same push from spatial-grid ids", () => {
    const agents = {
      a: { id: "a", x: 0, z: 0 },
      b: { id: "b", x: 0.5, z: 0 },
    };
    const fromList = hordeSeparation(agents.a, Object.values(agents), 1.5, 3);
    const fromIds = hordeSeparationFromIds(
      agents.a,
      Object.keys(agents),
      (id) => agents[id as keyof typeof agents],
      1.5,
      3,
    );
    expect(fromIds.x).toBeCloseTo(fromList.x);
    expect(fromIds.z).toBeCloseTo(fromList.z);
  });
});

describe("chaseStep", () => {
  it("moves toward the target", () => {
    const next = chaseStep({ x: 0, z: 0 }, { x: 10, z: 0 }, 2, { x: 0, z: 0 }, 0.5);
    expect(next.x).toBeCloseTo(1);
    expect(next.z).toBeCloseTo(0);
    expect(next.dist).toBeCloseTo(10);
  });
});
