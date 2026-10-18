import { describe, it, expect, beforeEach } from "vitest";
import { useZombieStore } from "../../client/src/stores/useZombieStore";

describe("useZombieStore", () => {
  beforeEach(() => {
    useZombieStore.getState().resetGame(true);
  });

  describe("initial state", () => {
    it("initializes with arcade camera perspective", () => {
      expect(useZombieStore.getState().cameraPerspective).toBe("arcade");
    });

    it("initializes with default doors unlocked", () => {
      const doors = useZombieStore.getState().unlockedDoors;
      expect(doors).toContain("door_lab");
      expect(doors).toContain("door_armory");
      expect(doors).toContain("door_catwalk");
      expect(doors).toContain("door_bunker");
    });

    it("initializes at stage 1 with gates closed", () => {
      const state = useZombieStore.getState();
      expect(state.currentStage).toBe(1);
      expect(state.unlockedStages).toBe(1);
      expect(state.gate1Open).toBe(false);
      expect(state.gate2Open).toBe(false);
      expect(state.stageBreakActive).toBe(false);
      expect(state.stageBreakTimer).toBe(0);
    });

    it("initializes with starter weapons and full barricades", () => {
      const state = useZombieStore.getState();
      expect(state.purchasedWeapons).toEqual(["mp5", "glock", "knife"]);
      expect(state.barricades.win_north).toBe(6);
      expect(state.barricades.win_south).toBe(6);
    });
  });

  describe("camera perspective toggle", () => {
    it("toggles between arcade and fps", () => {
      expect(useZombieStore.getState().cameraPerspective).toBe("arcade");
      useZombieStore.getState().toggleCameraPerspective();
      expect(useZombieStore.getState().cameraPerspective).toBe("fps");
      useZombieStore.getState().toggleCameraPerspective();
      expect(useZombieStore.getState().cameraPerspective).toBe("arcade");
    });
  });

  describe("Survivor Campaign stages and breaks", () => {
    it("starts stage 1 break, opens gate 1, and heals player", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, hp: 40, armor: 10 }));
      useZombieStore.getState().startStageBreak(1);

      const state = useZombieStore.getState();
      expect(state.stageBreakActive).toBe(true);
      expect(state.stageBreakTimer).toBe(15);
      expect(state.gate1Open).toBe(true);
      expect(state.unlockedStages).toBe(2);
      expect(state.stageBanner).toContain("STAGE 1 BERSIH");
      expect(state.player.hp).toBe(100);
      expect(state.player.armor).toBe(40); // 10 + 30
    });

    it("starts stage 2 break, opens gate 2, and unlocks stage 3", () => {
      useZombieStore.getState().startStageBreak(2);

      const state = useZombieStore.getState();
      expect(state.stageBreakActive).toBe(true);
      expect(state.gate2Open).toBe(true);
      expect(state.unlockedStages).toBe(3);
      expect(state.stageBanner).toContain("STAGE 2 BERSIH");
    });

    it("advances to next stage and clears break state", () => {
      useZombieStore.getState().startStageBreak(1);
      useZombieStore.getState().advanceToNextStage();

      const state = useZombieStore.getState();
      expect(state.currentStage).toBe(2);
      expect(state.stageBreakActive).toBe(false);
      expect(state.stageBreakTimer).toBe(0);
      expect(state.stageBanner).toBeNull();
      expect(state.gate1Open).toBe(true);
    });

    it("skipBreak advances to next stage immediately", () => {
      useZombieStore.getState().startStageBreak(1);
      useZombieStore.getState().skipBreak();

      const state = useZombieStore.getState();
      expect(state.currentStage).toBe(2);
      expect(state.stageBreakActive).toBe(false);
    });

    it("caps currentStage at 3", () => {
      useZombieStore.setState({ currentStage: 3 });
      useZombieStore.getState().advanceToNextStage();
      expect(useZombieStore.getState().currentStage).toBe(3);
    });

    it("manages stageBreakTimer clamping", () => {
      useZombieStore.getState().setStageBreakTimer(10);
      expect(useZombieStore.getState().stageBreakTimer).toBe(10);
      useZombieStore.getState().setStageBreakTimer(-5);
      expect(useZombieStore.getState().stageBreakTimer).toBe(0);
    });

    it("sets gate states and banners directly", () => {
      useZombieStore.getState().setGate1Open(true);
      expect(useZombieStore.getState().gate1Open).toBe(true);
      useZombieStore.getState().setGate2Open(true);
      expect(useZombieStore.getState().gate2Open).toBe(true);
      useZombieStore.getState().setStageBanner("TEST BANNER");
      expect(useZombieStore.getState().stageBanner).toBe("TEST BANNER");
    });
  });

  describe("stage perks", () => {
    it("claims stage perk and applies titan_armor bonus", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, hp: 20, armor: 0 }));
      useZombieStore.getState().claimStagePerk("titan_armor");

      const state = useZombieStore.getState();
      expect(state.stagePerks).toContain("titan_armor");
      expect(state.player.armor).toBe(100);
      expect(state.player.hp).toBe(100);
    });

    it("prevents claiming duplicate stage perks", () => {
      useZombieStore.getState().claimStagePerk("hollow_point");
      useZombieStore.getState().claimStagePerk("hollow_point");
      expect(useZombieStore.getState().stagePerks.filter(p => p === "hollow_point")).toHaveLength(1);
    });
  });

  describe("weapons, points, and upgrades", () => {
    it("adds purchased weapon without duplicates", () => {
      useZombieStore.getState().addPurchasedWeapon("tec9");
      expect(useZombieStore.getState().purchasedWeapons).toContain("tec9");
      useZombieStore.getState().addPurchasedWeapon("tec9");
      expect(useZombieStore.getState().purchasedWeapons.filter(w => w === "tec9")).toHaveLength(1);
    });

    it("adds and subtracts points safely", () => {
      const init = useZombieStore.getState().player.points;
      useZombieStore.getState().addPoints(300);
      expect(useZombieStore.getState().player.points).toBe(init + 300);
      useZombieStore.getState().addPoints(-100);
      expect(useZombieStore.getState().player.points).toBe(init + 200);
      useZombieStore.getState().addPoints(NaN);
      expect(useZombieStore.getState().player.points).toBe(init + 200);
    });

    it("doubles positive points when double_points power-up is active", () => {
      const init = useZombieStore.getState().player.points;
      useZombieStore.getState().setPlayer(p => {
        p.activePowerUps.set("double_points", 30);
        return p;
      });
      useZombieStore.getState().addPoints(200);
      expect(useZombieStore.getState().player.points).toBe(init + 400);
    });

    it("upgrades weapon tier up to tier 3", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 5000 }));
      const up1 = useZombieStore.getState().upgradeWeaponTier("ak47", 1000);
      expect(up1).toBe(true);
      expect(useZombieStore.getState().player.weaponTiers.ak47).toBe(1);
      expect(useZombieStore.getState().player.points).toBe(4000);

      useZombieStore.getState().upgradeWeaponTier("ak47", 1000);
      useZombieStore.getState().upgradeWeaponTier("ak47", 1000);
      expect(useZombieStore.getState().player.weaponTiers.ak47).toBe(3);

      // Attempt tier 4 should fail
      const up4 = useZombieStore.getState().upgradeWeaponTier("ak47", 1000);
      expect(up4).toBe(false);
      expect(useZombieStore.getState().player.weaponTiers.ak47).toBe(3);
    });

    it("adds perks if affordable and not duplicate", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 3000 }));
      const buy1 = useZombieStore.getState().addPerk("juggernog", 2500);
      expect(buy1).toBe(true);
      expect(useZombieStore.getState().player.perks).toContain("juggernog");
      expect(useZombieStore.getState().player.points).toBe(500);

      // Duplicate fails
      const buyDup = useZombieStore.getState().addPerk("juggernog", 500);
      expect(buyDup).toBe(false);

      // Insufficient points fails
      const buyExp = useZombieStore.getState().addPerk("speed_cola", 2000);
      expect(buyExp).toBe(false);
    });
  });

  describe("barricades and door interactions", () => {
    it("damages and repairs barricades", () => {
      useZombieStore.getState().damageBarricade("win_north", 2);
      expect(useZombieStore.getState().barricades.win_north).toBe(4);

      const initPts = useZombieStore.getState().player.points;
      const rep = useZombieStore.getState().repairBarricade("win_north");
      expect(rep).toBe(true);
      expect(useZombieStore.getState().barricades.win_north).toBe(5);
      expect(useZombieStore.getState().player.points).toBe(initPts + 10);
    });

    it("cannot repair barricade when already at 6", () => {
      const rep = useZombieStore.getState().repairBarricade("win_south");
      expect(rep).toBe(false);
    });

    it("unlocks new doors with cost", () => {
      useZombieStore.getState().setPlayer(p => ({ ...p, points: 2000 }));
      const ok = useZombieStore.getState().unlockDoor("custom_sector_door", 750);
      expect(ok).toBe(true);
      expect(useZombieStore.getState().unlockedDoors).toContain("custom_sector_door");
      expect(useZombieStore.getState().player.points).toBe(1250);
    });
  });

  describe("resetGame", () => {
    it("resets all state to initial values", () => {
      useZombieStore.getState().toggleCameraPerspective();
      useZombieStore.getState().startStageBreak(1);
      useZombieStore.getState().addPurchasedWeapon("awp");

      useZombieStore.getState().resetGame(true);

      const state = useZombieStore.getState();
      expect(state.cameraPerspective).toBe("arcade");
      expect(state.currentStage).toBe(1);
      expect(state.stageBreakActive).toBe(false);
      expect(state.gate1Open).toBe(false);
      expect(state.purchasedWeapons).toEqual(["mp5", "glock", "knife"]);
    });
  });
});
