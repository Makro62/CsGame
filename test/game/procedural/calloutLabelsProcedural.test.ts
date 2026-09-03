import { describe, it, expect, beforeEach } from "vitest";
import { MAP_CALLOUTS, DUST_CALLOUTS, type MapCallout } from "@cs-game/shared";
import {
  registerProceduralMap,
  getProceduralMapData,
  clearProceduralMapRegistry,
} from "@src/game/map/ProceduralMapRegistry";

function getCalloutsForMap(mapId: string): readonly MapCallout[] {
  if (mapId === "dust") return DUST_CALLOUTS;
  const proc = getProceduralMapData(mapId);
  if (proc) return proc.callouts;
  return MAP_CALLOUTS;
}

describe("CalloutLabels callout resolution", () => {
  beforeEach(() => { clearProceduralMapRegistry(); });

  it("returns MAP_CALLOUTS for unknown map", () => {
    const callouts = getCalloutsForMap("unknown_map");
    expect(callouts).toBe(MAP_CALLOUTS);
    expect(callouts.length).toBeGreaterThan(0);
  });

  it("returns DUST_CALLOUTS for dust map", () => {
    expect(getCalloutsForMap("dust")).toBe(DUST_CALLOUTS);
  });

  it("returns procedural callouts when registered", () => {
    const procCallouts: MapCallout[] = [
      { id: "proc_mid", label: "PROC MID", x: 0, z: 0 },
      { id: "proc_a", label: "PROC A", x: 18, z: -15 },
    ];
    registerProceduralMap("procedural_5v5", {
      obstacles: [], callouts: procCallouts,
      bombSites: { A: { x: 18, z: -15, radius: 6 }, B: { x: -18, z: 15, radius: 6 } },
      spawns: { T: { x: -33, z: 0 }, CT: { x: 33, z: 0 } },
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed: 42,
    });
    const callouts = getCalloutsForMap("procedural_5v5");
    expect(callouts).toBe(procCallouts);
    expect(callouts.length).toBe(2);
    expect(callouts[0].label).toBe("PROC MID");
  });

  it("procedural callouts have valid coordinates", () => {
    const procCallouts: MapCallout[] = [
      { id: "mid", label: "MID", x: 5, z: -3 },
      { id: "a_site", label: "A SITE", x: 20, z: -18 },
    ];
    registerProceduralMap("procedural_5v5", {
      obstacles: [], callouts: procCallouts,
      bombSites: { A: { x: 18, z: -15, radius: 6 }, B: { x: -18, z: 15, radius: 6 } },
      spawns: { T: { x: -33, z: 0 }, CT: { x: 33, z: 0 } },
      bounds: { minX: -42, maxX: 42, minZ: -52, maxZ: 52 }, seed: 42,
    });
    for (const c of getCalloutsForMap("procedural_5v5")) {
      expect(typeof c.x).toBe("number");
      expect(typeof c.z).toBe("number");
      expect(c.id.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it("ravenpoint uses MAP_CALLOUTS", () => {
    expect(getCalloutsForMap("ravenpoint")).toBe(MAP_CALLOUTS);
  });

  it("container_yard uses MAP_CALLOUTS", () => {
    expect(getCalloutsForMap("container_yard")).toBe(MAP_CALLOUTS);
  });

  it("different procedural maps have independent callouts", () => {
    const calloutsA: MapCallout[] = [{ id: "a1", label: "A1", x: 0, z: 0 }];
    const calloutsB: MapCallout[] = [{ id: "b1", label: "B1", x: 5, z: 5 }];
    registerProceduralMap("map_a", {
      obstacles: [], callouts: calloutsA,
      bombSites: { A: { x: 0, z: 0, radius: 6 }, B: { x: 5, z: 5, radius: 6 } },
      spawns: { T: { x: -10, z: 0 }, CT: { x: 10, z: 0 } },
      bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, seed: 1,
    });
    registerProceduralMap("map_b", {
      obstacles: [], callouts: calloutsB,
      bombSites: { A: { x: 0, z: 0, radius: 6 }, B: { x: 5, z: 5, radius: 6 } },
      spawns: { T: { x: -10, z: 0 }, CT: { x: 10, z: 0 } },
      bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, seed: 2,
    });
    expect(getCalloutsForMap("map_a")).toBe(calloutsA);
    expect(getCalloutsForMap("map_b")).toBe(calloutsB);
  });
});
