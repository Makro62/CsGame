import * as THREE from "three";
import { useZombieStore, ZombieState, ZombieType, PowerUpType } from "../../stores/useZombieStore";
import { SpatialGrid } from "./SpatialGrid";

interface ZConfig { hp: number; speed: number; damage: number; scale: number; points: number; weight: number; }

export const ZOMBIE_CFG: Record<ZombieType, ZConfig> = {
  walker:   { hp:100, speed:2.0, damage:10, scale:1.0, points:10, weight:50 },
  runner:   { hp:80,  speed:4.5, damage:8,  scale:0.9, points:15, weight:25 },
  tank:     { hp:400, speed:1.5, damage:20, scale:1.4, points:30, weight:10 },
  spitter:  { hp:120, speed:2.5, damage:12, scale:1.0, points:20, weight:8 },
  exploder: { hp:60,  speed:3.0, damage:50, scale:1.1, points:25, weight:5 },
  boss:     { hp:2000,speed:1.8, damage:35, scale:2.0, points:100,weight:2 },
};

const MAX_ALIVE = 45;

/** Wave scaling per docs/Zombie_Shooter_System_v1.md §3 */
export function waveCount(wave: number): number {
  const scale = 1 + (wave - 1) * 0.15;
  return Math.floor((6 + wave * 3) * scale);
}
function waveInterval(wave: number): number {
  return Math.max(400, 2000 - wave * 80);
}

export class ZombieEngine {
  private zombies = new Map<string, ZombieState>();
  private grid = new SpatialGrid(5);
  private spawnQueue: Array<{ type: ZombieType; delay: number }> = [];
  private spawnTimer = 0;
  private engineId = 0;
  private timers: ReturnType<typeof setInterval>[] = [];
  private playerX = 0; private playerZ = -30;
  private difficulty = 1.0;

  constructor() { this.engineId = Date.now() + Math.random(); }

  init() {
    this.cleanup();
    this.engineId = Date.now() + Math.random();
    this.difficulty = 1.0;
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
    const types: ZombieType[] = ["walker"];
    if (wave >= 2) types.push("runner");
    if (wave >= 4) types.push("tank");
    if (wave >= 6) types.push("spitter");
    if (wave >= 8) types.push("exploder");
    if (wave >= 10 && Math.random() < 0.1) return "boss";
    return types[Math.floor(Math.random() * types.length)];
  }

  update(dt: number) {
    const store = useZombieStore.getState();
    if (store.waveState !== "wave_active") return;

    // Drip spawns (cap alive to avoid lag)
    this.spawnTimer += dt * 1000;
    let spawnedThisTick = 0;
    while (
      this.spawnQueue.length > 0 &&
      this.spawnQueue[0].delay <= this.spawnTimer &&
      this.aliveCount() < MAX_ALIVE &&
      spawnedThisTick < 4
    ) {
      this.spawnZombie(this.spawnQueue.shift()!.type);
      spawnedThisTick++;
    }

    // Spatial grid refresh
    this.grid.clear();
    for (const z of this.zombies.values()) {
      if (!z.isDead) this.grid.insert(z.id, z.x, z.z);
    }

    // Update zombies
    const toRemove: string[] = [];
    for (const [id, z] of this.zombies) {
      if (z.isDead) { z.animTime += dt; if (z.animTime > 3) toRemove.push(id); continue; }
      this.updateZombie(z, dt);
    }
    toRemove.forEach(id => this.zombies.delete(id));

    this.updatePowerUps();

    // Wave complete check
    const alive = this.aliveCount();
    const remaining = alive + this.spawnQueue.length;
    useZombieStore.getState().setZombiesRemaining(remaining);
    if (this.spawnQueue.length === 0 && alive === 0) this.onWaveComplete();

    // Sync store (single source of truth)
    useZombieStore.getState().setZombies(Array.from(this.zombies.values()));
  }

  private aliveCount(): number {
    let n = 0;
    for (const z of this.zombies.values()) if (!z.isDead) n++;
    return n;
  }

  private updateZombie(z: ZombieState, dt: number) {
    const cfg = ZOMBIE_CFG[z.type];
    const dx = this.playerX - z.x, dz = this.playerZ - z.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) return;

    // Separation via spatial grid (O(1))
    let sepX = 0, sepZ = 0;
    this.grid.query(z.x, z.z, 2).forEach(nid => {
      if (nid === z.id) return;
      const o = this.zombies.get(nid); if (!o || o.isDead) return;
      const ndx = z.x - o.x, ndz = z.z - o.z, nd = Math.hypot(ndx, ndz);
      if (nd < 1.5 && nd > 0) { sepX += (ndx/nd)*(1.5-nd)*3; sepZ += (ndz/nd)*(1.5-nd)*3; }
    });

    // Barricade blocking (planks-based)
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
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("barricadeHit", { detail: { id: b.id } }));
        }
        blocked = true;
      }
    }
    z.attackCooldown = Math.max(0, z.attackCooldown - dt);

    // Move toward player with separation
    if (!blocked) {
      const spd = cfg.speed * this.difficulty;
      z.x += ((dx/dist)*spd + sepX) * dt;
      z.z += ((dz/dist)*spd + sepZ) * dt;
      z.rotationY = Math.atan2(dx, dz);
    }

    // Melee attack on player
    if (dist < 1.5 && z.attackCooldown <= 0) {
      z.isAttacking = true; z.attackCooldown = 1.0;
      this.damagePlayer(cfg.damage * this.difficulty, z.type);
    } else if (dist >= 1.5) { z.isAttacking = false; }

    z.animTime += dt;

    // Spitter ranged acid (3-10m, cd 2s → DOT 5 dps × 3s)
    if (z.type === "spitter" && dist < 10 && dist > 3 && z.attackCooldown <= 0) {
      z.attackCooldown = 2.0;
      this.applyAcidDot(3, 5);
    }

    // Exploder suicide at close range (50 dmg AoE)
    if (z.type === "exploder" && dist < 2.5) {
      this.damagePlayer(50 * this.difficulty, "exploder");
      z.hp = 0; z.isDead = true; z.animTime = 0;
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("explosion", {detail: {x:z.x, y:z.y, z:z.z}}));
    }
  }

  private spawnZombie(type: ZombieType) {
    const cfg = ZOMBIE_CFG[type];
    const id = `z_${this.engineId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    const ang = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 12;
    const hp = cfg.hp * this.difficulty;
    const z: ZombieState = {
      id, type,
      x: THREE.MathUtils.clamp(this.playerX + Math.cos(ang)*r, -58, 58),
      y: 0,
      z: THREE.MathUtils.clamp(this.playerZ + Math.sin(ang)*r, -58, 58),
      rotationY: 0,
      hp, maxHp: hp,
      speed: cfg.speed, damage: cfg.damage,
      isDead: false, isAttacking: false,
      attackCooldown: 0, animTime: Math.random() * Math.PI * 2,
    };
    this.zombies.set(id, z);
  }

  private damagePlayer(amount: number, source: ZombieType) {
    const store = useZombieStore.getState();
    const p = store.player;
    if (p.isDowned) return;
    let dmg = amount;
    if (p.activePowerUps.has("juggernog")) dmg *= 0.5;
    let armorDmg = 0;
    if (p.armor > 0) { armorDmg = Math.min(p.armor, dmg*0.5); dmg -= armorDmg; }
    const newHp = p.hp - dmg, newArmor = Math.max(0, p.armor - armorDmg);
    if (newHp <= 0) {
      store.setPlayer(pl => ({...pl, hp:0, armor:newArmor, isDowned:true, downedTimer:30}));
    } else {
      store.setPlayer(pl => ({...pl, hp:newHp, armor:newArmor}));
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("playerDamaged", {detail: {source}}));
  }

  /** Bleedout timer tick — called by mode screen each frame */
  tickDowned(dtMs: number) {
    const st = useZombieStore.getState();
    if (!st.player.isDowned) return;
    const nt = st.player.downedTimer - dtMs / 1000;
    if (nt <= 0) {
      // Game over when bleedout ends
      useZombieStore.getState().setPlayer(p => ({...p, isDowned:false, downedTimer:0}));
      useZombieStore.getState().setWaveState("game_over");
    } else {
      useZombieStore.getState().setPlayer(p => ({...p, downedTimer: nt}));
    }
  }

  private applyAcidDot(durationSec: number, dps: number) {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 0.5;
      if (elapsed >= durationSec) { clearInterval(interval); return; }
      const p = useZombieStore.getState().player;
      if (p.isDowned) return;
      useZombieStore.getState().setPlayer(pl => ({...pl, hp: Math.max(0, pl.hp - dps*0.5)}));
    }, 500);
    this.timers.push(interval);
  }

  private onWaveComplete() {
    const store = useZombieStore.getState();
    const wave = store.currentWave;
    store.setWaveState("wave_clear");
    store.setInterWaveTimer(10);
    store.addPoints(wave * 50); // clear bonus per doc §3
    if (wave >= 10 && !store.extractionAvailable) {
      store.setExtractionState(false, 0, true);
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("waveClear", {detail:{wave}}));
  }

  private updatePowerUps() {
    const store = useZombieStore.getState();
    const now = Date.now();
    const expired = store.powerUps.filter(p => now - p.spawnTime > p.duration * 1000);
    expired.forEach(p => store.removePowerUp(p.id));
    const newMap = new Map(store.player.activePowerUps);
    let changed = false;
    newMap.forEach((t, k) => { if (now > t) { newMap.delete(k); changed = true; } });
    if (changed) store.setPlayer(p => ({...p, activePowerUps: newMap}));
  }

  handleShoot(origin: THREE.Vector3, dir: THREE.Vector3, weaponDmg: number, isHeadshot: boolean) {
    const hits = this.raycastZombies(origin, dir, 100);
    if (hits.length === 0) return false;
    const z = this.zombies.get(hits[0].id);
    if (!z || z.isDead) return false;
    const cfg = ZOMBIE_CFG[z.type];
    let dmg = weaponDmg * (isHeadshot ? 2 : 1);
    const store = useZombieStore.getState();
    if (store.player.activePowerUps.has("insta_kill")) dmg = z.hp;
    z.hp -= dmg;
    if (z.hp <= 0) {
      z.hp = 0; z.isDead = true; z.animTime = 0;
      store.addPoints(cfg.points);
      if (Math.random() < 0.05) this.spawnPowerUp(z.x, z.z);
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("zombieHit", {detail: {headshot:isHeadshot, damage:dmg}}));
    return true;
  }

  private raycastZombies(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number) {
    const hits: Array<{id: string; dist: number}> = [];
    const d = dir.clone().normalize();
    const candidates = this.grid.query(origin.x, origin.z, maxDist);
    const ids = candidates.size > 0 ? Array.from(candidates) : Array.from(this.zombies.keys());
    for (const id of ids) {
      const z = this.zombies.get(id);
      if (!z || z.isDead) continue;
      const center = new THREE.Vector3(z.x, z.y + 0.9, z.z);
      const proj = center.clone().sub(origin).dot(d);
      if (proj < 0 || proj > maxDist) continue;
      const closest = origin.clone().add(d.clone().multiplyScalar(proj));
      if (closest.distanceTo(center) < 0.6) hits.push({id, dist: proj});
    }
    return hits.sort((a, b) => a.dist - b.dist);
  }

  handleMelee(data: { direction: THREE.Vector3 }) {
    const dir = data.direction.clone().normalize();
    const origin = new THREE.Vector3(this.playerX, 0.9, this.playerZ);
    let best: ZombieState | null = null;
    let bestD = Infinity;
    for (const z of this.zombies.values()) {
      if (z.isDead) continue;
      const dx = z.x - origin.x, dz = z.z - origin.z;
      const d = Math.hypot(dx, dz);
      if (d < 2.5 && d < bestD) {
        const dot = (dx/d)*dir.x + (dz/d)*dir.z;
        if (dot > 0.55) { bestD = d; best = z; }
      }
    }
    if (best) {
      const dmg = 65;
      best.hp -= dmg;
      if (best.hp <= 0) {
        best.hp = 0; best.isDead = true; best.animTime = 0;
        useZombieStore.getState().addPoints(ZOMBIE_CFG[best.type].points + 10); // knife bonus
      }
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("zombieHit", {detail:{headshot:false, damage:dmg}}));
    }
  }

  private spawnPowerUp(x: number, z: number) {
    const types: PowerUpType[] = ["max_ammo","insta_kill","double_points","nuke","speed_cola","juggernog"];
    const type = types[Math.floor(Math.random() * types.length)];
    useZombieStore.getState().addPowerUp({
      id: `pu_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
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
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("maxAmmo"));
        break;
      case "insta_kill": case "double_points": case "speed_cola": case "juggernog":
        store.setPlayer(p => {
          const m = new Map(p.activePowerUps);
          m.set(pu.type, expire);
          return {...p, activePowerUps: m};
        });
        break;
      case "nuke":
        for (const z of this.zombies.values()) {
          if (!z.isDead) { z.hp = 0; z.isDead = true; z.animTime = 0; }
        }
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
  getAliveCount(): number { return this.aliveCount(); }

  cleanup() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.zombies.clear();
    this.spawnQueue = [];
  }
}

export const zombieEngine = new ZombieEngine();
