import { describe, it, expect } from "vitest";
import { executeLocalShoot } from "@src/game/offline/CombatSystem";
import { mkPlayer } from "@src/game/offline/BotAI";
import type { LocalPlayer } from "@src/game/offline/types";

function mkPlayers(overrides: Record<string, Partial<LocalPlayer>> = {}) {
  const players = new Map<string, LocalPlayer>();
  const local = mkPlayer("local", "T", "TestPlayer", false);
  players.set("local", local);
  const ct1 = mkPlayer("bot_ct1", "CT", "CT Bot", true);
  ct1.primaryWeapon = "m4a1";
  ct1.currentWeapon = "m4a1";
  ct1.ammo = 30;
  ct1.reserveAmmo = 90;
  players.set("bot_ct1", ct1);
  for (const [id, o] of Object.entries(overrides)) {
    const existing = players.get(id) || mkPlayer(id, "CT", id, true);
    players.set(id, { ...existing, ...o });
  }
  return players;
}

// ── executeLocalShoot ──
describe("CombatSystem.executeLocalShoot", () => {
  it("returns early if local player is dead", () => {
    const players = mkPlayers();
    players.get("local")!.isDead = true;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("returns early if local player is reloading", () => {
    const players = mkPlayers();
    players.get("local")!.isReloading = true;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("returns early if no local player", () => {
    const players = mkPlayers();
    players.delete("local");
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("returns early if weapon is unknown", () => {
    const players = mkPlayers();
    players.get("local")!.currentWeapon = "unknown_gun";
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("does not hit teammate (same team)", () => {
    const players = mkPlayers();
    players.set("bot_t1", mkPlayer("bot_t1", "T", "T Bot", true));
    const result = executeLocalShoot(players, [], "bot_t1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("does not hit dead victim", () => {
    const players = mkPlayers();
    players.get("bot_ct1")!.isDead = true;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(false);
  });

  it("deals bodyshot damage", () => {
    const players = mkPlayers();
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didHitEnemy).toBe(true);
    const victim = result.players.get("bot_ct1")!;
    expect(victim.hp).toBeLessThan(100);
    expect(victim.isDead).toBe(false);
  });

  it("deals headshot damage", () => {
    const players = mkPlayers();
    const result = executeLocalShoot(players, [], "bot_ct1", true);
    expect(result.didHitEnemy).toBe(true);
    const victim = result.players.get("bot_ct1")!;
    expect(victim.hp).toBeLessThan(70); // headshot should do more damage
  });

  it("kills enemy on lethal damage", () => {
    const players = mkPlayers();
    players.get("bot_ct1")!.hp = 1;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.didKillEnemy).toBe(true);
    expect(result.players.get("bot_ct1")!.isDead).toBe(true);
    expect(result.players.get("local")!.kills).toBe(1);
    expect(result.players.get("bot_ct1")!.deaths).toBe(1);
  });

  it("drops bomb when victim carrying it", () => {
    const players = mkPlayers();
    players.get("bot_ct1")!.hp = 1;
    players.get("bot_ct1")!.hasBomb = true;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.bombDropped).toBe(true);
    expect(result.bombDropX).toBeDefined();
    expect(result.bombDropZ).toBeDefined();
    expect(result.players.get("bot_ct1")!.hasBomb).toBe(false);
  });

  it("adds killfeed entry on kill", () => {
    const players = mkPlayers();
    players.get("bot_ct1")!.hp = 1;
    const result = executeLocalShoot(players, [], "bot_ct1", false);
    expect(result.killFeed).toHaveLength(1);
    expect(result.killFeed[0].headshot).toBe(false);
    expect(result.killFeed[0].weapon).toBeTruthy();
  });

  it("crops killfeed to max 5 entries", () => {
    const players = mkPlayers();
    players.get("bot_ct1")!.hp = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let feed: any[] = [];
    for (let i = 0; i < 7; i++) {
      const fresh = new Map(players);
      fresh.get("bot_ct1")!.hp = 1;
      const r = executeLocalShoot(fresh, feed, "bot_ct1", false);
      feed = r.killFeed;
    }
    expect(feed.length).toBeLessThanOrEqual(5);
  });

  it("ignores null targetId (spray)", () => {
    const players = mkPlayers();
    const result = executeLocalShoot(players, [], null, false);
    expect(result.didHitEnemy).toBe(false);
    expect(result.players.get("local")!.kills).toBe(0);
  });

  it("ignores invalid targetId", () => {
    const players = mkPlayers();
    const result = executeLocalShoot(players, [], "nonexistent", false);
    expect(result.didHitEnemy).toBe(false);
  });
});