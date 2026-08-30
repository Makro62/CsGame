import { describe, expect, it } from "vitest";
import { BOMB_SITES, MAP_OBSTACLES, SPAWN } from "@cs-game/shared";
import {
  BOT_PATHS,
  hasLineOfSight,
  hideBehindCover,
  laneForBotId,
  laneForRole,
  nextWaypointIndex,
  roleForBotId,
  stepToward,
} from "../offline/offlineCombat";

function blocked(x: number, z: number): boolean {
  return MAP_OBSTACLES.some(
    (o) => x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ,
  );
}

describe("Container Yard layout", () => {
  it("keeps spawns and bomb sites in open space", () => {
    expect(blocked(SPAWN.T.x, SPAWN.T.z)).toBe(false);
    expect(blocked(SPAWN.CT.x, SPAWN.CT.z)).toBe(false);
    expect(blocked(BOMB_SITES.A.x, BOMB_SITES.A.z)).toBe(false);
    expect(blocked(BOMB_SITES.B.x, BOMB_SITES.B.z)).toBe(false);
  });

  it("lets T walk out of spawn into mid", () => {
    expect(blocked(-18, 0)).toBe(false);
    expect(hasLineOfSight({ x: -25, z: 0 }, { x: -18, z: 0 })).toBe(true);
  });

  it("blocks a straight mid snipe through the new cover", () => {
    expect(hasLineOfSight({ x: -20, z: 0 }, { x: 20, z: 0 })).toBe(false);
  });

  it("blocks mid from A through the divider wall", () => {
    expect(hasLineOfSight({ x: 0, z: 0 }, { x: 15, z: -15 })).toBe(false);
  });
});

describe("bot lanes", () => {
  it("splits bots across A / B / mid", () => {
    expect(laneForBotId("bot_t1")).toBe("A");
    expect(laneForBotId("bot_t2")).toBe("B");
    expect(laneForBotId("bot_t3")).toBe("mid");
  });

  it("assigns arcade squad roles and spreads them on the map", () => {
    expect(roleForBotId("bot_t1")).toBe("entry");
    expect(roleForBotId("bot_t2")).toBe("support");
    expect(roleForBotId("bot_t4")).toBe("flanker");
    expect(roleForBotId("bot_t5")).toBe("runner");
    expect(laneForRole("entry", "bot_t1")).toBe("A");
    expect(laneForRole("flanker", "bot_t4")).toBe("B");
    expect(laneForRole("support", "bot_t2")).toBe("mid");
  });

  it("keeps every waypoint in walkable space", () => {
    for (const lane of Object.values(BOT_PATHS)) {
      for (const path of [lane.T, lane.CT]) {
        for (const p of path) {
          expect(blocked(p.x, p.z)).toBe(false);
        }
      }
    }
  });

  it("advances waypoint after arriving", () => {
    const path = BOT_PATHS.mid.T;
    expect(nextWaypointIndex(path[0], path, 0)).toBe(1);
    expect(nextWaypointIndex({ x: 99, z: 99 }, path, 0)).toBe(0);
  });

  it("steps toward a point without standing still", () => {
    const next = stepToward({ x: -18, z: 0 }, { x: -12, z: 2.4 }, 4, 0.2);
    expect(Math.hypot(next.x + 18, next.z)).toBeGreaterThan(0.3);
  });

  it("finds a hide point behind cover", () => {
    const hide = hideBehindCover({ x: -14, z: 0 }, { x: 16, z: 0 });
    expect(hide).not.toBeNull();
    expect(blocked(hide!.x, hide!.z)).toBe(false);
  });
});
