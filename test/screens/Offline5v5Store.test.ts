import { describe, expect, it, beforeEach } from "vitest";
import { useOffline5v5Store } from "@src/stores/useOffline5v5Store";

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
    const st = useOffline5v5Store.getState();
    const players = new Map(st.players);
    const localPlayer = players.get("local")!;
    players.set("local", { ...localPlayer, x: 10.5, z: 10.5, hasBomb: false, isDead: false, team: "T" });
    useOffline5v5Store.setState({
      phase: "active",
      bombDropped: true,
      bombDropX: 10,
      bombDropZ: 10,
      players,
    });

    useOffline5v5Store.getState().tick(0.1);

    const updated = useOffline5v5Store.getState();
    expect(updated.bombDropped).toBe(false);
    expect(updated.bombDropX).toBe(0);
    expect(updated.bombDropZ).toBe(0);
    expect(updated.players.get("local")?.hasBomb).toBe(true);
  });

  it("resets bomb drop coordinates when a bot picks up the bomb", () => {
    const st = useOffline5v5Store.getState();
    const players = new Map(st.players);
    const botT1 = players.get("bot_t1")!;
    players.set("bot_t1", { ...botT1, x: -15.2, z: 5.1, hasBomb: false, isDead: false });
    useOffline5v5Store.setState({
      phase: "active",
      bombDropped: true,
      bombDropX: -15,
      bombDropZ: 5,
      players,
    });

    useOffline5v5Store.getState().tick(0.1);

    const updated = useOffline5v5Store.getState();
    expect(updated.bombDropped).toBe(false);
    expect(updated.bombDropX).toBe(0);
    expect(updated.bombDropZ).toBe(0);
  });
});
