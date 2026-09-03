import { describe, it, expect } from "vitest";
import { createRng, pick, randRange, randInt } from "@cs-game/shared/proceduralRng";

describe("proceduralRng", () => {
  it("is deterministic for the same seed", () => {
    const rng1 = createRng(999);
    const rng2 = createRng(999);
    expect(Array.from({ length: 20 }, () => rng1())).toEqual(Array.from({ length: 20 }, () => rng2()));
  });

  it("returns values in [0, 1)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pick returns an element from the array", () => {
    const rng = createRng(42);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pick(arr, rng));
    }
  });

  it("randRange stays in [min, max)", () => {
    const rng = createRng(50);
    for (let i = 0; i < 40; i++) {
      const v = randRange(rng, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it("randInt stays in [min, max]", () => {
    const rng = createRng(60);
    for (let i = 0; i < 40; i++) {
      const v = randInt(rng, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
