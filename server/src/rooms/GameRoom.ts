import colyseus from "colyseus";
import type { Client } from "colyseus";
import {
  GameState,
  PlayerState,
  SmokeState,
  PHYSICS,
  SERVER,
  WEAPONS,
  GEAR,
  ROUND,
  ECONOMY,
  SPAWN,
  BOMB_SITES,
  BUY_ZONE,
  MAP_OBSTACLES,
  MAP_BOUNDARY,
  GRENADE,
  ClientInput,
  ShootInput,
  BuyRequest,
  BombPlantRequest,
  BombDefuseRequest,
  ThrowGrenadeInput,
  MapObstacle,
} from "@cs-game/shared";

const { Room } = colyseus;

const TICK_MS = 1000 / SERVER.tickRate;

interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

interface PositionSample {
  t: number;
  x: number;
  z: number;
}

interface GrenadeSim {
  id: string;
  type: "he" | "smoke" | "flash";
  throwerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spawnTime: number;
  detonated: boolean;
}

const MAX_PIERCE = 2;
const HISTORY_WINDOW_MS = 1000;
const MAX_REWIND_MS = 500;

// ray vs AABB (slab method). Returns entry distance or null.
function rayVsBox(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): number | null {
  let tmin = 0;
  let tmax = Infinity;

  const axes = [
    [dx, ox, box.minX, box.maxX] as const,
    [dy, oy, box.minY, box.maxY] as const,
    [dz, oz, box.minZ, box.maxZ] as const,
  ];

  for (const [d, o, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmax >= 0 ? Math.max(tmin, 0) : null;
}

// Check if line of sight exists between two points (no solid obstacles blocking)
function hasLineOfSight(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  obstacles: readonly MapObstacle[]
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.01) return true;

  const ndx = dx / dist;
  const ndy = dy / dist;
  const ndz = dz / dist;

  for (const obs of obstacles) {
    if (obs.material === "wood") continue; // Wood is wallbangable, don't block LOS
    const t = rayVsBox(x1, y1, z1, ndx, ndy, ndz, obs);
    if (t !== null && t < dist) return false;
  }
  return true;
}

// Determine the dominant bounce axis for a ray entering a box.
function bounceAxis(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): "x" | "y" | "z" {
  const px = Math.max(box.minX, Math.min(box.maxX, ox));
  const py = Math.max(box.minY, Math.min(box.maxY, oy));
  const pz = Math.max(box.minZ, Math.min(box.maxZ, oz));
  const dist = Math.sqrt(
    (ox - px) ** 2 + (oy - py) ** 2 + (oz - pz) ** 2
  );
  const inv = dist > 1e-6 ? 1 / dist : 0;
  const nx = (ox - px) * inv;
  const ny = (oy - py) * inv;
  const nz = (oz - pz) * inv;

  if (Math.abs(nx) >= Math.abs(ny) && Math.abs(nx) >= Math.abs(nz)) return "x";
  if (Math.abs(ny) >= Math.abs(nx) && Math.abs(ny) >= Math.abs(nz)) return "y";
  return "z";
}

export class GameRoom extends Room<GameState> {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastFireTime: Map<string, number> = new Map();
  private respawnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private bombTimerId: ReturnType<typeof setTimeout> | null = null;
  private phaseTimerId: ReturnType<typeof setTimeout> | null = null;
  private bombCarrierId: string | null = null;
  private droppedBombPos: { x: number; y: number; z: number } | null = null;
  private spawnProtection: Map<string, number> = new Map();

  private vote: {
    targetId: string;
    targetNickname: string;
    yesVotes: Set<string>;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  // Lag compensation: per-player position history for server rewind
  private shootHistory: Map<string, PositionSample[]> = new Map();
  // Track last input time per player for real-time dt calculation
  private lastInputTime: Map<string, number> = new Map();
  // Track server-measured RTT per client for lag compensation validation
  private serverRTT: Map<string, number> = new Map();
  private pingTimestamps: Map<string, number> = new Map();
  // Rate limiting for chat and radio
  private lastChatTime: Map<string, number> = new Map();
  private lastRadioTime: Map<string, number> = new Map();
  // Server-side grenade simulation (not synced as schema; transient)
  private grenades: Map<string, GrenadeSim> = new Map();
  private grenadeCooldowns: Map<string, number> = new Map();
  private grenadeSeq = 0;
  // Reconnect: players keep their state during the TTL window
  private pendingReconnect: Map<string, { timer: ReturnType<typeof setTimeout> }> = new Map();

  onCreate() {
    this.setState(new GameState());
    this.maxClients = 10;

    this.onMessage("input", (client, input: ClientInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (this.state.phase !== "active") return;

      this.processMovement(client.sessionId, player, input);

      client.send("snapshot", {
        x: player.x,
        y: player.y,
        z: player.z,
        rotationY: player.rotationY,
        lastProcessedSeq: player.lastProcessedSeq,
      });
    });

    this.onMessage("shoot", (client, data: ShootInput) => {
      const shooter = this.state.players.get(client.sessionId);
      if (!shooter || shooter.isDead) return;
      if (this.state.phase !== "active") return;

      const now = performance.now();
      // Anti-cheat: the server is the source of truth for the weapon.
      const weaponKey = shooter.currentWeapon as keyof typeof WEAPONS;
      const weaponStats = WEAPONS[weaponKey];
      if (!weaponStats) return;

      // Anti-cheat: shoot origin must be near the player's server position.
      const ox = data.origin.x - shooter.x;
      const oy = data.origin.y - (shooter.y + 1.6);
      const oz = data.origin.z - shooter.z;
      if (ox * ox + oy * oy + oz * oz > 3 * 3) return;

      const lastFire = this.lastFireTime.get(client.sessionId) || 0;
      const minInterval = 1000 / weaponStats.fireRate;
      if (now - lastFire < minInterval * 0.85) return;

      if (shooter.ammo <= 0) return;

      shooter.ammo--;
      this.lastFireTime.set(client.sessionId, now);

      const hitResult = this.checkHit(client.sessionId, shooter, data);
      if (!hitResult) return;

      const victim = this.state.players.get(hitResult.victimId);
      if (!victim || victim.isDead) return;

      // Spawn protection: 1.5s invulnerability after respawn
      const spawnTime = this.spawnProtection.get(hitResult.victimId);
      if (spawnTime && performance.now() - spawnTime < 1500) return;

      const damage = this.calculateDamage(
        weaponKey,
        hitResult.zone,
        victim.armor,
        victim.hasHelmet,
        hitResult.wallbangFactor
      );
      victim.hp -= damage;

      this.broadcast("damage", {
        shooterId: client.sessionId,
        victimId: hitResult.victimId,
        damage,
        hp: victim.hp,
        headshot: hitResult.zone === "head",
      });

      if (victim.hp <= 0) {
        this.handleKill(client.sessionId, shooter, hitResult.victimId, victim, weaponKey, hitResult.zone === "head");
      }
    });

    this.onMessage("reload", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      const weaponKey = player.currentWeapon as keyof typeof WEAPONS;
      const weaponStats = WEAPONS[weaponKey];
      if (!weaponStats) return;

      if (player.ammo >= weaponStats.mag) return;
      if (player.reserveAmmo <= 0) return;

      player.isReloading = true;

      setTimeout(() => {
        const p = this.state.players.get(client.sessionId);
        if (!p || p.isDead) { if (p) p.isReloading = false; return; }

        const needed = weaponStats.mag - p.ammo;
        const toLoad = Math.min(needed, p.reserveAmmo);
        p.ammo += toLoad;
        p.reserveAmmo -= toLoad;
        p.isReloading = false;

        this.broadcast("reloadEnd", { playerId: client.sessionId });
      }, weaponStats.reload * 1000);

      this.broadcast("reloadStart", { playerId: client.sessionId });
    });

    this.onMessage("buy", (client, data: BuyRequest) => {
      if (this.state.phase !== "buy") return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Verify player is in buy zone
      const buyZone = BUY_ZONE[player.team as keyof typeof BUY_ZONE];
      if (buyZone) {
        const dx = player.x - buyZone.x;
        const dz = player.z - buyZone.z;
        if (Math.sqrt(dx * dx + dz * dz) > buyZone.radius) return;
      }

      this.processBuy(client.sessionId, data);
    });

    this.onMessage("switch_weapon", (client, data: { slot: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      const { slot } = data;
      let weapon: string | null = null;

      // Save current slot's ammo before switching
      if (player.currentWeapon === player.primaryWeapon && player.primaryWeapon) {
        player.primaryAmmo = player.ammo;
        player.primaryReserveAmmo = player.reserveAmmo;
      } else if (player.currentWeapon === player.secondaryWeapon && player.secondaryWeapon) {
        player.secondaryAmmo = player.ammo;
        player.secondaryReserveAmmo = player.reserveAmmo;
      }

      if (slot === 1) {
        weapon = player.primaryWeapon || null;
      } else if (slot === 2) {
        weapon = player.secondaryWeapon || null;
      } else if (slot === 3) {
        weapon = player.knifeSlot || "knife";
      }

      if (!weapon) return;

      const weaponStats = WEAPONS[weapon as keyof typeof WEAPONS];
      if (!weaponStats) return;

      player.currentWeapon = weapon;

      // Load saved ammo for the target slot (or defaults if never used)
      if (slot === 1 && player.primaryWeapon) {
        player.ammo = player.primaryAmmo > 0 ? player.primaryAmmo : weaponStats.mag;
        player.reserveAmmo = player.primaryReserveAmmo > 0 ? player.primaryReserveAmmo : weaponStats.reserveAmmo;
      } else if (slot === 2 && player.secondaryWeapon) {
        player.ammo = player.secondaryAmmo > 0 ? player.secondaryAmmo : weaponStats.mag;
        player.reserveAmmo = player.secondaryReserveAmmo > 0 ? player.secondaryReserveAmmo : weaponStats.reserveAmmo;
      } else {
        // Knife slot - no ammo needed
        player.ammo = 0;
        player.reserveAmmo = 0;
      }

      player.isReloading = false;

      this.broadcast("weaponSwitched", {
        playerId: client.sessionId,
        weapon,
        slot,
      });
    });

    this.onMessage("plant_start", (client, data: BombPlantRequest) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (this.state.phase !== "active") return;
      if (player.team !== "T") return;
      if (!player.hasBomb) return;
      if (this.state.bombPlanted) return;

      const site = BOMB_SITES[data.site as keyof typeof BOMB_SITES];
      if (!site) return;

      const dx = player.x - site.x;
      const dz = player.z - site.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > site.radius) return;

      player.isPlanting = true;
      player.plantProgress = 0;

      this.broadcast("plantStart", {
        playerId: client.sessionId,
        site: data.site,
      });
    });

    this.onMessage("plant_cancel", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      this.cancelPlant(client.sessionId, player);
    });

    this.onMessage("defuse_start", (client, data: BombDefuseRequest) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (this.state.phase !== "active") return;
      if (player.team !== "CT") return;
      if (!this.state.bombPlanted) return;

      const site = BOMB_SITES[this.state.bombSite as keyof typeof BOMB_SITES];
      if (!site) return;

      const dx = player.x - site.x;
      const dz = player.z - site.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > site.radius) return;

      player.isDefusing = true;
      player.defuseProgress = 0;

      this.broadcast("defuseStart", {
        playerId: client.sessionId,
        kit: data.kit,
      });
    });

    this.onMessage("defuse_cancel", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      this.cancelDefuse(client.sessionId, player);
    });

    this.onMessage("pickup_bomb", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (player.team !== "T") return;
      if (player.hasBomb) return;
      if (this.bombCarrierId) return;
      if (this.state.bombPlanted) return;
      if (!this.droppedBombPos) return;

      // Check distance to dropped bomb (within 2 units)
      const dx = player.x - this.droppedBombPos.x;
      const dz = player.z - this.droppedBombPos.z;
      if (Math.sqrt(dx * dx + dz * dz) > 2) return;

      player.hasBomb = true;
      this.bombCarrierId = client.sessionId;
      this.droppedBombPos = null;
      this.broadcast("bombPickedUp", { playerId: client.sessionId });
    });

    this.onMessage("ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (this.state.phase !== "buy") return;

      if (player.isReady) return;

      player.isReady = true;
      this.state.readyCount++;

      // Threshold scales with the actual lobby size (never unreachable).
      const threshold = Math.min(ROUND.readySkipThreshold, this.state.players.size);
      if (this.state.readyCount >= threshold) {
        this.skipBuyPhase();
      }
    });

    this.onMessage("throw_grenade", (client, data: ThrowGrenadeInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (this.state.phase !== "active") return;

      if (data.type !== "he" && data.type !== "smoke" && data.type !== "flash") return;

      const origin = data.origin as unknown as Record<string, number>;
      const velocity = data.velocity as unknown as Record<string, number>;
      if (!origin || !velocity) return;
      if (typeof origin.x !== "number" || typeof origin.y !== "number" || typeof origin.z !== "number") return;
      if (typeof velocity.x !== "number" || typeof velocity.y !== "number" || typeof velocity.z !== "number") return;

      const ammoField =
        data.type === "he" ? "grenadeHE" : data.type === "smoke" ? "grenadeSmoke" : "grenadeFlash";
      if ((player as unknown as Record<string, number>)[ammoField] <= 0) return;

      const now = performance.now();
      const lastThrow = this.grenadeCooldowns.get(client.sessionId) || 0;
      if (now - lastThrow < GRENADE.cooldownMs) return;

      // Anti-cheat: throw origin must be near the player.
      const ox = origin.x - player.x;
      const oy = origin.y - (player.y + 1.6);
      const oz = origin.z - player.z;
      if (ox * ox + oy * oy + oz * oz > 3 * 3) return;

      // Anti-cheat: clamp throw power.
      const speed = Math.sqrt(
        velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
      );
      if (speed <= 0 || speed > GRENADE.maxThrowSpeed) return;

      (player as unknown as Record<string, number>)[ammoField]--;

      const id = `g-${client.sessionId}-${++this.grenadeSeq}`;
      const sim: GrenadeSim = {
        id,
        type: data.type,
        throwerId: client.sessionId,
        x: origin.x,
        y: origin.y,
        z: origin.z,
        vx: velocity.x,
        vy: velocity.y,
        vz: velocity.z,
        spawnTime: now,
        detonated: false,
      };
      this.grenades.set(id, sim);
      this.grenadeCooldowns.set(client.sessionId, now);

      this.broadcast("grenadeThrown", {
        id,
        type: data.type,
        throwerId: client.sessionId,
        x: sim.x,
        y: sim.y,
        z: sim.z,
        vx: sim.vx,
        vy: sim.vy,
        vz: sim.vz,
      });
    });

    this.onMessage("set_game_mode", (client, data: { mode: string }) => {
      const validModes = ["bomb_defusal", "ffa", "tdm", "koth"];
      if (!validModes.includes(data.mode)) return;

      this.state.gameMode = data.mode;

      // Reset scores for new mode
      this.state.playerScores.clear();

      // Restart the match with the new mode (mode is applied after join).
      if (this.state.phase !== "waiting" && this.state.players.size >= 1) {
        this.clearAllTimers();
        this.startMatch();
      }

      this.broadcast("gameModeChanged", { mode: data.mode });
    });

    this.onMessage("ping", (client, data: { timestamp: number }) => {
      // Track when we received this ping for RTT estimation
      this.pingTimestamps.set(client.sessionId, performance.now());
      client.send("pong", { timestamp: data.timestamp });
    });

    this.onMessage("chat", (client, data: { message?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      // Rate limit: 500ms cooldown per player
      const now = performance.now();
      const lastChat = this.lastChatTime.get(client.sessionId) || 0;
      if (now - lastChat < 500) return;
      this.lastChatTime.set(client.sessionId, now);

      if (typeof data?.message !== "string") return;
      const message = data.message
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 120);
      if (!message) return;

      this.broadcast("chat", {
        senderId: client.sessionId,
        sender: player.nickname || "Unknown",
        message,
        team: player.team,
        timestamp: Date.now(),
      });
    });

    this.onMessage("vote_request", (client, data: { targetId: string }) => {
      const target = this.state.players.get(data.targetId);
      if (!target) return;
      if (data.targetId === client.sessionId) return;
      if (!this.state.players.has(client.sessionId)) return;
      if (this.state.players.size < 2) return;
      if (this.vote) return;

      this.vote = {
        targetId: data.targetId,
        targetNickname: target.nickname,
        yesVotes: new Set([client.sessionId]),
        timer: setTimeout(() => {
          this.vote = null;
        }, 30000),
      };

      this.broadcast("vote_request", {
        targetId: data.targetId,
        targetNickname: target.nickname,
        initiatorId: client.sessionId,
      });
    });

    this.onMessage(
      "vote_kick",
      (client, data: { targetId: string; vote: boolean }) => {
        const vote = this.vote;
        if (!vote || vote.targetId !== data.targetId) return;
        if (client.sessionId === vote.targetId) return;
        if (!this.state.players.has(client.sessionId)) return;

        if (data.vote) vote.yesVotes.add(client.sessionId);

        const yesCount = vote.yesVotes.size;
        if (yesCount / this.state.players.size >= 0.5) {
          const targetClient = this.clients.find(
            (c) => c.sessionId === vote.targetId
          );
          const targetNickname = vote.targetNickname;
          if (vote.timer) clearTimeout(vote.timer);
          this.vote = null;

          if (targetClient) {
            this.broadcast("kicked", { targetId: targetClient.sessionId, targetNickname });
            targetClient.leave(4000, "Kicked by vote");
          }
        }
      }
    );

    this.onMessage("radio", (client, data: { code: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (![1, 2, 3].includes(data.code)) return;

      // Rate limit: 2 second cooldown per player
      const now = performance.now();
      const lastRadio = this.lastRadioTime.get(client.sessionId) || 0;
      if (now - lastRadio < 2000) return;
      this.lastRadioTime.set(client.sessionId, now);

      this.clients.forEach((c) => {
        const p = this.state.players.get(c.sessionId);
        if (p && p.team === player.team) {
          c.send("radio", {
            senderId: client.sessionId,
            sender: player.nickname || "Teammate",
            code: data.code,
            team: player.team,
          });
        }
      });
    });

    this.startTickLoop();
  }

  private startTickLoop() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      const now = performance.now();

      if (this.state.phase === "active") {
        this.state.roundTimeLeft = Math.max(0, this.state.roundTimeLeft - 1 / SERVER.tickRate);
        if (this.state.roundTimeLeft <= 0) {
          if (this.state.gameMode === "bomb_defusal") {
            // Bomb explodes (or defusal failed) the moment time runs out.
            this.endRound(this.state.bombPlanted ? "T" : "CT");
          } else {
            // FFA/TDM run until the win condition; no round timeout.
            this.state.roundTimeLeft = ROUND.activePhaseDuration;
          }
        }
      }

      if (this.state.phase === "buy") {
        this.state.buyPhaseTimeLeft = Math.max(0, this.state.buyPhaseTimeLeft - 1 / SERVER.tickRate);
        if (this.state.buyPhaseTimeLeft <= 0) {
          this.startActivePhase();
        }
      }

      if (this.state.phase === "roundEnd") {
        this.state.roundEndTimer = Math.max(0, this.state.roundEndTimer - 1 / SERVER.tickRate);
        if (this.state.roundEndTimer <= 0) {
          this.startBuyPhase();
        }
      }

      if (this.state.bombPlanted) {
        this.state.bombTimeLeft = Math.max(0, this.state.bombTimeLeft - 1 / SERVER.tickRate);
        if (this.state.bombTimeLeft <= 0) {
          this.bombExplode();
        }
      }

      // Smoke lifecycle (authoritative, synced via schema)
      this.state.smokes.forEach((smoke, id) => {
        smoke.timeLeft -= 1 / SERVER.tickRate;
        if (smoke.timeLeft <= 0) {
          this.state.smokes.delete(id);
        }
      });

      this.simulateGrenades(now);
      this.processPlanting();
      this.processDefusing();
      this.processKOTH();
    }, TICK_MS);
  }

  onJoin(client: Client, options: { nickname?: string }) {
    const playerCount = this.state.players.size;

    // Balance teams: count players per team
    let countT = 0;
    let countCT = 0;
    this.state.players.forEach((p) => {
      if (p.team === "T") countT++;
      else countCT++;
    });
    const team = countT <= countCT ? "T" : "CT";
    const spawn = SPAWN[team as keyof typeof SPAWN];

    const player = new PlayerState();
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.team = team;
    player.nickname = options.nickname || `Player${playerCount + 1}`;
    player.money = ECONOMY.startMoney;
    player.hp = 100;
    player.currentWeapon = "deagle";
    player.primaryWeapon = "";
    player.secondaryWeapon = "deagle";
    player.knifeSlot = "knife";
    player.ammo = WEAPONS.deagle.mag;
    player.reserveAmmo = WEAPONS.deagle.reserveAmmo;

    if (team === "T" && !this.bombCarrierId) {
      player.hasBomb = true;
      this.bombCarrierId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

    this.broadcast("playerJoined", {
      sessionId: client.sessionId,
      nickname: player.nickname,
      team,
    });

    this.broadcast("playerCount", { count: this.state.players.size });

    if (this.state.phase === "waiting" && this.state.players.size >= 1) {
      this.startMatch();
    }
  }

  onLeave(client: Client) {
    const sessionId = client.sessionId;
    const player = this.state.players.get(sessionId);

    // Cancel active interactions immediately (offline = can't act).
    if (player) {
      if (player.isPlanting) this.cancelPlant(sessionId, player);
      if (player.isDefusing) this.cancelDefuse(sessionId, player);
      if (player.hasBomb && this.bombCarrierId === sessionId) {
        this.bombCarrierId = null;
        this.dropBomb(player);
      }
    }

    const timer = this.respawnTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.respawnTimers.delete(sessionId);
    }

    if (this.vote && this.vote.targetId === sessionId) {
      if (this.vote.timer) clearTimeout(this.vote.timer);
      this.vote = null;
    }

    this.grenadeCooldowns.delete(sessionId);
    this.lastInputTime.delete(sessionId);
    this.lastChatTime.delete(sessionId);
    this.lastRadioTime.delete(sessionId);

    // ─── Reconnect window: player state is preserved for 60s ───
    if (player && this.state.phase !== "waiting") {
      const allow = this.allowReconnection(client, SERVER.reconnectTTL);
      const pendingTimer = setTimeout(() => {
        // Reconnect window expired → hard cleanup.
        const p = this.state.players.get(sessionId);
        this.state.players.delete(sessionId);
        this.lastFireTime.delete(sessionId);
        this.spawnProtection.delete(sessionId);
        this.shootHistory.delete(sessionId);
        this.pendingReconnect.delete(sessionId);

        if (p) {
          this.broadcast("playerLeft", {
            sessionId,
            nickname: p.nickname,
          });
          this.state.readyCount = Math.max(
            0,
            this.state.readyCount - (p.isReady ? 1 : 0)
          );
        }

        this.broadcast("playerCount", { count: this.state.players.size });

        if (this.state.players.size < 2 && this.state.phase !== "waiting") {
          this.state.phase = "waiting";
          this.clearAllTimers();
        }

        this.checkRoundEnd();
      }, SERVER.reconnectTTL * 1000);

      this.pendingReconnect.set(sessionId, { timer: pendingTimer });

      allow
        .then(() => {
          if (this.pendingReconnect.has(sessionId)) {
            clearTimeout(pendingTimer);
            this.pendingReconnect.delete(sessionId);
          }
          const p = this.state.players.get(sessionId);
          if (p) {
            this.broadcast("playerReconnected", {
              sessionId,
              nickname: p.nickname,
            });
          }
        })
        .catch(() => {
          /* timeout already handled by pendingTimer */
        });

      // Do NOT delete the player or broadcast playerLeft yet.
      return;
    }

    // ─── No reconnect candidate → immediate cleanup ───
    this.state.players.delete(sessionId);
    this.lastFireTime.delete(sessionId);
    this.spawnProtection.delete(sessionId);
    this.shootHistory.delete(sessionId);

    this.broadcast("playerLeft", {
      sessionId,
      nickname: player ? player.nickname : "Player",
    });

    if (player) {
      this.state.readyCount = Math.max(0, this.state.readyCount - (player.isReady ? 1 : 0));
    }

    this.broadcast("playerCount", { count: this.state.players.size });

    if (this.state.players.size < 2 && this.state.phase !== "waiting") {
      this.state.phase = "waiting";
      this.clearAllTimers();
    }

    this.checkRoundEnd();
  }

  onDispose() {
    this.pendingReconnect.forEach(({ timer }) => clearTimeout(timer));
    this.pendingReconnect.clear();
    this.clearAllTimers();
  }

  private clearAllTimers() {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    if (this.bombTimerId) { clearTimeout(this.bombTimerId); this.bombTimerId = null; }
    if (this.phaseTimerId) { clearTimeout(this.phaseTimerId); this.phaseTimerId = null; }
    this.respawnTimers.forEach((t) => clearTimeout(t));
    this.respawnTimers.clear();
    this.pendingReconnect.forEach(({ timer }) => clearTimeout(timer));
    this.pendingReconnect.clear();
  }

  // ─── Movement ──────────────────────────────────────────────────
  private processMovement(sessionId: string, player: PlayerState, input: ClientInput) {
    const now = performance.now();
    const lastTime = this.lastInputTime.get(sessionId) || now;
    // Real dt clamped to prevent speed-hack exploitation (max 2x tick)
    const rawDt = (now - lastTime) / 1000;
    const dt = Math.min(rawDt, (TICK_MS * 2) / 1000);
    this.lastInputTime.set(sessionId, now);

    const speed = input.sprint
      ? PHYSICS.sprintSpeed
      : input.crouch
        ? PHYSICS.crouchSpeed
        : PHYSICS.walkSpeed;

    const sin = Math.sin(input.rotationY);
    const cos = Math.cos(input.rotationY);

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) { moveX -= sin * speed * dt; moveZ -= cos * speed * dt; }
    if (input.backward) { moveX += sin * speed * dt; moveZ += cos * speed * dt; }
    if (input.left) { moveX -= cos * speed * dt; moveZ += sin * speed * dt; }
    if (input.right) { moveX += cos * speed * dt; moveZ -= sin * speed * dt; }

    const delta = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const maxDelta = SERVER.maxVelocity * dt * SERVER.maxDelta;

    if (delta <= maxDelta) {
      let nextX = player.x + moveX;
      let nextZ = player.z + moveZ;

      // Perimeter wall clamping
      nextX = Math.max(MAP_BOUNDARY.minX, Math.min(MAP_BOUNDARY.maxX, nextX));
      nextZ = Math.max(MAP_BOUNDARY.minZ, Math.min(MAP_BOUNDARY.maxZ, nextZ));

      // Container AABB colliders (shared with client visuals)
      let blockedX = false;
      let blockedZ = false;

      for (const obs of MAP_OBSTACLES) {
        // Obstacles below ankle height don't block the player capsule.
        if (obs.maxY < 0.45) continue;
        // Test X axis movement
        if (
          nextX > obs.minX &&
          nextX < obs.maxX &&
          player.z > obs.minZ &&
          player.z < obs.maxZ
        ) {
          blockedX = true;
        }
        // Test Z axis movement
        if (
          player.x > obs.minX &&
          player.x < obs.maxX &&
          nextZ > obs.minZ &&
          nextZ < obs.maxZ
        ) {
          blockedZ = true;
        }
      }

      if (!blockedX) player.x = nextX;
      if (!blockedZ) player.z = nextZ;
    }

    if (input.jump && player.y <= 0.1) {
      player.y = PHYSICS.jumpVelocity * 0.1;
    } else if (player.y > 0) {
      player.y -= PHYSICS.gravity * dt * 0.1;
      if (player.y < 0) player.y = 0;
    }

    player.rotationY = input.rotationY;
    player.lastProcessedSeq = input.seq;
    player.isSprinting = input.sprint;
    player.isCrouching = input.crouch;
    player.isAirborne = player.y > 0.1;

    // Record position sample for lag compensation
    const now = performance.now();
    let history = this.shootHistory.get(sessionId);
    if (!history) {
      history = [];
      this.shootHistory.set(sessionId, history);
    }
    history.push({ t: now, x: player.x, z: player.z });
    while (history.length > 0 && now - history[0].t > HISTORY_WINDOW_MS) {
      history.shift();
    }
  }

  private samplePosition(
    sessionId: string,
    targetTime: number
  ): { x: number; z: number } | null {
    const history = this.shootHistory.get(sessionId);
    const player = this.state.players.get(sessionId);
    if (!player) return null;
    if (!history || history.length === 0) {
      return { x: player.x, z: player.z };
    }

    // Clamp to the newest sample
    const last = history[history.length - 1];
    if (targetTime >= last.t) return { x: last.x, z: last.z };

    // Clamp to the oldest sample
    const first = history[0];
    if (targetTime <= first.t) return { x: first.x, z: first.z };

    // Interpolate between surrounding samples
    for (let i = 0; i < history.length - 1; i++) {
      const a = history[i];
      const b = history[i + 1];
      if (targetTime >= a.t && targetTime <= b.t) {
        const f = (targetTime - a.t) / (b.t - a.t);
        return {
          x: a.x + (b.x - a.x) * f,
          z: a.z + (b.z - a.z) * f,
        };
      }
    }
    return { x: last.x, z: last.z };
  }

  // ─── Hit Detection ─────────────────────────────────────────────
  private checkHit(
    shooterId: string,
    shooter: PlayerState,
    data: ShootInput
  ): { victimId: string; zone: "head" | "torso" | "limbs"; distance: number; wallbangFactor: number } | null {
    const now = performance.now();
    const shooterPos = { x: shooter.x, y: shooter.y + 1.6, z: shooter.z };
    const dir = data.direction;
    const dirLength = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (dirLength === 0) return null;

    const normDir = { x: dir.x / dirLength, y: dir.y / dirLength, z: dir.z / dirLength };

    // Lag compensation: rewind to when the shot was fired client-side.
    // Validate client-reported latency against server-measured RTT to prevent exploitation
    const serverRTT = this.serverRTT.get(shooterId) || 0;
    const clientLatency = Math.max(0, data.latency ?? 0);
    // Use the smaller of client-reported and 1.5x server-measured RTT
    const latency = serverRTT > 0
      ? Math.min(clientLatency, serverRTT * 1.5, MAX_REWIND_MS)
      : Math.min(clientLatency, MAX_REWIND_MS);
    const targetTime = now - latency;

    let closestHit: {
      victimId: string;
      zone: "head" | "torso" | "limbs";
      distance: number;
      wallbangFactor: number;
    } | null = null;

    this.state.players.forEach((player, id) => {
      if (id === shooterId || player.isDead) return;

      // FFA = free for all; TDM/Defusal = team vs team.
      if (this.state.gameMode !== "ffa" && player.team === shooter.team) return;

      // Rewound position of the victim at shot time.
      const rewound = this.samplePosition(id, targetTime);
      const targetX = rewound ? rewound.x : player.x;
      const targetZ = rewound ? rewound.z : player.z;

      const dx = targetX - shooterPos.x;
      const dy = player.y - shooterPos.y;
      const dz = targetZ - shooterPos.z;

      const weaponKey = shooter.currentWeapon as keyof typeof WEAPONS;
      const maxRange = weaponKey === "awp" ? 100 : 60;
      const distToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distToTarget > maxRange) return;

      // Project target onto shooting ray direction vector
      const dot = dx * normDir.x + (dy + 0.9) * normDir.y + dz * normDir.z;
      if (dot <= 0) return; // Behind or perpendicular to shooter

      // Perpendicular distance squared from ray
      const closestX = shooterPos.x + normDir.x * dot;
      const closestY = shooterPos.y + normDir.y * dot;
      const closestZ = shooterPos.z + normDir.z * dot;

      const perpDx = targetX - closestX;
      const perpDz = targetZ - closestZ;
      const perpDistSq = perpDx * perpDx + perpDz * perpDz;

      // Hitbox cylinder radius = 0.6m
      if (perpDistSq > 0.6 * 0.6) return;

      const relY = closestY - player.y;
      if (relY < -0.2 || relY > 2.0) return; // Out of height bounds

      let zone: "head" | "torso" | "limbs" = "torso";
      if (relY >= 1.35) zone = "head";
      else if (relY <= 0.45) zone = "limbs";

      // Line of sight + wallbang: cast a ray from the muzzle to the hit
      // point. Wood surfaces can be pierced (max 2), metal blocks fully.
      let pierce = 0;
      let wallbangFactor = 1;

      for (const obs of MAP_OBSTACLES) {
        const t = rayVsBox(
          shooterPos.x, shooterPos.y, shooterPos.z,
          normDir.x, normDir.y, normDir.z,
          obs
        );
        if (t === null) continue;
        // Only obstacles before the target matter.
        if (t > dot) continue;

        if (obs.material === "wood" && pierce < MAX_PIERCE) {
          pierce++;
          wallbangFactor *= 0.5;
        } else {
          return; // Metal/concrete wall (or too many pierces) = blocked
        }
      }

      // Smoke grenades block line of sight entirely.
      const smokeBlocked =
        this.state.smokes.size > 0 &&
        Array.from(this.state.smokes.values()).some((smoke) => {
          const sx = targetX - smoke.x;
          const sz = targetZ - smoke.z;
          const t = (normDir.x * (-(shooterPos.x - smoke.x)) + normDir.z * (-(shooterPos.z - smoke.z)));
          if (t <= 0 || t > dot) return false;
          const px = shooterPos.x + normDir.x * t;
          const pz = shooterPos.z + normDir.z * t;
          const d = Math.sqrt((px - smoke.x) ** 2 + (pz - smoke.z) ** 2);
          return d < GRENADE.smokeRadius;
        });
      if (smokeBlocked) return;

      if (!closestHit || dot < closestHit.distance) {
        closestHit = { victimId: id, zone, distance: dot, wallbangFactor };
      }
    });

    return closestHit;
  }

  private calculateDamage(
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
        // Headshot with no helmet = full damage
      } else if (zone === "head" && hasHelmet) {
        baseDmg *= 0.5;
      } else if (zone === "torso") {
        baseDmg *= 0.65;
      }
    }

    return Math.max(1, Math.round(baseDmg * wallbangFactor));
  }

  // ─── Grenade Simulation ───────────────────────────────────────
  private simulateGrenades(now: number) {
    if (this.grenades.size === 0) return;

    const dt = TICK_MS / 1000;

    this.grenades.forEach((grenade) => {
      if (grenade.detonated) return;

      // Gravity
      grenade.vy -= PHYSICS.gravity * dt;
      grenade.x += grenade.vx * dt;
      grenade.y += grenade.vy * dt;
      grenade.z += grenade.vz * dt;

      // Ground bounce
      if (grenade.y <= 0.15) {
        grenade.y = 0.15;
        grenade.vy = -grenade.vy * GRENADE.bounce;
        grenade.vx *= GRENADE.bounceXZ;
        grenade.vz *= GRENADE.bounceXZ;
      }

      // Obstacle bounce (simple: bounce along dominant face axis)
      for (const obs of MAP_OBSTACLES) {
        if (obs.maxY < 0) continue;
        if (
          grenade.x >= obs.minX && grenade.x <= obs.maxX &&
          grenade.y >= obs.minY && grenade.y <= obs.maxY &&
          grenade.z >= obs.minZ && grenade.z <= obs.maxZ
        ) {
          const axis = bounceAxis(
            grenade.x, grenade.y, grenade.z,
            grenade.vx, grenade.vy, grenade.vz,
            obs
          );
          if (axis === "x") grenade.vx = -grenade.vx * 0.45;
          else if (axis === "y") grenade.vy = -grenade.vy * 0.45;
          else grenade.vz = -grenade.vz * 0.45;
          if (axis !== "y") {
            // push out of the box along the dominant axis
            const center = (obs.minX + obs.maxX) / 2;
            const cz = (obs.minZ + obs.maxZ) / 2;
            if (axis === "x") {
              grenade.x = grenade.x < center ? obs.minX - 0.01 : obs.maxX + 0.01;
            } else {
              grenade.z = grenade.z < cz ? obs.minZ - 0.01 : obs.maxZ + 0.01;
            }
          }
          break;
        }
      }

      // Fuse
      if (now - grenade.spawnTime >= GRENADE.fuse * 1000) {
        grenade.detonated = true;
        this.detonateGrenade(grenade, now);
      }
    });

    // Prune finished grenades
    this.grenades.forEach((g) => {
      if (g.detonated) this.grenades.delete(g.id);
    });
  }

  private detonateGrenade(grenade: GrenadeSim, now: number) {
    this.broadcast("grenadeDetonated", {
      id: grenade.id,
      type: grenade.type,
      x: grenade.x,
      y: grenade.y,
      z: grenade.z,
    });

    if (grenade.type === "smoke") {
      const smoke = new SmokeState();
      smoke.x = grenade.x;
      smoke.z = grenade.z;
      smoke.timeLeft = GRENADE.smokeDuration;
      this.state.smokes.set(grenade.id, smoke);
      this.broadcast("smokeSpawned", { x: grenade.x, z: grenade.z });
      return;
    }

    if (grenade.type === "flash") {
      this.broadcast("flash", {
        x: grenade.x,
        y: grenade.y,
        z: grenade.z,
        throwerId: grenade.throwerId,
      });
      return;
    }

    // HE grenade: radial damage with falloff and LOS check.
    this.state.players.forEach((victim, victimId) => {
      if (victimId === grenade.throwerId || victim.isDead) return;
      if (this.state.gameMode !== "ffa" && victim.team === (this.state.players.get(grenade.throwerId)?.team ?? "")) return;

      const dx = victim.x - grenade.x;
      const dy = victim.y + 1 - grenade.y;
      const dz = victim.z - grenade.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > GRENADE.heRadius) return;

      // LOS check: damage is blocked by solid obstacles
      if (!hasLineOfSight(grenade.x, grenade.y, grenade.z, victim.x, victim.y + 1, victim.z, MAP_OBSTACLES)) {
        return;
      }

      // Spawn protection check
      const spawnTime = this.spawnProtection.get(victimId);
      if (spawnTime && now - spawnTime < 1500) return;

      const falloff = 1 - dist / GRENADE.heRadius;
      let dmg = Math.max(1, Math.round(GRENADE.heMaxDmg * falloff));
      if (victim.armor > 0) dmg = Math.round(dmg * 0.65);

      victim.hp -= dmg;

      this.broadcast("damage", {
        shooterId: grenade.throwerId,
        victimId,
        damage: dmg,
        hp: victim.hp,
        headshot: false,
      });

      if (victim.hp <= 0) {
        const killer = this.state.players.get(grenade.throwerId);
        if (killer) {
          this.handleKill(grenade.throwerId, killer, victimId, victim, "grenade", false);
        }
      }
    });
  }

  // ─── Kill Handling ─────────────────────────────────────────────
  private handleKill(
    killerId: string,
    killer: PlayerState,
    victimId: string,
    victim: PlayerState,
    weapon: string,
    headshot: boolean
  ) {
    victim.hp = 0;
    victim.isDead = true;
    victim.deaths++;

    killer.kills++;

    // FFA/TDM score tracking
    if (this.state.gameMode === "ffa" || this.state.gameMode === "tdm") {
      const currentScore = this.state.playerScores.get(killerId) || 0;
      this.state.playerScores.set(killerId, currentScore + 1);

      // Check for FFA win condition (first to 20)
      if (this.state.gameMode === "ffa" && currentScore + 1 >= 20) {
        this.endMatch(killerId);
      }

      // Check for TDM win condition (team score to 75)
      if (this.state.gameMode === "tdm") {
        const teamScoreKey = `${killer.team}_score`;
        const teamScore = this.state.playerScores.get(teamScoreKey) || 0;
        this.state.playerScores.set(teamScoreKey, teamScore + 1);

        if (teamScore + 1 >= 75) {
          this.endMatch(killer.team);
        }
      }
    }

    const weaponKey = weapon as keyof typeof WEAPONS;
    let killReward: number = ECONOMY.killRifle;
    if (weapon === "awp") killReward = ECONOMY.killAWP;
    else if (weapon === "mp5") killReward = ECONOMY.killSMG;

    killer.money = Math.min(killer.money + killReward, ECONOMY.maxMoney);

    if (victim.hasBomb) {
      this.bombCarrierId = null;
      this.dropBomb(victim);
    }

    if (victim.isPlanting) this.cancelPlant(victimId, victim);
    if (victim.isDefusing) this.cancelDefuse(victimId, victim);

    const killEvent: KillEvent = {
      killerId,
      killerName: killer.nickname,
      victimId,
      victimName: victim.nickname,
      weapon,
      headshot,
      timestamp: performance.now(),
    };
    this.broadcast("kill", killEvent);

    this.respawnPlayer(victimId);
    this.checkRoundEnd();
  }

  // ─── Respawn ───────────────────────────────────────────────────
  private respawnPlayer(sessionId: string) {
    const existingTimer = this.respawnTimers.get(sessionId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      const player = this.state.players.get(sessionId);
      if (!player) { this.respawnTimers.delete(sessionId); return; }

      // FFA mode: random spawn location (min 10m from any other player)
      if (this.state.gameMode === "ffa") {
        const spawnPoints = [
          { x: -25, z: 0 },   // T spawn
          { x: 25, z: 0 },    // CT spawn
          { x: 0, z: -20 },   // Site A
          { x: 0, z: 20 },    // Site B
          { x: 0, z: 0 },     // Mid
        ];
        let spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
          let tooClose = false;
          this.state.players.forEach((other, id) => {
            if (id === sessionId || other.isDead) return;
            const dx = candidate.x - other.x;
            const dz = candidate.z - other.z;
            if (dx * dx + dz * dz < 100) tooClose = true;
          });
          if (!tooClose) {
            spawnPoint = candidate;
            break;
          }
        }
        player.x = spawnPoint.x;
        player.z = spawnPoint.z;
      } else {
        const spawn = SPAWN[player.team as keyof typeof SPAWN];
        player.x = spawn.x;
        player.z = spawn.z;
      }

      player.hp = 100;
      player.isDead = false;
      player.y = 0;

      // Preserve player's weapons, just reset ammo
      const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
      if (weaponStats) {
        player.ammo = weaponStats.mag;
        player.reserveAmmo = weaponStats.reserveAmmo;
      } else {
        player.currentWeapon = "deagle";
        player.ammo = WEAPONS.deagle.mag;
        player.reserveAmmo = WEAPONS.deagle.reserveAmmo;
      }
      player.isReloading = false;
      player.armor = 0;
      player.hasHelmet = false;
      player.hasDefuseKit = false;
      player.grenadeHE = 0;
      player.grenadeSmoke = 0;
      player.grenadeFlash = 0;

      this.respawnTimers.delete(sessionId);
      this.spawnProtection.set(sessionId, performance.now());
      this.broadcast("respawn", { playerId: sessionId });
    }, ROUND.respawnDelay);

    this.respawnTimers.set(sessionId, timer);
  }

  // ─── Bomb Mechanics ────────────────────────────────────────────
  private processPlanting() {
    this.state.players.forEach((player, id) => {
      if (!player.isPlanting) return;

      player.plantProgress += 1 / SERVER.tickRate;

      if (player.plantProgress >= ROUND.plantDuration) {
        this.completePlant(id, player);
      }
    });
  }

  private completePlant(sessionId: string, player: PlayerState) {
    player.isPlanting = false;
    player.plantProgress = 0;
    player.hasBomb = false;
    this.bombCarrierId = null;
    this.droppedBombPos = null;

    this.state.bombPlanted = true;
    this.state.bombTimeLeft = ROUND.bombTimer;
    this.state.bombSite = this.findNearestBombSite(player);

    player.money = Math.min(player.money + ECONOMY.plantBonus, ECONOMY.maxMoney);

    this.broadcast("bombPlanted", {
      planterId: sessionId,
      site: this.state.bombSite,
      bombTimeLeft: this.state.bombTimeLeft,
    });
  }

  private cancelPlant(sessionId: string, player: PlayerState) {
    player.isPlanting = false;
    player.plantProgress = 0;
    this.broadcast("plantCancel", { playerId: sessionId });
  }

  private processDefusing() {
    this.state.players.forEach((player, id) => {
      if (!player.isDefusing) return;

      player.defuseProgress += 1 / SERVER.tickRate;

      const defuseTime = player.hasDefuseKit ? ROUND.defuseKitDuration : ROUND.defuseDuration;

      if (player.defuseProgress >= defuseTime) {
        this.completeDefuse(id, player);
      }
    });
  }

  private completeDefuse(sessionId: string, player: PlayerState) {
    player.isDefusing = false;
    player.defuseProgress = 0;

    this.state.bombPlanted = false;
    this.state.bombTimeLeft = 0;
    this.state.bombSite = "";

    player.money = Math.min(player.money + ECONOMY.defuseBonus, ECONOMY.maxMoney);

    this.broadcast("bombDefused", { defuserId: sessionId });

    this.endRound("CT");
  }

  private cancelDefuse(sessionId: string, player: PlayerState) {
    player.isDefusing = false;
    player.defuseProgress = 0;
    this.broadcast("defuseCancel", { playerId: sessionId });
  }

  private bombExplode() {
    this.state.bombPlanted = false;
    this.state.bombTimeLeft = 0;
    this.state.bombSite = "";

    this.broadcast("bombExploded", {});

    this.endRound("T");
  }

  private processKOTH() {
    if (this.state.gameMode !== "koth" || this.state.phase !== "active") {
      return;
    }

    const zoneX = this.state.kothZoneX;
    const zoneZ = this.state.kothZoneZ;
    const zoneRadius = this.state.kothZoneRadius;
    const zoneRadiusSq = zoneRadius * zoneRadius;

    let playersInZoneT = 0;
    let playersInZoneCT = 0;

    // Count alive players in the zone
    this.state.players.forEach((player) => {
      if (player.isDead || player.hp <= 0) return;

      const dx = player.x - zoneX;
      const dz = player.z - zoneZ;
      const distSq = dx * dx + dz * dz;

      if (distSq <= zoneRadiusSq) {
        if (player.team === "T") {
          playersInZoneT++;
        } else {
          playersInZoneCT++;
        }
      }
    });

    // Determine capturing team
    if (playersInZoneT > 0 && playersInZoneCT === 0) {
      // T is capturing
      if (this.state.kothCapturingTeam !== "T") {
        this.state.kothCapturingTeam = "T";
        this.broadcast("kothCaptureStart", { team: "T" });
      }
      this.state.kothCaptureProgress = Math.min(
        100,
        this.state.kothCaptureProgress + (100 / (10 * SERVER.tickRate)) * playersInZoneT
      );
    } else if (playersInZoneCT > 0 && playersInZoneT === 0) {
      // CT is capturing
      if (this.state.kothCapturingTeam !== "CT") {
        this.state.kothCapturingTeam = "CT";
        this.broadcast("kothCaptureStart", { team: "CT" });
      }
      this.state.kothCaptureProgress = Math.min(
        100,
        this.state.kothCaptureProgress + (100 / (10 * SERVER.tickRate)) * playersInZoneCT
      );
    } else if (playersInZoneT > 0 && playersInZoneCT > 0) {
      // Contested - no progress
      this.state.kothCapturingTeam = "contested";
    } else {
      // No one in zone - decay progress
      if (this.state.kothCaptureProgress > 0) {
        this.state.kothCaptureProgress = Math.max(
          0,
          this.state.kothCaptureProgress - (100 / (15 * SERVER.tickRate))
        );
      }
      if (this.state.kothCaptureProgress === 0) {
        this.state.kothCapturingTeam = "";
      }
    }

    // Check for capture completion
    if (this.state.kothCaptureProgress >= 100) {
      const capturingTeam = this.state.kothCapturingTeam;
      if (capturingTeam === "T") {
        this.state.kothScoreT++;
        this.broadcast("kothCaptured", { team: "T", scoreT: this.state.kothScoreT, scoreCT: this.state.kothScoreCT });
      } else if (capturingTeam === "CT") {
        this.state.kothScoreCT++;
        this.broadcast("kothCaptured", { team: "CT", scoreT: this.state.kothScoreT, scoreCT: this.state.kothScoreCT });
      }

      // Reset capture
      this.state.kothCaptureProgress = 0;
      this.state.kothCapturingTeam = "";

      // Check win condition (first to 3 captures)
      if (this.state.kothScoreT >= 3) {
        this.endRound("T");
      } else if (this.state.kothScoreCT >= 3) {
        this.endRound("CT");
      }
    }
  }

  private dropBomb(player: PlayerState) {
    this.droppedBombPos = { x: player.x, y: player.y, z: player.z };
    this.broadcast("bombDropped", {
      x: player.x,
      y: player.y,
      z: player.z,
    });
  }

  private findNearestBombSite(player: PlayerState): string {
    let nearest = "A";
    let minDist = Infinity;

    (Object.keys(BOMB_SITES) as Array<keyof typeof BOMB_SITES>).forEach((key) => {
      const site = BOMB_SITES[key];
      const dx = player.x - site.x;
      const dz = player.z - site.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) { minDist = dist; nearest = key; }
    });

    return nearest;
  }

  // ─── Buy System ────────────────────────────────────────────────
  private processBuy(sessionId: string, data: BuyRequest) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    const item = data.item;

    const weaponStats = WEAPONS[item as keyof typeof WEAPONS];
    if (weaponStats) {
      if (weaponStats.price > player.money) return;
      if (weaponStats.team !== "both" && weaponStats.team !== player.team) return;

      player.money -= weaponStats.price;

      // Assign to correct slot
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

      // Equip the bought weapon
      player.currentWeapon = item;
      player.ammo = weaponStats.mag;
      player.reserveAmmo = weaponStats.reserveAmmo;
      player.isReloading = false;

      this.broadcast("itemBought", { playerId: sessionId, item, slot: "weapon" });
      return;
    }

    const gearItem = GEAR[item as keyof typeof GEAR];
    if (gearItem) {
      if ((gearItem as any).price > player.money) return;
      if ((gearItem as any).team && (gearItem as any).team !== player.team) return;

      player.money -= (gearItem as any).price;

      if (item === "kevlar") {
        player.armor = 100;
      } else if (item === "helmet") {
        player.armor = 100;
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

      this.broadcast("itemBought", { playerId: sessionId, item, slot: "gear" });
    }
  }

  // ─── Round System ──────────────────────────────────────────────
  private startMatch() {
    this.state.roundNumber = 1;
    this.state.teamRedScore = 0;
    this.state.teamBlueScore = 0;
    this.state.isHalfTime = false;
    this.state.isOvertime = false;
    this.state.isSuddenDeath = false;
    this.state.lossStreakT = 0;
    this.state.lossStreakCT = 0;
    this.state.playerScores.clear();
    this.state.smokes.clear();
    this.grenades.clear();

    // Reset players for the selected mode
    this.state.players.forEach((p) => {
      p.hp = 100;
      p.isDead = false;
      p.kills = 0;
      p.deaths = 0;
      p.hasBomb = false;
      p.money = ECONOMY.startMoney;
      p.currentWeapon = "deagle";
      p.primaryWeapon = "";
      p.secondaryWeapon = "deagle";
      p.knifeSlot = "knife";
      p.ammo = WEAPONS.deagle.mag;
      p.reserveAmmo = WEAPONS.deagle.reserveAmmo;
      p.armor = 0;
      p.hasHelmet = false;
      p.hasDefuseKit = false;
      p.grenadeHE = 0;
      p.grenadeSmoke = 0;
      p.grenadeFlash = 0;
      p.isPlanting = false;
      p.isDefusing = false;
      if (p.team === "T") p.team = "T";
    });

    if (this.state.gameMode === "bomb_defusal") {
      this.startBuyPhase();
    } else {
      // FFA/TDM: no buy phase, no bomb — run until win condition.
      // Give every player one of each grenade since buy menu is unavailable.
      this.state.players.forEach((p) => {
        p.grenadeHE = 1;
        p.grenadeSmoke = 1;
        p.grenadeFlash = 1;
      });
      this.state.phase = "active";
      this.state.roundTimeLeft = ROUND.activePhaseDuration;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";
      this.broadcast("phaseChange", { phase: "active", timeLeft: this.state.roundTimeLeft });
    }

    // Restart simulation loop (cleared by clearAllTimers during restart).
    this.startTickLoop();
  }

  private startBuyPhase() {
    this.state.phase = "buy";
    this.state.buyPhaseTimeLeft = ROUND.buyPhaseDuration;
    this.state.roundTimeLeft = ROUND.activePhaseDuration;
    this.state.bombPlanted = false;
    this.state.bombTimeLeft = 0;
    this.state.bombSite = "";

    this.state.readyCount = 0;
    this.state.players.forEach((p) => { p.isReady = false; });

    this.assignBombToRandomT();
    this.resetPlayersForRound();

    this.broadcast("phaseChange", { phase: "buy", timeLeft: this.state.buyPhaseTimeLeft });
  }

  private startActivePhase() {
    this.state.phase = "active";
    this.state.roundTimeLeft = ROUND.activePhaseDuration;

    this.broadcast("phaseChange", { phase: "active", timeLeft: this.state.roundTimeLeft });
  }

  private skipBuyPhase() {
    if (this.phaseTimerId) clearTimeout(this.phaseTimerId);

    this.state.roundTimeLeft += 10;
    this.startActivePhase();
  }

  private endRound(winner: "T" | "CT") {
    this.state.phase = "roundEnd";
    this.state.roundEndTimer = ROUND.roundEndDuration;

    if (winner === "T") {
      this.state.teamRedScore++;
    } else {
      this.state.teamBlueScore++;
    }

    this.giveRoundRewards(winner);

    this.broadcast("roundEnd", {
      winner,
      teamRedScore: this.state.teamRedScore,
      teamBlueScore: this.state.teamBlueScore,
      roundNumber: this.state.roundNumber,
    });

    const targetScore = this.state.isOvertime ? ROUND.overtimeWinScore : ROUND.winScore;

    if (
      this.state.teamRedScore >= targetScore ||
      this.state.teamBlueScore >= targetScore
    ) {
      this.handleMatchEnd();
      return;
    }

    if (
      !this.state.isHalfTime &&
      this.state.roundNumber === Math.floor(ROUND.maxRounds / 2)
    ) {
      this.state.isHalfTime = true;
      this.swapTeams();
    }

    this.state.roundNumber++;

    if (
      !this.state.isOvertime &&
      this.state.teamRedScore === ROUND.winScore - 1 &&
      this.state.teamBlueScore === ROUND.winScore - 1
    ) {
      this.state.isOvertime = true;
      this.state.maxRounds = ROUND.overtimeMaxRounds;
    }
  }

  private handleMatchEnd() {
    this.state.phase = "matchEnd";

    const winner = this.state.teamRedScore > this.state.teamBlueScore ? "T" : "CT";
    this.broadcast("matchEnd", {
      winner,
      finalScore: {
        T: this.state.teamRedScore,
        CT: this.state.teamBlueScore,
      },
    });

    setTimeout(() => {
      this.state.phase = "waiting";
      this.state.roundNumber = 1;
      this.state.teamRedScore = 0;
      this.state.teamBlueScore = 0;
      this.state.isHalfTime = false;
      this.state.isOvertime = false;
      this.state.isSuddenDeath = false;
      this.state.lossStreakT = 0;
      this.state.lossStreakCT = 0;

      this.state.players.forEach((p) => {
        p.kills = 0;
        p.deaths = 0;
        p.money = ECONOMY.startMoney;
        p.hp = 100;
        p.isDead = false;
        p.hasBomb = false;
        p.armor = 0;
        p.hasHelmet = false;
        p.hasDefuseKit = false;
        p.grenadeHE = 0;
        p.grenadeSmoke = 0;
        p.grenadeFlash = 0;
        p.currentWeapon = "deagle";
        p.primaryWeapon = "";
        p.secondaryWeapon = "deagle";
        p.knifeSlot = "knife";
        p.ammo = WEAPONS.deagle.mag;
        p.reserveAmmo = WEAPONS.deagle.reserveAmmo;
      });

      this.bombCarrierId = null;
      this.droppedBombPos = null;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";

      this.broadcast("matchReset", {});
    }, 5000);
  }

  private endMatch(winnerId: string) {
    this.state.phase = "matchEnd";

    const scores = Object.fromEntries(this.state.playerScores.entries());
    this.broadcast("matchEnd", {
      winner: winnerId,
      gameMode: this.state.gameMode,
      scores,
    });

    setTimeout(() => {
      this.state.phase = "waiting";
      this.state.roundNumber = 1;
      this.state.teamRedScore = 0;
      this.state.teamBlueScore = 0;
      this.state.isHalfTime = false;
      this.state.isOvertime = false;
      this.state.isSuddenDeath = false;
      this.state.lossStreakT = 0;
      this.state.lossStreakCT = 0;
      this.state.playerScores.clear();

      this.state.players.forEach((p) => {
        p.kills = 0;
        p.deaths = 0;
        p.money = ECONOMY.startMoney;
        p.hp = 100;
        p.isDead = false;
        p.hasBomb = false;
        p.armor = 0;
        p.hasHelmet = false;
        p.hasDefuseKit = false;
        p.grenadeHE = 0;
        p.grenadeSmoke = 0;
        p.grenadeFlash = 0;
        p.currentWeapon = "deagle";
        p.primaryWeapon = "";
        p.secondaryWeapon = "deagle";
        p.knifeSlot = "knife";
        p.ammo = WEAPONS.deagle.mag;
        p.reserveAmmo = WEAPONS.deagle.reserveAmmo;
      });

      this.bombCarrierId = null;
      this.droppedBombPos = null;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";

      this.broadcast("matchReset", {});
    }, 5000);
  }

  private giveRoundRewards(winner: "T" | "CT") {
    const loser = winner === "T" ? "CT" : "T";

    // Update loss streaks BEFORE calculating bonuses
    if (winner === "CT") {
      this.state.lossStreakT = Math.min(this.state.lossStreakT + 1, 3);
      this.state.lossStreakCT = 0;
    } else {
      this.state.lossStreakCT = Math.min(this.state.lossStreakCT + 1, 3);
      this.state.lossStreakT = 0;
    }

    this.state.players.forEach((p) => {
      const isWinner = p.team === winner;

      if (isWinner) {
        p.money = Math.min(p.money + ECONOMY.roundWinBonus, ECONOMY.maxMoney);
      } else {
        const streak = p.team === "T" ? this.state.lossStreakT : this.state.lossStreakCT;
        const bonus = streak >= 2 ? ECONOMY.lossBonus2 : ECONOMY.lossBonus1;
        p.money = Math.min(p.money + bonus, ECONOMY.maxMoney);
      }
    });
  }

  private swapTeams() {
    this.state.players.forEach((p) => {
      p.team = p.team === "T" ? "CT" : "T";
      const spawn = SPAWN[p.team as keyof typeof SPAWN];
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
    });

    this.bombCarrierId = null;
    this.assignBombToRandomT();
  }

  private resetPlayersForRound() {
    this.state.players.forEach((p) => {
      p.hp = 100;
      p.isDead = false;
      p.isReloading = false;
      p.isPlanting = false;
      p.isDefusing = false;
      p.plantProgress = 0;
      p.defuseProgress = 0;
      p.hasBomb = false;

      const spawn = SPAWN[p.team as keyof typeof SPAWN];
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
    });
  }

  private assignBombToRandomT() {
    const tPlayers: string[] = [];
    this.state.players.forEach((p, id) => {
      if (p.team === "T") tPlayers.push(id);
    });

    if (tPlayers.length === 0) return;

    const idx = Math.floor(Math.random() * tPlayers.length);
    const bombHolder = this.state.players.get(tPlayers[idx]);
    if (bombHolder) {
      bombHolder.hasBomb = true;
      this.bombCarrierId = tPlayers[idx];
    }
  }

  private checkRoundEnd() {
    if (this.state.phase !== "active") return;
    // FFA/TDM resolve only via the score win-condition.
    if (this.state.gameMode !== "bomb_defusal") return;

    const aliveT: string[] = [];
    const aliveCT: string[] = [];

    this.state.players.forEach((p, id) => {
      if (p.isDead) return;
      if (p.team === "T") aliveT.push(id);
      else aliveCT.push(id);
    });

    if (aliveT.length === 0 && !this.state.bombPlanted) {
      this.endRound("CT");
      return;
    }

    if (aliveCT.length === 0) {
      this.endRound("T");
      return;
    }
  }
}
