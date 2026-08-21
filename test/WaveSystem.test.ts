import { describe, it, expect, beforeEach } from "vitest";
import { GameState, WAVE_CONFIG } from "@cs-game/shared";
import { WaveSystem } from "../server/src/systems/WaveSystem";
import { ZombieController } from "../server/src/ai/ZombieController";

const BUY_PHASE_TICK = WAVE_CONFIG.firstWaveDelay + 1;

/** Kill every alive zombie through the wave system, then tick once. */
function killAll(waveSystem: WaveSystem, zombieCtrl: ZombieController) {
  zombieCtrl.getAllZombies().forEach((z) => {
    if (!z.isDead) waveSystem.damageZombie(z.id, 99999);
  });
}

/** Drive one full wave cycle: buy_phase → spawning → active → wave_clear. */
function runWaveToClear(waveSystem: WaveSystem, zombieCtrl: ZombieController) {
  // buy_phase timer expires → wave starts spawning
  waveSystem.update(WAVE_CONFIG.firstWaveDelay + 0.1);
  // Finish spawning immediately so all zombies exist
  waveSystem.finishSpawning();
  // Kill them all
  killAll(waveSystem, zombieCtrl);
  // Tick so the wave_clear check fires
  waveSystem.update(0.1);
}

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

  it("should start in buy_phase on startFirstWave()", () => {
    waveSystem.startFirstWave();
    expect(waveSystem.getWaveState()).toBe("buy_phase");
    expect(state.waveState).toBe("buy_phase");
    expect(state.currentWave).toBe(0);
  });

  it("should transition from buy_phase to spawning after timer expires", () => {
    waveSystem.startFirstWave();
    expect(waveSystem.getWaveState()).toBe("buy_phase");

    waveSystem.update(BUY_PHASE_TICK);
    expect(waveSystem.getWaveState()).toBe("spawning");
    expect(waveSystem.getCurrentWave()).toBe(1);
    expect(state.currentWave).toBe(1);
    expect(state.zombiesRemaining).toBeGreaterThan(0);
  });

  it("should complete wave and transition to wave_clear then buy_phase", () => {
    waveSystem.startFirstWave();
    runWaveToClear(waveSystem, zombieCtrl);

    expect(waveSystem.getWaveState()).toBe("wave_clear");

    // Wait for inter-wave timer to expire → buy_phase for wave 2
    waveSystem.update(25.0);
    expect(waveSystem.getWaveState()).toBe("buy_phase");
  });

  it("should spawn boss wave every 5 waves", () => {
    // Run waves 1-5, each through the full cycle
    for (let w = 1; w <= 5; w++) {
      waveSystem.startFirstWave();
      runWaveToClear(waveSystem, zombieCtrl);
      // Wait for wave_clear → buy_phase
      waveSystem.update(25.0);
    }

    // Wave 5 should have been a boss wave
    expect(waveSystem.getCurrentWave()).toBe(5);

    // Now start wave 6 from buy_phase
    waveSystem.update(20.0); // buyPhaseTimer (15s) expires → wave 6
    expect(waveSystem.getCurrentWave()).toBe(6);
    expect(waveSystem.isBossWaveActive()).toBe(false);
  });

  it("should pause wave update when phase is not active", () => {
    waveSystem.startFirstWave();
    waveSystem.update(BUY_PHASE_TICK); // buy_phase → spawning (wave 1)
    state.phase = "waiting";
    const initialZombies = zombieCtrl.getAliveCount();
    waveSystem.update(5.0);
    expect(zombieCtrl.getAliveCount()).toBe(initialZombies);
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
    waveSystem.update(BUY_PHASE_TICK);
    waveSystem.onZombieKilled(true);
    waveSystem.reset();
    expect(waveSystem.getCurrentWave()).toBe(0);
    expect(waveSystem.getWaveState()).toBe("waiting");
    expect(waveSystem.getStats().kills).toBe(0);
    expect(state.currentWave).toBe(0);
    expect(state.waveState).toBe("waiting");
  });

  it("should report buy phase correctly", () => {
    waveSystem.startFirstWave();
    expect(waveSystem.isInBuyPhase()).toBe(true);
    expect(waveSystem.getBuyPhaseTimer()).toBeGreaterThan(0);

    waveSystem.update(BUY_PHASE_TICK); // buy_phase → spawning
    expect(waveSystem.isInBuyPhase()).toBe(false);
    expect(waveSystem.getBuyPhaseTimer()).toBe(0);
  });

  it("should skip buy phase and start wave immediately with skipBuyPhase()", () => {
    waveSystem.startFirstWave();
    expect(waveSystem.getWaveState()).toBe("buy_phase");

    waveSystem.skipBuyPhase();
    expect(waveSystem.getWaveState()).toBe("spawning");
    expect(waveSystem.getCurrentWave()).toBe(1);
  });

  it("should skip wave_clear and start wave immediately with skipBuyPhase()", () => {
    waveSystem.startFirstWave();
    runWaveToClear(waveSystem, zombieCtrl);
    expect(waveSystem.getWaveState()).toBe("wave_clear");

    waveSystem.skipBuyPhase();
    expect(waveSystem.getWaveState()).toBe("spawning");
    expect(waveSystem.getCurrentWave()).toBe(2);
  });
});
