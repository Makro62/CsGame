import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStore } from "../../client/src/stores/useProgressStore";
import { XP, levelFromXp } from "../../client/src/game/progress/xp";

function resetStore() {
  useProgressStore.setState({
    totalXp: 0,
    level: 1,
    kills: 0,
    deaths: 0,
    headshots: 0,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    rankPoints: 0,
    trainingBests: { aimBestKills: 0, recoilBestBurst: 0 },
    unlockedWeapons: [],
    unlockedCosmetics: [],
    recentUnlock: null,
    lastLevelUp: null,
  });
}

describe("useProgressStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("adds xp and recomputes level", () => {
    useProgressStore.getState().addXp(100);
    const s = useProgressStore.getState();
    expect(s.totalXp).toBe(100);
    expect(s.level).toBe(levelFromXp(100));
  });

  it("records kill with headshot bonus", () => {
    useProgressStore.getState().recordKill({ headshot: true });
    const s = useProgressStore.getState();
    expect(s.kills).toBe(1);
    expect(s.headshots).toBe(1);
    expect(s.totalXp).toBe(XP.kill + XP.headshotBonus);
  });

  it("records death", () => {
    useProgressStore.getState().recordDeath();
    expect(useProgressStore.getState().deaths).toBe(1);
  });

  it("records match win/loss with rank points", () => {
    useProgressStore.getState().recordMatchResult(true);
    let s = useProgressStore.getState();
    expect(s.wins).toBe(1);
    expect(s.rankPoints).toBe(25);
    expect(s.matchesPlayed).toBe(1);
    expect(s.totalXp).toBe(XP.matchWin);

    resetStore();
    useProgressStore.getState().recordMatchResult(false);
    s = useProgressStore.getState();
    expect(s.losses).toBe(1);
    expect(s.rankPoints).toBe(0);
    expect(s.totalXp).toBe(XP.matchLoss);
  });

  it("records training bests as max", () => {
    useProgressStore.getState().recordTrainingScore("aim", 8);
    useProgressStore.getState().recordTrainingScore("aim", 5);
    useProgressStore.getState().recordTrainingScore("recoil", 30);
    useProgressStore.getState().recordTrainingScore("recoil", 12);
    const s = useProgressStore.getState();
    expect(s.trainingBests.aimBestKills).toBe(8);
    expect(s.trainingBests.recoilBestBurst).toBe(30);
  });

  it("sets lastLevelUp when level increases", () => {
    useProgressStore.getState().addXp(100);
    expect(useProgressStore.getState().lastLevelUp).toBe(2);
    useProgressStore.getState().clearLevelUp();
    expect(useProgressStore.getState().lastLevelUp).toBeNull();
  });

  it("unlocks weapons at level milestones", () => {
    useProgressStore.getState().addXp(xpForLevel(7));
    const s = useProgressStore.getState();
    expect(s.unlockedWeapons).toContain("ssg");
    expect(s.unlockedWeapons).toContain("aug");
    expect(s.unlockedWeapons).toContain("fiveseven");
  });
});

function xpForLevel(level: number): number {
  return 100 * (level - 1) * (level - 1);
}
