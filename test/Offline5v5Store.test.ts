import { describe, it, expect, beforeEach, vi } from "vitest";
import { BOMB_SITES, ROUND, WEAPONS } from "@cs-game/shared";
import { useOffline5v5Store } from "../client/src/screens/Offline5v5Store";

describe("Offline5v5Store", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useOffline5v5Store.getState().initMatch("Tester", "T");
  });

  it("spawns a local player and nine bots", () => {
    const { players } = useOffline5v5Store.getState();
    expect(players.size).toBe(10);
    expect(players.get("local")?.team).toBe("T");
    expect(players.get("local")?.hasBomb).toBe(true);
  });

  it("damages a bot with localShoot", () => {
    const store = useOffline5v5Store.getState();
    const bot = [...store.players.values()].find((p) => p.isBot && p.team === "CT");
    expect(bot).toBeTruthy();
    const hp = bot!.hp;
    store.localShoot(bot!.id, false);
    const after = useOffline5v5Store.getState().players.get(bot!.id);
    expect(after!.hp).toBeLessThan(hp);
  });

  it("applies headshot damage and kill feed on lethal shot", () => {
    const store = useOffline5v5Store.getState();
    const bot = [...store.players.values()].find((p) => p.isBot && p.team === "CT")!;
    const ws = WEAPONS.glock;
    const shots = Math.ceil(bot.hp / ws.headshot) + 1;
    for (let i = 0; i < shots; i++) {
      useOffline5v5Store.getState().localShoot(bot.id, true);
    }
    const after = useOffline5v5Store.getState().players.get(bot.id);
    expect(after?.isDead).toBe(true);
    expect(useOffline5v5Store.getState().killFeed.length).toBeGreaterThan(0);
    expect(useOffline5v5Store.getState().players.get("local")?.kills).toBeGreaterThan(0);
  });

  it("updates local position for bot perception", () => {
    useOffline5v5Store.getState().setLocalPos(4, 5, 1.2);
    const me = useOffline5v5Store.getState().players.get("local");
    expect(me?.x).toBe(4);
    expect(me?.z).toBe(5);
    expect(me?.rotationY).toBe(1.2);
  });

  it("reloads from reserve into the magazine", () => {
    vi.useFakeTimers();
    const store = useOffline5v5Store.getState();
    const me = store.players.get("local")!;
    const players = new Map(store.players);
    players.set("local", { ...me, ammo: 1, reserveAmmo: 40, isReloading: false });
    useOffline5v5Store.setState({ players });
    useOffline5v5Store.getState().localReload();
    expect(useOffline5v5Store.getState().players.get("local")?.isReloading).toBe(true);
    vi.advanceTimersByTime(WEAPONS.glock.reload * 1000 + 10);
    const after = useOffline5v5Store.getState().players.get("local")!;
    expect(after.isReloading).toBe(false);
    expect(after.ammo).toBe(WEAPONS.glock.mag);
    expect(after.reserveAmmo).toBe(40 - (WEAPONS.glock.mag - 1));
    vi.useRealTimers();
  });

  it("plants at the nearest site then explodes for T if not defused", () => {
    const store = useOffline5v5Store.getState();
    store.tick(ROUND.buyPhaseDuration + 0.05);
    const frozen = new Map(store.players);
    frozen.forEach((p, id) => {
      if (!p.isBot) return;
      frozen.set(id, {
        ...p,
        isPlanting: false,
        isDefusing: false,
        botSpeed: 0,
        x: p.team === "CT" ? 25 : -25,
        z: p.team === "CT" ? 0 : 0,
      });
    });
    useOffline5v5Store.setState({ players: frozen });
    store.setLocalPos(BOMB_SITES.A.x, BOMB_SITES.A.z, 0);
    store.localPlantStart("");
    expect(useOffline5v5Store.getState().players.get("local")?.isPlanting).toBe(true);
    store.tick(ROUND.plantDuration + 0.05);
    expect(useOffline5v5Store.getState().bombPlanted).toBe(true);
    expect(useOffline5v5Store.getState().bombSite).toBe("A");
    useOffline5v5Store.getState().tick(ROUND.bombTimer + 0.05);
    expect(useOffline5v5Store.getState().teamRedScore).toBeGreaterThan(0);
  });

  it("defuses a planted bomb as CT", () => {
    useOffline5v5Store.getState().initMatch("CTPlayer", "CT");
    const store = useOffline5v5Store.getState();
    store.tick(ROUND.buyPhaseDuration + 0.05);
    const frozen = new Map(store.players);
    frozen.forEach((p, id) => {
      if (p.isBot) frozen.set(id, { ...p, isDead: true, isPlanting: false, isDefusing: false });
    });
    useOffline5v5Store.setState({
      players: frozen,
      bombPlanted: true,
      bombSite: "B",
      bombTimeLeft: ROUND.bombTimer,
      bombDropX: BOMB_SITES.B.x,
      bombDropZ: BOMB_SITES.B.z,
    });
    store.setLocalPos(BOMB_SITES.B.x, BOMB_SITES.B.z, 0);
    store.localDefuseStart();
    expect(useOffline5v5Store.getState().players.get("local")?.isDefusing).toBe(true);
    store.tick(ROUND.defuseDuration + 0.05);
    expect(useOffline5v5Store.getState().teamBlueScore).toBeGreaterThan(0);
  });

  it("uses Container Yard round config for buy and active timers", () => {
    const s = useOffline5v5Store.getState();
    expect(s.buyPhaseTimeLeft).toBe(ROUND.buyPhaseDuration);
    expect(s.roundTimeLeft).toBe(ROUND.activePhaseDuration);
    expect(s.maxRounds).toBe(ROUND.maxRounds);
  });
});
