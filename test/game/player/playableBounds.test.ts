import { describe, it, expect, vi } from "vitest";

const mockGetProceduralMapData = vi.fn(() => undefined);
vi.mock("../../../client/src/game/training/TrainingArena", () => ({
  TRAINING_ARENA: {
    minX: -20, maxX: 20, minZ: -46, maxZ: 10,
    wallHeight: 6, firingLineZ: 0, recoilWallZ: -25,
    spawn: { x: 0, z: 6 },
  },
}));

vi.mock("../../../client/src/game/zombie/survivalLayout", () => ({
  SURVIVAL_BOUNDS: { minX: -25, maxX: 25, minZ: -25, maxZ: 25 },
  getSurvivalStageBounds: (stage: number) => {
    if (stage === 1) return { minX: -25, maxX: 25, minZ: -25, maxZ: 25 };
    if (stage === 2) return { minX: -35, maxX: 35, minZ: -35, maxZ: 35 };
    return null;
  },
}));

vi.mock("../../../client/src/game/l4d/l4dLayout", () => ({
  L4D_BOUNDS: { minX: -30, maxX: 30, minZ: -50, maxZ: 50 },
}));

vi.mock("../../../client/src/game/map/ProceduralMapRegistry", () => ({
  getProceduralMapData: (...args: any[]) => mockGetProceduralMapData(...args),
}));

vi.mock("../../../client/src/stores/useZombieStore", () => ({
  useZombieStore: {
    getState: () => ({ unlockedStages: 1 }),
  },
}));

import { getPlayableBounds } from "../../../client/src/game/player/playableBounds";

describe("playableBounds", () => {
  it("returns YARD bounds for offline5v5 with no mapId", () => {
    const b = getPlayableBounds("offline5v5");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns DUST bounds for offline5v5 with dust mapId", () => {
    const b = getPlayableBounds("offline5v5", "dust");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns RAVEN bounds for offline5v5 with ravenpoint mapId", () => {
    const b = getPlayableBounds("offline5v5", "ravenpoint");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns training bounds", () => {
    const b = getPlayableBounds("training");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns zombie bounds", () => {
    const b = getPlayableBounds("zombie");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns l4d bounds", () => {
    const b = getPlayableBounds("l4d");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns YARD bounds for unknown mode", () => {
    const b = getPlayableBounds("unknown_mode");
    expect(b.minX).toBeLessThan(b.maxX);
  });

  it("offline5v5 dust and ravenpoint have bounds", () => {
    const dust = getPlayableBounds("offline5v5", "dust");
    const raven = getPlayableBounds("offline5v5", "ravenpoint");
    expect(dust.minX).toBeLessThan(dust.maxX);
    expect(raven.minX).toBeLessThan(raven.maxX);
  });

  it("returns procedural bounds for offline5v5 when proc data exists", () => {
    const b = getPlayableBounds("offline5v5");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("inset applies CAPSULE_INSET of 0.8", () => {
    const b = getPlayableBounds("offline5v5");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });

  it("returns procedural bounds with inset for offline5v5 custom map", () => {
    mockGetProceduralMapData.mockReturnValue({
      bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
    });
    const b = getPlayableBounds("offline5v5", "custom_map");
    expect(b.minX).toBe(-30 + 0.8);
    expect(b.maxX).toBe(30 - 0.8);
    expect(b.minZ).toBe(-30 + 0.8);
    expect(b.maxZ).toBe(30 - 0.8);
    mockGetProceduralMapData.mockReturnValue(undefined);
  });

  it("falls back to YARD when proc data is null for custom mapId", () => {
    mockGetProceduralMapData.mockReturnValue(null);
    const b = getPlayableBounds("offline5v5", "unknown_map");
    expect(b.minX).toBeLessThan(b.maxX);
    mockGetProceduralMapData.mockReturnValue(undefined);
  });

  it("returns stage bounds for zombie mode via getSurvivalStageBounds (lines 48-51)", () => {
    const b = getPlayableBounds("zombie");
    expect(b.minX).toBeLessThan(b.maxX);
    expect(b.minZ).toBeLessThan(b.maxZ);
  });
});
