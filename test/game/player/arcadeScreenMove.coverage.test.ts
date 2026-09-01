import { describe, it, expect } from "vitest";
import { arcadeScreenMove } from "@src/game/player/arcadeScreenMove";

describe("arcadeScreenMove — full directional coverage", () => {
  it("no input returns zero", () => {
    expect(arcadeScreenMove(false, false, false, false)).toEqual({ x: 0, z: 0 });
  });

  it("W alone = -Z", () => {
    const r = arcadeScreenMove(true, false, false, false);
    expect(r.x).toBe(0);
    expect(r.z).toBe(-1);
  });

  it("S alone = +Z", () => {
    expect(arcadeScreenMove(false, true, false, false)).toEqual({ x: 0, z: 1 });
  });

  it("A alone = -X", () => {
    expect(arcadeScreenMove(false, false, true, false)).toEqual({ x: -1, z: 0 });
  });

  it("D alone = +X", () => {
    expect(arcadeScreenMove(false, false, false, true)).toEqual({ x: 1, z: 0 });
  });

  it("W+S cancel", () => {
    expect(arcadeScreenMove(true, true, false, false)).toEqual({ x: 0, z: 0 });
  });

  it("A+D cancel", () => {
    expect(arcadeScreenMove(false, false, true, true)).toEqual({ x: 0, z: 0 });
  });

  it("all four cancel", () => {
    expect(arcadeScreenMove(true, true, true, true)).toEqual({ x: 0, z: 0 });
  });

  it("diagonal W+A normalized to length 1", () => {
    const r = arcadeScreenMove(true, false, true, false);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(1);
    expect(r.x).toBeLessThan(0);
    expect(r.z).toBeLessThan(0);
  });

  it("diagonal S+D normalized", () => {
    const r = arcadeScreenMove(false, true, false, true);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(1);
  });

  it("W+D diagonal", () => {
    const r = arcadeScreenMove(true, false, false, true);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(1);
  });

  it("S+A diagonal", () => {
    const r = arcadeScreenMove(false, true, true, false);
    expect(Math.hypot(r.x, r.z)).toBeCloseTo(1);
  });
});
