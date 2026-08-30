import { describe, expect, it } from "vitest";
import { arcadeScreenMove } from "./arcadeScreenMove";

describe("arcadeScreenMove", () => {
  it("W moves up on screen (-Z)", () => {
    expect(arcadeScreenMove(true, false, false, false)).toEqual({ x: 0, z: -1 });
  });
  it("S moves down on screen (+Z)", () => {
    expect(arcadeScreenMove(false, true, false, false)).toEqual({ x: 0, z: 1 });
  });
  it("A moves left (-X)", () => {
    expect(arcadeScreenMove(false, false, true, false)).toEqual({ x: -1, z: 0 });
  });
  it("D moves right (+X)", () => {
    expect(arcadeScreenMove(false, false, false, true)).toEqual({ x: 1, z: 0 });
  });
  it("normalizes diagonals", () => {
    const m = arcadeScreenMove(true, false, true, false);
    expect(m.x).toBeCloseTo(-Math.SQRT1_2);
    expect(m.z).toBeCloseTo(-Math.SQRT1_2);
  });
});
