import { describe, it, expect, beforeEach } from "vitest";
import { WEAPONS } from "@cs-game/shared";
import { useZombieStore } from "@src/stores/useZombieStore";
import { useWeaponStore } from "@src/stores/useWeaponStore";
import { purchaseOrEquipSurvivalWeapon } from "@src/game/zombie/survivalBuy";

function reset() {
  useZombieStore.getState().resetGame(true);
  const ws = useWeaponStore.getState();
  ws.resetUpgrades();
  ws.resetAmmoInventory();
  ws.setInfiniteAmmo(false);
  ws.syncLoadout({ primary: "mp5", secondary: "glock", knife: "knife" });
  ws.equipWeapon("mp5", { ammo: WEAPONS.mp5.mag, reserveAmmo: WEAPONS.mp5.reserveAmmo, silent: true });
}

describe("purchaseOrEquipSurvivalWeapon P0 cost validation", () => {
  beforeEach(reset);

  it("rejects NaN cost (previously free weapon exploit)", () => {
    useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
    const before = useZombieStore.getState().player.points;
    expect(purchaseOrEquipSurvivalWeapon("ak47", NaN)).toBe("cant_afford");
    expect(useZombieStore.getState().player.points).toBe(before);
    expect(useZombieStore.getState().purchasedWeapons).not.toContain("ak47");
  });

  it("rejects Infinity cost", () => {
    useZombieStore.getState().setPlayer(p => ({ ...p, points: 999999 }));
    expect(purchaseOrEquipSurvivalWeapon("ak47", Infinity)).toBe("cant_afford");
  });

  it("rejects negative cost (previously free weapon)", () => {
    useZombieStore.getState().setPlayer(p => ({ ...p, points: 100 }));
    const before = useZombieStore.getState().player.points;
    expect(purchaseOrEquipSurvivalWeapon("ak47", -100)).toBe("cant_afford");
    expect(useZombieStore.getState().player.points).toBe(before);
  });

  it("allows zero-cost purchase", () => {
    useZombieStore.getState().setPlayer(p => ({ ...p, points: 0 }));
    expect(purchaseOrEquipSurvivalWeapon("ak47", 0)).toBe("bought");
    expect(useZombieStore.getState().purchasedWeapons).toContain("ak47");
  });

  it("normal purchase still works after fix", () => {
    useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
    expect(purchaseOrEquipSurvivalWeapon("ak47", 1400)).toBe("bought");
    expect(useZombieStore.getState().player.points).toBe(3600);
  });
});
