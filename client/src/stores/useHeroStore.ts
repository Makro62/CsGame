import { create } from "zustand";
import { type HeroDefinition, getHero } from "../game/zombie/heroes";

interface HeroState {
  selectedHeroId: string;
  hero: HeroDefinition;
  abilityReady: boolean;
  abilityCooldownRemaining: number;
  selectHero: (id: string) => void;
  triggerAbility: () => boolean;
  tickCooldown: (dt: number) => void;
  resetAbility: () => void;
}

export const useHeroStore = create<HeroState>((set, get) => ({
  selectedHeroId: "nova7",
  hero: getHero("nova7"),
  abilityReady: true,
  abilityCooldownRemaining: 0,

  selectHero: (id) => {
    const hero = getHero(id);
    set({ selectedHeroId: id, hero, abilityReady: true, abilityCooldownRemaining: 0 });
  },

  triggerAbility: () => {
    const state = get();
    if (!state.abilityReady) return false;
    set({ abilityReady: false, abilityCooldownRemaining: state.hero.abilityCooldown });
    return true;
  },

  tickCooldown: (dt) => {
    const state = get();
    if (state.abilityReady) return;
    const next = state.abilityCooldownRemaining - dt;
    if (next <= 0) {
      set({ abilityReady: true, abilityCooldownRemaining: 0 });
    } else {
      set({ abilityCooldownRemaining: next });
    }
  },

  resetAbility: () => set({ abilityReady: true, abilityCooldownRemaining: 0 }),
}));
