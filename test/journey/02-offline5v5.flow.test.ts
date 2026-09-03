/**
 * Alur: menu → pilih tim/map/agen → buy → main → plant/eliminasi → skor → menu.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BOMB_SITES, ECONOMY } from "@cs-game/shared";
import { MAPS, getMapById } from "@src/game/map/MapRegistry";
import { ensureProcedural5v5, PROCEDURAL_5V5_ID, clearProceduralMapRegistry } from "@src/game/map/ProceduralMapRegistry";
import { getAgentsForTeam } from "@src/game/offline/agents";
import { botBuy, DIFFICULTIES, mkPlayer } from "@src/game/offline/BotAI";
import { useGameStore } from "@src/stores/useGameStore";
import { useOffline5v5Store } from "@src/stores/useOffline5v5Store";

vi.mock("@src/components/AudioManager", () => ({
  Sound: { deploy: vi.fn(), cancelReload: vi.fn(), buy: vi.fn() },
}));

beforeEach(() => {
  clearProceduralMapRegistry();
  useGameStore.getState().setMode("menu");
  useOffline5v5Store.getState().initMatch("Jeremy", "T", "medium", "container_yard");
});

describe("Alur 5v5 offline", () => {
  it("T: pilih map → beli senjata → tanam → menang eliminasi → kembali menu", () => {
    expect(MAPS.map((m) => m.id)).toEqual(["container_yard", "ravenpoint", PROCEDURAL_5V5_ID]);
    expect(getMapById("dust").id).toBe("ravenpoint");
    expect(getAgentsForTeam("T").length).toBeGreaterThan(0);

    useGameStore.getState().setMode("offline5v5");
    useGameStore.getState().setCurrentMap("container_yard");
    useOffline5v5Store.getState().initMatch("Jeremy", "T", "medium", "container_yard");

    const match = useOffline5v5Store.getState();
    expect(match.phase).toBe("buy");
    expect(match.players.size).toBe(10);
    expect(match.players.get("local")!.team).toBe("T");
    expect(match.players.get("local")!.hasBomb).toBe(true);
    expect(match.players.get("local")!.money).toBe(ECONOMY.startMoney);
    expect(DIFFICULTIES.easy.accuracy).toBeLessThan(DIFFICULTIES.hard.accuracy);

    const rich = new Map(match.players);
    const me = match.players.get("local")!;
    rich.set("local", { ...me, money: 5000 });
    useOffline5v5Store.setState({ players: rich });
    expect(useOffline5v5Store.getState().localBuy("ak47")).toBe(true);
    expect(useOffline5v5Store.getState().localBuy("kevlar")).toBe(true);
    useOffline5v5Store.getState().localSwitchWeapon(1);
    expect(useOffline5v5Store.getState().players.get("local")!.currentWeapon).toBe("ak47");
    useOffline5v5Store.getState().localSwitchWeapon(2);
    expect(useOffline5v5Store.getState().players.get("local")!.currentWeapon).toBe("glock");

    const support = mkPlayer("bot_t2", "T", "Support", true);
    support.money = 5000;
    botBuy(support);
    expect(support.primaryWeapon).toBe("ak47");

    useOffline5v5Store.setState({ phase: "active" });
    expect(useOffline5v5Store.getState().localBuy("awp")).toBe(false);

    const planted = new Map(useOffline5v5Store.getState().players);
    const bomber = planted.get("local")!;
    planted.set("local", { ...bomber, x: BOMB_SITES.A.x, z: BOMB_SITES.A.z, hasBomb: true });
    useOffline5v5Store.setState({ players: planted });
    useOffline5v5Store.getState().localPlantStart("A");
    expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(true);
    useOffline5v5Store.getState().localPlantCancel();
    expect(useOffline5v5Store.getState().players.get("local")!.isPlanting).toBe(false);

    const wipe = new Map(useOffline5v5Store.getState().players);
    for (const [id, p] of wipe) {
      if (p.team === "CT") wipe.set(id, { ...p, isDead: true });
    }
    useOffline5v5Store.setState({ players: wipe });
    useOffline5v5Store.getState().checkRoundEnd();
    expect(useOffline5v5Store.getState().phase).toBe("roundEnd");
    expect(useOffline5v5Store.getState().teamRedScore).toBe(1);

    useGameStore.getState().setMode("menu");
    expect(useGameStore.getState().mode).toBe("menu");
  });

  it("CT: pilih Procedural Arena → spawn CT → defuse ditolak tanpa bom → menang hapus T", () => {
    const proc = ensureProcedural5v5(42);
    useGameStore.getState().setMode("offline5v5");
    useGameStore.getState().setCurrentMap(PROCEDURAL_5V5_ID);
    useOffline5v5Store.getState().initMatch("Jeremy", "CT", "medium", PROCEDURAL_5V5_ID);

    const me = useOffline5v5Store.getState().players.get("local")!;
    expect(me.team).toBe("CT");
    expect(me.hasBomb).toBe(false);
    expect(me.x).toBeCloseTo(proc.spawns.CT.x, 0);
    expect(me.z).toBeCloseTo(proc.spawns.CT.z, 0);

    useOffline5v5Store.setState({ phase: "active", bombPlanted: false });
    useOffline5v5Store.getState().localDefuseStart();
    expect(useOffline5v5Store.getState().players.get("local")!.isDefusing).toBe(false);

    const nearA = new Map(useOffline5v5Store.getState().players);
    nearA.set("local", { ...me, x: proc.bombSites.A.x, z: proc.bombSites.A.z });
    useOffline5v5Store.setState({ players: nearA, bombPlanted: true, bombSite: "A" });
    useOffline5v5Store.getState().localDefuseStart();
    expect(useOffline5v5Store.getState().players.get("local")!.isDefusing).toBe(true);
    useOffline5v5Store.getState().localDefuseCancel();

    const wipeT = new Map(useOffline5v5Store.getState().players);
    for (const [id, p] of wipeT) {
      if (p.team === "T") wipeT.set(id, { ...p, isDead: true });
    }
    useOffline5v5Store.setState({ players: wipeT, bombPlanted: false, phase: "active" });
    useOffline5v5Store.getState().checkRoundEnd();
    expect(useOffline5v5Store.getState().phase).toBe("roundEnd");
    expect(useOffline5v5Store.getState().teamBlueScore).toBe(1);

    useGameStore.getState().setMode("menu");
    expect(useGameStore.getState().mode).toBe("menu");
  });
});
