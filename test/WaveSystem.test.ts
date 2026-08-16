import { describe, it, expect, beforeEach } from "vitest";
import { GameState } from "@cs-game/shared";
import { WaveSystem } from "../server/src/systems/WaveSystem";
import { ZombieController } from "../server/src/ai/ZombieController";

describe("WaveSystem", () => {
  let state: GameState;
  let zombieCtrl: ZombieController;
  let waveSystem: WaveSystem;

  beforeEach(() => {
    state = new GameState();
    state.phase = "active";
    zombieCtrl = new ZombieController();
    waveSystem = new WaveSystem(state, zombieCtrl);
  });

  it("should initialize wave 1 correctly on start", () => {
    waveSystem.startFirstWave();
    expect(waveSystem.getCurrentWave()).toBe(1);
    expect(waveSystem.getWaveState()).toBe("spawning");
    expect(state.currentWave).toBe(1);
    expect(state.zombiesRemaining).toBeGreaterThan(0);
  });

  it("should spawn boss wave every 5 waves", () => {
    for (let i = 0; i < 5; i++) {
      waveSystem.startFirstWave();
    }
    expect(waveSystem.getCurrentWave()).toBe(5);
    expect(waveSystem.isBossWaveActive()).toBe(true);
  });

  it("should pause wave update when phase is not active", () => {
    waveSystem.startFirstWave();
    state.phase = "waiting";
    const initialZombiesSpawned = zombieCtrl.getAliveCount();
    waveSystem.update(5.0);
    // Should not spawn any new zombies while paused
    expect(zombieCtrl.getAliveCount()).toBe(initialZombiesSpawned);
  });

  it("should correctly record kills and headshots", () => {
    waveSystem.onZombieKilled(false);
    waveSystem.onZombieKilled(true);
    const stats = waveSystem.getStats();
    expect(stats.kills).toBe(2);
    expect(stats.headshots).toBe(1);
  });

  it("should reset wave state and stats on reset()", () => {
    waveSystem.startFirstWave();
    waveSystem.onZombieKilled(true);
    waveSystem.reset();
    expect(waveSystem.getCurrentWave()).toBe(0);
    expect(waveSystem.getWaveState()).toBe("waiting");
    expect(waveSystem.getStats().kills).toBe(0);
    expect(state.currentWave).toBe(0);
  });
});
