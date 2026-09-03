/**
 * Alur: menu → pilih survivor → 4 chapter → horde/special → finale → menang/kalah → menu.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getL4DSurvivor, L4D_SURVIVOR_IDS } from "@src/game/l4d/l4dSurvivors";
import { useGameStore } from "@src/stores/useGameStore";
import { useL4DStore, type L4DInfected } from "@src/stores/useL4DStore";

function mkInf(overrides: Partial<L4DInfected> = {}): L4DInfected {
  return {
    id: "inf1",
    type: "common",
    x: 0, y: 0, z: 0,
    hp: 50, maxHp: 50,
    rotationY: 0,
    isDead: false,
    isAttacking: false,
    speed: 3.2,
    alerted: true,
    pinTarget: null,
    grabTarget: null,
    ...overrides,
  };
}

beforeEach(() => {
  useGameStore.getState().setMode("menu");
  useL4DStore.getState().resetCampaign(1);
});

describe("Alur kampanye L4D", () => {
  it("Coach: safe room → 4 chapter → specials → finale menang → menu", () => {
    expect(L4D_SURVIVOR_IDS).toEqual(expect.arrayContaining(["coach", "rochelle", "ellis", "nick"]));
    const coach = getL4DSurvivor("coach");
    expect(coach.ability).toBe("rally");
    expect(coach.stats.maxHp).toBe(120);

    useGameStore.getState().setMode("l4d");
    useL4DStore.getState().resetCampaign(1);
    let st = useL4DStore.getState();
    expect(st.chapter).toBe(1);
    expect(st.chapterState).toBe("safeRoom");
    expect(st.survivors).toHaveLength(4);
    expect(st.survivors[0].name).toBe("Coach");
    expect(st.survivors[0].isBot).toBe(false);

    useL4DStore.setState({ chapterState: "traverse" });
    useL4DStore.getState().addInfected(mkInf({ id: "c1", hp: 50 }));
    expect(useL4DStore.getState().damageInfected("c1", 20)).toBe(false);
    expect(useL4DStore.getState().damageInfected("c1", 40)).toBe(true);

    const hunterTarget = useL4DStore.getState().survivors[1];
    useL4DStore.getState().updateSurvivor(hunterTarget.id, (s) => ({ ...s, pinnedBy: "hunter1", isDowned: true }));
    useL4DStore.getState().addInfected(mkInf({ id: "hunter1", type: "hunter", hp: 10 }));
    useL4DStore.getState().damageInfected("hunter1", 20);
    expect(useL4DStore.getState().survivors.find((s) => s.id === hunterTarget.id)!.pinnedBy).toBeNull();

    useL4DStore.getState().addInfected(mkInf({ id: "boomer1", type: "boomer", hp: 10 }));
    useL4DStore.getState().damageInfected("boomer1", 20);
    expect(useL4DStore.getState().hordeActive).toBe(true);

    for (const chapter of [2, 3, 4] as const) {
      useL4DStore.getState().resetCampaign(chapter);
      expect(useL4DStore.getState().chapter).toBe(chapter);
      expect(useL4DStore.getState().chapterState).toBe("safeRoom");
      expect(useL4DStore.getState().infected).toHaveLength(0);
    }

    useL4DStore.setState({ chapterState: "finale" });
    useL4DStore.getState().setFinaleState("call_rescue", 10);
    useL4DStore.getState().setFinaleState("holdout", 20);
    useL4DStore.getState().setFinaleState("escape", 8);
    useL4DStore.getState().setFinaleState("completed");
    useL4DStore.getState().setVictory(true);
    st = useL4DStore.getState();
    expect(st.finaleState).toBe("completed");
    expect(st.isVictory).toBe(true);

    useL4DStore.getState().resetCampaign(1);
    useGameStore.getState().setMode("menu");
    expect(useGameStore.getState().mode).toBe("menu");
    expect(useL4DStore.getState().isVictory).toBe(false);
  });

  it("semua survivor downed → game over → menu", () => {
    useGameStore.getState().setMode("l4d");
    useL4DStore.getState().resetCampaign(2);
    expect(getL4DSurvivor("unknown").id).toBe("coach");

    for (const s of useL4DStore.getState().survivors) {
      useL4DStore.getState().updateSurvivor(s.id, (row) => ({ ...row, isDead: true, hp: 0 }));
    }
    expect(useL4DStore.getState().survivors.every((s) => s.isDead)).toBe(true);
    useL4DStore.getState().setGameOver(true);
    expect(useL4DStore.getState().isGameOver).toBe(true);

    useL4DStore.getState().resetCampaign(1);
    useGameStore.getState().setMode("menu");
    expect(useL4DStore.getState().isGameOver).toBe(false);
    expect(useGameStore.getState().mode).toBe("menu");
  });
});
