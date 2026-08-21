import {
  PlayerState,
  GameState,
  WEAPONS,
  GEAR,
  SPAWN,
  BOMB_SITES,
  MAP_BOUNDARY,
  isPrimaryWeapon,
  isSecondaryWeapon,
} from "@cs-game/shared"

export interface BotConfig {
  difficulty: number
  behavior: BotBehavior
  team: "T" | "CT"
  spawnPos: { x: number; z: number }
}

export type BotBehavior = "entry" | "support" | "awper" | "lurker" | "igl"

type BotPhase = "buy" | "idle" | "patrol" | "engage" | "chase" | "retreat" | "reload" | "bomb_plant" | "bomb_defuse" | "fall_back"

const DIFFICULTY = {
  1: { speed: 3, accuracy: 0.3, reactionMs: 800, hsRate: 0.05, viewDist: 18, fov: Math.PI * 0.6, grenadeChance: 0.05, buySkill: 0.3 },
  2: { speed: 3.5, accuracy: 0.5, reactionMs: 500, hsRate: 0.15, viewDist: 22, fov: Math.PI * 0.7, grenadeChance: 0.15, buySkill: 0.5 },
  3: { speed: 4, accuracy: 0.7, reactionMs: 300, hsRate: 0.30, viewDist: 25, fov: Math.PI * 0.75, grenadeChance: 0.3, buySkill: 0.7 },
  4: { speed: 4.75, accuracy: 0.85, reactionMs: 150, hsRate: 0.50, viewDist: 30, fov: Math.PI * 0.8, grenadeChance: 0.5, buySkill: 0.85 },
  5: { speed: 5, accuracy: 0.95, reactionMs: 80, hsRate: 0.70, viewDist: 35, fov: Math.PI * 0.85, grenadeChance: 0.7, buySkill: 0.95 },
}

// Callback types so GameRoom can hook into bot actions
export interface BotCallbacks {
  onDamage: (botId: string, targetId: string, damage: number, weapon: string, headshot: boolean) => void
  onKill: (botId: string, targetId: string, weapon: string, headshot: boolean) => void
  onBuy: (botId: string, item: string) => void
  onGrenadeThrow: (botId: string, type: "he" | "smoke" | "flash", targetX: number, targetZ: number) => void
  onBombPlant: (botId: string, site: string) => void
  onBombDefuse: (botId: string) => void
}

export class BotAgent {
  private config: BotConfig
  private state: BotPhase = "buy"
  private targetId: string | null = null
  private lastSeenPos: { x: number; z: number } | null = null
  private lastSeenTime = 0
  private nextActionTime = 0
  private strafeDir = 1
  private lastShootTime = 0
  private ammoInMag: number
  private reserveAmmo: number
  private isReloading = false
  private reloadEndTime = 0
  private fov: number
  private viewDistance: number
  private hasShotThisBurst = false
  private burstEndTime = 0
  private lastGrenadeTime = 0
  private targetBombSite: string | null = null
  private callbacks: BotCallbacks | null = null
  private waypoints: { x: number; z: number }[] = []
  private waypointIndex = 0

  pos: { x: number; z: number }
  rotationY = 0

  constructor(config: BotConfig) {
    this.config = config
    this.pos = { ...config.spawnPos }

    const diff = DIFFICULTY[config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[3]
    this.fov = diff.fov
    this.viewDistance = diff.viewDist
    this.ammoInMag = 0
    this.reserveAmmo = 0
  }

  setCallbacks(callbacks: BotCallbacks) {
    this.callbacks = callbacks
  }

  // ─── Buy Phase Logic (CS-style economy) ──────────────────────
  buyPhase(botPlayer: PlayerState): string[] {
    const diff = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[3]
    const purchases: string[] = []
    let money = botPlayer.money

    // Determine buy strategy based on money
    const fullBuy = money >= 4500
    const forceBuy = money >= 2000 && money < 4500
    const ecoRound = money < 2000

    // Always buy armor if we don't have it and can afford it
    if (botPlayer.armor < 100 && money >= GEAR.kevlar.price) {
      if (botPlayer.hasHelmet || money < GEAR.helmet.price) {
        if (this.tryBuy(botPlayer, "kevlar")) { money -= GEAR.kevlar.price; purchases.push("kevlar") }
      } else if (money >= GEAR.helmet.price) {
        if (this.tryBuy(botPlayer, "helmet")) { money -= GEAR.helmet.price; purchases.push("helmet") }
      }
    }

    // Buy primary weapon based on strategy
    if (!botPlayer.primaryWeapon || botPlayer.primaryWeapon === "") {
      if (fullBuy) {
        const weapon = this.choosePrimaryWeapon(botPlayer, money)
        if (weapon && this.tryBuy(botPlayer, weapon)) {
          money -= WEAPONS[weapon as keyof typeof WEAPONS].price
          purchases.push(weapon)
        }
      } else if (forceBuy) {
        // Force buy: SMG or cheapest rifle
        const weapon = botPlayer.team === "T" ? "mp5" : "mp5"
        if (this.tryBuy(botPlayer, weapon)) {
          money -= WEAPONS[weapon as keyof typeof WEAPONS].price
          purchases.push(weapon)
        }
      }
      // Eco round: keep pistol, don't buy primary
    } else if (fullBuy && botPlayer.primaryWeapon === "mp5") {
      // Upgrade SMG to rifle if we can afford it
      const weapon = this.choosePrimaryWeapon(botPlayer, money)
      if (weapon && weapon !== "mp5" && this.tryBuy(botPlayer, weapon)) {
        money -= WEAPONS[weapon as keyof typeof WEAPONS].price
        purchases.push(weapon)
      }
    }

    // CT: buy defuse kit on full buy
    if (botPlayer.team === "CT" && fullBuy && !botPlayer.hasDefuseKit) {
      if (this.tryBuy(botPlayer, "defuseKit")) {
        money -= GEAR.defuseKit.price
        purchases.push("defuseKit")
      }
    }

    // Buy grenades with remaining money
    if (money >= GEAR.grenadeHE.price && botPlayer.grenadeHE < 1) {
      if (Math.random() < diff.grenadeChance + (fullBuy ? 0.3 : 0)) {
        if (this.tryBuy(botPlayer, "grenadeHE")) {
          money -= GEAR.grenadeHE.price
          purchases.push("grenadeHE")
        }
      }
    }
    if (money >= GEAR.grenadeSmoke.price && botPlayer.grenadeSmoke < 1) {
      if (Math.random() < diff.grenadeChance + (fullBuy ? 0.2 : 0.1)) {
        if (this.tryBuy(botPlayer, "grenadeSmoke")) {
          money -= GEAR.grenadeSmoke.price
          purchases.push("grenadeSmoke")
        }
      }
    }
    if (money >= GEAR.grenadeFlash.price && botPlayer.grenadeFlash < 2) {
      if (Math.random() < diff.grenadeChance + (fullBuy ? 0.3 : 0.1)) {
        if (this.tryBuy(botPlayer, "grenadeFlash")) {
          money -= GEAR.grenadeFlash.price
          purchases.push("grenadeFlash")
        }
      }
    }

    return purchases
  }

  private choosePrimaryWeapon(botPlayer: PlayerState, money: number): string | null {
    const team = botPlayer.team

    // Role-based weapon choice
    if (this.config.behavior === "awper" && money >= WEAPONS.awp.price) {
      return "awp"
    }

    // Team-specific rifles
    if (team === "T" && money >= WEAPONS.ak47.price) {
      return Math.random() < 0.8 ? "ak47" : "mp5"
    }
    if (team === "CT" && money >= WEAPONS.m4a1.price) {
      return Math.random() < 0.8 ? "m4a1" : "mp5"
    }

    // Can't afford team rifle, try SMG
    if (money >= WEAPONS.mp5.price) {
      return "mp5"
    }

    return null
  }

  private tryBuy(botPlayer: PlayerState, item: string): boolean {
    const weaponStats = WEAPONS[item as keyof typeof WEAPONS]
    if (weaponStats) {
      if (weaponStats.team !== "both" && weaponStats.team !== botPlayer.team) return false
      if (weaponStats.price > botPlayer.money) return false
      // Already own this primary?
      if (isPrimaryWeapon(item) && botPlayer.primaryWeapon === item) return false
      if (isSecondaryWeapon(item) && botPlayer.secondaryWeapon === item) return false
      return true
    }

    const gearItem = GEAR[item as keyof typeof GEAR]
    if (!gearItem) return false
    const gear = gearItem as { price: number; team?: string }
    if (gear.team && gear.team !== botPlayer.team) return false
    if (gear.price > botPlayer.money) return false

    return true
  }

  // ─── Main Think Loop ────────────────────────────────────────
  think(
    allPlayers: Map<string, PlayerState>,
    botPlayer: PlayerState,
    gameState: GameState,
    dt: number,
    botId: string
  ) {
    const now = Date.now()
    const diff = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[3]

    // Sync ammo from PlayerState (bought weapons update this)
    this.syncAmmoFromPlayer(botPlayer)

    // State machine
    switch (this.state) {
      case "buy":
        this.onBuyState(botPlayer, gameState, now)
        break
      case "idle":
        this.onIdle(now, gameState)
        break
      case "patrol":
        this.onPatrol(dt, diff, gameState)
        break
      case "engage":
        this.onEngage(allPlayers, botPlayer, diff, now, dt, botId, gameState)
        break
      case "chase":
        this.onChase(dt, diff, gameState)
        break
      case "retreat":
        this.onRetreat(dt, diff, gameState)
        break
      case "reload":
        this.onReload(now, botPlayer)
        break
      case "bomb_plant":
        this.onBombPlant(botPlayer, dt, now, botId, gameState)
        break
      case "bomb_defuse":
        this.onBombDefuse(botPlayer, dt, now, botId, gameState)
        break
      case "fall_back":
        this.onFallBack(dt, diff, gameState)
        break
    }

    // Perception: find nearest enemy (always, to react)
    const nearest = this.findNearestEnemy(allPlayers, botPlayer, gameState, diff)

    if (nearest) {
      this.targetId = nearest.id
      this.lastSeenPos = { x: nearest.player.x, z: nearest.player.z }
      this.lastSeenTime = now

      if (this.state !== "engage" && this.state !== "reload" && this.state !== "bomb_plant" && this.state !== "bomb_defuse") {
        this.state = "engage"
      }
    } else if (this.state === "engage" || this.state === "chase") {
      if (now - this.lastSeenTime > 2000) {
        this.state = "patrol"
        this.assignWaypointsForRole(gameState, botPlayer)
      } else {
        this.state = "chase"
      }
    }

    // Check if should use grenades
    if (nearest && this.state === "engage" && nearest.dist > 5 && nearest.dist < 20) {
      this.tryUseGrenade(nearest, botPlayer, diff, now, botId)
    }

    // Sync to PlayerState
    botPlayer.x = this.pos.x
    botPlayer.z = this.pos.z
    botPlayer.rotationY = this.rotationY
    botPlayer.isReloading = this.isReloading
    botPlayer.ammo = this.ammoInMag
    botPlayer.reserveAmmo = this.reserveAmmo
  }

  private syncAmmoFromPlayer(botPlayer: PlayerState) {
    if (botPlayer.ammo > 0 || botPlayer.reserveAmmo > 0) {
      this.ammoInMag = botPlayer.ammo
      this.reserveAmmo = botPlayer.reserveAmmo
    }
  }

  // ─── Buy Phase State ─────────────────────────────────────────
  private onBuyState(botPlayer: PlayerState, gameState: GameState, now: number) {
    if (gameState.phase !== "buy") {
      this.state = "patrol"
      this.assignWaypointsForRole(gameState, botPlayer)
      return
    }
    // Bots buy instantly at round start
    this.buyPhase(botPlayer)
    this.state = "idle"
    this.nextActionTime = now + 1000
  }

  // ─── Idle State ──────────────────────────────────────────────
  private onIdle(now: number, gameState: GameState) {
    if (now > this.nextActionTime) {
      if (gameState.phase === "active" && gameState.gameMode === "bomb_defusal") {
        this.assignWaypointsForRole(gameState)
      }
      this.state = "patrol"
    }
  }

  // ─── Patrol with Waypoints ───────────────────────────────────
  private onPatrol(dt: number, diff: (typeof DIFFICULTY)[1], gameState: GameState) {
    if (this.waypoints.length === 0) {
      this.assignWaypointsForRole(gameState)
      if (this.waypoints.length === 0) {
        this.state = "idle"
        this.nextActionTime = Date.now() + 2000 + Math.random() * 3000
        return
      }
    }

    const target = this.waypoints[this.waypointIndex]
    const dx = target.x - this.pos.x
    const dz = target.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 1.5) {
      this.waypointIndex++
      if (this.waypointIndex >= this.waypoints.length) {
        this.waypointIndex = 0
        this.waypoints = []
        this.state = "idle"
        this.nextActionTime = Date.now() + 1500 + Math.random() * 2500
      }
      return
    }

    this.pos.x += (dx / dist) * diff.speed * dt
    this.pos.z += (dz / dist) * diff.speed * dt
    this.rotationY = Math.atan2(dx, dz)
    this.clampPosition()
  }

  // ─── Engage (Combat) ────────────────────────────────────────
  private onEngage(
    allPlayers: Map<string, PlayerState>,
    botPlayer: PlayerState,
    diff: (typeof DIFFICULTY)[1],
    now: number,
    dt: number,
    botId: string,
    gameState: GameState
  ) {
    if (!this.targetId) { this.state = "patrol"; return }

    const target = allPlayers.get(this.targetId)
    if (!target || target.isDead) { this.targetId = null; this.state = "patrol"; return }

    const dx = target.x - this.pos.x
    const dz = target.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Aim with error based on difficulty
    const aimError = (1 - diff.accuracy) * (Math.random() - 0.5) * 0.4
    this.rotationY = Math.atan2(dx, dz) + aimError

    // Movement based on behavior
    switch (this.config.behavior) {
      case "entry":
        // Rush forward aggressively
        this.pos.x += (dx / dist) * diff.speed * 0.7 * dt
        this.pos.z += (dz / dist) * diff.speed * 0.7 * dt
        break
      case "support":
        // Strafe while fighting
        if (Math.random() < dt * 0.8) this.strafeDir *= -1
        this.applyStrafe(dx, dz, dist, diff.speed * 0.5, dt)
        break
      case "awper":
        // Keep distance, retreat if too close
        if (dist < 8) {
          this.pos.x -= (dx / dist) * diff.speed * 0.5 * dt
          this.pos.z -= (dz / dist) * diff.speed * 0.5 * dt
        } else if (dist > 25) {
          this.pos.x += (dx / dist) * diff.speed * 0.3 * dt
          this.pos.z += (dz / dist) * diff.speed * 0.3 * dt
        }
        break
      case "lurker":
        // Hold angle, minimal movement
        break
      case "igl":
        // Balanced approach
        if (Math.random() < dt * 0.6) this.strafeDir *= -1
        this.applyStrafe(dx, dz, dist, diff.speed * 0.35, dt)
        break
    }

    this.clampPosition()

    // Shooting
    const weaponKey = this.getCurrentWeaponKey(botPlayer)
    const weapon = WEAPONS[weaponKey as keyof typeof WEAPONS]
    if (!weapon) return

    const isSniper = weaponKey === "awp"
    const fireInterval = isSniper ? 1500 : (1000 / weapon.fireRate)

    // Burst fire: fire 2-5 bullets, then pause
    if (!this.hasShotThisBurst && now - this.lastShootTime > fireInterval * 3) {
      this.hasShotThisBurst = true
      this.burstEndTime = now + (isSniper ? 100 : 200 + Math.random() * 200)
    }

    if (this.hasShotThisBurst && now < this.burstEndTime && this.ammoInMag > 0 && !this.isReloading) {
      if (now - this.lastShootTime > fireInterval) {
        this.performShot(target, diff, weapon, weaponKey, now, botId, botPlayer)
      }
    } else if (now >= this.burstEndTime) {
      this.hasShotThisBurst = false
    }

    // Reload when empty or low
    if (this.ammoInMag <= 5 && !this.isReloading && this.reserveAmmo > 0) {
      this.state = "reload"
      this.isReloading = true
      this.reloadEndTime = now + weapon.reload * 1000
    }

    // Retreat if low HP (higher difficulty bots retreat less)
    if (botPlayer.hp < 30 && this.config.difficulty >= 2) {
      this.state = "retreat"
    }
  }

  private performShot(
    target: PlayerState,
    diff: (typeof DIFFICULTY)[1],
    weapon: { dmg: number; headshot: number },
    weaponKey: string,
    now: number,
    botId: string,
    botPlayer: PlayerState
  ) {
    if (Math.random() < diff.accuracy) {
      const isHS = Math.random() < diff.hsRate
      const baseDmg = isHS ? weapon.headshot : weapon.dmg

      // Use callback for proper damage pipeline
      if (this.callbacks) {
        this.callbacks.onDamage(botId, this.targetId!, baseDmg, weaponKey, isHS)
      }
    }
    this.ammoInMag--
    this.lastShootTime = now
  }

  // ─── Chase ──────────────────────────────────────────────────
  private onChase(dt: number, diff: (typeof DIFFICULTY)[1], gameState: GameState) {
    if (!this.lastSeenPos) {
      this.state = "patrol"
      return
    }

    const dx = this.lastSeenPos.x - this.pos.x
    const dz = this.lastSeenPos.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 2) {
      this.state = "engage"
      return
    }

    this.pos.x += (dx / dist) * diff.speed * dt
    this.pos.z += (dz / dist) * diff.speed * dt
    this.rotationY = Math.atan2(dx, dz)
    this.clampPosition()
  }

  // ─── Retreat ────────────────────────────────────────────────
  private onRetreat(dt: number, diff: (typeof DIFFICULTY)[1], gameState: GameState) {
    // Find direction away from last enemy and toward team spawn
    const spawn = SPAWN[this.config.team as keyof typeof SPAWN]
    const toSpawnX = spawn.x - this.pos.x
    const toSpawnZ = spawn.z - this.pos.z
    const toSpawnDist = Math.sqrt(toSpawnX * toSpawnX + toSpawnZ * toSpawnZ)

    if (toSpawnDist > 5) {
      this.pos.x += (toSpawnX / toSpawnDist) * diff.speed * dt
      this.pos.z += (toSpawnZ / toSpawnDist) * diff.speed * dt
      this.rotationY = Math.atan2(toSpawnX, toSpawnZ)
    } else {
      this.state = "patrol"
    }

    this.clampPosition()
  }

  // ─── Reload ────────────────────────────────────────────────
  private onReload(now: number, botPlayer: PlayerState) {
    if (now >= this.reloadEndTime) {
      // Reload complete: transfer from reserve to mag
      const weaponKey = this.getCurrentWeaponKey(botPlayer)
      const weapon = WEAPONS[weaponKey as keyof typeof WEAPONS]
      if (weapon) {
        const needed = weapon.mag - this.ammoInMag
        const toLoad = Math.min(needed, this.reserveAmmo)
        this.ammoInMag += toLoad
        this.reserveAmmo -= toLoad
      }
      this.isReloading = false
      this.state = this.targetId ? "engage" : "patrol"
    }
  }

  // ─── Bomb Plant (T side) ────────────────────────────────────
  private onBombPlant(botPlayer: PlayerState, dt: number, now: number, botId: string, gameState: GameState) {
    if (!this.targetBombSite || gameState.bombPlanted) {
      this.state = "patrol"
      return
    }

    const site = BOMB_SITES[this.targetBombSite as keyof typeof BOMB_SITES]
    if (!site) { this.state = "patrol"; return }

    const dx = site.x - this.pos.x
    const dz = site.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > site.radius) {
      // Move toward bomb site
      this.pos.x += (dx / dist) * DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY].speed * dt
      this.pos.z += (dz / dist) * DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY].speed * dt
      this.rotationY = Math.atan2(dx, dz)
      this.clampPosition()
    } else {
      // At bomb site: plant
      if (this.callbacks) {
        this.callbacks.onBombPlant(botId, this.targetBombSite)
      }
      this.targetBombSite = null
      this.state = "patrol"
      this.assignWaypointsForRole(gameState)
    }
  }

  // ─── Bomb Defuse (CT side) ──────────────────────────────────
  private onBombDefuse(botPlayer: PlayerState, dt: number, now: number, botId: string, gameState: GameState) {
    if (!gameState.bombPlanted || !gameState.bombSite) {
      this.state = "patrol"
      return
    }

    const site = BOMB_SITES[gameState.bombSite as keyof typeof BOMB_SITES]
    if (!site) { this.state = "patrol"; return }

    const dx = site.x - this.pos.x
    const dz = site.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > site.radius) {
      const diff = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY]
      this.pos.x += (dx / dist) * diff.speed * dt
      this.pos.z += (dz / dist) * diff.speed * dt
      this.rotationY = Math.atan2(dx, dz)
      this.clampPosition()
    } else {
      if (this.callbacks) {
        this.callbacks.onBombDefuse(botId)
      }
      this.state = "patrol"
    }
  }

  // ─── Fall Back (after plant or low HP) ──────────────────────
  private onFallBack(dt: number, diff: (typeof DIFFICULTY)[1], gameState: GameState) {
    const spawn = SPAWN[this.config.team as keyof typeof SPAWN]
    const dx = spawn.x - this.pos.x
    const dz = spawn.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > 10) {
      this.pos.x += (dx / dist) * diff.speed * dt
      this.pos.z += (dz / dist) * diff.speed * dt
      this.rotationY = Math.atan2(dx, dz)
      this.clampPosition()
    } else {
      this.state = "patrol"
      this.assignWaypointsForRole(gameState)
    }
  }

  // ─── Enemy Perception ──────────────────────────────────────
  private findNearestEnemy(
    allPlayers: Map<string, PlayerState>,
    botPlayer: PlayerState,
    gameState: GameState,
    diff: (typeof DIFFICULTY)[1]
  ): { id: string; player: PlayerState; dist: number } | null {
    let nearest: { id: string; player: PlayerState; dist: number } | null = null

    allPlayers.forEach((player, id) => {
      if (player.isDead) return
      if (id === "") return // skip self placeholder
      if (player.team === this.config.team && gameState.gameMode !== "ffa") return

      const dx = player.x - this.pos.x
      const dz = player.z - this.pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist > this.viewDistance) return

      // FOV check
      const angleToTarget = Math.atan2(dx, dz)
      let angleDiff = angleToTarget - this.rotationY
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
      if (Math.abs(angleDiff) > this.fov / 2) return

      if (!nearest || dist < nearest.dist) {
        nearest = { id, player, dist }
      }
    })

    return nearest
  }

  // ─── Grenade Usage ──────────────────────────────────────────
  private tryUseGrenade(
    target: { id: string; player: PlayerState; dist: number },
    botPlayer: PlayerState,
    diff: (typeof DIFFICULTY)[1],
    now: number,
    botId: string
  ) {
    if (now - this.lastGrenadeTime < 8000) return // 8s cooldown
    if (Math.random() > diff.grenadeChance) return

    // HE grenade at medium range
    if (target.dist > 8 && target.dist < 20 && botPlayer.grenadeHE > 0) {
      if (this.callbacks) {
        this.callbacks.onGrenadeThrow(botId, "he", target.player.x, target.player.z)
      }
      this.lastGrenadeTime = now
      return
    }

    // Flash before peeking
    if (target.dist > 5 && target.dist < 15 && botPlayer.grenadeFlash > 0 && Math.random() < 0.3) {
      const flashX = this.pos.x + (target.player.x - this.pos.x) * 0.5
      const flashZ = this.pos.z + (target.player.z - this.pos.z) * 0.5
      if (this.callbacks) {
        this.callbacks.onGrenadeThrow(botId, "flash", flashX, flashZ)
      }
      this.lastGrenadeTime = now
    }
  }

  // ─── Waypoint Assignment (role-based) ──────────────────────
  private assignWaypointsForRole(gameState: GameState, botPlayer?: PlayerState) {
    const role = this.config.behavior
    const team = this.config.team

    this.waypoints = []
    this.waypointIndex = 0

    // If bomb is planted and CT, go defuse
    if (gameState.bombPlanted && team === "CT" && gameState.bombSite) {
      const site = BOMB_SITES[gameState.bombSite as keyof typeof BOMB_SITES]
      if (site) {
        this.waypoints = [{ x: site.x, z: site.z }]
        this.state = "bomb_defuse"
        return
      }
    }

    // T side: if has bomb and no one planted, go plant
    if (team === "T" && botPlayer?.hasBomb && !gameState.bombPlanted) {
      // Pick a random bomb site
      const site = Math.random() < 0.5 ? BOMB_SITES.A : BOMB_SITES.B
      this.targetBombSite = Math.random() < 0.5 ? "A" : "B"
      this.waypoints = [{ x: site.x, z: site.z }]
      this.state = "bomb_plant"
      return
    }

    // Role-based waypoints
    switch (role) {
      case "entry":
        // Push toward middle or enemy side
        if (team === "T") {
          this.waypoints = [
            { x: -15, z: 0 },
            { x: -5, z: -15 },  // A main
            { x: 5, z: -13 },
          ]
        } else {
          this.waypoints = [
            { x: 15, z: 0 },
            { x: 5, z: 0 },
            { x: -5, z: 0 },
          ]
        }
        break
      case "support":
        // Follow behind entry, cover angles
        if (team === "T") {
          this.waypoints = [
            { x: -12, z: 5 },
            { x: 0, z: 8 },   // B approach
            { x: 7, z: 15 },
          ]
        } else {
          this.waypoints = [
            { x: 18, z: -8 },
            { x: 15, z: -15 }, // A site
          ]
        }
        break
      case "awper":
        // Hold long angles
        if (team === "T") {
          this.waypoints = [{ x: -14, z: 0 }]  // T-mid barrels
        } else {
          this.waypoints = [{ x: 15, z: 0 }]   // CT sniper nest
        }
        break
      case "lurker":
        // Flank through tunnels
        if (team === "T") {
          this.waypoints = [
            { x: -15, z: 12 },
            { x: -8, z: 15 },
            { x: -2, z: 15 },
          ]
        } else {
          this.waypoints = [
            { x: 15, z: 8 },
            { x: 7, z: 15 },
          ]
        }
        break
      case "igl":
        // Default to mid control
        if (team === "T") {
          this.waypoints = [
            { x: -14, z: 0 },
            { x: 0, z: 0 },
          ]
        } else {
          this.waypoints = [
            { x: 18, z: 0 },
            { x: 12, z: 0 },
          ]
        }
        break
    }
  }

  // ─── Utility ────────────────────────────────────────────────
  private getCurrentWeaponKey(botPlayer: PlayerState): string {
    return botPlayer.currentWeapon || "knife"
  }

  private applyStrafe(dx: number, dz: number, dist: number, speed: number, dt: number) {
    const perpX = -dz / dist
    const perpZ = dx / dist
    this.pos.x += perpX * this.strafeDir * speed * dt
    this.pos.z += perpZ * this.strafeDir * speed * dt
  }

  private clampPosition() {
    this.pos.x = Math.max(MAP_BOUNDARY.minX + 1, Math.min(MAP_BOUNDARY.maxX - 1, this.pos.x))
    this.pos.z = Math.max(MAP_BOUNDARY.minZ + 1, Math.min(MAP_BOUNDARY.maxZ - 1, this.pos.z))
  }

  // ─── Public Getters ─────────────────────────────────────────
  getTargetId(): string | null {
    return this.targetId
  }

  getState(): BotPhase {
    return this.state
  }

  setState(s: BotPhase) {
    this.state = s
  }
}
