import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZOMBIE_STARTING_POINTS, WAVE_CONFIG } from "@cs-game/shared";
import { localZombieEngine } from "../client/src/game/zombie/LocalZombieEngine";
import { useZombieStore } from "../client/src/stores/useZombieStore";
import { useWeaponStore } from "../client/src/stores/useWeaponStore";
import { useZombieNetworkStore } from "../client/src/stores/useZombieNetworkStore";

describe("LocalZombieEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useZombieStore.getState().resetMatch();
    useWeaponStore.getState().resetUpgrades();
    useWeaponStore.getState().equipWeapon("deagle");
    localZombieEngine.init("normal");
  });

  it("initializes game state with starting points and buy_phase", () => {
    const store = useZombieStore.getState();
    expect(store.points).toBe(ZOMBIE_STARTING_POINTS);
    expect(store.waveState).toBe("buy_phase");
    expect(store.currentWave).toBe(0);
    expect(store.interWaveTimer).toBe(WAVE_CONFIG.firstWaveDelay);
    expect(store.barricades.length).toBeGreaterThan(0);
    expect(localZombieEngine.isActive()).toBe(true);
  });

  it("skips buy phase and starts wave 1 with zombies", () => {
    localZombieEngine.skipBuyPhase();
    const store = useZombieStore.getState();
    expect(store.currentWave).toBe(1);
    expect(store.zombiesRemaining).toBeGreaterThan(0);
    expect(store.waveState).toBe("spawning");
  });

  it("handles player buying a weapon when points are sufficient", () => {
    useZombieStore.getState().setPoints(2000);
    localZombieEngine.handleBuyWeapon("ak47");
    expect(useZombieStore.getState().points).toBe(800); // 2000 - 1200
    expect(useWeaponStore.getState().activeWeapon).toBe("ak47");
  });

  it("rejects weapon purchase when points are insufficient", () => {
    useZombieStore.getState().setPoints(300);
    localZombieEngine.handleBuyWeapon("ak47");
    expect(useZombieStore.getState().points).toBe(300);
    expect(useWeaponStore.getState().activeWeapon).toBe("deagle");
  });

  it("handles buying body armor and perks", () => {
    useZombieStore.getState().setPoints(5000);
    localZombieEngine.handleBuyArmor();
    expect(useZombieNetworkStore.getState().localArmor).toBe(100);

    localZombieEngine.handleBuyPerk("juggernog");
    expect(useZombieNetworkStore.getState().hasJuggernog).toBe(true);
    expect(useZombieNetworkStore.getState().localHp).toBe(200);
  });

  it("handles barricade repairs and gives points", () => {
    const store = useZombieStore.getState();
    const bId = store.barricades[0]?.id;
    if (bId) {
      // Simulate damaged barricade
      const b = store.barricades.find((item) => item.id === bId);
      if (b) b.boards = 2;

      const initialPoints = store.points;
      localZombieEngine.handleRepairBarricade(bId);
      expect(useZombieStore.getState().points).toBe(initialPoints + 10);
    }
  });

  it("handles area unlocking when points are sufficient", () => {
    useZombieStore.getState().setPoints(2000);
    localZombieEngine.handleUnlockArea("east_wing");
    expect(useZombieStore.getState().unlockedAreas).toContain("east_wing");
    expect(useZombieStore.getState().points).toBe(1250); // 2000 - 750
  });

  it("handles damage and self-revive mechanics", () => {
    expect(useZombieNetworkStore.getState().soloRevives).toBe(3);
    // Deal fatal damage
    localZombieEngine.damagePlayer(150);
    // Should consume 1 solo revive and restore HP
    expect(useZombieNetworkStore.getState().soloRevives).toBe(2);
    expect(useZombieNetworkStore.getState().localHp).toBe(100);
  });

  it("heals at the med station for points", () => {
    localZombieEngine.damagePlayer(40);
    expect(useZombieNetworkStore.getState().localHp).toBe(60);
    const before = useZombieStore.getState().points;
    localZombieEngine.handleHeal();
    expect(useZombieNetworkStore.getState().localHp).toBe(100);
    expect(useZombieStore.getState().points).toBe(before - 400);
  });

  it("rejects buying an already owned perk", () => {
    useZombieStore.getState().setPoints(10000);
    localZombieEngine.handleBuyPerk("juggernog");
    const afterFirst = useZombieStore.getState().points;
    localZombieEngine.handleBuyPerk("juggernog");
    expect(useZombieStore.getState().points).toBe(afterFirst);
  });

  it("does not apply acid DoT as 1 damage per frame", () => {
    const startHp = useZombieNetworkStore.getState().localHp;
    for (let i = 0; i < 4; i++) {
      localZombieEngine.damagePlayer(0.2, { fromDot: true });
    }
    expect(useZombieNetworkStore.getState().localHp).toBe(startHp);
    localZombieEngine.damagePlayer(0.3, { fromDot: true });
    expect(useZombieNetworkStore.getState().localHp).toBe(startHp - 1);
  });
});
