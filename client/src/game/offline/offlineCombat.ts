import { BOMB_SITES, MAP_BOUNDARY, MAP_OBSTACLES, SPAWN, BUY_ZONE, type MapObstacle, getObstaclesForMap, getBoundaryForMap, getBombSitesForMap, getSpawnForMap, getBuyZoneForMap } from "@cs-game/shared";
import { useGameStore } from "../../stores/useGameStore";
import { getProceduralMapData } from "../map/ProceduralMapRegistry";

interface Point2D {
  x: number;
  z: number;
}

export type BotLane = "A" | "mid" | "B";
export type BotRole = "entry" | "support" | "flanker" | "runner";

const BODY = 0.45;

function getCurrentMapId(): string {
  try {
    return useGameStore.getState().currentMap || "container_yard";
  } catch {
    return "container_yard";
  }
}

function resolveObstacles(obstacles: readonly MapObstacle[] | undefined): readonly MapObstacle[] {
  if (obstacles && obstacles !== MAP_OBSTACLES) return obstacles;
  try {
    const mapId = getCurrentMapId();
    if (mapId === "dust" || mapId === "ravenpoint") return getObstaclesForMap(mapId) as unknown as readonly MapObstacle[];
    const proc = getProceduralMapData(mapId);
    if (proc) return proc.obstacles;
  } catch {
    /* store may be uninitialized outside React */
  }
  return MAP_OBSTACLES;
}

function resolveBoundary(): typeof MAP_BOUNDARY {
  try {
    const mapId = getCurrentMapId();
    if (mapId === "dust" || mapId === "ravenpoint") return getBoundaryForMap(mapId) as typeof MAP_BOUNDARY;
    const proc = getProceduralMapData(mapId);
    if (proc) return proc.bounds as typeof MAP_BOUNDARY;
  } catch {
    /* store may be uninitialized outside React */
  }
  return MAP_BOUNDARY;
}

export function resolveBombSites(): typeof BOMB_SITES {
  try {
    const mapId = getCurrentMapId();
    if (mapId === "dust" || mapId === "ravenpoint") return getBombSitesForMap(mapId) as typeof BOMB_SITES;
    const proc = getProceduralMapData(mapId);
    if (proc) return proc.bombSites as typeof BOMB_SITES;
  } catch {
    /* store may be uninitialized outside React */
  }
  return BOMB_SITES;
}

export function resolveBuyZone(team: "T" | "CT"): { x: number; y?: number; z: number; radius: number } {
  try {
    const mapId = getCurrentMapId();
    const proc = getProceduralMapData(mapId);
    if (proc) {
      const sp = proc.spawns[team];
      return { x: sp.x, z: sp.z, radius: 12 };
    }
    return getBuyZoneForMap(mapId)[team];
  } catch {
    /* store may be uninitialized outside React */
  }
  return BUY_ZONE[team];
}

export function inBuyZone(team: "T" | "CT", x: number, z: number): boolean {
  const zone = resolveBuyZone(team);
  return Math.hypot(x - zone.x, z - zone.z) <= zone.radius;
}

function hitsObstacle(p: Point2D, obstacles: readonly MapObstacle[] = MAP_OBSTACLES, pad = BODY): boolean {
  const obs = resolveObstacles(obstacles);
  return obs.some(
    (obs) =>
      p.x >= obs.minX - pad &&
      p.x <= obs.maxX + pad &&
      p.z >= obs.minZ - pad &&
      p.z <= obs.maxZ + pad,
  );
}

export function isPointBlocked(
  p: Point2D,
  pad = BODY,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES,
): boolean {
  return hitsObstacle(p, obstacles, pad);
}

/** Nudge a bot that spawned or slid inside a container back into open ground. */
export function pushOutOfObstacles(
  p: Point2D,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES,
): Point2D {
  const start = clampToMap(p);
  if (!hitsObstacle(start, obstacles)) return start;
  const radii = [0.4, 0.8, 1.2, 1.8, 2.5, 3.5, 5, 7];
  const dirs = 16;
  for (const r of radii) {
    for (let k = 0; k < dirs; k++) {
      const a = (k / dirs) * Math.PI * 2;
      const c = clampToMap({
        x: start.x + Math.sin(a) * r,
        z: start.z + Math.cos(a) * r,
      });
      if (!hitsObstacle(c, obstacles)) return c;
    }
  }
  return start;
}

export function hasLineOfSight(
  from: Point2D,
  to: Point2D,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES
): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.001) return true;

  const obsList = resolveObstacles(obstacles);
  const steps = Math.max(1, Math.ceil(distance * 2));
  const stepX = dx / steps;
  const stepZ = dz / steps;

  for (let i = 1; i < steps; i++) {
    const cx = from.x + stepX * i;
    const cz = from.z + stepZ * i;
    for (const obs of obsList) {
      if (cx >= obs.minX && cx <= obs.maxX && cz >= obs.minZ && cz <= obs.maxZ) {
        return false;
      }
    }
  }
  return true;
}

export function isInFov(
  from: Point2D & { rotationY: number },
  to: Point2D,
  fov = Math.PI * 0.75
): boolean {
  if (!Number.isFinite(from.rotationY) || !Number.isFinite(fov) || fov <= 0) return false;
  if (fov >= Math.PI * 2) return true;
  const angleToTarget = Math.atan2(to.x - from.x, to.z - from.z);
  let diff = angleToTarget - from.rotationY;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= fov / 2;
}

export function fireIntervalMs(weaponKey: string, fireRate: number): number {
  if (!Number.isFinite(fireRate) || fireRate <= 0) return 1000;
  return weaponKey === "awp" ? 1400 : 1000 / fireRate;
}

export function resolveBotShot(opts: {
  accuracy: number;
  headshotRate: number;
  distance: number;
  viewDistance: number;
}): { hit: boolean; headshot: boolean } {
  const distPenalty = Math.min(opts.distance / Math.max(opts.viewDistance, 1), 0.5);
  const hit = Math.random() < opts.accuracy * (1 - distPenalty * 0.3);
  return { hit, headshot: hit && Math.random() < opts.headshotRate };
}

/** Fan-sample headings so a corner does not trap a bot in a spin. */
export function steerAroundObstacles(
  from: Point2D,
  intended: Point2D,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES
): Point2D {
  const origin = hitsObstacle(from, obstacles) ? pushOutOfObstacles(from, obstacles) : from;
  if (!hitsObstacle(intended, obstacles)) return intended;

  const dx = intended.x - origin.x;
  const dz = intended.z - origin.z;
  const step = Math.max(0.08, Math.hypot(dx, dz));
  const desired = Math.atan2(dx, dz);

  const onlyX = { x: origin.x + dx, z: origin.z };
  if (!hitsObstacle(onlyX, obstacles)) return onlyX;
  const onlyZ = { x: origin.x, z: origin.z + dz };
  if (!hitsObstacle(onlyZ, obstacles)) return onlyZ;

  let best: Point2D | null = null;
  let bestPenalty = Infinity;
  for (let k = 1; k <= 10; k++) {
    const mag = k * (Math.PI / 10);
    for (const sign of [1, -1] as const) {
      const ang = desired + sign * mag;
      const cand = {
        x: origin.x + Math.sin(ang) * step,
        z: origin.z + Math.cos(ang) * step,
      };
      if (hitsObstacle(cand, obstacles)) continue;
      if (mag < bestPenalty) {
        bestPenalty = mag;
        best = cand;
      }
    }
  }
  return best ?? origin;
}

export function clampToMap(p: Point2D): Point2D {
  const x = Number.isFinite(p.x) ? p.x : 0;
  const z = Number.isFinite(p.z) ? p.z : 0;
  const b = resolveBoundary();
  return {
    x: Math.max(b.minX + 1, Math.min(b.maxX - 1, x)),
    z: Math.max(b.minZ + 1, Math.min(b.maxZ - 1, z)),
  };
}

export function laneForBotId(id: string): BotLane {
  const n = Number.parseInt(id.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) return "mid";
  return n % 3 === 1 ? "A" : n % 3 === 2 ? "B" : "mid";
}

const ROLE_SLOTS: BotRole[] = ["entry", "support", "support", "flanker", "runner"];

export function roleForBotId(id: string): BotRole {
  const n = Number.parseInt(id.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) return "support";
  return ROLE_SLOTS[(n - 1 + ROLE_SLOTS.length) % ROLE_SLOTS.length];
}

/** Spread roles across A / mid / B so the squad does not stack one corridor. */
export function laneForRole(role: BotRole, id: string): BotLane {
  if (role === "entry" || role === "runner") return "A";
  if (role === "flanker") return "B";
  const n = Number.parseInt(id.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n % 5 === 3 ? "A" : "mid";
}

/** Waypoints weave through cover instead of walking the open axis. */
export const BOT_PATHS: Record<BotLane, { T: Point2D[]; CT: Point2D[] }> = {
  A: {
    T: [
      { x: -22, z: -2 },
      { x: -21, z: -14 },
      { x: -10, z: -14.2 },
      { x: 2, z: -14.8 },
      { x: 15, z: -16 },
    ],
    CT: [
      { x: 22, z: -3 },
      { x: 18, z: -12 },
      { x: 15, z: -16 },
    ],
  },
  mid: {
    T: [
      { x: -18, z: 0 },
      { x: -12, z: 2.4 },
      { x: -4, z: -2.2 },
      { x: 5, z: 2.2 },
      { x: 16, z: 0 },
    ],
    CT: [
      { x: 18, z: 0 },
      { x: 12, z: -2.4 },
      { x: 4, z: 2.2 },
      { x: -5, z: -2.2 },
      { x: -16, z: 0 },
    ],
  },
  B: {
    T: [
      { x: -22, z: 2 },
      { x: -21, z: 14 },
      { x: -10, z: 14.2 },
      { x: 2, z: 14.8 },
      { x: 15, z: 16 },
    ],
    CT: [
      { x: 22, z: 3 },
      { x: 18, z: 12 },
      { x: 15, z: 16 },
    ],
  },
};

const RAVENPOINT_BOT_PATHS: Record<BotLane, { T: Point2D[]; CT: Point2D[] }> = {
  A: {
    T: [
      { x: 0, z: 36 },
      { x: 21, z: 28 },
      { x: 21, z: 6 },
      { x: 26, z: -8 },
    ],
    CT: [
      { x: 0, z: -36 },
      { x: 21, z: -32 },
      { x: 21, z: -20 },
      { x: 26, z: -8 },
    ],
  },
  mid: {
    T: [
      { x: 0, z: 36 },
      { x: 0, z: 16 },
      { x: 0, z: 4 },
      { x: 0, z: -16 },
    ],
    CT: [
      { x: 0, z: -36 },
      { x: 0, z: -16 },
      { x: 0, z: 4 },
      { x: 0, z: 16 },
    ],
  },
  B: {
    T: [
      { x: 0, z: 36 },
      { x: -21, z: 28 },
      { x: -21, z: 6 },
      { x: -26, z: -8 },
    ],
    CT: [
      { x: 0, z: -36 },
      { x: -21, z: -32 },
      { x: -21, z: -20 },
      { x: -26, z: -8 },
    ],
  },
};

export function botPath(lane: BotLane, team: "T" | "CT"): Point2D[] {
  const mapId = getCurrentMapId();
  if (mapId === "dust" || mapId === "ravenpoint") return RAVENPOINT_BOT_PATHS[lane][team];
  try {
    const proc = getProceduralMapData(mapId);
    if (proc) {
      const spawn = proc.spawns[team];
      const site =
        lane === "B" ? proc.bombSites.B : lane === "A" ? proc.bombSites.A : {
          x: (proc.bombSites.A.x + proc.bombSites.B.x) / 2,
          z: (proc.bombSites.A.z + proc.bombSites.B.z) / 2,
        };
      return [
        { x: spawn.x, z: spawn.z },
        { x: (spawn.x + site.x) / 2, z: (spawn.z + site.z) / 2 },
        { x: site.x, z: site.z },
      ];
    }
  } catch {
    /* registry may be empty outside a match */
  }
  return BOT_PATHS[lane][team];
}

export function nextWaypointIndex(pos: Point2D, path: Point2D[], index: number): number {
  if (!path.length) return 0;
  if (!Number.isFinite(index)) return 0;
  let i = Math.max(0, Math.min(index, path.length - 1));
  const wp = path[i];
  if (Math.hypot(wp.x - pos.x, wp.z - pos.z) < 2.2 && i < path.length - 1) i += 1;
  return i;
}

export function stepToward(
  from: Point2D,
  to: Point2D,
  speed: number,
  dt: number,
): Point2D {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.05) return { x: from.x, z: from.z };
  const intended = {
    x: from.x + (dx / dist) * speed * dt,
    z: from.z + (dz / dist) * speed * dt,
  };
  return pushOutOfObstacles(clampToMap(steerAroundObstacles(from, intended)));
}

/** Stand on the far side of the nearest cover wall from a threat. */
export function hideBehindCover(
  self: Point2D,
  threat: Point2D,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES,
): Point2D | null {
  let best: Point2D | null = null;
  let bestScore = Infinity;
  const obsList = resolveObstacles(obstacles);
  for (const obs of obsList) {
    if (obs.maxY - obs.minY > 6) continue;
    const hx = obs.maxX - obs.minX;
    const hz = obs.maxZ - obs.minZ;
    if (hx > 8 || hz > 8) continue;
    const cx = (obs.minX + obs.maxX) / 2;
    const cz = (obs.minZ + obs.maxZ) / 2;
    const toThreatX = threat.x - cx;
    const toThreatZ = threat.z - cz;
    const len = Math.hypot(toThreatX, toThreatZ);
    if (len < 0.4) continue;
    const standoff = Math.max(hx, hz) * 0.5 + 1.35;
    const hide = {
      x: cx - (toThreatX / len) * standoff,
      z: cz - (toThreatZ / len) * standoff,
    };
    if (hitsObstacle(hide, obstacles, 0.2)) continue;
    const dSelf = Math.hypot(hide.x - self.x, hide.z - self.z);
    const dThreat = Math.hypot(hide.x - threat.x, hide.z - threat.z);
    if (dSelf > 16 || dThreat < 3.5) continue;
    const score = dSelf + (hasLineOfSight(hide, threat, obstacles) ? 8 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = hide;
    }
  }
  return best;
}

/** Spawn of a team on the current 5v5 map (procedural, Ravenpoint, or yard). */
export function resolveTeamSpawn(mapId: string | undefined, team: "T" | "CT"): Point2D {
  const id = mapId || "container_yard";
  try {
    const proc = getProceduralMapData(id);
    if (proc) return { x: proc.spawns[team].x, z: proc.spawns[team].z };
  } catch {
    /* registry may be empty outside a match */
  }
  try {
    const spawnMap = getSpawnForMap(id);
    const sp = spawnMap[team];
    if (sp) return { x: sp.x, z: sp.z };
  } catch {
    /* shared helper may be unavailable in isolated tests */
  }
  const fallback = SPAWN[team];
  return { x: fallback.x, z: fallback.z };
}

/** Camera/player yaw (Three.js YXZ, -Z forward) facing a point. */
export function cameraYawTowards(from: Point2D, to: Point2D): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

export function spawnCameraYaw(team: "T" | "CT", mapId?: string): number {
  const id = mapId || getCurrentMapId();
  const from = resolveTeamSpawn(id, team);
  const to = resolveTeamSpawn(id, team === "T" ? "CT" : "T");
  return cameraYawTowards(from, to);
}

export function nearestBombSite(p: Point2D): "A" | "B" {
  const bombs = resolveBombSites();
  const dA = Math.hypot(p.x - bombs.A.x, p.z - bombs.A.z);
  const dB = Math.hypot(p.x - bombs.B.x, p.z - bombs.B.z);
  return dA <= dB ? "A" : "B";
}

export function distToBombSite(p: Point2D, site: "A" | "B"): number {
  const bombs = resolveBombSites();
  const s = bombs[site];
  return Math.hypot(p.x - s.x, p.z - s.z);
}
