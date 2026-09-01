import { describe, it, expect, beforeEach } from "vitest";
import { useZombieStore } from "@src/stores/useZombieStore";

beforeEach(() => useZombieStore.getState().resetGame(true));

describe("useZombieStore — Operation Blackout doors & barricades", () => {
  describe("unlockDoor", () => {
    it("unlocks door and deducts points", () => {
      useZombieStore.getState().setPlayer((p) => ({ ...p, points: 2000 }));
      expect(useZombieStore.getState().unlockDoor("door_lab", 750)).toBe(true);
      expect(useZombieStore.getState().unlockedDoors).toContain("door_lab");
      expect(useZombieStore.getState().player.points).toBe(1250);
    });

    it("rejects if not enough points", () => {
      useZombieStore.getState().setPlayer((p) => ({ ...p, points: 100 }));
      expect(useZombieStore.getState().unlockDoor("door_lab", 750)).toBe(false);
      expect(useZombieStore.getState().unlockedDoors).not.toContain("door_lab");
    });

    it("rejects duplicate unlock", () => {
      useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
      useZombieStore.getState().unlockDoor("door_lab", 750);
      expect(useZombieStore.getState().unlockDoor("door_lab", 750)).toBe(false);
    });

    it("rejects NaN/negative cost", () => {
      useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
      expect(useZombieStore.getState().unlockDoor("door_lab", NaN)).toBe(false);
      expect(useZombieStore.getState().unlockDoor("door_lab", -100)).toBe(false);
    });

    it("resetGame clears unlockedDoors", () => {
      useZombieStore.getState().setPlayer((p) => ({ ...p, points: 5000 }));
      useZombieStore.getState().unlockDoor("door_lab", 750);
      useZombieStore.getState().resetGame(true);
      expect(useZombieStore.getState().unlockedDoors).toHaveLength(0);
    });
  });

  describe("barricades", () => {
    it("initial barricades are 6 planks each", () => {
      const b = useZombieStore.getState().barricades;
      expect(b.win_north).toBe(6);
      expect(b.win_south).toBe(6);
      expect(b.win_east).toBe(6);
      expect(b.win_west).toBe(6);
    });

    it("damageBarricade reduces planks", () => {
      useZombieStore.getState().damageBarricade("win_north", 1);
      expect(useZombieStore.getState().barricades.win_north).toBe(5);
      useZombieStore.getState().damageBarricade("win_north", 2);
      expect(useZombieStore.getState().barricades.win_north).toBe(3);
    });

    it("damageBarricade clamps at 0", () => {
      useZombieStore.getState().damageBarricade("win_north", 10);
      expect(useZombieStore.getState().barricades.win_north).toBe(0);
      useZombieStore.getState().damageBarricade("win_north", 1);
      expect(useZombieStore.getState().barricades.win_north).toBe(0);
    });

    it("repairBarricade adds 1 plank and +10 pts", () => {
      useZombieStore.getState().damageBarricade("win_north", 2); // 6->4
      const beforePts = useZombieStore.getState().player.points;
      expect(useZombieStore.getState().repairBarricade("win_north")).toBe(true);
      expect(useZombieStore.getState().barricades.win_north).toBe(5);
      expect(useZombieStore.getState().player.points).toBe(beforePts + 10);
    });

    it("repairBarricade rejects when already 6", () => {
      expect(useZombieStore.getState().repairBarricade("win_north")).toBe(false);
    });

    it("repairBarricade rejects when downed", () => {
      useZombieStore.getState().damageBarricade("win_north", 1);
      useZombieStore.getState().setPlayer((p) => ({ ...p, isDowned: true }));
      expect(useZombieStore.getState().repairBarricade("win_north")).toBe(false);
    });

    it("resetGame restores barricades to 6", () => {
      useZombieStore.getState().damageBarricade("win_north", 6);
      useZombieStore.getState().resetGame(true);
      expect(useZombieStore.getState().barricades.win_north).toBe(6);
    });
  });
});
