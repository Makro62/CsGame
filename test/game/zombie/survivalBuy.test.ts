import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  purchaseOrEquipSurvivalWeapon,
  pickupSurvivalWeapon,
  equipSurvivalWeapon,
} from "../../../client/src/game/zombie/survivalBuy";

const mockWeaponStoreState = {
  activeWeapon: null as string | null,
  primaryWeapon: "mp5" as string | null,
  secondaryWeapon: "glock" as string | null,
  knifeSlot: "knife" as string,
  syncLoadout: vi.fn(),
  equipWeapon: vi.fn(),
};

const mockZombieStoreState = {
  player: { points: 2000 },
  purchasedWeapons: ["mp5", "glock", "knife"] as string[],
  addPoints: vi.fn(),
  addPurchasedWeapon: vi.fn(),
};

vi.mock("../../../client/src/stores/useWeaponStore", () => ({
  useWeaponStore: {
    getState: () => mockWeaponStoreState,
    setState: vi.fn(),
  },
}));

vi.mock("../../../client/src/stores/useZombieStore", () => ({
  useZombieStore: {
    getState: () => mockZombieStoreState,
    setState: vi.fn(),
  },
}));

describe("survivalBuy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWeaponStoreState.activeWeapon = null;
    mockWeaponStoreState.primaryWeapon = "mp5";
    mockWeaponStoreState.secondaryWeapon = "glock";
    mockWeaponStoreState.knifeSlot = "knife";
    mockZombieStoreState.player = { points: 2000 };
    mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
  });

  describe("purchaseOrEquipSurvivalWeapon", () => {
    it("returns already_equipped if weapon is active", () => {
      mockWeaponStoreState.activeWeapon = "ak47";
      const result = purchaseOrEquipSurvivalWeapon("ak47", 2700);
      expect(result).toBe("already_equipped");
    });

    it("returns equipped if weapon is owned but not active", () => {
      mockWeaponStoreState.activeWeapon = "mp5";
      mockZombieStoreState.purchasedWeapons = ["mp5", "ak47"];
      const result = purchaseOrEquipSurvivalWeapon("ak47", 2700);
      expect(result).toBe("equipped");
    });

    it("returns cant_afford if cost is negative", () => {
      const result = purchaseOrEquipSurvivalWeapon("ak47", -100);
      expect(result).toBe("cant_afford");
    });

    it("returns cant_afford if cost is NaN", () => {
      const result = purchaseOrEquipSurvivalWeapon("ak47", NaN);
      expect(result).toBe("cant_afford");
    });

    it("returns cant_afford if not enough points", () => {
      mockZombieStoreState.player = { points: 100 };
      const result = purchaseOrEquipSurvivalWeapon("ak47", 2700);
      expect(result).toBe("cant_afford");
    });

    it("buys weapon if not owned and enough points", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      const result = purchaseOrEquipSurvivalWeapon("ak47", 2700);
      expect(result).toBe("bought");
      expect(mockZombieStoreState.addPoints).toHaveBeenCalledWith(-2700);
      expect(mockZombieStoreState.addPurchasedWeapon).toHaveBeenCalledWith("ak47");
    });

    it("does not charge for zero cost", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      const result = purchaseOrEquipSurvivalWeapon("ak47", 0);
      expect(result).toBe("bought");
      expect(mockZombieStoreState.addPoints).not.toHaveBeenCalled();
    });
  });

  describe("pickupSurvivalWeapon", () => {
    it("adds weapon to purchased list", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      pickupSurvivalWeapon("ak47");
      expect(mockZombieStoreState.addPurchasedWeapon).toHaveBeenCalledWith("ak47");
    });

    it("fills mag for new weapon", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      pickupSurvivalWeapon("ak47");
      expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalled();
    });

    it("swaps without refill for owned weapon", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife", "ak47"];
      pickupSurvivalWeapon("ak47");
      expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalled();
    });

    it("syncs secondary slot for secondary weapon", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      purchaseOrEquipSurvivalWeapon("deagle", 700);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ secondary: "deagle" })
      );
    });

    it("syncs secondary slot for tec9", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      purchaseOrEquipSurvivalWeapon("tec9", 500);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ secondary: "tec9" })
      );
      expect(mockZombieStoreState.addPoints).toHaveBeenCalledWith(-500);
      expect(mockZombieStoreState.addPurchasedWeapon).toHaveBeenCalledWith("tec9");
    });

    it("syncs knife slot for melee weapon", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      purchaseOrEquipSurvivalWeapon("combatknife", 0);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ knife: "combatknife" })
      );
    });

    it("syncs primary slot for primary weapon", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 5000 };
      purchaseOrEquipSurvivalWeapon("ak47", 2700);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ primary: "ak47" })
      );
    });

    it("allows purchase when player points exactly match cost", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 4750 };
      const result = purchaseOrEquipSurvivalWeapon("awp", 4750);
      expect(result).toBe("bought");
      expect(mockZombieStoreState.addPoints).toHaveBeenCalledWith(-4750);
    });

    it("rejects purchase when player has 1 point less than cost", () => {
      mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
      mockZombieStoreState.player = { points: 4749 };
      const result = purchaseOrEquipSurvivalWeapon("awp", 4750);
      expect(result).toBe("cant_afford");
    });
  });

  describe("equipSurvivalWeapon", () => {
    it("fills ammo when fillNew is true for gun", () => {
      equipSurvivalWeapon("ak47", true, true);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ primary: "ak47" })
      );
      expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalledWith(
        "ak47",
        expect.objectContaining({ ammo: 30, reserveAmmo: 90, silent: true })
      );
    });

    it("does not fill ammo for melee weapon even when fillNew is true", () => {
      equipSurvivalWeapon("combatknife", true, false);
      expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith(
        expect.objectContaining({ knife: "combatknife" })
      );
      expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalledWith("combatknife", undefined);
    });
  });
});
