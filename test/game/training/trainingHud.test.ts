import { describe, it, expect } from "vitest";
import {
  TRAINING_PANEL_WIDTH,
  TRAINING_PANEL_Z,
  TRAINING_PANEL_ANCHOR,
} from "../../../client/src/game/training/trainingHud";

describe("trainingHud", () => {
  it("TRAINING_PANEL_WIDTH is a reasonable panel size", () => {
    expect(TRAINING_PANEL_WIDTH).toBeGreaterThan(100);
    expect(TRAINING_PANEL_WIDTH).toBeLessThan(500);
  });

  it("TRAINING_PANEL_Z is above HUD but below top nav", () => {
    expect(TRAINING_PANEL_Z).toBeGreaterThan(100);
    expect(TRAINING_PANEL_Z).toBeLessThan(200);
  });

  it("TRAINING_PANEL_ANCHOR has correct position", () => {
    expect(TRAINING_PANEL_ANCHOR.position).toBe("fixed");
    expect(typeof TRAINING_PANEL_ANCHOR.top).toBe("number");
    expect(typeof TRAINING_PANEL_ANCHOR.left).toBe("number");
    expect(TRAINING_PANEL_ANCHOR.zIndex).toBe(TRAINING_PANEL_Z);
  });

  it("TRAINING_PANEL_ANCHOR top is below top nav", () => {
    expect((TRAINING_PANEL_ANCHOR.top as number)).toBeGreaterThan(50);
  });

  it("TRAINING_PANEL_ANCHOR left is near left edge", () => {
    expect((TRAINING_PANEL_ANCHOR.left as number)).toBeLessThanOrEqual(30);
  });
});
