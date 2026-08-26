export type HordeAgent = { id: string; x: number; z: number };

export const SURVIVAL_HORDE_SEP = { queryRadius: 2, radius: 1.5, strength: 3 } as const;
export const L4D_HORDE_SEP = { queryRadius: 2, radius: 1.4, strength: 1.5 } as const;

/** Push nearby agents apart. Same formula for survival zombies and L4D infected. */
export function hordeSeparation(
  self: HordeAgent,
  neighbors: Iterable<HordeAgent>,
  radius: number,
  strength: number,
): { x: number; z: number } {
  let x = 0;
  let z = 0;
  for (const o of neighbors) {
    if (o.id === self.id) continue;
    const ndx = self.x - o.x;
    const ndz = self.z - o.z;
    const nd = Math.hypot(ndx, ndz);
    if (nd < radius && nd > 0) {
      const push = (radius - nd) * strength;
      x += (ndx / nd) * push;
      z += (ndz / nd) * push;
    }
  }
  return { x, z };
}

/** Same formula, resolving spatial-grid ids without allocating a neighbor list. */
export function hordeSeparationFromIds(
  self: HordeAgent,
  ids: Iterable<string>,
  getAgent: (id: string) => HordeAgent | undefined | null,
  radius: number,
  strength: number,
): { x: number; z: number } {
  function* neighbors() {
    for (const id of ids) {
      const o = getAgent(id);
      if (o) yield o;
    }
  }
  return hordeSeparation(self, neighbors(), radius, strength);
}

export function chaseStep(
  self: { x: number; z: number },
  target: { x: number; z: number },
  speed: number,
  sep: { x: number; z: number },
  dt: number,
): { x: number; z: number; rotationY: number; dist: number } {
  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) {
    return { x: self.x, z: self.z, rotationY: Math.atan2(dx, dz), dist };
  }
  return {
    x: self.x + ((dx / dist) * speed + sep.x) * dt,
    z: self.z + ((dz / dist) * speed + sep.z) * dt,
    rotationY: Math.atan2(dx, dz),
    dist,
  };
}
