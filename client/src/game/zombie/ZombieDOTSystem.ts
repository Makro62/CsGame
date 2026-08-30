export interface ActiveDOT {
  id: string;
  remainingMs: number;
  dps: number;
}

export class ZombieDOTSystem {
  private activeDots: ActiveDOT[] = [];

  add(dps: number, durationMs: number): void {
    this.activeDots.push({
      id: Math.random().toString(36).slice(2, 9),
      remainingMs: durationMs,
      dps,
    });
  }

  update(dt: number, onDamage: (amount: number) => void): void {
    if (this.activeDots.length === 0) return;
    const dtMs = dt * 1000;
    for (let i = this.activeDots.length - 1; i >= 0; i--) {
      const dot = this.activeDots[i];
      dot.remainingMs -= dtMs;
      onDamage(dot.dps * dt);
      if (dot.remainingMs <= 0) {
        this.activeDots.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.activeDots = [];
  }

  get count(): number {
    return this.activeDots.length;
  }
}
