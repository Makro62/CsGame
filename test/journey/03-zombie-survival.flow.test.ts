/**
 * Alur: menu → pilih hero → buy door → wave → toko → repair → ability → reset → menu.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getHero } from "@src/game/zombie/heroes";
import { applyHeroToMatch } from "@src/game/zombie/applyHeroMatch";
import { purchaseOrEquipSurvivalWeapon } from "@src/game/zombie/survivalBuy";
import { useGameStore } from "@src/stores/useGameStore";
import { useHeroStore } from "@src/stores/useHeroStore";
import { useWeaponStore } from "@src/stores/useWeaponStore";
import { useZombieStore } from "@src/stores/useZombieStore";

vi.mock("@src/components/AudioManager", () => ({
  Sound: { deploy: vi.fn(), cancelReload: vi.fn(), buy: vi.fn() },
}));

beforeEach(() => {
  useGameStore.getState().setMode("menu");
  useHeroStore.getState().selectHero("nova7");
  useHeroStore.getState().resetAbility();
  useZombieStore.getState().resetGame(true);
});

describe("Alur Zombie Survival", () => {
  it("NOVA-7: pilih hero → buka pintu → tembak wave → beli → Q → kembali menu", () => {
    expect(getHero("nova7").ability).toBe("berserk");
    expect(getHero("titan").stats.maxHp).toBe(150);

    useGameStore.getState().setMode("zombie");
    useHeroStore.getState().selectHero("nova7");
    applyHeroToMatch(useHeroStore.getState().hero, { silent: true });

    const afterHero = useZombieStore.getState();
    expect(afterHero.player.maxHp).toBe(100);
    expect(afterHero.player.hp).toBe(100);
    expect(afterHero.waveState).toBe("buy_phase");
    expect(useWeaponStore.getState().activeWeapon).toBe("mp5");

    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 2000 }));
    expect(useZombieStore.getState().unlockDoor("door_lab", 750)).toBe(true);
    expect(useZombieStore.getState().unlockedDoors).toContain("door_lab");
    expect(useZombieStore.getState().unlockDoor("door_lab", 750)).toBe(false);
    expect(useZombieStore.getState().unlockDoor("door_lab", NaN)).toBe(false);

    useZombieStore.getState().setCurrentWave(1);
    useZombieStore.getState().setWaveState("in_progress");
    useZombieStore.getState().setZombiesRemaining(3);
    const beforePts = useZombieStore.getState().player.points;
    useZombieStore.getState().addPoints(NaN);
    expect(useZombieStore.getState().player.points).toBe(beforePts);
    useZombieStore.getState().addPoints(150);
    expect(useZombieStore.getState().player.points).toBe(beforePts + 150);

    useZombieStore.getState().setZombiesRemaining(0);
    useZombieStore.getState().setWaveState("buy_phase");
    expect(purchaseOrEquipSurvivalWeapon("mp5", 0)).toBe("already_equipped");
    expect(useZombieStore.getState().upgradeWeaponTier("mp5", 200)).toBe(true);

    useZombieStore.getState().damageBarricade("win_north", 2);
    expect(useZombieStore.getState().barricades.win_north).toBe(4);
    expect(useZombieStore.getState().repairBarricade("win_north")).toBe(true);
    expect(useZombieStore.getState().barricades.win_north).toBe(5);

    expect(useHeroStore.getState().triggerAbility()).toBe(true);
    expect(useHeroStore.getState().abilityReady).toBe(false);
    useHeroStore.getState().tickCooldown(25);
    expect(useHeroStore.getState().abilityReady).toBe(true);

    useZombieStore.getState().resetGame(true);
    expect(useZombieStore.getState().unlockedDoors).toHaveLength(0);
    expect(useZombieStore.getState().barricades.win_north).toBe(6);
    useGameStore.getState().setMode("menu");
    expect(useGameStore.getState().mode).toBe("menu");
  });

  it("TITAN: deploy loadout berbeda lalu toko menolak biaya ilegal", () => {
    useGameStore.getState().setMode("zombie");
    useHeroStore.getState().selectHero("titan");
    applyHeroToMatch(useHeroStore.getState().hero, { silent: true });

    const player = useZombieStore.getState().player;
    expect(player.maxHp).toBe(150);
    expect(player.armor).toBe(25);
    expect(useWeaponStore.getState().primaryWeapon).toBe("ak47");
    expect(useHeroStore.getState().triggerAbility()).toBe(true);
    expect(useHeroStore.getState().abilityCooldownRemaining).toBe(30);

    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
    expect(useZombieStore.getState().upgradeWeaponTier("ak47", -1)).toBe(false);
    expect(useZombieStore.getState().addPerk("juggernog", NaN)).toBe(false);
    applyHeroToMatch(null as never);
    expect(useZombieStore.getState().player.maxHp).toBe(150);

    useGameStore.getState().setMode("menu");
  });
});
