import { describe, it, expect } from "vitest";
import { ZombieEventBus } from "../../../client/src/game/zombie/ZombieEventBus";
import type { ZombieEvent } from "../../../client/src/game/zombie/ZombieEventBus";

describe("ZombieEventBus", () => {
  it("calls handler on emit", () => {
    const bus = new ZombieEventBus();
    const events: ZombieEvent[] = [];
    bus.on((ev) => events.push(ev));
    bus.emit({ type: "zombieKilled", id: "z1", x: 0, y: 0, z: 0, points: 50 });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("zombieKilled");
  });

  it("does not call removed handler", () => {
    const bus = new ZombieEventBus();
    const events: ZombieEvent[] = [];
    const handler = (ev: ZombieEvent) => events.push(ev);
    bus.on(handler);
    bus.off(handler);
    bus.emit({ type: "zombieHit", id: "z1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(events).toHaveLength(0);
  });

  it("clear removes all handlers", () => {
    const bus = new ZombieEventBus();
    const events: ZombieEvent[] = [];
    bus.on(() => events.push({ type: "playerDamaged", amount: 10 }));
    bus.clear();
    bus.emit({ type: "playerDamaged", amount: 10 });
    expect(events).toHaveLength(0);
  });

  it("continues calling other handlers if one throws", () => {
    const bus = new ZombieEventBus();
    const events: ZombieEvent[] = [];
    bus.on(() => {
      throw new Error("boom");
    });
    bus.on((ev) => events.push(ev));
    bus.emit({ type: "zombieHit", id: "z1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(events).toHaveLength(1);
  });

  it("supports multiple handlers", () => {
    const bus = new ZombieEventBus();
    let count = 0;
    bus.on(() => count++);
    bus.on(() => count++);
    bus.emit({ type: "zombieKilled", id: "z1", x: 0, y: 0, z: 0, points: 50 });
    expect(count).toBe(2);
  });
});
