/**
 * Top-down Alien Shooter move: WASD follows the screen, not aim.
 * Camera sits at +Z looking toward -Z, so W = up (-Z), S = down (+Z),
 * A = left (-X), D = right (+X).
 */
export function arcadeScreenMove(
  forward: boolean,
  backward: boolean,
  left: boolean,
  right: boolean,
): { x: number; z: number } {
  let x = 0;
  let z = 0;
  if (forward) z -= 1;
  if (backward) z += 1;
  if (left) x -= 1;
  if (right) x += 1;
  const len = Math.hypot(x, z);
  if (len > 1e-8) {
    x /= len;
    z /= len;
  }
  return { x, z };
}
