import { MAP_BOUNDARY } from "@cs-game/shared";
import {
  isPointBlocked,
  pushOutOfObstacles,
  resolveTeamSpawn,
  stepToward,
} from "./offlineCombat";
import { useGameStore } from "../../stores/useGameStore";

interface Point2D {
  x: number;
  z: number;
}

const CELL = 1;
const ORIGIN_X = MAP_BOUNDARY.minX + 1;
const ORIGIN_Z = MAP_BOUNDARY.minZ + 1;
const GRID_W = Math.floor((MAP_BOUNDARY.maxX - 1 - ORIGIN_X) / CELL) + 1;
const GRID_H = Math.floor((MAP_BOUNDARY.maxZ - 1 - ORIGIN_Z) / CELL) + 1;

let cachedWalkableMap = "";
let WALKABLE: boolean[][] = [];

function currentNavMapId(): string {
  try {
    return useGameStore.getState().currentMap || "container_yard";
  } catch {
    return "container_yard";
  }
}

function ensureWalkable(): boolean[][] {
  const mapId = currentNavMapId();
  if (WALKABLE.length && cachedWalkableMap === mapId) return WALKABLE;
  cachedWalkableMap = mapId;
  pathCache.clear();
  WALKABLE = buildWalkable();
  return WALKABLE;
}

function cellWorld(i: number, j: number): Point2D {
  return { x: ORIGIN_X + i * CELL, z: ORIGIN_Z + j * CELL };
}

function worldCell(x: number, z: number): { i: number; j: number } {
  const i = Math.max(0, Math.min(GRID_W - 1, Math.round((x - ORIGIN_X) / CELL)));
  const j = Math.max(0, Math.min(GRID_H - 1, Math.round((z - ORIGIN_Z) / CELL)));
  return { i, j };
}

function buildWalkable(): boolean[][] {
  const grid: boolean[][] = [];
  for (let i = 0; i < GRID_W; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_H; j++) {
      grid[i][j] = !isPointBlocked(cellWorld(i, j));
    }
  }
  return grid;
}

function nearestWalkableCell(i: number, j: number, walkable: boolean[][]): { i: number; j: number } {
  if (walkable[i]?.[j]) return { i, j };
  for (let r = 1; r <= 8; r++) {
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const ni = i + di;
        const nj = j + dj;
        if (walkable[ni]?.[nj]) return { i: ni, j: nj };
      }
    }
  }
  return { i, j };
}

const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414],
];

function octile(ai: number, aj: number, bi: number, bj: number): number {
  const dx = Math.abs(ai - bi);
  const dz = Math.abs(aj - bj);
  return Math.max(dx, dz) + (1.414 - 1) * Math.min(dx, dz);
}

const pathCache = new Map<string, Point2D[]>();

function cacheKey(a: { i: number; j: number }, b: { i: number; j: number }): string {
  return `${a.i},${a.j}>${b.i},${b.j}`;
}

/** Grid A* on the current 5v5 map. Paths are cached; blocked cells are never returned. */
export function findGridPath(from: Point2D, to: Point2D): Point2D[] {
  const walkable = ensureWalkable();
  const start = nearestWalkableCell(worldCell(from.x, from.z).i, worldCell(from.x, from.z).j, walkable);
  const goal = nearestWalkableCell(worldCell(to.x, to.z).i, worldCell(to.x, to.z).j, walkable);
  const key = cacheKey(start, goal);
  const cached = pathCache.get(key);
  if (cached) return cached;
  if (pathCache.size > 240) pathCache.clear();

  if (start.i === goal.i && start.j === goal.j) {
    const trivial = [cellWorld(goal.i, goal.j)];
    pathCache.set(key, trivial);
    return trivial;
  }

  const open: number[] = [];
  const g = new Float32Array(GRID_W * GRID_H);
  const came = new Int32Array(GRID_W * GRID_H);
  g.fill(Infinity);
  came.fill(-1);
  const idx = (i: number, j: number) => i * GRID_H + j;
  const startIdx = idx(start.i, start.j);
  g[startIdx] = 0;
  open.push(startIdx);

  let found = -1;
  const goalIdx = idx(goal.i, goal.j);
  let guard = 0;
  while (open.length && guard++ < 2500) {
    let best = 0;
    let bestF = Infinity;
    for (let n = 0; n < open.length; n++) {
      const id = open[n];
      const ci = Math.floor(id / GRID_H);
      const cj = id % GRID_H;
      const f = g[id] + octile(ci, cj, goal.i, goal.j);
      if (f < bestF) {
        bestF = f;
        best = n;
      }
    }
    const current = open.splice(best, 1)[0];
    if (current === goalIdx) {
      found = current;
      break;
    }
    const ci = Math.floor(current / GRID_H);
    const cj = current % GRID_H;
    for (const [di, dj, cost] of NEIGHBORS) {
      const ni = ci + di;
      const nj = cj + dj;
      if (!walkable[ni]?.[nj]) continue;
      if (di !== 0 && dj !== 0 && (!walkable[ci + di]?.[cj] || !walkable[ci]?.[cj + dj])) continue;
      const nid = idx(ni, nj);
      const ng = g[current] + cost;
      if (ng >= g[nid]) continue;
      g[nid] = ng;
      came[nid] = current;
      if (!open.includes(nid)) open.push(nid);
    }
  }

  const path: Point2D[] = [];
  if (found >= 0) {
    let cur = found;
    while (cur >= 0) {
      const ci = Math.floor(cur / GRID_H);
      const cj = cur % GRID_H;
      path.push(cellWorld(ci, cj));
      cur = came[cur];
    }
    path.reverse();
  } else {
    path.push(cellWorld(goal.i, goal.j));
  }

  pathCache.set(key, path);
  return path;
}

interface FollowState {
  path: Point2D[];
  i: number;
  gx: number;
  gz: number;
  stuck: number;
  lastX: number;
  lastZ: number;
}

const follows = new Map<string, FollowState>();

export function resetBotNav(id?: string) {
  if (id) follows.delete(id);
  else {
    follows.clear();
    pathCache.clear();
  }
}

function goalChanged(st: FollowState, goal: Point2D): boolean {
  return Math.hypot(st.gx - goal.x, st.gz - goal.z) > 1.2;
}

function applyFlankSpread(id: string, wp: Point2D, goal: Point2D): Point2D {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const factor = ((hash % 5) - 2) * 0.45; // -0.9m .. +0.9m tactical flanking spread
  if (Math.abs(factor) < 0.1) return wp;
  const dx = goal.x - wp.x;
  const dz = goal.z - wp.z;
  const len = Math.hypot(dx, dz);
  if (len < 1.0) return wp;
  const px = (-dz / len) * factor;
  const pz = (dx / len) * factor;
  const flanked = { x: wp.x + px, z: wp.z + pz };
  if (isPointBlocked(flanked)) return wp;
  return flanked;
}

/**
 * Walk `id` toward `goal` along a cached grid path.
 * Repaths if the destination moved or the bot has been stuck against a wall.
 */
export function navigateTo(
  id: string,
  from: Point2D,
  goal: Point2D,
  speed: number,
  dt: number,
): Point2D {
  const origin = pushOutOfObstacles(from);
  if (Math.hypot(goal.x - origin.x, goal.z - origin.z) < 0.7) return origin;

  let st = follows.get(id);
  if (!st || goalChanged(st, goal) || st.path.length === 0) {
    st = {
      path: findGridPath(origin, goal),
      i: 0,
      gx: goal.x,
      gz: goal.z,
      stuck: 0,
      lastX: origin.x,
      lastZ: origin.z,
    };
    follows.set(id, st);
  }

  while (st.i < st.path.length - 1) {
    const wp = st.path[st.i];
    if (Math.hypot(wp.x - origin.x, wp.z - origin.z) < 1.15) st.i += 1;
    else break;
  }

  const rawWp = st.path[Math.min(st.i, st.path.length - 1)] ?? goal;
  const wp = applyFlankSpread(id, rawWp, goal);
  const next = stepToward(origin, wp, speed, dt);
  const moved = Math.hypot(next.x - st.lastX, next.z - st.lastZ);
  if (moved < 0.04) st.stuck += dt;
  else st.stuck = 0;
  st.lastX = next.x;
  st.lastZ = next.z;

  if (st.stuck > 0.45) {
    st.stuck = 0;
    st.i = Math.min(st.i + 1, st.path.length - 1);
    st.path = findGridPath(pushOutOfObstacles(next), goal);
    st.i = 0;
  }

  return next;
}

export function spawnJitter(team: "T" | "CT", mapId?: string): Point2D {
  let resolved = mapId;
  if (!resolved) {
    try {
      resolved = useGameStore.getState().currentMap || "container_yard";
    } catch {
      resolved = "container_yard";
    }
  }
  const base = resolveTeamSpawn(resolved, team);
  for (let n = 0; n < 14; n++) {
    const p = pushOutOfObstacles({
      x: base.x + (Math.random() - 0.5) * 4,
      z: base.z + (Math.random() - 0.5) * 5,
    });
    if (!isPointBlocked(p)) return p;
  }
  return pushOutOfObstacles(base);
}
