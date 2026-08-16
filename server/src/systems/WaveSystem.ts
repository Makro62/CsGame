import { GameState, WaveState, WAVE_CONFIG, ZOMBIE_SPAWN, ZOMBIE_POINTS, ZombieType } from '@cs-game/shared'
import { ZombieController } from '../ai/ZombieController'

const BOSS_WAVE_INTERVAL = 5 // Boss every 5 waves
const BOSS_COUNT_BASE = 2
const BOSS_COUNT_PER_INTERVAL = 1

export class WaveSystem {
  private state: GameState
  private zombieCtrl: ZombieController
  private waveState: WaveState = 'waiting'
  private currentWave = 0
  private zombiesRemaining = 0
  private interWaveTimer = 0
  private spawnTimer = 0
  private spawnInterval = 0
  private zombiesToSpawn = 0
  private zombiesSpawned = 0
  private totalBosses = 0
  private bossesSpawned = 0
  private isBossWave = false
  private totalKills = 0
  private totalHeadshots = 0

  constructor(state: GameState, zombieCtrl: ZombieController) {
    this.state = state
    this.zombieCtrl = zombieCtrl
  }

  reset(): void {
    this.waveState = 'waiting'
    this.currentWave = 0
    this.zombiesRemaining = 0
    this.interWaveTimer = 0
    this.spawnTimer = 0
    this.spawnInterval = 0
    this.zombiesToSpawn = 0
    this.zombiesSpawned = 0
    this.totalBosses = 0
    this.bossesSpawned = 0
    this.isBossWave = false
    this.totalKills = 0
    this.totalHeadshots = 0

    this.state.currentWave = 0
    this.state.zombiesRemaining = 0
    this.state.waveState = 'waiting'
    this.state.interWaveTimer = 0
  }

  startFirstWave(): void {
    this.startWave()
  }

  private startWave(): void {
    this.currentWave++
    this.isBossWave = this.currentWave % BOSS_WAVE_INTERVAL === 0
    this.waveState = 'spawning'

    let count: number

    if (this.isBossWave) {
      // Boss wave: fewer regular zombies + bosses
      count = Math.floor(WAVE_CONFIG.baseZombieCount + (this.currentWave * WAVE_CONFIG.zombiesPerWave) * 0.6)
      this.totalBosses = BOSS_COUNT_BASE + Math.floor(this.currentWave / BOSS_WAVE_INTERVAL) * BOSS_COUNT_PER_INTERVAL
    } else {
      count = WAVE_CONFIG.baseZombieCount + (this.currentWave * WAVE_CONFIG.zombiesPerWave)
      this.totalBosses = 0
    }

    this.bossesSpawned = 0
    this.zombiesToSpawn = count + this.totalBosses
    this.zombiesRemaining = this.zombiesToSpawn
    this.zombiesSpawned = 0

    // Calculate active spawn points
    let activeSpawnCount = 1
    for (const tier of WAVE_CONFIG.activeSpawns) {
      if (this.currentWave <= tier.maxWave) {
        activeSpawnCount = tier.count
        break
      }
    }

    // Spawn gradually over spawnDuration seconds
    this.spawnInterval = Math.max(0.2, WAVE_CONFIG.spawnDuration / this.zombiesToSpawn)
    this.spawnTimer = 0

    // Update state
    this.state.currentWave = this.currentWave
    this.state.zombiesRemaining = this.zombiesRemaining
    this.state.waveState = 'spawning'

    if (this.currentWave >= 10) {
      this.state.extractionAvailable = true
    }

    // Spawn first batch immediately
    this.spawnBatch(activeSpawnCount)
  }

  private spawnBatch(activeSpawnCount: number): void {
    if (this.zombiesSpawned >= this.zombiesToSpawn) return

    const remaining = this.zombiesToSpawn - this.zombiesSpawned
    const batchSize = Math.min(remaining, Math.max(3, Math.ceil(this.zombiesToSpawn / 3)))
    // Early waves deliberately use fewer spawn points, per WAVE_CONFIG tiers.
    const spawnCount = Math.max(1, Math.min(activeSpawnCount, ZOMBIE_SPAWN.spawnPoints.length))
    const spawnPoints = ZOMBIE_SPAWN.spawnPoints.slice(0, spawnCount)

    for (let i = 0; i < batchSize; i++) {
      const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]

      // Spawn bosses first if in boss wave
      if (this.isBossWave && this.bossesSpawned < this.totalBosses) {
        this.zombieCtrl.spawnSingle('boss', spawn.x, spawn.z, this.currentWave)
        this.bossesSpawned++
      } else {
        const type = this.zombieCtrl.determineType(this.currentWave)
        this.zombieCtrl.spawnSingle(type, spawn.x, spawn.z, this.currentWave)
      }
      this.zombiesSpawned++
    }

    this.syncRemaining()

    if (this.zombiesSpawned >= this.zombiesToSpawn) {
      this.waveState = 'active'
      this.state.waveState = 'active'
    }
  }

  /**
   * Zombies the players still have to deal with: the ones alive right now plus
   * the ones this wave has not released yet. Without the pending part the HUD
   * jumps from the wave total down to a handful the moment spawning starts.
   */
  private syncRemaining(): void {
    const pending = Math.max(0, this.zombiesToSpawn - this.zombiesSpawned)
    this.zombiesRemaining = this.zombieCtrl.getAliveCount() + pending
    this.state.zombiesRemaining = this.zombiesRemaining
  }

  /**
   * Marks the wave's spawn budget as used up. A nuke can empty the arena before
   * every zombie has spawned, and the wave would otherwise never clear.
   */
  finishSpawning(): void {
    if (this.waveState !== 'spawning' && this.waveState !== 'active') return
    this.zombiesSpawned = this.zombiesToSpawn
    this.waveState = 'active'
    this.state.waveState = 'active'
    this.syncRemaining()
  }

  spawnExtractionSurge(): void {
    // Spawn surge of runners and tanks around arena
    const types: ZombieType[] = ['runner', 'runner', 'tank', 'spitter']
    for (let i = 0; i < 6; i++) {
      const spawn = ZOMBIE_SPAWN.spawnPoints[i % ZOMBIE_SPAWN.spawnPoints.length]
      const type = types[Math.floor(Math.random() * types.length)]
      this.zombieCtrl.spawnSingle(type, spawn.x, spawn.z, this.currentWave + 2)
    }
  }

  update(dt: number, _players?: Map<string, { hp: number; isDead: boolean }>): void {
    // Pause wave system if state is waiting / game over
    if (this.state.phase !== 'active') return

    // Handle spawning phase
    if (this.waveState === 'spawning') {
      this.spawnTimer += dt
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0

        let activeSpawnCount = 1
        for (const tier of WAVE_CONFIG.activeSpawns) {
          if (this.currentWave <= tier.maxWave) {
            activeSpawnCount = tier.count
            break
          }
        }

        this.spawnBatch(activeSpawnCount)
      }
      return
    }

    // Handle active wave
    if (this.waveState === 'active') {
      const aliveCount = this.zombieCtrl.getAliveCount()
      this.syncRemaining()

      // Check if wave is clear
      if (aliveCount === 0 && this.zombiesSpawned >= this.zombiesToSpawn) {
        this.waveState = 'wave_clear'
        this.state.waveState = 'wave_clear'
        this.giveWaveClearBonus()

        // Boss wave bonus
        if (this.isBossWave) {
          this.giveBossWaveBonus()
        }

        if (this.currentWave >= 10) {
          this.state.extractionAvailable = true
        }

        // Start inter-wave timer (longer after boss waves)
        this.interWaveTimer = Math.max(
          WAVE_CONFIG.interWaveMinTime,
          this.isBossWave ? WAVE_CONFIG.interWaveTime + 5 : WAVE_CONFIG.interWaveTime - (this.currentWave - 1)
        )
        this.state.interWaveTimer = this.interWaveTimer
      }
    }

    // Handle inter-wave timer
    if (this.waveState === 'wave_clear') {
      this.interWaveTimer -= dt
      this.state.interWaveTimer = Math.max(0, this.interWaveTimer)

      if (this.interWaveTimer <= 0) {
        this.startWave()
      }
    }
  }

  private giveWaveClearBonus(): void {
    const bonus = ZOMBIE_POINTS.waveClearBase + (this.currentWave * ZOMBIE_POINTS.waveClearPerWave)

    // Award points to all living players
    this.state.players.forEach((player, sessionId) => {
      if (!player.isDead && player.hp > 0) {
        const currentPoints = this.state.points.get(sessionId) ?? 0
        this.state.points.set(sessionId, currentPoints + bonus)
      }
    })
  }

  private giveBossWaveBonus(): void {
    const bonus = 1000 + (this.currentWave * 200)

    this.state.players.forEach((player, sessionId) => {
      if (!player.isDead && player.hp > 0) {
        const currentPoints = this.state.points.get(sessionId) ?? 0
        this.state.points.set(sessionId, currentPoints + bonus)
      }
    })
  }

  onZombieKilled(headshot: boolean = false): void {
    this.totalKills++
    if (headshot) this.totalHeadshots++
  }

  damageZombie(zombieId: string, damage: number): boolean {
    const zombie = this.zombieCtrl.getZombie(zombieId)
    if (!zombie || zombie.isDead) return false

    zombie.hp -= damage
    if (zombie.hp <= 0) {
      zombie.hp = 0
      zombie.isDead = true
      this.zombieCtrl.removeZombie(zombieId)
      return true // zombie died
    }
    return false
  }

  getCurrentWave(): number {
    return this.currentWave
  }

  getWaveState(): WaveState {
    return this.waveState
  }

  getZombiesRemaining(): number {
    return this.zombieCtrl.getAliveCount()
  }

  isBossWaveActive(): boolean {
    return this.isBossWave
  }

  getStats(): { kills: number; headshots: number; wave: number } {
    return {
      kills: this.totalKills,
      headshots: this.totalHeadshots,
      wave: this.currentWave,
    }
  }

  canStartNextWave(): boolean {
    return this.waveState === 'wave_clear' || this.waveState === 'waiting'
  }
}
