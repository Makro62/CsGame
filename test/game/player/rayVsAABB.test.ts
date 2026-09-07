import { describe, it, expect } from "vitest";
import { rayVsAABB } from "../../../client/src/game/player/PlayerController";

describe("rayVsAABB", () => {
  it("detects intersection when box is directly between origin and target", () => {
    const origin = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const box = { minX: 4, maxX: 6, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(true);
  });

  it("returns false when box is beyond the ray target distance (fixes tmin <= len bug)", () => {
    // Distance from origin to target is 10.
    // The box is at x = 15..20 (beyond target).
    // Normalized t = 1.5, which is > 1.0.
    const origin = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const box = { minX: 15, maxX: 20, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(false);
  });

  it("returns false when box is behind origin", () => {
    const origin = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const box = { minX: -10, maxX: -4, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(false);
  });

  it("returns false when ray misses box sideways", () => {
    const origin = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const box = { minX: 4, maxX: 6, minY: 5, maxY: 8, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(false);
  });

  it("returns true when ray origin is inside the box", () => {
    const origin = { x: 5, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const box = { minX: 4, maxX: 6, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(true);
  });

  it("returns false for zero-length ray", () => {
    const origin = { x: 0, y: 0, z: 0 };
    const target = { x: 0, y: 0, z: 0 };
    const box = { minX: 4, maxX: 6, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };

    expect(rayVsAABB(origin, target, box)).toBe(false);
  });
});
