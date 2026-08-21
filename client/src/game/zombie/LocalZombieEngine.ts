import * as THREE from "three";
import {
  ZombieState,
  ZombieType,
  ZOMBIE_TYPES,
  WAVE_CONFIG,
  ZOMBIE_POINTS,
  ZOMBIE_SHOP,
  PACK_A_PUNCH,
  MYSTERY_BOX,
  BARRICADE_CONFIG,
  ZOMBIE_MAP_AREAS,
  PowerUpState,
  PowerUpType,
  WEAPONS,
  ZombieDifficulty,
  ZOMBIE_DIFFICULTIES,
  BarricadeState,
  PAP_WEAPON_VARIANTS,
  ZOMBIE_STARTING_POINTS,
  MED_STATION,
  ZombiePerkId,
} from "@cs-game/shared";
import { useZombieStore } from "../../stores/useZombieStore";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import { useZombieNetworkStore } from "../../stores/useZombieNetworkStore";
import { zombieSounds } from "../../lib/zombieSounds";

const POWER_UP_TYPES: PowerUpType[] = [
  "max_ammo",
  "insta_kill",
  "double_points",
  "nuke",
  "carpenter",
  "fire_sale",
];

export class LocalZombieEngine {
  private active = false;
  private difficulty: ZombieDifficulty = "normal";
  private currentWave = 0;
  private waveState: "waiting" | "buy_phase" | "spawning" | "active" | "wave_clear" = "waiting";
  private buyPhaseTimer = 0;
  private interWaveTimer = 0;
  private spawnTimer = 0;
  private spawnInterval = 0;
  private zombiesToSpawn = 0;
  private zombiesSpawned = 0;
  private totalBosses = 0;
  private bossesSpawned = 0;
  private isBossWave = false;

  private zombies = new Map<string, ZombieState>();
  private powerUps = new Map<string, PowerUpState>();
  private barricades = new Map<string, BarricadeState>();
  private unlockedAreas = new Set<string>(["spawn"]);
  private papWeapons = new Set<string>();

  private playerX = 0;
  private playerY = 1.6;
  private playerZ = -30;
  private playerRotationY = 0;
  private playerHp = 100;
  private playerMaxHp = 100;
  private playerArmor = 0;
  private soloRevives = 3;
  private kills = 0;
  private headshots = 0;
  private lastZombieAttackTimes = new Map<string, number>();

  init(difficulty: ZombieDifficulty = "normal") {
    this.difficulty = difficulty;
    const diffCfg = ZOMBIE_DIFFICULTIES[difficulty] || ZOMBIE_DIFFICULTIES.normal;
    this.soloRevives = diffCfg.soloRevives;
    this.playerHp = 100;
    this.playerMaxHp = 100;
    this.playerArmor = 0;
    this.kills = 0;
    this.headshots = 0;
    this.currentWave = 0;
    this.zombies.clear();
    this.powerUps.clear();
    this.papWeapons.clear();
    this.unlockedAreas = new Set(["spawn"]);
    this.lastZombieAttackTimes.clear();
    this.zombieDots.clear();
    this.playerDots = [];
    this.playerDotRemainder = 0;
    useWeaponStore.getState().setFireRateMultiplier(1);

    // Initialize barricades with full boards
    this.barricades.clear();
    BARRICADE_CONFIG.locations.forEach((loc) => {
      const b = new BarricadeState();
      b.id = loc.id;
      b.x = loc.x;
      b.y = loc.y;
      b.z = loc.z;
      b.rotationY = loc.rot;
      b.boards = BARRICADE_CONFIG.maxBoards;
      b.maxBoards = BARRICADE_CONFIG.maxBoards;
      b.hp = 100;
      this.barricades.set(loc.id, b);
    });

    const store = useZombieStore.getState();
    store.resetMatch();
    store.setPoints(ZOMBIE_STARTING_POINTS);
    store.setBarricades(Array.from(this.barricades.values()));
    store.setUnlockedAreas(Array.from(this.unlockedAreas));

    useZombieNetworkStore.setState({
      localHp: this.playerHp,
      localArmor: this.playerArmor,
      localIsDead: false,
      localIsDowned: false,
      soloRevives: this.soloRevives,
      kills: 0,
      headshots: 0,
      hasJuggernog: false,
      hasSpeedCola: false,
      hasDoubleTap: false,
      hasQuickRevive: false,
      hasPackAPunch: false,
      lastSnapshot: {
        x: this.playerX,
        y: this.playerY,
        z: this.playerZ,
        rotationY: this.playerRotationY,
        lastProcessedSeq: 0,
      },
    });

    this.active = true;
    this.startFirstWave();
  }

  stop() {
    this.active = false;
    this.zombies.clear();
    this.powerUps.clear();
    this.zombieDots.clear();
    this.playerDots = [];
    this.playerDotRemainder = 0;
  }

  isActive() {
    return this.active;
  }

  setPlayerPosition(x: number, y: number, z: number, rotationY: number) {
    this.playerX = x;
    this.playerY = y;
    this.playerZ = z;
    this.playerRotationY = rotationY;

    useZombieNetworkStore.setState({
      lastSnapshot: {
        x,
        y,
        z,
        rotationY,
        lastProcessedSeq: Date.now(),
      },
    });
  }

  startFirstWave() {
    this.waveState = "buy_phase";
    this.buyPhaseTimer = WAVE_CONFIG.firstWaveDelay;
    const store = useZombieStore.getState();
    store.setWaveState("buy_phase");
    store.setInterWaveTimer(this.buyPhaseTimer);
    store.setCurrentWave(0);
  }

  skipBuyPhase() {
    if (this.waveState === "buy_phase" || this.waveState === "wave_clear") {
      this.startWave();
    }
  }

  private startWave() {
    this.currentWave++;
    this.isBossWave = this.currentWave % 5 === 0;
    this.waveState = "spawning";
    this.buyPhaseTimer = 0;

    let count: number;
    if (this.isBossWave) {
      count = Math.floor(WAVE_CONFIG.baseZombieCount + this.currentWave * WAVE_CONFIG.zombiesPerWave * 0.6);
      this.totalBosses = 2 + Math.floor(this.currentWave / 5);
    } else {
      count = WAVE_CONFIG.baseZombieCount + this.currentWave * WAVE_CONFIG.zombiesPerWave;
      this.totalBosses = 0;
    }

    this.bossesSpawned = 0;
    this.zombiesToSpawn = count + this.totalBosses;
    this.zombiesSpawned = 0;
    this.spawnInterval = Math.max(0.3, WAVE_CONFIG.spawnDuration / this.zombiesToSpawn);
    this.spawnTimer = 0;

    const store = useZombieStore.getState();
    store.setCurrentWave(this.currentWave);
    store.setWaveState("spawning");
    store.setZombiesRemaining(this.zombiesToSpawn);

    zombieSounds.waveStart();

    // Spawn first batch
    this.spawnBatch();
  }

  private spawnBatch() {
    if (this.zombiesSpawned >= this.zombiesToSpawn) return;

    const remaining = this.zombiesToSpawn - this.zombiesSpawned;
    const batchSize = Math.min(remaining, Math.max(2, Math.ceil(this.zombiesToSpawn / 4)));
    const spawns = WAVE_CONFIG.spawnPoints;

    for (let i = 0; i < batchSize; i++) {
      const spawn = spawns[Math.floor(Math.random() * spawns.length)];
      let type: ZombieType = "walker";

      if (this.isBossWave && this.bossesSpawned < this.totalBosses) {
        type = "boss";
        this.bossesSpawned++;
      } else {
        type = this.determineType(this.currentWave);
      }

      this.spawnSingleZombie(type, spawn.x, spawn.z);
      this.zombiesSpawned++;
    }

    if (this.zombiesSpawned >= this.zombiesToSpawn) {
      this.waveState = "active";
      useZombieStore.getState().setWaveState("active");
    }
  }

  private determineType(wave: number): ZombieType {
    if (wave < 3) return "walker";
    const roll = Math.random();
    if (wave >= 7 && roll < 0.15) return "spitter";
    if (wave >= 5 && roll < 0.30) return "tank";
    if (wave >= 4 && roll < 0.45) return "exploder";
    if (wave >= 3 && roll < 0.60) return "runner";
    return "walker";
  }

  private spawnSingleZombie(type: ZombieType, x: number, z: number) {
    const id = `z_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const base = ZOMBIE_TYPES[type] || ZOMBIE_TYPES.walker;
    const diffCfg = ZOMBIE_DIFFICULTIES[this.difficulty] || ZOMBIE_DIFFICULTIES.normal;

    const hpMultiplier = 1 + (this.currentWave - 1) * WAVE_CONFIG.hpMultiplierPerWave;
    const maxHp = Math.round(base.hp * hpMultiplier * diffCfg.zombieHp);
    const speed = base.speed * (1 + (this.currentWave - 1) * WAVE_CONFIG.speedBonusPerWave) * diffCfg.zombieSpeed;

    const zombie = new ZombieState();
    zombie.id = id;
    zombie.type = type;
    zombie.x = x + (Math.random() - 0.5) * 4;
    zombie.y = 0;
    zombie.z = z + (Math.random() - 0.5) * 4;
    zombie.rotationY = 0;
    zombie.hp = maxHp;
    zombie.maxHp = maxHp;
    zombie.speed = speed;
    zombie.targetId = "local_player";
    zombie.isAttacking = false;
    zombie.isDead = false;

    this.zombies.set(id, zombie);
  }

  private zombieDots = new Map<string, { type: "fire" | "poison"; damagePerSec: number; remainingSec: number; stacks: number }[]>();
  private playerDots: { damagePerSec: number; remainingSec: number }[] = [];
  private playerDotRemainder = 0;

  update(dt: number) {
    if (!this.active) return;

    // ── Handle Wave State Machine ─────────────────────────
    if (this.waveState === "buy_phase") {
      this.buyPhaseTimer -= dt;
      useZombieStore.getState().setInterWaveTimer(Math.max(0, this.buyPhaseTimer));
      if (this.buyPhaseTimer <= 0) {
        this.startWave();
      }
    } else if (this.waveState === "spawning") {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnBatch();
      }
      this.updateZombies(dt);
    } else if (this.waveState === "active") {
      this.updateZombies(dt);

      // Check if wave is clear
      const aliveCount = Array.from(this.zombies.values()).filter((z) => !z.isDead).length;
      useZombieStore.getState().setZombiesRemaining(aliveCount);

      if (aliveCount === 0 && this.zombiesSpawned >= this.zombiesToSpawn) {
        this.waveState = "wave_clear";
        this.interWaveTimer = this.isBossWave ? 5.0 : 4.0;
        useZombieStore.getState().setWaveState("wave_clear");
        useZombieStore.getState().setInterWaveTimer(this.interWaveTimer);

        // Give bonus points
        const clearBonus = ZOMBIE_POINTS.waveClearBase + this.currentWave * ZOMBIE_POINTS.waveClearPerWave;
        const bossBonus = this.isBossWave ? 1000 + this.currentWave * 200 : 0;
        const diffCfg = ZOMBIE_DIFFICULTIES[this.difficulty] || ZOMBIE_DIFFICULTIES.normal;
        useZombieStore.getState().addPoints(Math.round((clearBonus + bossBonus) * diffCfg.points));
        zombieSounds.waveClear();
      }
    } else if (this.waveState === "wave_clear") {
      this.interWaveTimer -= dt;
      useZombieStore.getState().setInterWaveTimer(Math.max(0, this.interWaveTimer));
      if (this.interWaveTimer <= 0) {
        this.waveState = "buy_phase";
        this.buyPhaseTimer = WAVE_CONFIG.buyPhaseDuration;
        useZombieStore.getState().setWaveState("buy_phase");
        useZombieStore.getState().setInterWaveTimer(this.buyPhaseTimer);
        zombieSounds.powerUp();
      }
    }

    // ── Update Power-Up Timers ─────────────────────────────
    const activePowerUp = useZombieStore.getState().activePowerUp;
    const powerUpTimer = useZombieStore.getState().powerUpTimer;
    if (activePowerUp && powerUpTimer > 0) {
      const nextTimer = powerUpTimer - dt;
      if (nextTimer <= 0) {
        useZombieStore.getState().setActivePowerUp(null, 0);
      } else {
        useZombieStore.getState().setActivePowerUp(activePowerUp, nextTimer);
      }
    }

    // Dropped power-ups expire locally the same way they do on the server.
    this.powerUps.forEach((pu, id) => {
      pu.timeLeft -= dt;
      if (pu.timeLeft <= 0) this.powerUps.delete(id);
    });

    // Process Player Acid DOTs
    for (let i = this.playerDots.length - 1; i >= 0; i--) {
      const dot = this.playerDots[i];
      dot.remainingSec -= dt;
      this.damagePlayer(dot.damagePerSec * dt, { fromDot: true });
      if (dot.remainingSec <= 0) {
        this.playerDots.splice(i, 1);
      }
    }

    // Process Zombie Elemental DOTs
    this.zombieDots.forEach((dots, zId) => {
      const z = this.zombies.get(zId);
      if (!z || z.isDead) {
        this.zombieDots.delete(zId);
        return;
      }
      for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        dot.remainingSec -= dt;
        z.hp -= dot.damagePerSec * dt * (dot.stacks || 1);
        if (z.hp <= 0) {
          z.hp = 0;
          z.isDead = true;
          this.kills++;
          useZombieNetworkStore.setState({ kills: this.kills });
          zombieSounds.zombieDeath();
          const baseKillPts = ZOMBIE_POINTS[z.type as ZombieType] || 50;
          useZombieStore.getState().addPoints(baseKillPts);
          this.zombieDots.delete(zId);
          return;
        }
        if (dot.remainingSec <= 0) {
          dots.splice(i, 1);
        }
      }
      if (dots.length === 0) this.zombieDots.delete(zId);
    });

    // Sync zombies and powerups to store for rendering
    useZombieStore.getState().setZombies(Array.from(this.zombies.values()).filter((z) => !z.isDead));
    useZombieStore.getState().setPowerUps(Array.from(this.powerUps.values()));
  }

  private updateZombies(dt: number) {
    if (useZombieNetworkStore.getState().localIsDead) return;
    const now = performance.now();
    const diffCfg = ZOMBIE_DIFFICULTIES[this.difficulty] || ZOMBIE_DIFFICULTIES.normal;

    this.zombies.forEach((zombie) => {
      if (zombie.isDead) return;

      const dx = this.playerX - zombie.x;
      const dz = this.playerZ - zombie.z;
      const dist = Math.hypot(dx, dz);

      // Spitter AI: Kiting & Ranged Acid Spit
      if (zombie.type === "spitter") {
        zombie.rotationY = Math.atan2(dx, dz);
        if (dist < 5.0) {
          // Kite away
          zombie.isAttacking = false;
          const nx = -dx / (dist || 1);
          const nz = -dz / (dist || 1);
          zombie.x += nx * zombie.speed * 0.7 * dt;
          zombie.z += nz * zombie.speed * 0.7 * dt;
        } else if (dist > 11.0) {
          // Approach
          zombie.isAttacking = false;
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          zombie.x += nx * zombie.speed * dt;
          zombie.z += nz * zombie.speed * dt;
        } else {
          // In firing range (5-11m): spit attack
          const lastAtk = this.lastZombieAttackTimes.get(zombie.id) || 0;
          if (now - lastAtk >= 2200) {
            this.lastZombieAttackTimes.set(zombie.id, now);
            zombie.isAttacking = true;
            this.damagePlayer(12 * diffCfg.zombieDamage);
            this.playerDots.push({ damagePerSec: 2, remainingSec: 3 });
            zombieSounds.zombieHit();
          } else {
            zombie.isAttacking = false;
          }
        }
        return;
      }

      // Exploder AI: Move close then prime and explode
      if (zombie.type === "exploder") {
        zombie.rotationY = Math.atan2(dx, dz);
        if (dist <= 4.0) {
          zombie.isAttacking = true;
          const lastAtk = this.lastZombieAttackTimes.get(zombie.id) || 0;
          if (lastAtk === 0) {
            this.lastZombieAttackTimes.set(zombie.id, now);
          } else if (now - lastAtk >= 1500) {
            // Detonate
            zombie.isDead = true;
            zombie.hp = 0;
            zombieSounds.zombieDeath();
            if (dist <= 5.0) {
              const dmg = Math.round(60 * (1 - dist / 5.0) * diffCfg.zombieDamage);
              if (dmg > 0) this.damagePlayer(dmg);
            }
            return;
          }
        } else {
          zombie.isAttacking = false;
          this.lastZombieAttackTimes.delete(zombie.id);
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          zombie.x += nx * zombie.speed * dt;
          zombie.z += nz * zombie.speed * dt;
        }
        return;
      }

      // Standard / Boss Melee Behavior
      zombie.rotationY = Math.atan2(dx, dz);
      const attackRange = zombie.type === "boss" ? 3.0 : 1.6;

      if (dist > attackRange) {
        zombie.isAttacking = false;
        const moveStep = zombie.speed * dt;
        zombie.x += (dx / (dist || 1)) * moveStep;
        zombie.z += (dz / (dist || 1)) * moveStep;
      } else {
        zombie.isAttacking = true;
        const lastAtk = this.lastZombieAttackTimes.get(zombie.id) || 0;
        const cooldown = zombie.type === "runner" ? 800 : 1200;

        if (now - lastAtk >= cooldown) {
          this.lastZombieAttackTimes.set(zombie.id, now);
          const baseDmg = ZOMBIE_TYPES[zombie.type as ZombieType]?.damage || 15;
          const rawDamage = baseDmg * diffCfg.zombieDamage;
          this.damagePlayer(rawDamage);
          zombieSounds.playerHit();
        }
      }
    });
  }

  damagePlayer(rawDamage: number, opts?: { fromDot?: boolean }) {
    if (useZombieNetworkStore.getState().localIsDead) return;

    let damage: number;
    if (opts?.fromDot) {
      this.playerDotRemainder += rawDamage;
      damage = Math.floor(this.playerDotRemainder);
      if (damage < 1) return;
      this.playerDotRemainder -= damage;
    } else {
      damage = Math.max(1, Math.round(rawDamage));
    }

    if (this.playerArmor > 0) {
      const absorbed = Math.min(this.playerArmor, Math.ceil(damage * 0.5));
      this.playerArmor -= absorbed;
      damage -= absorbed;
      useZombieNetworkStore.setState({ localArmor: this.playerArmor });
    }

    if (damage <= 0) return;

    this.playerHp = Math.max(0, this.playerHp - damage);
    useZombieNetworkStore.setState({ localHp: this.playerHp });

    if (!opts?.fromDot) zombieSounds.playerHit();

    if (this.playerHp <= 0) {
      this.playerDots = [];
      this.playerDotRemainder = 0;
      if (this.soloRevives > 0) {
        this.soloRevives--;
        this.playerHp = this.playerMaxHp;
        this.playerArmor = 50;
        useZombieNetworkStore.setState({
          localHp: this.playerHp,
          localArmor: this.playerArmor,
          soloRevives: this.soloRevives,
        });
        zombieSounds.powerUp();
      } else {
        useZombieNetworkStore.setState({ localIsDead: true });
        zombieSounds.playerDeath();
      }
    }
  }

  handleHeal() {
    if (useZombieNetworkStore.getState().localIsDead) return;
    if (this.playerHp >= this.playerMaxHp) return;

    const points = useZombieStore.getState().points;
    if (points < MED_STATION.price) return;

    useZombieStore.getState().addPoints(-MED_STATION.price);
    this.playerHp = this.playerMaxHp;
    this.playerDots = [];
    this.playerDotRemainder = 0;
    useZombieNetworkStore.setState({ localHp: this.playerHp });
    zombieSounds.powerUp();
  }

  handleShoot(data: { direction: { x: number; y: number; z: number }; origin?: { x: number; y: number; z: number } }) {
    const activeWeapon = useWeaponStore.getState().activeWeapon;
    if (!activeWeapon || !(activeWeapon in WEAPONS)) return;

    const stats = WEAPONS[activeWeapon as WeaponKey];
    if (!stats) return;

    const origin = data.origin
      ? new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z)
      : new THREE.Vector3(this.playerX, this.playerY + 1.5, this.playerZ);
    const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z).normalize();

    let closestZombie: ZombieState | null = null;
    let closestDist = Infinity;
    let isHeadshotHit = false;

    this.zombies.forEach((zombie) => {
      if (zombie.isDead) return;

      const zPos = new THREE.Vector3(zombie.x, zombie.y + 0.9, zombie.z);
      const toZombie = zPos.clone().sub(origin);
      const dot = toZombie.dot(dir);

      if (dot <= 0 || dot > 80) return;

      const closestPoint = new THREE.Vector3().copy(origin).addScaledVector(dir, dot);
      const distToLine = closestPoint.distanceTo(zPos);

      const hitRadius = zombie.type === "boss" ? 1.8 : 0.9;
      if (distToLine < hitRadius) {
        const isHeadshot = closestPoint.y >= zombie.y + (zombie.type === "boss" ? 2.0 : 1.3);
        if (dot < closestDist) {
          closestDist = dot;
          closestZombie = zombie;
          isHeadshotHit = isHeadshot;
        }
      }
    });

    if (closestZombie) {
      const targetZombie: ZombieState = closestZombie;
      const isHeadshot = isHeadshotHit;
      let damage = isHeadshot ? (stats.headshot || stats.dmg * 2) : stats.dmg;

      // Pack-a-Punch multiplier
      const isPaP = useWeaponStore.getState().hasPackAPunch || this.papWeapons.has(activeWeapon);
      if (isPaP) {
        damage = Math.floor(damage * 1.5);
      }

      // Insta-kill power-up
      if (useZombieStore.getState().activePowerUp === "insta_kill") {
        damage = 99999;
      }

      targetZombie.hp -= damage;
      zombieSounds.zombieHit();

      const isArcCaster = activeWeapon === "arccaster";
      const variant = PAP_WEAPON_VARIANTS[activeWeapon];
      const effect = isArcCaster ? "chain_lightning" : (isPaP ? variant?.effect : null);

      if (targetZombie.hp <= 0) {
        targetZombie.hp = 0;
        targetZombie.isDead = true;
        this.kills++;
        if (isHeadshot) this.headshots++;

        useZombieNetworkStore.setState({ kills: this.kills, headshots: this.headshots });
        zombieSounds.zombieDeath();

        // Kill points
        const baseKillPts = ZOMBIE_POINTS[targetZombie.type as ZombieType] || 50;
        const basePts = isHeadshot ? baseKillPts + ZOMBIE_POINTS.headshotBonus : baseKillPts;
        const doubleMult = useZombieStore.getState().activePowerUp === "double_points" ? 2 : 1;
        const diffCfg = ZOMBIE_DIFFICULTIES[this.difficulty] || ZOMBIE_DIFFICULTIES.normal;
        useZombieStore.getState().addPoints(Math.round(basePts * doubleMult * diffCfg.points));

        // Power-up drop chance (7%)
        if (Math.random() < 0.07) {
          this.spawnPowerUp(targetZombie.x, targetZombie.z);
        }

        // Explosive M4A4 kill effect
        if (effect === "explosive") {
          this.zombies.forEach((other) => {
            if (other.id === targetZombie.id || other.isDead) return;
            const dist = Math.hypot(other.x - targetZombie.x, other.z - targetZombie.z);
            if (dist <= 3.0) {
              other.hp -= Math.round(40 * (1 - dist / 3.0));
              if (other.hp <= 0) {
                other.hp = 0;
                other.isDead = true;
                this.kills++;
                useZombieStore.getState().addPoints(ZOMBIE_POINTS.walker);
              }
            }
          });
        }
      } else {
        // Hit points
        const doubleMult = useZombieStore.getState().activePowerUp === "double_points" ? 2 : 1;
        useZombieStore.getState().addPoints(ZOMBIE_POINTS.assistDamage * doubleMult);
      }

      // Chain lightning (Arc Caster / AWP Thunderbolt)
      if (effect === "chain_lightning") {
        let maxChains = isArcCaster ? 2 : 3;
        let chainDmg = Math.round(damage * (isArcCaster ? 0.6 : 0.7));
        this.zombies.forEach((other) => {
          if (other.id === targetZombie.id || other.isDead || maxChains <= 0) return;
          const dist = Math.hypot(other.x - targetZombie.x, other.z - targetZombie.z);
          if (dist <= 6.0) {
            maxChains--;
            other.hp -= chainDmg;
            if (other.hp <= 0) {
              other.hp = 0;
              other.isDead = true;
              this.kills++;
              useZombieStore.getState().addPoints(ZOMBIE_POINTS.walker);
            }
          }
        });
      }

      // Fire DoT (AK-117, Tec-9)
      if (effect === "fire_dot") {
        const dots = this.zombieDots.get(targetZombie.id) ?? [];
        dots.push({ type: "fire", damagePerSec: 4, remainingSec: 3, stacks: 1 });
        this.zombieDots.set(targetZombie.id, dots);
      }

      // Poison DoT (MP5-K, AutoPistol)
      if (effect === "poison_dot") {
        const dots = this.zombieDots.get(targetZombie.id) ?? [];
        let pDot = dots.find((d) => d.type === "poison");
        if (pDot) {
          pDot.stacks = Math.min(3, pDot.stacks + 1);
          pDot.remainingSec = 4;
        } else {
          dots.push({ type: "poison", damagePerSec: 2, remainingSec: 4, stacks: 1 });
        }
        this.zombieDots.set(targetZombie.id, dots);
      }

      // Pierce (Deagle)
      if (effect === "pierce") {
        let count = 0;
        this.zombies.forEach((other) => {
          if (other.id === targetZombie.id || other.isDead || count >= 2) return;
          const toOther = new THREE.Vector3(other.x, other.y + 0.9, other.z).sub(origin);
          const pDot = toOther.dot(dir);
          if (pDot > closestDist && pDot < 80) {
            const pClosest = new THREE.Vector3().copy(origin).addScaledVector(dir, pDot);
            if (pClosest.distanceTo(new THREE.Vector3(other.x, other.y + 0.9, other.z)) < 1.0) {
              count++;
              other.hp -= Math.round(damage * 0.8);
              if (other.hp <= 0) {
                other.hp = 0;
                other.isDead = true;
                this.kills++;
                useZombieStore.getState().addPoints(ZOMBIE_POINTS.walker);
              }
            }
          }
        });
      }

      // Stun (Glock)
      if (effect === "stun") {
        targetZombie.speed = Math.max(0.5, targetZombie.speed * 0.4);
      }
    }
  }

  handleMelee(data: { direction: { x: number; y: number; z: number } }) {
    const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z).normalize();
    const origin = new THREE.Vector3(this.playerX, this.playerY, this.playerZ);

    let nearest: ZombieState | null = null;
    let nearestDist = 3.0;

    this.zombies.forEach((zombie) => {
      if (zombie.isDead) return;
      const zPos = new THREE.Vector3(zombie.x, zombie.y + 0.9, zombie.z);
      const dist = origin.distanceTo(zPos);
      if (dist < nearestDist) {
        const toZombie = zPos.clone().sub(origin).normalize();
        if (toZombie.dot(dir) > 0.5) {
          nearest = zombie;
          nearestDist = dist;
        }
      }
    });

    if (nearest) {
      const zombie: ZombieState = nearest;
      let damage = 55;
      if (useZombieStore.getState().activePowerUp === "insta_kill") damage = 99999;

      zombie.hp -= damage;
      zombieSounds.zombieHit();

      if (zombie.hp <= 0) {
        zombie.hp = 0;
        zombie.isDead = true;
        this.kills++;
        useZombieNetworkStore.setState({ kills: this.kills });
        zombieSounds.zombieDeath();

        const baseKillPts = (ZOMBIE_POINTS[zombie.type as ZombieType] || 50) + ZOMBIE_POINTS.knifeBonus;
        const doubleMult = useZombieStore.getState().activePowerUp === "double_points" ? 2 : 1;
        const diffCfg = ZOMBIE_DIFFICULTIES[this.difficulty] || ZOMBIE_DIFFICULTIES.normal;
        useZombieStore.getState().addPoints(Math.round(baseKillPts * doubleMult * diffCfg.points));
      }
    }
  }

  private spawnPowerUp(x: number, z: number) {
    const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    const id = `pu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const powerUp = new PowerUpState();
    powerUp.id = id;
    powerUp.type = type;
    powerUp.x = x;
    powerUp.y = 0.5;
    powerUp.z = z;
    powerUp.timeLeft = 25;
    this.powerUps.set(id, powerUp);
  }

  handlePickupPowerUp(id: string) {
    const pu = this.powerUps.get(id);
    if (!pu) return;

    this.powerUps.delete(id);
    zombieSounds.powerUp();

    switch (pu.type) {
      case "max_ammo": {
        const active = useWeaponStore.getState().activeWeapon;
        if (active && (active in WEAPONS)) {
          const stats = WEAPONS[active as WeaponKey];
          const isUpgraded = this.papWeapons.has(active);
          const reserve = Math.floor(stats.reserveAmmo * (isUpgraded ? PACK_A_PUNCH.extraAmmoMultiplier : 1));
          useWeaponStore.getState().equipWeapon(active as WeaponKey, { ammo: stats.mag, reserveAmmo: reserve });
        }
        break;
      }
      case "nuke": {
        this.zombies.forEach((z) => {
          if (!z.isDead) {
            z.hp = 0;
            z.isDead = true;
            this.kills++;
          }
        });
        useZombieStore.getState().addPoints(400);
        zombieSounds.zombieDeath();
        break;
      }
      case "carpenter": {
        this.barricades.forEach((b) => {
          b.boards = b.maxBoards;
          b.hp = 100;
        });
        useZombieStore.getState().setBarricades(Array.from(this.barricades.values()));
        useZombieStore.getState().addPoints(200);
        break;
      }
      case "insta_kill":
      case "double_points":
      case "fire_sale": {
        useZombieStore.getState().setActivePowerUp(pu.type, 30);
        break;
      }
    }
  }

  handleBuyWeapon(weapon: string) {
    const price = ZOMBIE_SHOP.weaponPrices[weapon];
    if (price === undefined || !(weapon in WEAPONS)) return;

    const points = useZombieStore.getState().points;
    if (points < price) return;

    useZombieStore.getState().addPoints(-price);
    useWeaponStore.getState().equipWeapon(weapon as WeaponKey);

    const isPaP = this.papWeapons.has(weapon);
    useWeaponStore.getState().setHasPackAPunch(isPaP);
    if (isPaP && PACK_A_PUNCH.dualWieldWeapons.includes(weapon as any)) {
      useWeaponStore.getState().setDualWield(true);
    } else {
      useWeaponStore.getState().setDualWield(false);
    }

    zombieSounds.purchase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombieWeaponBought", { detail: { weapon } }));
    }
  }

  handleBuyAmmo() {
    const active = useWeaponStore.getState().activeWeapon;
    if (!active || !(active in WEAPONS)) return;
    const stats = WEAPONS[active as WeaponKey];
    if (!stats) return;

    const points = useZombieStore.getState().points;
    if (points < ZOMBIE_SHOP.ammoPrice) return;

    useZombieStore.getState().addPoints(-ZOMBIE_SHOP.ammoPrice);
    const isPaP = this.papWeapons.has(active);
    const reserve = Math.floor(stats.reserveAmmo * (isPaP ? PACK_A_PUNCH.extraAmmoMultiplier : 1));
    useWeaponStore.getState().equipWeapon(active as WeaponKey, { ammo: stats.mag, reserveAmmo: reserve });

    zombieSounds.purchase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombiePurchase", { detail: { item: "ammo" } }));
    }
  }

  handleBuyArmor() {
    const points = useZombieStore.getState().points;
    if (points < ZOMBIE_SHOP.armorPrice) return;

    useZombieStore.getState().addPoints(-ZOMBIE_SHOP.armorPrice);
    this.playerArmor = 100;
    useZombieNetworkStore.setState({ localArmor: 100 });

    zombieSounds.purchase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombiePurchase", { detail: { item: "armor" } }));
    }
  }

  handleBuyPerk(perk: string) {
    const perkCfg = ZOMBIE_SHOP.perks[perk as ZombiePerkId];
    if (!perkCfg) return;

    const net = useZombieNetworkStore.getState();
    if (perk === "juggernog" && net.hasJuggernog) return;
    if (perk === "speedcola" && net.hasSpeedCola) return;
    if (perk === "doubletap" && net.hasDoubleTap) return;
    if (perk === "quickrevive" && net.hasQuickRevive) return;

    const points = useZombieStore.getState().points;
    if (points < perkCfg.price) return;

    useZombieStore.getState().addPoints(-perkCfg.price);

    if (perk === "juggernog") {
      this.playerMaxHp = 200;
      this.playerHp = 200;
      useZombieNetworkStore.setState({ localHp: 200, hasJuggernog: true });
    } else if (perk === "speedcola") {
      useZombieNetworkStore.setState({ hasSpeedCola: true });
    } else if (perk === "doubletap") {
      useZombieNetworkStore.setState({ hasDoubleTap: true });
      useWeaponStore.getState().setFireRateMultiplier(1.33);
    } else if (perk === "quickrevive") {
      this.soloRevives++;
      useZombieNetworkStore.setState({ hasQuickRevive: true, soloRevives: this.soloRevives });
    }

    zombieSounds.powerUp();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombiePurchase", { detail: { item: perk } }));
    }
  }

  handleMysteryBox() {
    const isFireSale = useZombieStore.getState().activePowerUp === "fire_sale";
    const price = isFireSale ? MYSTERY_BOX.fireSalePrice : MYSTERY_BOX.price;
    const points = useZombieStore.getState().points;
    if (points < price) return;

    useZombieStore.getState().addPoints(-price);

    const pool: string[] = [];
    for (const [w, weight] of Object.entries(MYSTERY_BOX.weights)) {
      for (let i = 0; i < weight; i++) pool.push(w);
    }
    const rolledWeapon = pool[Math.floor(Math.random() * pool.length)] || "ak47";

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mysteryBoxSpin", { detail: { weapon: rolledWeapon } }));
      setTimeout(() => {
        if (rolledWeapon in WEAPONS) {
          useWeaponStore.getState().equipWeapon(rolledWeapon as WeaponKey);
        }
        window.dispatchEvent(new CustomEvent("mysteryBoxResult", { detail: { weapon: rolledWeapon } }));
        zombieSounds.purchase();
      }, 3000);
    }
    return rolledWeapon;
  }

  handlePackAPunch() {
    const active = useWeaponStore.getState().activeWeapon;
    if (!active || !(active in WEAPONS)) return;
    if (this.papWeapons.has(active)) return;

    const points = useZombieStore.getState().points;
    if (points < PACK_A_PUNCH.price) return;

    useZombieStore.getState().addPoints(-PACK_A_PUNCH.price);
    this.papWeapons.add(active);

    const isDual = PACK_A_PUNCH.dualWieldWeapons.includes(active as any);
    useWeaponStore.getState().addUpgradedWeapon(active, isDual);

    const stats = WEAPONS[active as WeaponKey];
    if (stats) {
      const reserve = Math.floor(stats.reserveAmmo * PACK_A_PUNCH.extraAmmoMultiplier);
      useWeaponStore.getState().equipWeapon(active as WeaponKey, { ammo: stats.mag, reserveAmmo: reserve });
    }

    zombieSounds.powerUp();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("packAPunchComplete"));
    }
  }

  handleRepairBarricade(barricadeId: string) {
    const b = this.barricades.get(barricadeId);
    if (!b || b.boards >= b.maxBoards) return;

    b.boards = Math.min(b.maxBoards, b.boards + 1);
    useZombieStore.getState().setBarricades(Array.from(this.barricades.values()));
    useZombieStore.getState().addPoints(BARRICADE_CONFIG.pointsPerRepair);
    zombieSounds.purchase();
  }

  handleUnlockArea(areaId: string) {
    const area = ZOMBIE_MAP_AREAS.find((a) => a.id === areaId);
    if (!area) return;
    if (this.unlockedAreas.has(areaId)) return;

    const points = useZombieStore.getState().points;
    if (points < area.price) return;

    useZombieStore.getState().addPoints(-area.price);
    this.unlockedAreas.add(areaId);
    useZombieStore.getState().setUnlockedAreas(Array.from(this.unlockedAreas));
    zombieSounds.powerUp();
  }
}

export const localZombieEngine = new LocalZombieEngine();
