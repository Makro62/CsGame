import {
  GameState,
  PlayerState,
  WEAPONS,
  GEAR,
  ECONOMY,
  BuyRequest,
  BuyFailReason,
  isPrimaryWeapon,
  isSecondaryWeapon,
  isMeleeWeapon,
} from "@cs-game/shared";
import { ARMOR_VALUE } from "./constants";

const MAX_GRENADES_PER_TYPE = 4;

export type BuyResult =
  | { ok: true; item: string; slot: "weapon" | "gear"; currentWeapon: string }
  | { ok: false; reason: BuyFailReason };

export class EconomySystem {
  processBuy(sessionId: string, data: BuyRequest, state: GameState): BuyResult {
    const player = state.players.get(sessionId);
    if (!player) return { ok: false, reason: "unknown_item" };

    const item = data.item;

    const weaponStats = WEAPONS[item as keyof typeof WEAPONS];
    if (weaponStats) {
      if (weaponStats.team !== "both" && weaponStats.team !== player.team) {
        return { ok: false, reason: "wrong_team" };
      }
      if (this.alreadyOwnsWeapon(player, item)) {
        return { ok: false, reason: "already_owned" };
      }
      if (weaponStats.price > player.money) return { ok: false, reason: "no_money" };

      player.money -= weaponStats.price;

      // Park the ammo of the slot we are holding so switching back restores it.
      this.stashAmmoOfCurrentSlot(player);

      if (isPrimaryWeapon(item)) {
        player.primaryWeapon = item;
        player.primaryAmmo = weaponStats.mag;
        player.primaryReserveAmmo = weaponStats.reserveAmmo;
      } else if (isSecondaryWeapon(item)) {
        player.secondaryWeapon = item;
        player.secondaryAmmo = weaponStats.mag;
        player.secondaryReserveAmmo = weaponStats.reserveAmmo;
      } else if (isMeleeWeapon(item)) {
        player.knifeSlot = item;
      }

      // A rifle in hand outranks a fresh pistol or knife, so only auto-equip
      // when the purchase is an upgrade for the slot we are actually holding.
      const holdingPrimary =
        !!player.primaryWeapon && player.currentWeapon === player.primaryWeapon;
      if (isPrimaryWeapon(item) || !holdingPrimary) {
        player.currentWeapon = item;
        player.ammo = isMeleeWeapon(item) ? 0 : weaponStats.mag;
        player.reserveAmmo = isMeleeWeapon(item) ? 0 : weaponStats.reserveAmmo;
        player.isReloading = false;
      }

      return { ok: true, item, slot: "weapon", currentWeapon: player.currentWeapon };
    }

    const gearItem = GEAR[item as keyof typeof GEAR];
    if (!gearItem) return { ok: false, reason: "unknown_item" };

    const gear = gearItem as { price: number; team?: string };
    if (gear.team && gear.team !== player.team) return { ok: false, reason: "wrong_team" };

    const ownedReason = this.gearRejection(player, item);
    if (ownedReason) return { ok: false, reason: ownedReason };

    if (gear.price > player.money) return { ok: false, reason: "no_money" };

    player.money -= gear.price;

    if (item === "kevlar") {
      player.armor = ARMOR_VALUE;
    } else if (item === "helmet") {
      player.armor = ARMOR_VALUE;
      player.hasHelmet = true;
    } else if (item === "defuseKit") {
      player.hasDefuseKit = true;
    } else if (item === "grenadeHE") {
      player.grenadeHE = Math.min(player.grenadeHE + 1, MAX_GRENADES_PER_TYPE);
    } else if (item === "grenadeSmoke") {
      player.grenadeSmoke = Math.min(player.grenadeSmoke + 1, MAX_GRENADES_PER_TYPE);
    } else if (item === "grenadeFlash") {
      player.grenadeFlash = Math.min(player.grenadeFlash + 1, MAX_GRENADES_PER_TYPE);
    }

    return { ok: true, item, slot: "gear", currentWeapon: player.currentWeapon };
  }

  private alreadyOwnsWeapon(player: PlayerState, item: string): boolean {
    if (isPrimaryWeapon(item)) return player.primaryWeapon === item;
    if (isSecondaryWeapon(item)) return player.secondaryWeapon === item;
    if (isMeleeWeapon(item)) return player.knifeSlot === item;
    return false;
  }

  private gearRejection(player: PlayerState, item: string): BuyFailReason | null {
    if (item === "kevlar") {
      return player.armor >= ARMOR_VALUE ? "already_owned" : null;
    }
    if (item === "helmet") {
      return player.hasHelmet && player.armor >= ARMOR_VALUE ? "already_owned" : null;
    }
    if (item === "defuseKit") {
      return player.hasDefuseKit ? "already_owned" : null;
    }
    if (item === "grenadeHE") {
      return player.grenadeHE >= MAX_GRENADES_PER_TYPE ? "max_grenades" : null;
    }
    if (item === "grenadeSmoke") {
      return player.grenadeSmoke >= MAX_GRENADES_PER_TYPE ? "max_grenades" : null;
    }
    if (item === "grenadeFlash") {
      return player.grenadeFlash >= MAX_GRENADES_PER_TYPE ? "max_grenades" : null;
    }
    return null;
  }

  private stashAmmoOfCurrentSlot(player: PlayerState): void {
    if (player.primaryWeapon && player.currentWeapon === player.primaryWeapon) {
      player.primaryAmmo = player.ammo;
      player.primaryReserveAmmo = player.reserveAmmo;
    } else if (player.secondaryWeapon && player.currentWeapon === player.secondaryWeapon) {
      player.secondaryAmmo = player.ammo;
      player.secondaryReserveAmmo = player.reserveAmmo;
    }
  }

  giveRoundRewards(
    winner: "T" | "CT",
    state: GameState
  ): void {
    if (winner === "CT") {
      state.lossStreakT = Math.min(state.lossStreakT + 1, 3);
      state.lossStreakCT = 0;
    } else {
      state.lossStreakCT = Math.min(state.lossStreakCT + 1, 3);
      state.lossStreakT = 0;
    }

    state.players.forEach((p) => {
      const isWinner = p.team === winner;

      if (isWinner) {
        p.money = Math.min(p.money + ECONOMY.roundWinBonus, ECONOMY.maxMoney);
      } else {
        const streak = p.team === "T" ? state.lossStreakT : state.lossStreakCT;
        const bonus = streak >= 2 ? ECONOMY.lossBonus2 : ECONOMY.lossBonus1;
        p.money = Math.min(p.money + bonus, ECONOMY.maxMoney);
      }
    });
  }

  givePlantBonus(player: PlayerState): void {
    player.money = Math.min(player.money + ECONOMY.plantBonus, ECONOMY.maxMoney);
  }

  giveDefuseBonus(player: PlayerState): void {
    player.money = Math.min(player.money + ECONOMY.defuseBonus, ECONOMY.maxMoney);
  }
}
