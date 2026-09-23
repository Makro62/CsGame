import { describe, it, expect } from "vitest";
import {
  MULTIKILL_WINDOW_MS,
  createMultiKillState,
  multikillLabel,
  registerMultiKill,
} from "../../../client/src/game/progress/multiKill";

describe("progress/multiKill", () => {
  it("labels multi-kills", () => {
    expect(multikillLabel(1)).toBeNull();
    expect(multikillLabel(2)).toBe("DOUBLE KILL");
    expect(multikillLabel(3)).toBe("TRIPLE KILL");
    expect(multikillLabel(4)).toBe("RAMPAGE");
    expect(multikillLabel(5)).toBe("UNSTOPPABLE");
    expect(multikillLabel(9)).toBe("UNSTOPPABLE");
  });

  it("starts a new streak after the window", () => {
    let state = createMultiKillState();
    state = registerMultiKill(state, 1000);
    expect(state.count).toBe(1);
    state = registerMultiKill(state, 1000 + MULTIKILL_WINDOW_MS - 1);
    expect(state.count).toBe(2);
    state = registerMultiKill(state, 1000 + MULTIKILL_WINDOW_MS - 1 + MULTIKILL_WINDOW_MS + 1);
    expect(state.count).toBe(1);
  });
});
