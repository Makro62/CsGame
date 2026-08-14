import { Room, Client } from "colyseus"
import { GameState, PlayerState, WEAPONS, SPAWN } from "@cs-game/shared"

export type TrainingMode =
  | "static_aim"
  | "moving_aim"
  | "reaction"
  | "recoil"
  | "movement"
  | "grenade"
  | "1v1_bot"

interface BotConfig {
  difficulty: number
  behavior: string
  team: string
  spawnPos: { x: number; z: number }
}

type BotState = "idle" | "patrol" | "engage" | "chase" | "retreat" | "reload"

const DIFFICULTY = {
  1: { speed: 2, accuracy: 0.3, reactionMs: 800, hsRate: 0.05, viewDist: 15 },
  2: { speed: 3, accuracy: 0.5, reactionMs: 500, hsRate: 0.15, viewDist: 20 },
  3: { speed: 4, accuracy: 0.7, reactionMs: 300, hsRate: 0.30, viewDist: 25 },
  4: { speed: 4.75, accuracy: 0.85, reactionMs: 150, hsRate: 0.50, viewDist: 30 },
  5: { speed: 5, accuracy: 0.95, reactionMs: 80, hsRate: 0.70, viewDist: 35 },
}

class BotAgent {
  config: BotConfig
  state: BotState = "idle"
  targetId: string | null = null
  lastSeenPos: { x: number; z: number } | null = null
  lastSeenTime = 0
  nextActionTime = 0
  path: { x: number; z: number }[] = []
  pathIndex = 0
  strafeDir = 1
  lastShootTime = 0
  ammoInMag = 30
  isReloading = false
  reloadEndTime = 0
  pos: { x: number; z: number }
  rotationY = 0

  constructor(config: BotConfig) {
    this.config = config
    this.pos = { ...config.spawnPos }
  }

  think(
    targets: Map<string, PlayerState>,
    botPlayer: PlayerState,
    dt: number
  ) {
    const now = Date.now()
    const config = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[2]

    // Find nearest human target
    let nearest: { id: string; player: PlayerState; dist: number } | null = null
    const entries = Array.from(targets.entries())
    for (const [id, player] of entries) {
      if ((player as any).isDead || (player as any).isBot) continue
      if (player.team === botPlayer.team) continue
      const dx = player.x - this.pos.x
      const dz = player.z - this.pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < config.viewDist && (!nearest || dist < nearest.dist)) {
        nearest = { id, player, dist }
      }
    }

    if (nearest) {
      this.targetId = nearest.id
      this.lastSeenPos = { x: nearest.player.x, z: nearest.player.z }
      this.lastSeenTime = now

      if (this.state !== "engage" && this.state !== "reload") {
        this.state = "engage"
      }
    } else if (now - this.lastSeenTime > 3000) {
      if (this.state === "engage" || this.state === "chase") {
        this.state = "patrol"
      }
    }

    // Execute state
    switch (this.state) {
      case "idle":
        if (now > this.nextActionTime) {
          this.generatePatrolPath()
          this.state = "patrol"
        }
        break

      case "patrol":
        this.doPatrol(dt)
        break

      case "engage":
        if (nearest) this.doEngage(nearest, config, now, dt)
        break

      case "chase":
        this.doChase(dt)
        break

      case "retreat":
        this.doRetreat(dt)
        break

      case "reload":
        if (now >= this.reloadEndTime) {
          this.ammoInMag = 30
          this.isReloading = false
          this.state = this.targetId ? "engage" : "patrol"
        }
        break
    }

    // Sync to PlayerState
    botPlayer.x = this.pos.x
    botPlayer.z = this.pos.z
    botPlayer.rotationY = this.rotationY
  }

  private doPatrol(dt: number) {
    if (this.path.length === 0) {
      this.state = "idle"
      this.nextActionTime = Date.now() + 2000 + Math.random() * 3000
      return
    }

    const target = this.path[this.pathIndex]
    const dx = target.x - this.pos.x
    const dz = target.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 1) {
      this.pathIndex++
      if (this.pathIndex >= this.path.length) {
        this.pathIndex = 0
        this.nextActionTime = Date.now() + 2000 + Math.random() * 3000
        this.state = "idle"
      }
      return
    }

    const config = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[2]
    const speed = config.speed
    this.pos.x += (dx / dist) * speed * dt
    this.pos.z += (dz / dist) * speed * dt
    this.rotationY = Math.atan2(dx, dz)
  }

  private doEngage(
    target: { id: string; player: PlayerState; dist: number },
    config: (typeof DIFFICULTY)[1],
    now: number,
    dt: number
  ) {
    const dx = target.player.x - this.pos.x
    const dz = target.player.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Aim with error based on accuracy
    const aimError = (1 - config.accuracy) * (Math.random() - 0.5) * 0.5
    this.rotationY = Math.atan2(dx, dz) + aimError

    // Movement behavior
    if (dist < 3) {
      // Too close, back away
      this.pos.x -= (dx / dist) * config.speed * 0.8 * dt
      this.pos.z -= (dz / dist) * config.speed * 0.8 * dt
    } else if (dist > 15) {
      // Close distance
      this.pos.x += (dx / dist) * config.speed * 0.6 * dt
      this.pos.z += (dz / dist) * config.speed * 0.6 * dt
    } else {
      // Strafe
      if (Math.random() < dt * 0.8) this.strafeDir *= -1
      const perpX = -dz / dist
      const perpZ = dx / dist
      this.pos.x += perpX * this.strafeDir * config.speed * 0.4 * dt
      this.pos.z += perpZ * this.strafeDir * config.speed * 0.4 * dt
    }

    // Clamp to arena
    this.pos.x = Math.max(-18, Math.min(18, this.pos.x))
    this.pos.z = Math.max(-33, Math.min(-5, this.pos.z))

    // Shoot
    const fireInterval = 300
    if (now - this.lastShootTime > fireInterval && this.ammoInMag > 0 && !this.isReloading) {
      if (Math.random() < config.accuracy) {
        const isHS = Math.random() < config.hsRate
        const weaponKey = "ak47" as keyof typeof WEAPONS
        const weapon = WEAPONS[weaponKey]
        const baseDmg = isHS ? weapon.headshot : weapon.dmg
        target.player.hp -= baseDmg
        if (target.player.hp <= 0) {
          target.player.hp = 0
          target.player.isDead = true
        }
      }
      this.ammoInMag--
      this.lastShootTime = now
    }

    // Low ammo → reload
    if (this.ammoInMag <= 5 && !this.isReloading) {
      this.state = "reload"
      this.isReloading = true
      this.reloadEndTime = now + 2400
    }
  }

  private doChase(dt: number) {
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

    const config = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[2]
    this.pos.x += (dx / dist) * config.speed * dt
    this.pos.z += (dz / dist) * config.speed * dt
    this.rotationY = Math.atan2(dx, dz)
  }

  private doRetreat(dt: number) {
    if (!this.lastSeenPos) return

    const dx = this.pos.x - this.lastSeenPos.x
    const dz = this.pos.z - this.lastSeenPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > 15) {
      this.state = "patrol"
      return
    }

    const config = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[2]
    this.pos.x += (dx / dist) * config.speed * dt
    this.pos.z += (dz / dist) * config.speed * dt
  }

  private generatePatrolPath() {
    const numPoints = 3 + Math.floor(Math.random() * 3)
    this.path = []
    for (let i = 0; i < numPoints; i++) {
      this.path.push({
        x: (Math.random() - 0.5) * 30,
        z: -10 - Math.random() * 20,
      })
    }
    this.pathIndex = 0
  }
}

export class TrainingRoom extends Room<GameState> {
  private tickInterval: ReturnType<typeof setInterval> | null = null
  private botAgents: Map<string, BotAgent> = new Map()
  private trainingMode: TrainingMode = "1v1_bot"
  private difficulty = 2
  private maxBots = 5
  private lastTick = Date.now()

  onCreate(options: { mode?: TrainingMode; difficulty?: number; nickname?: string }) {
    this.setState(new GameState())
    this.maxClients = 1
    this.trainingMode = options.mode || "1v1_bot"
    this.difficulty = options.difficulty || 2

    this.onMessage("input", (client, input: any) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.isDead) return
      this.processMovement(player, input)
    })

    this.onMessage("shoot", (client, data: any) => {
      const shooter = this.state.players.get(client.sessionId)
      if (!shooter || shooter.isDead) return
      // Training mode: no friendly fire check needed
    })

    // Start tick loop
    this.tickInterval = setInterval(() => {
      const now = Date.now()
      const dt = (now - this.lastTick) / 1000
      this.lastTick = now
      this.gameTick(dt)
    }, 1000 / 30)
  }

  onDispose() {
    if (this.tickInterval) clearInterval(this.tickInterval)
  }

  onJoin(client: Client, options: { nickname?: string }) {
    const spawn = SPAWN.T
    const player = new PlayerState()
    player.x = spawn.x
    player.y = 0
    player.z = spawn.z
    player.nickname = options.nickname || "Trainee"
    player.hp = 100
    player.team = "T"
    player.currentWeapon = "ak47"
    this.state.players.set(client.sessionId, player)

    // Spawn bots for training
    this.spawnTrainingBots()
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
    this.botAgents.clear()
    // Remove bot players
    const toDelete: string[] = []
    const playerEntries = Array.from(this.state.players.entries())
    for (const [id, p] of playerEntries) {
      if ((p as any).isBot) toDelete.push(id)
    }
    toDelete.forEach((id) => this.state.players.delete(id))
  }

  private spawnTrainingBots() {
    const count = Math.min(this.maxBots, 5)
    for (let i = 0; i < count; i++) {
      const botId = `bot_${Date.now()}_${i}`
      const spawn = SPAWN.CT
      const botPlayer = new PlayerState()
      botPlayer.x = spawn.x + (Math.random() - 0.5) * 10
      botPlayer.y = 0
      botPlayer.z = spawn.z + (Math.random() - 0.5) * 10
      botPlayer.team = "CT"
      botPlayer.nickname = `Bot ${i + 1} [${this.getDifficultyLabel()}]`
      botPlayer.hp = 100
      botPlayer.isBot = 1
      botPlayer.botDifficulty = this.difficulty
      botPlayer.currentWeapon = "ak47"
      this.state.players.set(botId, botPlayer)

      const bot = new BotAgent({
        difficulty: this.difficulty,
        behavior: "peeker",
        team: "CT",
        spawnPos: { x: botPlayer.x, z: botPlayer.z },
      })
      this.botAgents.set(botId, bot)
    }
  }

  private gameTick(dt: number) {
    // Update bots
    this.botAgents.forEach((bot, botId) => {
      const botPlayer = this.state.players.get(botId)
      if (!botPlayer || botPlayer.isDead) return
      bot.think(this.state.players, botPlayer, dt)
    })
  }

  private processMovement(player: PlayerState, input: any) {
    const speed = input.sprint ? 11.5 : 8.5
    const sin = Math.sin(input.rotationY)
    const cos = Math.cos(input.rotationY)

    let moveX = 0
    let moveZ = 0

    if (input.forward) { moveX -= sin; moveZ -= cos }
    if (input.backward) { moveX += sin; moveZ += cos }
    if (input.left) { moveX -= cos; moveZ += sin }
    if (input.right) { moveX += cos; moveZ -= sin }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (len > 0) {
      moveX = (moveX / len) * speed * (1 / 30)
      moveZ = (moveZ / len) * speed * (1 / 30)
    }

    player.x += moveX
    player.z += moveZ
    player.rotationY = input.rotationY

    // Clamp
    player.x = Math.max(-29, Math.min(29, player.x))
    player.z = Math.max(-19, Math.min(19, player.z))

    // Send snapshot
    const client = Array.from(this.clients).find((c) => c.sessionId !== undefined)
    if (client) {
      client.send("snapshot", {
        x: player.x,
        y: player.y,
        z: player.z,
        rotationY: player.rotationY,
        lastProcessedSeq: input.seq,
      })
    }
  }

  private getDifficultyLabel(): string {
    const labels = ["", "Easy", "Medium", "Hard", "Expert", "Legend"]
    return labels[this.difficulty] || "Medium"
  }
}
