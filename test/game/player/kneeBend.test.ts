import { describe, it, expect } from "vitest";
import { crouchLegAngles } from "../../../client/src/game/player/kneeBend";

describe("crouchLegAngles", () => {
  it("returns zero bend for zero drop", () => {
    const bend = crouchLegAngles(0.32, 0.32, 0);
    expect(bend.thigh).toBeCloseTo(0, 5);
    expect(bend.knee).toBeCloseTo(0, 5);
  });

  it("matches the MinecraftCharacter crouch pose (0.32/0.32/0.25)", () => {
    const bend = crouchLegAngles(0.32, 0.32, 0.25);
    expect(bend.thigh).toBeCloseTo(-0.9155, 3);
    expect(bend.knee).toBeCloseTo(1.831, 3);
  });

  it("matches the bot plant pose (0.32/0.29/0.22)", () => {
    const bend = crouchLegAngles(0.32, 0.29, 0.22);
    expect(bend.thigh).toBeCloseTo(-0.8194, 3);
    expect(bend.knee).toBeCloseTo(1.7572, 3);
  });

  it("keeps hip-to-foot vertical extent equal to thigh+shin-drop", () => {
    const thigh = 0.32;
    const shin = 0.36;
    const drop = 0.25;
    const { thigh: a, knee: k } = crouchLegAngles(thigh, shin, drop);
    const thighAngle = -a;
    const shinAngle = a + k;
    const extent = thigh * Math.cos(thighAngle) + shin * Math.cos(shinAngle);
    expect(extent).toBeCloseTo(thigh + shin - drop, 5);
  });

  it("thigh rotation is always negative (leg bends backward)", () => {
    expect(crouchLegAngles(0.3, 0.3, 0.2).thigh).toBeLessThan(0);
    expect(crouchLegAngles(0.3, 0.3, 0.2).knee).toBeGreaterThan(0);
  });

  it("clamps instead of producing NaN when drop exceeds leg length", () => {
    const bend = crouchLegAngles(0.32, 0.32, 1);
    expect(Number.isFinite(bend.thigh)).toBe(true);
    expect(Number.isFinite(bend.knee)).toBe(true);
  });
});
