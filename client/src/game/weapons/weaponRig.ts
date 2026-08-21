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
  ak47: [0.20, -0.19, -0.38],
  m4a1: [0.20, -0.19, -0.38],
  awp: [0.22, -0.21, -0.42],
  mp5: [0.19, -0.18, -0.34],
  arccaster: [0.20, -0.19, -0.36],
  deagle: [0.16, -0.16, -0.30],
  glock: [0.16, -0.16, -0.28],
  tec9: [0.16, -0.16, -0.28],
  autopistol: [0.16, -0.16, -0.28],
  knife: [0.18, -0.18, -0.28],
  combatknife: [0.18, -0.18, -0.28],
  he: [0.16, -0.17, -0.26],
  smoke: [0.16, -0.17, -0.26],
  flash: [0.16, -0.17, -0.26],
}

export const WEAPON_ROTATIONS: Record<string, [number, number, number]> = {
  ak47: [-0.02, -0.04, 0.02],
  m4a1: [-0.02, -0.04, 0.02],
  awp: [-0.01, -0.03, 0.01],
  mp5: [-0.02, -0.04, 0.02],
  arccaster: [-0.02, -0.04, 0.02],
  deagle: [-0.01, -0.03, 0.02],
  glock: [-0.01, -0.03, 0.02],
  tec9: [-0.01, -0.03, 0.02],
  autopistol: [-0.01, -0.03, 0.02],
  knife: [0.06, -0.08, -0.05],
  combatknife: [0.06, -0.08, -0.05],
  he: [0.08, -0.04, 0.04],
  smoke: [0.08, -0.04, 0.04],
  flash: [0.08, -0.04, 0.04],
}

/**
 * Height of each weapon's sight line above its model origin.
 */
const SIGHT_HEIGHT: Record<string, number> = {
  ak47: 0.052,
  m4a1: 0.052,
  awp: 0.060,
  mp5: 0.042,
  arccaster: 0.048,
  deagle: 0.058,
  glock: 0.042,
  tec9: 0.036,
  autopistol: 0.042,
}

const ADS_DEPTH: Record<string, number> = {
  ak47: -0.28,
  m4a1: -0.28,
  awp: -0.30,
  mp5: -0.25,
  arccaster: -0.26,
  deagle: -0.24,
  glock: -0.21,
  tec9: -0.21,
  autopistol: -0.21,
}

/** Single-wield ADS positions (derived from sight height). */
const SINGLE_ADS: Record<string, [number, number, number]> = Object.keys(
  SIGHT_HEIGHT
).reduce<Record<string, [number, number, number]>>((acc, id) => {
  acc[id] = [0, -SIGHT_HEIGHT[id], ADS_DEPTH[id]]
  return acc
}, {
  knife: WEAPON_POSITIONS.knife,
  combatknife: WEAPON_POSITIONS.combatknife,
  deagle: [0, -0.058, -0.24],
})

/** Dual-wield ADS positions (both pistols frame the crosshair). */
const DUAL_ADS: Record<string, [number, number, number]> = {
  deagle: [0, -0.15, -0.28],
  glock: [0, -0.14, -0.24],
  tec9: [0, -0.14, -0.24],
  autopistol: [0, -0.14, -0.24],
}

/**
 * ADS positions: returns dual-wield position if isDualWield is true,
 * otherwise single-wield position.
 */
export function getADSPosition(weapon: string, isDualWield: boolean): [number, number, number] {
  if (isDualWield && DUAL_ADS[weapon]) return DUAL_ADS[weapon]
  return SINGLE_ADS[weapon] ?? [0, -0.145, -0.30]
}

// Keep ADS_POSITIONS for backward compatibility (single-wield default)
export const ADS_POSITIONS: Record<string, [number, number, number]> = SINGLE_ADS

/** Barrel exit in model space (z is forward-negative, matching the models). */
const BARREL_TIP: Record<string, [number, number, number]> = {
  ak47: [0, 0.008, -0.46],
  m4a1: [0, 0, -0.53],
  awp: [0, 0.005, -0.67],
  mp5: [0, 0.005, -0.345],
  arccaster: [0, 0.01, -0.42],
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
 * Pose of each pistol of the dual Deagle inside the weapon group.
 */
export const DEAGLE_HANDS: AkimboHand[] = [
  { side: -1, position: [-0.1, -0.028, 0.03], rotation: [0, 0.1, -0.07], scale: 0.88 },
  { side: 1, position: [0.1, 0, 0], rotation: [0, -0.1, 0.07], scale: 0.88 },
]

/** Akimbo hands for Glock. */
export const GLOCK_HANDS: AkimboHand[] = [
  { side: -1, position: [-0.09, -0.025, 0.02], rotation: [0, 0.08, -0.06], scale: 0.9 },
  { side: 1, position: [0.09, 0, 0], rotation: [0, -0.08, 0.06], scale: 0.9 },
]

/** Akimbo hands for Tec-9. */
export const TEC9_HANDS: AkimboHand[] = [
  { side: -1, position: [-0.095, -0.03, 0.025], rotation: [0, 0.1, -0.06], scale: 0.88 },
  { side: 1, position: [0.095, 0, 0], rotation: [0, -0.1, 0.06], scale: 0.88 },
]

/** Akimbo hands for Auto Pistol. */
export const AUTOPISTOL_HANDS: AkimboHand[] = [
  { side: -1, position: [-0.085, -0.022, 0.018], rotation: [0, 0.08, -0.05], scale: 0.92 },
  { side: 1, position: [0.085, 0, 0], rotation: [0, -0.08, 0.05], scale: 0.92 },
]

/** Map from weapon id to its akimbo hand offsets. */
export const AKIMBO_HANDS: Record<string, AkimboHand[]> = {
  deagle: DEAGLE_HANDS,
  glock: GLOCK_HANDS,
  tec9: TEC9_HANDS,
  autopistol: AUTOPISTOL_HANDS,
}

/** Weapons that can be dual-wielded when dualWield is enabled (e.g. after Pack-a-Punch). */
const AKIMBO_ELIGIBLE = new Set(['deagle', 'glock', 'tec9', 'autopistol'])

/**
 * Returns true if the weapon should fire from alternating left/right hands.
 */
export function isAkimboWeapon(weapon: string | null, dualWield: boolean = false): boolean {
  if (!weapon) return false
  return dualWield && AKIMBO_ELIGIBLE.has(weapon)
}

/** Muzzle of each akimbo hand: hip pose + hand offset + scaled barrel tip. */
const AKIMBO_MUZZLES = new Map<string, THREE.Vector3>()
for (const [wid, hands] of Object.entries(AKIMBO_HANDS)) {
  const hip = WEAPON_POSITIONS[wid]
  const tip = BARREL_TIP[wid]
  for (const hand of hands) {
    AKIMBO_MUZZLES.set(
      `${wid}:${hand.side}`,
      new THREE.Vector3(
        hip[0] + hand.position[0] + tip[0] * hand.scale,
        hip[1] + hand.position[1] + tip[1] * hand.scale,
        hip[2] + hand.position[2] + tip[2] * hand.scale
      )
    )
  }
}

/** Muzzle position of the barrel that is firing this shot. */
export function getMuzzleOffset(
  weapon: string | null,
  side: AkimboSide = 1,
  dualWield: boolean = false
): THREE.Vector3 {
  if (!weapon) return FALLBACK_MUZZLE
  if (isAkimboWeapon(weapon, dualWield)) {
    return (
      AKIMBO_MUZZLES.get(`${weapon}:${side}`) ??
      MUZZLE_OFFSETS[weapon] ??
      FALLBACK_MUZZLE
    )
  }
  return MUZZLE_OFFSETS[weapon] ?? FALLBACK_MUZZLE
}
