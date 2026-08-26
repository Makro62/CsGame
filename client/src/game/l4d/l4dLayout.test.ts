import { describe, expect, it } from "vitest";
import { clampL4DInfected, pickL4DSpawn, L4D_SAFE_Z, L4D_FINISH_Z } from "./l4dLayout";

describe("clampL4DInfected", () => {
  it("keeps agents inside the hall width", () => {
    const p = clampL4DInfected(8, -18);
    expect(Math.abs(p.x)).toBeLessThanOrEqual(1.7);
  });
  it("allows the side room", () => {
    const p = clampL4DInfected(8, 8);
    expect(p.x).toBeGreaterThan(2);
    expect(p.x).toBeLessThanOrEqual(14.4);
  });
  it("blocks the starting safe room", () => {
    const p = clampL4DInfected(0, L4D_SAFE_Z);
    expect(p.z).toBeGreaterThanOrEqual(-26.5);
  });
});

describe("pickL4DSpawn", () => {
  it("never returns the safe room", () => {
    const survivors = [{ x: 0, z: L4D_SAFE_Z + 2 }];
    for (let i = 0; i < 12; i++) {
      const p = pickL4DSpawn(survivors, 8, 30);
      expect(p.z).toBeGreaterThan(-26);
    }
  });
  it("stays on the campaign path", () => {
    const p = pickL4DSpawn([{ x: 0, z: 0 }], 4, 40);
    expect(p.z).toBeLessThan(L4D_FINISH_Z + 8);
  });
});
