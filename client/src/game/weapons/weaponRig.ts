import * as THREE from 'three'

/**
 * Camera-space placement of the first-person weapon models.
 *
 * Hip: relaxed carry position, weapon offset to the right.
 * ADS: sight line lifted onto the camera axis (x = 0) and the height set to the
 * negative of that weapon's sight height, so the iron sights land on the
 * crosshair instead of floating above or below it.
 * Muzzle: where the barrel actually ends, used for tracers and muzzle flash.
 */

export const WEAPON_POSITIONS: Record<string, [number, number, number]> = {
  ak47: [0.22, -0.22, -0.40],
  m4a1: [0.22, -0.22, -0.40],
  awp: [0.24, -0.24, -0.46],
  mp5: [0.21, -0.21, -0.36],
  // Akimbo: centered so both pistols frame the crosshair evenly.
  deagle: [0, -0.2, -0.34],
  glock: [0.16, -0.16, -0.29],
  tec9: [0.16, -0.16, -0.29],
  autopistol: [0.16, -0.16, -0.29],
  knife: [0.18, -0.18, -0.28],
  combatknife: [0.18, -0.18, -0.28],
  he: [0.18, -0.18, -0.28],
  smoke: [0.18, -0.18, -0.28],
  flash: [0.18, -0.18, -0.28],
}

export const WEAPON_ROTATIONS: Record<string, [number, number, number]> = {
  ak47: [-0.02, -0.05, 0.02],
  m4a1: [-0.02, -0.05, 0.02],
  awp: [-0.01, -0.04, 0.01],
  mp5: [-0.02, -0.05, 0.02],
  deagle: [-0.015, 0, 0],
  glock: [-0.01, -0.03, 0.02],
  tec9: [-0.01, -0.03, 0.02],
  autopistol: [-0.01, -0.03, 0.02],
  knife: [0.06, -0.08, -0.05],
  combatknife: [0.06, -0.08, -0.05],
  he: [0.1, -0.05, 0.05],
  smoke: [0.1, -0.05, 0.05],
  flash: [0.1, -0.05, 0.05],
}

/**
 * Height of each weapon's sight line above its model origin. The dual Deagle is
 * absent on purpose: two pistols cannot share one sight line, so it gets an
 * explicit aim pose below instead of a derived one.
 */
const SIGHT_HEIGHT: Record<string, number> = {
  ak47: 0.055,
  m4a1: 0.05,
  awp: 0.06,
  mp5: 0.042,
  glock: 0.04,
  tec9: 0.034,
  autopistol: 0.042,
}

const ADS_DEPTH: Record<string, number> = {
  ak47: -0.3,
  m4a1: -0.3,
  awp: -0.32,
  mp5: -0.26,
  glock: -0.23,
  tec9: -0.23,
  autopistol: -0.23,
}

export const ADS_POSITIONS: Record<string, [number, number, number]> = Object.keys(
  SIGHT_HEIGHT
).reduce<Record<string, [number, number, number]>>((acc, id) => {
  acc[id] = [0, -SIGHT_HEIGHT[id], ADS_DEPTH[id]]
  return acc
}, {
  // Knives have no sights, so aiming keeps them at the hip.
  knife: WEAPON_POSITIONS.knife,
  combatknife: WEAPON_POSITIONS.combatknife,
  // Akimbo aim just pulls both pistols up and in, framing the crosshair.
  deagle: [0, -0.15, -0.28],
})

/** Barrel exit in model space (z is forward-negative, matching the models). */
const BARREL_TIP: Record<string, [number, number, number]> = {
  ak47: [0, 0.008, -0.46],
  m4a1: [0, 0, -0.53],
  awp: [0, 0.005, -0.67],
  mp5: [0, 0.005, -0.345],
  // Local to a single pistol; the akimbo hand offset is added separately.
  deagle: [0, 0.018, -0.29],
  glock: [0, 0.012, -0.20],
  tec9: [0, 0.008, -0.28],
  autopistol: [0, 0.012, -0.21],
}

export const MUZZLE_OFFSETS: Record<string, THREE.Vector3> = Object.keys(
  BARREL_TIP
).reduce<Record<string, THREE.Vector3>>((acc, id) => {
  const hip = WEAPON_POSITIONS[id]
  const tip = BARREL_TIP[id]
  acc[id] = new THREE.Vector3(hip[0] + tip[0], hip[1] + tip[1], hip[2] + tip[2])
  return acc
}, {})

const FALLBACK_MUZZLE = new THREE.Vector3(0.18, -0.14, -0.6)

/** `1` = right hand, `-1` = left (off) hand. Only akimbo weapons fire left. */
export type AkimboSide = 1 | -1

export interface AkimboHand {
  side: AkimboSide
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

/**
 * Pose of each pistol of the dual Deagle inside the weapon group. The off hand
 * rides a little lower and further back, like a real akimbo carry.
 */
export const DEAGLE_HANDS: AkimboHand[] = [
  { side: -1, position: [-0.1, -0.028, 0.03], rotation: [0, 0.1, -0.07], scale: 0.88 },
  { side: 1, position: [0.1, 0, 0], rotation: [0, -0.1, 0.07], scale: 0.88 },
]

/** Weapons held in both hands, firing one barrel at a time. */
const AKIMBO_WEAPONS = new Set(['deagle'])

export function isAkimboWeapon(weapon: string | null): boolean {
  return !!weapon && AKIMBO_WEAPONS.has(weapon)
}

/** Muzzle of each akimbo hand: hip pose + hand offset + scaled barrel tip. */
const AKIMBO_MUZZLES = new Map<string, THREE.Vector3>(
  DEAGLE_HANDS.map(hand => {
    const hip = WEAPON_POSITIONS.deagle
    const tip = BARREL_TIP.deagle
    return [
      `deagle:${hand.side}`,
      new THREE.Vector3(
        hip[0] + hand.position[0] + tip[0] * hand.scale,
        hip[1] + hand.position[1] + tip[1] * hand.scale,
        hip[2] + hand.position[2] + tip[2] * hand.scale
      ),
    ] as const
  })
)

/** Muzzle position of the barrel that is firing this shot. */
export function getMuzzleOffset(
  weapon: string | null,
  side: AkimboSide = 1
): THREE.Vector3 {
  if (!weapon) return FALLBACK_MUZZLE
  return (
    AKIMBO_MUZZLES.get(`${weapon}:${side}`) ??
    MUZZLE_OFFSETS[weapon] ??
    FALLBACK_MUZZLE
  )
}
