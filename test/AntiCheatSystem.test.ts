import { describe, it, expect, beforeEach } from "vitest";
import { AntiCheatSystem } from "../server/src/rooms/AntiCheatSystem";
import { PlayerState, PHYSICS } from "@cs-game/shared";

function makePlayer(x = 0, z = 0): PlayerState {
  const player = new PlayerState();
  player.x = x;
  player.z = z;
  player.ammo = 30;
  player.reserveAmmo = 90;
  player.currentWeapon = "ak47";
  return player;
}

describe("AntiCheatSystem", () => {
  let antiCheat: AntiCheatSystem;

  beforeEach(() => {
    antiCheat = new AntiCheatSystem();
  });

  it("accepts movement within sprint tolerance", () => {
    const player = makePlayer();
    const dt = 0.05;
    const nextX = player.x + PHYSICS.sprintSpeed * dt;
    expect(antiCheat.validateSpeed("p1", player, nextX, player.z, dt)).toBe(true);
  });

  it("rejects movement far beyond sprint speed", () => {
    const player = makePlayer();
    const dt = 0.05;
    const nextX = player.x + PHYSICS.sprintSpeed * 5 * dt;
    expect(antiCheat.validateSpeed("p1", player, nextX, player.z, dt)).toBe(false);
    expect(antiCheat.getViolationCount("p1", "speed")).toBe(1);
  });

  it("flags a player after repeated speed violations", () => {
    const player = makePlayer();
    const dt = 0.05;
    for (let i = 0; i < 3; i++) {
      antiCheat.validateSpeed("p1", player, player.x + 50, player.z, dt);
    }
    expect(antiCheat.shouldKick("p1")).toBe(true);
    expect(antiCheat.isFlagged("p1")).toBe(true);
  });

  it("rejects fire rates faster than the weapon allows", () => {
    const now = 1000;
    expect(antiCheat.validateFireRate("p1", "ak47", now - 1, now)).toBe(false);
    expect(antiCheat.validateFireRate("p1", "ak47", now - 200, now)).toBe(true);
  });

  it("rate-limits input floods above 60 msg/s", () => {
    const start = 10_000;
    let accepted = 0;
    for (let i = 0; i < 70; i++) {
      if (antiCheat.validateInputRate("p1", start + i)) accepted++;
    }
    expect(accepted).toBeLessThanOrEqual(60);
    expect(antiCheat.getViolationCount("p1", "input_flood")).toBeGreaterThan(0);
  });

  it("clears state when a player leaves", () => {
    const player = makePlayer();
    antiCheat.validateSpeed("p1", player, 99, 0, 0.05);
    antiCheat.clearAll("p1");
    expect(antiCheat.getTotalViolations("p1")).toBe(0);
    expect(antiCheat.isFlagged("p1")).toBe(false);
  });
});
