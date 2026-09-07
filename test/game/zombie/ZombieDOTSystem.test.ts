import { describe, it, expect } from "vitest";
import { ZombieDOTSystem } from "../../../client/src/game/zombie/ZombieDOTSystem";

describe("ZombieDOTSystem", () => {
  it("adds DOT and reports count", () => {
    const dot = new ZombieDOTSystem();
    dot.add(5, 3000);
    expect(dot.count).toBe(1);
  });

  it("applies damage over time", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    const damages: number[] = [];
    dot.update(0.5, (d) => damages.push(d));
    expect(damages.length).toBe(1);
    expect(damages[0]).toBeCloseTo(5, 1);
  });

  it("removes expired DOT", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 100);
    dot.update(0.2, () => {});
    expect(dot.count).toBe(0);
  });

  it("clear removes all DOTs", () => {
    const dot = new ZombieDOTSystem();
    dot.add(5, 3000);
    dot.add(10, 2000);
    dot.clear();
    expect(dot.count).toBe(0);
  });

  it("handles multiple DOTs independently", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    dot.add(20, 500);
    const damages: number[] = [];
    dot.update(0.3, (d) => damages.push(d));
    expect(damages.length).toBe(2);
    expect(damages[0]).toBeCloseTo(6, 0);
    expect(damages[1]).toBeCloseTo(3, 0);
  });

  it("no damage after clear", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    dot.clear();
    const damages: number[] = [];
    dot.update(0.5, (d) => damages.push(d));
    expect(damages).toHaveLength(0);
  });
});
