import { describe, it, expect, beforeEach } from "vitest";
import {
  triggerScreenShake,
  consumeScreenShake,
  resetScreenShake,
  peekScreenShakeAmplitude,
} from "../../../client/src/game/effects/screenShake";

describe("screenShake", () => {
  beforeEach(() => {
    resetScreenShake();
  });

  it("triggerScreenShake increases amplitude", () => {
    triggerScreenShake(0.1);
    expect(peekScreenShakeAmplitude()).toBeGreaterThan(0);
  });

  it("amplitude is capped at MAX_AMPLITUDE", () => {
    triggerScreenShake(10);
    expect(peekScreenShakeAmplitude()).toBeLessThanOrEqual(0.42);
  });

  it("consumeScreenShake decays amplitude", () => {
    triggerScreenShake(0.3);
    consumeScreenShake(0.5);
    expect(peekScreenShakeAmplitude()).toBeLessThan(0.3);
  });

  it("consumeScreenShake returns zero when amplitude is tiny", () => {
    resetScreenShake();
    const result = consumeScreenShake(0.016);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("consumeScreenShake returns non-zero when active", () => {
    triggerScreenShake(0.2);
    let nonZero = false;
    for (let i = 0; i < 50; i++) {
      const r = consumeScreenShake(0.016);
      if (r.x !== 0 || r.y !== 0) nonZero = true;
    }
    expect(nonZero).toBe(true);
  });

  it("resetScreenShake zeroes amplitude", () => {
    triggerScreenShake(0.3);
    resetScreenShake();
    expect(peekScreenShakeAmplitude()).toBe(0);
  });

  it("ignores negative amount", () => {
    triggerScreenShake(-1);
    expect(peekScreenShakeAmplitude()).toBe(0);
  });
});
