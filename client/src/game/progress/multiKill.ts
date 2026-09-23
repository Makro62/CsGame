export const MULTIKILL_WINDOW_MS = 4000;

export interface MultiKillState {
  count: number;
  lastKillAt: number;
}

export function createMultiKillState(): MultiKillState {
  return { count: 0, lastKillAt: 0 };
}

export function multikillLabel(count: number): string | null {
  if (count < 2) return null;
  if (count === 2) return "DOUBLE KILL";
  if (count === 3) return "TRIPLE KILL";
  if (count === 4) return "RAMPAGE";
  return "UNSTOPPABLE";
}

export function registerMultiKill(state: MultiKillState, now: number): MultiKillState {
  if (now - state.lastKillAt > MULTIKILL_WINDOW_MS) {
    return { count: 1, lastKillAt: now };
  }
  return { count: state.count + 1, lastKillAt: now };
}
