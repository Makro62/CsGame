import { describe, it, expect } from "vitest";
import { createRng, pick, randRange, randInt } from "../../shared/proceduralRng";

describe("proceduralRng", () => {
  describe("createRng", () => {
    it("returns deterministic sequence for same seed", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      for (let i = 0; i < 100; i++) {
        expect(rng1()).toBe(rng2());
      }
    });

    it("returns different sequences for different seeds", () => {
      const rng1 = createRng(1);
      const rng2 = createRng(2);
      const results1 = Array.from({ length: 10 }, () => rng1());
      const results2 = Array.from({ length: 10 }, () => rng2());
      expect(results1).not.toEqual(results2);
    });

    it("returns values in [0, 1)", () => {
      const rng = createRng(123);
      for (let i = 0; i < 1000; i++) {
        const v = rng();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe("pick", () => {
    it("returns element from array", () => {
      const rng = createRng(42);
      const arr = ["a", "b", "c"];
      for (let i = 0; i < 50; i++) {
        expect(arr).toContain(pick(arr, rng));
      }
    });

    it("returns single element array", () => {
      const rng = createRng(42);
      expect(pick(["only"], rng)).toBe("only");
    });
  });

  describe("randRange", () => {
    it("returns value within range", () => {
      const rng = createRng(42);
      for (let i = 0; i < 100; i++) {
        const v = randRange(rng, 5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
      }
    });
  });

  describe("randInt", () => {
    it("returns integer within range", () => {
      const rng = createRng(42);
      for (let i = 0; i < 100; i++) {
        const v = randInt(rng, 1, 5);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
        expect(Number.isInteger(v)).toBe(true);
      }
    });
  });
});
