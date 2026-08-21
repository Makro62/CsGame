import { ZombieState, ZombieType, ZOMBIE_TYPES, ZOMBIE_SPAWN, BarricadeState, WAVE_CONFIG } from '@cs-game/shared'
import { Pathfinder } from './Pathfinder'

interface PlayerState {
  x: number
  y: number
  z: number
  hp: number
  isDead: boolean
  isDowned?: boolean
}

export class ZombieController {
  private zombies: Map<string, ZombieState> = new Map()
  private pathfinder = new Pathfinder()
  private nextId = 0
  private hpScale = 1
  private speedScale = 1

  /** Difficulty multipliers chosen in the lobby, applied to every new zombie. */
  setDifficulty(hpScale: number, speedScale: number): void {
    this.hpScale = hpScale
    this.speedScale = speedScale
  }

  spawnSingle(
    type: ZombieType,
    x: number,
    z: number,
    wave: number
  ): ZombieState {
    return this.createZombie(type, x, z, wave)
  }

  private createZombie(
    type: ZombieType,
    x: number,
    z: number,
    wave: number
  ): ZombieState {
    const stats = ZOMBIE_TYPES[type]
    const hpMultiplier = 1 + (wave - 1) * WAVE_CONFIG.hpMultiplierPerWave
    const speedBonus = 1 + (wave - 1) * WAVE_CONFIG.speedBonusPerWave

    const zombie = new ZombieState()
    zombie.id = `zombie_${this.nextId++}`
    zombie.type = type
    zombie.x = x + (Math.random() - 0.5) * 10
    zombie.y = 0
    zombie.z = z + (Math.random() - 0.5) * 10
    zombie.hp = Math.max(1, Math.floor(stats.hp * hpMultiplier * this.hpScale))
    zombie.maxHp = zombie.hp
    zombie.speed = stats.speed * speedBonus * this.speedScale
    zombie.rotationY = 0
    zombie.targetId = ''
    zombie.isDead = false
    zombie.isAttacking = false
    zombie.attackCooldown = 0

    this.zombies.set(zombie.id, zombie)
    return zombie
  }

  /** Regular horde composition. Bosses come from dedicated boss-wave slots. */
  determineType(wave: number): ZombieType {
    if (wave < 3) return 'walker'

    const roll = Math.random()

    if (wave >= 7 && roll < 0.15) return 'spitter'
    if (wave >= 5 && roll < 0.30) return 'tank'
    if (wave >= 4 && roll < 0.45) return 'exploder'
    if (wave >= 3 && roll < 0.60) return 'runner'

    return 'walker'
  }

  update(
    dt: number,
    players: Map<string, PlayerState>,
    barricades?: Map<string, BarricadeState> | Map<string, any>
  ): {
    attackedBarricades: { barricadeId: string; damage: number }[]
    explodingZombies: { zombieId: string; x: number; z: number }[]
    spitterAttacks: { zombieId: string; targetId: string; x: number; z: number }[]
  } {
    const attackedBarricades: { barricadeId: string; damage: number }[] = []
    const explodingZombies: { zombieId: string; x: number; z: number }[] = []
    const spitterAttacks: { zombieId: string; targetId: string; x: number; z: number }[] = []

    this.zombies.forEach((zombie) => {
      if (zombie.isDead) return

      // First check if any nearby barricade is blocking path
      let targetBarricade: BarricadeState | null = null
      if (barricades) {
        barricades.forEach((b: BarricadeState) => {
          if (b.boards > 0) {
            const bDist = Math.sqrt((b.x - zombie.x) ** 2 + (b.z - zombie.z) ** 2)
            if (bDist < 2.2) {
              targetBarricade = b
            }
          }
        })
      }

      if (targetBarricade) {
        const tb: BarricadeState = targetBarricade
        zombie.rotationY = Math.atan2(tb.x - zombie.x, tb.z - zombie.z)

        if (zombie.type === 'exploder') {
          // Exploders prime against barricades too
          zombie.isAttacking = true
          if (zombie.attackCooldown <= 0) {
            zombie.attackCooldown = 1.5
          } else {
            zombie.attackCooldown -= dt
            if (zombie.attackCooldown <= 0) {
              explodingZombies.push({ zombieId: zombie.id, x: zombie.x, z: zombie.z })
              zombie.isDead = true
            }
          }
          return
        }

        if (zombie.attackCooldown <= 0) {
          zombie.isAttacking = true
          zombie.attackCooldown = 1.0
          const dmg = zombie.type === 'tank' ? 30 : 15
          attackedBarricades.push({ barricadeId: tb.id, damage: dmg })
        }
        if (zombie.attackCooldown > 0) {
          zombie.attackCooldown -= dt
        }
        return
      }

      const target = this.findNearestAlivePlayer(zombie, players)
      if (!target) return

      zombie.targetId = target.id

      // Calculate path with A* Pathfinder
      const path = this.pathfinder.findPath(zombie.x, zombie.z, target.x, target.z)
      const nextWaypoint = path[0] ?? { x: target.x, z: target.z }

      const dx = nextWaypoint.x - zombie.x
      const dz = nextWaypoint.z - zombie.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      const targetDx = target.x - zombie.x
      const targetDz = target.z - zombie.z
      const targetDist = Math.sqrt(targetDx * targetDx + targetDz * targetDz)

      // Spitter AI: Kiting & Ranged Acid Spit
      if (zombie.type === 'spitter') {
        zombie.rotationY = Math.atan2(targetDx, targetDz)

        if (targetDist < 5.0) {
          // Kite backwards
          zombie.isAttacking = false
          const nx = -targetDx / (targetDist || 1)
          const nz = -targetDz / (targetDist || 1)
          zombie.x += nx * zombie.speed * 0.7 * dt
          zombie.z += nz * zombie.speed * 0.7 * dt
        } else if (targetDist > 11.0) {
          // Move closer
          zombie.isAttacking = false
          if (dist > 0.2) {
            const nx = dx / (dist || 1)
            const nz = dz / (dist || 1)
            zombie.x += nx * zombie.speed * dt
            zombie.z += nz * zombie.speed * dt
          }
        } else {
          // In attack range (5-11m): stop and spit
          if (zombie.attackCooldown <= 0) {
            zombie.isAttacking = true
            zombie.attackCooldown = 2.2
            spitterAttacks.push({ zombieId: zombie.id, targetId: target.id, x: zombie.x, z: zombie.z })
          } else {
            zombie.isAttacking = false
          }
        }

        if (zombie.attackCooldown > 0) {
          zombie.attackCooldown -= dt
        }
        return
      }

      // Exploder AI: Move close then prime and detonate
      if (zombie.type === 'exploder') {
        zombie.rotationY = Math.atan2(dx, dz)

        if (targetDist <= 4.0) {
          zombie.isAttacking = true // priming
          if (zombie.attackCooldown <= 0) {
            zombie.attackCooldown = 1.5 // 1.5s priming
          } else {
            zombie.attackCooldown -= dt
            if (zombie.attackCooldown <= 0) {
              explodingZombies.push({ zombieId: zombie.id, x: zombie.x, z: zombie.z })
              zombie.isDead = true
              return
            }
          }
        } else {
          zombie.isAttacking = false
          zombie.attackCooldown = 0
          if (dist > 0.2) {
            const nx = dx / (dist || 1)
            const nz = dz / (dist || 1)
            zombie.x += nx * zombie.speed * dt
            zombie.z += nz * zombie.speed * dt
          }
        }
        return
      }

      // Face current movement direction / target
      zombie.rotationY = Math.atan2(dx, dz)

      // Boss special behaviors
      if (zombie.type === 'boss') {
        this.updateBossAI(zombie, target, targetDx, targetDz, targetDist, dt)
      } else {
        // Normal zombie behavior
        if (targetDist < 1.5 && zombie.attackCooldown <= 0) {
          zombie.isAttacking = true
          zombie.attackCooldown = 1.0
        } else {
          zombie.isAttacking = false

          if (dist > 0.2) {
            const nx = dx / (dist || 1)
            const nz = dz / (dist || 1)
            zombie.x += nx * zombie.speed * dt
            zombie.z += nz * zombie.speed * dt
          }
        }
      }

      if (zombie.attackCooldown > 0) {
        zombie.attackCooldown -= dt
      }
    })

    return { attackedBarricades, explodingZombies, spitterAttacks }
  }

  private updateBossAI(
    zombie: ZombieState,
    target: { id: string; x: number; z: number },
    dx: number,
    dz: number,
    dist: number,
    dt: number
  ): void {
    // Boss has 3 attack patterns
    const attackPattern = Math.floor((zombie.attackCooldown * 10) % 3)

    // Leap attack: bosses can jump at players from distance
    if (dist > 3 && dist < 10 && zombie.attackCooldown <= 0 && attackPattern === 0) {
      // Leap toward player
      const leapSpeed = zombie.speed * 2.5
      const nx = dx / dist
      const nz = dz / dist
      zombie.x += nx * leapSpeed * dt * 3
      zombie.z += nz * leapSpeed * dt * 3
      zombie.isAttacking = true
      zombie.attackCooldown = 2.5
    }
    // Area stomp: damage nearby players
    else if (dist < 2.5 && zombie.attackCooldown <= 0 && attackPattern === 1) {
      zombie.isAttacking = true
      zombie.attackCooldown = 2.0
    }
    // Normal melee but slower
    else if (dist < 2.0 && zombie.attackCooldown <= 0) {
      zombie.isAttacking = true
      zombie.attackCooldown = 1.5
    }
    else {
      zombie.isAttacking = false
      if (dist >= 2.0) {
        const nx = dx / dist
        const nz = dz / dist
        zombie.x += nx * zombie.speed * dt
        zombie.z += nz * zombie.speed * dt
      }
    }
  }

  /**
   * Closest player who can still fight back. Downed players are only chased
   * when nobody is standing, so a horde does not pile onto a crawling player.
   */
  private findNearestAlivePlayer(
    zombie: ZombieState,
    players: Map<string, PlayerState>
  ): { id: string; x: number; z: number } | null {
    let standing: { id: string; x: number; z: number } | null = null
    let standingDist = Infinity
    let downed: { id: string; x: number; z: number } | null = null
    let downedDist = Infinity

    players.forEach((player, id) => {
      if (player.isDead) return

      const dx = player.x - zombie.x
      const dz = player.z - zombie.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (player.isDowned) {
        if (dist < downedDist) {
          downedDist = dist
          downed = { id, x: player.x, z: player.z }
        }
      } else if (dist < standingDist) {
        standingDist = dist
        standing = { id, x: player.x, z: player.z }
      }
    })

    return standing ?? downed
  }

  getZombie(id: string): ZombieState | undefined {
    return this.zombies.get(id)
  }

  getAllZombies(): Map<string, ZombieState> {
    return this.zombies
  }

  getAliveZombies(): ZombieState[] {
    return Array.from(this.zombies.values()).filter(z => !z.isDead)
  }

  removeZombie(id: string): void {
    this.zombies.delete(id)
  }

  clearAll(): void {
    this.zombies.clear()
  }

  getAttackDamage(type: ZombieType): number {
    return ZOMBIE_TYPES[type].damage
  }

  getZombieCount(): number {
    return this.zombies.size
  }

  getAliveCount(): number {
    return this.getAliveZombies().length
  }
}
