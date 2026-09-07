import { describe, it, expect } from "vitest";
import {
  L4D_SURVIVORS,
  L4D_SURVIVOR_IDS,
  getL4DSurvivor,
} from "../../../client/src/game/l4d/l4dSurvivors";

describe("l4dSurvivors", () => {
  it("L4D_SURVIVORS has 4 survivors", () => {
    expect(Object.keys(L4D_SURVIVORS)).toHaveLength(4);
  });

  it("L4D_SURVIVOR_IDS has 4 entries", () => {
    expect(L4D_SURVIVOR_IDS).toHaveLength(4);
  });

  describe("getL4DSurvivor", () => {
    it("returns survivor by id", () => {
      const s = getL4DSurvivor("coach");
      expect(s.id).toBe("coach");
      expect(s.name).toBe("Coach");
    });

    it("returns coach for unknown id", () => {
      const s = getL4DSurvivor("unknown");
      expect(s.id).toBe("coach");
    });
  });

  it("all survivors have valid stats", () => {
    for (const s of Object.values(L4D_SURVIVORS)) {
      expect(s.stats.maxHp).toBeGreaterThan(0);
      expect(s.stats.speed).toBeGreaterThan(0);
      expect(s.stats.armor).toBeGreaterThanOrEqual(0);
      expect(s.stats.damage).toBeGreaterThan(0);
      expect(s.stats.accuracy).toBeGreaterThan(0);
    }
  });

  it("all survivors have weapons", () => {
    for (const s of Object.values(L4D_SURVIVORS)) {
      expect(s.primaryWeapon).toBeTruthy();
      expect(s.secondaryWeapon).toBeTruthy();
      expect(s.knifeWeapon).toBeTruthy();
    }
  });
});
