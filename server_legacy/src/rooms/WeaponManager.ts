import {
  GameState,
  PlayerState,
  WEAPONS,
  MAP_OBSTACLES,
  MAP_BOUNDARY,
  MELEE,
  ShootInput,
} from "@cs-game/shared";
import { rayVsBox } from "../utils/geometry";
import {
  MAX_ORIGIN_DISTANCE_SQ,
  FIRE_RATE_TOLERANCE,
  SPAWN_PROTECTION_MS,
  HEAD_HEIGHT_THRESHOLD,
  PERP_DISTANCE_THRESHOLD_SQ,
  ARMOR_DAMAGE_MULTIPLIER,
  AWP_MAX_RANGE,
  DEFAULT_MAX_RANGE,
} from "./constants";

const MAX_PIERCE = 2;
const MAX_REWIND_MS = 200;  // Audit: reduced from 500ms to 200ms (6-7 ticks at 30Hz)
const HISTORY_WINDOW_MS = 500;

interface PositionSample {
  t: number;
  x: number;
  z: number;
}

interface HitResult {
  victimId: string;
  zone: "head" | "torso" | "limbs";
  distance: number;
  wallbangFactor: number;
}

export interface MeleeHitResult {
  victimId: string;
  distance: number;
  backstab: boolean;
}

export class WeaponManager {
  private lastFireTime: Map<string, number> = new Map();
  private shootHistory: Map<string, PositionSample[]> = new Map();
  private reloadTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private serverRTT: Map<string, number> = new Map();
  private pingTimestamps: Map<string, number> = new Map();
  private lastInputMessageTime: Map<string, number> = new Map();

  canFire(sessionId: string, weaponKey: string): boolean {
    const weaponStats = WEAPONS[weaponKey as keyof typeof WEAPONS];
    if (!weaponStats) return false;

    const now = performance.now();
    const lastFire = this.lastFireTime.get(sessionId) || 0;
    const minInterval = 1000 / weaponStats.fireRate;
    if (now - lastFire < minInterval * FIRE_RATE_TOLERANCE) return false;

    return true;
  }

  recordFire(sessionId: string): void {
    this.lastFireTime.set(sessionId, performance.now());
  }

  getLastFireTime(sessionId: string): number {
    return this.lastFireTime.get(sessionId) || 0;
  }

  validateShootOrigin(
    shooter: PlayerState,
    data: ShootInput
  ): boolean {
    const ox = data.origin.x - shooter.x;
    const oy = data.origin.y - (shooter.y + 1.6);
    const oz = data.origin.z - shooter.z;
    if (ox * ox + oy * oy + oz * oz > MAX_ORIGIN_DISTANCE_SQ) return false;

    if (
      data.origin.x < MAP_BOUNDARY.minX ||
      data.origin.x > MAP_BOUNDARY.maxX ||
      data.origin.z < MAP_BOUNDARY.minZ ||
      data.origin.z > MAP_BOUNDARY.maxZ
    ) {
      return false;
    }

    if (data.direction) {
      const dirLenSq =
        (data.direction.x || 0) ** 2 +
        (data.direction.y || 0) ** 2 +
        (data.direction.z || 0) ** 2;
      if (dirLenSq > 0 && (dirLenSq < 0.5 || dirLenSq > 2.0)) {
        return false;
      }
    }

    return true;
  }

  isSpawnProtected(spawnProtection: Map<string, number>, victimId: string): boolean {
    const spawnTime = spawnProtection.get(victimId);
    return spawnTime !== undefined && performance.now() - spawnTime < SPAWN_PROTECTION_MS;
  }

  recordPosition(sessionId: string, player: PlayerState, now: number): void {
    let history = this.shootHistory.get(sessionId);
    if (!history) {
      history = [];
      this.shootHistory.set(sessionId, history);
    }
    history.push({ t: now, x: player.x, z: player.z });
    while (history.length > 60) {
      history.shift();
    }
    while (history.length > 0 && now - history[0].t > HISTORY_WINDOW_MS) {
      history.shift();
    }
  }

  private samplePosition(
    sessionId: string,
    targetTime: number
  ): { x: number; z: number } | null {
    const history = this.shootHistory.get(sessionId);
    if (!history || history.length === 0) return null;

    const last = history[history.length - 1];
    if (targetTime >= last.t) return { x: last.x, z: last.z };

    for (let i = history.length - 2; i >= 0; i--) {
      const a = history[i];
      const b = history[i + 1];
      if (targetTime >= a.t && targetTime <= b.t) {
        const t = (targetTime - a.t) / (b.t - a.t);
        return {
          x: a.x + (b.x - a.x) * t,
          z: a.z + (b.z - a.z) * t,
        };
      }
    }
    return { x: history[0].x, z: history[0].z };
  }

  checkHit(
    shooterId: string,
    shooter: PlayerState,
    data: ShootInput,
    state: GameState
  ): HitResult | null {
    const now = performance.now();
    const shooterPos = { x: shooter.x, y: shooter.y + 1.6, z: shooter.z };
    const dir = data.direction;
    const dirLength = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (dirLength === 0) return null;

    const normDir = { x: dir.x / dirLength, y: dir.y / dirLength, z: dir.z / dirLength };

    const serverRTT = this.serverRTT.get(shooterId) || 0;
    const clientLatency = Math.max(0, data.latency ?? 0);
    const latency = serverRTT > 0
      ? Math.min(clientLatency, serverRTT * 1.5, MAX_REWIND_MS)
      : Math.min(clientLatency, MAX_REWIND_MS);
    const targetTime = now - latency;

    let closestHit: HitResult | null = null;

    state.players.forEach((player, id) => {
      if (id === shooterId || player.isDead) return;
      if (state.gameMode !== "ffa" && player.team === shooter.team) return;

      const rewound = this.samplePosition(id, targetTime);
      const targetX = rewound ? rewound.x : player.x;
      const targetZ = rewound ? rewound.z : player.z;

      const dx = targetX - shooterPos.x;
      const dy = player.y - shooterPos.y;
      const dz = targetZ - shooterPos.z;

      const weaponKey = shooter.currentWeapon as keyof typeof WEAPONS;
      const maxRange = weaponKey === "awp" ? AWP_MAX_RANGE : DEFAULT_MAX_RANGE;
      const distToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distToTarget > maxRange) return;

      const dot = dx * normDir.x + (dy + 0.9) * normDir.y + dz * normDir.z;
      if (dot <= 0) return;

      const closestX = shooterPos.x + normDir.x * dot;
      const closestY = shooterPos.y + normDir.y * dot;
      const closestZ = shooterPos.z + normDir.z * dot;

      const perpDx = targetX - closestX;
      const perpDz = targetZ - closestZ;
      const perpDistSq = perpDx * perpDx + perpDz * perpDz;

      if (perpDistSq > PERP_DISTANCE_THRESHOLD_SQ) return;

      const relY = closestY - player.y;
      if (relY < -0.2 || relY > 2.0) return;

      // Crouch hitbox compression: 50% vertical when crouching
      const crouchMult = player.isCrouching ? 0.5 : 1.0;
      const headThreshold = 1.35 * crouchMult;
      const limbsThreshold = HEAD_HEIGHT_THRESHOLD * crouchMult;

      let zone: "head" | "torso" | "limbs" = "torso";
      if (relY >= headThreshold) zone = "head";
      else if (relY <= limbsThreshold) zone = "limbs";

      let pierce = 0;
      let wallbangFactor = 1;

      for (const obs of MAP_OBSTACLES) {
        const t = rayVsBox(
          shooterPos.x, shooterPos.y, shooterPos.z,
          normDir.x, normDir.y, normDir.z,
          obs
        );
        if (t === null) continue;
        if (t > dot) continue;

        if (obs.material === "wood" && pierce < MAX_PIERCE) {
          pierce++;
          wallbangFactor *= 0.5;
        } else {
          // metal, concrete, or wood at max pierce = blocked
          return;
        }
      }

      const smokeBlocked =
        state.smokes.size > 0 &&
        Array.from(state.smokes.values()).some((smoke) => {
          const sdx = smoke.x - shooterPos.x;
          const sdy = 1 - shooterPos.y; // Smoke is at ground level (y=1)
          const sdz = smoke.z - shooterPos.z;
          const dot2 = sdx * normDir.x + sdy * normDir.y + sdz * normDir.z;
          if (dot2 <= 0 || dot2 > dot) return false;
          const closestSmokX = shooterPos.x + normDir.x * dot2;
          const closestSmokZ = shooterPos.z + normDir.z * dot2;
          const sPerpX = smoke.x - closestSmokX;
          const sPerpZ = smoke.z - closestSmokZ;
          return sPerpX * sPerpX + sPerpZ * sPerpZ < 4;
        });

      if (smokeBlocked) return;

      if (!closestHit || distToTarget < closestHit.distance) {
        closestHit = { victimId: id, zone, distance: distToTarget, wallbangFactor };
      }
    });

    return closestHit;
  }

  /**
   * Knife hit test: closest enemy inside arm's reach and inside the forward
   * cone. No lag compensation — at this range rewinding does more harm than good.
   */
  checkMeleeHit(
    attackerId: string,
    attacker: PlayerState,
    direction: { x: number; y: number; z: number } | undefined,
    state: GameState
  ): MeleeHitResult | null {
    if (!direction) return null;

    const len = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    if (len === 0) return null;

    const dirX = direction.x / len;
    const dirZ = direction.z / len;

    let best: MeleeHitResult | null = null;

    state.players.forEach((victim, id) => {
      if (id === attackerId || victim.isDead) return;
      if (state.gameMode !== "ffa" && victim.team === attacker.team) return;

      const dx = victim.x - attacker.x;
      const dz = victim.z - attacker.z;
      const dy = victim.y - attacker.y;
      if (Math.abs(dy) > 2) return;

      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > MELEE.range) return;

      // Point blank has no meaningful direction, so treat it as a hit.
      if (dist > 0.01) {
        const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
        if (dot < MELEE.frontDot) return;
      }

      // Backstab: our swing runs along the way the victim is facing, i.e. we
      // came from behind. Player forward is (-sin, -cos) of rotationY.
      const facingDot =
        -Math.sin(victim.rotationY) * dirX + -Math.cos(victim.rotationY) * dirZ;
      const backstab = facingDot > 0.5;

      if (!best || dist < best.distance) {
        best = { victimId: id, distance: dist, backstab };
      }
    });

    return best;
  }

  calculateDamage(
    weapon: string,
    zone: "head" | "torso" | "limbs",
    armor: number,
    hasHelmet: boolean,
    wallbangFactor = 1
  ): number {
    const weaponStats = WEAPONS[weapon as keyof typeof WEAPONS];
    if (!weaponStats) return 0;

    let baseDmg: number;
    switch (zone) {
      case "head": baseDmg = weaponStats.headshot; break;
      case "torso": baseDmg = weaponStats.dmg; break;
      case "limbs": baseDmg = weaponStats.dmg * 0.7; break;
      default: baseDmg = weaponStats.dmg;
    }

    if (armor > 0) {
      if (zone === "head" && !hasHelmet) {
        // Full damage
      } else if (zone === "head" && hasHelmet) {
        baseDmg *= 0.5;
      } else if (zone === "torso") {
        baseDmg *= ARMOR_DAMAGE_MULTIPLIER;
      }
    }

    return Math.max(1, Math.round(baseDmg * wallbangFactor));
  }

  trackServerRTT(sessionId: string, rtt: number): void {
    this.serverRTT.set(sessionId, rtt);
  }

  canProcessInput(sessionId: string, tickMs: number): boolean {
    const now = performance.now();
    const lastInput = this.lastInputMessageTime.get(sessionId) || 0;
    if (now - lastInput < tickMs * 2) return false;
    this.lastInputMessageTime.set(sessionId, now);
    return true;
  }

  trackReload(sessionId: string, timer: ReturnType<typeof setTimeout>): void {
    this.reloadTimers.set(sessionId, timer);
  }

  clearReload(sessionId: string): void {
    this.reloadTimers.delete(sessionId);
  }

  clearAll(sessionId: string): void {
    this.lastFireTime.delete(sessionId);
    this.shootHistory.delete(sessionId);
    const reloadTimer = this.reloadTimers.get(sessionId);
    if (reloadTimer) clearTimeout(reloadTimer);
    this.reloadTimers.delete(sessionId);
    this.serverRTT.delete(sessionId);
    this.pingTimestamps.delete(sessionId);
    this.lastInputMessageTime.delete(sessionId);
  }
}
