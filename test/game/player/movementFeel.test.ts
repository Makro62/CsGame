import { describe, it, expect } from "vitest";
import { resolveMoveSpeed, isSprinting, stepMoveVelocity } from "../../../client/src/game/player/movementFeel";

describe("movementFeel", () => {
  describe("resolveMoveSpeed", () => {
    it("returns crouchSpeed when crouching", () => {
      const r = resolveMoveSpeed({
        walkSpeed: 5,
        sprintSpeed: 7.5,
        crouchSpeed: 2.5,
        sprinting: true,
        crouching: true,
        aiming: false,
      });
      expect(r).toBe(2.5);
    });

    it("returns reduced speed when aiming", () => {
      const r = resolveMoveSpeed({
        walkSpeed: 5,
        sprintSpeed: 7.5,
        crouchSpeed: 2.5,
        sprinting: false,
        crouching: false,
        aiming: true,
      });
      expect(r).toBeCloseTo(5 * 0.68, 2);
    });

    it("returns sprintSpeed when sprinting", () => {
      const r = resolveMoveSpeed({
        walkSpeed: 5,
        sprintSpeed: 7.5,
        crouchSpeed: 2.5,
        sprinting: true,
        crouching: false,
        aiming: false,
      });
      expect(r).toBe(7.5);
    });

    it("returns walkSpeed by default", () => {
      const r = resolveMoveSpeed({
        walkSpeed: 5,
        sprintSpeed: 7.5,
        crouchSpeed: 2.5,
        sprinting: false,
        crouching: false,
        aiming: false,
      });
      expect(r).toBe(5);
    });

    it("slows crouch speed while aiming", () => {
      const r = resolveMoveSpeed({
        walkSpeed: 5,
        sprintSpeed: 7.5,
        crouchSpeed: 2.5,
        sprinting: false,
        crouching: true,
        aiming: true,
      });
      expect(r).toBeCloseTo(2.5 * 0.68, 2);
    });
  });

  describe("isSprinting", () => {
    it("returns true when sprint held, moving, not aiming, not crouching", () => {
      expect(isSprinting(true, true, false, false)).toBe(true);
    });

    it("returns false when aiming", () => {
      expect(isSprinting(true, true, true, false)).toBe(false);
    });

    it("returns false when crouching", () => {
      expect(isSprinting(true, true, false, true)).toBe(false);
    });

    it("returns false when not moving", () => {
      expect(isSprinting(true, false, false, false)).toBe(false);
    });

    it("returns false when sprint not held", () => {
      expect(isSprinting(false, true, false, false)).toBe(false);
    });
  });

  describe("stepMoveVelocity", () => {
    it("moves toward desired direction", () => {
      const r = stepMoveVelocity(0, 0, 5, 0, 1, true, false);
      expect(r.x).toBeGreaterThan(0);
    });

    it("returns near zero when no input", () => {
      const r = stepMoveVelocity(0, 0, 0, 0, 1, true, false);
      expect(Math.abs(r.x)).toBeLessThan(0.1);
      expect(Math.abs(r.z)).toBeLessThan(0.1);
    });

    it("returns zero for tiny velocity", () => {
      const r = stepMoveVelocity(0.01, 0.01, 0.01, 0.01, 1, true, false);
      expect(r.x).toBe(0);
      expect(r.z).toBe(0);
    });

    it("airborne has different accel", () => {
      const grounded = stepMoveVelocity(0, 0, 5, 0, 1, true, false);
      const airborne = stepMoveVelocity(0, 0, 5, 0, 1, false, false);
      expect(grounded.x).not.toBe(airborne.x);
    });

    it("tactical mode has different accel", () => {
      const normal = stepMoveVelocity(0, 0, 5, 0, 1, true, false);
      const tactical = stepMoveVelocity(0, 0, 5, 0, 1, true, true);
      expect(normal.x).not.toBe(tactical.x);
    });

    it("stepMoveVelocity decelerates toward zero when input is zero", () => {
      const r = stepMoveVelocity(3, 3, 0, 0, 1, true, false);
      expect(Math.abs(r.x)).toBeLessThan(Math.abs(3));
      expect(Math.abs(r.z)).toBeLessThan(Math.abs(3));
    });

    it("stepMoveVelocity with high speed reaches near desired", () => {
      const r = stepMoveVelocity(0, 0, 10, 10, 1, true, false);
      expect(r.x).toBeGreaterThan(0);
      expect(r.z).toBeGreaterThan(0);
    });
  });
});
