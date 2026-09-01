import { describe, expect, it, beforeEach } from "vitest";
import { getHero } from "@src/game/zombie/heroes";
import { applyHeroToMatch } from "@src/game/zombie/applyHeroMatch";
import { useHeroStore } from "@src/stores/useHeroStore";
import { useZombieStore } from "@src/stores/useZombieStore";
import { useWeaponStore } from "@src/stores/useWeaponStore";

describe("hero selection", () => {
  beforeEach(() => {
    useHeroStore.getState().selectHero("nova7");
    useZombieStore.getState().resetGame(true);
  });

  it("keeps Titan stats distinct from Nova-7", () => {
    expect(getHero("nova7").stats).toMatchObject({ maxHp: 100, damage: 25, speed: 5.4, armor: 0 });
    expect(getHero("titan").stats).toMatchObject({ maxHp: 150, damage: 35, speed: 4.6, armor: 25 });
  });

  it("updates the store when Titan is clicked", () => {
    useHeroStore.getState().selectHero("titan");
    const hero = useHeroStore.getState().hero;
    expect(hero.id).toBe("titan");
    expect(hero.stats.maxHp).toBe(150);
    expect(hero.ability).toBe("shield");
    expect(hero.primaryWeapon).toBe("ak47");
  });

  it("applies Titan HP, armor, and loadout after resetGame", () => {
    useHeroStore.getState().selectHero("titan");
    useZombieStore.getState().resetGame(true);
    applyHeroToMatch(useHeroStore.getState().hero, { silent: true });

    const player = useZombieStore.getState().player;
    expect(player.maxHp).toBe(150);
    expect(player.hp).toBe(150);
    expect(player.armor).toBe(25);
    expect(useZombieStore.getState().purchasedWeapons).toEqual(["ak47", "deagle", "knife"]);
    expect(useWeaponStore.getState().activeWeapon).toBe("ak47");
    expect(useWeaponStore.getState().primaryWeapon).toBe("ak47");
    expect(useWeaponStore.getState().secondaryWeapon).toBe("deagle");
  });
});