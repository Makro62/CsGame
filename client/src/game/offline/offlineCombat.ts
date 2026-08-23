import { BOMB_SITES, MAP_BOUNDARY, MAP_OBSTACLES, SPAWN, type MapObstacle } from "@cs-game/shared";

interface Point2D {
  x: number;
  z: number;
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

  const steps = Math.max(1, Math.ceil(distance * 2));
  const stepX = dx / steps;
  const stepZ = dz / steps;

  for (let i = 1; i < steps; i++) {
    const cx = from.x + stepX * i;
    const cz = from.z + stepZ * i;
    for (const obs of obstacles) {
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
  const angleToTarget = Math.atan2(to.x - from.x, to.z - from.z);
  let diff = angleToTarget - from.rotationY;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= fov / 2;
}

export function fireIntervalMs(weaponKey: string, fireRate: number): number {
  return weaponKey === "awp" ? 1400 : 1000 / Math.max(1, fireRate);
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

/** Slide along AABB walls so bots do not walk through containers. */
export function steerAroundObstacles(
  from: Point2D,
  intended: Point2D,
  obstacles: readonly MapObstacle[] = MAP_OBSTACLES
): Point2D {
  const next = { x: intended.x, z: intended.z };
  const blocked = obstacles.some(
    (obs) => next.x >= obs.minX && next.x <= obs.maxX && next.z >= obs.minZ && next.z <= obs.maxZ
  );
  if (!blocked) return next;

  const onlyX = { x: intended.x, z: from.z };
  if (!obstacles.some((obs) => onlyX.x >= obs.minX && onlyX.x <= obs.maxX && onlyX.z >= obs.minZ && onlyX.z <= obs.maxZ)) {
    return onlyX;
  }
  const onlyZ = { x: from.x, z: intended.z };
  if (!obstacles.some((obs) => onlyZ.x >= obs.minX && onlyZ.x <= obs.maxX && onlyZ.z >= obs.minZ && onlyZ.z <= obs.maxZ)) {
    return onlyZ;
  }
  return { x: from.x, z: from.z };
}

export function clampToMap(p: Point2D): Point2D {
  return {
    x: Math.max(MAP_BOUNDARY.minX + 1, Math.min(MAP_BOUNDARY.maxX - 1, p.x)),
    z: Math.max(MAP_BOUNDARY.minZ + 1, Math.min(MAP_BOUNDARY.maxZ - 1, p.z)),
  };
}

/** Camera/player yaw (Three.js YXZ, -Z forward) facing a point. */
export function cameraYawTowards(from: Point2D, to: Point2D): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

export function spawnCameraYaw(team: "T" | "CT"): number {
  const from = SPAWN[team];
  const to = team === "T" ? SPAWN.CT : SPAWN.T;
  return cameraYawTowards(from, to);
}

export function nearestBombSite(p: Point2D): "A" | "B" {
  const dA = Math.hypot(p.x - BOMB_SITES.A.x, p.z - BOMB_SITES.A.z);
  const dB = Math.hypot(p.x - BOMB_SITES.B.x, p.z - BOMB_SITES.B.z);
  return dA <= dB ? "A" : "B";
}

export function distToBombSite(p: Point2D, site: "A" | "B"): number {
  const s = BOMB_SITES[site];
  return Math.hypot(p.x - s.x, p.z - s.z);
}
