import { describe, expect, it } from "vitest";
import { survivalLineOfSight } from "./survivalLayout";

describe("survivalLineOfSight", () => {
  it("crates and barrels block shots", () => {
    expect(survivalLineOfSight(-7.2, -9, -7.2, -5)).toBe(false);
  });
  it("open courtyard stays clear", () => {
    expect(survivalLineOfSight(0, 0, 2, 2)).toBe(true);
  });
});
