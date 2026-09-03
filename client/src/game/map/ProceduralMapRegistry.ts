/**
 * One registry for the generated 5v5 layout so bots, combat, and the mesh share data.
 */
import type { MapObstacle, MapCallout } from "@cs-game/shared";
import {
  generate5v5Map,
  randomizeSeed,
  PROC_BOUNDS,
  type ProceduralBombSite,
  type ProceduralSpawnPoint,
} from "@cs-game/shared/proceduralMaps";

export const PROCEDURAL_5V5_ID = "procedural_5v5";

export interface ProceduralMapData {
  obstacles: MapObstacle[];
  callouts: MapCallout[];
  bombSites: { A: ProceduralBombSite; B: ProceduralBombSite };
  spawns: { T: ProceduralSpawnPoint; CT: ProceduralSpawnPoint };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  seed: number;
}

const registry = new Map<string, ProceduralMapData>();

export function registerProceduralMap(mapId: string, data: ProceduralMapData): void {
  registry.set(mapId, data);
}

export function getProceduralMapData(mapId: string): ProceduralMapData | undefined {
  return registry.get(mapId);
}

export function ensureProcedural5v5(seed?: number): ProceduralMapData {
  const existing = registry.get(PROCEDURAL_5V5_ID);
  if (existing && seed === undefined) return existing;

  const map = generate5v5Map(seed ?? randomizeSeed());
  const data: ProceduralMapData = {
    obstacles: map.obstacles,
    callouts: map.callouts.map((c) => ({ id: c.id, label: c.label, x: c.x, z: c.z })),
    bombSites: map.bombSites,
    spawns: map.spawns,
    bounds: PROC_BOUNDS,
    seed: map.seed,
  };
  registry.set(PROCEDURAL_5V5_ID, data);
  return data;
}

export function clearProceduralMapRegistry(): void {
  registry.clear();
}
