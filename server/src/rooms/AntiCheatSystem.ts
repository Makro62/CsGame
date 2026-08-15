// ─── Anti-Cheat System ─────────────────────────────────────────
// Validates client actions server-side to prevent common cheats:
//   1. Speed hacking (movement too fast)
//   2. Fire-rate hacking (shooting faster than weapon allows)
//   3. Ammo hacking (negative ammo, ammo > mag)
//   4. Position spoofing (teleportation)
//   5. Input flooding (too many inputs per second)

import { PlayerState, WEAPONS, PHYSICS } from "@cs-game/shared";

interface ViolationRecord {
  count: number
  firstAt: number
  lastAt: number
}

const MAX_SPEED_MULTIPLIER = 1.35        // allow 35% tolerance over max speed
const MAX_POSITION_DELTA_SQ = 100        // 10m max position change per tick
const MAX_INPUTS_PER_SECOND = 60         // flood protection
const FIRE_RATE_VIOLATIONS_THRESHOLD = 5 // warn after 5 violations
const SPEED_VIOLATIONS_THRESHOLD = 3     // kick after 3 speed violations

export class AntiCheatSystem {
  private violations: Map<string, Map<string, ViolationRecord>> = new Map()
  private inputCounts: Map<string, number[]> = new Map()
  private flaggedPlayers: Set<string> = new Set()

  /** Check if a player's movement delta exceeds max allowed speed. */
  validateSpeed(
    sessionId: string,
    player: PlayerState,
    nextX: number,
    nextZ: number,
    dt: number,
  ): boolean {
    const dx = nextX - player.x
    const dz = nextZ - player.z
    const distSq = dx * dx + dz * dz
    const maxDist = PHYSICS.sprintSpeed * MAX_SPEED_MULTIPLIER * dt

    if (distSq > maxDist * maxDist) {
      this.recordViolation(sessionId, "speed")
      return false
    }

    // Position jump detection (teleport hack)
    if (distSq > MAX_POSITION_DELTA_SQ) {
      this.recordViolation(sessionId, "teleport")
      return false
    }

    return true
  }

  /** Check if a player is firing faster than the weapon allows. */
  validateFireRate(
    sessionId: string,
    weaponKey: string,
    lastFireTime: number,
    now: number,
  ): boolean {
    const weaponStats = WEAPONS[weaponKey as keyof typeof WEAPONS]
    if (!weaponStats) return false

    const minInterval = 1000 / weaponStats.fireRate
    if (now - lastFireTime < minInterval * 0.7) {
      // 30% tolerance — tighter than the normal 15% tolerance
      this.recordViolation(sessionId, "fire_rate")
      return false
    }

    return true
  }

  /** Validate ammo values are sane. */
  validateAmmo(sessionId: string, player: PlayerState, weaponKey: string): boolean {
    const weaponStats = WEAPONS[weaponKey as keyof typeof WEAPONS]
    if (!weaponStats) return false

    if (player.ammo < 0 || player.ammo > weaponStats.mag + 10) {
      this.recordViolation(sessionId, "ammo")
      return false
    }

    if (player.reserveAmmo < 0 || player.reserveAmmo > weaponStats.reserveAmmo * 3) {
      this.recordViolation(sessionId, "ammo_reserve")
      return false
    }

    return true
  }

  /** Rate-limit client input messages (flood protection). */
  validateInputRate(sessionId: string, now: number): boolean {
    let timestamps = this.inputCounts.get(sessionId)
    if (!timestamps) {
      timestamps = []
      this.inputCounts.set(sessionId, timestamps)
    }

    // Prune old entries (1 second window)
    while (timestamps.length > 0 && now - timestamps[0] > 1000) {
      timestamps.shift()
    }

    timestamps.push(now)

    if (timestamps.length > MAX_INPUTS_PER_SECOND) {
      this.recordViolation(sessionId, "input_flood")
      return false
    }

    return true
  }

  /** Check if a player is flagged for investigation. */
  isFlagged(sessionId: string): boolean {
    return this.flaggedPlayers.has(sessionId)
  }

  /** Get violation count for a specific type. */
  getViolationCount(sessionId: string, type: string): number {
    const playerViolations = this.violations.get(sessionId)
    if (!playerViolations) return 0
    return playerViolations.get(type)?.count || 0
  }

  /** Get total violation count for a player. */
  getTotalViolations(sessionId: string): number {
    const playerViolations = this.violations.get(sessionId)
    if (!playerViolations) return 0
    let total = 0
    for (const v of playerViolations.values()) {
      total += v.count
    }
    return total
  }

  /** Check if a player should be kicked (excessive violations). */
  shouldKick(sessionId: string): boolean {
    return this.getViolationCount(sessionId, "speed") >= SPEED_VIOLATIONS_THRESHOLD
  }

  private recordViolation(sessionId: string, type: string) {
    let playerViolations = this.violations.get(sessionId)
    if (!playerViolations) {
      playerViolations = new Map()
      this.violations.set(sessionId, playerViolations)
    }

    const existing = playerViolations.get(type)
    const now = performance.now()

    if (existing) {
      existing.count++
      existing.lastAt = now
    } else {
      playerViolations.set(type, { count: 1, firstAt: now, lastAt: now })
    }

    // Flag player if enough violations
    const count = playerViolations.get(type)!.count
    if (
      (type === "speed" && count >= SPEED_VIOLATIONS_THRESHOLD) ||
      (type === "fire_rate" && count >= FIRE_RATE_VIOLATIONS_THRESHOLD)
    ) {
      this.flaggedPlayers.add(sessionId)
    }
  }

  /** Clean up when a player leaves. */
  clearAll(sessionId: string) {
    this.violations.delete(sessionId)
    this.inputCounts.delete(sessionId)
    this.flaggedPlayers.delete(sessionId)
  }
}
