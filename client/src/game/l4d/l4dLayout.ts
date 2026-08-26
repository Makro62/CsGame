/** Fixed campaign path. Chapter changes intensity, never the geometry. */

export const L4D_SAFE_Z = -32;
export const L4D_FINISH_Z = 28;
export const L4D_HALL_HALF = 2.1;
export const L4D_BOUNDS = { minX: -10, maxX: 15, minZ: -40, maxZ: 38 } as const;

export function l4dFinishZ(_chapter?: number) {
  return L4D_FINISH_Z;
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
