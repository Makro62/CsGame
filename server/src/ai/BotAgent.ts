import { PlayerState, GameState, WEAPONS, SPAWN } from "@cs-game/shared"

export interface BotConfig {
  difficulty: number
  behavior: BotBehavior
  team: "T" | "CT"
  spawnPos: { x: number; z: number }
}

export type BotBehavior = "peeker" | "rusher" | "camper" | "support" | "awper"
type BotState = "idle" | "patrol" | "engage" | "chase" | "retreat" | "reload"

const DIFFICULTY = {
  1: { speed: 2, accuracy: 0.3, reactionMs: 800, hsRate: 0.05, viewDist: 15, fov: Math.PI * 0.6 },
  2: { speed: 3, accuracy: 0.5, reactionMs: 500, hsRate: 0.15, viewDist: 20, fov: Math.PI * 0.7 },
  3: { speed: 4, accuracy: 0.7, reactionMs: 300, hsRate: 0.30, viewDist: 25, fov: Math.PI * 0.75 },
  4: { speed: 4.75, accuracy: 0.85, reactionMs: 150, hsRate: 0.50, viewDist: 30, fov: Math.PI * 0.8 },
  5: { speed: 5, accuracy: 0.95, reactionMs: 80, hsRate: 0.70, viewDist: 35, fov: Math.PI * 0.85 },
}

export class BotAgent {
  private config: BotConfig
  private state: BotState = "idle"
  private targetId: string | null = null
  private lastSeenPos: { x: number; z: number } | null = null
  private lastSeenTime = 0
  private nextActionTime = 0
  private path: { x: number; z: number }[] = []
  private pathIndex = 0
  private strafeDir = 1
  private lastShootTime = 0
  private ammoInMag: number
  private isReloading = false
  private reloadEndTime = 0
  private fov: number
  private viewDistance: number

  pos: { x: number; z: number }
  rotationY = 0

  constructor(config: BotConfig) {
    this.config = config
    this.pos = { ...config.spawnPos }
    this.fov = DIFFICULTY[config.difficulty as keyof typeof DIFFICULTY]?.fov || Math.PI * 0.7
    this.viewDistance = DIFFICULTY[config.difficulty as keyof typeof DIFFICULTY]?.viewDist || 20
    const weaponKey = "ak47" as keyof typeof WEAPONS
    this.ammoInMag = WEAPONS[weaponKey]?.mag || 30
  }

  think(
    allPlayers: Map<string, PlayerState>,
    botPlayer: PlayerState,
    gameState: GameState,
    dt: number
  ) {
    const now = Date.now()
    const diff = DIFFICULTY[this.config.difficulty as keyof typeof DIFFICULTY] || DIFFICULTY[2]

    // Perception: find nearest enemy
    let nearest: { id: string; player: PlayerState; dist: number } | null = null
    const entries = Array.from(allPlayers.entries())
    for (const [id, player] of entries) {
      if (player.isDead) continue
      if (player.isBot) continue
      if (this.config.team === player.team && gameState.gameMode !== "ffa") continue

      const dx = player.x - this.pos.x
      const dz = player.z - this.pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist > this.viewDistance) continue

      // FOV check
      const angleToTarget = Math.atan2(dx, dz)
      let angleDiff = angleToTarget - this.rotationY
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
      if (Math.abs(angleDiff) > this.fov / 2) continue

      if (!nearest || dist < nearest.dist) {
        nearest = { id, player, dist }
      }
    }

    // State transitions
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

    // Execute behavior
    switch (this.state) {
      case "idle":
        this.onIdle(now)
        break
      case "patrol":
        this.onPatrol(dt, diff)
        break
      case "engage":
        if (nearest) this.onEngage(nearest, diff, now, dt)
        break
      case "chase":
        this.onChase(dt, diff)
        break
      case "retreat":
        this.onRetreat(dt, diff)
        break
      case "reload":
        this.onReload(now)
        break
    }

    // Sync to PlayerState
    botPlayer.x = this.pos.x
    botPlayer.z = this.pos.z
    botPlayer.rotationY = this.rotationY
    botPlayer.isReloading = this.isReloading
    botPlayer.ammo = this.ammoInMag
  }

  private onIdle(now: number) {
    if (now > this.nextActionTime) {
      this.generatePatrolPath()
      this.state = "patrol"
    }
  }

  private onPatrol(dt: number, diff: (typeof DIFFICULTY)[1]) {
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

    this.pos.x += (dx / dist) * diff.speed * dt
    this.pos.z += (dz / dist) * diff.speed * dt
    this.rotationY = Math.atan2(dx, dz)
  }

  private onEngage(
    target: { id: string; player: PlayerState; dist: number },
    diff: (typeof DIFFICULTY)[1],
    now: number,
    dt: number
  ) {
    const dx = target.player.x - this.pos.x
    const dz = target.player.z - this.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    // Aim with error
    const aimError = (1 - diff.accuracy) * (Math.random() - 0.5) * 0.5
    this.rotationY = Math.atan2(dx, dz) + aimError

    // Movement
    if (this.config.behavior === "rusher") {
      this.pos.x += (dx / dist) * diff.speed * dt
      this.pos.z += (dz / dist) * diff.speed * dt
    } else if (this.config.behavior === "camper") {
      // Hold position
    } else if (this.config.behavior === "awper") {
      if (dist < 5) {
        this.pos.x -= (dx / dist) * diff.speed * 0.5 * dt
        this.pos.z -= (dz / dist) * diff.speed * 0.5 * dt
      }
    } else {
      // peeker / support: strafe
      if (Math.random() < dt * 0.8) this.strafeDir *= -1
      const perpX = -dz / dist
      const perpZ = dx / dist
      this.pos.x += perpX * this.strafeDir * diff.speed * 0.4 * dt
      this.pos.z += perpZ * this.strafeDir * diff.speed * 0.4 * dt
    }

    // Clamp
    this.pos.x = Math.max(-29, Math.min(29, this.pos.x))
    this.pos.z = Math.max(-19, Math.min(19, this.pos.z))

    // Shoot
    const fireInterval = this.config.behavior === "awper" ? 1500 : 300
    if (now - this.lastShootTime > fireInterval && this.ammoInMag > 0 && !this.isReloading) {
      if (Math.random() < diff.accuracy) {
        const isHS = Math.random() < diff.hsRate
        const weaponKey = (this.config.behavior === "awper" ? "awp" : "ak47") as keyof typeof WEAPONS
        const weapon = WEAPONS[weaponKey]
        if (weapon) {
          const baseDmg = isHS ? weapon.headshot : weapon.dmg
          target.player.hp -= baseDmg
          if (target.player.hp <= 0) {
            target.player.hp = 0
            target.player.isDead = true
          }
        }
      }
      this.ammoInMag--
      this.lastShootTime = now
    }

    // Reload
    if (this.ammoInMag <= 5 && !this.isReloading) {
      this.state = "reload"
      this.isReloading = true
      const weaponKey = "ak47" as keyof typeof WEAPONS
      this.reloadEndTime = now + (WEAPONS[weaponKey]?.reload || 2.4) * 1000
    }

    // Retreat if low HP
    if (botPlayerHP(target.player) < 30 && this.config.difficulty >= 3) {
      this.state = "retreat"
    }
  }

  private onChase(dt: number, diff: (typeof DIFFICULTY)[1]) {
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
  }

  private onRetreat(dt: number, diff: (typeof DIFFICULTY)[1]) {
    if (!this.lastSeenPos) return

    const dx = this.pos.x - this.lastSeenPos.x
    const dz = this.pos.z - this.lastSeenPos.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > 15) {
      this.state = "patrol"
      return
    }

    this.pos.x += (dx / dist) * diff.speed * dt
    this.pos.z += (dz / dist) * diff.speed * dt
  }

  private onReload(now: number) {
    if (now >= this.reloadEndTime) {
      const weaponKey = "ak47" as keyof typeof WEAPONS
      this.ammoInMag = WEAPONS[weaponKey]?.mag || 30
      this.isReloading = false
      this.state = this.targetId ? "engage" : "patrol"
    }
  }

  private generatePatrolPath() {
    const numPoints = 3 + Math.floor(Math.random() * 3)
    this.path = []
    for (let i = 0; i < numPoints; i++) {
      this.path.push({
        x: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 30,
      })
    }
    this.pathIndex = 0
  }
}

function botPlayerHP(player: PlayerState): number {
  return player.hp
}
