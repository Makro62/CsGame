/**
 * Seed-based 5v5 bomb-defuse layout. Same seed → same map.
 */
import { createRng, pick, randRange, randInt } from "./proceduralRng";
import type { MapObstacle, ObstacleMaterial } from "./index";

export interface ProceduralSpawnPoint {
  x: number;
  z: number;
}

export interface ProceduralBombSite {
  x: number;
  z: number;
  radius: number;
}

export interface ProceduralMapResult {
  obstacles: MapObstacle[];
  spawns: { T: ProceduralSpawnPoint; CT: ProceduralSpawnPoint };
  bombSites: { A: ProceduralBombSite; B: ProceduralBombSite };
  callouts: { id: string; label: string; x: number; z: number }[];
  seed: number;
}

function procBox(
  id: string,
  material: ObstacleMaterial,
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
): MapObstacle {
  return {
    id,
    shape: "box",
    material,
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    cx, cy, cz,
    sx, sy, sz,
  };
}

function procCylinder(
  id: string,
  material: ObstacleMaterial,
  cx: number, cy: number, cz: number,
  radius: number, height: number,
): MapObstacle {
  return {
    id,
    shape: "cylinder",
    material,
    minX: cx - radius,
    maxX: cx + radius,
    minY: cy - height / 2,
    maxY: cy + height / 2,
    minZ: cz - radius,
    maxZ: cz + radius,
    cx, cy, cz,
    radius,
    height,
  };
}

export function generate5v5Map(seed: number, difficulty: "easy" | "medium" | "hard" = "medium"): ProceduralMapResult {
  const rng = createRng(seed);
  const W = 80;
  const H = 100;
  const obstacles: MapObstacle[] = [];
  const callouts: { id: string; label: string; x: number; z: number }[] = [];

  obstacles.push(procBox("wall_north", "concrete", 0, 4, -H / 2, W, 8, 0.8));
  obstacles.push(procBox("wall_south", "concrete", 0, 4, H / 2, W, 8, 0.8));
  obstacles.push(procBox("wall_west", "concrete", -W / 2, 4, 0, 0.8, 8, H));
  obstacles.push(procBox("wall_east", "concrete", W / 2, 4, 0, 0.8, 8, H));

  const tSpawnX = -W / 2 + 10;
  const ctSpawnX = W / 2 - 10;
  obstacles.push(procBox("t_spawn_wall_n", "metal", tSpawnX, 1.3, -8, 3, 2.6, 4));
  obstacles.push(procBox("t_spawn_wall_s", "metal", tSpawnX, 1.3, 8, 3, 2.6, 4));
  obstacles.push(procBox("ct_spawn_wall_n", "metal", ctSpawnX, 1.3, -8, 3, 2.6, 4));
  obstacles.push(procBox("ct_spawn_wall_s", "metal", ctSpawnX, 1.3, 8, 3, 2.6, 4));

  const midWallCount = randInt(rng, 2, 4);
  for (let i = 0; i < midWallCount; i++) {
    const x = randRange(rng, -12, 12);
    const z = randRange(rng, -5, 5);
    const w = randRange(rng, 2, 5);
    const d = randRange(rng, 1.5, 2.5);
    const mat = pick(["metal", "concrete"] as const, rng);
    obstacles.push(procBox(`mid_cover_${i}`, mat, x, 1.05, z, w, 2.1, d));
    callouts.push({ id: `mid_${i}`, label: `MID ${i + 1}`, x, z });
  }

  const pillarCount = randInt(rng, 1, 3);
  for (let i = 0; i < pillarCount; i++) {
    const x = randRange(rng, -8, 8);
    const z = randRange(rng, -3, 3);
    obstacles.push(procCylinder(`mid_pillar_${i}`, "concrete", x, 1, z, 0.4, 2));
  }

  const aLongCount = randInt(rng, 2, 4);
  for (let i = 0; i < aLongCount; i++) {
    const x = randRange(rng, -18, 8);
    const z = randRange(rng, -18, -10);
    const w = randRange(rng, 2, 5);
    const d = randRange(rng, 1, 2);
    obstacles.push(procBox(`a_long_${i}`, "metal", x, 1.05, z, w, 2.1, d));
  }

  const bLongCount = randInt(rng, 2, 4);
  for (let i = 0; i < bLongCount; i++) {
    const x = randRange(rng, -18, 8);
    const z = randRange(rng, 10, 18);
    const w = randRange(rng, 2, 5);
    const d = randRange(rng, 1, 2);
    obstacles.push(procBox(`b_long_${i}`, "metal", x, 1.05, z, w, 2.1, d));
  }

  const siteAX = randRange(rng, 14, 22);
  const siteAZ = randRange(rng, -20, -10);
  obstacles.push(procBox("site_a_main", "metal", siteAX, 1.3, siteAZ, 2.6, 2.6, 5));
  const aBoxCount = randInt(rng, 1, 3);
  for (let i = 0; i < aBoxCount; i++) {
    obstacles.push(procBox(`site_a_box_${i}`, "wood", siteAX + randRange(rng, -5, 5), 0.65, siteAZ + randRange(rng, -4, 4), 1.2, 1.3, 1.2));
  }
  callouts.push({ id: "site_a", label: "SITE A", x: siteAX, z: siteAZ });

  const siteBX = randRange(rng, -22, -14);
  const siteBZ = randRange(rng, 10, 20);
  obstacles.push(procBox("site_b_main", "metal", siteBX, 1.3, siteBZ, 2.6, 2.6, 5));
  const bBoxCount = randInt(rng, 1, 3);
  for (let i = 0; i < bBoxCount; i++) {
    obstacles.push(procBox(`site_b_box_${i}`, "wood", siteBX + randRange(rng, -5, 5), 0.65, siteBZ + randRange(rng, -4, 4), 1.2, 1.3, 1.2));
  }
  callouts.push({ id: "site_b", label: "SITE B", x: siteBX, z: siteBZ });

  const woodCrateCount = randInt(rng, 3, 7);
  for (let i = 0; i < woodCrateCount; i++) {
    const x = randRange(rng, -30, 30);
    const z = randRange(rng, -40, 40);
    obstacles.push(procBox(`wood_crate_${i}`, "wood", x, 0.65, z, 1.2, 1.3, 1.2));
  }

  if (difficulty === "hard") {
    const extraCount = randInt(rng, 3, 6);
    for (let i = 0; i < extraCount; i++) {
      const x = randRange(rng, -25, 25);
      const z = randRange(rng, -35, 35);
      const mat = pick(["metal", "concrete"] as const, rng);
      obstacles.push(procBox(`hard_cover_${i}`, mat, x, 1, z, randRange(rng, 1.5, 3), 2, randRange(rng, 1.5, 3)));
    }
  }

  callouts.push({ id: "t_spawn", label: "T SPAWN", x: tSpawnX, z: 0 });
  callouts.push({ id: "ct_spawn", label: "CT SPAWN", x: ctSpawnX, z: 0 });
  callouts.push({ id: "mid", label: "MID", x: 0, z: 0 });

  return {
    obstacles,
    spawns: { T: { x: tSpawnX - 3, z: 0 }, CT: { x: ctSpawnX + 3, z: 0 } },
    bombSites: {
      A: { x: siteAX, z: siteAZ, radius: 6 },
      B: { x: siteBX, z: siteBZ, radius: 6 },
    },
    callouts,
    seed,
  };
}

const PROC_BOUNDS = { minX: -42, maxX: 42, minZ: -52, maxZ: 52 };

let currentSeed = Date.now();

export function getMapSeed(): number {
  return currentSeed;
}

export function setMapSeed(seed: number): void {
  currentSeed = seed;
}

export function randomizeSeed(): number {
  currentSeed = Math.floor(Math.random() * 2147483647);
  return currentSeed;
}

export { PROC_BOUNDS };
