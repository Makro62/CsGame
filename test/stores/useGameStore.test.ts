import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../../client/src/stores/useGameStore";

describe("useGameStore", () => {
  beforeEach(() => {
    useGameStore.getState().resetStats();
    useGameStore.getState().resetTargets();
  });

  describe("damageTarget and headshot statistics", () => {
    it("increments headshots on non-lethal headshot hits", () => {
      useGameStore.setState({
        targets: {
          dummy1: { id: "dummy1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true },
        },
      });

      // Hit head for 40 damage (non-fatal)
      useGameStore.getState().damageTarget("dummy1", 40, true);

      const state = useGameStore.getState();
      expect(state.stats.headshots).toBe(1);
      expect(state.stats.kills).toBe(0);
      expect(state.targets.dummy1).toBeDefined();
      expect(state.targets.dummy1.hp).toBe(60);
    });

    it("increments headshots and kills on fatal headshot hit", () => {
      useGameStore.setState({
        targets: {
          dummy1: { id: "dummy1", x: 0, y: 0, z: 0, hp: 50, maxHp: 100, isAlive: true },
        },
      });

      // Fatal headshot
      useGameStore.getState().damageTarget("dummy1", 100, true);

      const state = useGameStore.getState();
      expect(state.stats.headshots).toBe(1);
      expect(state.stats.kills).toBe(1);
      expect(state.targets.dummy1).toBeUndefined(); // Target removed
    });

    it("calculates accurate hsRate with shotsHit and kills", () => {
      // 10 shots fired, 4 hit
      useGameStore.setState(s => ({
        stats: {
          ...s.stats,
          shotsFired: 10,
          shotsHit: 4,
        },
        targets: {
          dummy1: { id: "dummy1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true },
        },
      }));

      // Non-fatal headshot
      useGameStore.getState().damageTarget("dummy1", 40, true);
      // 1 headshot out of 4 shotsHit = 25%
      expect(useGameStore.getState().stats.hsRate).toBe(25);

      // Another non-fatal headshot
      useGameStore.getState().damageTarget("dummy1", 40, true);
      // 2 headshots out of 4 shotsHit = 50%
      expect(useGameStore.getState().stats.hsRate).toBe(50);
    });

    it("does not increment headshots on body shots", () => {
      useGameStore.setState({
        targets: {
          dummy1: { id: "dummy1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true },
        },
      });

      useGameStore.getState().damageTarget("dummy1", 30, false);

      const state = useGameStore.getState();
      expect(state.stats.headshots).toBe(0);
      expect(state.stats.kills).toBe(0);
      expect(state.targets.dummy1.hp).toBe(70);
    });
  });
});
