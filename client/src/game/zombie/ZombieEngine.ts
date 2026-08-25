import * as THREE from "three";
import {
  ZOMBIE_TYPES, ZOMBIE_POINTS, WAVE_CONFIG, MAP_OBSTACLES,
  type ZombieType, type PowerUpType, type MapObstacle,
} from "@cs-game/shared";
import { useZombieStore, type ZombieState } from "../../stores/useZombieStore";
import { SpatialGrid } from "./SpatialGrid";

// ── Event Bus (replaces window.dispatchEvent) ─────────────────────────────
export type ZombieEvent =
  | { type: "barricadeHit"; id: string }
  | { type: "explosion"; x: number; y: number; z: number }
  | { type: "zombieHit"; headshot: boolean; damage: number }
  | { type: "playerDamaged"; source: ZombieType }
  | { type: "waveClear"; wave: number }
  | { type: "maxAmmo" };

type ZombieEventHandler = (ev: ZombieEvent) => void;

class ZombieEventBus {
  private handlers: ZombieEventHandler[] = [];
  on(h: ZombieEventHandler) { this.handlers.push(h); }
  off(h: ZombieEventHandler) { this.handlers = this.handlers.filter(x => x !== h); }
  emit(ev: ZombieEvent) { for (const h of this.handlers) h(ev); }
}

export const zombieEvents = new ZombieEventBus();

// ── Config derived from shared constants ───────────────────────────────────
interface ZConfig {
  hp: number; speed: number; damage: number;
  scale: number; points: number; weight: number;
}

const PICK_WEIGHTS: Record<ZombieType, number> = {
  walker: 50, runner: 25, tank: 10, spitter: 8, exploder: 5, boss: 2,
};

const ZOMBIE_CFG: Record<ZombieType, ZConfig> = {
  walker:   { hp: ZOMBIE_TYPES.walker.hp,   speed: ZOMBIE_TYPES.walker.speed,   damage: ZOMBIE_TYPES.walker.damage,   scale: ZOMBIE_TYPES.walker.scale,   points: ZOMBIE_POINTS.walker,   weight: PICK_WEIGHTS.walker },
  runner:   { hp: ZOMBIE_TYPES.runner.hp,   speed: ZOMBIE_TYPES.runner.speed,   damage: ZOMBIE_TYPES.runner.damage,   scale: ZOMBIE_TYPES.runner.scale,   points: ZOMBIE_POINTS.runner,   weight: PICK_WEIGHTS.runner },
  tank:     { hp: ZOMBIE_TYPES.tank.hp,     speed: ZOMBIE_TYPES.tank.speed,     damage: ZOMBIE_TYPES.tank.damage,     scale: ZOMBIE_TYPES.tank.scale,     points: ZOMBIE_POINTS.tank,     weight: PICK_WEIGHTS.tank },
  spitter:  { hp: ZOMBIE_TYPES.spitter.hp,  speed: ZOMBIE_TYPES.spitter.speed,  damage: ZOMBIE_TYPES.spitter.damage,  scale: ZOMBIE_TYPES.spitter.scale,  points: ZOMBIE_POINTS.spitter,  weight: PICK_WEIGHTS.spitter },
  exploder: { hp: ZOMBIE_TYPES.exploder.hp, speed: ZOMBIE_TYPES.exploder.speed, damage: ZOMBIE_TYPES.exploder.damage, scale: ZOMBIE_TYPES.exploder.scale, points: ZOMBIE_POINTS.exploder, weight: PICK_WEIGHTS.exploder },
  boss:     { hp: ZOMBIE_TYPES.boss.hp,     speed: ZOMBIE_TYPES.boss.speed,     damage: ZOMBIE_TYPES.boss.damage,     scale: ZOMBIE_TYPES.boss.scale,     points: ZOMBIE_POINTS.boss,     weight: PICK_WEIGHTS.boss },
};

const MAX_ALIVE = 45;
const POWERUP_DROP_CHANCE = 0.15;
const HEADSHOT_MULT = 2;
const MELEE_CONE = 0.55;
const MELEE_RANGE = 2.5;
const MELEE_DMG = 65;

// ── Wave scaling per doc §3: base 6, +4 per wave ──────────────────────────
export function waveCount(wave: number): number {
  return WAVE_CONFIG.baseZombieCount + (wave - 1) * WAVE_CONFIG.zombiesPerWave;
}

function waveInterval(wave: number): number {
  return Math.max(400, 2000 - wave * 80);
}

// ── Frame-based acid DOT ───────────────────────────────────────────────────
interface AcidDot {
  remainingMs: number;
  dps: number;
  tickMs: number;
  lastTickMs: number;
}

// ── Obstacle helpers ───────────────────────────────────────────────────────
const ZOMBIE_RADIUS = 0.6;

function pushOutOfObstacles(x: number, z: number): { x: number; z: number } {
  let px = x, pz = z;
  for (const obs of MAP_OBSTACLES) {
    if (obs.material === "wood") continue; // zombies can break through wood
    const cx = Math.max(obs.minX, Math.min(px, obs.maxX));
    const cz = Math.max(obs.minZ, Math.min(pz, obs.maxZ));
    const dx = px - cx, dz = pz - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < ZOMBIE_RADIUS && dist > 0) {
      const push = ZOMBIE_RADIUS - dist;
      px += (dx / dist) * push;
      pz += (dz / dist) * push;
    }
  }
  return { x: px, z: pz };
}

/** Ray-vs-AABB slab test. Returns true if ray hits the obstacle. */
function rayHitsAABB(
  ox: number, oz: number, dx: number, dz: number,
  obs: MapObstacle, maxDist: number,
): boolean {
  const invDx = dx === 0 ? Infinity : 1 / dx;
  const invDz = dz === 0 ? Infinity : 1 / dz;
  let t1 = (obs.minX - ox) * invDx;
  let t2 = (obs.maxX - ox) * invDx;
  if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
  let tz1 = (obs.minZ - oz) * invDz;
  let tz2 = (obs.maxZ - oz) * invDz;
  if (tz1 > tz2) { const tmp = tz1; tz1 = tz2; tz2 = tmp; }
  const tEnter = Math.max(t1, tz1);
  const tExit = Math.min(t2, tz2);
  return tExit >= 0 && tEnter <= tExit && tEnter <= maxDist;
}

function hasLineOfSight(ox: number, oz: number, tx: number, tz: number): boolean {
  const dx = tx - ox, dz = tz - oz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const ndx = dx / dist, ndz = dz / dist;
  for (const obs of MAP_OBSTACLES) {
    if (obs.material === "wood") continue;
    if (rayHitsAABB(ox, oz, ndx, ndz, obs, dist)) return false;
  }
  return true;
}

// ── Engine ─────────────────────────────────────────────────────────────────
export class ZombieEngine {
  private zombies = new Map<string, ZombieState>();
  private grid = new SpatialGrid(5);
  private spawnQueue: Array<{ type: ZombieType; delay: number }> = [];
  private spawnTimer = 0;
  private engineId = 0;
  private playerX = 0;
  private playerZ = -30;
  private difficulty = 1.0;

  /** Frame-based acid DOTs — replaces leaking setInterval */
  private acidDots: AcidDot[] = [];

  /** Tracked alive count — replaces O(N) scan per frame */
  private _aliveCount = 0;

  /** Reusable temp vectors — avoids GC pressure from `new THREE.Vector3()` per frame */
  private readonly _tDir = new THREE.Vector3();
  private readonly _tCenter = new THREE.Vector3();
  private readonly _tA = new THREE.Vector3();
  private readonly _tB = new THREE.Vector3();
  private readonly _tMeleeOrigin = new THREE.Vector3();
  private readonly _tMeleeDir = new THREE.Vector3();

  constructor() { this.engineId = Date.now() + Math.random(); }

  init() {
    this.cleanup();
    this.engineId = Date.now() + Math.random();
    this.difficulty = 1.0;
    this._aliveCount = 0;
    this.acidDots = [];
  }

  setPlayerPos(x: number, _y: number, z: number) {
    this.playerX = x; this.playerZ = z;
  }

  startWave(wave: number) {
    const store = useZombieStore.getState();
    const count = waveCount(wave);
    const interval = waveInterval(wave);

    store.setWaveState("wave_active");
    store.setZombiesRemaining(count);
    useZombieStore.setState({ totalZombiesInWave: count });

    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ type: this.pickZombieType(wave), delay: i * interval });
    }
    this.spawnTimer = 0;
  }

  private pickZombieType(wave: number): ZombieType {
    const unlock = WAVE_CONFIG.specialUnlock;
    const chances = WAVE_CONFIG.specialChances;
    const candidates: ZombieType[] = ["walker"];
    if (wave >= unlock.runner)   candidates.push("runner");
    if (wave >= unlock.tank)     candidates.push("tank");
    if (wave >= unlock.spitter)  candidates.push("spitter");
    if (wave >= unlock.exploder) candidates.push("exploder");
    if (wave >= unlock.boss && Math.random() < chances.boss) return "boss";

    // Weighted random from unlocked types
    let total = 0;
    for (const t of candidates) total += ZOMBIE_CFG[t].weight;
    let r = Math.random() * total;
    for (const t of candidates) { r -= ZOMBIE_CFG[t].weight; if (r <= 0) return t; }
    return "walker";
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

    // Separation via spatial grid
    let sepX = 0, sepZ = 0;
    this.grid.query(z.x, z.z, 2).forEach(nid => {
      if (nid === z.id) return;
      const o = this.zombies.get(nid);
      if (!o || o.isDead) return;
      const ndx = z.x - o.x, ndz = z.z - o.z, nd = Math.hypot(ndx, ndz);
      if (nd < 1.5 && nd > 0) {
        sepX += (ndx / nd) * (1.5 - nd) * 3;
        sepZ += (ndz / nd) * (1.5 - nd) * 3;
      }
    });

    // Barricade blocking
    let blocked = false;
    for (const b of useZombieStore.getState().barricades) {
      if (b.planks <= 0) continue;
      const bd = Math.hypot(b.x - z.x, b.z - z.z);
      if (bd < 2) {
        if (z.attackCooldown <= 0) {
          z.attackCooldown = 1.0;
          useZombieStore.getState().updateBarricade(b.id, bar => ({
            ...bar,
            planks: Math.max(0, bar.planks - 1),
            health: Math.max(0, bar.health - 20),
          }));
          zombieEvents.emit({ type: "barricadeHit", id: b.id });
        }
        blocked = true;
      }
    }
    z.attackCooldown = Math.max(0, z.attackCooldown - dt);

    // Move toward player with separation
    if (!blocked) {
      const spd = cfg.speed * this.difficulty;
      z.x += ((dx / dist) * spd + sepX) * dt;
      z.z += ((dz / dist) * spd + sepZ) * dt;
      // Push out of solid obstacles (metal/concrete walls)
      const pushed = pushOutOfObstacles(z.x, z.z);
      z.x = pushed.x;
      z.z = pushed.z;
      z.rotationY = Math.atan2(dx, dz);
    }

    // Melee attack on player
    if (dist < 1.5 && z.attackCooldown <= 0) {
      z.isAttacking = true;
      z.attackCooldown = 1.0;
      this.damagePlayer(cfg.damage * this.difficulty, z.type);
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
      this.damagePlayer(50 * this.difficulty, "exploder");
      z.hp = 0; z.isDead = true; z.animTime = 0;
      this._aliveCount = Math.max(0, this._aliveCount - 1);
      zombieEvents.emit({ type: "explosion", x: z.x, y: z.y, z: z.z });
    }
  }

  private spawnZombie(type: ZombieType) {
    const cfg = ZOMBIE_CFG[type];
    const id = `z_${this.engineId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const ang = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 12;
    const hp = cfg.hp * this.difficulty;
    const z: ZombieState = {
      id, type,
      x: THREE.MathUtils.clamp(this.playerX + Math.cos(ang) * r, -58, 58),
      y: 0,
      z: THREE.MathUtils.clamp(this.playerZ + Math.sin(ang) * r, -58, 58),
      rotationY: 0,
      hp, maxHp: hp,
      speed: cfg.speed, damage: cfg.damage,
      isDead: false, isAttacking: false,
      attackCooldown: 0, animTime: Math.random() * Math.PI * 2,
    };
    this.zombies.set(id, z);
    this._aliveCount++;
  }

  private damagePlayer(amount: number, source: ZombieType) {
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
    zombieEvents.emit({ type: "playerDamaged", source });
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

  // ── Bleedout timer tick — called by mode screen each frame ──────────────
  tickDowned(dtMs: number) {
    const st = useZombieStore.getState();
    if (!st.player.isDowned) return;
    const nt = st.player.downedTimer - dtMs / 1000;
    if (nt <= 0) {
      useZombieStore.getState().setPlayer(p => ({ ...p, isDowned: false, downedTimer: 0 }));
      useZombieStore.getState().setWaveState("game_over");
    } else {
      useZombieStore.getState().setPlayer(p => ({ ...p, downedTimer: nt }));
    }
  }

  private onWaveComplete() {
    const store = useZombieStore.getState();
    const wave = store.currentWave;
    store.setWaveState("wave_clear");
    store.setInterWaveTimer(WAVE_CONFIG.interWaveTime);
    store.addPoints(wave * 50);
    if (wave >= 10 && !store.extractionAvailable) {
      store.setExtractionState(false, 0, true);
    }
    zombieEvents.emit({ type: "waveClear", wave });
  }

  private updatePowerUps() {
    const store = useZombieStore.getState();
    const now = Date.now();
    const expired = store.powerUps.filter(p => now - p.spawnTime > p.duration * 1000);
    expired.forEach(p => store.removePowerUp(p.id));
    const newMap = new Map(store.player.activePowerUps);
    let changed = false;
    newMap.forEach((t, k) => { if (now > t) { newMap.delete(k); changed = true; } });
    if (changed) store.setPlayer(p => ({ ...p, activePowerUps: newMap }));
  }

  // ── Shooting ────────────────────────────────────────────────────────────
  handleShoot(origin: THREE.Vector3, dir: THREE.Vector3, weaponDmg: number, isHeadshot: boolean) {
    const hits = this.raycastZombies(origin, dir, 100);
    if (hits.length === 0) return false;
    const z = this.zombies.get(hits[0].id);
    if (!z || z.isDead) return false;
    const cfg = ZOMBIE_CFG[z.type];
    let dmg = weaponDmg * (isHeadshot ? HEADSHOT_MULT : 1);
    const store = useZombieStore.getState();
    if (store.player.activePowerUps.has("insta_kill")) dmg = z.hp;
    z.hp -= dmg;
    if (z.hp <= 0) {
      z.hp = 0; z.isDead = true; z.animTime = 0;
      this._aliveCount = Math.max(0, this._aliveCount - 1);
      const pts = isHeadshot ? cfg.points + ZOMBIE_POINTS.headshotBonus : cfg.points;
      store.addPoints(pts);
      if (Math.random() < POWERUP_DROP_CHANCE) this.spawnPowerUp(z.x, z.z);
    }
    zombieEvents.emit({ type: "zombieHit", headshot: isHeadshot, damage: dmg });
    return true;
  }

  private raycastZombies(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number) {
    const hits: Array<{ id: string; dist: number }> = [];
    const d = this._tDir.copy(dir).normalize();
    const candidates = this.grid.query(origin.x, origin.z, maxDist);
    const ids = candidates.size > 0 ? Array.from(candidates) : Array.from(this.zombies.keys());
    for (const id of ids) {
      const z = this.zombies.get(id);
      if (!z || z.isDead) continue;
      this._tCenter.set(z.x, z.y + 0.9, z.z);
      const proj = this._tA.copy(this._tCenter).sub(origin).dot(d);
      if (proj < 0 || proj > maxDist) continue;
      this._tB.copy(d).multiplyScalar(proj);
      this._tB.add(origin);
      if (this._tB.distanceTo(this._tCenter) < 0.6) {
        if (!hasLineOfSight(origin.x, origin.z, z.x, z.z)) continue;
        hits.push({ id, dist: proj });
      }
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
        best.hp = 0; best.isDead = true; best.animTime = 0;
        this._aliveCount = Math.max(0, this._aliveCount - 1);
        useZombieStore.getState().addPoints(ZOMBIE_CFG[best.type].points + ZOMBIE_POINTS.knifeBonus);
      }
      zombieEvents.emit({ type: "zombieHit", headshot: false, damage: MELEE_DMG });
    }
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
        zombieEvents.emit({ type: "maxAmmo" });
        break;
      case "insta_kill": case "double_points": case "speed_cola": case "juggernog":
        store.setPlayer(p => {
          const m = new Map(p.activePowerUps);
          m.set(pu.type, expire);
          return { ...p, activePowerUps: m };
        });
        break;
      case "nuke":
        for (const z of this.zombies.values()) {
          if (!z.isDead) { z.hp = 0; z.isDead = true; z.animTime = 0; }
        }
        this._aliveCount = 0;
        store.addPoints(400);
        break;
    }
  }

  repairBarricade(bid: string) {
    const store = useZombieStore.getState();
    const b = store.barricades.find(bar => bar.id === bid);
    if (!b || b.planks >= b.maxPlanks) return;
    if (store.player.points < 10) return;
    store.addPoints(-10);
    store.updateBarricade(bid, bar => ({
      ...bar,
      planks: Math.min(bar.maxPlanks, bar.planks + 1),
      health: bar.maxHealth,
    }));
  }

  getZombies(): ZombieState[] { return Array.from(this.zombies.values()); }
  getAliveCount(): number { return this._aliveCount; }

  cleanup() {
    this.acidDots = [];
    this._aliveCount = 0;
    this.zombies.clear();
    this.spawnQueue = [];
  }
}

export const zombieEngine = new ZombieEngine();
