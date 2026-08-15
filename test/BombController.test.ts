import { describe, it, expect } from 'vitest';
import { BombController } from '../server/src/rooms/BombController';

describe('BombController', () => {
  const bomb = new BombController();

  describe('dropBomb', () => {
    it('should set bomb position and clear carrier', () => {
      const player = { x: 10, y: 0, z: 10, hasBomb: true } as any;
      bomb.bombCarrierId = 'player1';

      bomb.dropBomb(player);

      expect(bomb.bombCarrierId).toBeNull();
      expect(bomb.droppedBombPos).toEqual({ x: 10, y: 0, z: 10 });
      expect(player.hasBomb).toBe(false);
    });
  });

  describe('findNearestBombSite', () => {
    it('should find the nearest bomb site', () => {
      const playerNearA = { x: 15, y: 0, z: -14 } as any;
      expect(bomb.findNearestBombSite(playerNearA)).toBe('A');

      const playerNearB = { x: 12, y: 0, z: 14 } as any;
      expect(bomb.findNearestBombSite(playerNearB)).toBe('B');
    });
  });

  describe('clear', () => {
    it('should reset all bomb state', () => {
      bomb.bombCarrierId = 'player1';
      bomb.droppedBombPos = { x: 5, y: 0, z: 5 };

      bomb.clear();

      expect(bomb.bombCarrierId).toBeNull();
      expect(bomb.droppedBombPos).toBeNull();
    });
  });

  describe('plant and defuse lifecycle', () => {
    it('should handle complete plant workflow', () => {
      const state = {
        players: new Map(),
        bombPlanted: false,
        bombTimeLeft: 0,
        bombSite: '',
      } as any;

      const player = {
        isPlanting: true,
        plantProgress: 3,
        hasBomb: true,
        x: 15,
        y: 0,
        z: -15,
      } as any;

      let plantBonusGiven = false;
      let broadcastEvent = '';

      bomb.completePlant(
        'player1',
        player,
        state,
        (p) => bomb.findNearestBombSite(p),
        (type) => {
          broadcastEvent = type;
        },
        () => {
          plantBonusGiven = true;
        }
      );

      expect(player.isPlanting).toBe(false);
      expect(player.hasBomb).toBe(false);
      expect(state.bombPlanted).toBe(true);
      expect(state.bombSite).toBe('A');
      expect(plantBonusGiven).toBe(true);
      expect(broadcastEvent).toBe('bombPlanted');
    });

    it('should handle complete defuse workflow', () => {
      const state = {
        bombPlanted: true,
        bombTimeLeft: 30,
        bombSite: 'A',
      } as any;

      const player = {
        isDefusing: true,
        defuseProgress: 5,
      } as any;

      let defuseBonusGiven = false;
      let roundWinner = '';

      bomb.completeDefuse(
        'player2',
        player,
        state,
        () => {
          defuseBonusGiven = true;
        },
        () => {},
        (winner) => {
          roundWinner = winner;
        }
      );

      expect(player.isDefusing).toBe(false);
      expect(state.bombPlanted).toBe(false);
      expect(defuseBonusGiven).toBe(true);
      expect(roundWinner).toBe('CT');
    });

    it('should handle bomb explode workflow', () => {
      const state = {
        bombPlanted: true,
        bombTimeLeft: 1,
        bombSite: 'A',
      } as any;

      let roundWinner = '';
      bomb.bombExplode(
        state,
        () => {},
        (winner) => {
          roundWinner = winner;
        }
      );

      expect(state.bombPlanted).toBe(false);
      expect(roundWinner).toBe('T');
    });
  });
});
