import {
  GameState,
  PlayerState,
  WEAPONS,
  GEAR,
  ECONOMY,
  BuyRequest,
} from "@cs-game/shared";
import { ARMOR_VALUE } from "./constants";

export class EconomySystem {
  processBuy(
    sessionId: string,
    data: BuyRequest,
    state: GameState,
    broadcast: (type: string, message: any) => void
  ): void {
    const player = state.players.get(sessionId);
    if (!player) return;

    const item = data.item;

    const weaponStats = WEAPONS[item as keyof typeof WEAPONS];
    if (weaponStats) {
      if (weaponStats.price > player.money) return;
      if (weaponStats.team !== "both" && weaponStats.team !== player.team) return;

      player.money -= weaponStats.price;

      const isPrimary = ["ak47", "m4a1", "awp", "mp5"].includes(item);
      const isSecondary = ["deagle", "glock", "tec9", "autopistol"].includes(item);
      const isKnife = ["knife", "combatknife"].includes(item);

      if (isPrimary) {
        player.primaryWeapon = item;
      } else if (isSecondary) {
        player.secondaryWeapon = item;
      } else if (isKnife) {
        player.knifeSlot = item;
      }

      player.currentWeapon = item;
      player.ammo = weaponStats.mag;
      player.reserveAmmo = weaponStats.reserveAmmo;
      player.isReloading = false;

      broadcast("itemBought", { playerId: sessionId, item, slot: "weapon" });
      return;
    }

    const gearItem = GEAR[item as keyof typeof GEAR];
    if (gearItem) {
      const gear = gearItem as { price: number; team?: string };
      if (gear.price > player.money) return;
      if (gear.team && gear.team !== player.team) return;

      player.money -= gear.price;

      if (item === "kevlar") {
        player.armor = ARMOR_VALUE;
      } else if (item === "helmet") {
        player.armor = ARMOR_VALUE;
        player.hasHelmet = true;
      } else if (item === "defuseKit") {
        player.hasDefuseKit = true;
      } else if (item === "grenadeHE") {
        player.grenadeHE = Math.min(player.grenadeHE + 1, 4);
      } else if (item === "grenadeSmoke") {
        player.grenadeSmoke = Math.min(player.grenadeSmoke + 1, 4);
      } else if (item === "grenadeFlash") {
        player.grenadeFlash = Math.min(player.grenadeFlash + 1, 4);
      }

      broadcast("itemBought", { playerId: sessionId, item, slot: "gear" });
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
