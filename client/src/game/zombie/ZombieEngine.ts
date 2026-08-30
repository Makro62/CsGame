import * as THREE from "three";
import {
  ZOMBIE_TYPES, ZOMBIE_POINTS, WEAPONS,
  type ZombieType, type PowerUpType,
} from "@cs-game/shared";
import { useZombieStore, type ZombieState, type LootKind } from "../../stores/useZombieStore";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import { SpatialGrid } from "./SpatialGrid";
import {
  SURVIVAL_BOUNDS, SURVIVAL_SPAWNS, pushOutSurvival, survivalLineOfSight, survivalWallDistance,
} from "./survivalLayout";
import { zombieBodyRadius, zombieHeadRadius, zombieVisualScale } from "./zombieVisual";
import { chaseStep, hordeSeparationFromIds, SURVIVAL_HORDE_SEP } from "./hordeMovement";
import { pickZombieType, waveCount, waveHpScale, waveInterval, waveSpeedScale } from "./zombieWaves";

// ── Event Bus (replaces window.dispatchEvent) ─────────────────────────────
export type ZombieEvent =
  | { type: "zombieHit"; id: string; x: number; y: number; z: number; headshot: boolean; damage: number };

type ZombieEventHandler = (ev: ZombieEvent) => void;

class ZombieEventBus {
  private handlers: ZombieEventHandler[] = [];
  on(h: ZombieEventHandler) { this.handlers.push(h); }
  off(h: ZombieEventHandler) { this.handlers = this.handlers.filter(x => x !== h); }
  emit(ev: ZombieEvent) { for (const h of this.handlers) h(ev); }
}

export const zombieEvents = new ZombieEventBus();

export type ArcadeShotHit = {
  id: string;
  x: number;
  y: number;
  z: number;
  headshot: boolean;
  dist: number;
};

// ── Config derived from shared constants ───────────────────────────────────
interface ZConfig {
  hp: number; speed: number; damage: number;
  points: number;
}

const ZOMBIE_CFG: Record<ZombieType, ZConfig> = {
  walker:   { hp: ZOMBIE_TYPES.walker.hp,   speed: ZOMBIE_TYPES.walker.speed,   damage: ZOMBIE_TYPES.walker.damage,   points: ZOMBIE_POINTS.walker },
  runner:   { hp: ZOMBIE_TYPES.runner.hp,   speed: ZOMBIE_TYPES.runner.speed,   damage: ZOMBIE_TYPES.runner.damage,   points: ZOMBIE_POINTS.runner },
  tank:     { hp: ZOMBIE_TYPES.tank.hp,     speed: ZOMBIE_TYPES.tank.speed,     damage: ZOMBIE_TYPES.tank.damage,     points: ZOMBIE_POINTS.tank },
  spitter:  { hp: ZOMBIE_TYPES.spitter.hp,  speed: ZOMBIE_TYPES.spitter.speed,  damage: ZOMBIE_TYPES.spitter.damage,  points: ZOMBIE_POINTS.spitter },
  exploder: { hp: ZOMBIE_TYPES.exploder.hp, speed: ZOMBIE_TYPES.exploder.speed, damage: ZOMBIE_TYPES.exploder.damage, points: ZOMBIE_POINTS.exploder },
  boss:     { hp: ZOMBIE_TYPES.boss.hp,     speed: ZOMBIE_TYPES.boss.speed,     damage: ZOMBIE_TYPES.boss.damage,     points: ZOMBIE_POINTS.boss },
};

const MAX_ALIVE = 55;
const POWERUP_DROP_CHANCE = 0.15;
const HEADSHOT_MULT = 2;
const MELEE_CONE = 0.55;
const MELEE_RANGE = 2.5;
const MELEE_DMG = 65;

export function refillAllAmmo() {
  const ws = useWeaponStore.getState();
  const next: Partial<{ currentAmmo: number; reserveAmmo: number; primaryAmmo: number; primaryReserve: number; secondaryAmmo: number; secondaryReserve: number }> = {};
  if (ws.activeWeapon && WEAPONS[ws.activeWeapon]) {
    next.currentAmmo = WEAPONS[ws.activeWeapon].mag;
    next.reserveAmmo = WEAPONS[ws.activeWeapon].reserveAmmo;
  }
  if (ws.primaryWeapon && WEAPONS[ws.primaryWeapon]) {
    next.primaryAmmo = WEAPONS[ws.primaryWeapon].mag;
    next.primaryReserve = WEAPONS[ws.primaryWeapon].reserveAmmo;
  }
  if (ws.secondaryWeapon && WEAPONS[ws.secondaryWeapon]) {
    next.secondaryAmmo = WEAPONS[ws.secondaryWeapon].mag;
    next.secondaryReserve = WEAPONS[ws.secondaryWeapon].reserveAmmo;
  }
  useWeaponStore.setState(next);
}

// ── Frame-based acid DOT ───────────────────────────────────────────────────
interface AcidDot {
  remainingMs: number;
  dps: number;
  tickMs: number;
  lastTickMs: number;
}

// ── Obstacle helpers ───────────────────────────────────────────────────────
const ZOMBIE_RADIUS = 0.55;

// ── Engine ─────────────────────────────────────────────────────────────────
export class ZombieEngine {
  private zombies = new Map<string, ZombieState>();
  private grid = new SpatialGrid(5);
  private spawnQueue: Array<{ type: ZombieType; delay: number }> = [];
  private spawnTimer = 0;
  private engineId = 0;
  private playerX = 0;
  private playerZ = 0;
  private hpScale = 1;
  private spdScale = 1;

  /** Frame-based acid DOTs — replaces leaking setInterval */
  private acidDots: AcidDot[] = [];

  /** Tracked alive count — replaces O(N) scan per frame */
  private _aliveCount = 0;

  /** Reusable temp vectors — avoids GC pressure from `new THREE.Vector3()` per frame */
  private readonly _tDir = new THREE.Vector3();
  private readonly _tMeleeOrigin = new THREE.Vector3();
  private readonly _tMeleeDir = new THREE.Vector3();

  constructor() { this.engineId = Date.now() + Math.random(); }

  init() {
    this.cleanup();
    this.engineId = Date.now() + Math.random();
    this.hpScale = 1;
    this.spdScale = 1;
    this._aliveCount = 0;
    this.acidDots = [];
  }

  setPlayerPos(x: number, _y: number, z: number) {
    this.playerX = x; this.playerZ = z;
  }

  /** Mark zombie dead and decrement alive counter. Call from any kill site. */
  private killZombie(z: ZombieState) {
    if (z.isDead) return;
    z.hp = 0; z.isDead = true; z.animTime = 0;
    this._aliveCount = Math.max(0, this._aliveCount - 1);
  }

  startWave(wave: number) {
    const store = useZombieStore.getState();
    const count = waveCount(wave);
    const interval = waveInterval(wave);
    this.hpScale = waveHpScale(wave);
    this.spdScale = waveSpeedScale(wave);

    store.setWaveState("wave_active");
    store.setZombiesRemaining(count);
    useZombieStore.setState({ totalZombiesInWave: count });

    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ type: pickZombieType(wave), delay: i * interval });
    }
    this.spawnTimer = 0;
  }

  update(dt: number) {
    const store = useZombieStore.getState();
    if (store.waveState !== "wave_active") return;

    const dtMs = dt * 1000;

    // ── Drip spawns (cap alive) ────────────────────────────────────────────
    this.spawnTimer += dtMs;
    let spawnedThisTick = 0;
    while (
      this.spawnQueue.length > 0 &&
      this.spawnQueue[0].delay <= this.spawnTimer &&
      this._aliveCount < MAX_ALIVE &&
      spawnedThisTick < 4
    ) {
      this.spawnZombie(this.spawnQueue.shift()!.type);
      spawnedThisTick++;
    }

    // ── Spatial grid refresh ───────────────────────────────────────────────
    this.grid.clear();
    for (const z of this.zombies.values()) {
      if (!z.isDead) this.grid.insert(z.id, z.x, z.z);
    }

    // ── Update zombies ─────────────────────────────────────────────────────
    const toRemove: string[] = [];
    for (const [id, z] of this.zombies) {
      if (z.isDead) {
        z.animTime += dt;
        if (z.animTime > 3) toRemove.push(id);
        continue;
      }
      this.updateZombie(z, dt);
    }
    for (const id of toRemove) {
      this.zombies.delete(id);
    }

    // ── Frame-based acid DOT tick ──────────────────────────────────────────
    this.tickAcidDots(dtMs);

    // ── Powerup expiry ─────────────────────────────────────────────────────
    this.updatePowerUps();

    // ── Wave complete check ────────────────────────────────────────────────
    const remaining = this._aliveCount + this.spawnQueue.length;
    useZombieStore.getState().setZombiesRemaining(remaining);
    if (this.spawnQueue.length === 0 && this._aliveCount === 0) this.onWaveComplete();
  }

  // ── Zombie movement + combat ─────────────────────────────────────────────
  private updateZombie(z: ZombieState, dt: number) {
    const cfg = ZOMBIE_CFG[z.type];
    const dx = this.playerX - z.x;
    const dz = this.playerZ - z.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) return;

    const sep = hordeSeparationFromIds(
      z,
      this.grid.query(z.x, z.z, SURVIVAL_HORDE_SEP.queryRadius),
      (id) => {
        const o = this.zombies.get(id);
        return o && !o.isDead ? o : undefined;
      },
      SURVIVAL_HORDE_SEP.radius,
      SURVIVAL_HORDE_SEP.strength,
    );

    z.attackCooldown = Math.max(0, z.attackCooldown - dt);

    const spd = cfg.speed * this.spdScale;
    const next = chaseStep(z, { x: this.playerX, z: this.playerZ }, spd, sep, dt);
    z.x = next.x;
    z.z = next.z;
    const pushed = pushOutSurvival(z.x, z.z, ZOMBIE_RADIUS);
    z.x = pushed.x;
    z.z = pushed.z;
    z.x = THREE.MathUtils.clamp(z.x, SURVIVAL_BOUNDS.minX + 1, SURVIVAL_BOUNDS.maxX - 1);
    z.z = THREE.MathUtils.clamp(z.z, SURVIVAL_BOUNDS.minZ + 1, SURVIVAL_BOUNDS.maxZ - 1);
    z.rotationY = next.rotationY;

    // Melee attack on player
    if (dist < 1.5 && z.attackCooldown <= 0) {
      z.isAttacking = true;
      z.attackCooldown = 1.0;
      this.damagePlayer(cfg.damage * this.hpScale);
    } else if (dist >= 1.5) {
      z.isAttacking = false;
    }

    z.animTime += dt;

    // Spitter ranged acid (3-10m, cd 2s → DOT 5 dps × 3s)
    if (z.type === "spitter" && dist < 10 && dist > 3 && z.attackCooldown <= 0) {
      z.attackCooldown = 2.0;
      this.applyAcidDot(3000, 5);
    }

    // Exploder suicide at close range (50 dmg AoE)
    if (z.type === "exploder" && dist < 2.5) {
      this.damagePlayer(50 * this.hpScale);
      this.killZombie(z);
    }
  }

  private spawnZombie(type: ZombieType) {
    const cfg = ZOMBIE_CFG[type];
    const id = `z_${this.engineId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    let spawn = SURVIVAL_SPAWNS[0];
    let bestD = -1;
    for (const s of SURVIVAL_SPAWNS) {
      const d = Math.hypot(s.x - this.playerX, s.z - this.playerZ);
      if (d > bestD) { bestD = d; spawn = s; }
    }
    if (Math.random() < 0.55) {
      spawn = SURVIVAL_SPAWNS[Math.floor(Math.random() * SURVIVAL_SPAWNS.length)];
    }
    const hp = cfg.hp * this.hpScale;
    const z: ZombieState = {
      id, type,
      x: spawn.x + (Math.random() - 0.5) * 1.4,
      y: 0,
      z: spawn.z + (Math.random() - 0.5) * 1.4,
      rotationY: 0,
      hp, maxHp: hp,
      speed: cfg.speed, damage: cfg.damage,
      isDead: false, isAttacking: false,
      attackCooldown: 0, animTime: Math.random() * Math.PI * 2,
    };
    this.zombies.set(id, z);
    this._aliveCount++;
  }

  private damagePlayer(amount: number) {
    const store = useZombieStore.getState();
    const p = store.player;
    if (p.isDowned) return;
    let dmg = amount;
    if (p.activePowerUps.has("juggernog")) dmg *= 0.5;
    let armorDmg = 0;
    if (p.armor > 0) { armorDmg = Math.min(p.armor, dmg * 0.5); dmg -= armorDmg; }
    const newHp = p.hp - dmg;
    const newArmor = Math.max(0, p.armor - armorDmg);
    if (newHp <= 0) {
      store.setPlayer(pl => ({ ...pl, hp: 0, armor: newArmor, isDowned: true, downedTimer: 30 }));
    } else {
      store.setPlayer(pl => ({ ...pl, hp: newHp, armor: newArmor }));
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("zombieDamageTaken"));
  }

  // ── Frame-based acid DOT (replaces setInterval) ─────────────────────────
  private applyAcidDot(durationMs: number, dps: number) {
    this.acidDots.push({ remainingMs: durationMs, dps, tickMs: 500, lastTickMs: 0 });
  }

  private tickAcidDots(dtMs: number) {
    const store = useZombieStore.getState();
    if (store.player.isDowned) {
      this.acidDots = [];
      return;
    }
    const remaining: AcidDot[] = [];
    for (const dot of this.acidDots) {
      dot.remainingMs -= dtMs;
      dot.lastTickMs += dtMs;
      if (dot.lastTickMs >= dot.tickMs) {
        dot.lastTickMs -= dot.tickMs;
        const dmg = dot.dps * (dot.tickMs / 1000);
        const p = useZombieStore.getState().player;
        if (!p.isDowned) {
          useZombieStore.getState().setPlayer(pl => ({
            ...pl, hp: Math.max(0, pl.hp - dmg),
          }));
        }
      }
      if (dot.remainingMs > 0) remaining.push(dot);
    }
    this.acidDots = remaining;
  }

  private onWaveComplete() {
    const store = useZombieStore.getState();
    const wave = store.currentWave;
    store.setWaveState("buy_phase");
    store.setInterWaveTimer(12);
    store.addPoints(wave * 80);
  }

  private updatePowerUps() {
    const store = useZombieStore.getState();
    const now = Date.now();
    const expired = store.powerUps.filter(p => now - p.spawnTime > p.duration * 1000);
    expired.forEach(p => store.removePowerUp(p.id));
    const expiredLoot = store.loot.filter(p => now - p.spawnTime > 25000);
    expiredLoot.forEach(p => store.removeLoot(p.id));
    const newMap = new Map(store.player.activePowerUps);
    let changed = false;
    newMap.forEach((t, k) => { if (now > t) { newMap.delete(k); changed = true; } });
    if (changed) store.setPlayer(p => ({ ...p, activePowerUps: newMap }));
  }

  // ── Shooting ────────────────────────────────────────────────────────────
  handleShoot(origin: THREE.Vector3, dir: THREE.Vector3, weaponDmg: number): ArcadeShotHit | null {
    const hits = this.raycastZombies(origin, dir, 80);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const z = this.zombies.get(hit.id);
    if (!z || z.isDead) return null;
    const cfg = ZOMBIE_CFG[z.type];
    let dmg = weaponDmg * (hit.headshot ? HEADSHOT_MULT : 1);
    const store = useZombieStore.getState();
    if (store.player.activePowerUps.has("insta_kill")) dmg = z.hp;
    z.hp -= dmg;
    if (z.hp <= 0) {
      this.killZombie(z);
      const pts = hit.headshot ? cfg.points + ZOMBIE_POINTS.headshotBonus : cfg.points;
      store.addPoints(pts);
      if (Math.random() < POWERUP_DROP_CHANCE) this.spawnPowerUp(z.x, z.z);
      this.maybeSpawnLoot(z.x, z.z);
    }
    zombieEvents.emit({
      type: "zombieHit",
      id: hit.id,
      x: hit.x,
      y: hit.y,
      z: hit.z,
      headshot: hit.headshot,
      damage: dmg,
    });
    return hit;
  }

  wallDistance(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = 70): number {
    return survivalWallDistance(origin.x, origin.z, dir.x, dir.z, maxDist);
  }

  private raycastZombies(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): ArcadeShotHit[] {
    const hits: ArcadeShotHit[] = [];
    const d = this._tDir.set(dir.x, 0, dir.z);
    if (d.lengthSq() < 1e-8) return hits;
    d.normalize();
    const candidates = this.grid.query(origin.x, origin.z, maxDist);
    const ids = candidates.size > 0 ? Array.from(candidates) : Array.from(this.zombies.keys());
    for (const id of ids) {
      const z = this.zombies.get(id);
      if (!z || z.isDead) continue;
      const vx = z.x - origin.x;
      const vz = z.z - origin.z;
      const proj = vx * d.x + vz * d.z;
      if (proj < 0.25 || proj > maxDist) continue;
      const cx = origin.x + d.x * proj;
      const cz = origin.z + d.z * proj;
      const lat = Math.hypot(z.x - cx, z.z - cz);
      const scale = zombieVisualScale(z.type);
      const bodyR = zombieBodyRadius(z.type);
      const headR = zombieHeadRadius(z.type);
      if (lat > bodyR) continue;
      if (!survivalLineOfSight(origin.x, origin.z, z.x, z.z)) continue;
      const headshot = lat <= headR;
      hits.push({
        id,
        x: z.x,
        y: headshot ? 1.42 * scale : 0.9 * scale,
        z: z.z,
        headshot,
        dist: proj,
      });
    }
    return hits.sort((a, b) => a.dist - b.dist);
  }

  // ── Melee ───────────────────────────────────────────────────────────────
  handleMelee(data: { direction: THREE.Vector3 }) {
    const dir = this._tMeleeDir.copy(data.direction).normalize();
    const origin = this._tMeleeOrigin.set(this.playerX, 0.9, this.playerZ);
    let best: ZombieState | null = null;
    let bestD = Infinity;
    for (const z of this.zombies.values()) {
      if (z.isDead) continue;
      const dx = z.x - origin.x, dz = z.z - origin.z;
      const d = Math.hypot(dx, dz);
      if (d < MELEE_RANGE && d < bestD) {
        const dot = (dx / d) * dir.x + (dz / d) * dir.z;
        if (dot > MELEE_CONE) { bestD = d; best = z; }
      }
    }
    if (best) {
      best.hp -= MELEE_DMG;
      if (best.hp <= 0) {
        this.killZombie(best);
        useZombieStore.getState().addPoints(ZOMBIE_CFG[best.type].points + ZOMBIE_POINTS.knifeBonus);
      }
      zombieEvents.emit({
        type: "zombieHit",
        id: best.id,
        x: best.x,
        y: 1.0,
        z: best.z,
        headshot: false,
        damage: MELEE_DMG,
      });
    }
  }

  private maybeSpawnLoot(x: number, z: number) {
    const r = Math.random();
    let kind: LootKind | null = null;
    let weapon: string | undefined;
    if (r < 0.12) kind = "health";
    else if (r < 0.22) kind = "ammo";
    else if (r < 0.28) kind = "armor";
    else if (r < 0.34) {
      kind = "weapon";
      weapon = ["mp5", "ak47", "deagle", "m4a1"][Math.floor(Math.random() * 4)];
    }
    if (!kind) return;
    useZombieStore.getState().addLoot({
      id: `loot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind, weapon, x, z, spawnTime: Date.now(),
    });
  }

  private spawnPowerUp(x: number, z: number) {
    const types: PowerUpType[] = ["max_ammo", "insta_kill", "double_points", "nuke", "speed_cola", "juggernog"];
    const type = types[Math.floor(Math.random() * types.length)];
    useZombieStore.getState().addPowerUp({
      id: `pu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type, x, z,
      spawnTime: Date.now(), duration: 30,
    });
  }

  collectPowerUp(powerUpId: string) {
    const store = useZombieStore.getState();
    const pu = store.powerUps.find(p => p.id === powerUpId);
    if (!pu) return;
    store.removePowerUp(powerUpId);
    const expire = Date.now() + 30000;
    switch (pu.type) {
      case "max_ammo":
        refillAllAmmo();
        break;
      case "insta_kill": case "double_points": case "speed_cola": case "juggernog":
        store.setPlayer(p => {
          const m = new Map(p.activePowerUps);
          m.set(pu.type, expire);
          return { ...p, activePowerUps: m };
        });
        break;
      case "nuke":
        for (const z of this.zombies.values()) this.killZombie(z);
        store.addPoints(400);
        break;
    }
  }

  collectLoot(lootId: string) {
    const store = useZombieStore.getState();
    const item = store.loot.find(p => p.id === lootId);
    if (!item) return;
    store.removeLoot(lootId);
    if (item.kind === "health") {
      store.setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 40) }));
    } else if (item.kind === "ammo") {
      refillAllAmmo();
    } else if (item.kind === "armor") {
      store.setPlayer(p => ({ ...p, armor: Math.min(100, p.armor + 50) }));
    } else if (item.kind === "weapon" && item.weapon) {
      useWeaponStore.getState().equipWeapon(item.weapon as WeaponKey);
      store.addPurchasedWeapon(item.weapon);
    }
  }

  getZombies(): ZombieState[] { return Array.from(this.zombies.values()); }

  cleanup() {
    this.acidDots = [];
    this._aliveCount = 0;
    this.zombies.clear();
    this.spawnQueue = [];
  }
}

export const zombieEngine = new ZombieEngine();
