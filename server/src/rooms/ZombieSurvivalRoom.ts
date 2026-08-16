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
  PowerUpType,
  PowerUpState,
  SERVER,
  WEAPONS,
  PHYSICS,
  ClientInput,
  ShootInput,
} from "@cs-game/shared";
import { ZombieController } from "../ai/ZombieController";
import { WaveSystem } from "../systems/WaveSystem";

const TICK_MS = 1000 / SERVER.tickRate;

function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
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
  private activeMysteryBoxTimers = new Map<string, NodeJS.Timeout>();
  private soloRevivesCount = new Map<string, number>();

  onCreate() {
    this.setState(new GameState());
    this.maxClients = 4;

    // Initialize systems
    this.zombieCtrl = new ZombieController();
    this.waveSystem = new WaveSystem(this.state, this.zombieCtrl);

    // Initialize barricades
    this.initBarricades();

    // Message handlers
    this.onMessage("input", this.handleInput.bind(this));
    this.onMessage("shoot", this.handleShoot.bind(this));
    this.onMessage("reload", this.handleReload.bind(this));
    this.onMessage("switch_weapon", this.handleSwitchWeapon.bind(this));
    this.onMessage("chat", this.handleChat.bind(this));
    this.onMessage("start_game", this.handleStartGame.bind(this));
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

    // Sync existing zombies to new player
    this.zombieCtrl.getAllZombies().forEach((zombie) => {
      this.state.zombies.set(zombie.id, zombie);
    });

    // Auto-start wave 1 immediately if game is in waiting phase
    if (this.state.phase === "waiting" && this.state.currentWave === 0) {
      setTimeout(() => {
        if (this.state.players.size > 0 && this.state.currentWave === 0) {
          this.state.phase = "active";
          this.waveSystem.startFirstWave();
          this.broadcast("gameStarted", { wave: 1 });
        }
      }, 400);
    }
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.state.points.delete(client.sessionId);
    this.lastShotTimes.delete(client.sessionId);
    this.lastRepairTimes.delete(client.sessionId);

    const timer = this.activeMysteryBoxTimers.get(client.sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeMysteryBoxTimers.delete(client.sessionId);
    }

    // Reset game if all players leave
    if (this.state.players.size === 0) {
      this.resetGame();
    }
  }

  onDispose() {
    clearInterval(this.tickInterval);
    this.activeMysteryBoxTimers.forEach((timer) => clearTimeout(timer));
    this.activeMysteryBoxTimers.clear();
    this.zombieCtrl.clearAll();
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

    // Check zombie attacks on players
    const zombiesForAttack = Array.from(this.zombieCtrl.getAllZombies().values());
    for (const zombie of zombiesForAttack) {
      if (zombie.isDead || !zombie.isAttacking) continue;

      players.forEach((player, sessionId) => {
        if (player.isDead) return;

        const dx = player.x - zombie.x;
        const dz = player.z - zombie.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1.6) {
          let damage = ZOMBIE_TYPES[zombie.type].damage;
          const targetPlayer = this.state.players.get(sessionId);
          if (targetPlayer && !targetPlayer.isDead) {
            // Armor absorption
            if (targetPlayer.armor > 0) {
              const absorbed = Math.min(targetPlayer.armor, Math.ceil(damage * 0.5));
              targetPlayer.armor -= absorbed;
              damage -= absorbed;
            }

            targetPlayer.hp = Math.max(0, targetPlayer.hp - damage);
            if (targetPlayer.hp <= 0) {
              this.handlePlayerDowned(sessionId, targetPlayer);
            }
          }
        }
      });
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

        // Validate distance
        const dist = Math.sqrt((reviver.x - target.x) ** 2 + (reviver.z - target.z) ** 2);
        if (dist > 3.5) {
          reviver.isReviving = false;
          reviver.reviveTargetId = "";
          reviver.reviveProgress = 0;
          this.broadcast("reviveProgress", { reviverId, targetId: target.nickname, progress: 0 });
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

    // Update downed player bleedout timers
    this.state.players.forEach((p, sessionId) => {
      if (p.isDowned && !p.isDead) {
        p.downedTimer -= dt;

        // Solo self-revive (3 lives per solo match + Quick Revive bonus)
        const isSolo = this.state.players.size === 1;
        const revivesRemaining = this.soloRevivesCount.get(sessionId) ?? 3;

        if (isSolo && p.downedTimer <= 26 && (revivesRemaining > 0 || p.hasQuickRevive)) {
          if (!p.hasQuickRevive) {
            this.soloRevivesCount.set(sessionId, revivesRemaining - 1);
          }
          p.isDowned = false;
          p.hp = p.hasJuggernog ? 150 : 100;
          p.downedTimer = 0;
          this.broadcast("playerRevived", { targetId: sessionId, reviverId: sessionId, autoRevive: true });
        } else if (p.downedTimer <= 0) {
          p.isDowned = false;
          p.isDead = true;
          this.broadcast("playerDied", { sessionId });
        }
      }
    });

    // Check game over
    if (this.state.phase === "active" && this.state.players.size > 0) {
      let aliveSurvivors = 0;
      this.state.players.forEach((p) => {
        if (!p.isDead && !p.isDowned) aliveSurvivors++;
      });

      if (aliveSurvivors === 0) {
        let anyDowned = false;
        this.state.players.forEach((p) => {
          if (p.isDowned) anyDowned = true;
        });
        if (!anyDowned) {
          this.state.phase = "waiting";
          const stats = this.waveSystem.getStats();
          this.broadcast("gameOver", { wave: this.state.currentWave, kills: stats.kills, headshots: stats.headshots });
        }
      }
    }

    // Update extraction sequence
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
    } else if (this.state.phase === "active") {
      // Normal wave system only ticks when not in active extraction
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

    // Crawl speed if downed, else normal
    let speed: number = PHYSICS.walkSpeed;
    if (player.isDowned) {
      speed = 1.2; // Crawl speed
    } else if (data.sprint) {
      speed = PHYSICS.sprintSpeed;
    }

    let dx = 0, dz = 0;
    if (data.forward) dz -= 1;
    if (data.backward) dz += 1;
    if (data.left) dx -= 1;
    if (data.right) dx += 1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx = (dx / len) * speed * (1 / SERVER.tickRate);
      dz = (dz / len) * speed * (1 / SERVER.tickRate);
    }

    const cos = Math.cos(data.rotationY);
    const sin = Math.sin(data.rotationY);
    const rdx = dx * cos - dz * sin;
    const rdz = dx * sin + dz * cos;

    player.x = Math.max(ZOMBIE_MAP_BOUNDARY.minX, Math.min(ZOMBIE_MAP_BOUNDARY.maxX, player.x + rdx));
    player.z = Math.max(ZOMBIE_MAP_BOUNDARY.minZ, Math.min(ZOMBIE_MAP_BOUNDARY.maxZ, player.z + rdz));
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

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats) return;

    // Enforce fire rate on server
    const now = Date.now();
    const lastShot = this.lastShotTimes.get(client.sessionId) ?? 0;
    const baseCooldownMs = 1000 / (weaponStats.fireRate || 10);
    const effectiveCooldownMs = player.hasDoubleTap ? baseCooldownMs * 0.75 : baseCooldownMs;

    if (now - lastShot < effectiveCooldownMs - 20) {
      return; // Rate limit exceeded
    }
    this.lastShotTimes.set(client.sessionId, now);

    // Check ammo
    if (player.ammo <= 0) return;
    player.ammo--;

    // Simple hitscan against zombies
    const origin = { x: player.x, y: player.y + (player.isDowned ? 0.6 : 1.5), z: player.z };
    const direction = data.direction;

    let closestZombie: { id: string; dist: number; hitY: number } | null = null;

    const zombiesArray = Array.from(this.zombieCtrl.getAllZombies().values());
    for (const zombie of zombiesArray) {
      if (zombie.isDead) continue;

      const dx = zombie.x - origin.x;
      const dy = zombie.y - origin.y;
      const dz = zombie.z - origin.z;

      const dot = dx * direction.x + dy * direction.y + dz * direction.z;
      if (dot < 0) continue;

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
      const isHeadshot = closestZombie.hitY - (zombie?.y ?? 0) >= 1.2;
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

      const killed = this.waveSystem.damageZombie(closestZombie.id, damage);

      if (killed) {
        this.waveSystem.onZombieKilled(isHeadshot);

        const zombieType = zombie?.type ?? "walker";
        let points = ZOMBIE_POINTS[zombieType as keyof typeof ZOMBIE_POINTS] ?? 50;
        if (isHeadshot) points += ZOMBIE_POINTS.headshotBonus;

        if (this.state.activePowerUp === "double_points") {
          points *= 2;
        }

        const currentPoints = this.state.points.get(client.sessionId) ?? 0;
        this.state.points.set(client.sessionId, currentPoints + points);

        this.state.zombies.delete(closestZombie.id);

        this.broadcast("zombieKilled", {
          zombieId: closestZombie.id,
          killerId: client.sessionId,
          points,
          headshot: isHeadshot,
        });

        if (zombie && Math.random() < POWER_UP_DROP_CHANCE) {
          this.spawnPowerUp(zombie.x, zombie.z);
        }
      }

      this.broadcast("hit", {
        zombieId: closestZombie.id,
        damage,
        headshot: isHeadshot,
      });
    }
  }

  private handleReload(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isReloading) return;

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats) return;

    player.isReloading = true;
    let reloadDuration = weaponStats.reload;
    if (player.hasSpeedCola) {
      reloadDuration *= 0.5; // 2x faster with Speed Cola
    }

    setTimeout(() => {
      const p = this.state.players.get(client.sessionId);
      if (p) {
        const needed = weaponStats.mag - p.ammo;
        const available = Math.min(needed, p.reserveAmmo);
        p.ammo += available;
        p.reserveAmmo -= available;
        p.isReloading = false;
        client.send("reloadComplete", { ammo: p.ammo, reserveAmmo: p.reserveAmmo });
      }
    }, reloadDuration * 1000);
  }

  private handleSwitchWeapon(client: Client, data: { weapon: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isDowned) return;

    if (!(data.weapon in WEAPONS)) return;
    player.currentWeapon = data.weapon;
    const stats = WEAPONS[data.weapon as keyof typeof WEAPONS];
    if (stats) {
      if (player.ammo <= 0) player.ammo = stats.mag;
      if (player.reserveAmmo <= 0) player.reserveAmmo = stats.reserveAmmo;
    }
  }

  private handleChat(client: Client, data: { message?: unknown }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const msg = typeof data.message === "string"
      ? data.message.replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "").trim().slice(0, 120)
      : "";

    if (!msg) return;

    this.broadcast("chat", {
      sessionId: client.sessionId,
      nickname: player.nickname,
      message: msg,
    });
  }

  private handleStartGame(client: Client) {
    if (this.state.currentWave === 0 || this.state.phase === "waiting" || this.state.waveState === "waiting" || this.state.waveState === "wave_clear") {
      this.state.phase = "active";
      this.waveSystem.startFirstWave();
      this.broadcast("gameStarted", { wave: this.state.currentWave });
    }
  }

  private handleBuyAmmo(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < 500) return;

    const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (!weaponStats) return;

    player.reserveAmmo += weaponStats.mag * 2;
    this.state.points.set(client.sessionId, points - 500);
    client.send("ammoBought", { ammo: player.ammo, reserveAmmo: player.reserveAmmo });
  }

  private handleBuyArmor(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < 750) return;

    player.armor = 100;
    this.state.points.set(client.sessionId, points - 750);
    client.send("armorBought", { armor: player.armor });
  }

  private handleBuyPerk(client: Client, data: { perk: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const perkPrices: Record<string, { price: number; field: string }> = {
      juggernog: { price: 2500, field: "hasJuggernog" },
      speedcola: { price: 3000, field: "hasSpeedCola" },
      doubletap: { price: 2000, field: "hasDoubleTap" },
      quickrevive: { price: 1500, field: "hasQuickRevive" },
    };

    const perk = perkPrices[data.perk];
    if (!perk) return;

    if ((player as any)[perk.field]) return;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < perk.price) return;

    (player as any)[perk.field] = true;
    this.state.points.set(client.sessionId, points - perk.price);

    if (data.perk === "juggernog") {
      player.hp = 200;
    }

    client.send("perkBought", { perk: data.perk, hp: player.hp });
  }

  private handleMysteryBox(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isUsingMysteryBox) return;

    const isFireSale = this.state.activePowerUp === "fire_sale";
    const price = isFireSale ? MYSTERY_BOX.fireSalePrice : MYSTERY_BOX.price;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < price) return;

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
          this.state.points.set(client.sessionId, (this.state.points.get(client.sessionId) ?? 0) + price);
        } else {
          player.currentWeapon = randomWeapon;
          const stats = WEAPONS[randomWeapon as keyof typeof WEAPONS];
          if (stats) {
            player.ammo = stats.mag;
            player.reserveAmmo = stats.reserveAmmo;
          }
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
    if (!player || player.isDead || player.hasPackAPunch) return;

    if (!PACK_A_PUNCH.allowedWeapons.includes(player.currentWeapon as any)) return;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < PACK_A_PUNCH.price) return;

    this.state.points.set(client.sessionId, points - PACK_A_PUNCH.price);

    player.hasPackAPunch = true;
    const variant = PAP_WEAPON_VARIANTS[player.currentWeapon];

    client.send("packAPunchComplete", {
      weapon: player.currentWeapon,
      papName: variant?.name ?? `${player.currentWeapon} Upgraded`,
    });
  }

  private handleUnlockArea(client: Client, data: { areaId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead) return;

    const area = ZOMBIE_MAP_AREAS.find((a) => a.id === data.areaId);
    if (!area) return;

    if (this.state.unlockedAreas.get(area.id)) return;
    if (area.requires && !this.state.unlockedAreas.get(area.requires)) return;

    const points = this.state.points.get(client.sessionId) ?? 0;
    if (points < area.price) return;

    this.state.points.set(client.sessionId, points - area.price);
    this.state.unlockedAreas.set(area.id, 1);

    this.broadcast("areaUnlocked", { areaId: area.id, name: area.name });
  }

  private handleRepairBarricade(client: Client, data: { barricadeId: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isDead || player.isDowned) return;

    const now = Date.now();
    const lastRepair = this.lastRepairTimes.get(client.sessionId) ?? 0;
    if (now - lastRepair < 300) return; // 300ms cooldown to prevent spam
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
    // Revive progression is managed authoritatively by server in gameTick
    const reviver = this.state.players.get(client.sessionId);
    if (reviver && !reviver.isReviving) {
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
        // Kill and remove all zombies properly
        this.zombieCtrl.getAllZombies().forEach((zombie) => {
          if (!zombie.isDead) {
            zombie.hp = 0;
            zombie.isDead = true;
            this.zombieCtrl.removeZombie(zombie.id);
            this.state.zombies.delete(zombie.id);
          }
        });
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
