import { MAP_BOUNDARY, DUST_MAP_BOUNDARY, RAVENPOINT_BOUNDS } from "@cs-game/shared"
import { TRAINING_ARENA } from "../training/TrainingArena"
import { SURVIVAL_BOUNDS } from "../zombie/survivalLayout"
import { L4D_BOUNDS } from "../l4d/l4dLayout"
import { getProceduralMapData } from "../map/ProceduralMapRegistry"

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }

const CAPSULE_INSET = 0.8

function inset(raw: Bounds): Bounds {
  return {
    minX: raw.minX + CAPSULE_INSET,
    maxX: raw.maxX - CAPSULE_INSET,
    minZ: raw.minZ + CAPSULE_INSET,
    maxZ: raw.maxZ - CAPSULE_INSET,
  }
}

const YARD = inset(MAP_BOUNDARY)
const RAVEN = inset(RAVENPOINT_BOUNDS)
const DUST = inset(DUST_MAP_BOUNDARY)

const MODE_BOUNDS: Record<string, Bounds> = {
  offline5v5: YARD,
  training: inset({
    minX: TRAINING_ARENA.minX,
    maxX: TRAINING_ARENA.maxX,
    minZ: TRAINING_ARENA.minZ,
    maxZ: TRAINING_ARENA.maxZ,
  }),
  zombie: { minX: SURVIVAL_BOUNDS.minX, maxX: SURVIVAL_BOUNDS.maxX, minZ: SURVIVAL_BOUNDS.minZ, maxZ: SURVIVAL_BOUNDS.maxZ },
  l4d: { minX: L4D_BOUNDS.minX, maxX: L4D_BOUNDS.maxX, minZ: L4D_BOUNDS.minZ, maxZ: L4D_BOUNDS.maxZ },
}

export function getPlayableBounds(mode: string, mapId?: string): Bounds {
  if (mode === "offline5v5") {
    if (mapId === "dust") return DUST
    if (mapId === "ravenpoint") return RAVEN
    if (mapId) {
      const proc = getProceduralMapData(mapId)
      if (proc) return inset(proc.bounds)
    }
  }
  return MODE_BOUNDS[mode] ?? YARD
}
