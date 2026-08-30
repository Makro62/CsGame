import { describe, expect, it, beforeEach } from "vitest";
import { useOffline5v5Store } from "./Offline5v5Store";

describe("Offline5v5Store Bomb Mechanics", () => {
  beforeEach(() => {
    useOffline5v5Store.getState().initMatch("Tester", "T");
  });

  it("initializes match with local player and bots", () => {
    const state = useOffline5v5Store.getState();
    expect(state.players.has("local")).toBe(true);
    expect(state.players.size).toBe(10);
    expect(state.bombDropped).toBe(false);
  });

  it("resets bomb drop coordinates when local player picks up the bomb", () => {
    useOffline5v5Store.setState({
      phase: "active",
      bombDropped: true,
      bombDropX: 10,
      bombDropZ: 10,
    });

    const localPlayer = useOffline5v5Store.getState().players.get("local")!;
    useOffline5v5Store.getState().players.set("local", {
      ...localPlayer,
      x: 10.5,
      z: 10.5,
      hasBomb: false,
      isDead: false,
    });

    // Run a tick so local pickup logic executes
    useOffline5v5Store.getState().tick(0.1);

    const updated = useOffline5v5Store.getState();
    expect(updated.bombDropped).toBe(false);
    expect(updated.bombDropX).toBe(0);
    expect(updated.bombDropZ).toBe(0);
    expect(updated.players.get("local")?.hasBomb).toBe(true);
  });

  it("resets bomb drop coordinates when a bot picks up the bomb", () => {
    useOffline5v5Store.setState({
      phase: "active",
      bombDropped: true,
      bombDropX: -15,
      bombDropZ: 5,
    });

    const botT1 = useOffline5v5Store.getState().players.get("bot_t1")!;
    useOffline5v5Store.getState().players.set("bot_t1", {
      ...botT1,
      x: -15.2,
      z: 5.1,
      hasBomb: false,
      isDead: false,
    });

    // Run tick so bot logic runs and picks up dropped bomb
    useOffline5v5Store.getState().tick(0.1);

    const updated = useOffline5v5Store.getState();
    expect(updated.bombDropped).toBe(false);
    expect(updated.bombDropX).toBe(0);
    expect(updated.bombDropZ).toBe(0);
  });
});
