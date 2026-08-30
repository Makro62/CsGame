/** Fixed campaign path. Chapter changes intensity, never the geometry. */

export const L4D_SAFE_Z = -32;
export const L4D_FINISH_Z = 28;
export const L4D_HALL_HALF = 2.1;
export const L4D_BOUNDS = { minX: -9, maxX: 15, minZ: -37, maxZ: 36 } as const;

export const L4D_TRAVERSE_Z = -26;
export const L4D_RESCUE_RADIUS = 7;

export function l4dFinishZ(_chapter?: number) {
  return L4D_FINISH_Z;
}

export type L4DCover = { minX: number; maxX: number; minZ: number; maxZ: number };

function coverAt(x: number, z: number, s: number): L4DCover {
  const h = s / 2;
  return { minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h };
}

/** Crates that infected/bots should slide around (player uses Rapier). */
export const L4D_COVER: L4DCover[] = [
  coverAt(-5.2, -8.2, 1.3),
  coverAt(-3.9, -8.4, 0.95),
  coverAt(5.0, -3.8, 1.35),
  coverAt(-5.0, -2.5, 1.1),
  coverAt(6.2, -9.8, 0.9),
  coverAt(11.5, 6.4, 1.1),
  coverAt(7.4, 9.8, 0.85),
  coverAt(13.0, 9.2, 0.7),
  coverAt(-6.5, 22.5, 1.2),
  coverAt(6.5, 22.5, 1.0),
  coverAt(-6.5, 33.5, 0.9),
  coverAt(6.5, 33.5, 1.1),
];

export function pushOutL4D(x: number, z: number, radius: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const obs of L4D_COVER) {
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

/** Open floors along the campaign — never inside walls or the starting safe room. */
export const L4D_OPEN_SPAWNS: Array<{ x: number; z: number }> = [
  { x: 0, z: -22 },
  { x: -1.2, z: -18 },
  { x: 1.2, z: -15 },
  { x: -6.2, z: -8 },
  { x: 6.2, z: -6 },
  { x: -5.5, z: -2 },
  { x: 5.5, z: -3 },
  { x: 0, z: 3 },
  { x: -1.3, z: 8 },
  { x: 1.3, z: 12 },
  { x: 0, z: 16 },
  { x: 8, z: 8 },
  { x: 11, z: 6 },
  { x: 10, z: 10 },
  { x: 0, z: 22 },
  { x: -6, z: 26 },
  { x: 6, z: 30 },
  { x: 0, z: 24 },
];

export function clampL4DInfected(x: number, z: number): { x: number; z: number } {
  let nx = x;
  let nz = z;
  if (nz < -26.5) nz = -26.5;
  if (nz > 36) nz = 36;
  const inSide = nx > 2.0 && nz > 4.2 && nz < 11.8;
  if (inSide) {
    nx = Math.max(2.2, Math.min(14.4, nx));
    nz = Math.max(4.3, Math.min(11.7, nz));
  } else if ((nz >= -27 && nz <= -12) || (nz >= 0 && nz <= 20)) {
    nx = Math.max(-1.9, Math.min(1.9, nx));
  } else if (nz > -12 && nz < 0) {
    nx = Math.max(-7.2, Math.min(7.2, nx));
  } else {
    nx = Math.max(-8.6, Math.min(8.6, nx));
  }
  return pushOutL4D(nx, nz, 0.45);
}

export function l4dRoughLos(ax: number, az: number, bx: number, bz: number): boolean {
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const c = clampL4DInfected(x, z);
    if (Math.hypot(c.x - x, c.z - z) > 1.4) return false;
  }
  return true;
}

export function pickL4DSpawn(
  survivors: Array<{ x: number; z: number }>,
  minDist = 11,
  maxDist = 26,
): { x: number; z: number } {
  const base = survivors[0] ?? { x: 0, z: L4D_SAFE_Z };
  let best = L4D_OPEN_SPAWNS[0];
  let bestScore = -1;
  for (const s of L4D_OPEN_SPAWNS) {
    if (s.z < -26) continue;
    let nearest = Infinity;
    for (const sv of survivors) {
      const d = Math.hypot(s.x - sv.x, s.z - sv.z);
      if (d < nearest) nearest = d;
    }
    if (nearest < minDist || nearest > maxDist) continue;
    const ahead = s.z - base.z;
    const score = nearest + (ahead > 0 ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  if (bestScore < 0) {
    const far = [...L4D_OPEN_SPAWNS].sort(
      (a, b) => Math.hypot(b.x - base.x, b.z - base.z) - Math.hypot(a.x - base.x, a.z - base.z),
    );
    best = far.find(s => s.z > -26) ?? far[0];
  }
  return {
    x: best.x + (Math.random() - 0.5) * 1.1,
    z: best.z + (Math.random() - 0.5) * 1.1,
  };
}
