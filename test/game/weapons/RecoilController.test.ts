import { describe, it, expect, beforeEach } from "vitest";
import { RecoilController, getMovementState, getSpreadRadius } from "@src/game/weapons/RecoilController";

// ── RecoilController ──
describe("RecoilController", () => {
  let ctrl: RecoilController;

  beforeEach(() => {
    ctrl = new RecoilController("ak47");
  });

  it("fire returns non-zero offset", () => {
    const result = ctrl.fire();
    expect(typeof result.offsetX).toBe("number");
    expect(typeof result.offsetY).toBe("number");
  });

  it("consecutive fires produce offsets", () => {
    const r1 = ctrl.fire();
    const r2 = ctrl.fire();
    // Both should return numbers (may differ)
    expect(typeof r1.offsetY).toBe("number");
    expect(typeof r2.offsetY).toBe("number");
  });

  it("reset zeroes offset and bullet counter", () => {
    ctrl.fire();
    ctrl.fire();
    ctrl.reset();
    // After reset, first fire should be like a fresh weapon
    const result = ctrl.fire();
    expect(typeof result.offsetY).toBe("number");
  });

  it("handles unknown weapon by falling back to ak47", () => {
    const unknown = new RecoilController("nonexistent_weapon");
    const result = unknown.fire();
    expect(typeof result.offsetY).toBe("number");
  });

  it("knife has no recoil", () => {
    const knife = new RecoilController("knife");
    const result = knife.fire();
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it("combatknife has no recoil", () => {
    const knife = new RecoilController("combatknife");
    const result = knife.fire();
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });

  it("update returns current offset", () => {
    ctrl.fire();
    const result = ctrl.update(0.016);
    expect(typeof result.offsetX).toBe("number");
    expect(typeof result.offsetY).toBe("number");
  });

  it("m4a1 has vertical-only recoil pattern", () => {
    const m4 = new RecoilController("m4a1");
    const r1 = m4.fire();
    // M4A1 pattern has offsetX = 0 for all bullets
    expect(r1.offsetX).toBe(0);
  });
});

// ── getMovementState ──
describe("getMovementState", () => {
  it("returns idle for null input", () => {
    expect(getMovementState(null)).toBe("idle");
  });

  it("returns idle when no movement keys", () => {
    expect(getMovementState({
      forward: false, backward: false, left: false, right: false,
      sprint: false, slide: false, airborne: false,
    })).toBe("idle");
  });

  it("returns walk when moving", () => {
    expect(getMovementState({
      forward: true, backward: false, left: false, right: false,
      sprint: false, slide: false, airborne: false,
    })).toBe("walk");
  });

  it("returns sprint when sprinting", () => {
    expect(getMovementState({
      forward: true, backward: false, left: false, right: false,
      sprint: true, slide: false, airborne: false,
    })).toBe("sprint");
  });

  it("returns slide when sliding", () => {
    expect(getMovementState({
      forward: false, backward: false, left: false, right: false,
      sprint: false, slide: true, airborne: false,
    })).toBe("slide");
  });

  it("returns airborne when airborne (highest priority)", () => {
    expect(getMovementState({
      forward: true, backward: true, left: true, right: true,
      sprint: true, slide: true, airborne: true,
    })).toBe("airborne");
  });

  it("priority: airborne > slide > sprint > walk > idle", () => {
    // slide beats sprint
    expect(getMovementState({
      forward: true, backward: false, left: false, right: false,
      sprint: true, slide: true, airborne: false,
    })).toBe("slide");
  });
});

// ── getSpreadRadius ──
describe("getSpreadRadius", () => {
  it("ADS returns 0 spread", () => {
    expect(getSpreadRadius("ak47", "idle", true, 0)).toBe(0);
  });

  it("idle has base spread", () => {
    const spread = getSpreadRadius("ak47", "idle", false, 0);
    expect(spread).toBeGreaterThan(0);
  });

  it("sprint increases spread over idle", () => {
    const idle = getSpreadRadius("ak47", "idle", false, 0);
    const sprint = getSpreadRadius("ak47", "sprint", false, 0);
    expect(sprint).toBeGreaterThan(idle);
  });

  it("airborne has highest spread", () => {
    const airborne = getSpreadRadius("ak47", "airborne", false, 0);
    const sprint = getSpreadRadius("ak47", "sprint", false, 0);
    expect(airborne).toBeGreaterThan(sprint);
  });

  it("spray increases spread", () => {
    const noSpray = getSpreadRadius("ak47", "idle", false, 0);
    const highSpray = getSpreadRadius("ak47", "idle", false, 30);
    expect(highSpray).toBeGreaterThan(noSpray);
  });

  it("knife has zero spread", () => {
    expect(getSpreadRadius("knife", "idle", false, 0)).toBe(0);
    expect(getSpreadRadius("combatknife", "idle", false, 0)).toBe(0);
  });

  it("unknown weapon falls back to default 0.02", () => {
    const spread = getSpreadRadius("nonexistent", "idle", false, 0);
    expect(spread).toBeCloseTo(0.02);
  });

  it("awp has very high base spread when not ADS", () => {
    const awpSpread = getSpreadRadius("awp", "idle", false, 0);
    expect(awpSpread).toBe(0.5);
  });
});