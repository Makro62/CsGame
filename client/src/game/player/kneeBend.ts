export interface LegBend {
  thigh: number;
  knee: number;
}

function clampUnit(v: number): number {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

export function crouchLegAngles(thighLen: number, shinLen: number, drop: number): LegBend {
  const d = Math.max(0.01, thighLen + shinLen - drop);
  const cosPhi = clampUnit(
    (thighLen * thighLen + d * d - shinLen * shinLen) / (2 * thighLen * d),
  );
  const cosKnee = clampUnit(
    (d * d - thighLen * thighLen - shinLen * shinLen) / (2 * thighLen * shinLen),
  );
  return { thigh: -Math.acos(cosPhi), knee: Math.acos(cosKnee) };
}
