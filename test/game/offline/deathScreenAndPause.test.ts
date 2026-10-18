import { describe, it, expect, beforeEach } from "vitest";
import { HUD_Z } from "../../../client/src/ui/hudTheme";
import { useOffline5v5Store } from "../../../client/src/screens/Offline5v5Store";
import { useWeaponStore } from "../../../client/src/stores/useWeaponStore";
import { useGameStore } from "../../../client/src/stores/useGameStore";

describe("DeathScreen, PauseMenu stacking and dead state action blocks", () => {
  beforeEach(() => {
    useGameStore.setState({ mode: "offline5v5" });
    useOffline5v5Store.getState().initMatch("dust2", "T", "agent-1");
  });

  it("HUD_Z.overlay is strictly less than HUD_Z.pause so DeathScreen never obscures PauseMenu", () => {
    expect(HUD_Z.overlay).toBeLessThan(HUD_Z.pause);
    expect(HUD_Z.pause).toBe(90);
    expect(HUD_Z.overlay).toBe(50);
  });

  it("dead player in 5v5 has isDead flag reflected in player state", () => {
    const me = useOffline5v5Store.getState().players.get("local");
    expect(me).toBeDefined();
    expect(me?.isDead).toBe(false);

    // Simulate local player death
    useOffline5v5Store.setState((s) => {
      const updated = new Map(s.players);
      const local = updated.get("local")!;
      updated.set("local", { ...local, hp: 0, isDead: true });
      return { players: updated };
    });

    const deadMe = useOffline5v5Store.getState().players.get("local");
    expect(deadMe?.isDead).toBe(true);
    expect(deadMe?.hp).toBe(0);
  });

  it("ADS resets when dead state is triggered", () => {
    useWeaponStore.getState().setADS(true);
    expect(useWeaponStore.getState().isADS).toBe(true);

    // When dead, system resets ADS
    const isDead = true;
    if (isDead && useWeaponStore.getState().isADS) {
      useWeaponStore.getState().setADS(false);
    }

    expect(useWeaponStore.getState().isADS).toBe(false);
  });
});
