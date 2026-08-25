// ─── Interest Management System ────────────────────────────────
// Filters which players are visible to each client based on:
//   1. Distance (60m visibility radius)
//   2. Line of sight (not blocked by solid obstacles)
//
// Players outside range or behind walls don't receive position updates,
// reducing bandwidth and preventing wallhack-style info leaks.

import { PlayerState, MAP_OBSTACLES } from "@cs-game/shared";
import { rayVsBox } from "../utils/geometry";

const VISIBILITY_RANGE = 60         // meters
const VISIBILITY_RANGE_SQ = VISIBILITY_RANGE * VISIBILITY_RANGE
const UPDATE_INTERVAL_MS = 100      // broadcast filtered positions every 100ms (10 Hz)
const TEAM_ALWAYS_VISIBLE = true    // teammates are always visible

interface PlayerVisibility {
  visible: Set<string>  // set of player IDs this client can see
}

function hasLineOfSight(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): boolean {
  const dx = x2 - x1
  const dy = y2 - y1
  const dz = z2 - z1
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist < 0.01) return true

  const ndx = dx / dist
  const ndy = dy / dist
  const ndz = dz / dist

  for (const obs of MAP_OBSTACLES) {
    if (obs.material === "wood") continue // wood is wallbangable, doesn't block LOS
    const t = rayVsBox(x1, y1, z1, ndx, ndy, ndz, obs)
    if (t !== null && t < dist) return false
  }
  return true
}

export class InterestManager {
  private lastUpdateTime: number = 0
  private playerVisibility: Map<string, PlayerVisibility> = new Map()

  /** Check if targetPlayer is visible to viewerPlayer. */
  isPlayerVisible(viewer: PlayerState, target: PlayerState): boolean {
    // Teammates are always visible
    if (TEAM_ALWAYS_VISIBLE && viewer.team === target.team) return true

    const dx = target.x - viewer.x
    const dz = target.z - viewer.z
    const distSq = dx * dx + dz * dz

    // Out of range
    if (distSq > VISIBILITY_RANGE_SQ) return false

    // LOS check (3D: viewer eye at y+1.6, target center at y+1)
    if (!hasLineOfSight(
      viewer.x, viewer.y + 1.6, viewer.z,
      target.x, target.y + 1, target.z,
    )) {
      return false
    }

    return true
  }

  /** Check if it's time to broadcast filtered updates. */
  shouldUpdate(now: number): boolean {
    if (now - this.lastUpdateTime >= UPDATE_INTERVAL_MS) {
      this.lastUpdateTime = now
      return true
    }
    return false
  }

  /** Compute which players each client can see. Returns a map of sessionId -> visible player IDs. */
  computeVisibility(players: Map<string, PlayerState>): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>()

    players.forEach((viewer, viewerId) => {
      if (viewer.isDead) return

      const visible = new Set<string>()

      players.forEach((target, targetId) => {
        if (targetId === viewerId) return
        if (target.isDead) return

        if (this.isPlayerVisible(viewer, target)) {
          visible.add(targetId)
        }
      })

      result.set(viewerId, visible)
    })

    return result
  }

  /** Build per-client filtered player position payloads. */
  buildFilteredPayloads(
    players: Map<string, PlayerState>,
    visibility: Map<string, Set<string>>,
  ): Map<string, Record<string, { x: number; y: number; z: number; ry: number; weapon: string; crouch: boolean; sprint: boolean; slide: boolean; dead: boolean }>> {
    const payloads = new Map<string, Record<string, any>>()

    players.forEach((viewer, viewerId) => {
      const visibleIds = visibility.get(viewerId)
      if (!visibleIds) return

      const payload: Record<string, any> = {}

      visibleIds.forEach((targetId) => {
        const target = players.get(targetId)
        if (!target) return
        payload[targetId] = {
          x: target.x,
          y: target.y,
          z: target.z,
          ry: target.rotationY,
          weapon: target.currentWeapon,
          crouch: target.isCrouching,
          sprint: target.isSprinting,
          slide: target.isSliding,
          dead: target.isDead,
        }
      })

      payloads.set(viewerId, payload)
    })

    return payloads
  }

  /** Clean up when a player leaves. */
  clearPlayer(sessionId: string) {
    this.playerVisibility.delete(sessionId)
  }
}
