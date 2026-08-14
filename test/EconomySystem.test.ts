import { describe, it, expect } from 'vitest';
import { EconomySystem } from '../server/src/rooms/EconomySystem';

describe('EconomySystem', () => {
  const economy = new EconomySystem();

  describe('giveRoundRewards', () => {
    it('should give win bonus to winning team', () => {
      const state = {
        lossStreakT: 0,
        lossStreakCT: 0,
        players: new Map(),
      } as any;

      const playerT = { team: 'T', money: 1000 } as any;
      const playerCT = { team: 'CT', money: 1000 } as any;
      state.players.set('p1', playerT);
      state.players.set('p2', playerCT);

      economy.giveRoundRewards('T', state);

      expect(playerT.money).toBeGreaterThan(1000);
      // CT also gets money (loss bonus)
      expect(playerCT.money).toBeGreaterThanOrEqual(1000);
    });

    it('should give loss bonus based on streak', () => {
      const state = {
        lossStreakT: 1,
        lossStreakCT: 0,
        players: new Map(),
      } as any;

      const playerT = { team: 'T', money: 1000 } as any;
      state.players.set('p1', playerT);

      economy.giveRoundRewards('CT', state);

      expect(playerT.money).toBeGreaterThan(1000);
    });

    it('should cap money at max', () => {
      const state = {
        lossStreakT: 0,
        lossStreakCT: 0,
        players: new Map(),
      } as any;

      const playerT = { team: 'T', money: 16000 } as any;
      state.players.set('p1', playerT);

      economy.giveRoundRewards('T', state);

      expect(playerT.money).toBeLessThanOrEqual(16000);
    });
  });
});
