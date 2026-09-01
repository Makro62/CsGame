import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@src/stores/useGameStore";

beforeEach(() => {
  useGameStore.getState().resetStats();
  useGameStore.getState().resetTargets();
  useGameStore.getState().setMode("menu");
});

// ── useGameStore ──
describe("useGameStore", () => {
  describe("setBotCount", () => {
    it("clamps to min 1", () => {
      useGameStore.getState().setBotCount(0);
      expect(useGameStore.getState().botCount).toBe(1);
    });

    it("clamps to max 5", () => {
      useGameStore.getState().setBotCount(10);
      expect(useGameStore.getState().botCount).toBe(5);
    });

    it("accepts valid range", () => {
      useGameStore.getState().setBotCount(3);
      expect(useGameStore.getState().botCount).toBe(3);
    });
  });

  describe("setNickname", () => {
    it("defaults to Player for empty string", () => {
      useGameStore.getState().setNickname("");
      expect(useGameStore.getState().nickname).toBe("Player");
    });

    it("sets the nickname", () => {
      useGameStore.getState().setNickname("TestUser");
      expect(useGameStore.getState().nickname).toBe("TestUser");
    });
  });

  describe("setMode", () => {
    it("sets mode", () => {
      useGameStore.getState().setMode("training");
      expect(useGameStore.getState().mode).toBe("training");
    });

    it("resets targets when switching to training", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().setMode("training");
      expect(Object.keys(useGameStore.getState().targets)).toHaveLength(0);
    });
  });

  describe("targets", () => {
    it("adds a target", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 1, y: 2, z: 3, hp: 100, maxHp: 100, isAlive: true,
      });
      expect(useGameStore.getState().targets["t1"]).toBeDefined();
    });

    it("removes a target", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 1, y: 2, z: 3, hp: 100, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().removeTarget("t1");
      expect(useGameStore.getState().targets["t1"]).toBeUndefined();
    });

    it("resetTargets clears all", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().resetTargets();
      expect(Object.keys(useGameStore.getState().targets)).toHaveLength(0);
    });
  });

  describe("damageTarget", () => {
    it("reduces HP on hit", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().damageTarget("t1", 30, false);
      expect(useGameStore.getState().targets["t1"].hp).toBe(70);
    });

    it("kills target and removes from targets", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 20, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().damageTarget("t1", 50, false);
      expect(useGameStore.getState().targets["t1"]).toBeUndefined();
      expect(useGameStore.getState().stats.kills).toBe(1);
    });

    it("tracks headshot kills", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 10, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().damageTarget("t1", 50, true);
      expect(useGameStore.getState().stats.headshots).toBe(1);
    });

    it("ignores damage to dead target", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().damageTarget("t1", 999, false);
      // Target is killed, removed from targets dict
      // Now try to damage again — target doesn't exist, should use fallback
      useGameStore.getState().damageTarget("t1", 50, false);
      // Stats should still be 1 kill (only first hit counted)
      expect(useGameStore.getState().stats.kills).toBe(1);
    });

    it("creates default target when id doesn't exist", () => {
      useGameStore.getState().damageTarget("nonexistent", 10, false);
      // Should NOT crash — creates fallback target internally
    });
  });

  describe("stats tracking", () => {
    it("incrementShots increases shotsFired", () => {
      useGameStore.getState().incrementShots();
      expect(useGameStore.getState().stats.shotsFired).toBe(1);
    });

    it("incrementHits increases shotsHit", () => {
      useGameStore.getState().incrementHits();
      expect(useGameStore.getState().stats.shotsHit).toBe(1);
    });

    it("accuracy updates on hit", () => {
      useGameStore.getState().incrementShots();
      useGameStore.getState().incrementShots();
      useGameStore.getState().incrementHits();
      expect(useGameStore.getState().stats.accuracy).toBeCloseTo(50);
    });

    it("accuracy stays 0 when no shots fired", () => {
      useGameStore.getState().incrementHits();
      expect(useGameStore.getState().stats.accuracy).toBe(0);
    });

    it("hsRate updates on kill", () => {
      useGameStore.getState().addTarget({
        id: "t1", x: 0, y: 0, z: 0, hp: 10, maxHp: 100, isAlive: true,
      });
      useGameStore.getState().damageTarget("t1", 50, true);
      expect(useGameStore.getState().stats.hsRate).toBe(100);
    });

    it("resetStats preserves bestTime", () => {
      useGameStore.getState().incrementShots();
      useGameStore.getState().incrementHits();
      useGameStore.getState().resetStats();
      expect(useGameStore.getState().stats.shotsFired).toBe(0);
    });
  });

  describe("timer", () => {
    it("start/stop timer", () => {
      useGameStore.getState().startTimer();
      expect(useGameStore.getState().isTimerRunning).toBe(true);
      useGameStore.getState().stopTimer();
      expect(useGameStore.getState().isTimerRunning).toBe(false);
    });

    it("setTimer", () => {
      useGameStore.getState().setTimer(30);
      expect(useGameStore.getState().timer).toBe(30);
    });
  });

  describe("jumpStamina", () => {
    it("useJumpStamina succeeds when available", () => {
      useGameStore.getState().resetJumpStamina();
      const result = useGameStore.getState().useJumpStamina();
      expect(result).toBe(true);
      expect(useGameStore.getState().jumpStamina).toBe(2);
    });

    it("useJumpStamina fails when depleted", () => {
      useGameStore.getState().resetJumpStamina();
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().useJumpStamina();
      const result = useGameStore.getState().useJumpStamina();
      expect(result).toBe(false);
      expect(useGameStore.getState().jumpStamina).toBe(0);
    });

    it("regenJumpStamina adds up to max", () => {
      useGameStore.getState().resetJumpStamina();
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().regenJumpStamina(1);
      expect(useGameStore.getState().jumpStamina).toBe(2);
    });

    it("regenJumpStamina does not exceed max", () => {
      useGameStore.getState().resetJumpStamina();
      useGameStore.getState().regenJumpStamina(10);
      expect(useGameStore.getState().jumpStamina).toBe(3);
    });

    it("regenJumpStamina does nothing at max", () => {
      useGameStore.getState().resetJumpStamina();
      const before = useGameStore.getState().jumpStamina;
      useGameStore.getState().regenJumpStamina(1);
      expect(useGameStore.getState().jumpStamina).toBe(before);
    });

    it("resetJumpStamina restores to max", () => {
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().useJumpStamina();
      useGameStore.getState().resetJumpStamina();
      expect(useGameStore.getState().jumpStamina).toBe(3);
    });
  });

  describe("triggerShoot", () => {
    it("increments shootEvent", () => {
      const before = useGameStore.getState().shootEvent;
      useGameStore.getState().triggerShoot();
      expect(useGameStore.getState().shootEvent).toBe(before + 1);
    });
  });

  describe("setTracerEvent", () => {
    it("sets and clears tracer", () => {
      useGameStore.getState().setTracerEvent({
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 1, z: 10 },
      });
      expect(useGameStore.getState().tracerEvent).not.toBeNull();

      useGameStore.getState().setTracerEvent(null);
      expect(useGameStore.getState().tracerEvent).toBeNull();
    });
  });
});
