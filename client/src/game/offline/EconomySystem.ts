import { WEAPONS, GEAR } from "@cs-game/shared";
import type { LocalPlayer } from "./types";

export function getWeaponStats(weapon: string) {
  return WEAPONS[weapon as keyof typeof WEAPONS];
}

export function executeLocalBuy(
  players: Map<string, LocalPlayer>,
  item: string
): { success: boolean; players: Map<string, LocalPlayer> } {
  const me = players.get("local");
  if (!me || me.isDead) return { success: false, players };

  const ws = getWeaponStats(item);
  const updatedPlayers = new Map(players);

  if (ws) {
    if (ws.price > me.money) return { success: false, players };
    if (ws.team !== "both" && ws.team !== me.team) return { success: false, players };

    const isPrimary = ["ak47", "m4a1", "awp", "mp5"].includes(item);
    const isSecondary = ["deagle", "glock", "tec9", "autopistol"].includes(item);

    if (isPrimary && me.primaryWeapon === item) return { success: false, players };
    if (isSecondary && me.secondaryWeapon === item) return { success: false, players };

    const newMe: LocalPlayer = {
      ...me,
      money: me.money - ws.price,
    };

    if (isPrimary) {
      newMe.primaryWeapon = item;
      newMe.currentWeapon = item;
      newMe.ammo = ws.mag;
      newMe.reserveAmmo = ws.reserveAmmo;
    } else if (isSecondary) {
      newMe.secondaryWeapon = item;
      newMe.currentWeapon = item;
      newMe.ammo = ws.mag;
      newMe.reserveAmmo = ws.reserveAmmo;
    }

    updatedPlayers.set("local", newMe);
    return { success: true, players: updatedPlayers };
  }

  if (item === "kevlar" && me.money >= GEAR.kevlar.price) {
    updatedPlayers.set("local", {
      ...me,
      armor: 100,
      money: me.money - GEAR.kevlar.price,
    });
    return { success: true, players: updatedPlayers };
  }

  if (item === "helmet" && me.money >= GEAR.helmet.price && !me.hasHelmet) {
    updatedPlayers.set("local", {
      ...me,
      hasHelmet: true,
      armor: 100,
      money: me.money - GEAR.helmet.price,
    });
    return { success: true, players: updatedPlayers };
  }

  if (item === "defuseKit" && me.money >= GEAR.defuseKit.price && me.team === "CT" && !me.hasDefuseKit) {
    updatedPlayers.set("local", {
      ...me,
      hasDefuseKit: true,
      money: me.money - GEAR.defuseKit.price,
    });
    return { success: true, players: updatedPlayers };
  }

  if (item === "grenadeHE" && me.money >= GEAR.grenadeHE.price && me.grenadeHE < 1) {
    updatedPlayers.set("local", {
      ...me,
      grenadeHE: me.grenadeHE + 1,
      money: me.money - GEAR.grenadeHE.price,
    });
    return { success: true, players: updatedPlayers };
  }

  if (item === "grenadeSmoke" && me.money >= GEAR.grenadeSmoke.price && me.grenadeSmoke < 1) {
    updatedPlayers.set("local", {
      ...me,
      grenadeSmoke: me.grenadeSmoke + 1,
      money: me.money - GEAR.grenadeSmoke.price,
    });
    return { success: true, players: updatedPlayers };
  }

  if (item === "grenadeFlash" && me.money >= GEAR.grenadeFlash.price && me.grenadeFlash < 2) {
    updatedPlayers.set("local", {
      ...me,
      grenadeFlash: me.grenadeFlash + 1,
      money: me.money - GEAR.grenadeFlash.price,
    });
    return { success: true, players: updatedPlayers };
  }

  return { success: false, players };
}
