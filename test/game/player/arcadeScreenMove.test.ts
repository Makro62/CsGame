import { describe, it, expect } from "vitest";
import { arcadeScreenMove } from "../../../client/src/game/player/arcadeScreenMove";

describe("arcadeScreenMove", () => {
  it("forward only: z = -1", () => {
    const r = arcadeScreenMove(true, false, false, false);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.z).toBeCloseTo(-1, 5);
  });

  it("backward only: z = +1", () => {
    const r = arcadeScreenMove(false, true, false, false);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.z).toBeCloseTo(1, 5);
  });

  it("left only: x = -1", () => {
    const r = arcadeScreenMove(false, false, true, false);
    expect(r.x).toBeCloseTo(-1, 5);
    expect(r.z).toBeCloseTo(0, 5);
  });

  it("right only: x = +1", () => {
    const r = arcadeScreenMove(false, false, false, true);
    expect(r.x).toBeCloseTo(1, 5);
    expect(r.z).toBeCloseTo(0, 5);
  });

  it("diagonal is normalized", () => {
    const r = arcadeScreenMove(true, false, false, true);
    const len = Math.hypot(r.x, r.z);
    expect(len).toBeCloseTo(1, 5);
  });

  it("no input returns zero", () => {
    const r = arcadeScreenMove(false, false, false, false);
    expect(r.x).toBe(0);
    expect(r.z).toBe(0);
  });

  it("opposite directions cancel", () => {
    const r = arcadeScreenMove(true, true, false, false);
    expect(r.x).toBe(0);
    expect(r.z).toBe(0);
  });
});
