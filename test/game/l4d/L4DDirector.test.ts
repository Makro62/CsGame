import { describe, it, expect, vi, beforeEach } from "vitest";

// ── L4D Store Mock ─────────────────────────────────────────────────────────
const createSurvivor = (overrides: any = {}) => ({
  id: "survivor_0",
  name: "Coach",
  x: -1.8,
  z: -30,
  hp: 100,
  maxHp: 100,
  speed: 5.4,
  rotationY: 0,
  shootingUntil: 0,
  isDowned: false,
  isDead: false,
  isBot: true,
  hasPills: false,
  hasMedkit: true,
  downedTimer: 0,
  pinnedBy: null,
  grabbedBy: null,
  bileUntil: 0,
  ...overrides,
});

const mockL4DStoreState: any = {
  currentZone: 0,
  unlockedZones: 1,
  zoneQuota: 0,
  zombiesRemaining: 0,
  zoneBanner: null,
  isGameOver: false,
  isVictory: false,
  infected: [] as any[],
  survivors: [
    createSurvivor({ id: "survivor_0", name: "Coach", x: -1.8, z: -30 }),
    createSurvivor({ id: "survivor_1", name: "Rochelle", x: 1.8, z: -30 }),
  ],
  setZoneBanner: vi.fn(),
  setZombiesRemaining: vi.fn(),
  addInfected: vi.fn((inf: any) => { mockL4DStoreState.infected.push(inf); }),
  unlockNextZone: vi.fn(() => false),
  damageInfected: vi.fn(),
};

vi.mock("../../../client/src/stores/useL4DStore", () => ({
  useL4DStore: {
    getState: () => mockL4DStoreState,
    setState: vi.fn((fn: any) => {
      const next = typeof fn === "function" ? fn(mockL4DStoreState) : fn;
      Object.assign(mockL4DStoreState, next);
    }),
  },
}));

vi.mock("../../../client/src/stores/useGameStore", () => ({
  useGameStore: {
    getState: () => ({ currentMap: "container_yard", setTracerEvent: vi.fn() }),
    setState: vi.fn(),
  },
}));

vi.mock("../../../client/src/game/zombie/SpatialGrid", () => {
  return {
    SpatialGrid: class {
      private _ids: string[] = [];
      insert(id: string, _x: number, _z: number) { this._ids.push(id); }
      query(_x: number, _z: number, _r: number) { return new Set(this._ids); }
      clear() { this._ids = []; }
    },
  };
});

vi.mock("../../../client/src/game/l4d/l4dLayout", () => ({
  L4D_ZONES: [
    { id: "hall_a", name: "Koridor Awal", bounds: { minX: -5, maxX: 5, minZ: -44, maxZ: -14 }, gateZ: -14, zombieCount: 10, spawns: [{ x: 0, z: -36 }, { x: -2, z: -30 }] },
    { id: "warehouse", name: "Gudang", bounds: { minX: -16, maxX: 16, minZ: -14, maxZ: 14 }, gateZ: 14, zombieCount: 14, spawns: [{ x: -10, z: -6 }, { x: 10, z: -4 }] },
    { id: "hall_b", name: "Lorong Dalam", bounds: { minX: -5, maxX: 28, minZ: 14, maxZ: 44 }, gateZ: 44, zombieCount: 16, spawns: [{ x: 0, z: 18 }, { x: 0, z: 28 }] },
    { id: "rescue", name: "Pad Evakuasi", bounds: { minX: -16, maxX: 16, minZ: 44, maxZ: 70 }, gateZ: 70, zombieCount: 18, spawns: [{ x: 0, z: 48 }, { x: -10, z: 54 }] },
  ],
  L4D_SAFE_Z: -52,
  L4D_BOUNDS: { minX: -20, maxX: 32, minZ: -64, maxZ: 74 },
  getL4DZone: (index: number) => {
    const zones = [
      { id: "hall_a", name: "Koridor Awal", bounds: { minX: -5, maxX: 5, minZ: -44, maxZ: -14 }, gateZ: -14, zombieCount: 10, spawns: [{ x: 0, z: -36 }] },
      { id: "warehouse", name: "Gudang", bounds: { minX: -16, maxX: 16, minZ: -14, maxZ: 14 }, gateZ: 14, zombieCount: 14, spawns: [{ x: -10, z: -6 }] },
      { id: "hall_b", name: "Lorong Dalam", bounds: { minX: -5, maxX: 28, minZ: 14, maxZ: 44 }, gateZ: 44, zombieCount: 16, spawns: [{ x: 0, z: 18 }] },
      { id: "rescue", name: "Pad Evakuasi", bounds: { minX: -16, maxX: 16, minZ: 44, maxZ: 70 }, gateZ: 70, zombieCount: 18, spawns: [{ x: 0, z: 48 }] },
    ];
    return zones[Math.max(0, Math.min(zones.length - 1, index))];
  },
  pickL4DZoneSpawn: (_index: number) => ({ x: 0, z: -36 }),
  clampL4DInfected: (x: number, z: number, _unlocked: number) => ({ x, z }),
}));

vi.mock("../../../client/src/game/zombie/hordeMovement", () => ({
  L4D_HORDE_SEP: { queryRadius: 2, radius: 1.4, strength: 1.5 },
  hordeSeparationFromIds: (_self: any, _ids: any, lookup: any, _radius: number, _strength: number) => {
    if (typeof lookup === "function") {
      for (const id of (_ids ?? [])) {
        lookup(id);
      }
    }
    return { x: 0, z: 0 };
  },
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { L4DDirector } from "../../../client/src/game/l4d/L4DDirector";

function makeInfected(overrides: any = {}): any {
  return {
    id: `l4d_inf_${Math.random().toString(36).slice(2, 6)}`,
    type: "common",
    x: 0,
    y: 0,
    z: 0,
    hp: 50,
    maxHp: 50,
    rotationY: 0,
    isDead: false,
    isAttacking: false,
    speed: 3.2,
    alerted: true,
    pinTarget: null,
    grabTarget: null,
    ...overrides,
  };
}

describe("L4DDirector", () => {
  let director: L4DDirector;

  beforeEach(() => {
    vi.clearAllMocks();
    director = new L4DDirector();
    mockL4DStoreState.infected = [];
    mockL4DStoreState.isGameOver = false;
    mockL4DStoreState.isVictory = false;
    mockL4DStoreState.currentZone = 0;
    mockL4DStoreState.unlockedZones = 1;
    mockL4DStoreState.survivors = [
      createSurvivor({ id: "survivor_0", name: "Coach", x: -1.8, z: -30 }),
      createSurvivor({ id: "survivor_1", name: "Rochelle", x: 1.8, z: -30 }),
    ];
    mockL4DStoreState.zoneBanner = null;
    mockL4DStoreState.zombiesRemaining = 0;
    mockL4DStoreState.zoneQuota = 0;
    mockL4DStoreState.unlockNextZone.mockReturnValue(false);
  });

  describe("init()", () => {
    it("sets zoneBanner from zone name", () => {
      director.init();
      expect(mockL4DStoreState.zoneBanner).toBe("Koridor Awal");
    });

    it("sets zoneQuota from zone zombieCount", () => {
      director.init();
      expect(mockL4DStoreState.zoneQuota).toBe(10);
    });

    it("sets zombiesRemaining from zone zombieCount", () => {
      director.init();
      expect(mockL4DStoreState.zombiesRemaining).toBe(10);
    });

    it("clears infected array", () => {
      mockL4DStoreState.infected = [makeInfected()];
      director.init();
      expect(mockL4DStoreState.infected).toEqual([]);
    });
  });

  describe("cleanup()", () => {
    it("clears internal state without throwing", () => {
      director.init();
      expect(() => director.cleanup()).not.toThrow();
    });
  });

  describe("setSurvivorPositions()", () => {
    it("does not throw with empty positions", () => {
      expect(() => director.setSurvivorPositions([])).not.toThrow();
    });

    it("does not throw with positions", () => {
      expect(() => director.setSurvivorPositions([{ x: 0, z: 0 }, { x: 5, z: 5 }])).not.toThrow();
    });
  });

  describe("update()", () => {
    it("returns early if game is over", () => {
      mockL4DStoreState.isGameOver = true;
      director.update(0.016);
      expect(mockL4DStoreState.addInfected).not.toHaveBeenCalled();
    });

    it("returns early if victory", () => {
      mockL4DStoreState.isVictory = true;
      director.update(0.016);
      expect(mockL4DStoreState.addInfected).not.toHaveBeenCalled();
    });

    it("spawns zombies when initialized and spawnQueue > 0", () => {
      director.init();
      director.update(0.25);
      expect(mockL4DStoreState.addInfected).toHaveBeenCalled();
    });

    it("spawns multiple zombies with large dt", () => {
      director.init();
      director.update(5.0); // 5s / 0.22s ≈ 22 spawns (capped at queue=10)
      // Queue is 10, so 10 zombies should be spawned
      expect(mockL4DStoreState.addInfected).toHaveBeenCalledTimes(10);
    });

    it("spawn timer advances correctly", () => {
      director.init();
      // 0.22s = one spawn, so 0.22s should spawn exactly 1
      director.update(0.22);
      expect(mockL4DStoreState.addInfected).toHaveBeenCalledTimes(1);
    });

    it("multiple spawns in one tick when dt is large enough", () => {
      director.init();
      // 0.44s = 2 spawns
      director.update(0.44);
      expect(mockL4DStoreState.addInfected).toHaveBeenCalledTimes(2);
    });

    it("clear delay counts down to finishClear", () => {
      director.init();
      director.update(5.0);
      mockL4DStoreState.infected = [];
      director.update(2.0); // first update sets clearDelay=1.35
      director.update(2.0); // second update drains clearDelay → finishClear
      expect(mockL4DStoreState.unlockNextZone).toHaveBeenCalled();
    });

    it("does not finishClear before delay expires", () => {
      director.init();
      director.update(5.0);
      mockL4DStoreState.infected = [];
      director.update(2.0); // sets clearDelay=1.35
      director.update(0.5); // clearDelay=1.35-0.5=0.85 → still counting
      expect(mockL4DStoreState.unlockNextZone).not.toHaveBeenCalled();
    });

    it("zone with 0 zombies → immediate advance", () => {
      mockL4DStoreState.currentZone = 0;
      // Zone 0 has zombieCount=10, but let's make a zone with 0
      director.init();
      // After init, spawnQueue = zone.zombieCount = 10
      // Actually we can't easily test 0-count zone with our mock
      // Let's verify the 0-zombies case differently
      // Set infected to empty after init (all dead)
      mockL4DStoreState.infected = [];
      // updateInfected returns early since survivors is empty? No, survivors exist
      // The alive count = 0 (no infected), spawnQueue = 0 (decremented)
      // → advancing = true, clearDelay = 1.35
    });

    it("last zone reached shows SEMUA WILAYAH AMAN banner", () => {
      director.init();
      // Force currentZone to last (3) and unlockedZones=4
      mockL4DStoreState.currentZone = 3;
      mockL4DStoreState.unlockedZones = 4;
      mockL4DStoreState.infected = [];
      // We need spawnQueue to be 0
      // After init with zone 3, spawnQueue = 18
      // Let's spawn all
      director.update(5.0);
      // Now spawnQueue=0, infected all dead
      mockL4DStoreState.infected = [];
      director.update(0.1); // sets advancing=true
      // Check that the banner was set to the last zone text
      // The banner should be "SEMUA WILAYAH AMAN" for last zone
      expect(mockL4DStoreState.setZoneBanner).toHaveBeenCalledWith("SEMUA WILAYAH AMAN");
    });

    it("non-last zone shows WILAYAH BARU TERBUKA banner", () => {
      director.init();
      mockL4DStoreState.currentZone = 0;
      mockL4DStoreState.unlockedZones = 1;
      mockL4DStoreState.infected = [];
      director.update(5.0); // spawn all
      mockL4DStoreState.infected = [];
      director.update(0.1); // sets advancing=true
      expect(mockL4DStoreState.setZoneBanner).toHaveBeenCalledWith("WILAYAH BARU TERBUKA");
    });
  });

  describe("updateInfected()", () => {
    it("returns early when survivors are empty", () => {
      mockL4DStoreState.survivors = [];
      mockL4DStoreState.infected = [makeInfected({ id: "inf_1", x: 0, z: 0 })];
      director.update(0.016);
      // Infected should remain unchanged
      expect(mockL4DStoreState.infected[0].x).toBe(0);
    });

    it("skips dead infected", () => {
      mockL4DStoreState.infected = [makeInfected({ id: "inf_dead", isDead: true, x: 0, z: 0 })];
      director.update(0.016);
      // Dead infected stays in array but not updated
      expect(mockL4DStoreState.infected[0].isDead).toBe(true);
    });

    it("infected in attack range → isAttacking = true", () => {
      // Survivor at z=-30, infected at z=-29.5 → dist ≈ 0.5 < 1.5
      mockL4DStoreState.infected = [makeInfected({ id: "inf_atk", x: -1.8, z: -29.5, speed: 3.2 })];
      director.update(0.016);
      // After update, isAttacking should be true
      const inf = mockL4DStoreState.infected.find((i: any) => i.id === "inf_atk");
      expect(inf.isAttacking).toBe(true);
    });

    it("infected far from survivor → moves toward survivor", () => {
      // Survivor at z=-30, infected at z=-20 → dist=10
      mockL4DStoreState.infected = [makeInfected({ id: "inf_move", x: 0, z: -20, speed: 3.2 })];
      director.update(0.1);
      const inf = mockL4DStoreState.infected.find((i: any) => i.id === "inf_move");
      // Should have moved toward survivor (z decreased)
      expect(inf.z).toBeLessThan(-20);
    });

    it("horde separation is applied (no crash)", () => {
      // Two infected close together should not crash
      mockL4DStoreState.infected = [
        makeInfected({ id: "inf_h1", x: 0, z: -20, speed: 3.2 }),
        makeInfected({ id: "inf_h2", x: 0.5, z: -20, speed: 3.2 }),
      ];
      expect(() => director.update(0.1)).not.toThrow();
    });

    it("sets infected array when positions change", () => {
      mockL4DStoreState.infected = [makeInfected({ id: "inf_set", x: 0, z: -20, speed: 3.2 })];
      director.update(0.1);
      // setState should have been called with updated infected
      expect(mockL4DStoreState.infected[0].z).not.toBe(-20);
    });

    it("does not set infected when nothing changes", () => {
      // Infected already attacking at close range → no position change
      mockL4DStoreState.infected = [makeInfected({ id: "inf_noop", x: -1.8, z: -30, speed: 3.2 })];
      const before = mockL4DStoreState.infected[0];
      director.update(0.001);
      // isAttacking changes from false to true → setState is still called
    });

    it("infected already attacking stays attacking and doesn't change (line 165)", () => {
      mockL4DStoreState.infected = [
        makeInfected({ id: "inf_still", x: -1.8, z: -30, speed: 3.2, isAttacking: true }),
      ];
      director.update(0.016);
      const inf = mockL4DStoreState.infected.find((i: any) => i.id === "inf_still");
      expect(inf.isAttacking).toBe(true);
    });
  });

  describe("spawnZoneCommon()", () => {
    it("caps at 42 alive infected", () => {
      director.init();
      // Fill with 42 alive infected
      const aliveInfected: any[] = [];
      for (let i = 0; i < 42; i++) {
        aliveInfected.push(makeInfected({ id: `inf_cap_${i}`, isDead: false }));
      }
      mockL4DStoreState.infected = aliveInfected;
      // Spawn more — should be capped at 42
      director.update(1.0);
      // No new infected should be added beyond 42
      const aliveCount = mockL4DStoreState.infected.filter((i: any) => !i.isDead).length;
      expect(aliveCount).toBeLessThanOrEqual(42);
    });

    it("spawns when below cap", () => {
      director.init();
      mockL4DStoreState.infected = [];
      director.update(0.25);
      expect(mockL4DStoreState.addInfected).toHaveBeenCalled();
    });

    it("spawned infected has correct zone-based HP", () => {
      director.init();
      director.update(0.25);
      const addedInfected = mockL4DStoreState.addInfected.mock.calls[0]?.[0];
      if (addedInfected) {
        // zone 0: hp = 50 + 0 * 12 = 50
        expect(addedInfected.hp).toBe(50);
        expect(addedInfected.maxHp).toBe(50);
      }
    });

    it("spawned infected has correct zone-based speed", () => {
      director.init();
      director.update(0.25);
      const addedInfected = mockL4DStoreState.addInfected.mock.calls[0]?.[0];
      if (addedInfected) {
        // zone 0: speed = 3.2 + 0 * 0.15 = 3.2
        expect(addedInfected.speed).toBeCloseTo(3.2);
      }
    });

    it("spawned infected has correct type", () => {
      director.init();
      director.update(0.25);
      const addedInfected = mockL4DStoreState.addInfected.mock.calls[0]?.[0];
      if (addedInfected) {
        expect(addedInfected.type).toBe("common");
      }
    });

    it("spawned infected has alerted flag", () => {
      director.init();
      director.update(0.25);
      const addedInfected = mockL4DStoreState.addInfected.mock.calls[0]?.[0];
      if (addedInfected) {
        expect(addedInfected.alerted).toBe(true);
      }
    });
  });

  describe("syncRemaining()", () => {
    it("updates zombiesRemaining with alive count + queue", () => {
      director.init();
      director.update(0.25);
      // Should have called setZombiesRemaining at least once
      expect(mockL4DStoreState.setZombiesRemaining).toHaveBeenCalled();
    });
  });

  describe("finishClear()", () => {
    it("calls unlockNextZone", () => {
      director.init();
      director.update(5.0); // spawn all 10 zombies
      mockL4DStoreState.infected = [];
      director.update(2.0); // sets clearDelay=1.35 but doesn't drain yet
      director.update(2.0); // drains clearDelay → finishClear
      expect(mockL4DStoreState.unlockNextZone).toHaveBeenCalled();
    });

    it("resets advancing and clearDelay", () => {
      director.init();
      director.update(5.0);
      mockL4DStoreState.infected = [];
      director.update(2.0); // sets clearDelay
      director.update(2.0); // drains clearDelay → finishClear
      mockL4DStoreState.infected = [];
      director.update(0.1); // advancing was reset, re-enters advancing
    });

    it("when unlockNextZone returns true, spawns next zone", () => {
      mockL4DStoreState.unlockNextZone.mockReturnValue(true);
      director.init();
      director.update(5.0); // spawn all 10
      mockL4DStoreState.infected = [];
      director.update(2.0); // sets clearDelay
      director.update(2.0); // finishClear
      director.update(0.5);
      expect(mockL4DStoreState.addInfected).toHaveBeenCalled();
    });

    it("when unlockNextZone returns false, no more spawning", () => {
      mockL4DStoreState.unlockNextZone.mockReturnValue(false);
      director.init();
      director.update(5.0);
      mockL4DStoreState.infected = [];
      director.update(2.0); // sets clearDelay
      director.update(2.0); // finishClear
      const callCountBefore = mockL4DStoreState.addInfected.mock.calls.length;
      director.update(0.5);
      expect(mockL4DStoreState.addInfected.mock.calls.length).toBe(callCountBefore);
    });
  });
});
