import { describe, it, expect, beforeEach } from "vitest";
import { useL4DStore, type L4DInfected } from "@src/stores/useL4DStore";

function mkInf(overrides: Partial<L4DInfected> = {}): L4DInfected {
  return {
    id: "inf1", type: "common", x: 0, y: 0, z: 0,
    hp: 50, maxHp: 50, rotationY: 0, isDead: false,
    isAttacking: false, speed: 3.2, alerted: true,
    pinTarget: null, grabTarget: null, ...overrides,
  };
}

beforeEach(() => {
  useL4DStore.getState().resetCampaign(1);
});

describe("useL4DStore", () => {
  describe("resetCampaign", () => {
    it("resets to chapter 1 safeRoom", () => {
      useL4DStore.getState().setGameOver(true);
      useL4DStore.getState().resetCampaign(1);
      const st = useL4DStore.getState();
      expect(st.chapter).toBe(1);
      expect(st.chapterState).toBe("safeRoom");
      expect(st.isGameOver).toBe(false);
      expect(st.isVictory).toBe(false);
      expect(st.infected).toHaveLength(0);
      expect(st.survivors).toHaveLength(4);
    });

    it("preserves chapter if not specified", () => {
      useL4DStore.setState({ chapter: 3 });
      useL4DStore.getState().resetCampaign();
      expect(useL4DStore.getState().chapter).toBe(1);
    });
  });

  describe("damageInfected", () => {
    it("damages infected without killing", () => {
      const inf = mkInf({ id: "inf1", hp: 50 });
      useL4DStore.getState().addInfected(inf);
      const killed = useL4DStore.getState().damageInfected("inf1", 20);
      expect(killed).toBe(false);
      expect(useL4DStore.getState().infected.find(i => i.id === "inf1")!.hp).toBe(30);
    });

    it("kills infected when damage exceeds HP", () => {
      const inf = mkInf({ id: "inf1", hp: 50 });
      useL4DStore.getState().addInfected(inf);
      const killed = useL4DStore.getState().damageInfected("inf1", 60);
      expect(killed).toBe(true);
      expect(useL4DStore.getState().infected.find(i => i.id === "inf1")!.isDead).toBe(true);
    });

    it("returns false for non-existent infected", () => {
      const killed = useL4DStore.getState().damageInfected("nonexistent", 10);
      expect(killed).toBe(false);
    });

    it("returns false for already dead infected", () => {
      const inf = mkInf({ id: "inf1", hp: 50, isDead: true });
      useL4DStore.getState().addInfected(inf);
      const killed = useL4DStore.getState().damageInfected("inf1", 10);
      expect(killed).toBe(false);
    });

    it("boomer death triggers horde", () => {
      const inf = mkInf({ id: "boomer1", type: "boomer", hp: 10 });
      useL4DStore.getState().addInfected(inf);
      useL4DStore.getState().damageInfected("boomer1", 20);
      expect(useL4DStore.getState().hordeActive).toBe(true);
    });

    it("boomer death bile only affects nearby survivors", () => {
      const survivors = useL4DStore.getState().survivors;
      // Place survivor far away
      useL4DStore.getState().updateSurvivor(survivors[0].id, s => ({
        ...s, x: 999, z: 999,
      }));
      const inf = mkInf({ id: "boomer1", type: "boomer", hp: 10, x: 0, z: 0 });
      useL4DStore.getState().addInfected(inf);
      useL4DStore.getState().damageInfected("boomer1", 20);
      // Far survivor should not be biled
      const farSurvivor = useL4DStore.getState().survivors.find(s => s.x === 999)!;
      expect(farSurvivor.bileUntil).toBe(0);
    });

    it("hunter pin release frees survivor", () => {
      const survivors = useL4DStore.getState().survivors;
      const target = survivors[1];
      useL4DStore.getState().updateSurvivor(target.id, s => ({
        ...s, pinnedBy: "hunter1", isDowned: true,
      }));
      const inf = mkInf({ id: "hunter1", type: "hunter", hp: 10 });
      useL4DStore.getState().addInfected(inf);
      useL4DStore.getState().damageInfected("hunter1", 20);
      const updated = useL4DStore.getState().survivors.find(s => s.id === target.id)!;
      expect(updated.pinnedBy).toBeNull();
      expect(updated.isDowned).toBe(false);
    });

    it("smoker grab release frees survivor", () => {
      const survivors = useL4DStore.getState().survivors;
      const target = survivors[1];
      useL4DStore.getState().updateSurvivor(target.id, s => ({
        ...s, grabbedBy: "smoker1",
      }));
      const inf = mkInf({ id: "smoker1", type: "smoker", hp: 10 });
      useL4DStore.getState().addInfected(inf);
      useL4DStore.getState().damageInfected("smoker1", 20);
      const updated = useL4DStore.getState().survivors.find(s => s.id === target.id)!;
      expect(updated.grabbedBy).toBeNull();
    });
  });

  describe("updateSurvivor", () => {
    it("updates survivor by id", () => {
      const id = useL4DStore.getState().survivors[0].id;
      useL4DStore.getState().updateSurvivor(id, s => ({ ...s, hp: 50 }));
      expect(useL4DStore.getState().survivors.find(s => s.id === id)!.hp).toBe(50);
    });

    it("does not affect other survivors", () => {
      const id = useL4DStore.getState().survivors[0].id;
      const otherHp = useL4DStore.getState().survivors[1].hp;
      useL4DStore.getState().updateSurvivor(id, s => ({ ...s, hp: 50 }));
      expect(useL4DStore.getState().survivors[1].hp).toBe(otherHp);
    });
  });

  describe("setDirectorIntensity", () => {
    it("clamps to 0-100", () => {
      useL4DStore.getState().setDirectorIntensity(-10);
      expect(useL4DStore.getState().directorIntensity).toBe(0);
      useL4DStore.getState().setDirectorIntensity(150);
      expect(useL4DStore.getState().directorIntensity).toBe(100);
    });
  });

  describe("setPanic", () => {
    it("clamps to 0-100", () => {
      useL4DStore.getState().setPanic(-5);
      expect(useL4DStore.getState().panicLevel).toBe(0);
      useL4DStore.getState().setPanic(200);
      expect(useL4DStore.getState().panicLevel).toBe(100);
    });
  });

  describe("tickAbility", () => {
    it("decrements cooldown", () => {
      useL4DStore.setState({ abilityCooldownRemaining: 5 });
      useL4DStore.getState().tickAbility(2);
      expect(useL4DStore.getState().abilityCooldownRemaining).toBe(3);
    });

    it("does not go below 0", () => {
      useL4DStore.setState({ abilityCooldownRemaining: 1 });
      useL4DStore.getState().tickAbility(5);
      expect(useL4DStore.getState().abilityCooldownRemaining).toBe(0);
    });

    it("does nothing when cooldown is 0", () => {
      useL4DStore.setState({ abilityCooldownRemaining: 0 });
      useL4DStore.getState().tickAbility(1);
      expect(useL4DStore.getState().abilityCooldownRemaining).toBe(0);
    });
  });

  describe("resetAbility", () => {
    it("resets all ability state", () => {
      useL4DStore.setState({
        abilityCooldownRemaining: 5,
        sprintBoostUntil: 999,
        luckyShotUntil: 888,
      });
      useL4DStore.getState().resetAbility();
      expect(useL4DStore.getState().abilityCooldownRemaining).toBe(0);
      expect(useL4DStore.getState().sprintBoostUntil).toBe(0);
      expect(useL4DStore.getState().luckyShotUntil).toBe(0);
    });
  });

  describe("setFinaleState", () => {
    it("sets finaleState and timer", () => {
      useL4DStore.getState().setFinaleState("holdout", 30);
      expect(useL4DStore.getState().finaleState).toBe("holdout");
      expect(useL4DStore.getState().finaleTimer).toBe(30);
    });

    it("preserves existing timer when timer not provided", () => {
      useL4DStore.setState({ finaleTimer: 15 });
      useL4DStore.getState().setFinaleState("escape");
      expect(useL4DStore.getState().finaleTimer).toBe(15);
    });
  });

  describe("setHorde", () => {
    it("activates horde with timer", () => {
      useL4DStore.getState().setHorde(true, 20);
      expect(useL4DStore.getState().hordeActive).toBe(true);
      expect(useL4DStore.getState().hordeTimer).toBe(20);
    });

    it("preserves existing timer when timer not provided", () => {
      useL4DStore.setState({ hordeTimer: 15 });
      useL4DStore.getState().setHorde(true);
      expect(useL4DStore.getState().hordeTimer).toBe(15);
    });
  });

  describe("addInfected", () => {
    it("adds infected to list", () => {
      useL4DStore.getState().addInfected(mkInf({ id: "i1" }));
      useL4DStore.getState().addInfected(mkInf({ id: "i2" }));
      expect(useL4DStore.getState().infected).toHaveLength(2);
    });
  });
});
