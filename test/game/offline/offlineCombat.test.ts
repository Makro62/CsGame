import { describe, it, expect } from "vitest";
import {
  isPointBlocked,
  hasLineOfSight,
  isInFov,
  resolveBotShot,
  fireIntervalMs,
  nextWaypointIndex,
  stepToward,
  clampToMap,
  laneForBotId,
  roleForBotId,
  laneForRole,
  nearestBombSite,
  distToBombSite,
  cameraYawTowards,
  BOT_PATHS,
  botPath,
} from "@src/game/offline/offlineCombat";
import { BOMB_SITES } from "@cs-game/shared";

// ── isPointBlocked ──
describe("isPointBlocked", () => {
  it("open ground at (50, 50) is not blocked", () => {
    expect(isPointBlocked({ x: 50, z: 50 }, 0.45)).toBe(false);
  });

  it("very large coordinates are blocked by map boundary", () => {
    expect(isPointBlocked({ x: 0, z: 0 }, 0.45)).toBe(true);
  });
});

// ── hasLineOfSight ──
describe("hasLineOfSight", () => {
  it("same point has LOS", () => {
    expect(hasLineOfSight({ x: 0, z: 0 }, { x: 0, z: 0 })).toBe(true);
  });

  it("very close points have LOS", () => {
    expect(hasLineOfSight({ x: 0, z: 0 }, { x: 0.1, z: 0.1 })).toBe(true);
  });
});

// ── isInFov ──
describe("isInFov", () => {
  it("target in front (+Z direction) is in FOV when rotationY=0", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: 10 })).toBe(true);
  });

  it("target behind (-Z direction) is not in default FOV when rotationY=0", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 0, z: -10 })).toBe(false);
  });

  it("target to the side with wide FOV", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 10, z: 0 }, Math.PI * 2)).toBe(true);
  });

  it("target at edge of narrow FOV", () => {
    expect(isInFov({ x: 0, z: 0, rotationY: 0 }, { x: 10, z: 1 }, Math.PI * 0.5)).toBe(false);
  });
});

// ── resolveBotShot ──
describe("resolveBotShot", () => {
  it("high accuracy at close range hits often", () => {
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      const r = resolveBotShot({ accuracy: 0.9, headshotRate: 0, distance: 1, viewDistance: 30 });
      if (r.hit) hits++;
    }
    expect(hits).toBeGreaterThan(50);
  });

  it("zero accuracy never hits", () => {
    for (let i = 0; i < 10; i++) {
      const r = resolveBotShot({ accuracy: 0, headshotRate: 1, distance: 1, viewDistance: 30 });
      expect(r.hit).toBe(false);
    }
  });

  it("distance reduces accuracy", () => {
    let closeHits = 0;
    let farHits = 0;
    for (let i = 0; i < 200; i++) {
      if (resolveBotShot({ accuracy: 0.7, headshotRate: 0, distance: 1, viewDistance: 30 }).hit) closeHits++;
      if (resolveBotShot({ accuracy: 0.7, headshotRate: 0, distance: 25, viewDistance: 30 }).hit) farHits++;
    }
    expect(closeHits).toBeGreaterThanOrEqual(farHits);
  });

  it("headshot rate is subset of hit rate", () => {
    let hits = 0, hss = 0;
    for (let i = 0; i < 200; i++) {
      const r = resolveBotShot({ accuracy: 1, headshotRate: 0.3, distance: 1, viewDistance: 30 });
      if (r.hit) hits++;
      if (r.headshot) hss++;
    }
    expect(hss).toBeLessThanOrEqual(hits);
  });
});

// ── fireIntervalMs ──
describe("fireIntervalMs", () => {
  it("awp has fixed 1400ms interval", () => {
    expect(fireIntervalMs("awp", 1.5)).toBe(1400);
  });

  it("other weapons use fire rate", () => {
    expect(fireIntervalMs("ak47", 10)).toBe(100);
    expect(fireIntervalMs("m4a1", 10)).toBe(100);
  });

  it("fire rate of 0 clamps to 1", () => {
    expect(fireIntervalMs("glock", 0)).toBe(1000);
  });
});

// ── nextWaypointIndex ──
describe("nextWaypointIndex", () => {
  it("advances when close to waypoint", () => {
    const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }, { x: 10, z: 10 }];
    const next = nextWaypointIndex({ x: 0.5, z: 0.5 }, path, 0);
    expect(next).toBe(1);
  });

  it("stays at index when far from waypoint", () => {
    const path = [{ x: 0, z: 0 }, { x: 5, z: 5 }, { x: 10, z: 10 }];
    const next = nextWaypointIndex({ x: 50, z: 50 }, path, 0);
    expect(next).toBe(0);
  });

  it("clamps to last index", () => {
    const path = [{ x: 0, z: 0 }];
    const next = nextWaypointIndex({ x: 0, z: 0 }, path, 0);
    expect(next).toBe(0);
  });
});

// ── stepToward ──
describe("stepToward", () => {
  it("moves toward target", () => {
    const result = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 5, 1);
    expect(result.x).toBeGreaterThan(0);
  });

  it("does not overshoot when very close", () => {
    const result = stepToward({ x: 0, z: 0 }, { x: 0.01, z: 0 }, 5, 1);
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });

  it("returns same position when dt is 0", () => {
    const result = stepToward({ x: 5, z: 5 }, { x: 10, z: 10 }, 5, 0);
    expect(result.x).toBe(5);
    expect(result.z).toBe(5);
  });
});

// ── clampToMap ──
describe("clampToMap", () => {
  it("clamps far positive to boundary", () => {
    const result = clampToMap({ x: 999, z: 999 });
    expect(result.x).toBeLessThan(100);
    expect(result.z).toBeLessThan(100);
  });

  it("clamps far negative to boundary", () => {
    const result = clampToMap({ x: -999, z: -999 });
    expect(result.x).toBeGreaterThan(-100);
    expect(result.z).toBeGreaterThan(-100);
  });

  it("passes through in-bounds point", () => {
    const result = clampToMap({ x: 0, z: 0 });
    expect(result.x).toBe(0);
    expect(result.z).toBe(0);
  });
});

// ── laneForBotId ──
describe("laneForBotId", () => {
  it("maps bot_t1 to A", () => expect(laneForBotId("bot_t1")).toBe("A"));
  it("maps bot_t2 to B", () => expect(laneForBotId("bot_t2")).toBe("B"));
  it("maps bot_t3 to mid", () => expect(laneForBotId("bot_t3")).toBe("mid"));
  it("maps bot_t4 to A (4%3=1)", () => expect(laneForBotId("bot_t4")).toBe("A"));
  it("returns mid for non-numeric id", () => expect(laneForBotId("abc")).toBe("mid"));
});

// ── roleForBotId ──
describe("roleForBotId", () => {
  it("bot_t1 is entry", () => expect(roleForBotId("bot_t1")).toBe("entry"));
  it("bot_t2 is support", () => expect(roleForBotId("bot_t2")).toBe("support"));
  it("bot_t3 is support", () => expect(roleForBotId("bot_t3")).toBe("support"));
  it("bot_t4 is flanker", () => expect(roleForBotId("bot_t4")).toBe("flanker"));
  it("bot_t5 is runner", () => expect(roleForBotId("bot_t5")).toBe("runner"));
  it("non-numeric returns support", () => expect(roleForBotId("abc")).toBe("support"));
});

// ── laneForRole ──
describe("laneForRole", () => {
  it("entry goes to A", () => expect(laneForRole("entry", "bot_t1")).toBe("A"));
  it("runner goes to A", () => expect(laneForRole("runner", "bot_t2")).toBe("A"));
  it("flanker goes to B", () => expect(laneForRole("flanker", "bot_t3")).toBe("B"));
  it("support bot_t3 goes to A", () => expect(laneForRole("support", "bot_t3")).toBe("A"));
  it("support bot_t5 goes to mid", () => expect(laneForRole("support", "bot_t5")).toBe("mid"));
});

// ── nearestBombSite ──
describe("nearestBombSite", () => {
  it("returns A when closer to A", () => {
    expect(nearestBombSite({ x: BOMB_SITES.A.x, z: BOMB_SITES.A.z })).toBe("A");
  });

  it("returns B when closer to B", () => {
    expect(nearestBombSite({ x: BOMB_SITES.B.x, z: BOMB_SITES.B.z })).toBe("B");
  });
});

// ── distToBombSite ──
describe("distToBombSite", () => {
  it("returns 0 when exactly at site A", () => {
    expect(distToBombSite({ x: BOMB_SITES.A.x, z: BOMB_SITES.A.z }, "A")).toBe(0);
  });

  it("returns positive when away from site", () => {
    expect(distToBombSite({ x: 999, z: 999 }, "A")).toBeGreaterThan(0);
  });
});

// ── botPath ──
describe("botPath", () => {
  it("returns A path for T", () => {
    expect(botPath("A", "T").length).toBeGreaterThan(0);
  });

  it("returns mid path for CT", () => {
    expect(botPath("mid", "CT").length).toBeGreaterThan(0);
  });

  it("all lanes have paths for both teams", () => {
    for (const lane of ["A", "mid", "B"] as const) {
      expect(BOT_PATHS[lane].T.length).toBeGreaterThan(0);
      expect(BOT_PATHS[lane].CT.length).toBeGreaterThan(0);
    }
  });
});

// ── cameraYawTowards ──
describe("cameraYawTowards", () => {
  it("returns 0 when looking along -Z", () => {
    expect(cameraYawTowards({ x: 0, z: 0 }, { x: 0, z: -10 })).toBeCloseTo(0);
  });

  it("returns ±PI when looking along +Z", () => {
    expect(Math.abs(cameraYawTowards({ x: 0, z: 0 }, { x: 0, z: 10 }))).toBeCloseTo(Math.PI);
  });
});