import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("@src/components/AudioManager", () => ({ Sound: { deploy: vi.fn(), cancelReload: vi.fn() } }));
import { applyHeroToMatch } from "@src/game/zombie/applyHeroMatch";
import { useZombieStore } from "@src/stores/useZombieStore";
import { HEROES } from "@src/game/zombie/heroes";

beforeEach(() => useZombieStore.getState().resetGame(true));

describe("applyHeroMatch", () => {
  it("applies hero stats without crashing", () => {
    const hero = HEROES[Object.keys(HEROES)[0]];
    expect(() => applyHeroToMatch(hero)).not.toThrow();
    const s = useZombieStore.getState();
    expect(s.player.maxHp).toBe(hero.stats.maxHp);
    expect(s.player.hp).toBe(hero.stats.maxHp);
  });

  it("ignores null/undefined hero (previously crash)", () => {
    expect(() => applyHeroToMatch(null as never)).not.toThrow();
    expect(() => applyHeroToMatch(undefined as never)).not.toThrow();
  });

  it("ignores hero with missing stats", () => {
    expect(() => applyHeroToMatch({ primaryWeapon: "ak47" } as never)).not.toThrow();
  });

  it("ignores hero with invalid maxHp", () => {
    const bad = { stats: { maxHp: NaN, armor: 10 }, primaryWeapon: "ak47", secondaryWeapon: "glock", knifeWeapon: "knife" } as never;
    const before = useZombieStore.getState().player.maxHp;
    applyHeroToMatch(bad);
    expect(useZombieStore.getState().player.maxHp).toBe(before);
  });

  it("ignores hero with negative armor", () => {
    const bad = { stats: { maxHp: 100, armor: -5 }, primaryWeapon: "ak47", secondaryWeapon: "glock", knifeWeapon: "knife" } as never;
    const before = useZombieStore.getState().player.armor;
    applyHeroToMatch(bad);
    expect(useZombieStore.getState().player.armor).toBe(before);
  });
});
