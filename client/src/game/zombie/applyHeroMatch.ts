import { useZombieStore } from "../../stores/useZombieStore";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import type { HeroDefinition } from "./heroes";

export function applyHeroToMatch(hero: HeroDefinition, opts?: { silent?: boolean }) {
  const ws = useWeaponStore.getState();
  ws.setInfiniteAmmo(false);
  ws.resetUpgrades();
  ws.resetAmmoInventory();
  ws.syncLoadout({
    primary: hero.primaryWeapon as WeaponKey,
    secondary: hero.secondaryWeapon as WeaponKey,
    knife: hero.knifeWeapon as WeaponKey,
  });
  ws.equipWeapon(hero.primaryWeapon as WeaponKey, { silent: opts?.silent });
  useZombieStore.setState(s => ({
    player: {
      ...s.player,
      maxHp: hero.stats.maxHp,
      hp: hero.stats.maxHp,
      armor: hero.stats.armor,
    },
    purchasedWeapons: [hero.primaryWeapon, hero.secondaryWeapon, hero.knifeWeapon],
  }));
}
