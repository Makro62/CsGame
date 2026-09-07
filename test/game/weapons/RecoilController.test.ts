import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RecoilController, getMovementState, getSpreadRadius } from "../../../client/src/game/weapons/RecoilController";

describe("RecoilController", () => {
  let controller: RecoilController;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(1000);
    controller = new RecoilController("ak47");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns offset on fire", () => {
    const result = controller.fire();
    expect(result.offsetX).toBeDefined();
    expect(result.offsetY).toBeDefined();
  });

  it("returns zero for knife (no recoil)", () => {
    const knife = new RecoilController("knife");
    const result = knife.fire();
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it("advances through pattern", () => {
    const first = controller.fire();
    vi.setSystemTime(1020);
    const second = controller.fire();
    expect(first).not.toEqual(second);
  });

  it("resets after 260ms gap", () => {
    controller.fire();
    vi.setSystemTime(1300);
    controller.update(0.1);
    vi.setSystemTime(1301);
    const result = controller.fire();
    expect(result.offsetY).toBeGreaterThan(0);
  });

  it("reset() clears state", () => {
    controller.fire();
    controller.reset();
    const after = controller.update(0.016);
    expect(after.offsetX).toBe(0);
    expect(after.offsetY).toBe(0);
  });

  it("returns zero for combatknife", () => {
    const knife = new RecoilController("combatknife");
    const result = knife.fire();
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it("unknown weapon falls back to ak47 pattern", () => {
    const unknown = new RecoilController("unknown_weapon");
    const result = unknown.fire();
    expect(result.offsetY).toBeGreaterThan(0);
  });

  it("bulletsFired resets after >260ms gap so fire starts from beginning", () => {
    controller.fire();
    vi.advanceTimersByTime(20);
    controller.fire();
    vi.advanceTimersByTime(20);
    controller.fire();
    vi.setSystemTime(1400);
    controller.update(0.1);
    vi.setSystemTime(1401);
    const result = controller.fire();
    expect(result.offsetY).toBe(0.008);
  });

  it("fire with knife returns zero offsets (empty pattern)", () => {
    const knife = new RecoilController("knife");
    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(1000 + i * 20);
      const r = knife.fire();
      expect(r.offsetX).toBe(0);
      expect(r.offsetY).toBe(0);
    }
  });

  it("update recovery lerps offset back toward 0,0 after >260ms", () => {
    controller.fire();
    vi.advanceTimersByTime(20);
    controller.fire();
    vi.advanceTimersByTime(20);
    controller.fire();
    expect(controller.update(0).offsetY).toBeGreaterThan(0);
    vi.setSystemTime(1400);
    const after = controller.update(0.5);
    expect(after.offsetY).toBeLessThanOrEqual(0.02);
    expect(after.offsetY).toBeGreaterThanOrEqual(0);
  });

  it("update does not recover during active burst (<=260ms)", () => {
    controller.fire();
    vi.setSystemTime(1020);
    controller.fire();
    vi.setSystemTime(1040);
    const mid = controller.update(0.016);
    expect(mid.offsetY).toBeGreaterThan(0);
  });
});

describe("getMovementState", () => {
  it("returns idle for null input", () => {
    expect(getMovementState(null)).toBe("idle");
  });

  it("returns airborne when airborne", () => {
    expect(
      getMovementState({
        forward: true,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        slide: false,
        airborne: true,
      })
    ).toBe("airborne");
  });

  it("returns slide when sliding", () => {
    expect(
      getMovementState({
        forward: true,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        slide: true,
        airborne: false,
      })
    ).toBe("slide");
  });

  it("returns sprint when sprinting and moving", () => {
    expect(
      getMovementState({
        forward: true,
        backward: false,
        left: false,
        right: false,
        sprint: true,
        slide: false,
        airborne: false,
      })
    ).toBe("sprint");
  });

  it("returns walk when moving", () => {
    expect(
      getMovementState({
        forward: true,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        slide: false,
        airborne: false,
      })
    ).toBe("walk");
  });

  it("returns idle when not moving", () => {
    expect(
      getMovementState({
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        slide: false,
        airborne: false,
      })
    ).toBe("idle");
  });

  it("returns walk when backward only", () => {
    expect(
      getMovementState({
        forward: false,
        backward: true,
        left: false,
        right: false,
        sprint: false,
        slide: false,
        airborne: false,
      })
    ).toBe("walk");
  });

  it("returns walk when left only", () => {
    expect(
      getMovementState({
        forward: false,
        backward: false,
        left: true,
        right: false,
        sprint: false,
        slide: false,
        airborne: false,
      })
    ).toBe("walk");
  });
});

describe("getSpreadRadius", () => {
  it("returns 0 for knife", () => {
    expect(getSpreadRadius("knife", "idle", false, 0)).toBe(0);
  });

  it("returns 0 for combatknife", () => {
    expect(getSpreadRadius("combatknife", "idle", false, 0)).toBe(0);
  });

  it("returns 0 for AWP when ADS", () => {
    expect(getSpreadRadius("awp", "idle", true, 0)).toBe(0);
  });

  it("increases with movement state severity", () => {
    const idle = getSpreadRadius("ak47", "idle", false, 0);
    const walk = getSpreadRadius("ak47", "walk", false, 0);
    const sprint = getSpreadRadius("ak47", "sprint", false, 0);
    expect(walk).toBeGreaterThan(idle);
    expect(sprint).toBeGreaterThan(walk);
  });

  it("reduces spread when ADS", () => {
    const hipfire = getSpreadRadius("ak47", "idle", false, 0);
    const ads = getSpreadRadius("ak47", "idle", true, 0);
    expect(ads).toBeLessThan(hipfire);
  });

  it("increases with spray count", () => {
    const base = getSpreadRadius("ak47", "idle", false, 0);
    const sprayed = getSpreadRadius("ak47", "idle", false, 10);
    expect(sprayed).toBeGreaterThan(base);
  });

  it("unknown weapon returns default base spread", () => {
    const spread = getSpreadRadius("unknown", "idle", false, 0);
    expect(spread).toBeGreaterThan(0);
  });

  it("AWP non-ADS returns positive spread", () => {
    const spread = getSpreadRadius("awp", "idle", false, 0);
    expect(spread).toBeGreaterThan(0);
  });
});
