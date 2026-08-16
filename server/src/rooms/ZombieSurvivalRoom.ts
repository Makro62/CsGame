import { Room, Client } from "colyseus";
import {
  GameState,
  PlayerState,
  BarricadeState,
  BARRICADE_CONFIG,
  EXTRACTION_CONFIG,
  PAP_WEAPON_VARIANTS,
  ZOMBIE_SPAWN,
  ZOMBIE_POINTS,
  ZOMBIE_TYPES,
  POWER_UPS,
  POWER_UP_DROP_CHANCE,
  MYSTERY_BOX,
  PACK_A_PUNCH,
  ZOMBIE_MAP_AREAS,
  ZOMBIE_MAP_BOUNDARY,
  ZOMBIE_SHOP,
  ZOMBIE_INTERACT_RANGE,
  ZOMBIE_DIFFICULTIES,
  MYSTERY_BOX_POS,
  PACK_A_PUNCH_POS,
  MELEE,
  isMeleeWeapon,
  isZombieDifficulty,
  PowerUpType,
  PowerUpState,
  SERVER,
  WEAPONS,
  PHYSICS,
  ClientInput,
  ShootInput,
  MeleeInput,
  ZombieBuyFailReason,
  ZombieDifficulty,
  ZombiePerkId,
} from "@cs-game/shared";
import { ZombieController } from "../ai/ZombieController";
import { WaveSystem } from "../systems/WaveSystem";
import { AntiCheatSystem } from "./AntiCheatSystem";

const TICK_MS = 1000 / SERVER.tickRate;

/** Hitscan cannot reach further than this, mirroring the arena size. */
const MAX_SHOT_RANGE = 120;
/** Zombies are ~1.8m tall; anything above this counts as a head hit. */
const HEAD_HEIGHT = 1.45;

function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    // eslint-disable-next-line no-control-regex -- strip control chars from nicknames
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, 20);
}

export class ZombieSurvivalRoom extends Room<GameState> {
  private zombieCtrl!: ZombieController;
  private waveSystem!: WaveSystem;
  private tickInterval!: ReturnType<typeof setInterval>;
  private lastTick = 0;
  private extractionSurgeTimer = 0;

  // Rate limiting / cooldowns per player
  private lastShotTimes = new Map<string, number>();
  private lastRepairTimes = new Map<string, number>();
  private lastInputTime = new Map<string, number>();
  private activeMysteryBoxTimers = new Map<string, NodeJS.Timeout>();
  private reloadTimers = new Map<string, NodeJS.Timeout>();
  private soloRevivesCount = new Map<string, number>();
  /** Weapons a player actually paid for; switching is limited to these. */
  private ownedWeapons = new Map<string, Set<string>>();
  /** Magazine + reserve stashed per owned weapon so swaps keep leftover ammo. */
  private weaponAmmo = new Map<string, Map<string, { ammo: number; reserve: number }>>();
  private antiCheat = new AntiCheatSystem();
  private difficulty: ZombieDifficulty = "normal";
  private zombieDifficulty = ZOMBIE_DIFFICULTIES.normal;

  onCreate(options?: { difficulty?: unknown }) {
    this.setState(new GameState());
    this.maxClients = 4;

    const requested = options?.difficulty;
    if (isZombieDifficulty(requested)) {
      this.difficulty = requested;
    }
    this.zombieDifficulty = ZOMBIE_DIFFICULTIES[this.difficulty];

    // Initialize systems
    this.zombieCtrl = new ZombieController();
    this.zombieCtrl.setDifficulty(
      this.zombieDifficulty.zombieHp,
      this.zombieDifficulty.zombieSpeed
    );
    this.waveSystem = new WaveSystem(this.state, this.zombieCtrl);

    // Initialize barricades
    this.initBarricades();

    // Message handlers
    this.onMessage("input", this.handleInput.bind(this));
    this.onMessage("shoot", this.handleShoot.bind(this));
    this.onMessage("melee", this.handleMelee.bind(this));
    this.onMessage("reload", this.handleReload.bind(this));
    this.onMessage("switch_weapon", this.handleSwitchWeapon.bind(this));
    this.onMessage("chat", this.handleChat.bind(this));
    this.onMessage("start_game", this.handleStartGame.bind(this));
    this.onMessage("buy_weapon", this.handleBuyWeapon.bind(this));
    this.onMessage("buy_ammo", this.handleBuyAmmo.bind(this));
    this.onMessage("buy_armor", this.handleBuyArmor.bind(this));
    this.onMessage("buy_perk", this.handleBuyPerk.bind(this));
    this.onMessage("use_mystery_box", this.handleMysteryBox.bind(this));
    this.onMessage("use_pack_a_punch", this.handlePackAPunch.bind(this));
    this.onMessage("unlock_area", this.handleUnlockArea.bind(this));
    this.onMessage("repair_barricade", this.handleRepairBarricade.bind(this));
    this.onMessage("trigger_extraction", this.handleTriggerExtraction.bind(this));
    this.onMessage("start_revive", this.handleStartRevive.bind(this));
    this.onMessage("cancel_revive", this.handleCancelRevive.bind(this));
    this.onMessage("tick_revive", this.handleTickRevive.bind(this));
    this.onMessage("pickup_powerup", (client, data: { id: string }) => {
      this.pickupPowerUp(client, data.id);
    });

    // Start game loop
    this.lastTick = Date.now();
    this.tickInterval = setInterval(() => this.gameTick(), TICK_MS);
  }

  private initBarricades() {
    this.state.barricades.clear();
    BARRICADE_CONFIG.locations.forEach((loc) => {
      const barricade = new BarricadeState();
      barricade.id = loc.id;
      barricade.x = loc.x;
      barricade.y = loc.y;
      barricade.z = loc.z;
      barricade.rotationY = loc.rot;
      barricade.boards = BARRICADE_CONFIG.maxBoards;
      barricade.maxBoards = BARRICADE_CONFIG.maxBoards;
      barricade.hp = 100;
      this.state.barricades.set(loc.id, barricade);
    });
  }

  onJoin(client: Client, options: { nickname?: string }) {
    const playerCount = this.state.players.size;
    const player = new PlayerState();
    player.nickname = sanitizeNickname(options.nickname) || `Survivor${playerCount + 1}`;
    player.x = ZOMBIE_SPAWN.player.x;
    player.y = ZOMBIE_SPAWN.player.y;
    player.z = ZOMBIE_SPAWN.player.z;
    player.hp = 100;
    player.isDead = false;
    player.isDowned = false;
    player.downedTimer = 0;
    player.currentWeapon = "deagle";
    player.secondaryWeapon = "deagle";
    player.ammo = 14;
    player.reserveAmmo = 70;
    this.state.players.set(client.sessionId, player);
    this.state.points.set(client.sessionId, 500);
    this.ownedWeapons.set(client.sessionId, new Set(["deagle", "knife"]));
    this.weaponAmmo.set(
      client.sessionId,
      new Map([
        ["deagle", { ammo: player.ammo, reserve: player.reserveAmmo }],
        ["knife", { ammo: 0, reserve: 0 }],
      ])
    );
    this.soloRevivesCount.set(client.sessionId, this.zombieDifficulty.soloRevives);

    // The Safe House is where everyone starts, so it must count as unlocked or
    // every area that requires it can never be bought.
    if (!this.state.unlockedAreas.get("spawn")) {
      this.state.unlockedAreas.set("spawn", 1);
    }

    client.send("matchSetup", {
      difficulty: this.difficulty,
      soloRevives: this.zombieDifficulty.soloRevives,
    });

    // Sync existing zombies to new player
    this.zombieCtrl.getAllZombies().forEach((zombie) => {
      this.state.zombies.set(zombie.id, zombie);
    });

    // Waves only start once a player asks for it, otherwise zombies would
    // already be closing in while the lobby screen is still open.
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.state.points.delete(client.sessionId);
    this.lastShotTimes.delete(client.sessionId);
    this.lastRepairTimes.delete(client.sessionId);
    this.lastInputTime.delete(client.sessionId);
    this.ownedWeapons.delete(client.sessionId);
    this.weaponAmmo.delete(client.sessionId);
    this.soloRevivesCount.delete(client.sessionId);
    this.antiCheat.clearAll(client.sessionId);

    const timer = this.activeMysteryBoxTimers.get(client.sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeMysteryBoxTimers.delete(client.sessionId);
    }

    const reload = this.reloadTimers.get(client.sessionId);
    if (reload) {
      clearTimeout(reload);
      this.reloadTimers.delete(client.sessionId);
    }

    // Someone leaving mid-revive must not leave their reviver stuck.
    this.state.players.forEach((p) => {
      if (p.reviveTargetId === client.sessionId) {
        p.isReviving = false;
        p.reviveTargetId = "";
        p.reviveProgress = 0;
      }
    });

    // Reset game if all players leave
    if (this.state.players.size === 0) {
      this.resetGame();
    }
  }

  onDispose() {
    clearInterval(this.tickInterval);
    this.activeMysteryBoxTimers.forEach((timer) => clearTimeout(timer));
    this.activeMysteryBoxTimers.clear();
    this.reloadTimers.forEach((timer) => clearTimeout(timer));
    this.reloadTimers.clear();
    this.zombieCtrl.clearAll();
  }

  private buyFailed(client: Client, item: string, reason: ZombieBuyFailReason) {
    client.send("zombieBuyFailed", { item, reason });
  }

  private pointsOf(sessionId: string): number {
    return this.state.points.get(sessionId) ?? 0;
  }

  /** Distance on the ground plane, used by every proximity check. */
  private distanceTo(player: PlayerState, x: number, z: number): number {
    return Math.sqrt((player.x - x) ** 2 + (player.z - z) ** 2);
  }

  private resetGame() {
    this.zombieCtrl.clearAll();
    this.state.zombies.clear();
    this.state.powerUps.clear();
    this.state.activePowerUp = "";
    this.state.powerUpTimer = 0;
    this.state.phase = "waiting";
    this.state.currentWave = 0;
    this.state.waveState = "waiting";
    this.state.extractionActive = false;
    this.state.extractionTimer = 0;
    this.state.extractionAvailable = false;
    this.state.evacSuccess = false;
    this.state.unlockedAreas.clear();
    this.state.unlockedAreas.set("spawn", 1);
    this.extractionSurgeTimer = 0;
    this.reloadTimers.forEach((timer) => clearTimeout(timer));
    this.reloadTimers.clear();
    this.waveSystem.reset();
    this.initBarricades();
  }

  private gameTick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Update zombie AI with barricade awareness
    const players = new Map<string, { x: number; y: number; z: number; hp: number; isDead: boolean; isDowned?: boolean }>();
    this.state.players.forEach((p, id) => {
      players.set(id, { x: p.x, y: p.y, z: p.z, hp: p.hp, isDead: p.isDead, isDowned: p.isDowned });
    });

    const aiResult = this.zombieCtrl.update(dt, players, this.state.barricades);

    // Handle attacked barricades
    aiResult.attackedBarricades.forEach((att) => {
      const barricade = this.state.barricades.get(att.barricadeId);
      if (barricade && barricade.boards > 0) {
        barricade.hp -= att.damage;
        if (barricade.hp <= 0) {
          barricade.boards = Math.max(0, barricade.boards - 1);
          barricade.hp = 100;
          this.broadcast("barricadeDamaged", { barricadeId: barricade.id, boards: barricade.boards });
        }
      }
    });

    // Check zombie attacks on players. A swing only lands on the zombie's own
    // target; otherwise standing together in co-op multiplies the damage taken.
    const zombiesForAttack = Array.from(this.zombieCtrl.getAllZombies().values());
    for (const zombie of zombiesForAttack) {
      if (zombie.isDead || !zombie.isAttacking) continue;

      const victimId = zombie.targetId;
      const victim = victimId ? this.state.players.get(victimId) : undefined;
      if (!victim || victim.isDead) continue;

      // Bosses stomp an area, everything else has to be within arm's reach.
      const reach = zombie.type === "boss" ? 2.8 : 1.6;
      if (this.distanceTo(victim, zombie.x, zombie.z) >= reach) continue;

      this.damagePlayer(
        victimId,
        victim,
        ZOMBIE_TYPES[zombie.type].damage * this.zombieDifficulty.zombieDamage
      );
    }

    // Update active revives (authoritative progression)
    this.state.players.forEach((reviver, reviverId) => {
      if (reviver.isReviving && reviver.reviveTargetId) {
        const target = this.state.players.get(reviver.reviveTargetId);
        if (!target || !target.isDowned || target.isDead) {
          reviver.isReviving = false;
          reviver.reviveTargetId = "";
          reviver.reviveProgress = 0;
          return;
        }

        // A reviver who went down or died cannot keep working.
        if (reviver.isDead || reviver.isDowned) {
          reviver.isReviving = false;
          const abortedTarget = reviver.reviveTargetId;
          reviver.reviveTargetId = "";
          reviver.reviveProgress = 0;
          this.broadcast("reviveProgress", { reviverId, targetId: abortedTarget, progress: 0 });
          return;
        }

        // Validate distance
        const dist = Math.sqrt((reviver.x - target.x) ** 2 + (reviver.z - target.z) ** 2);
        if (dist > 3.5) {
          reviver.isReviving = false;
          const abortedTarget = reviver.reviveTargetId;
          reviver.reviveTargetId = "";
          reviver.reviveProgress = 0;
          this.broadcast("reviveProgress", { reviverId, targetId: abortedTarget, progress: 0 });
          return;
        }

        // Revive duration: 1.5s with Quick Revive, else 3.0s
        const duration = reviver.hasQuickRevive ? 1.5 : 3.0;
        reviver.reviveProgress += (dt / duration) * 100;

        if (reviver.reviveProgress >= 100) {
          target.isDowned = false;
          target.hp = target.hasJuggernog ? 100 : 50;
          target.downedTimer = 0;
          reviver.isReviving = false;
          reviver.reviveProgress = 0;
          const targetId = reviver.reviveTargetId;
          reviver.reviveTargetId = "";

          const currentPoints = this.state.points.get(reviverId) ?? 0;
          this.state.points.set(reviverId, currentPoints + ZOMBIE_POINTS.reviveAlly);

          this.broadcast("playerRevived", {
            targetId,
            reviverId,
            autoRevive: false,
          });
        } else {
          this.broadcast("reviveProgress", {
            reviverId,
            targetId: reviver.reviveTargetId,
            progress: Math.round(reviver.reviveProgress),
          });
        }
      }
    });

    // Update downed player bleedout timers. Self-revive only kicks in at the
    // very end of the bleedout, and each use costs one of the match's lives.
    this.state.players.forEach((p, sessionId) => {
      if (!p.isDowned || p.isDead) return;

      p.downedTimer -= dt;
      if (p.downedTimer > 0) return;

      const isSolo = this.state.players.size === 1;
      const revivesRemaining = this.soloRevivesCount.get(sessionId) ?? 0;

      if (isSolo && revivesRemaining > 0) {
        this.soloRevivesCount.set(sessionId, revivesRemaining - 1);
        this.selfRevive(sessionId, p);
      } else if (isSolo && p.hasQuickRevive) {
        // Quick Revive is consumed as one extra life.
        p.hasQuickRevive = false;
        this.selfRevive(sessionId, p);
      } else {
        p.isDowned = false;
        p.isDead = true;
        this.broadcast("playerDied", { sessionId });
      }
    });

    this.checkGameOver();

    // Update extraction sequence. The wave system keeps ticking through it so
    // counters stay live and the round can still advance afterwards.
    if (this.state.extractionActive) {
      this.state.extractionTimer -= dt;
      this.extractionSurgeTimer += dt;

      if (this.extractionSurgeTimer >= 5) {
        this.extractionSurgeTimer = 0;
        this.waveSystem.spawnExtractionSurge();
      }

      if (this.state.extractionTimer <= 0) {
        this.checkExtractionSuccess();
      }
    }

    if (this.state.phase === "active") {
      this.waveSystem.update(dt, players);
    }

    // Sync zombie positions to state
    this.zombieCtrl.getAllZombies().forEach((zombie) => {
      this.state.zombies.set(zombie.id, zombie);
    });

    // Update power-up timers
    if (this.state.powerUpTimer > 0) {
      this.state.powerUpTimer -= dt;
      if (this.state.powerUpTimer <= 0) {
        this.state.activePowerUp = "";
        this.state.powerUpTimer = 0;
      }
    }

    // Despawn old power-ups
    this.state.powerUps.forEach((powerUp, id) => {
      powerUp.timeLeft -= dt;
      if (powerUp.timeLeft <= 0) {
        this.state.powerUps.delete(id);
      }
    });

    // Broadcast snapshot
    this.broadcastSnapshot();
  }

  private selfRevive(sessionId: string, player: PlayerState) {
    player.isDowned = false;
    player.hp = player.hasJuggernog ? 150 : 100;
    player.downedTimer = 0;
    this.broadcast("playerRevived", {
      targetId: sessionId,
      reviverId: sessionId,
      autoRevive: true,
      revivesLeft: this.soloRevivesCount.get(sessionId) ?? 0,
    });
  }

  /**
   * Ends the match once nobody can fight back. In co-op a fully downed squad is
   * wiped right away since no one is left to revive; solo players keep their
   * bleedout so a self-revive still has a chance to fire.
   */
  private checkGameOver() {
    if (this.state.phase !== "active" || this.state.players.size === 0) return;

    let standing = 0;
    let downed = 0;

    this.state.players.forEach((p) => {
      if (p.isDead) return;
      if (p.isDowned) downed++;
      else standing++;
    });

    if (standing > 0) return;
    if (downed > 0 && this.state.players.size === 1) return;

    this.state.players.forEach((p, sessionId) => {
      if (!p.isDead) {
        p.isDowned = false;
        p.isDead = true;
        this.broadcast("playerDied", { sessionId });
      }
    });

    const stats = this.waveSystem.getStats();
    this.state.phase = "waiting";
    this.broadcast("gameOver", {
      wave: this.state.currentWave,
      kills: stats.kills,
      headshots: stats.headshots,
    });
  }

  /** Applies armor absorption, then health, and downs the player at zero. */
  private damagePlayer(sessionId: string, player: PlayerState, rawDamage: number) {
    let damage = Math.max(1, Math.round(rawDamage));

    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, Math.ceil(damage * 0.5));
      player.armor -= absorbed;
      damage -= absorbed;
    }

    player.hp = Math.max(0, player.hp - damage);
    // The client needs an event to flash the damage vignette; state sync alone
    // gives no hint about the direction or the moment of the hit.
    this.broadcast("damage", { victimId: sessionId, damage });

    if (player.hp <= 0) {
      this.handlePlayerDowned(sessionId, player);
    }
  }

  private handlePlayerDowned(sessionId: string, player: PlayerState) {
    if (player.isDowned || player.isDead) return;

    player.isDowned = true;
    player.downedTimer = 30;
    player.hp = 100;
    player.currentWeapon = "deagle"; // Lock to pistol

    this.broadcast("playerDowned", { sessionId, timer: 30 });
  }

  private handleInput(client: Client, data: ClientInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead) return;

    // Reject duplicate / out-of-order packets the same way GameRoom does.
    if (data.seq <= player.lastProcessedSeq) return;

    const now = performance.now();
    if (!this.antiCheat.validateInputRate(client.sessionId, now)) return;

    const lastTime = this.lastInputTime.get(client.sessionId) || now;
    // Real dt clamped to prevent speed-hack exploitation (max 2x tick).
    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, (TICK_MS * 2) / 1000);
    this.lastInputTime.set(client.sessionId, now);

    // Crawl speed if downed, else normal
    let speed: number = PHYSICS.walkSpeed;
    if (player.isDowned) {
      speed = 1.2;
    } else if (data.sprint) {
      speed = PHYSICS.sprintSpeed;
    }

    let dx = 0;
    let dz = 0;
    if (data.forward) dz -= 1;
    if (data.backward) dz += 1;
    if (data.left) dx -= 1;
    if (data.right) dx += 1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx = (dx / len) * speed * dt;
      dz = (dz / len) * speed * dt;
    }

    const cos = Math.cos(data.rotationY);
    const sin = Math.sin(data.rotationY);
    let rdx = dx * cos - dz * sin;
    let rdz = dx * sin + dz * cos;

    let nextX = player.x + rdx;
    let nextZ = player.z + rdz;

    if (!this.antiCheat.validateSpeed(client.sessionId, player, nextX, nextZ, dt)) {
      const allowedDist = PHYSICS.sprintSpeed * 1.35 * dt;
      const actualDist = Math.sqrt(rdx * rdx + rdz * rdz);
      if (actualDist > 0.001) {
        const scale = allowedDist / actualDist;
        rdx *= scale;
        rdz *= scale;
      }
      nextX = player.x + rdx;
      nextZ = player.z + rdz;
    }

    if (this.antiCheat.shouldKick(client.sessionId)) {
      client.leave(4000);
      return;
    }

    player.x = Math.max(ZOMBIE_MAP_BOUNDARY.minX, Math.min(ZOMBIE_MAP_BOUNDARY.maxX, nextX));
    player.z = Math.max(ZOMBIE_MAP_BOUNDARY.minZ, Math.min(ZOMBIE_MAP_BOUNDARY.maxZ, nextZ));
    player.rotationY = data.rotationY;
    player.lastProcessedSeq = data.seq;

    client.send("snapshot", {
      x: player.x,
      y: player.y,
      z: player.z,
      rotationY: player.rotationY,
      lastProcessedSeq: data.seq,
    });
  }

  private handleShoot(client: Client, data: ShootInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isReloading) return;

    // Knives go through the melee handler, they have no bullets.
    if (isMeleeWeapon(player.currentWeapon)) return;

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats) return;

    // Enforce fire rate on server (shared anti-cheat + Double Tap perk)
    const now = Date.now();
    const lastShot = this.lastShotTimes.get(client.sessionId) ?? 0;
    if (!player.hasDoubleTap && !this.antiCheat.validateFireRate(client.sessionId, player.currentWeapon, lastShot, now)) {
      return;
    }
    const baseCooldownMs = 1000 / (weaponStats.fireRate || 10);
    const effectiveCooldownMs = player.hasDoubleTap ? baseCooldownMs * 0.75 : baseCooldownMs;

    if (now - lastShot < effectiveCooldownMs - 20) {
      return;
    }
    this.lastShotTimes.set(client.sessionId, now);

    // Check ammo
    if (player.ammo <= 0) return;
    if (!this.antiCheat.validateAmmo(client.sessionId, player, player.currentWeapon)) return;
    player.ammo--;
    this.stashCurrentAmmo(client.sessionId, player);

    // Simple hitscan against zombies
    const origin = { x: player.x, y: player.y + (player.isDowned ? 0.6 : 1.5), z: player.z };
    const direction = this.normalizeDirection(data.direction);
    if (!direction) return;

    let closestZombie: { id: string; dist: number; hitY: number } | null = null;

    const zombiesArray = Array.from(this.zombieCtrl.getAllZombies().values());
    for (const zombie of zombiesArray) {
      if (zombie.isDead) continue;

      const dx = zombie.x - origin.x;
      const dy = zombie.y - origin.y;
      const dz = zombie.z - origin.z;

      const dot = dx * direction.x + dy * direction.y + dz * direction.z;
      if (dot < 0 || dot > MAX_SHOT_RANGE) continue;

      const closestX = origin.x + direction.x * dot;
      const closestY = origin.y + direction.y * dot;
      const closestZ = origin.z + direction.z * dot;

      const distSq = (zombie.x - closestX) ** 2 + (zombie.y - closestY) ** 2 + (zombie.z - closestZ) ** 2;
      const hitRadius = 1.0;

      if (distSq < hitRadius * hitRadius) {
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!closestZombie || dist < closestZombie.dist) {
          closestZombie = { id: zombie.id, dist, hitY: closestY };
        }
      }
    }

    if (closestZombie) {
      let damage: number = Number(weaponStats.dmg) || 35;

      // Headshot detection
      const zombie = this.zombieCtrl.getZombie(closestZombie.id);
      const isHeadshot = closestZombie.hitY - (zombie?.y ?? 0) >= HEAD_HEIGHT;
      if (isHeadshot) {
        damage = weaponStats.headshot || damage * 2;
      }

      // Pack-a-Punch multiplier
      if (player.hasPackAPunch) {
        damage = Math.floor(damage * 1.5);
      }

      // Insta-kill power-up
      if (this.state.activePowerUp === "insta_kill") {
        damage = 99999;
      }

      const zombieX = zombie?.x ?? 0;
      const zombieZ = zombie?.z ?? 0;
      const zombieType = zombie?.type ?? "walker";
      const killed = this.waveSystem.damageZombie(closestZombie.id, damage);

      if (killed) {
        this.rewardKill(client, closestZombie.id, zombieType, isHeadshot, 0, zombieX, zombieZ);
      } else {
        this.awardPoints(client.sessionId, ZOMBIE_POINTS.assistDamage);
      }

      client.send("hit", {
        zombieId: closestZombie.id,
        damage,
        headshot: isHeadshot,
      });
    }
  }

  /** Knife swing: short range, no ammo, worth bonus points. */
  private handleMelee(client: Client, data: MeleeInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead) return;

    const now = Date.now();
    const lastShot = this.lastShotTimes.get(client.sessionId) ?? 0;
    const meleeStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    const cooldownMs = 1000 / (meleeStats?.fireRate || 2);
    if (now - lastShot < cooldownMs - 20) return;
    this.lastShotTimes.set(client.sessionId, now);

    const direction = this.normalizeDirection(data?.direction);
    if (!direction) return;

    let target: { id: string; type: string; x: number; z: number } | null = null;
    let nearest = Infinity;

    this.zombieCtrl.getAllZombies().forEach((zombie) => {
      if (zombie.isDead) return;

      const dx = zombie.x - player.x;
      const dz = zombie.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > MELEE.range + 0.6 || dist >= nearest) return;

      // Must be roughly in front of the player.
      const facing = (dx * direction.x + dz * direction.z) / (dist || 1);
      if (facing < MELEE.frontDot) return;

      nearest = dist;
      target = { id: zombie.id, type: zombie.type, x: zombie.x, z: zombie.z };
    });

    if (!target) return;
    const hit: { id: string; type: string; x: number; z: number } = target;

    const damage = Math.floor((meleeStats?.dmg ?? 50) * (player.hasPackAPunch ? 1.5 : 1));
    const killed =
      this.state.activePowerUp === "insta_kill"
        ? this.waveSystem.damageZombie(hit.id, 99999)
        : this.waveSystem.damageZombie(hit.id, damage);

    if (killed) {
      this.rewardKill(client, hit.id, hit.type, false, ZOMBIE_POINTS.knifeBonus, hit.x, hit.z);
    }

    client.send("hit", { zombieId: hit.id, damage, headshot: false, melee: true });
  }

  private normalizeDirection(
    direction: { x: number; y: number; z: number } | undefined
  ): { x: number; y: number; z: number } | null {
    if (!direction) return null;
    const { x, y, z } = direction;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;

    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < 0.001) return null;
    return { x: x / length, y: y / length, z: z / length };
  }

  private awardPoints(sessionId: string, amount: number) {
    let points = amount * this.zombieDifficulty.points;
    if (this.state.activePowerUp === "double_points") points *= 2;
    this.state.points.set(sessionId, this.pointsOf(sessionId) + Math.round(points));
  }

  private rewardKill(
    client: Client,
    zombieId: string,
    zombieType: string,
    isHeadshot: boolean,
    bonus: number,
    x: number,
    z: number
  ) {
    this.waveSystem.onZombieKilled(isHeadshot);

    let points = ZOMBIE_POINTS[zombieType as keyof typeof ZOMBIE_POINTS] ?? 50;
    if (isHeadshot) points += ZOMBIE_POINTS.headshotBonus;
    points += bonus;

    const before = this.pointsOf(client.sessionId);
    this.awardPoints(client.sessionId, points);
    const awarded = this.pointsOf(client.sessionId) - before;

    this.state.zombies.delete(zombieId);

    this.broadcast("zombieKilled", {
      zombieId,
      killerId: client.sessionId,
      points: awarded,
      headshot: isHeadshot,
    });

    if (Math.random() < POWER_UP_DROP_CHANCE) {
      this.spawnPowerUp(x, z);
    }
  }

  private handleReload(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isReloading) return;
    if (player.reserveAmmo <= 0) return;

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats || weaponStats.reload <= 0) return;

    player.isReloading = true;
    let reloadDuration = weaponStats.reload;
    if (player.hasSpeedCola) {
      reloadDuration *= 0.5; // 2x faster with Speed Cola
    }

    const previous = this.reloadTimers.get(client.sessionId);
    if (previous) clearTimeout(previous);

    const timer = setTimeout(() => {
      this.reloadTimers.delete(client.sessionId);
      const p = this.state.players.get(client.sessionId);
      if (!p) return;

      const needed = weaponStats.mag - p.ammo;
      const available = Math.min(needed, p.reserveAmmo);
      p.ammo += available;
      p.reserveAmmo -= available;
      p.isReloading = false;
      this.stashCurrentAmmo(client.sessionId, p);
      client.send("reloadComplete", { ammo: p.ammo, reserveAmmo: p.reserveAmmo });
    }, reloadDuration * 1000);

    this.reloadTimers.set(client.sessionId, timer);
    client.send("reloadStarted", { duration: reloadDuration });
  }

  private stashCurrentAmmo(sessionId: string, player: PlayerState) {
    let stash = this.weaponAmmo.get(sessionId);
    if (!stash) {
      stash = new Map();
      this.weaponAmmo.set(sessionId, stash);
    }
    stash.set(player.currentWeapon, { ammo: player.ammo, reserve: player.reserveAmmo });
  }

  private restoreWeaponAmmo(sessionId: string, player: PlayerState, weapon: string) {
    const stash = this.weaponAmmo.get(sessionId);
    const saved = stash?.get(weapon);
    const stats = WEAPONS[weapon as keyof typeof WEAPONS];
    if (saved) {
      player.ammo = saved.ammo;
      player.reserveAmmo = saved.reserve;
      return;
    }
    player.ammo = stats?.mag ?? 0;
    player.reserveAmmo = stats?.reserveAmmo ?? 0;
  }

  private handleSwitchWeapon(client: Client, data: { weapon: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isDowned) return;
    if (!(data.weapon in WEAPONS)) return;

    // Only weapons that were actually bought or won from the box can be drawn.
    const owned = this.ownedWeapons.get(client.sessionId);
    if (!owned || !owned.has(data.weapon)) {
      client.send("switchFailed", { weapon: data.weapon });
      return;
    }
    if (player.currentWeapon === data.weapon) return;

    this.stashCurrentAmmo(client.sessionId, player);
    player.currentWeapon = data.weapon;
    this.restoreWeaponAmmo(client.sessionId, player, data.weapon);

    client.send("weaponSwitched", {
      weapon: player.currentWeapon,
      ammo: player.ammo,
      reserveAmmo: player.reserveAmmo,
    });
  }

  private handleBuyWeapon(client: Client, data: { weapon?: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const weapon = typeof data.weapon === "string" ? data.weapon : "";
    const price = ZOMBIE_SHOP.weaponPrices[weapon];
    const stats = WEAPONS[weapon as keyof typeof WEAPONS];

    if (price === undefined || !stats) {
      this.buyFailed(client, weapon, "unknown_item");
      return;
    }
    if (player.isDead || player.isDowned) {
      this.buyFailed(client, weapon, "unavailable");
      return;
    }

    const owned = this.ownedWeapons.get(client.sessionId) ?? new Set<string>();
    if (owned.has(weapon) && player.currentWeapon === weapon) {
      this.buyFailed(client, weapon, "already_owned");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < price) {
      this.buyFailed(client, weapon, "no_money");
      return;
    }

    this.state.points.set(client.sessionId, points - price);
    owned.add(weapon);
    this.ownedWeapons.set(client.sessionId, owned);

    // Buying a gun you already own refills its stash; otherwise stash the old gun first.
    if (player.currentWeapon !== weapon) {
      this.stashCurrentAmmo(client.sessionId, player);
    }

    player.currentWeapon = weapon;
    player.ammo = stats.mag;
    player.reserveAmmo = stats.reserveAmmo;
    this.stashCurrentAmmo(client.sessionId, player);

    client.send("weaponBought", {
      weapon,
      ammo: player.ammo,
      reserveAmmo: player.reserveAmmo,
    });
  }

  private handleChat(client: Client, data: { message?: unknown }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const msg = typeof data.message === "string"
      // eslint-disable-next-line no-control-regex -- strip control chars from chat
      ? data.message.replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "").trim().slice(0, 120)
      : "";

    if (!msg) return;

    this.broadcast("chat", {
      sessionId: client.sessionId,
      nickname: player.nickname,
      message: msg,
    });
  }

  private handleStartGame(_client: Client) {
    const idle =
      this.state.phase === "waiting" ||
      this.state.waveState === "waiting" ||
      this.state.waveState === "wave_clear";
    if (!idle) return;

    // A finished run (wipe or evac) starts over from wave 1 with everyone back
    // on their feet, instead of continuing the old wave counter.
    const runFinished = this.state.currentWave > 0 && this.state.phase === "waiting";
    if (runFinished) {
      this.resetGame();
      this.respawnAll();
    }

    this.state.phase = "active";
    this.waveSystem.startFirstWave();
    this.broadcast("gameStarted", { wave: this.state.currentWave });
  }

  private respawnAll() {
    this.state.players.forEach((player, sessionId) => {
      player.x = ZOMBIE_SPAWN.player.x;
      player.y = ZOMBIE_SPAWN.player.y;
      player.z = ZOMBIE_SPAWN.player.z;
      player.hp = 100;
      player.armor = 0;
      player.isDead = false;
      player.isDowned = false;
      player.downedTimer = 0;
      player.isReviving = false;
      player.reviveTargetId = "";
      player.reviveProgress = 0;
      player.currentWeapon = "deagle";
      player.ammo = WEAPONS.deagle.mag;
      player.reserveAmmo = WEAPONS.deagle.reserveAmmo;
      player.hasPackAPunch = false;
      player.hasJuggernog = false;
      player.hasSpeedCola = false;
      player.hasDoubleTap = false;
      player.hasQuickRevive = false;

      this.state.points.set(sessionId, 500);
      this.ownedWeapons.set(sessionId, new Set(["deagle", "knife"]));
      this.weaponAmmo.set(
        sessionId,
        new Map([
          ["deagle", { ammo: player.ammo, reserve: player.reserveAmmo }],
          ["knife", { ammo: 0, reserve: 0 }],
        ])
      );
      this.soloRevivesCount.set(sessionId, this.zombieDifficulty.soloRevives);
    });
  }

  private handleBuyAmmo(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (player.isDead || player.isDowned) {
      this.buyFailed(client, "ammo", "unavailable");
      return;
    }

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats || weaponStats.mag <= 1) {
      this.buyFailed(client, "ammo", "unknown_item");
      return;
    }

    const reserveCap = weaponStats.mag * ZOMBIE_SHOP.reserveCap;
    if (player.ammo >= weaponStats.mag && player.reserveAmmo >= reserveCap) {
      this.buyFailed(client, "ammo", "full");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < ZOMBIE_SHOP.ammoPrice) {
      this.buyFailed(client, "ammo", "no_money");
      return;
    }

    this.state.points.set(client.sessionId, points - ZOMBIE_SHOP.ammoPrice);
    // A refill tops off the magazine as well, that is what the label promises.
    player.ammo = weaponStats.mag;
    player.reserveAmmo = Math.min(reserveCap, player.reserveAmmo + weaponStats.mag * 2);
    this.stashCurrentAmmo(client.sessionId, player);

    client.send("ammoBought", { ammo: player.ammo, reserveAmmo: player.reserveAmmo });
  }

  private handleBuyArmor(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (player.isDead || player.isDowned) {
      this.buyFailed(client, "armor", "unavailable");
      return;
    }
    if (player.armor >= 100) {
      this.buyFailed(client, "armor", "full");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < ZOMBIE_SHOP.armorPrice) {
      this.buyFailed(client, "armor", "no_money");
      return;
    }

    player.armor = 100;
    this.state.points.set(client.sessionId, points - ZOMBIE_SHOP.armorPrice);
    client.send("armorBought", { armor: player.armor });
  }

  private handleBuyPerk(client: Client, data: { perk: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const perk = ZOMBIE_SHOP.perks[data.perk as ZombiePerkId];
    if (!perk) {
      this.buyFailed(client, data.perk, "unknown_item");
      return;
    }
    if (player.isDead || player.isDowned) {
      this.buyFailed(client, data.perk, "unavailable");
      return;
    }
    if ((player as any)[perk.field]) {
      this.buyFailed(client, data.perk, "already_owned");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < perk.price) {
      this.buyFailed(client, data.perk, "no_money");
      return;
    }

    (player as any)[perk.field] = true;
    this.state.points.set(client.sessionId, points - perk.price);

    if (perk.hp) {
      player.hp = perk.hp;
    }

    client.send("perkBought", { perk: data.perk, hp: player.hp });
  }

  private handleMysteryBox(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isUsingMysteryBox) return;

    if (player.isDead || player.isDowned) {
      this.buyFailed(client, "mystery_box", "unavailable");
      return;
    }
    if (this.distanceTo(player, MYSTERY_BOX_POS.x, MYSTERY_BOX_POS.z) > ZOMBIE_INTERACT_RANGE) {
      this.buyFailed(client, "mystery_box", "too_far");
      return;
    }

    const isFireSale = this.state.activePowerUp === "fire_sale";
    const price = isFireSale ? MYSTERY_BOX.fireSalePrice : MYSTERY_BOX.price;

    const points = this.pointsOf(client.sessionId);
    if (points < price) {
      this.buyFailed(client, "mystery_box", "no_money");
      return;
    }

    this.state.points.set(client.sessionId, points - price);

    player.isUsingMysteryBox = true;
    this.state.mysteryBoxActive = true;

    const weaponPool: string[] = [];
    for (const [weapon, weight] of Object.entries(MYSTERY_BOX.weights)) {
      for (let i = 0; i < weight; i++) {
        weaponPool.push(weapon);
      }
    }
    const randomWeapon = weaponPool[Math.floor(Math.random() * weaponPool.length)];

    const allWeapons = [...MYSTERY_BOX.weapons];
    let spinIndex = 0;
    const spinInterval = setInterval(() => {
      if (spinIndex >= allWeapons.length * 2) {
        clearInterval(spinInterval);
        this.activeMysteryBoxTimers.delete(client.sessionId);

        this.state.mysteryBoxWeapon = randomWeapon;
        client.send("mysteryBoxResult", { weapon: randomWeapon });

        if (player.currentWeapon === randomWeapon) {
          this.state.points.set(client.sessionId, this.pointsOf(client.sessionId) + price);
        } else {
          const owned = this.ownedWeapons.get(client.sessionId) ?? new Set<string>();
          owned.add(randomWeapon);
          this.ownedWeapons.set(client.sessionId, owned);

          this.stashCurrentAmmo(client.sessionId, player);
          player.currentWeapon = randomWeapon;
          const stats = WEAPONS[randomWeapon as keyof typeof WEAPONS];
          if (stats) {
            player.ammo = stats.mag;
            player.reserveAmmo = stats.reserveAmmo;
          }
          this.stashCurrentAmmo(client.sessionId, player);
        }

        player.isUsingMysteryBox = false;
        setTimeout(() => {
          this.state.mysteryBoxActive = false;
          this.state.mysteryBoxWeapon = "";
        }, 2000);
        return;
      }
      client.send("mysteryBoxSpin", { weapon: allWeapons[spinIndex % allWeapons.length] });
      spinIndex++;
    }, 150);

    this.activeMysteryBoxTimers.set(client.sessionId, spinInterval);
  }

  private handlePackAPunch(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (player.isDead || player.isDowned) {
      this.buyFailed(client, "pack_a_punch", "unavailable");
      return;
    }
    if (player.hasPackAPunch) {
      this.buyFailed(client, "pack_a_punch", "already_owned");
      return;
    }
    if (this.distanceTo(player, PACK_A_PUNCH_POS.x, PACK_A_PUNCH_POS.z) > ZOMBIE_INTERACT_RANGE) {
      this.buyFailed(client, "pack_a_punch", "too_far");
      return;
    }
    if (!PACK_A_PUNCH.allowedWeapons.includes(player.currentWeapon as any)) {
      this.buyFailed(client, "pack_a_punch", "unknown_item");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < PACK_A_PUNCH.price) {
      this.buyFailed(client, "pack_a_punch", "no_money");
      return;
    }

    this.state.points.set(client.sessionId, points - PACK_A_PUNCH.price);

    player.hasPackAPunch = true;
    // The upgrade also comes with a deeper ammo pool.
    const upgradedStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (upgradedStats) {
      player.ammo = upgradedStats.mag;
      player.reserveAmmo = Math.floor(upgradedStats.reserveAmmo * PACK_A_PUNCH.extraAmmoMultiplier);
    }
    const variant = PAP_WEAPON_VARIANTS[player.currentWeapon];

    client.send("packAPunchComplete", {
      weapon: player.currentWeapon,
      papName: variant?.name ?? `${player.currentWeapon} Upgraded`,
      ammo: player.ammo,
      reserveAmmo: player.reserveAmmo,
    });
  }

  private handleUnlockArea(client: Client, data: { areaId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const area = ZOMBIE_MAP_AREAS.find((a) => a.id === data.areaId);
    if (!area) {
      this.buyFailed(client, data.areaId, "unknown_item");
      return;
    }
    if (player.isDead || player.isDowned) {
      this.buyFailed(client, area.id, "unavailable");
      return;
    }
    if (this.state.unlockedAreas.get(area.id)) {
      this.buyFailed(client, area.id, "already_owned");
      return;
    }
    if (area.requires && !this.state.unlockedAreas.get(area.requires)) {
      this.buyFailed(client, area.id, "locked");
      return;
    }
    // The door has to be within reach of its own area.
    if (this.distanceTo(player, area.x, area.z) > area.radius + ZOMBIE_INTERACT_RANGE) {
      this.buyFailed(client, area.id, "too_far");
      return;
    }

    const points = this.pointsOf(client.sessionId);
    if (points < area.price) {
      this.buyFailed(client, area.id, "no_money");
      return;
    }

    this.state.points.set(client.sessionId, points - area.price);
    this.state.unlockedAreas.set(area.id, 1);

    this.broadcast("areaUnlocked", { areaId: area.id, name: area.name });
  }

  private handleRepairBarricade(client: Client, data: { barricadeId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isDowned) return;

    // One board per repair interval, so a board cannot be spammed back instantly.
    const now = Date.now();
    const lastRepair = this.lastRepairTimes.get(client.sessionId) ?? 0;
    if (now - lastRepair < BARRICADE_CONFIG.repairTimePerBoard * 1000) return;
    this.lastRepairTimes.set(client.sessionId, now);

    const barricade = this.state.barricades.get(data.barricadeId);
    if (!barricade || barricade.boards >= barricade.maxBoards) return;

    const distSq = (barricade.x - player.x) ** 2 + (barricade.z - player.z) ** 2;
    if (distSq > 16) return;

    barricade.boards = Math.min(barricade.maxBoards, barricade.boards + 1);
    barricade.hp = 100;

    const currentPoints = this.state.points.get(client.sessionId) ?? 0;
    this.state.points.set(client.sessionId, currentPoints + BARRICADE_CONFIG.pointsPerRepair);

    this.broadcast("barricadeRepaired", {
      barricadeId: barricade.id,
      boards: barricade.boards,
      repairerId: client.sessionId,
    });
  }

  private handleTriggerExtraction(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isDowned) return;
    if (this.state.extractionActive) return;

    const isAutoAllowed = this.state.currentWave >= EXTRACTION_CONFIG.unlockWave;
    const isManualAllowed = this.state.currentWave >= EXTRACTION_CONFIG.manualMinWave;

    if (!isAutoAllowed && !isManualAllowed) return;

    if (!isAutoAllowed) {
      const points = this.state.points.get(client.sessionId) ?? 0;
      if (points < EXTRACTION_CONFIG.manualCost) return;
      this.state.points.set(client.sessionId, points - EXTRACTION_CONFIG.manualCost);
    }

    this.state.extractionActive = true;
    this.state.extractionTimer = EXTRACTION_CONFIG.duration;
    this.extractionSurgeTimer = 0;

    this.broadcast("extractionStarted", {
      duration: EXTRACTION_CONFIG.duration,
      triggeredBy: player.nickname,
    });
  }

  private checkExtractionSuccess() {
    this.state.extractionActive = false;

    let allInZone = true;
    let aliveCount = 0;

    this.state.players.forEach((p) => {
      if (p.isDead) return;
      aliveCount++;

      const dist = Math.sqrt((p.x - EXTRACTION_CONFIG.helipadPos.x) ** 2 + (p.z - EXTRACTION_CONFIG.helipadPos.z) ** 2);
      if (dist > EXTRACTION_CONFIG.helipadRadius) {
        allInZone = false;
      }
    });

    if (aliveCount > 0 && allInZone) {
      this.state.evacSuccess = true;
      // The run is over on a successful evac; stop spawning new waves.
      this.state.phase = "waiting";
      this.state.players.forEach((p, sessionId) => {
        if (!p.isDead) {
          const current = this.state.points.get(sessionId) ?? 0;
          this.state.points.set(sessionId, current + EXTRACTION_CONFIG.bonusPoints);
        }
      });

      this.broadcast("extractionSuccess", {
        bonus: EXTRACTION_CONFIG.bonusPoints,
        wave: this.state.currentWave,
      });
    } else {
      this.broadcast("extractionFailed", {
        reason: "Survivors failed to reach Helipad in time!",
      });
    }
  }

  private handleStartRevive(client: Client, data: { targetId: string }) {
    const reviver = this.state.players.get(client.sessionId);
    const target = this.state.players.get(data.targetId);
    if (!reviver || !target || reviver.isDead || reviver.isDowned || !target.isDowned || target.isDead) return;

    const distSq = (reviver.x - target.x) ** 2 + (reviver.z - target.z) ** 2;
    if (distSq > 12) return;

    reviver.isReviving = true;
    reviver.reviveTargetId = data.targetId;
    reviver.reviveProgress = 0;

    this.broadcast("reviveProgress", {
      reviverId: client.sessionId,
      targetId: data.targetId,
      progress: 0,
    });
  }

  private handleCancelRevive(client: Client) {
    const reviver = this.state.players.get(client.sessionId);
    if (reviver) {
      reviver.isReviving = false;
      reviver.reviveTargetId = "";
      reviver.reviveProgress = 0;
    }
  }

  private handleTickRevive(client: Client, _data: { progress?: number }) {
    // Revive progression is managed authoritatively by the server in gameTick;
    // this only keeps the flag alive while the player holds the key down.
    const reviver = this.state.players.get(client.sessionId);
    if (reviver && reviver.reviveTargetId && !reviver.isDowned && !reviver.isDead) {
      reviver.isReviving = true;
    }
  }

  private spawnPowerUp(x: number, z: number) {
    const types: PowerUpType[] = ["max_ammo", "nuke", "insta_kill", "double_points", "carpenter", "fire_sale"];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp = new PowerUpState();
    powerUp.id = `powerup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    powerUp.type = type;
    powerUp.x = x;
    powerUp.y = 0.5;
    powerUp.z = z;
    powerUp.timeLeft = 30;

    this.state.powerUps.set(powerUp.id, powerUp);
    this.broadcast("powerUpSpawned", { id: powerUp.id, type, x, z });
  }

  private pickupPowerUp(client: Client, powerUpId: string) {
    const powerUp = this.state.powerUps.get(powerUpId);
    if (!powerUp) return;

    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead) return;

    const dx = player.x - powerUp.x;
    const dz = player.z - powerUp.z;
    if (Math.sqrt(dx * dx + dz * dz) > 4) return;

    this.applyPowerUp(powerUp.type);
    this.state.powerUps.delete(powerUpId);
    this.broadcast("powerUpCollected", { id: powerUpId, type: powerUp.type, collectorId: client.sessionId });
  }

  private applyPowerUp(type: PowerUpType) {
    switch (type) {
      case "max_ammo":
        this.state.players.forEach((player) => {
          const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
          if (weaponStats) {
            player.ammo = weaponStats.mag;
            player.reserveAmmo = weaponStats.reserveAmmo;
          }
        });
        break;

      case "nuke":
        // Kill and remove all zombies properly. Kills are registered with the
        // wave system, otherwise a nuke mid-spawn leaves the wave stuck.
        this.zombieCtrl.getAllZombies().forEach((zombie) => {
          if (!zombie.isDead) {
            zombie.hp = 0;
            zombie.isDead = true;
            this.zombieCtrl.removeZombie(zombie.id);
            this.state.zombies.delete(zombie.id);
            this.waveSystem.onZombieKilled(false);
          }
        });
        this.waveSystem.finishSpawning();
        this.state.players.forEach((p, id) => {
          if (!p.isDead) {
            this.state.points.set(id, (this.state.points.get(id) ?? 0) + 400);
          }
        });
        break;

      case "insta_kill":
      case "double_points":
      case "fire_sale":
        this.state.activePowerUp = type;
        this.state.powerUpTimer = POWER_UPS[type].duration;
        break;

      case "carpenter":
        this.state.barricades.forEach((b) => {
          b.boards = b.maxBoards;
          b.hp = 100;
        });
        this.state.players.forEach((p, id) => {
          if (!p.isDead) {
            this.state.points.set(id, (this.state.points.get(id) ?? 0) + 200);
          }
        });
        this.broadcast("allBarricadesRepaired");
        break;
    }

    this.broadcast("powerUpActivated", { type });
  }

  private broadcastSnapshot() {
    const players: Record<string, any> = {};
    this.state.players.forEach((p, id) => {
      players[id] = {
        x: p.x,
        y: p.y,
        z: p.z,
        rotationY: p.rotationY,
        nickname: p.nickname,
        hp: p.hp,
        armor: p.armor,
        isDead: p.isDead,
        isDowned: p.isDowned,
        downedTimer: p.downedTimer,
        currentWeapon: p.currentWeapon,
        ammo: p.ammo,
        reserveAmmo: p.reserveAmmo,
        isReloading: p.isReloading,
        hasPackAPunch: p.hasPackAPunch,
        soloRevives: this.soloRevivesCount.get(id) ?? 0,
        lastProcessedSeq: p.lastProcessedSeq,
      };
    });

    const zombies: Record<string, any> = {};
    const allZombies = Array.from(this.zombieCtrl.getAllZombies().values());
    for (const z of allZombies) {
      zombies[z.id] = {
        id: z.id,
        type: z.type,
        x: z.x,
        y: z.y,
        z: z.z,
        hp: z.hp,
        maxHp: z.maxHp,
        rotationY: z.rotationY,
        isDead: z.isDead,
        isAttacking: z.isAttacking,
      };
    }

    const barricades: Record<string, any> = {};
    this.state.barricades.forEach((b) => {
      barricades[b.id] = {
        id: b.id,
        x: b.x,
        y: b.y,
        z: b.z,
        boards: b.boards,
        maxBoards: b.maxBoards,
        hp: b.hp,
      };
    });

    this.broadcast("snapshot", {
      players,
      zombies,
      barricades,
      currentWave: this.state.currentWave,
      zombiesRemaining: this.state.zombiesRemaining,
      waveState: this.state.waveState,
      points: Object.fromEntries(this.state.points),
      extractionActive: this.state.extractionActive,
      extractionTimer: this.state.extractionTimer,
      extractionAvailable: this.state.extractionAvailable,
      evacSuccess: this.state.evacSuccess,
    });
  }
}
