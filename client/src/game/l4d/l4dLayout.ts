/** Linear campaign: clear one area to unlock the next (gates at hallway openings). */

export type L4DRect = { minX: number; maxX: number; minZ: number; maxZ: number };

export const L4D_SAFE_Z = -52;
export const L4D_FINISH_Z = 57;
export const L4D_HALL_HALF = 5;
export const L4D_WALL_T = 0.9;
export const L4D_DOOR_W = L4D_HALL_HALF * 2;
export const L4D_BOUNDS = { minX: -20, maxX: 32, minZ: -64, maxZ: 74 } as const;

export const L4D_TRAVERSE_Z = -42;
export const L4D_RESCUE_RADIUS = 10;
export const L4D_CAMPAIGN_WEAPON = "ak47" as const;
export const L4D_WALK_RADIUS = 0.55;

/** Wall-center rectangles — visual map and walkable interiors share this. */
export const L4D_ROOMS = {
  safe: { minX: -8, maxX: 8, minZ: -60, maxZ: -44 },
  hall_a: { minX: -5, maxX: 5, minZ: -44, maxZ: -14 },
  warehouse: { minX: -16, maxX: 16, minZ: -14, maxZ: 14 },
  hall_b: { minX: -5, maxX: 5, minZ: 14, maxZ: 44 },
  side: { minX: 5, maxX: 28, minZ: 20, maxZ: 36 },
  rescue: { minX: -16, maxX: 16, minZ: 44, maxZ: 70 },
} as const;

/** Door slabs bridging rooms with generous overlap so clamp does not trap the player in wall thickness or dead zones. */
export const L4D_CONNECTORS: Array<{ needs: number; rect: L4DRect }> = [
  // safe (-60..-44) -> hall_a (-44..-14) doorway opening at x in [-5, 5]
  { needs: 1, rect: { minX: -4.55, maxX: 4.55, minZ: -47.0, maxZ: -41.0 } },
  // hall_a (-44..-14) -> warehouse (-14..14) doorway opening at x in [-5, 5]
  { needs: 2, rect: { minX: -4.55, maxX: 4.55, minZ: -17.0, maxZ: -11.0 } },
  // warehouse (-14..14) -> hall_b (14..44) doorway opening at x in [-5, 5]
  { needs: 3, rect: { minX: -4.55, maxX: 4.55, minZ: 11.0, maxZ: 17.0 } },
  // hall_b (x: -5..5, z: 14..44) -> side room (x: 5..28, z: 20..36) opening at z around 28 (w = 4.2)
  { needs: 3, rect: { minX: 2.0, maxX: 9.0, minZ: 25.5, maxZ: 30.5 } },
  // hall_b (14..44) -> rescue pad (44..70) doorway opening at x in [-5, 5]
  { needs: 4, rect: { minX: -4.55, maxX: 4.55, minZ: 41.0, maxZ: 47.0 } },
];

export function l4dFinishZ(_chapter?: number) {
  return L4D_FINISH_Z;
}

export type L4DZone = {
  id: string;
  name: string;
  bounds: L4DRect;
  /** Locked door at this Z until the previous zone is cleared. */
  gateZ: number;
  zombieCount: number;
  spawns: Array<{ x: number; z: number }>;
};

export const L4D_ZONES: readonly L4DZone[] = [
  {
    id: "hall_a",
    name: "Koridor Awal",
    bounds: { ...L4D_ROOMS.hall_a },
    gateZ: L4D_ROOMS.hall_a.maxZ,
    zombieCount: 10,
    spawns: [
      { x: 0, z: -36 },
      { x: -2.4, z: -30 },
      { x: 2.4, z: -24 },
      { x: 0, z: -18 },
    ],
  },
  {
    id: "warehouse",
    name: "Gudang",
    bounds: { ...L4D_ROOMS.warehouse },
    gateZ: L4D_ROOMS.warehouse.maxZ,
    zombieCount: 14,
    spawns: [
      { x: -10, z: -6 },
      { x: 10, z: -4 },
      { x: -8, z: 4 },
      { x: 8, z: 2 },
      { x: 0, z: 0 },
    ],
  },
  {
    id: "hall_b",
    name: "Lorong Dalam",
    bounds: { minX: -5, maxX: 28, minZ: 14, maxZ: 44 },
    gateZ: L4D_ROOMS.hall_b.maxZ,
    zombieCount: 16,
    spawns: [
      { x: 0, z: 18 },
      { x: 0, z: 28 },
      { x: 14, z: 26 },
      { x: 20, z: 30 },
      { x: 0, z: 38 },
    ],
  },
  {
    id: "rescue",
    name: "Pad Evakuasi",
    bounds: { ...L4D_ROOMS.rescue },
    gateZ: L4D_ROOMS.rescue.maxZ,
    zombieCount: 18,
    spawns: [
      { x: 0, z: 48 },
      { x: -10, z: 54 },
      { x: 10, z: 60 },
      { x: 0, z: 52 },
      { x: -8, z: 64 },
    ],
  },
];

export function getL4DZone(index: number): L4DZone {
  return L4D_ZONES[Math.max(0, Math.min(L4D_ZONES.length - 1, index))];
}

/** How far +Z squads may walk; locked gates sit just past this. */
export function l4dUnlockedMaxZ(unlockedZones: number): number {
  if (unlockedZones <= 0) return L4D_ROOMS.safe.maxZ;
  if (unlockedZones >= L4D_ZONES.length) return L4D_BOUNDS.maxZ;
  return L4D_ZONES[unlockedZones - 1].gateZ - 0.55;
}

export function pickL4DZoneSpawn(zoneIndex: number): { x: number; z: number } {
  const zone = getL4DZone(zoneIndex);
  const s = zone.spawns[Math.floor(Math.random() * zone.spawns.length)] ?? zone.spawns[0];
  return {
    x: s.x + (Math.random() - 0.5) * 0.8,
    z: s.z + (Math.random() - 0.5) * 0.8,
  };
}

export type L4DCover = L4DRect;

function coverAt(x: number, z: number, s: number): L4DCover {
  const h = s / 2;
  return { minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h };
}

/** Crates that infected/bots should slide around (player uses Rapier + walkable clamp). */
export const L4D_COVER: L4DCover[] = [
  coverAt(-12, -6, 1.6),
  coverAt(-10, 4, 1.4),
  coverAt(12, -8, 1.8),
  coverAt(10, 6, 1.5),
  coverAt(0, 0, 1.3),
  coverAt(-5.2, -8.2, 1.3),
  coverAt(18, 24, 1.5),
  coverAt(24, 32, 1.2),
  coverAt(13, 28, 1.1),
  coverAt(-12, 48, 1.6),
  coverAt(12, 48, 1.4),
  coverAt(-12, 64, 1.3),
  coverAt(12, 64, 1.5),
];

export function pushOutL4D(x: number, z: number, radius: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pass = 0; pass < 3; pass++) {
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
  }
  return { x: px, z: pz };
}

function containsRect(r: L4DRect, x: number, z: number, pad: number): boolean {
  return x >= r.minX + pad && x <= r.maxX - pad && z >= r.minZ + pad && z <= r.maxZ - pad;
}

function clampToRect(x: number, z: number, r: L4DRect, pad: number): { x: number; z: number } {
  return {
    x: Math.max(r.minX + pad, Math.min(r.maxX - pad, x)),
    z: Math.max(r.minZ + pad, Math.min(r.maxZ - pad, z)),
  };
}

function innerRoom(r: L4DRect): L4DRect {
  const pad = L4D_WALL_T / 2;
  return {
    minX: r.minX + pad,
    maxX: r.maxX - pad,
    minZ: r.minZ + pad,
    maxZ: r.maxZ - pad,
  };
}

export function l4dWalkableRooms(unlockedZones: number): L4DRect[] {
  const rooms: L4DRect[] = [innerRoom(L4D_ROOMS.safe)];
  if (unlockedZones >= 1) rooms.push(innerRoom(L4D_ROOMS.hall_a));
  if (unlockedZones >= 2) rooms.push(innerRoom(L4D_ROOMS.warehouse));
  if (unlockedZones >= 3) {
    rooms.push(innerRoom(L4D_ROOMS.hall_b));
    rooms.push(innerRoom(L4D_ROOMS.side));
  }
  if (unlockedZones >= 4) rooms.push(innerRoom(L4D_ROOMS.rescue));
  for (const c of L4D_CONNECTORS) {
    if (unlockedZones >= c.needs) rooms.push(c.rect);
  }
  return rooms;
}

/** Snap XZ into unlocked interiors so nothing walks through walls. */
export function clampL4DWalkable(
  x: number,
  z: number,
  unlockedZones = L4D_ZONES.length,
  radius = L4D_WALK_RADIUS,
): { x: number; z: number } {
  const rooms = l4dWalkableRooms(unlockedZones);
  const maxZ = l4dUnlockedMaxZ(unlockedZones);
  let nz = Math.min(z, maxZ);
  if (rooms.some(r => containsRect(r, x, nz, radius))) {
    return pushOutL4D(x, nz, radius);
  }
  let best = { x, z: nz };
  let bestD = Infinity;
  for (const r of rooms) {
    const c = clampToRect(x, nz, r, radius);
    const d = Math.hypot(c.x - x, c.z - nz);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return pushOutL4D(best.x, best.z, radius);
}

/** Open floors along the campaign — never inside walls or the starting safe room. */
export const L4D_OPEN_SPAWNS: Array<{ x: number; z: number }> = [
  { x: 0, z: -36 },
  { x: -2.4, z: -30 },
  { x: 2.4, z: -24 },
  { x: 0, z: -18 },
  { x: -10, z: -6 },
  { x: 10, z: -4 },
  { x: -8, z: 4 },
  { x: 8, z: 2 },
  { x: 0, z: 0 },
  { x: 0, z: 18 },
  { x: 0, z: 28 },
  { x: 14, z: 26 },
  { x: 20, z: 30 },
  { x: 0, z: 38 },
  { x: 0, z: 48 },
  { x: -10, z: 54 },
  { x: 10, z: 60 },
  { x: 0, z: 52 },
];

export function clampL4DInfected(
  x: number,
  z: number,
  unlockedZones = L4D_ZONES.length,
): { x: number; z: number } {
  return clampL4DWalkable(x, z, unlockedZones, 0.45);
}

export function l4dRoughLos(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  unlockedZones = L4D_ZONES.length,
): boolean {
  const steps = 10;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const c = clampL4DWalkable(x, z, unlockedZones, 0.35);
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
  const minZ = L4D_ROOMS.hall_a.minZ + 1;
  let best = L4D_OPEN_SPAWNS[0];
  let bestScore = -1;
  for (const s of L4D_OPEN_SPAWNS) {
    if (s.z < minZ) continue;
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
    best = far.find(s => s.z > minZ) ?? far[0];
  }
  return {
    x: best.x + (Math.random() - 0.5) * 1.1,
    z: best.z + (Math.random() - 0.5) * 1.1,
  };
}
