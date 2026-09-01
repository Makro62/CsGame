import { describe, it, expect } from "vitest";
import { ZombieDOTSystem } from "@src/game/zombie/ZombieDOTSystem";

describe("ZombieDOTSystem", () => {
  it("applies damage over time", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000); // 10 dps for 1 second
    let totalDmg = 0;
    dot.update(0.1, (d) => (totalDmg += d));
    expect(totalDmg).toBeCloseTo(1); // 10 * 0.1
  });

  it("removes expired DOT", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 500); // 10 dps for 0.5 seconds
    expect(dot.count).toBe(1);
    dot.update(1, () => {});
    expect(dot.count).toBe(0);
  });

  it("multiple DOTs stack independently", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    dot.add(20, 500);
    expect(dot.count).toBe(2);
    let totalDmg = 0;
    dot.update(0.1, (d) => (totalDmg += d));
    expect(totalDmg).toBeCloseTo(3); // (10+20) * 0.1
  });

  it("clear removes all DOTs", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    dot.add(20, 1000);
    dot.clear();
    expect(dot.count).toBe(0);
  });

  it("does not apply damage when no DOTs active", () => {
    const dot = new ZombieDOTSystem();
    let called = false;
    dot.update(0.1, () => { called = true; });
    expect(called).toBe(false);
  });

  it("BUG FIX: DOT expiring mid-tick only deals damage for remaining time", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 100); // 10 dps for 100ms only
    let totalDmg = 0;
    dot.update(0.5, (d) => (totalDmg += d)); // dt=500ms, but DOT only lasts 100ms
    // Should deal 10 * (100/1000) = 1 damage, not 10 * 0.5 = 5
    expect(totalDmg).toBeCloseTo(1);
    expect(dot.count).toBe(0);
  });

  it("partial tick damage is correct", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 250); // 10 dps for 250ms
    let totalDmg = 0;
    dot.update(0.1, (d) => (totalDmg += d)); // 100ms tick, DOT has 250ms
    expect(totalDmg).toBeCloseTo(1); // 10 * 0.1
    expect(dot.count).toBe(1); // still active
  });

  it("second tick finishes the DOT correctly", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 150); // 10 dps for 150ms
    let totalDmg = 0;
    dot.update(0.1, (d) => (totalDmg += d)); // 100ms, remaining 50ms
    expect(totalDmg).toBeCloseTo(1);
    totalDmg = 0;
    dot.update(0.1, (d) => (totalDmg += d)); // 100ms more, but only 50ms left
    expect(totalDmg).toBeCloseTo(0.5); // 10 * 0.05
    expect(dot.count).toBe(0);
  });

  it("negative dt does not crash", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    let totalDmg = 0;
    dot.update(-0.1, (d) => (totalDmg += d));
    // negative dt means dtMs = -100, actualDtMs = min(-100, 1000) = -100
    // damage = 10 * (-100/1000) = -1
    // remainingMs = 1000 - (-100) = 1100
    expect(typeof totalDmg).toBe("number");
  });

  it("zero dt does not apply damage", () => {
    const dot = new ZombieDOTSystem();
    dot.add(10, 1000);
    let totalDmg = 0;
    dot.update(0, (d) => (totalDmg += d));
    expect(totalDmg).toBe(0);
    expect(dot.count).toBe(1);
  });
});