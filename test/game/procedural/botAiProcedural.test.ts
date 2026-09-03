import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerProceduralMap,
  clearProceduralMapRegistry,
} from "@src/game/map/ProceduralMapRegistry";
import { mkPlayer, DIFFICULTIES, defaultLoadout, refillAmmo } from "@src/game/offline/BotAI";
import { nearestBombSite, distToBombSite } from "@src/game/offline/offlineCombat";

vi.mock("@src/stores/useGameStore", () => {
  let currentMap = "procedural_5v5";
  return {
    useGameStore: {
      getState: () => ({ currentMap }),
      setState: (partial: Record<string, unknown>) => {
        if ("currentMap" in partial) currentMap = partial.currentMap as string;
      },
    },
  };
});

function makeProcMapData(seed: number) {
  return {
    obstacles: [],
    callouts: [],
    bombSites: {
      A: { x: 18, z: -15, radius: 6 },
      B: { x: -18, z: 15, radius: 6 },
    },
    spawns: {
      T: { x: -33, z: 0 },
      CT: { x: 33, z: 0 },
    },
    bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 },
    seed,
  };
}

describe("mkPlayer with procedural map", () => {
  beforeEach(() => {
    clearProceduralMapRegistry();
  });

  it("local player uses procedural spawn for T", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("local", "T", "Test", false, "medium", "procedural_5v5");
    expect(p.x).toBe(-33);
    expect(p.z).toBe(0);
  });

  it("local player uses procedural spawn for CT", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("local", "CT", "Test", false, "medium", "procedural_5v5");
    expect(p.x).toBe(33);
    expect(p.z).toBe(0);
  });

  it("bot spawn is near procedural spawn", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("bot_t1", "T", "Bot T1", true, "medium", "procedural_5v5");
    expect(Math.abs(p.x - (-33))).toBeLessThan(15);
    expect(Math.abs(p.z)).toBeLessThan(10);
  });

  it("CT bot spawn is near procedural CT spawn", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("bot_ct1", "CT", "Bot CT1", true, "medium", "procedural_5v5");
    expect(Math.abs(p.x - 33)).toBeLessThan(15);
    expect(Math.abs(p.z)).toBeLessThan(10);
  });

  it("falls back to default spawn when no procedural data", () => {
    const p = mkPlayer("local", "T", "Test", false, "medium", "container_yard");
    expect(p.x).toBe(-22);
    expect(p.z).toBe(0);
  });

  it("bot gets correct difficulty config", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("bot_t1", "T", "Bot", true, "hard", "procedural_5v5");
    expect(p.botAccuracy).toBe(DIFFICULTIES.hard.accuracy);
    expect(p.botHsRate).toBe(DIFFICULTIES.hard.hsRate);
    const viewMul = p.botRole === "flanker" ? 1.25 : p.botRole === "entry" ? 0.9 : 1;
    expect(p.botViewDist).toBeCloseTo(DIFFICULTIES.hard.viewDist * viewMul);
  });

  it("local player has higher accuracy than bot", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const local = mkPlayer("local", "T", "Player", false, "medium", "procedural_5v5");
    const bot = mkPlayer("bot_t1", "T", "Bot", true, "medium", "procedural_5v5");
    expect(local.botAccuracy).toBeGreaterThan(bot.botAccuracy);
  });

  it("T player starts with glock", () => {
    const p = mkPlayer("local", "T", "Player", false, "medium", "procedural_5v5");
    expect(p.currentWeapon).toBe("glock");
  });

  it("CT player starts with autopistol", () => {
    const p = mkPlayer("local", "CT", "Player", false, "medium", "procedural_5v5");
    expect(p.currentWeapon).toBe("autopistol");
  });

  it("all players start with 100 HP", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(mkPlayer("local", "T", "P", false, "medium", "procedural_5v5").hp).toBe(100);
    expect(mkPlayer("bot_t1", "T", "B", true, "medium", "procedural_5v5").hp).toBe(100);
  });

  it("all players start with 800 money", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(mkPlayer("local", "T", "P", false, "medium", "procedural_5v5").money).toBe(800);
    expect(mkPlayer("bot_t1", "T", "B", true, "medium", "procedural_5v5").money).toBe(800);
  });

  it("local player is not dead, not a bot", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const p = mkPlayer("local", "T", "P", false, "medium", "procedural_5v5");
    expect(p.isDead).toBe(false);
    expect(p.isBot).toBe(false);
  });

  it("bot is flagged as bot", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(mkPlayer("bot_t1", "T", "B", true, "medium", "procedural_5v5").isBot).toBe(true);
  });
});

describe("nearestBombSite with procedural data", () => {
  beforeEach(() => { clearProceduralMapRegistry(); });

  it("points near procedural site A are nearest to A", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(nearestBombSite({ x: 18, z: -15 })).toBe("A");
    expect(nearestBombSite({ x: 16, z: -13 })).toBe("A");
  });

  it("points near procedural site B are nearest to B", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(nearestBombSite({ x: -18, z: 15 })).toBe("B");
    expect(nearestBombSite({ x: -16, z: 13 })).toBe("B");
  });
});

describe("distToBombSite with procedural data", () => {
  beforeEach(() => { clearProceduralMapRegistry(); });

  it("distance to site A is 0 when standing on it", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(distToBombSite({ x: 18, z: -15 }, "A")).toBe(0);
  });

  it("distance to site B is 0 when standing on it", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    expect(distToBombSite({ x: -18, z: 15 }, "B")).toBe(0);
  });

  it("distance increases when moving away from site", () => {
    registerProceduralMap("procedural_5v5", makeProcMapData(42));
    const d1 = distToBombSite({ x: 18, z: -15 }, "A");
    const d2 = distToBombSite({ x: 0, z: 0 }, "A");
    expect(d2).toBeGreaterThan(d1);
  });
});

describe("defaultLoadout", () => {
  it("sets default pistol and clears primary", () => {
    const p = mkPlayer("local", "T", "P", false, "medium", "procedural_5v5");
    defaultLoadout(p);
    expect(p.primaryWeapon).toBe("");
    expect(p.secondaryWeapon).toBe("glock");
    expect(p.knifeSlot).toBe("knife");
  });

  it("refills ammo to pistol defaults", () => {
    const p = mkPlayer("local", "T", "P", false, "medium", "procedural_5v5");
    defaultLoadout(p);
    expect(p.ammo).toBe(20);
    expect(p.reserveAmmo).toBe(120);
  });
});

describe("refillAmmo", () => {
  it("refills secondary ammo to magazine capacity", () => {
    const p = mkPlayer("local", "T", "P", false, "medium", "procedural_5v5");
    p.ammo = 5;
    p.reserveAmmo = 10;
    refillAmmo(p);
    expect(p.ammo).toBe(20);
    expect(p.reserveAmmo).toBe(120);
  });

  it("refills current weapon ammo when weapon is equipped", () => {
    const p = mkPlayer("local", "T", "P", false, "medium", "procedural_5v5");
    p.currentWeapon = "ak47";
    p.ammo = 10;
    p.reserveAmmo = 30;
    refillAmmo(p);
    expect(p.ammo).toBe(30);
    expect(p.reserveAmmo).toBe(90);
  });
});

describe("DIFFICULTIES", () => {
  it("has easy, medium, hard configs", () => {
    expect(DIFFICULTIES.easy).toBeDefined();
    expect(DIFFICULTIES.medium).toBeDefined();
    expect(DIFFICULTIES.hard).toBeDefined();
  });

  it("accuracy increases from easy to hard", () => {
    expect(DIFFICULTIES.hard.accuracy).toBeGreaterThan(DIFFICULTIES.easy.accuracy);
  });

  it("hsRate increases from easy to hard", () => {
    expect(DIFFICULTIES.hard.hsRate).toBeGreaterThan(DIFFICULTIES.easy.hsRate);
  });

  it("reactionTime decreases from easy to hard", () => {
    expect(DIFFICULTIES.hard.reactionTime).toBeLessThan(DIFFICULTIES.easy.reactionTime);
  });

  it("viewDist increases from easy to hard", () => {
    expect(DIFFICULTIES.hard.viewDist).toBeGreaterThan(DIFFICULTIES.easy.viewDist);
  });

  it("speed increases from easy to hard", () => {
    expect(DIFFICULTIES.hard.speed).toBeGreaterThan(DIFFICULTIES.easy.speed);
  });

  it("all difficulties have valid values", () => {
    for (const [, cfg] of Object.entries(DIFFICULTIES)) {
      expect(cfg.accuracy).toBeGreaterThan(0);
      expect(cfg.accuracy).toBeLessThanOrEqual(1);
      expect(cfg.hsRate).toBeGreaterThanOrEqual(0);
      expect(cfg.hsRate).toBeLessThanOrEqual(1);
      expect(cfg.reactionTime).toBeGreaterThan(0);
      expect(cfg.speed).toBeGreaterThan(0);
      expect(cfg.viewDist).toBeGreaterThan(0);
      expect(cfg.fov).toBeGreaterThan(0);
    }
  });
});
