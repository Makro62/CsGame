import * as THREE from "three";

// AK-47 recoil pattern "7" - 30 bullets
const AK47_RECOIL_PATTERN: [number, number][] = [
  [0.000, 0.010], [0.000, 0.018], [0.000, 0.025], [0.000, 0.030],
  [0.000, 0.033], [-0.008, 0.035], [-0.014, 0.036], [-0.018, 0.037],
  [-0.020, 0.038], [-0.022, 0.038], [-0.024, 0.037], [-0.026, 0.036],
  [-0.028, 0.035], [-0.030, 0.033], [-0.032, 0.030], [-0.034, 0.027],
  [-0.035, 0.024], [-0.036, 0.021], [-0.037, 0.018], [-0.038, 0.015],
  [-0.038, 0.012], [-0.037, 0.010], [-0.036, 0.008], [-0.034, 0.007],
  [-0.032, 0.006], [-0.030, 0.005], [-0.027, 0.005], [-0.024, 0.005],
  [-0.020, 0.005], [-0.015, 0.005],
];

const M4A1_RECOIL_PATTERN: [number, number][] = [
  [0.000, 0.008], [0.000, 0.014], [0.000, 0.019], [0.000, 0.023],
  [0.000, 0.026], [0.000, 0.028], [0.000, 0.030], [0.000, 0.031],
  [0.000, 0.032], [0.000, 0.032], [0.000, 0.031], [0.000, 0.030],
  [0.000, 0.028], [0.000, 0.026], [0.000, 0.024], [0.000, 0.022],
  [0.000, 0.020], [0.000, 0.018], [0.000, 0.016], [0.000, 0.014],
  [0.000, 0.012], [0.000, 0.010], [0.000, 0.009], [0.000, 0.008],
  [0.000, 0.007], [0.000, 0.006], [0.000, 0.005], [0.000, 0.005],
  [0.000, 0.004], [0.000, 0.004],
];

const RECOIL_PATTERNS: Record<string, [number, number][]> = {
  ak47: AK47_RECOIL_PATTERN,
  m4a1: M4A1_RECOIL_PATTERN,
  awp: [[0, 0.05]], // Single shot, high recoil
  deagle: [[0, 0.04], [0, 0.035]],
  mp5: AK47_RECOIL_PATTERN.map(([x, y]) => [x * 0.6, y * 0.6]),
  glock: [[0, 0.015], [0, 0.012], [0, 0.01], [0, 0.008]], // Low recoil, semi-auto
  tec9: AK47_RECOIL_PATTERN.map(([x, y]): [number, number] => [x * 0.5, y * 0.5]).slice(0, 18), // High fire rate, moderate recoil
  autopistol: [[0, 0.018], [0, 0.015], [0, 0.012], [0, 0.01], [0, 0.008]], // Balanced auto pistol
  knife: [], // No recoil
  combatknife: [], // No recoil
};

export class RecoilController {
  private pattern: [number, number][];
  private bulletsFired: number = 0;
  private lastFireTime: number = 0;
  private currentOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor(weapon: string) {
    this.pattern = RECOIL_PATTERNS[weapon] || AK47_RECOIL_PATTERN;
  }

  fire(): { offsetX: number; offsetY: number } {
    const now = performance.now();
    const timeSinceLastFire = now - this.lastFireTime;

    // Reset if too long since last fire (300ms spray reset)
    if (timeSinceLastFire > 300) {
      this.bulletsFired = 0;
    }

    const bulletIndex = Math.min(
      this.bulletsFired,
      this.pattern.length - 1
    );
    const [offsetX, offsetY] = this.pattern[bulletIndex];

    this.currentOffset.set(offsetX, offsetY);
    this.bulletsFired++;
    this.lastFireTime = now;

    return { offsetX, offsetY };
  }

  update(_deltaTime: number): { offsetX: number; offsetY: number } {
    // Recovery: lerp back to center when not firing
    const now = performance.now();
    const timeSinceLastFire = now - this.lastFireTime;

    if (timeSinceLastFire > 50) {
      // Start recovery
      this.currentOffset.lerp(new THREE.Vector2(0, 0), 0.15);
    }

    // Reset bullets fired after 300ms
    if (timeSinceLastFire > 300) {
      this.bulletsFired = 0;
    }

    return {
      offsetX: this.currentOffset.x,
      offsetY: this.currentOffset.y,
    };
  }

  reset() {
    this.bulletsFired = 0;
    this.currentOffset.set(0, 0);
  }
}

// Spray spread
export function getSpreadRadius(
  weapon: string,
  movementState: "idle" | "walk" | "sprint" | "slide" | "airborne",
  isADS: boolean,
  sprayCount: number
): number {
  if (isADS) return 0;

  const baseSpread: Record<string, number> = {
    ak47: 0.02,
    m4a1: 0.018,
    awp: 0.5,
    deagle: 0.025,
    mp5: 0.022,
    glock: 0.018,
    tec9: 0.028,
    autopistol: 0.02,
    knife: 0,
    combatknife: 0,
  };

  const movementMultiplier: Record<string, number> = {
    idle: 1,
    walk: 3,
    sprint: 12.5,
    slide: 12.5,
    airborne: 22.5,
  };

  const base = baseSpread[weapon] || 0.02;
  const mult = movementMultiplier[movementState] || 1;
  const sprayBonus = sprayCount * 0.003;

  return base * mult + sprayBonus;
}
