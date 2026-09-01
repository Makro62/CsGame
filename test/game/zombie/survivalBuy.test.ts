import { describe, expect, it, beforeEach } from "vitest";
import { WEAPONS } from "@cs-game/shared";
import { useZombieStore } from "@src/stores/useZombieStore";
import { useWeaponStore } from "@src/stores/useWeaponStore";
import { purchaseOrEquipSurvivalWeapon } from "@src/game/zombie/survivalBuy";

function startStarterLoadout() {
  useZombieStore.getState().resetGame(true);
  const ws = useWeaponStore.getState();
  ws.resetUpgrades();
  ws.resetAmmoInventory();
  ws.setInfiniteAmmo(false);
  ws.syncLoadout({ primary: "mp5", secondary: "glock", knife: "knife" });
  ws.equipWeapon("mp5", {
    ammo: WEAPONS.mp5.mag,
    reserveAmmo: WEAPONS.mp5.reserveAmmo,
    silent: true,
  });
}

describe("purchaseOrEquipSurvivalWeapon", () => {
  beforeEach(() => {
    startStarterLoadout();
  });

  it("does not charge again for a starter gun that is already equipped", () => {
    const before = useZombieStore.getState().player.points;
    expect(purchaseOrEquipSurvivalWeapon("mp5", 850)).toBe("already_equipped");
    expect(useZombieStore.getState().player.points).toBe(before);
  });

  it("swaps to an owned gun for free instead of charging the shop price", () => {
    const before = useZombieStore.getState().player.points;
    expect(purchaseOrEquipSurvivalWeapon("glock", 0)).toBe("equipped");
    expect(useWeaponStore.getState().activeWeapon).toBe("glock");
    expect(useZombieStore.getState().player.points).toBe(before);

    expect(purchaseOrEquipSurvivalWeapon("mp5", 850)).toBe("equipped");
    expect(useWeaponStore.getState().activeWeapon).toBe("mp5");
    expect(useZombieStore.getState().player.points).toBe(before);
  });

  it("charges once when buying a new rifle and refuses a second charge", () => {
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
    expect(purchaseOrEquipSurvivalWeapon("ak47", 1400)).toBe("bought");
    expect(useZombieStore.getState().player.points).toBe(3600);
    expect(useZombieStore.getState().purchasedWeapons).toContain("ak47");
    expect(useWeaponStore.getState().activeWeapon).toBe("ak47");
    expect(useWeaponStore.getState().currentAmmo).toBe(WEAPONS.ak47.mag);

    expect(purchaseOrEquipSurvivalWeapon("ak47", 1400)).toBe("already_equipped");
    expect(useZombieStore.getState().player.points).toBe(3600);

    purchaseOrEquipSurvivalWeapon("mp5", 850);
    expect(purchaseOrEquipSurvivalWeapon("ak47", 1400)).toBe("equipped");
    expect(useZombieStore.getState().player.points).toBe(3600);
  });

  it("keeps remaining ammo when swapping back to a purchased rifle", () => {
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
    purchaseOrEquipSurvivalWeapon("ak47", 1400);
    useWeaponStore.setState({ currentAmmo: 11, reserveAmmo: 40 });
    useWeaponStore.getState().incrementBullets();

    expect(useWeaponStore.getState().currentAmmo).toBe(10);
    purchaseOrEquipSurvivalWeapon("mp5", 850);
    expect(useWeaponStore.getState().activeWeapon).toBe("mp5");

    purchaseOrEquipSurvivalWeapon("ak47", 1400);
    expect(useWeaponStore.getState().activeWeapon).toBe("ak47");
    expect(useWeaponStore.getState().currentAmmo).toBe(10);
    expect(useWeaponStore.getState().reserveAmmo).toBe(40);
  });

  it("blocks a new purchase when the player cannot afford it", () => {
    useZombieStore.getState().setPlayer((p) => ({ ...p, points: 100 }));
    expect(purchaseOrEquipSurvivalWeapon("awp", 2600)).toBe("cant_afford");
    expect(useWeaponStore.getState().activeWeapon).toBe("mp5");
    expect(useZombieStore.getState().purchasedWeapons).not.toContain("awp");
  });
});