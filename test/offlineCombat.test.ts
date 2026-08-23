import { describe, it, expect } from "vitest";
import { BOMB_SITES, MAP_BOUNDARY, MAP_OBSTACLES, SPAWN } from "@cs-game/shared";
import {
  cameraYawTowards,
  clampToMap,
  distToBombSite,
  fireIntervalMs,
  hasLineOfSight,
  isInFov,
  nearestBombSite,
  resolveBotShot,
  spawnCameraYaw,
  steerAroundObstacles,
} from "../client/src/game/offline/offlineCombat";

describe("offlineCombat", () => {
  it("blocks line of sight through metal containers", () => {
    const midBox = MAP_OBSTACLES.find((o) => o.id === "mid_box");
    expect(midBox).toBeTruthy();
    expect(hasLineOfSight({ x: -8, z: 0 }, { x: 8, z: 0 })).toBe(false);
  });

  it("allows open-lane line of sight along T spawn", () => {
    expect(hasLineOfSight({ x: SPAWN.T.x, z: SPAWN.T.z }, { x: SPAWN.T.x + 4, z: SPAWN.T.z })).toBe(true);
  });

  it("rejects targets outside FOV", () => {
    const bot = { x: 0, z: 0, rotationY: 0 };
    expect(isInFov(bot, { x: 0, z: 10 })).toBe(true);
    expect(isInFov(bot, { x: 10, z: 0 }, Math.PI / 2)).toBe(false);
  });

  it("uses AWP cadence of 1400ms", () => {
    expect(fireIntervalMs("awp", 0.4)).toBe(1400);
    expect(fireIntervalMs("ak47", 10)).toBe(100);
  });

  it("always returns a structured shot result", () => {
    const shot = resolveBotShot({
      accuracy: 1,
      headshotRate: 1,
      distance: 5,
      viewDistance: 25,
    });
    expect(shot.hit).toBe(true);
    expect(shot.headshot).toBe(true);
  });

  it("steers around overlapping obstacles instead of walking through them", () => {
    const from = { x: -2, z: 0 };
    const intended = { x: 0, z: 0 };
    const next = steerAroundObstacles(from, intended);
    expect(next.x !== intended.x || next.z !== intended.z || next.x === from.x).toBe(true);
  });

  it("clamps positions to map bounds", () => {
    const clamped = clampToMap({ x: -999, z: 999 });
    expect(clamped.x).toBeGreaterThan(MAP_BOUNDARY.minX);
    expect(clamped.z).toBeLessThan(MAP_BOUNDARY.maxZ);
  });

  it("orients T spawn camera toward CT and CT toward T", () => {
    expect(spawnCameraYaw("T")).toBeCloseTo(cameraYawTowards(SPAWN.T, SPAWN.CT), 5);
    expect(spawnCameraYaw("CT")).toBeCloseTo(cameraYawTowards(SPAWN.CT, SPAWN.T), 5);
    expect(spawnCameraYaw("T")).toBeCloseTo(-Math.PI / 2, 5);
    expect(spawnCameraYaw("CT")).toBeCloseTo(Math.PI / 2, 5);
  });

  it("picks the nearest bomb site from Container Yard config", () => {
    expect(nearestBombSite({ x: BOMB_SITES.A.x, z: BOMB_SITES.A.z })).toBe("A");
    expect(nearestBombSite({ x: BOMB_SITES.B.x, z: BOMB_SITES.B.z })).toBe("B");
    expect(distToBombSite(BOMB_SITES.A, "A")).toBe(0);
  });
});
