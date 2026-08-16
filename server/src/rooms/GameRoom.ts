import { Room, Client } from "colyseus";
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
  GUN_GAME_WEAPONS,
  DEFAULT_PISTOL,
  MELEE,
  isMeleeWeapon,
  ClientInput,
  ShootInput,
  BuyRequest,
  BuyFailReason,
  MeleeInput,
  BombPlantRequest,
  BombDefuseRequest,
  ThrowGrenadeInput,
  MapObstacle,
} from "@cs-game/shared";
import {
  MAX_ORIGIN_DISTANCE_SQ,
  SPAWN_PROTECTION_MS,
  MAX_HP,
  ARMOR_VALUE,
  CHAT_COOLDOWN_MS,
  RADIO_COOLDOWN_MS,
  MAX_CHAT_LENGTH,
  MAX_NICKNAME_LENGTH,
  VOTE_TIMEOUT_MS,
  VOTE_KICK_EXIT_CODE,
  KOTH_CAPTURE_RATE_PER_PLAYER,
  KOTH_DECAY_RATE,
  KOTH_MAX_PROGRESS,
  MIN_SPAWN_DISTANCE_SQ,
  ROUND_RESET_DELAY_MS,
} from "./constants";
import { WeaponManager } from "./WeaponManager";
import { EconomySystem } from "./EconomySystem";
import { BombController } from "./BombController";
import { AntiCheatSystem } from "./AntiCheatSystem";
import { InterestManager } from "./InterestManager";
import { BotAgent, BotConfig } from "../ai/BotAgent";

const TICK_MS = 1000 / SERVER.tickRate;

function sanitizeNickname(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "")
    .replace(/[<>"'`]/g, "")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
}

interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
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

// ray vs AABB (slab method). Returns entry distance or null.
// Re-export from shared utility — local kept for hasLineOfSight closure.
import { rayVsBox } from "../utils/geometry";

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
    // metal and concrete block LOS
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
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private respawnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private phaseTimerId: ReturnType<typeof setTimeout> | null = null;
  private spawnProtection: Map<string, number> = new Map();
  private weaponManager = new WeaponManager();
  private economyManager = new EconomySystem();
  private bombCtrl = new BombController();
  private antiCheat = new AntiCheatSystem();
  private interestManager = new InterestManager();

  private vote: {
    targetId: string;
    targetNickname: string;
    yesVotes: Set<string>;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  private ffVote: {
    initiatorId: string;
    team: string;
    yesVotes: Set<string>;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;

  // Track last input time per player for real-time dt calculation
  private lastInputTime: Map<string, number> = new Map();
  // Rate limiting for chat and radio
  private lastChatTime: Map<string, number> = new Map();
  private lastRadioTime: Map<string, number> = new Map();
  // Rate limiting for vote kick requests
  private lastVoteTime: Map<string, number> = new Map();
  // Rate limiting for buy requests
  private lastBuyTime: Map<string, number> = new Map();
  // Server-side grenade simulation (not synced as schema; transient)
  private grenades: Map<string, GrenadeSim> = new Map();
  private grenadeCooldowns: Map<string, number> = new Map();
  private grenadeSeq = 0;
  // Reconnect: players keep their state during the TTL window
  private pendingReconnect: Map<string, { timer: ReturnType<typeof setTimeout> }> = new Map();
  // Bot backfill for low-population matches
  private botAgents: Map<string, BotAgent> = new Map();
  private botDifficulty = 3;
  private maxBots = 5;
  private botSeq = 0;

  onCreate() {
    this.setState(new GameState());
    this.maxClients = 10;

    this.onMessage("input", (client, input: ClientInput) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (this.state.phase !== "active") return;

      // Anti-cheat: input flood protection
      if (!this.antiCheat.validateInputRate(client.sessionId, performance.now())) return;

      if (!this.weaponManager.canProcessInput(client.sessionId, TICK_MS)) return;

      // Anti-cheat: kick if too many speed violations
      if (this.antiCheat.shouldKick(client.sessionId)) {
        client.leave(4001, "Anti-cheat: speed hack detected");
        return;
      }

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

      const weaponKey = shooter.currentWeapon as keyof typeof WEAPONS;
      if (!WEAPONS[weaponKey]) return;
      // Knives go through the "melee" message; they must never hitscan.
      if (isMeleeWeapon(shooter.currentWeapon)) return;

      if (!this.weaponManager.validateShootOrigin(shooter, data)) return;

      // Anti-cheat: validate fire rate
      const now = performance.now();
      const lastFire = this.weaponManager.getLastFireTime(client.sessionId);
      if (!this.antiCheat.validateFireRate(client.sessionId, weaponKey, lastFire, now)) return;

      if (!this.weaponManager.canFire(client.sessionId, weaponKey)) return;
      if (shooter.ammo <= 0) return;

      // Anti-cheat: validate ammo is sane
      if (!this.antiCheat.validateAmmo(client.sessionId, shooter, weaponKey)) return;

      shooter.ammo--;
      this.weaponManager.recordFire(client.sessionId);

      const hitResult = this.weaponManager.checkHit(client.sessionId, shooter, data, this.state);
      if (!hitResult) return;

      const victim = this.state.players.get(hitResult.victimId);
      if (!victim || victim.isDead) return;

      if (this.weaponManager.isSpawnProtected(this.spawnProtection, hitResult.victimId)) return;

      const damage = this.weaponManager.calculateDamage(
        weaponKey, hitResult.zone, victim.armor, victim.hasHelmet, hitResult.wallbangFactor
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

      const reloadTimer = setTimeout(() => {
        const p = this.state.players.get(client.sessionId);
        if (!p || p.isDead) { if (p) p.isReloading = false; return; }

        const needed = weaponStats.mag - p.ammo;
        const toLoad = Math.min(needed, p.reserveAmmo);
        p.ammo += toLoad;
        p.reserveAmmo -= toLoad;
        p.isReloading = false;

        this.weaponManager.clearReload(client.sessionId);
        this.broadcast("reloadEnd", { playerId: client.sessionId });
      }, weaponStats.reload * 1000);
      this.weaponManager.trackReload(client.sessionId, reloadTimer);

      this.broadcast("reloadStart", { playerId: client.sessionId });
    });

    this.onMessage("buy", (client, data: BuyRequest) => {
      const item = typeof data?.item === "string" ? data.item : "";
      const reject = (reason: BuyFailReason) => {
        client.send("buyFailed", { item, reason });
      };

      if (this.state.phase !== "buy") return reject("not_buy_phase");

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Rate limit: 500ms cooldown per player for buy requests
      const now = performance.now();
      const lastBuy = this.lastBuyTime.get(client.sessionId) || 0;
      if (now - lastBuy < 500) return reject("too_fast");
      this.lastBuyTime.set(client.sessionId, now);

      // Verify player is in buy zone
      const buyZone = BUY_ZONE[player.team as keyof typeof BUY_ZONE];
      if (buyZone) {
        const dx = player.x - buyZone.x;
        const dz = player.z - buyZone.z;
        if (Math.sqrt(dx * dx + dz * dz) > buyZone.radius) return reject("outside_buy_zone");
      }

      const result = this.economyManager.processBuy(client.sessionId, data, this.state);
      if (!result.ok) return reject(result.reason);

      this.broadcast("itemBought", {
        playerId: client.sessionId,
        item: result.item,
        slot: result.slot,
        currentWeapon: result.currentWeapon,
      });
    });

    this.onMessage("melee", (client, data: MeleeInput) => {
      const attacker = this.state.players.get(client.sessionId);
      if (!attacker || attacker.isDead) return;
      if (this.state.phase !== "active") return;

      const weaponKey = attacker.currentWeapon as keyof typeof WEAPONS;
      if (!isMeleeWeapon(attacker.currentWeapon) || !WEAPONS[weaponKey]) return;

      const now = performance.now();
      const lastFire = this.weaponManager.getLastFireTime(client.sessionId);
      if (!this.antiCheat.validateFireRate(client.sessionId, weaponKey, lastFire, now)) return;
      if (!this.weaponManager.canFire(client.sessionId, weaponKey)) return;

      this.weaponManager.recordFire(client.sessionId);

      const hit = this.weaponManager.checkMeleeHit(
        client.sessionId,
        attacker,
        data?.direction,
        this.state
      );
      if (!hit) return;

      const victim = this.state.players.get(hit.victimId);
      if (!victim || victim.isDead) return;
      if (this.weaponManager.isSpawnProtected(this.spawnProtection, hit.victimId)) return;

      // A knife ignores armor; a backstab is meant to be lethal.
      const stats = WEAPONS[weaponKey];
      const damage = hit.backstab
        ? Math.round(stats.dmg * MELEE.backstabMultiplier)
        : stats.dmg;
      victim.hp -= damage;

      this.broadcast("damage", {
        shooterId: client.sessionId,
        victimId: hit.victimId,
        damage,
        hp: victim.hp,
        headshot: false,
      });

      if (victim.hp <= 0) {
        this.handleKill(client.sessionId, attacker, hit.victimId, victim, weaponKey, false);
      }
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

      if (!weapon) {
        client.send("switchFailed", { slot });
        return;
      }

      const weaponStats = WEAPONS[weapon as keyof typeof WEAPONS];
      if (!weaponStats) return;

      player.currentWeapon = weapon;

      // Restore exactly what the slot was left with; refilling on switch would
      // hand out free magazines.
      if (slot === 1 && player.primaryWeapon) {
        player.ammo = player.primaryAmmo;
        player.reserveAmmo = player.primaryReserveAmmo;
      } else if (slot === 2 && player.secondaryWeapon) {
        player.ammo = player.secondaryAmmo;
        player.reserveAmmo = player.secondaryReserveAmmo;
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
        ammo: player.ammo,
        reserveAmmo: player.reserveAmmo,
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
      if (this.bombCtrl.bombCarrierId) return;
      if (this.state.bombPlanted) return;
      if (!this.bombCtrl.droppedBombPos) return;

      // Check distance to dropped bomb (within 2 units)
      const dx = player.x - this.bombCtrl.droppedBombPos.x;
      const dz = player.z - this.bombCtrl.droppedBombPos.z;
      if (Math.sqrt(dx * dx + dz * dz) > 2) return;

      player.hasBomb = true;
      this.bombCtrl.bombCarrierId = client.sessionId;
      this.bombCtrl.droppedBombPos = null;
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
      if (ox * ox + oy * oy + oz * oz > MAX_ORIGIN_DISTANCE_SQ) return;

      // Anti-cheat: clamp throw power.
      const speed = Math.sqrt(
        velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2
      );
      if (speed <= 0 || speed > GRENADE.maxThrowSpeed) return;

      // Anti-cheat: throw direction must be forward (within ±90° of player facing)
      const playerForwardX = -Math.sin(player.rotationY);
      const playerForwardZ = -Math.cos(player.rotationY);
      const velHorizLen = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
      if (velHorizLen > 0.1) {
        const dot = (velocity.x * playerForwardX + velocity.z * playerForwardZ) / velHorizLen;
        if (dot < -0.3) return; // reject backward throws
      }

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
      if (this.state.phase !== "waiting") return;
      const validModes = ["bomb_defusal", "ffa", "tdm", "koth", "gun_game"];
      if (!validModes.includes(data.mode)) return;

      this.state.gameMode = data.mode;
      this.state.playerScores.clear();
      this.broadcast("gameModeChanged", { mode: data.mode });
    });

    this.onMessage("ping", (client, data: { timestamp: number }) => {
      client.send("pong", { timestamp: data.timestamp });
    });

    this.onMessage("clientRTT", (client, data: { rtt: number }) => {
      if (typeof data.rtt === "number" && data.rtt > 0 && data.rtt < 5000) {
        this.weaponManager.trackServerRTT(client.sessionId, data.rtt);
      }
    });

    this.onMessage("chat", (client, data: { message?: unknown }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;

      // Rate limit cooldown per player
      const now = performance.now();
      const lastChat = this.lastChatTime.get(client.sessionId) || 0;
      if (now - lastChat < CHAT_COOLDOWN_MS) return;
      this.lastChatTime.set(client.sessionId, now);

      if (typeof data?.message !== "string") return;
      const message = data.message
        .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "") // zero-width + control chars
        .replace(/[<>"']/g, "") // HTML injection prevention
        .trim()
        .slice(0, MAX_CHAT_LENGTH);
      if (!message) return;

      // Check for /ff (forfeit/surrender) command
      if (message.toLowerCase() === "/ff" || message.toLowerCase() === "ff") {
        this.handleForfeitRequest(client.sessionId, player);
        return;
      }

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
      if (this.state.players.size < 4) return; // minimum 4 players for vote kick
      if (this.vote) return;

      // Rate limit: 30 second cooldown per player for vote requests
      const now = performance.now();
      const lastVote = this.lastVoteTime.get(client.sessionId) || 0;
      if (now - lastVote < 30000) return;
      this.lastVoteTime.set(client.sessionId, now);

      this.vote = {
        targetId: data.targetId,
        targetNickname: target.nickname,
        yesVotes: new Set([client.sessionId]),
        timer: setTimeout(() => {
          this.vote = null;
        }, VOTE_TIMEOUT_MS),
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
        if (yesCount / (this.state.players.size - 1) >= 0.66) {
          const targetClient = this.clients.find(
            (c) => c.sessionId === vote.targetId
          );
          const targetNickname = vote.targetNickname;
          if (vote.timer) clearTimeout(vote.timer);
          this.vote = null;

          if (targetClient) {
            this.broadcast("kicked", { targetId: targetClient.sessionId, targetNickname });
            targetClient.leave(VOTE_KICK_EXIT_CODE, "Kicked by vote");
          }
        }
      }
    );

    this.onMessage("ff_vote", (client, data: { vote: boolean }) => {
      if (!this.ffVote) return;
      if (client.sessionId === this.ffVote.initiatorId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player || player.team !== this.ffVote.team) return;

      if (data.vote) this.ffVote.yesVotes.add(client.sessionId);

      // Need majority of team to agree
      let teamCount = 0;
      this.state.players.forEach((p) => {
        if (p.team === this.ffVote!.team && !p.isDead) teamCount++;
      });

      const yesCount = this.ffVote.yesVotes.size;
      if (yesCount >= Math.ceil(teamCount / 2)) {
        // Forfeit accepted — other team wins
        const winner = this.ffVote.team === "T" ? "CT" : "T";
        if (this.ffVote.timer) clearTimeout(this.ffVote.timer);
        this.ffVote = null;
        this.broadcast("forfeitAccepted", { surrenderedTeam: player.team, winner });
        this.endRound(winner as "T" | "CT");
      }
    });

    this.onMessage("radio", (client, data: { code: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.isDead) return;
      if (![1, 2, 3].includes(data.code)) return;

      // Rate limit cooldown per player
      const now = performance.now();
      const lastRadio = this.lastRadioTime.get(client.sessionId) || 0;
      if (now - lastRadio < RADIO_COOLDOWN_MS) return;
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
    if (this.tickTimer) return;
    const tick = () => {
      const now = performance.now();
      const startTime = now;

      if (this.state.phase === "active") {
        this.state.roundTimeLeft = Math.max(0, this.state.roundTimeLeft - 1 / SERVER.tickRate);
        if (this.state.roundTimeLeft <= 0) {
          if (this.state.gameMode === "bomb_defusal") {
            this.endRound(this.state.bombPlanted ? "T" : "CT");
          } else {
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

      this.state.smokes.forEach((smoke, id) => {
        smoke.timeLeft -= 1 / SERVER.tickRate;
        if (smoke.timeLeft <= 0) {
          this.state.smokes.delete(id);
        }
      });

      this.simulateGrenades(now);
      this.processPlanting();
      this.processDefusing();
      this.processKoth();
      this.updateBots(1 / SERVER.tickRate);

      // Interest Management: broadcast filtered player positions
      if (this.interestManager.shouldUpdate(now)) {
        const visibility = this.interestManager.computeVisibility(this.state.players);
        const payloads = this.interestManager.buildFilteredPayloads(this.state.players, visibility);
        payloads.forEach((playerData, viewerId) => {
          const client = this.clients.find((c) => c.sessionId === viewerId);
          if (client) {
            client.send("interestUpdate", playerData);
          }
        });
      }

      const elapsed = performance.now() - startTime;
      this.tickTimer = setTimeout(tick, Math.max(1, TICK_MS - elapsed));
    };
    this.tickTimer = setTimeout(tick, TICK_MS);
  }

  onJoin(client: Client, options: { nickname?: string; team?: string; mode?: string }) {
    const playerCount = this.state.players.size;

    // Balance teams: count players per team
    let countT = 0;
    let countCT = 0;
    this.state.players.forEach((p) => {
      if (p.team === "T") countT++;
      else countCT++;
    });
    const chosenTeam = (options.team === "T" || options.team === "CT")
      ? options.team
      : countT <= countCT ? "T" : "CT";
    const team = chosenTeam;
    const spawn = SPAWN[team as keyof typeof SPAWN];

    const player = new PlayerState();
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.team = team;
    const cleanNickname = sanitizeNickname(options.nickname);
    player.nickname = cleanNickname || `Player${playerCount + 1}`;
    player.money = ECONOMY.startMoney;
    player.hp = MAX_HP;
    player.currentWeapon = "deagle";
    player.primaryWeapon = "";
    player.secondaryWeapon = "deagle";
    player.knifeSlot = "knife";
    player.ammo = WEAPONS.deagle.mag;
    player.reserveAmmo = WEAPONS.deagle.reserveAmmo;

    if (team === "T" && !this.bombCtrl.bombCarrierId) {
      player.hasBomb = true;
      this.bombCtrl.bombCarrierId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

    this.broadcast("playerJoined", {
      sessionId: client.sessionId,
      nickname: player.nickname,
      team,
    });

    this.broadcast("playerCount", { count: this.state.players.size });

    // Spawn tactical bots for 5v5 balance
    this.backfillBots();

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
      if (player.hasBomb && this.bombCtrl.bombCarrierId === sessionId) {
        this.bombCtrl.bombCarrierId = null;
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
    this.lastVoteTime.delete(sessionId);
    this.lastBuyTime.delete(sessionId);
    this.antiCheat.clearAll(sessionId);

    // ─── Reconnect window: player state is preserved for 60s ───
    if (player && this.state.phase !== "waiting") {
      // Set expiry timestamp so clients can display countdown
      player.reconnectExpiresAt = Date.now() + SERVER.reconnectTTL * 1000;
      const allow = this.allowReconnection(client, SERVER.reconnectTTL);
      const pendingTimer = setTimeout(() => {
        // Reconnect window expired → hard cleanup.
        const p = this.state.players.get(sessionId);
        this.state.players.delete(sessionId);
        this.weaponManager.clearAll(sessionId);
        this.spawnProtection.delete(sessionId);
        this.pendingReconnect.delete(sessionId);

        if (p) {
          p.reconnectExpiresAt = 0; // Clear expiry before deletion
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

        // Bot backfill: if fewer than 2 humans, spawn bots
        this.backfillBots();

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
            p.reconnectExpiresAt = 0; // Reset expiry on successful reconnect
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
    this.weaponManager.clearAll(sessionId);
    this.spawnProtection.delete(sessionId);

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
    this.botAgents.clear();
    this.clearAllTimers();
  }

  private clearAllTimers() {
    if (this.tickTimer) { clearTimeout(this.tickTimer); this.tickTimer = null; }
    if (this.bombCtrl.bombTimerId) { clearTimeout(this.bombCtrl.bombTimerId); this.bombCtrl.bombTimerId = null; }
    if (this.phaseTimerId) { clearTimeout(this.phaseTimerId); this.phaseTimerId = null; }
    this.respawnTimers.forEach((t) => clearTimeout(t));
    this.respawnTimers.clear();
    this.pendingReconnect.forEach(({ timer }) => clearTimeout(timer));
    this.pendingReconnect.clear();
    if (this.ffVote) { clearTimeout(this.ffVote.timer); this.ffVote = null; }
  }

  // ─── Movement ──────────────────────────────────────────────────
  private processMovement(sessionId: string, player: PlayerState, input: ClientInput) {
    // Reject duplicate or out-of-order inputs
    if (input.seq <= player.lastProcessedSeq) return;

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

    let dirX = 0;
    let dirZ = 0;

    if (input.forward) { dirX -= sin; dirZ -= cos; }
    if (input.backward) { dirX += sin; dirZ += cos; }
    if (input.left) { dirX -= cos; dirZ += sin; }
    if (input.right) { dirX += cos; dirZ -= sin; }

    let moveX = 0;
    let moveZ = 0;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len > 0.0001) {
      moveX = (dirX / len) * speed * dt;
      moveZ = (dirZ / len) * speed * dt;
    }

    const delta = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const maxDelta = SERVER.maxVelocity * dt * SERVER.maxDelta;

    if (delta <= maxDelta) {
      let nextX = player.x + moveX;
      let nextZ = player.z + moveZ;

      // Anti-cheat: validate speed (must be checked before position is written)
      if (!this.antiCheat.validateSpeed(sessionId, player, nextX, nextZ, dt)) {
        // Speed violation — clamp movement to max allowed
        const allowedDist = PHYSICS.sprintSpeed * 1.35 * dt;
        const actualDist = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (actualDist > 0.001) {
          const scale = allowedDist / actualDist;
          moveX *= scale;
          moveZ *= scale;
        }
        nextX = player.x + moveX;
        nextZ = player.z + moveZ;
      }

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
    this.weaponManager.recordPosition(sessionId, player, now);
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
      if (grenade.y <= GRENADE.groundMinY) {
        grenade.y = GRENADE.groundMinY;
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
          if (axis === "x") grenade.vx = -grenade.vx * GRENADE.wallBounceDamping;
          else if (axis === "y") grenade.vy = -grenade.vy * GRENADE.wallBounceDamping;
          else grenade.vz = -grenade.vz * GRENADE.wallBounceDamping;
          if (axis !== "y") {
            // push out of the box along the dominant axis
            const center = (obs.minX + obs.maxX) / 2;
            const cz = (obs.minZ + obs.maxZ) / 2;
            if (axis === "x") {
              grenade.x = grenade.x < center ? obs.minX - GRENADE.collisionOffset : obs.maxX + GRENADE.collisionOffset;
            } else {
              grenade.z = grenade.z < cz ? obs.minZ - GRENADE.collisionOffset : obs.maxZ + GRENADE.collisionOffset;
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

    // Prune finished grenades and enforce max limit
    const toDelete: string[] = [];
    this.grenades.forEach((g) => {
      if (g.detonated || now - g.spawnTime > GRENADE.fuse * 1000 + 2000) {
        toDelete.push(g.id);
      }
    });
    for (const id of toDelete) {
      this.grenades.delete(id);
    }
    // Hard limit: max 20 active grenades
    if (this.grenades.size > 20) {
      const oldest = Array.from(this.grenades.values())
        .sort((a, b) => a.spawnTime - b.spawnTime)
        .slice(0, this.grenades.size - 20);
      for (const g of oldest) {
        this.grenades.delete(g.id);
      }
    }
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
      if (spawnTime !== undefined && now - spawnTime < SPAWN_PROTECTION_MS) return;

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

    // Gun Game: advance weapon on kill
    if (this.state.gameMode === "gun_game") {
      const currentLevel = this.state.playerScores.get(killerId) || 0;
      const nextLevel = currentLevel + 1;
      this.state.playerScores.set(killerId, nextLevel);

      // Winner: first to complete all weapons
      if (nextLevel >= GUN_GAME_WEAPONS.length) {
        this.endMatch(killerId);
      } else {
        // Upgrade weapon
        const nextWeapon = GUN_GAME_WEAPONS[nextLevel];
        killer.currentWeapon = nextWeapon;
        killer.primaryWeapon = nextWeapon;
        const weaponStats = WEAPONS[nextWeapon as keyof typeof WEAPONS];
        if (weaponStats) {
          killer.ammo = weaponStats.mag;
          killer.reserveAmmo = weaponStats.reserveAmmo;
        }
        killer.isReloading = false;
      }
    }

    const weaponKey = weapon as keyof typeof WEAPONS;
    let killReward: number = ECONOMY.killRifle;
    if (weapon === "awp") killReward = ECONOMY.killAWP;
    else if (weapon === "mp5") killReward = ECONOMY.killSMG;

    killer.money = Math.min(killer.money + killReward, ECONOMY.maxMoney);

    if (victim.hasBomb) {
      this.bombCtrl.bombCarrierId = null;
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
            if (dx * dx + dz * dz < MIN_SPAWN_DISTANCE_SQ) tooClose = true;
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

      player.hp = MAX_HP;
      player.isDead = false;
      player.y = 0;

      // Preserve player's weapons, just reset ammo
      const weaponStats = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
      if (weaponStats) {
        const melee = isMeleeWeapon(player.currentWeapon);
        player.ammo = melee ? 0 : weaponStats.mag;
        player.reserveAmmo = melee ? 0 : weaponStats.reserveAmmo;
      } else {
        this.giveDefaultLoadout(player);
      }
      player.isReloading = false;
      player.armor = 0;
      player.hasHelmet = false;
      player.hasDefuseKit = false;
      player.hasBomb = false;
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
    this.bombCtrl.processPlanting(this.state, SERVER.tickRate, (id, player) => {
      this.completePlant(id, player);
    });
  }

  private completePlant(sessionId: string, player: PlayerState) {
    this.bombCtrl.completePlant(
      sessionId,
      player,
      this.state,
      (p) => this.findNearestBombSite(p),
      this.broadcast.bind(this),
      (p) => this.economyManager.givePlantBonus(p)
    );
  }

  private cancelPlant(sessionId: string, player: PlayerState) {
    this.bombCtrl.cancelPlant(sessionId, player, this.broadcast.bind(this));
  }

  private processDefusing() {
    this.bombCtrl.processDefusing(this.state, SERVER.tickRate, (id, player) => {
      this.completeDefuse(id, player);
    });
  }

  private completeDefuse(sessionId: string, player: PlayerState) {
    this.bombCtrl.completeDefuse(
      sessionId,
      player,
      this.state,
      (p) => this.economyManager.giveDefuseBonus(p),
      this.broadcast.bind(this),
      (winner) => this.endRound(winner)
    );
  }

  private cancelDefuse(sessionId: string, player: PlayerState) {
    this.bombCtrl.cancelDefuse(sessionId, player, this.broadcast.bind(this));
  }

  private bombExplode() {
    this.bombCtrl.bombExplode(
      this.state,
      this.broadcast.bind(this),
      (winner) => this.endRound(winner)
    );
  }

  private processKoth() {
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
        KOTH_MAX_PROGRESS,
        this.state.kothCaptureProgress + (KOTH_MAX_PROGRESS / (KOTH_CAPTURE_RATE_PER_PLAYER * SERVER.tickRate)) * playersInZoneT
      );
    } else if (playersInZoneCT > 0 && playersInZoneT === 0) {
      // CT is capturing
      if (this.state.kothCapturingTeam !== "CT") {
        this.state.kothCapturingTeam = "CT";
        this.broadcast("kothCaptureStart", { team: "CT" });
      }
      this.state.kothCaptureProgress = Math.min(
        KOTH_MAX_PROGRESS,
        this.state.kothCaptureProgress + (KOTH_MAX_PROGRESS / (KOTH_CAPTURE_RATE_PER_PLAYER * SERVER.tickRate)) * playersInZoneCT
      );
    } else if (playersInZoneT > 0 && playersInZoneCT > 0) {
      // Contested - no progress
      this.state.kothCapturingTeam = "contested";
    } else {
      // No one in zone - decay progress
      if (this.state.kothCaptureProgress > 0) {
        this.state.kothCaptureProgress = Math.max(
          0,
          this.state.kothCaptureProgress - (KOTH_MAX_PROGRESS / (KOTH_DECAY_RATE * SERVER.tickRate))
        );
      }
      if (this.state.kothCaptureProgress === 0) {
        this.state.kothCapturingTeam = "";
      }
    }

    // Check for capture completion
    if (this.state.kothCaptureProgress >= KOTH_MAX_PROGRESS) {
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
    this.bombCtrl.dropBomb(player);
    this.broadcast("bombDropped", {
      x: player.x,
      y: player.y,
      z: player.z,
    });
  }

  private findNearestBombSite(player: PlayerState): string {
    return this.bombCtrl.findNearestBombSite(player);
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
      p.hp = MAX_HP;
      p.isDead = false;
      p.kills = 0;
      p.deaths = 0;
      p.hasBomb = false;
      p.money = ECONOMY.startMoney;
      this.giveDefaultLoadout(p);
      p.armor = 0;
      p.hasHelmet = false;
      p.hasDefuseKit = false;
      p.grenadeHE = 0;
      p.grenadeSmoke = 0;
      p.grenadeFlash = 0;
      p.isPlanting = false;
      p.isDefusing = false;
    });

    if (this.state.gameMode === "bomb_defusal") {
      this.startBuyPhase();
    } else if (this.state.gameMode === "gun_game") {
      // Gun Game: FFA, no buy phase, everyone starts with weapon level 0
      this.state.players.forEach((p) => {
        p.grenadeHE = 0;
        p.grenadeSmoke = 0;
        p.grenadeFlash = 0;
        p.currentWeapon = GUN_GAME_WEAPONS[0];
        p.primaryWeapon = GUN_GAME_WEAPONS[0];
        p.ammo = WEAPONS[GUN_GAME_WEAPONS[0]].mag;
        p.reserveAmmo = WEAPONS[GUN_GAME_WEAPONS[0]].reserveAmmo;
      });
      this.state.phase = "active";
      this.state.roundTimeLeft = ROUND.activePhaseDuration;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";
      this.broadcast("phaseChange", { phase: "active", timeLeft: this.state.roundTimeLeft });
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

  private handleForfeitRequest(sessionId: string, player: PlayerState) {
    if (this.state.phase !== "active" && this.state.phase !== "buy") return;
    if (this.ffVote) return; // already an active ff vote

    // Count teammates
    let teamCount = 0;
    this.state.players.forEach((p) => {
      if (p.team === player.team && !p.isDead) teamCount++;
    });

    if (teamCount < 2) return; // need at least 2 alive teammates

    this.ffVote = {
      initiatorId: sessionId,
      team: player.team,
      yesVotes: new Set([sessionId]),
      timer: setTimeout(() => {
        this.ffVote = null;
      }, 30000), // 30 second timeout
    };

    this.broadcast("ffVoteStarted", {
      initiatorId: sessionId,
      initiatorName: player.nickname,
      team: player.team,
    });
  }

  private endRound(winner: "T" | "CT") {
    this.state.phase = "roundEnd";
    this.state.roundEndTimer = ROUND.roundEndDuration;

    if (winner === "T") {
      this.state.teamRedScore++;
    } else {
      this.state.teamBlueScore++;
    }

    this.economyManager.giveRoundRewards(winner, this.state);

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
        p.hp = MAX_HP;
        p.isDead = false;
        p.hasBomb = false;
        p.armor = 0;
        p.hasHelmet = false;
        p.hasDefuseKit = false;
        p.grenadeHE = 0;
        p.grenadeSmoke = 0;
        p.grenadeFlash = 0;
        this.giveDefaultLoadout(p);
      });

      this.bombCtrl.bombCarrierId = null;
      this.bombCtrl.droppedBombPos = null;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";

      this.broadcast("matchReset", {});
    }, ROUND_RESET_DELAY_MS);
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
        p.hp = MAX_HP;
        p.isDead = false;
        p.hasBomb = false;
        p.armor = 0;
        p.hasHelmet = false;
        p.hasDefuseKit = false;
        p.grenadeHE = 0;
        p.grenadeSmoke = 0;
        p.grenadeFlash = 0;
        this.giveDefaultLoadout(p);
      });

      this.bombCtrl.bombCarrierId = null;
      this.bombCtrl.droppedBombPos = null;
      this.state.bombPlanted = false;
      this.state.bombTimeLeft = 0;
      this.state.bombSite = "";

      this.broadcast("matchReset", {});
    }, ROUND_RESET_DELAY_MS);
  }

  private swapTeams() {
    this.state.players.forEach((p) => {
      p.team = p.team === "T" ? "CT" : "T";
      const spawn = SPAWN[p.team as keyof typeof SPAWN];
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
    });

    this.bombCtrl.bombCarrierId = null;
    this.assignBombToRandomT();
  }

  private resetPlayersForRound() {
    this.state.players.forEach((p) => {
      p.hp = MAX_HP;
      p.isDead = false;
      p.isReloading = false;
      p.isPlanting = false;
      p.isDefusing = false;
      p.plantProgress = 0;
      p.defuseProgress = 0;
      p.hasBomb = false;
      this.refillAmmo(p);

      const spawn = SPAWN[p.team as keyof typeof SPAWN];
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
    });
  }

  /** Team pistol + knife, the loadout everyone starts a fresh buy round with. */
  private giveDefaultLoadout(player: PlayerState) {
    const pistol =
      DEFAULT_PISTOL[player.team as keyof typeof DEFAULT_PISTOL] ?? DEFAULT_PISTOL.T;
    const stats = WEAPONS[pistol as keyof typeof WEAPONS];

    player.currentWeapon = pistol;
    player.primaryWeapon = "";
    player.secondaryWeapon = pistol;
    player.knifeSlot = "knife";
    player.ammo = stats.mag;
    player.reserveAmmo = stats.reserveAmmo;
    player.primaryAmmo = 0;
    player.primaryReserveAmmo = 0;
    player.secondaryAmmo = stats.mag;
    player.secondaryReserveAmmo = stats.reserveAmmo;
    player.isReloading = false;
  }

  /** Top every owned slot back up, matching CS behaviour between rounds. */
  private refillAmmo(player: PlayerState) {
    const primary = WEAPONS[player.primaryWeapon as keyof typeof WEAPONS];
    if (primary) {
      player.primaryAmmo = primary.mag;
      player.primaryReserveAmmo = primary.reserveAmmo;
    }

    const secondary = WEAPONS[player.secondaryWeapon as keyof typeof WEAPONS];
    if (secondary) {
      player.secondaryAmmo = secondary.mag;
      player.secondaryReserveAmmo = secondary.reserveAmmo;
    }

    const current = WEAPONS[player.currentWeapon as keyof typeof WEAPONS];
    if (current) {
      const melee = isMeleeWeapon(player.currentWeapon);
      player.ammo = melee ? 0 : current.mag;
      player.reserveAmmo = melee ? 0 : current.reserveAmmo;
    }
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
      this.bombCtrl.bombCarrierId = tPlayers[idx];
    }
  }

  private checkRoundEnd() {
    if (this.state.phase !== "active") return;
    // FFA/TDM/Gun Game resolve only via the score win-condition.
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

  private countHumans(): number {
    let count = 0;
    this.state.players.forEach((p) => {
      if (!p.isBot) count++;
    });
    return count;
  }

  private backfillBots() {
    let tCount = 0;
    let ctCount = 0;
    this.state.players.forEach((p) => {
      if (p.team === "T") tCount++;
      else if (p.team === "CT") ctCount++;
    });

    const targetPerTeam = 5;
    const tNeeded = Math.max(0, targetPerTeam - tCount);
    const ctNeeded = Math.max(0, targetPerTeam - ctCount);

    const spawnBotForTeam = (team: "T" | "CT") => {
      const botId = `bot_${++this.botSeq}`;
      const spawn = SPAWN[team];
      const botPlayer = new PlayerState();
      botPlayer.x = spawn.x + (Math.random() - 0.5) * 8;
      botPlayer.y = 0;
      botPlayer.z = spawn.z + (Math.random() - 0.5) * 8;
      botPlayer.team = team;
      botPlayer.nickname = `Bot ${this.botSeq} (${team})`;
      botPlayer.hp = MAX_HP;
      botPlayer.isBot = true;
      botPlayer.botDifficulty = this.botDifficulty;
      botPlayer.currentWeapon = team === "T" ? "ak47" : "m4a1";
      botPlayer.primaryWeapon = team === "T" ? "ak47" : "m4a1";
      botPlayer.secondaryWeapon = "deagle";
      botPlayer.knifeSlot = "knife";
      botPlayer.ammo = 30;
      botPlayer.reserveAmmo = 90;

      this.state.players.set(botId, botPlayer);

      const behavior = (["peeker", "rusher", "camper", "support", "awper"] as const)[this.botSeq % 5];
      const config: BotConfig = {
        difficulty: this.botDifficulty,
        behavior,
        team,
        spawnPos: { x: botPlayer.x, z: botPlayer.z },
      };
      this.botAgents.set(botId, new BotAgent(config));
    };

    for (let i = 0; i < tNeeded; i++) spawnBotForTeam("T");
    for (let i = 0; i < ctNeeded; i++) spawnBotForTeam("CT");

    if (tNeeded > 0 || ctNeeded > 0) {
      this.broadcast("playerCount", { count: this.state.players.size });
    }
  }

  private updateBots(dt: number) {
    if (this.state.phase !== "active") return;
    this.botAgents.forEach((agent, botId) => {
      const botPlayer = this.state.players.get(botId);
      if (!botPlayer || botPlayer.isDead) return;
      agent.think(this.state.players, botPlayer, this.state, dt);

      // Apply bot movement
      botPlayer.x = agent.pos.x;
      botPlayer.z = agent.pos.z;
      botPlayer.rotationY = agent.rotationY;
    });
  }
}
