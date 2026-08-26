/** Alien Shooter-style arena: 4 rooms around a central cross, cover crates. */

export type SurvivalObstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: "wall" | "crate";
};

export const SURVIVAL_BOUNDS = { minX: -26, maxX: 26, minZ: -26, maxZ: 26 } as const;

export const SURVIVAL_SPAWNS: Array<{ x: number; z: number }> = [
  { x: 0, z: -24 },
  { x: 0, z: 24 },
  { x: -24, z: 0 },
  { x: 24, z: 0 },
  { x: -20, z: -20 },
  { x: 20, z: -20 },
  { x: -20, z: 20 },
  { x: 24, z: 20 },
];

function wall(minX: number, maxX: number, minZ: number, maxZ: number): SurvivalObstacle {
  return { minX, maxX, minZ, maxZ, kind: "wall" };
}
function crate(cx: number, cz: number, half = 0.9): SurvivalObstacle {
  return { minX: cx - half, maxX: cx + half, minZ: cz - half, maxZ: cz + half, kind: "crate" };
}

export const SURVIVAL_OBSTACLES: SurvivalObstacle[] = [
  // Outer walls
  wall(-27.6, 27.6, 26.4, 27.6),
  wall(-27.6, 27.6, -27.6, -26.4),
  wall(-27.6, -26.4, -26.4, 26.4),
  wall(26.4, 27.6, -26.4, 26.4),
  // Interior cross (door gaps ±4 at center)
  wall(-26, -4.2, -10.4, -9.6),
  wall(4.2, 26, -10.4, -9.6),
  wall(-26, -4.2, 9.6, 10.4),
  wall(4.2, 26, 9.6, 10.4),
  wall(-10.4, -9.6, -26, -4.2),
  wall(-10.4, -9.6, 4.2, 26),
  wall(9.6, 10.4, -26, -4.2),
  wall(9.6, 10.4, 4.2, 26),
  // Cover
  crate(-3.2, -3.2, 0.85),
  crate(3.2, 3.2, 0.85),
  crate(-18, -18, 1.1),
  crate(18, -18, 1.1),
  crate(-18, 18, 1.1),
  crate(18, 18, 1.1),
  crate(-16, 0, 0.8),
  crate(16, 0, 0.8),
  crate(0, -16, 0.8),
  crate(0, 16, 0.8),
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

function rayHitsObstacle(
  ox: number, oz: number, dx: number, dz: number,
  obs: SurvivalObstacle, maxDist: number,
): boolean {
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
  return tExit >= 0 && tEnter <= tExit && tEnter <= maxDist;
}

export function survivalLineOfSight(ox: number, oz: number, tx: number, tz: number): boolean {
  const dx = tx - ox;
  const dz = tz - oz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const ndx = dx / dist;
  const ndz = dz / dist;
  for (const obs of SURVIVAL_OBSTACLES) {
    if (obs.kind === "crate") continue;
    if (rayHitsObstacle(ox, oz, ndx, ndz, obs, dist)) return false;
  }
  return true;
}
