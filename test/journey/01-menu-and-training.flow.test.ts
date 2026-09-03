/**
 * Alur: buka menu → isi nick → latihan tembak → pause/settings → kembali menu.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@src/stores/useGameStore";
import { useSettingsStore } from "@src/stores/useSettingsStore";
import { useUiOverlayStore } from "@src/stores/useUiOverlayStore";

beforeEach(() => {
  useGameStore.getState().resetStats();
  useGameStore.getState().resetTargets();
  useGameStore.getState().setMode("menu");
  useUiOverlayStore.getState().setSettingsOpen(false);
});

describe("Alur menu & training", () => {
  it("dari menu sampai selesai sesi training lalu kembali", () => {
    const game = useGameStore.getState();
    expect(game.mode).toBe("menu");

    game.setNickname("");
    expect(useGameStore.getState().nickname).toBe("Player");
    game.setNickname("Jeremy");
    expect(useGameStore.getState().nickname).toBe("Jeremy");

    game.setMode("training");
    expect(useGameStore.getState().mode).toBe("training");
    expect(Object.keys(useGameStore.getState().targets)).toHaveLength(0);

    game.addTarget({ id: "dummy-1", x: 0, y: 1, z: -8, hp: 100, maxHp: 100, isAlive: true });
    game.addTarget({ id: "dummy-2", x: 2, y: 1, z: -10, hp: 20, maxHp: 100, isAlive: true });
    game.startTimer();
    game.incrementShots();
    game.damageTarget("dummy-1", 30, false);
    expect(useGameStore.getState().targets["dummy-1"].hp).toBe(70);

    game.incrementShots();
    game.incrementHits();
    game.damageTarget("dummy-2", 50, true);
    expect(useGameStore.getState().targets["dummy-2"]).toBeUndefined();
    expect(useGameStore.getState().stats.kills).toBe(1);
    expect(useGameStore.getState().stats.headshots).toBe(1);
    expect(useGameStore.getState().stats.accuracy).toBeGreaterThan(0);

    useUiOverlayStore.getState().setSettingsOpen(true);
    expect(useUiOverlayStore.getState().settingsOpen).toBe(true);
    useSettingsStore.getState().setMasterVolume(40);
    expect(useSettingsStore.getState().masterVolume).toBe(40);
    useUiOverlayStore.getState().setSettingsOpen(false);

    game.useJumpStamina();
    game.resetJumpStamina();
    expect(useGameStore.getState().jumpStamina).toBe(3);

    game.stopTimer();
    game.resetStats();
    game.setMode("menu");
    expect(useGameStore.getState().mode).toBe("menu");
    expect(useGameStore.getState().isTimerRunning).toBe(false);
  });

  it("damage ilegal tidak merusak dummy", () => {
    const game = useGameStore.getState();
    game.setMode("training");
    game.addTarget({ id: "t1", x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true });
    game.damageTarget("t1", NaN, false);
    game.damageTarget("t1", -10, false);
    expect(useGameStore.getState().targets["t1"].hp).toBe(100);
  });
});
