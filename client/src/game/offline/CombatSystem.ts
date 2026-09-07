import { getWeaponStats } from "./EconomySystem";
import { applyBulletDamageToPlayer } from "./offlineDamage";
import type { LocalPlayer, KillEvent } from "./types";

export interface ShootResult {
  players: Map<string, LocalPlayer>;
  killFeed: KillEvent[];
  bombDropped?: boolean;
  bombDropX?: number;
  bombDropZ?: number;
  didHitEnemy: boolean;
  didKillEnemy: boolean;
}

export function executeLocalShoot(
  players: Map<string, LocalPlayer>,
  killFeed: KillEvent[],
  targetId: string | null,
  headshot: boolean
): ShootResult {
  const me = players.get("local");
  if (!me || me.isDead || me.isReloading) {
    return { players, killFeed, didHitEnemy: false, didKillEnemy: false };
  }

  const ws = getWeaponStats(me.currentWeapon);
  if (!ws) {
    return { players, killFeed, didHitEnemy: false, didKillEnemy: false };
  }

  const updatedPlayers = new Map(players);
  const newMe = { ...me };
  let newKillFeed = [...killFeed];
  let bombDropped: boolean | undefined;
  let bombDropX: number | undefined;
  let bombDropZ: number | undefined;
  let didHitEnemy = false;
  let didKillEnemy = false;

  if (targetId) {
    const victim = players.get(targetId);
    if (victim && !victim.isDead && victim.team !== me.team) {
      const newVictim = applyBulletDamageToPlayer(
        victim,
        ws.dmg,
        ws.headshot,
        headshot,
      );
      didHitEnemy = true;

      if (newVictim.hp <= 0) {
        newVictim.isDead = true;
        newMe.kills += 1;
        newVictim.deaths += 1;
        didKillEnemy = true;

        if (newVictim.hasBomb) {
          newVictim.hasBomb = false;
          bombDropped = true;
          bombDropX = newVictim.x;
          bombDropZ = newVictim.z;
        }

        const newEntry: KillEvent = {
          killerName: newMe.nickname,
          victimName: newVictim.nickname,
          weapon: newMe.currentWeapon,
          headshot,
          timestamp: Date.now(),
        };

        newKillFeed = newKillFeed.length >= 5
          ? [...newKillFeed.slice(1), newEntry]
          : [...newKillFeed, newEntry];
      }
      updatedPlayers.set(targetId, newVictim);
    }
  }

  updatedPlayers.set("local", newMe);

  return {
    players: updatedPlayers,
    killFeed: newKillFeed,
    bombDropped,
    bombDropX,
    bombDropZ,
    didHitEnemy,
    didKillEnemy,
  };
}
