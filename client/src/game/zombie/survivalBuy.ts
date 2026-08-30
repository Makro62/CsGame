import {
  WEAPONS,
  isMeleeWeapon,
  isPrimaryWeapon,
  isSecondaryWeapon,
} from "@cs-game/shared";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import { useZombieStore } from "../../stores/useZombieStore";

export type SurvivalBuyResult =
  | "already_equipped"
  | "equipped"
  | "bought"
  | "cant_afford";

function putWeaponInLoadout(id: WeaponKey) {
  const ws = useWeaponStore.getState();
  const primary = (ws.primaryWeapon ?? "mp5") as string;
  const secondary = (ws.secondaryWeapon ?? "glock") as string;
  const knife = (ws.knifeSlot ?? "knife") as string;

  if (isPrimaryWeapon(id)) {
    ws.syncLoadout({ primary: id, secondary, knife });
  } else if (isSecondaryWeapon(id)) {
    ws.syncLoadout({ primary, secondary: id, knife });
  } else if (isMeleeWeapon(id)) {
    ws.syncLoadout({ primary, secondary, knife: id });
  }
}

/** Draw a survival weapon into its slot. New guns come with a full magazine. */
export function equipSurvivalWeapon(id: WeaponKey, fillNew: boolean, silent = false) {
  putWeaponInLoadout(id);
  const stats = WEAPONS[id];
  const ws = useWeaponStore.getState();
  if (fillNew && stats && !isMeleeWeapon(id)) {
    ws.equipWeapon(id, { ammo: stats.mag, reserveAmmo: stats.reserveAmmo, silent });
    return;
  }
  ws.equipWeapon(id, silent ? { silent: true } : undefined);
}

/**
 * Shop action: never charge twice for a gun already in `purchasedWeapons`.
 * Owned + equipped → no-op. Owned → free swap. Else spend points and fill ammo.
 */
export function purchaseOrEquipSurvivalWeapon(
  id: WeaponKey,
  cost: number,
): SurvivalBuyResult {
  const st = useZombieStore.getState();
  const ws = useWeaponStore.getState();
  if (ws.activeWeapon === id) return "already_equipped";

  if (st.purchasedWeapons.includes(id)) {
    equipSurvivalWeapon(id, false, true);
    return "equipped";
  }

  if (st.player.points < cost) return "cant_afford";
  if (cost > 0) st.addPoints(-cost);
  st.addPurchasedWeapon(id);
  equipSurvivalWeapon(id, true, true);
  return "bought";
}

/** Ground loot: unlock if new (full mag), otherwise just swap to the owned gun. */
export function pickupSurvivalWeapon(id: WeaponKey) {
  const st = useZombieStore.getState();
  const isNew = !st.purchasedWeapons.includes(id);
  st.addPurchasedWeapon(id);
  equipSurvivalWeapon(id, isNew);
}
