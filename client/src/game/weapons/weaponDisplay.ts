import { WEAPONS } from "@cs-game/shared";

type WeaponId = keyof typeof WEAPONS;

const META: Record<string, { label: string; type: string; icon: string; slot: string }> = {
  glock: { label: "Glock-18", type: "Pistol", icon: "🔫", slot: "2" },
  deagle: { label: "Desert Eagle .50", type: "Heavy Pistol", icon: "💥", slot: "2" },
  tec9: { label: "Tec-9", type: "Pistol", icon: "🔫", slot: "2" },
  autopistol: { label: "USP-S", type: "Pistol", icon: "🔫", slot: "2" },
  mp5: { label: "MP5-SD Tactical", type: "SMG", icon: "⚡", slot: "1" },
  ak47: { label: "AK-47 Rifle", type: "Assault Rifle", icon: "🎯", slot: "1" },
  m4a1: { label: "M4A1-S Silenced", type: "Assault Rifle", icon: "🎯", slot: "1" },
  awp: { label: "AWP Magnum", type: "Sniper Rifle", icon: "🔭", slot: "1" },
  knife: { label: "Combat Knife", type: "Melee", icon: "🔪", slot: "3" },
  combatknife: { label: "Combat Knife", type: "Melee", icon: "🔪", slot: "3" },
  arccaster: { label: "Arc Caster", type: "Wonder Weapon", icon: "⚡", slot: "1" },
  he: { label: "HE Grenade", type: "Grenade", icon: "💣", slot: "4" },
  smoke: { label: "Smoke Grenade", type: "Grenade", icon: "💨", slot: "4" },
  flash: { label: "Flashbang", type: "Grenade", icon: "✨", slot: "4" },
};

export function weaponDisplay(id: string | null | undefined) {
  const key = (id ?? "") as WeaponId;
  const stats = id && id in WEAPONS ? WEAPONS[key] : null;
  const meta = META[id ?? ""] ?? {
    label: (id ?? "—").toUpperCase(),
    type: "Weapon",
    icon: "🔫",
    slot: "1",
  };
  return {
    ...meta,
    dmg: stats?.dmg ?? 0,
    mag: stats?.mag ?? 0,
    reserveAmmo: stats?.reserveAmmo ?? 0,
  };
}
