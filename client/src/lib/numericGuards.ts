/** Shared numeric sanitizers used by stores, AI, and round ticks. */

export function finiteOr(n: number, fallback: number): number {
  return Number.isFinite(n) ? n : fallback;
}

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Frame dt: NaN/∞/negative → 60fps step. Cap at 1s so a stall cannot skip a whole round. */
export function sanitizeTickDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0.016;
  return Math.min(dt, 1);
}

export function sanitizeFireRateMultiplier(multiplier: number): number {
  if (!Number.isFinite(multiplier)) return 1;
  return Math.max(1, multiplier);
}

export function sanitizeDamage(damage: number): number | null {
  if (!Number.isFinite(damage) || damage <= 0) return null;
  return damage;
}

export function sanitizeRegenAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount;
}

export function computeReloadFill(mag: number, ammo: number, reserve: number): {
  needed: number;
  load: number;
  ammoAfter: number;
  reserveAfter: number;
} {
  const magSafe = Number.isFinite(mag) ? Math.max(0, mag) : 0;
  const ammoSafe = Number.isFinite(ammo) ? Math.max(0, ammo) : 0;
  const reserveSafe = Number.isFinite(reserve) ? Math.max(0, reserve) : 0;
  const ammoClamped = Math.min(ammoSafe, magSafe);
  const needed = Math.max(0, magSafe - ammoClamped);
  const load = Math.min(needed, reserveSafe);
  return {
    needed,
    load,
    ammoAfter: ammoClamped + load,
    reserveAfter: reserveSafe - load,
  };
}

export function parseStoredFloat(raw: string, fallback: number, min: number, max: number): number {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return clampNumber(n, min, max);
}

export function parseStoredInt(raw: string, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(clampNumber(n, min, max));
}

export type CrosshairStyle = "dot" | "cross" | "dynamic";

export function parseCrosshairStyle(raw: string): CrosshairStyle {
  if (raw === "dot" || raw === "cross" || raw === "dynamic") return raw;
  return "dynamic";
}

export function aabbValid(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
  return minX <= maxX && minZ <= maxZ;
}

/** Divide without Infinity when the denominator is 0/NaN. */
export function safeDiv(n: number, d: number, eps = 0.01): number {
  if (!Number.isFinite(n) || !Number.isFinite(d)) return 0;
  const den = Math.abs(d) < eps ? (d < 0 ? -eps : eps) : d;
  return n / den;
}
