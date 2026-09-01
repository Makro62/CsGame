import { describe, it, expect } from "vitest";
import { nextWaypointIndex, isInFov, fireIntervalMs } from "@src/game/offline/offlineCombat";

describe("nextWaypointIndex edge cases (P0 fix)", () => {
  it("returns 0 for empty path", () => {
    expect(nextWaypointIndex({ x: 0, z: 0 }, [], 0)).toBe(0);
    expect(nextWaypointIndex({ x: 0, z: 0 }, [], 5)).toBe(0);
  });

  it("returns 0 for NaN index", () => {
    const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
    expect(nextWaypointIndex({ x: 0, z: 0 }, path, NaN)).toBe(0);
    expect(nextWaypointIndex({ x: 0, z: 0 }, path, Infinity)).toBe(0);
  });

  it("clamps out-of-range index", () => {
    const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }];
    // pos far from waypoint 0 so no auto-advance
    expect(nextWaypointIndex({ x: 50, z: 50 }, path, 999)).toBe(1);
    expect(nextWaypointIndex({ x: 50, z: 50 }, path, -5)).toBe(0);
  });
});

describe("isInFov edge cases (P1 fix)", () => {
  it("returns false for NaN rotation", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: NaN }, { x: 10, z: 0 })).toBe(false);
  });

  it("returns false for NaN fov", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 }, NaN)).toBe(false);
  });

  it("returns false for zero/negative fov", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 }, 0)).toBe(false);
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 }, -1)).toBe(false);
  });

  it("returns true for 360-degree fov", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: -10 }, Math.PI * 2)).toBe(true);
  });

  it("still works for normal case after guard", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 })).toBe(true);
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: -10 })).toBe(false);
  });
});

describe("fireIntervalMs edge cases (P1 fix)", () => {
  it("returns 1000 for NaN fireRate", () => {
    expect(fireIntervalMs("ak47", NaN)).toBe(1000);
  });

  it("returns 1000 for Infinity fireRate", () => {
    // Infinity is not finite -> guard returns 1000
    expect(fireIntervalMs("ak47", Infinity)).toBe(1000);
  });

  it("returns 1000 for negative fireRate", () => {
    expect(fireIntervalMs("ak47", -5)).toBe(1000);
  });

  it("awp still 1400 even with NaN guard", () => {
    expect(fireIntervalMs("awp", 10)).toBe(1400);
    expect(fireIntervalMs("awp", NaN)).toBe(1000); // guard before awp check? check impl
  });
});
