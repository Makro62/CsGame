/** How much ADS slows a standing walk. Sprint is cancelled while aiming. */
export const ADS_WALK_MULT = 0.68

export function resolveMoveSpeed(params: {
  walkSpeed: number
  sprintSpeed: number
  crouchSpeed: number
  sprinting: boolean
  crouching: boolean
  aiming: boolean
}): number {
  if (params.crouching) return params.crouchSpeed
  if (params.aiming) return params.walkSpeed * ADS_WALK_MULT
  if (params.sprinting) return params.sprintSpeed
  return params.walkSpeed
}

export function isSprinting(sprintHeld: boolean, moving: boolean, aiming: boolean, crouching: boolean): boolean {
  return sprintHeld && moving && !aiming && !crouching
}

/**
 * Accelerate toward a desired XZ velocity. Friction is the stop path only —
 * stacking it on top of accel was capping walk at ~70% of the authored speed.
 */
export function stepMoveVelocity(
  currentX: number,
  currentZ: number,
  desiredX: number,
  desiredZ: number,
  dt: number,
  grounded: boolean,
  tactical: boolean,
): { x: number; z: number } {
  const hasInput = desiredX * desiredX + desiredZ * desiredZ > 0.0001
  const accel = grounded
    ? hasInput
      ? tactical
        ? 24
        : 12
      : tactical
        ? 20
        : 14
    : hasInput
      ? tactical
        ? 4
        : 5
      : 6
  const t = 1 - Math.exp(-accel * Math.max(0, dt))
  const x = currentX + (desiredX - currentX) * t
  const z = currentZ + (desiredZ - currentZ) * t
  if (x * x + z * z < 0.0036) return { x: 0, z: 0 }
  return { x, z }
}
