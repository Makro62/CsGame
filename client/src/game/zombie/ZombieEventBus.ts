// ── Typed Game Event Bus for Zombie Mode ──────────────────────────────────

export type ZombieEvent =
  | { type: "zombieHit"; id: string; x: number; y: number; z: number; headshot: boolean; damage: number }
  | { type: "zombieKilled"; id: string; x: number; y: number; z: number; points: number }
  | { type: "playerDamaged"; amount: number; source?: string };

export type ZombieEventHandler = (ev: ZombieEvent) => void;

export class ZombieEventBus {
  private handlers: ZombieEventHandler[] = [];

  on(h: ZombieEventHandler) {
    this.handlers.push(h);
  }

  off(h: ZombieEventHandler) {
    this.handlers = this.handlers.filter((x) => x !== h);
  }

  emit(ev: ZombieEvent) {
    for (const h of this.handlers) {
      h(ev);
    }
  }

  clear() {
    this.handlers = [];
  }
}

export const zombieEvents = new ZombieEventBus();
