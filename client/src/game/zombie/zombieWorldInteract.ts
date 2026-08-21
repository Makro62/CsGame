import {
  AMMO_CRATE_POSITIONS,
  MED_STATION,
  PERK_MACHINE_POSITIONS,
  WALL_BUYS,
  ZOMBIE_INTERACT_RANGE,
  ZOMBIE_SHOP,
  ZombiePerkId,
} from "@cs-game/shared";

export function distXZ(x1: number, z1: number, x2: number, z2: number) {
  return Math.hypot(x1 - x2, z1 - z2);
}

export function isNearMedStation(x: number, z: number) {
  return distXZ(x, z, MED_STATION.x, MED_STATION.z) <= ZOMBIE_INTERACT_RANGE;
}

export function nearestWallBuy(x: number, z: number) {
  let best: { weapon: string; price: number; dist: number } | null = null;
  for (const buy of WALL_BUYS) {
    const dist = distXZ(x, z, buy.x, buy.z);
    if (dist > ZOMBIE_INTERACT_RANGE) continue;
    if (!best || dist < best.dist) {
      best = {
        weapon: buy.weapon,
        price: ZOMBIE_SHOP.weaponPrices[buy.weapon] ?? 0,
        dist,
      };
    }
  }
  return best;
}

export function nearestPerkMachine(x: number, z: number) {
  let best: { perk: ZombiePerkId; price: number; dist: number } | null = null;
  for (const machine of PERK_MACHINE_POSITIONS) {
    const dist = distXZ(x, z, machine.x, machine.z);
    if (dist > ZOMBIE_INTERACT_RANGE) continue;
    if (!best || dist < best.dist) {
      best = {
        perk: machine.perk,
        price: ZOMBIE_SHOP.perks[machine.perk].price,
        dist,
      };
    }
  }
  return best;
}

export function isNearAmmoCrate(x: number, z: number) {
  return AMMO_CRATE_POSITIONS.some(
    (crate) => distXZ(x, z, crate.x, crate.z) <= ZOMBIE_INTERACT_RANGE
  );
}
