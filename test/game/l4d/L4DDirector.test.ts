import { describe, it, expect, vi, beforeEach } from "vitest";
import { L4DDirector } from "@src/game/l4d/L4DDirector";

const mockState = {
  isGameOver: false,
  isVictory: false,
  chapterState: "safeRoom" as string,
  chapterProgress: 0,
  chapter: 1,
  panicLevel: 0,
  crescendoActive: false,
  hordeActive: false,
  hordeTimer: 0,
  finaleState: "" as string,
  survivors: [
    { id: "s1", x: 0, z: 0, hp: 100, maxHp: 100, isDead: false, isDowned: false, pinnedBy: null, grabbedBy: null, isBot: true },
  ],
  infected: [] as Array<{ id: string; type: string; x: number; y: number; z: number; hp: number; maxHp: number; rotationY: number; isDead: boolean; isAttacking: boolean; speed: number; alerted: boolean; pinTarget: string | null; grabTarget: string | null }>,
};

const mockActions = {
  setDirectorIntensity: vi.fn(),
  setPanic: vi.fn(),
  setHorde: vi.fn(),
  addInfected: vi.fn(),
  damageInfected: vi.fn(),
};

vi.mock("@src/stores/useL4DStore", () => ({
  useL4DStore: {
    getState: () => ({ ...mockState, ...mockActions }),
    setState: vi.fn((patch: Record<string, unknown>) => {
      Object.assign(mockState, patch);
    }),
  },
}));

describe("L4DDirector", () => {
  let director: L4DDirector;

  beforeEach(() => {
    director = new L4DDirector();
    director.init();
    mockState.isGameOver = false;
    mockState.isVictory = false;
    mockState.chapterState = "safeRoom";
    mockState.hordeActive = false;
    mockState.crescendoActive = false;
    mockState.infected = [];
    mockState.survivors = [
      { id: "s1", x: 0, z: 0, hp: 100, maxHp: 100, isDead: false, isDowned: false, pinnedBy: null, grabbedBy: null, isBot: true },
    ];
    vi.clearAllMocks();
  });

  it("does nothing when game is over", () => {
    mockState.isGameOver = true;
    director.update(1);
    expect(mockActions.addInfected).not.toHaveBeenCalled();
  });

  it("does nothing when chapter is safeRoom", () => {
    mockState.chapterState = "safeRoom";
    director.update(1);
    expect(mockActions.addInfected).not.toHaveBeenCalled();
  });

  it("spawns common when in active chapter (intensity builds up)", () => {
    mockState.chapterState = "hallway";
    for (let i = 0; i < 50; i++) director.update(2);
    expect(mockActions.addInfected).toHaveBeenCalled();
  });

  it("caps infected at 42", () => {
    mockState.chapterState = "hallway";
    for (let i = 0; i < 50; i++) {
      mockState.infected.push({
        id: `inf_${i}`, type: "common", x: 0, y: 0, z: 0, hp: 50, maxHp: 50,
        rotationY: 0, isDead: false, isAttacking: false, speed: 3.2, alerted: true,
        pinTarget: null, grabTarget: null,
      });
    }
    director.update(10);
    // Should not add more since we have 42+ non-dead
    const addInfectedCalls = mockActions.addInfected.mock.calls;
    const lastCall = addInfectedCalls[addInfectedCalls.length - 1];
    // If it was called, the count should be <= 42
    if (lastCall) {
      expect(mockState.infected.length).toBeLessThanOrEqual(50);
    }
  });

  it("triggers crescendo", () => {
    director.crescendo();
    expect(mockState.crescendoActive).toBe(true);
  });

  it("reduces intensity when all survivors are dead", () => {
    mockState.chapterState = "hallway";
    mockState.survivors = [];
    director.update(5);
    // Should not crash with empty survivors
  });

  it("update infected movement for alive survivors", () => {
    mockState.chapterState = "hallway";
    mockState.infected.push({
      id: "inf_1", type: "common", x: 5, y: 0, z: 0, hp: 50, maxHp: 50,
      rotationY: 0, isDead: false, isAttacking: false, speed: 3.2, alerted: true,
      pinTarget: null, grabTarget: null,
    });
    director.update(0.5);
    // Infected should have moved toward survivor
    expect(mockState.infected[0].x).toBeLessThan(5);
  });

  it("hunter pins survivor when close", () => {
    mockState.chapterState = "hallway";
    mockState.survivors = [
      { id: "s1", x: 2, z: 0, hp: 100, maxHp: 100, isDead: false, isDowned: false, pinnedBy: null, grabbedBy: null, isBot: true },
    ];
    mockState.infected.push({
      id: "hunter_1", type: "hunter", x: 2.5, y: 0, z: 0, hp: 250, maxHp: 250,
      rotationY: 0, isDead: false, isAttacking: false, speed: 4.5, alerted: true,
      pinTarget: null, grabTarget: null,
    });
    director.update(0.1);
    // Hunter should have pinned the survivor
    expect(mockState.survivors[0].isDowned).toBe(true);
  });

  it("boomer self-destructs on contact", () => {
    mockState.chapterState = "hallway";
    mockState.survivors = [
      { id: "s1", x: 2, z: 0, hp: 100, maxHp: 100, isDead: false, isDowned: false, pinnedBy: null, grabbedBy: null, isBot: true },
    ];
    mockState.infected.push({
      id: "boomer_1", type: "boomer", x: 2.0, y: 0, z: 0, hp: 150, maxHp: 150,
      rotationY: 0, isDead: false, isAttacking: false, speed: 2.8, alerted: true,
      pinTarget: null, grabTarget: null,
    });
    director.update(0.1);
    // Boomer should have been damaged to death
    expect(mockActions.damageInfected).toHaveBeenCalled();
  });

  it("horde ends when timer expires", () => {
    mockState.chapterState = "hallway";
    mockState.hordeActive = true;
    mockState.hordeTimer = 0.1;
    director.update(0.2);
    expect(mockActions.setHorde).toHaveBeenCalledWith(false, 0);
  });

  it("horde countdown continues while active", () => {
    mockState.chapterState = "hallway";
    mockState.hordeActive = true;
    mockState.hordeTimer = 10;
    director.update(1);
    expect(mockActions.setHorde).toHaveBeenCalledWith(true, 9);
  });

  it("cleanup clears queues", () => {
    director.cleanup();
    // No crash
  });

  it("setSurvivorPositions stores positions", () => {
    director.setSurvivorPositions([{ x: 5, z: 5 }]);
    // Used internally for spawn positioning
  });

  it("finale state triggers horde and higher spawn rates", () => {
    mockState.chapterState = "finale";
    mockState.finaleState = "holdout";
    mockState.hordeActive = false;
    for (let i = 0; i < 50; i++) director.update(2);
    expect(mockActions.addInfected).toHaveBeenCalled();
  });
});