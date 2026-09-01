import { describe, it, expect, beforeEach } from "vitest";
import { zombieEngine } from "@src/game/zombie/ZombieEngine";
import { useZombieStore } from "@src/stores/useZombieStore";

function spawnZombies(count: number) {
  zombieEngine.startWave(1);
  for (let i = 0; i < 20; i++) {
    zombieEngine.update(0.1);
    if (zombieEngine.getZombies().length >= count) break;
  }
  return zombieEngine.getZombies();
}

beforeEach(() => {
  zombieEngine.cleanup();
  zombieEngine.init();
  useZombieStore.getState().resetGame(true);
});

// ── berserkBurst tests ──
describe("ZombieEngine.berserkBurst", () => {
  it("damages zombies within radius", () => {
    const zombies = spawnZombies(1);
    expect(zombies.length).toBeGreaterThan(0);

    const z = zombies[0];
    zombieEngine.berserkBurst(z.x, z.z, 100, 10);

    const updated = zombieEngine.getZombies().find(zz => zz.id === z.id);
    expect(updated).toBeDefined();
    expect(updated!.hp).toBeLessThan(updated!.maxHp);
  });

  it("does not damage zombies outside radius", () => {
    const zombies = spawnZombies(1);
    expect(zombies.length).toBeGreaterThan(0);

    zombieEngine.berserkBurst(999, 999, 1, 50);

    const allFullHp = zombieEngine.getZombies().every(z => z.hp === z.maxHp);
    expect(allFullHp).toBe(true);
  });

  it("kills zombies when damage exceeds HP", () => {
    const zombies = spawnZombies(1);
    expect(zombies.length).toBeGreaterThan(0);

    const z = zombies[0];
    zombieEngine.berserkBurst(z.x, z.z, 100, 9999);

    const updated = zombieEngine.getZombies().find(zz => zz.id === z.id);
    expect(updated).toBeDefined();
    expect(updated!.isDead).toBe(true);
    expect(updated!.hp).toBe(0);
  });

  it("skips already dead zombies", () => {
    const zombies = spawnZombies(1);
    expect(zombies.length).toBeGreaterThan(0);

    const z = zombies[0];
    zombieEngine.berserkBurst(z.x, z.z, 100, 9999);
    expect(zombieEngine.getZombies().find(zz => zz.id === z.id)!.isDead).toBe(true);

    expect(() => {
      zombieEngine.berserkBurst(z.x, z.z, 100, 50);
    }).not.toThrow();
  });

  it("damages multiple zombies in radius", () => {
    const zombies = spawnZombies(5);
    expect(zombies.length).toBeGreaterThan(1);

    zombieEngine.berserkBurst(0, 0, 1000, 5);

    const damaged = zombieEngine.getZombies().filter(z => z.hp < z.maxHp);
    expect(damaged.length).toBeGreaterThan(0);
  });
});