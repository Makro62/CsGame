import { describe, it, expect } from "vitest";
import { ZombieDOTSystem } from "./ZombieDOTSystem";

describe("ZombieDOTSystem", () => {
  it("adds and ticks DOT damage per frame without memory leak", () => {
    const dotSys = new ZombieDOTSystem();
    dotSys.add(10, 1000); // 10 dps for 1000ms
    expect(dotSys.count).toBe(1);

    let totalDamage = 0;
    dotSys.update(0.5, (dmg) => {
      totalDamage += dmg;
    });

    expect(totalDamage).toBeCloseTo(5, 1);
    expect(dotSys.count).toBe(1);

    // Tick remaining 0.5s
    dotSys.update(0.5, (dmg) => {
      totalDamage += dmg;
    });

    expect(totalDamage).toBeCloseTo(10, 1);
    // After expiry, should be removed
    expect(dotSys.count).toBe(0);
  });

  it("clears all active dots on clear", () => {
    const dotSys = new ZombieDOTSystem();
    dotSys.add(5, 3000);
    dotSys.add(10, 2000);
    expect(dotSys.count).toBe(2);
    dotSys.clear();
    expect(dotSys.count).toBe(0);
  });
});
