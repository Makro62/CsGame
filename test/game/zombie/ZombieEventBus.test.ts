import { describe, it, expect, vi } from "vitest";
import { ZombieEventBus } from "@src/game/zombie/ZombieEventBus";

describe("ZombieEventBus", () => {
  it("emits to single handler", () => {
    const bus = new ZombieEventBus();
    const h = vi.fn();
    bus.on(h);
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(h).toHaveBeenCalledTimes(1);
  });

  it("emits to multiple handlers in order", () => {
    const bus = new ZombieEventBus();
    const order: number[] = [];
    bus.on(() => order.push(1));
    bus.on(() => order.push(2));
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(order).toEqual([1, 2]);
  });

  it("one throwing handler does not break others (P1 fix)", () => {
    const bus = new ZombieEventBus();
    const h2 = vi.fn();
    bus.on(() => { throw new Error("boom"); });
    bus.on(h2);
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("off removes handler", () => {
    const bus = new ZombieEventBus();
    const h = vi.fn();
    bus.on(h);
    bus.off(h);
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(h).not.toHaveBeenCalled();
  });

  it("off during emit does not affect current emit (snapshot)", () => {
    const bus = new ZombieEventBus();
    const h2 = vi.fn();
    const h1 = vi.fn(() => bus.off(h2));
    bus.on(h1);
    bus.on(h2);
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    // h2 was already snapshotted, so it still fires this emit
    expect(h2).toHaveBeenCalledTimes(1);
    bus.emit({ type: "zombieHit", id: "1", x: 0, y: 0, z: 0, headshot: false, damage: 10 });
    expect(h2).toHaveBeenCalledTimes(1); // not called again
  });

  it("clear removes all handlers", () => {
    const bus = new ZombieEventBus();
    bus.on(vi.fn());
    bus.on(vi.fn());
    bus.clear();
    const h = vi.fn();
    bus.on(h);
    bus.emit({ type: "playerDamaged", amount: 10 });
    expect(h).toHaveBeenCalledTimes(1);
  });

  it("emit with no handlers is no-op", () => {
    const bus = new ZombieEventBus();
    expect(() => bus.emit({ type: "playerDamaged", amount: 5 })).not.toThrow();
  });

  it("duplicate on fires twice", () => {
    const bus = new ZombieEventBus();
    const h = vi.fn();
    bus.on(h);
    bus.on(h);
    bus.emit({ type: "playerDamaged", amount: 5 });
    expect(h).toHaveBeenCalledTimes(2);
  });
});
