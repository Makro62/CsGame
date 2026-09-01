import { describe, expect, it, beforeEach } from "vitest";
import {
  triggerScreenShake,
  consumeScreenShake,
  resetScreenShake,
  peekScreenShakeAmplitude,
} from "@src/game/effects/screenShake";

describe("screenShake", () => {
  beforeEach(() => resetScreenShake());

  it("accumulates amplitude up to a cap", () => {
    triggerScreenShake(0.2);
    triggerScreenShake(0.2);
    triggerScreenShake(1);
    expect(peekScreenShakeAmplitude()).toBeLessThanOrEqual(0.42);
    expect(peekScreenShakeAmplitude()).toBeGreaterThan(0.3);
  });

  it("decays over time", () => {
    triggerScreenShake(0.2);
    const before = peekScreenShakeAmplitude();
    consumeScreenShake(1 / 60);
    expect(peekScreenShakeAmplitude()).toBeLessThan(before);
  });
});