/**
 * DE_RAVENPOINT — Bomb Defuse 5v5 Map
 * Spec: 80x100m, T south, CT north, 2 sites (A east, B west), Mid vertical
 * Coordinate: +X east, -X west, -Z north, +Z south, Y up
 */

export interface RavenMapObstacle {
  id: string
  material: "wood" | "metal" | "concrete"
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

// ─── Bounds ─────────────────────────────────────────────────────────
export const RAVENPOINT_BOUNDS = {
  minX: -40,
  maxX: 40,
  minZ: -50,
  maxZ: 50,
} as const

export const RAVENPOINT_SPAWN = {
  T: { x: 0, y: 0, z: 38 },
  CT: { x: 0, y: 0, z: -38 },
} as const

export const RAVENPOINT_BOMB_SITES = {
  A: { x: 26, y: 0, z: -8, radius: 6 },
  B: { x: -26, y: 0, z: -8, radius: 6 },
} as const

export const RAVENPOINT_BUY_ZONE = {
  T: { x: 0, y: 0, z: 38, radius: 12 },
  CT: { x: 0, y: 0, z: -38, radius: 12 },
} as const

// ─── Areas (floor walkable) ───────────────────────────────────────
export interface RavenArea {
  id: string
  name: string
  type: string
  x1: number
  z1: number
  x2: number
  z2: number
  wallHeight: number
}

export const RAVENPOINT_AREAS: RavenArea[] = [
  { id: "AREA_T_SPAWN", name: "T Spawn", type: "spawn_t", x1: -16, z1: 30, x2: 16, z2: 42, wallHeight: 4 },
  { id: "AREA_CT_SPAWN", name: "CT Spawn", type: "spawn_ct", x1: -16, z1: -42, x2: 16, z2: -30, wallHeight: 4 },
  { id: "AREA_MID", name: "Mid", type: "corridor", x1: -4, z1: -30, x2: 4, z2: 30, wallHeight: 5 },
  { id: "AREA_CT_ROTATE", name: "CT Rotate", type: "corridor", x1: -26, z1: -30, x2: 26, z2: -22, wallHeight: 4 },
  { id: "AREA_CT_APPROACH_EAST", name: "CT Approach East", type: "corridor", x1: 16, z1: -36, x2: 26, z2: -28, wallHeight: 4 },
  { id: "AREA_CT_APPROACH_WEST", name: "CT Approach West", type: "corridor", x1: -26, z1: -36, x2: -16, z2: -28, wallHeight: 4 },
  { id: "AREA_A_RAMP", name: "A Ramp", type: "corridor", x1: 16, z1: -28, x2: 26, z2: -16, wallHeight: 4 },
  { id: "AREA_B_RAMP", name: "B Ramp", type: "corridor", x1: -26, z1: -28, x2: -16, z2: -16, wallHeight: 4 },
  { id: "AREA_LONG_A", name: "Long A", type: "corridor", x1: 16, z1: 0, x2: 26, z2: 34, wallHeight: 5 },
  { id: "AREA_LONG_B", name: "Long B", type: "corridor", x1: -26, z1: 0, x2: -16, z2: 34, wallHeight: 5 },
  { id: "AREA_A_SHORT", name: "A Short", type: "corridor", x1: 4, z1: -10, x2: 10, z2: -2, wallHeight: 4 },
  { id: "AREA_B_CONNECTOR", name: "B Connector", type: "corridor", x1: -10, z1: -10, x2: -4, z2: -2, wallHeight: 4 },
  { id: "AREA_SITE_A", name: "Site A", type: "site_a", x1: 10, z1: -16, x2: 36, z2: 0, wallHeight: 4 },
  { id: "AREA_SITE_B", name: "Site B", type: "site_b", x1: -36, z1: -16, x2: -10, z2: 0, wallHeight: 4 },
]

// ─── Props (cover) ───────────────────────────────────────────────
export interface RavenProp {
  id: string
  type: string
  position: [number, number, number]
  size: [number, number, number]
}

export const RAVENPOINT_PROPS: RavenProp[] = [
  { id: "T_Crate1", type: "crate", position: [-8, 0, 38], size: [2, 2, 2] },
  { id: "T_Crate2", type: "crate", position: [8, 0, 38], size: [2, 2, 2] },
  { id: "CT_Crate1", type: "crate", position: [-8, 0, -38], size: [2, 2, 2] },
  { id: "CT_Crate2", type: "crate", position: [8, 0, -38], size: [2, 2, 2] },
  { id: "Mid_Crate", type: "crate", position: [0, 0, 0], size: [2, 2, 2] },
  { id: "Mid_Barrel1", type: "barrel", position: [2.5, 0, 10], size: [0.8, 1, 0.8] },
  { id: "Mid_Barrel2", type: "barrel", position: [-2.5, 0, -10], size: [0.8, 1, 0.8] },
  { id: "Mid_LowWall", type: "low_wall", position: [0, 0, 18], size: [4, 1.2, 0.6] },
  { id: "LongA_Crate", type: "crate", position: [21, 0, 24], size: [2, 2, 2] },
  { id: "LongA_Barrel", type: "barrel", position: [19, 0, 12], size: [0.8, 1, 0.8] },
  { id: "LongA_Cross", type: "crate", position: [24, 0, 4], size: [1.5, 1.5, 1.5] },
  { id: "LongB_Crate", type: "crate", position: [-21, 0, 24], size: [2, 2, 2] },
  { id: "LongB_Barrel", type: "barrel", position: [-19, 0, 12], size: [0.8, 1, 0.8] },
  { id: "LongB_Cross", type: "crate", position: [-24, 0, 4], size: [1.5, 1.5, 1.5] },
  { id: "Short_Box", type: "crate", position: [7, 0, -6], size: [1.5, 1.5, 1.5] },
  { id: "BConn_Box", type: "crate", position: [-7, 0, -6], size: [1.5, 1.5, 1.5] },
  { id: "CT_RotateBox", type: "crate", position: [0, 0, -25], size: [1.5, 1.5, 1.5] },
  { id: "A_Platform", type: "platform", position: [32, 0, -6], size: [5, 1, 4] },
  { id: "A_Default", type: "crate", position: [22, 0, -4], size: [2, 2, 2] },
  { id: "A_Ninja", type: "crate", position: [16, 0, -14], size: [1.2, 1.2, 1.2] },
  { id: "A_Pillar", type: "pillar", position: [14, 0, -4], size: [1.5, 3.5, 1.5] },
  { id: "A_Green", type: "crate", position: [34, 0, -14], size: [2, 1.5, 1] },
  { id: "B_Platform", type: "platform", position: [-32, 0, -6], size: [5, 1, 4] },
  { id: "B_Default", type: "crate", position: [-22, 0, -4], size: [2, 2, 2] },
  { id: "B_Ninja", type: "crate", position: [-16, 0, -14], size: [1.2, 1.2, 1.2] },
  { id: "B_Pillar", type: "pillar", position: [-14, 0, -4], size: [1.5, 3.5, 1.5] },
  { id: "B_Green", type: "crate", position: [-34, 0, -14], size: [2, 1.5, 1] },
]

// ─── Spawn Points (5 per team) ───────────────────────────────────
export const RAVENPOINT_SPAWNS = {
  T: [
    { id: "T_Spawn_1", position: [-12, 0, 38] as [number, number, number], facing: [0, 0, -1] as [number, number, number] },
    { id: "T_Spawn_2", position: [-6, 0, 40] as [number, number, number], facing: [0, 0, -1] as [number, number, number] },
    { id: "T_Spawn_3", position: [0, 0, 38] as [number, number, number], facing: [0, 0, -1] as [number, number, number] },
    { id: "T_Spawn_4", position: [6, 0, 40] as [number, number, number], facing: [0, 0, -1] as [number, number, number] },
    { id: "T_Spawn_5", position: [12, 0, 38] as [number, number, number], facing: [0, 0, -1] as [number, number, number] },
  ],
  CT: [
    { id: "CT_Spawn_1", position: [-12, 0, -38] as [number, number, number], facing: [0, 0, 1] as [number, number, number] },
    { id: "CT_Spawn_2", position: [-6, 0, -40] as [number, number, number], facing: [0, 0, 1] as [number, number, number] },
    { id: "CT_Spawn_3", position: [0, 0, -38] as [number, number, number], facing: [0, 0, 1] as [number, number, number] },
    { id: "CT_Spawn_4", position: [6, 0, -40] as [number, number, number], facing: [0, 0, 1] as [number, number, number] },
    { id: "CT_Spawn_5", position: [12, 0, -38] as [number, number, number], facing: [0, 0, 1] as [number, number, number] },
  ],
} as const

// ─── Bomb & Buy Zones ───────────────────────────────────────────
export const RAVENPOINT_BOMB_ZONES = [
  { id: "SITE_A_PLANT", site: "A" as const, x1: 20, z1: -12, x2: 32, z2: -4 },
  { id: "SITE_B_PLANT", site: "B" as const, x1: -32, z1: -12, x2: -20, z2: -4 },
] as const

export const RAVENPOINT_BUY_ZONES = [
  { id: "T_BUY_ZONE", team: "T" as const, x1: -16, z1: 30, x2: 16, z2: 42 },
  { id: "CT_BUY_ZONE", team: "CT" as const, x1: -16, z1: -42, x2: 16, z2: -30 },
] as const

// ─── Obstacles (for collision) ───────────────────────────────────
function rpBox(id: string, material: "wood" | "metal" | "concrete", cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): RavenMapObstacle {
  return { id, material, minX: cx - sx / 2, maxX: cx + sx / 2, minY: cy - sy / 2, maxY: cy + sy / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 }
}

function inAnyArea(x: number, z: number, areas: readonly RavenArea[]): boolean {
  for (const a of areas) {
    if (x >= a.x1 && x < a.x2 && z >= a.z1 && z < a.z2) return true
  }
  return false
}

/** Solid buildings in the gaps between walkable corridors so player + bots share the same layout. */
export function buildRavenpointFillWalls(
  areas: readonly RavenArea[] = RAVENPOINT_AREAS,
  bounds = RAVENPOINT_BOUNDS,
): RavenMapObstacle[] {
  const minX = Math.floor(bounds.minX)
  const maxX = Math.ceil(bounds.maxX)
  const minZ = Math.floor(bounds.minZ)
  const maxZ = Math.ceil(bounds.maxZ)
  const w = maxX - minX
  const h = maxZ - minZ
  const solid = new Uint8Array(w * h)
  for (let z = minZ; z < maxZ; z++) {
    for (let x = minX; x < maxX; x++) {
      if (!inAnyArea(x, z, areas)) solid[(z - minZ) * w + (x - minX)] = 1
    }
  }
  const seen = new Uint8Array(w * h)
  const walls: RavenMapObstacle[] = []
  let n = 0
  for (let z = minZ; z < maxZ; z++) {
    for (let x = minX; x < maxX; x++) {
      const i = (z - minZ) * w + (x - minX)
      if (!solid[i] || seen[i]) continue
      let bw = 1
      while (x + bw < maxX && solid[i + bw] && !seen[i + bw]) bw++
      let bh = 1
      outer: while (z + bh < maxZ) {
        for (let dx = 0; dx < bw; dx++) {
          const j = (z + bh - minZ) * w + (x - minX) + dx
          if (!solid[j] || seen[j]) break outer
        }
        bh++
      }
      for (let dz = 0; dz < bh; dz++) {
        for (let dx = 0; dx < bw; dx++) {
          seen[(z + dz - minZ) * w + (x - minX) + dx] = 1
        }
      }
      walls.push(rpBox(`rp_fill_${n++}`, "concrete", x + bw / 2, 2, z + bh / 2, bw, 4, bh))
    }
  }
  return walls
}

export function isRavenpointWalkable(x: number, z: number): boolean {
  return inAnyArea(x, z, RAVENPOINT_AREAS)
}

export const RAVENPOINT_OBSTACLES: readonly RavenMapObstacle[] = [
  ...buildRavenpointFillWalls(),
  ...RAVENPOINT_PROPS.map((p) =>
    rpBox(
      `rp_${p.id}`,
      p.type === "barrel" ? "metal" : p.type === "pillar" ? "concrete" : "wood",
      p.position[0],
      p.size[1] / 2,
      p.position[2],
      p.size[0],
      p.size[1],
      p.size[2],
    ),
  ),
] as const

// ─── Callouts ───────────────────────────────────────────────────
export const RAVENPOINT_CALLOUTS = [
  { id: "t_spawn", label: "T SPAWN", x: 0, z: 38 },
  { id: "ct_spawn", label: "CT SPAWN", x: 0, z: -38 },
  { id: "mid", label: "MID", x: 0, z: 0 },
  { id: "mid_crate", label: "MID CRATE", x: 0, z: 0 },
  { id: "site_a", label: "SITE A", x: 26, z: -8 },
  { id: "site_b", label: "SITE B", x: -26, z: -8 },
  { id: "long_a", label: "LONG A", x: 21, z: 17 },
  { id: "long_b", label: "LONG B", x: -21, z: 17 },
  { id: "a_short", label: "A SHORT", x: 7, z: -6 },
  { id: "b_conn", label: "B CONN", x: -7, z: -6 },
  { id: "a_ramp", label: "A RAMP", x: 21, z: -22 },
  { id: "b_ramp", label: "B RAMP", x: -21, z: -22 },
  { id: "ct_rotate", label: "CT ROTATE", x: 0, z: -25 },
  { id: "a_default", label: "A DEFAULT", x: 26, z: -8 },
  { id: "b_default", label: "B DEFAULT", x: -26, z: -8 },
] as const

// ─── Full JSON (spec §15) ───────────────────────────────────────
export const RAVENPOINT_JSON = {
  meta: {
    name: "DE_RAVENPOINT",
    mode: "bomb_defuse_5v5",
    unit: "meter",
    coordinate: { x: "east-west", y: "height", z: "north-south", north: "-z", south: "+z", east: "+x", west: "-x" },
    bounds: { xMin: -40, xMax: 40, zMin: -50, zMax: 50 },
  },
  areas: RAVENPOINT_AREAS,
  props: RAVENPOINT_PROPS,
  bombSites: [
    { id: "SITE_A_PLANT", site: "A", x1: 20, z1: -12, x2: 32, z2: -4 },
    { id: "SITE_B_PLANT", site: "B", x1: -32, z1: -12, x2: -20, z2: -4 },
  ],
  buyZones: [
    { id: "T_BUY_ZONE", team: "T", x1: -16, z1: 30, x2: 16, z2: 42 },
    { id: "CT_BUY_ZONE", team: "CT", x1: -16, z1: -42, x2: 16, z2: -30 },
  ],
  spawns: RAVENPOINT_SPAWNS,
} as const
