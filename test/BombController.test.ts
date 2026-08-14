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
      const player = { x: -20, y: 0, z: 0 } as any;
      const site = bomb.findNearestBombSite(player);
      expect(site).toBe('A');
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
});
