import { describe, it, expect, vi, beforeEach } from "vitest";
import { HEROES } from "../../../client/src/game/zombie/heroes";

const mockWeaponStoreState = {
  setInfiniteAmmo: vi.fn(),
  resetUpgrades: vi.fn(),
  resetAmmoInventory: vi.fn(),
  syncLoadout: vi.fn(),
  equipWeapon: vi.fn(),
};

const mockZombieStoreState = {
  player: { hp: 100, maxHp: 100, armor: 0 },
  purchasedWeapons: ["mp5", "glock", "knife"],
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
    setState: vi.fn((fn: any) => {
      const s = { ...mockZombieStoreState, player: { ...mockZombieStoreState.player } };
      const next = typeof fn === "function" ? fn(s) : fn;
      Object.assign(mockZombieStoreState, next);
      if (next.player) Object.assign(mockZombieStoreState.player, next.player);
    }),
  },
}));

import { applyHeroToMatch } from "../../../client/src/game/zombie/applyHeroMatch";

describe("applyHeroMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZombieStoreState.player = { hp: 100, maxHp: 100, armor: 0 };
    mockZombieStoreState.purchasedWeapons = ["mp5", "glock", "knife"];
  });

  it("applies nova7 hero to match", () => {
    applyHeroToMatch(HEROES.nova7);
    expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith({
      primary: "mp5",
      secondary: "glock",
      knife: "knife",
    });
    expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalledWith("mp5", { silent: undefined });
  });

  it("applies titan hero to match", () => {
    applyHeroToMatch(HEROES.titan);
    expect(mockWeaponStoreState.syncLoadout).toHaveBeenCalledWith({
      primary: "ak47",
      secondary: "deagle",
      knife: "knife",
    });
  });

  it("sets silent option when provided", () => {
    applyHeroToMatch(HEROES.nova7, { silent: true });
    expect(mockWeaponStoreState.equipWeapon).toHaveBeenCalledWith("mp5", { silent: true });
  });

  it("does nothing for null hero", () => {
    applyHeroToMatch(null as any);
    expect(mockWeaponStoreState.syncLoadout).not.toHaveBeenCalled();
  });

  it("does nothing for hero with invalid stats", () => {
    applyHeroToMatch({ ...HEROES.nova7, stats: { ...HEROES.nova7.stats, maxHp: -1 } } as any);
    expect(mockWeaponStoreState.syncLoadout).not.toHaveBeenCalled();
  });

  it("does nothing for hero with missing weapons", () => {
    applyHeroToMatch({ ...HEROES.nova7, primaryWeapon: "" } as any);
    expect(mockWeaponStoreState.syncLoadout).not.toHaveBeenCalled();
  });
});
