/** Operation Blackout — Modular Rooms, Buy Doors & Barricades */
import { useZombieStore } from "../../stores/useZombieStore";

export type SurvivalObstacle = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  kind: "wall" | "crate" | "barrel";
};

export type SurvivalDoor = {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  cost: number;
  toRoom: string;
};

export const SURVIVAL_BOUNDS = { minX: -22, maxX: 22, minZ: -22, maxZ: 22 } as const;

// Start in the south courtyard — small, claustrophobic
export const SURVIVAL_SPAWNS: Array<{ x: number; z: number }> = [
  { x: 0, z: 16 },
  { x: -2, z: 18 },
  { x: 2, z: 18 },
  { x: 0, z: 14 },
];

// ─── Buy Doors (750–2000 pts) ───────────────────────────────────
export const SURVIVAL_DOORS: SurvivalDoor[] = [
  { id: "door_lab", x: 0, z: 8, w: 4, h: 3, cost: 750, toRoom: "Lab Bawah Tanah" },
  { id: "door_armory", x: -10, z: 0, w: 0.3, h: 3, cost: 1250, toRoom: "Gudang Senjata" },
  { id: "door_catwalk", x: 10, z: -8, w: 4, h: 3, cost: 1500, toRoom: "Catwalk Lantai 2" },
  { id: "door_bunker", x: 0, z: -12, w: 4, h: 3, cost: 2000, toRoom: "Bunker Utara" },
];

// ─── Barricade Windows (4 sides, 6 planks each) ─────────────────
export const SURVIVAL_BARRICADES = [
  { id: "win_north", x: 0, z: -22, w: 6, h: 2.5 },
  { id: "win_south", x: 0, z: 22, w: 6, h: 2.5 },
  { id: "win_east", x: 22, z: 0, w: 2.5, h: 6 },
  { id: "win_west", x: -22, z: 0, w: 2.5, h: 6 },
] as const;

// ─── Rooms (TDD §5) ───────────────────────────────────────────
export type Room = {
  id: string;
  name: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  unlockCost: number;
  isStartingRoom: boolean;
};

export const SURVIVAL_ROOMS: Room[] = [
  { id: "spawn_hall", name: "Main Hall", bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, unlockCost: 0, isStartingRoom: true },
  { id: "armory", name: "Armory", bounds: { minX: 10, maxX: 25, minZ: -10, maxZ: 10 }, unlockCost: 750, isStartingRoom: false },
  { id: "underground_lab", name: "Lab Bawah Tanah", bounds: { minX: -10, maxX: 10, minZ: -25, maxZ: -10 }, unlockCost: 1000, isStartingRoom: false },
  { id: "catwalk", name: "Catwalk", bounds: { minX: -10, maxX: 10, minZ: 10, maxZ: 25 }, unlockCost: 1500, isStartingRoom: false },
  { id: "bunker", name: "Bunker Utara", bounds: { minX: -25, maxX: -10, minZ: -10, maxZ: 10 }, unlockCost: 2000, isStartingRoom: false },
];

// ─── Survivor.io Campaign Stage System ─────────────────────────
export interface SurvivalStage {
  id: number;
  name: string;
  subtitle: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  gateZ?: number;
  spawns: Array<{ x: number; z: number }>;
}

export const SURVIVAL_STAGES: Record<number, SurvivalStage> = {
  1: {
    id: 1,
    name: "Sektor 1: Courtyard Kota",
    subtitle: "Kalahkan zombie awal dan bersiap membuka Gerbang Sektor 2",
    bounds: { minX: -22, maxX: 22, minZ: -6, maxZ: 22 },
    gateZ: -6,
    spawns: [
      { x: 0, z: 16 },
      { x: -8, z: 12 },
      { x: 8, z: 12 },
      { x: -14, z: 6 },
      { x: 14, z: 6 },
      { x: 0, z: 2 },
    ],
  },
  2: {
    id: 2,
    name: "Sektor 2: Lab Bio-Tech & Gudang",
    subtitle: "Map baru terbuka! Jelajahi lab dan hancurkan zombie mutagen",
    bounds: { minX: -22, maxX: 22, minZ: -42, maxZ: 22 },
    gateZ: -42,
    spawns: [
      { x: 0, z: -14 },
      { x: -10, z: -20 },
      { x: 10, z: -20 },
      { x: -12, z: -30 },
      { x: 12, z: -30 },
      { x: 0, z: -36 },
    ],
  },
  3: {
    id: 3,
    name: "Sektor 3: Bunker Evakuasi & Helipad",
    subtitle: "Zona pendaratan terakhir, kalahkan Boss untuk evakuasi",
    bounds: { minX: -22, maxX: 22, minZ: -78, maxZ: 22 },
    gateZ: -78,
    spawns: [
      { x: 0, z: -48 },
      { x: -12, z: -56 },
      { x: 12, z: -56 },
      { x: -10, z: -66 },
      { x: 10, z: -66 },
      { x: 0, z: -72 },
    ],
  },
};

export function getSurvivalStageBounds(unlockedStages = 1): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (unlockedStages >= 3) return SURVIVAL_STAGES[3].bounds;
  if (unlockedStages === 2) return SURVIVAL_STAGES[2].bounds;
  return SURVIVAL_STAGES[1].bounds;
}

export function getSpawnsForUnlockedStages(unlockedStages = 1): Array<{ x: number; z: number }> {
  const list: Array<{ x: number; z: number }> = [...SURVIVAL_STAGES[1].spawns];
  if (unlockedStages >= 2) list.push(...SURVIVAL_STAGES[2].spawns);
  if (unlockedStages >= 3) list.push(...SURVIVAL_STAGES[3].spawns);
  return list;
}

export const DOOR_LOCATIONS = SURVIVAL_DOORS.map((d) => ({
  doorId: d.id,
  position: [d.x, d.h / 2, d.z] as [number, number, number],
  rotation: [0, d.w < 1 ? Math.PI / 2 : 0, 0] as [number, number, number],
  cost: d.cost,
}));

function wall(a: number, b: number, c: number, d: number): SurvivalObstacle {
  return {
    minX: Math.min(a, b),
    maxX: Math.max(a, b),
    minZ: Math.min(c, d),
    maxZ: Math.max(c, d),
    kind: "wall",
  };
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

/** Base — always walkable: starting courtyard + perimeter (gaps for doors/windows) */
export const SURVIVAL_OBSTACLES: SurvivalObstacle[] = [
  // Perimeter with door/window gaps (4 gates) — 0.8 thick, correct AABB
  wall(-22.4, -21.6, -22, -2), wall(-22.4, -21.6, 2, 22), // west
  wall(21.6, 22.4, -22, -2), wall(21.6, 22.4, 2, 22), // east
  wall(-18, -2, -22.4, -21.6), wall(2, 18, -22.4, -21.6), // north
  wall(-18, -2, 21.6, 22.4), wall(2, 18, 21.6, 22.4), // south
  // Starting room internal — low walls for kiting, center open
  wall(-6, 6, -6, -5.2), wall(-6, 6, 5.2, 6), // north/south low walls
  crate(-4, 4, 0.7), crate(4, -4, 0.7),
  barrel(0, 8, 0.5), // center
];

/** Room obstacles — only active when door unlocked */
const LAB_OBSTACLES: SurvivalObstacle[] = [
  wall(-12, -8, -8, -7.2), wall(-12, -8, -1, 8), wall(8, 12, -8, -7.2), wall(12, 16, -1, 8),
  crate(-10, -10, 0.7), crate(10, -14, 0.7), barrel(-8, -12, 0.5),
];
const ARMORY_OBSTACLES: SurvivalObstacle[] = [
  wall(10.5, 11.2, -6, 6),
  wall(12, 22, -8, -7.2), wall(12, 22, 7.2, 8),
  crate(18, -2, 0.7), crate(15, 3, 0.7),
  barrel(20, 0, 0.42),
];
const CATWALK_OBSTACLES: SurvivalObstacle[] = [
  wall(-8, 8, 10.5, 11.2), wall(-8, 8, 23.8, 24.5),
  crate(-5, 17, 0.7), crate(5, 21, 0.7),
];
const BUNKER_OBSTACLES: SurvivalObstacle[] = [
  ...uBunker(-16, 0),
  crate(-18, 3, 0.7), crate(-14, -3, 0.7), barrel(-12, 0, 0.42),
];

// ─── Stage Gates & Campaign Sector Obstacles ────────────────────
export const GATE1_OBSTACLE: SurvivalObstacle = wall(-4.5, 4.5, -6.5, -5.5);
export const GATE2_OBSTACLE: SurvivalObstacle = wall(-4.5, 4.5, -42.5, -41.5);

export const STAGE2_OBSTACLES: SurvivalObstacle[] = [
  // Sector 2 Bio-Tech Lab internal cover
  crate(-8, -16, 1.0),
  crate(8, -16, 1.0),
  barrel(-12, -24, 0.6),
  barrel(12, -24, 0.6),
  wall(-6, -2, -28, -27),
  wall(2, 6, -28, -27),
  crate(0, -34, 1.2),
];

export const STAGE3_OBSTACLES: SurvivalObstacle[] = [
  // Sector 3 Helipad & Bunker cover
  crate(-14, -52, 1.4),
  crate(14, -52, 1.4),
  wall(-16, -10, -64, -63),
  wall(10, 16, -64, -63),
  crate(-8, -72, 1.0),
  crate(8, -72, 1.0),
];

export function getSurvivalObstacles(
  unlockedDoors: string[] = [],
  gate1Open?: boolean,
  gate2Open?: boolean,
): SurvivalObstacle[] {
  let g1 = gate1Open;
  let g2 = gate2Open;
  if (g1 === undefined || g2 === undefined) {
    try {
      const s = useZombieStore.getState();
      if (g1 === undefined) g1 = s.gate1Open ?? false;
      if (g2 === undefined) g2 = s.gate2Open ?? false;
    } catch {
      if (g1 === undefined) g1 = false;
      if (g2 === undefined) g2 = false;
    }
  }

  let obs = [...SURVIVAL_OBSTACLES];
  if (unlockedDoors.includes("door_lab")) obs = obs.concat(LAB_OBSTACLES);
  else obs.push(wall(-2, 2, 8, 9)); // closed door
  if (unlockedDoors.includes("door_armory")) obs = obs.concat(ARMORY_OBSTACLES);
  else obs.push(wall(-10.15, -9.85, -0.5, 0.5));
  if (unlockedDoors.includes("door_catwalk")) obs = obs.concat(CATWALK_OBSTACLES);
  else obs.push(wall(9, 10, -8, -7));
  if (unlockedDoors.includes("door_bunker")) obs = obs.concat(BUNKER_OBSTACLES);
  else obs.push(wall(-2, 2, -12, -11));

  // Gate 1 (Courtyard -> Bio-Lab at Z = -6)
  if (!g1) {
    obs.push(GATE1_OBSTACLE);
  } else {
    obs = obs.concat(STAGE2_OBSTACLES);
  }

  // Gate 2 (Bio-Lab -> Helipad at Z = -42)
  if (!g2) {
    obs.push(GATE2_OBSTACLE);
  } else {
    obs = obs.concat(STAGE3_OBSTACLES);
  }

  return obs;
}

export function pushOutSurvival(x: number, z: number, radius: number, obstacles?: SurvivalObstacle[]): { x: number; z: number } {
  const obsList = obstacles ?? (() => {
    try {
      const s = useZombieStore.getState();
      return getSurvivalObstacles(s.unlockedDoors, s.gate1Open, s.gate2Open);
    } catch {
      return SURVIVAL_OBSTACLES;
    }
  })();
  let px = x;
  let pz = z;
  for (const obs of obsList) {
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

export function survivalLineOfSight(ox: number, oz: number, tx: number, tz: number, obstacles?: SurvivalObstacle[]): boolean {
  const obsList = obstacles ?? (() => {
    try {
      const s = useZombieStore.getState();
      return getSurvivalObstacles(s.unlockedDoors, s.gate1Open, s.gate2Open);
    } catch {
      return SURVIVAL_OBSTACLES;
    }
  })();
  const dx = tx - ox;
  const dz = tz - oz;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const ndx = dx / dist;
  const ndz = dz / dist;
  for (const obs of obsList) {
    const t = slabEnter(ox, oz, ndx, ndz, obs, dist);
    if (t !== null && t < dist - 0.05) return false;
  }
  return true;
}

function nearestBarricadeId(
  x: number,
  z: number,
  barricades: Record<string, number>,
  maxDist: number,
  plankOk: (planks: number) => boolean,
  missingPlanks = 0,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const w of SURVIVAL_BARRICADES) {
    const planks = barricades[w.id] ?? missingPlanks;
    if (!plankOk(planks)) continue;
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < bestDist) {
      bestDist = d;
      best = w.id;
    }
  }
  return bestDist < maxDist ? best : null;
}

/** Closest window that still has planks (zombies attack these). */
export function findNearestBarricade(
  x: number,
  z: number,
  barricades: Record<string, number>,
  maxDist = 4,
): string | null {
  return nearestBarricadeId(x, z, barricades, maxDist, (planks) => planks > 0, 6);
}

/** Closest window the player can repair (missing at least one plank). */
export function findRepairableBarricade(
  x: number,
  z: number,
  barricades: Record<string, number>,
  maxDist = 2.5,
): string | null {
  return nearestBarricadeId(x, z, barricades, maxDist, (planks) => planks < 6, 6);
}

export function findNearestDoor(
  x: number,
  z: number,
  unlockedDoors: string[] = [],
  maxDist = 2.5,
): SurvivalDoor | null {
  let best: SurvivalDoor | null = null;
  let bestDist = Infinity;
  for (const d of SURVIVAL_DOORS) {
    if (unlockedDoors.includes(d.id)) continue;
    const dist = Math.hypot(x - d.x, z - d.z);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return bestDist < maxDist ? best : null;
}

export function survivalWallDistance(ox: number, oz: number, dx: number, dz: number, maxDist = 70, obstacles?: SurvivalObstacle[]): number {
  const obsList = obstacles ?? (() => {
    try {
      const s = useZombieStore.getState();
      return getSurvivalObstacles(s.unlockedDoors, s.gate1Open, s.gate2Open);
    } catch {
      return SURVIVAL_OBSTACLES;
    }
  })();
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return maxDist;
  const ndx = dx / len;
  const ndz = dz / len;
  let best = maxDist;
  for (const obs of obsList) {
    const t = slabEnter(ox, oz, ndx, ndz, obs, best);
    if (t !== null && t > 0.15 && t < best) best = t;
  }
  return best;
}
