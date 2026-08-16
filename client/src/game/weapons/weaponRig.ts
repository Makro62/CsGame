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
  deagle: [0.17, -0.17, -0.32],
  glock: [0.16, -0.16, -0.29],
  tec9: [0.16, -0.16, -0.29],
  autopistol: [0.16, -0.16, -0.29],
  knife: [0.18, -0.18, -0.28],
  combatknife: [0.18, -0.18, -0.28],
}

export const WEAPON_ROTATIONS: Record<string, [number, number, number]> = {
  ak47: [-0.02, -0.05, 0.02],
  m4a1: [-0.02, -0.05, 0.02],
  awp: [-0.01, -0.04, 0.01],
  mp5: [-0.02, -0.05, 0.02],
  deagle: [-0.01, -0.03, 0.02],
  glock: [-0.01, -0.03, 0.02],
  tec9: [-0.01, -0.03, 0.02],
  autopistol: [-0.01, -0.03, 0.02],
  knife: [0.06, -0.08, -0.05],
  combatknife: [0.06, -0.08, -0.05],
}

/** Height of each weapon's sight line above its model origin. */
const SIGHT_HEIGHT: Record<string, number> = {
  ak47: 0.055,
  m4a1: 0.05,
  awp: 0.06,
  mp5: 0.042,
  deagle: 0.05,
  glock: 0.04,
  tec9: 0.034,
  autopistol: 0.042,
}

const ADS_DEPTH: Record<string, number> = {
  ak47: -0.3,
  m4a1: -0.3,
  awp: -0.32,
  mp5: -0.26,
  deagle: -0.24,
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
})

/** Barrel exit in model space (z is forward-negative, matching the models). */
const BARREL_TIP: Record<string, [number, number, number]> = {
  ak47: [0, 0.008, -0.46],
  m4a1: [0, 0, -0.53],
  awp: [0, 0.005, -0.67],
  mp5: [0, 0.005, -0.345],
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

export function getMuzzleOffset(weapon: string | null): THREE.Vector3 {
  if (!weapon) return FALLBACK_MUZZLE
  return MUZZLE_OFFSETS[weapon] ?? FALLBACK_MUZZLE
}
