/** Alien Shooter outpost: one courtyard, four corner bunkers, four gates. */

export type SurvivalObstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: "wall" | "crate" | "barrel";
};

export const SURVIVAL_BOUNDS = { minX: -21.2, maxX: 21.2, minZ: -21.2, maxZ: 21.2 } as const;

export const SURVIVAL_SPAWNS: Array<{ x: number; z: number }> = [
  { x: 0, z: -21 },
  { x: 0, z: 21 },
  { x: -21, z: 0 },
  { x: 21, z: 0 },
];

function wall(minX: number, maxX: number, minZ: number, maxZ: number): SurvivalObstacle {
  return { minX, maxX, minZ, maxZ, kind: "wall" };
}
function crate(cx: number, cz: number, half = 0.7): SurvivalObstacle {
  return { minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half, kind: "crate" };
}
function barrel(cx: number, cz: number, half = 0.42): SurvivalObstacle {
  return { minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half, kind: "barrel" };
}

/** U-bunker centered at (cx, cz), opening toward the courtyard origin. */
function uBunker(cx: number, cz: number, size = 6): SurvivalObstacle[] {
  const t = 0.7;
  const h = size / 2;
  const x0 = cx - h;
  const x1 = cx + h;
  const z0 = cz - h;
  const z1 = cz + h;
  const midX = cx;
  const midZ = cz;
  const walls: SurvivalObstacle[] = [];
  if (cx < 0) walls.push(wall(x0, x0 + t, z0, z1));
  else walls.push(wall(x1 - t, x1, z0, z1));
  if (cz < 0) walls.push(wall(x0, x1, z0, z0 + t));
  else walls.push(wall(x0, x1, z1 - t, z1));
  if (cx < 0) {
    if (cz < 0) walls.push(wall(x1 - t, x1, z0, midZ));
    else walls.push(wall(x1 - t, x1, midZ, z1));
  } else {
    if (cz < 0) walls.push(wall(x0, x0 + t, z0, midZ));
    else walls.push(wall(x0, x0 + t, midZ, z1));
  }
  if (cz < 0) {
    if (cx < 0) walls.push(wall(x0, midX, z1 - t, z1));
    else walls.push(wall(midX, x1, z1 - t, z1));
  } else {
    if (cx < 0) walls.push(wall(x0, midX, z0, z0 + t));
    else walls.push(wall(midX, x1, z0, z0 + t));
  }
  return walls;
}

export const SURVIVAL_OBSTACLES: SurvivalObstacle[] = [
  // Perimeter — four walls with 6.4m gates at N/S/E/W
  wall(-23.2, -3.2, 22.4, 23.2),
  wall(3.2, 23.2, 22.4, 23.2),
  wall(-23.2, -3.2, -23.2, -22.4),
  wall(3.2, 23.2, -23.2, -22.4),
  wall(-23.2, -22.4, -22.4, -3.2),
  wall(-23.2, -22.4, 3.2, 22.4),
  wall(22.4, 23.2, -22.4, -3.2),
  wall(22.4, 23.2, 3.2, 22.4),
  // Corner bunkers
  ...uBunker(-16.2, -16.2),
  ...uBunker(16.2, -16.2),
  ...uBunker(-16.2, 16.2),
  ...uBunker(16.2, 16.2),
  // Courtyard cover — symmetric, center kept open for kiting
  crate(-7.2, -7.2, 0.75),
  crate(-8.6, -7.2, 0.55),
  crate(7.2, 7.2, 0.75),
  crate(8.6, 7.2, 0.55),
  crate(-7.2, 7.2, 0.75),
  crate(7.2, -7.2, 0.75),
  barrel(0, 10.2),
  barrel(0, -10.2),
  barrel(10.2, 0),
  barrel(-10.2, 0),
];

export function pushOutSurvival(x: number, z: number, radius: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const obs of SURVIVAL_OBSTACLES) {
    const cx = Math.max(obs.minX, Math.min(px, obs.maxX));
    const cz = Math.max(obs.minZ, Math.min(pz, obs.maxZ));
    const dx = px - cx;
    const dz = pz - cz;
    const dist = Math.hypot(dx, dz);
    if (dist < radius && dist > 1e-5) {
      const push = radius - dist;
      px += (dx / dist) * push;
      pz += (dz / dist) * push;
    } else if (dist < 1e-5) {
      px += radius;
    }
  }
  return { x: px, z: pz };
}

function slabEnter(
  ox: number, oz: number, dx: number, dz: number,
  obs: SurvivalObstacle, maxDist: number,
): number | null {
  const invDx = dx === 0 ? Infinity : 1 / dx;
  const invDz = dz === 0 ? Infinity : 1 / dz;
  let t1 = (obs.minX - ox) * invDx;
  let t2 = (obs.maxX - ox) * invDx;
  if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
  let tz1 = (obs.minZ - oz) * invDz;
  let tz2 = (obs.maxZ - oz) * invDz;
  if (tz1 > tz2) { const tmp = tz1; tz1 = tz2; tz2 = tmp; }
  const tEnter = Math.max(t1, tz1);
  const tExit = Math.min(t2, tz2);
  if (tExit < 0 || tEnter > tExit || tEnter > maxDist) return null;
  return tEnter < 0 ? 0 : tEnter;
}

export function survivalLineOfSight(ox: number, oz: number, tx: number, tz: number): boolean {
  const dx = tx - ox;
  const dz = tz - oz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const ndx = dx / dist;
  const ndz = dz / dist;
  for (const obs of SURVIVAL_OBSTACLES) {
    const t = slabEnter(ox, oz, ndx, ndz, obs, dist);
    if (t !== null && t < dist - 0.05) return false;
  }
  return true;
}

export function survivalWallDistance(ox: number, oz: number, dx: number, dz: number, maxDist = 70): number {
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return maxDist;
  const ndx = dx / len;
  const ndz = dz / len;
  let best = maxDist;
  for (const obs of SURVIVAL_OBSTACLES) {
    const t = slabEnter(ox, oz, ndx, ndz, obs, best);
    if (t !== null && t > 0.15 && t < best) best = t;
  }
  return best;
}
