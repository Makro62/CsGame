let amplitude = 0;

const MAX_AMPLITUDE = 0.42;
const DECAY = 10;

export function triggerScreenShake(amount: number) {
  amplitude = Math.min(MAX_AMPLITUDE, amplitude + Math.max(0, amount));
}

export function consumeScreenShake(dt: number): { x: number; y: number } {
  if (amplitude < 0.0004) {
    amplitude = 0;
    return { x: 0, y: 0 };
  }
  amplitude *= Math.exp(-DECAY * dt);
  return {
    x: (Math.random() - 0.5) * 2 * amplitude,
    y: (Math.random() - 0.5) * 2 * amplitude,
  };
}

export function resetScreenShake() {
  amplitude = 0;
}

export function peekScreenShakeAmplitude() {
  return amplitude;
}
