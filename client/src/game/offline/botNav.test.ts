import { describe, expect, it, beforeEach } from "vitest";
import { BOMB_SITES, SPAWN } from "@cs-game/shared";
import { findGridPath, navigateTo, resetBotNav, spawnJitter } from "./botNav";
import { isPointBlocked } from "./offlineCombat";
import { botThink, mkPlayer, assignBombCarrier } from "./BotAI";
import type { BombState, LocalPlayer } from "./types";

const idleBomb: BombState = {
  bombPlanted: false,
  bombTimeLeft: 0,
  bombSite: "",
  bombDropped: false,
  bombDropX: 0,
  bombDropZ: 0,
};

describe("botNav grid path", () => {
  beforeEach(() => resetBotNav());

  it("finds a walkable route from T spawn to site A", () => {
    const path = findGridPath(SPAWN.T, BOMB_SITES.A);
    expect(path.length).toBeGreaterThan(3);
    for (const p of path) {
      expect(isPointBlocked(p)).toBe(false);
    }
  });

  it("makes a bot close distance to site A instead of standing still", () => {
    let pos = { x: SPAWN.CT.x, z: SPAWN.CT.z };
    const start = Math.hypot(pos.x - BOMB_SITES.A.x, pos.z - BOMB_SITES.A.z);
    for (let i = 0; i < 180; i++) {
      pos = navigateTo("ct_nav", pos, BOMB_SITES.A, 4.2, 1 / 30);
      expect(isPointBlocked(pos)).toBe(false);
    }
    const end = Math.hypot(pos.x - BOMB_SITES.A.x, pos.z - BOMB_SITES.A.z);
    expect(end).toBeLessThan(start * 0.45);
    expect(end).toBeLessThan(8);
  });

  it("spawns bots on open ground", () => {
    for (let i = 0; i < 20; i++) {
      const p = spawnJitter(i % 2 === 0 ? "T" : "CT");
      expect(isPointBlocked(p)).toBe(false);
    }
  });
});

describe("botThink objective", () => {
  it("starts planting when a T bot with the bomb is on site", () => {
    const bot = mkPlayer("bot_t5", "T", "Runner", true);
    bot.hasBomb = true;
    bot.x = BOMB_SITES.A.x;
    bot.z = BOMB_SITES.A.z;
    botThink(bot, new Map([[bot.id, bot]]), 0.05, Date.now(), idleBomb);
    expect(bot.isPlanting).toBe(true);
    expect(bot.botState).toBe("plant");
  });

  it("sends a CT runner toward a planted bomb instead of ignoring it", () => {
    const bot = mkPlayer("bot_ct5", "CT", "Runner", true);
    bot.x = SPAWN.CT.x;
    bot.z = SPAWN.CT.z;
    const planted: BombState = {
      ...idleBomb,
      bombPlanted: true,
      bombSite: "A",
      bombTimeLeft: 35,
    };
    const start = Math.hypot(bot.x - BOMB_SITES.A.x, bot.z - BOMB_SITES.A.z);
    const players = new Map<string, LocalPlayer>([[bot.id, bot]]);
    for (let i = 0; i < 150; i++) {
      botThink(bot, players, 1 / 20, Date.now(), planted);
    }
    const end = Math.hypot(bot.x - BOMB_SITES.A.x, bot.z - BOMB_SITES.A.z);
    expect(end).toBeLessThan(start * 0.5);
    expect(isPointBlocked(bot)).toBe(false);
  });

  it("gives the bomb to the T runner when the player is CT", () => {
    const players = new Map<string, LocalPlayer>();
    players.set("local", mkPlayer("local", "CT", "You", false));
    players.set("bot_t1", mkPlayer("bot_t1", "T", "Entry", true));
    players.set("bot_t5", mkPlayer("bot_t5", "T", "Runner", true));
    assignBombCarrier(players);
    expect(players.get("local")?.hasBomb).toBe(false);
    expect(players.get("bot_t5")?.hasBomb).toBe(true);
    expect(players.get("bot_t1")?.hasBomb).toBe(false);
  });
});
