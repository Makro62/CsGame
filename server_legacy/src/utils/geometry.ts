// ─── Shared geometry helpers ──────────────────────────────────────
// Used by GameRoom (grenade bouncing) and WeaponManager (hitscan raytrace).

export interface Box {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

/** Ray-vs-AABB slab method. Returns entry t (≥0) or null if no hit. */
export function rayVsBox(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  box: Box,
): number | null {
  let tmin = 0;
  let tmax = Infinity;

  const axes = [
    [dx, ox, box.minX, box.maxX] as const,
    [dy, oy, box.minY, box.maxY] as const,
    [dz, oz, box.minZ, box.maxZ] as const,
  ];

  for (const [d, o, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmax >= 0 ? Math.max(tmin, 0) : null;
}
