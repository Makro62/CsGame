import { describe, it, expect } from 'vitest';
import { WeaponManager } from '../server/src/rooms/WeaponManager';

describe('WeaponManager', () => {
  const manager = new WeaponManager();

  describe('canFire', () => {
    it('should allow firing with a valid weapon', () => {
      expect(manager.canFire('player1', 'ak47')).toBe(true);
    });

    it('should reject firing with invalid weapon', () => {
      expect(manager.canFire('player1', 'invalid')).toBe(false);
    });

    it('should enforce fire rate cooldown', () => {
      const sessionId = 'fireRateTest';
      manager.canFire(sessionId, 'ak47');
      manager.recordFire(sessionId);
      // Immediate second shot should be blocked
      expect(manager.canFire(sessionId, 'ak47')).toBe(false);
    });
  });

  describe('validateShootOrigin', () => {
    it('should accept origin near player position', () => {
      const shooter = { x: 10, y: 0, z: 10 } as any;
      const data = { origin: { x: 10.5, y: 1.6, z: 10.5 } } as any;
      expect(manager.validateShootOrigin(shooter, data)).toBe(true);
    });

    it('should reject origin far from player position', () => {
      const shooter = { x: 10, y: 0, z: 10 } as any;
      const data = { origin: { x: 50, y: 1.6, z: 50 } } as any;
      expect(manager.validateShootOrigin(shooter, data)).toBe(false);
    });
  });

  describe('calculateDamage', () => {
    it('should return correct torso damage', () => {
      const dmg = manager.calculateDamage('ak47', 'torso', 0, false);
      expect(dmg).toBe(35); // AK47 torso damage
    });

    it('should return correct headshot damage', () => {
      const dmg = manager.calculateDamage('ak47', 'head', 0, false);
      expect(dmg).toBe(100); // AK47 headshot damage
    });

    it('should reduce damage for limbs', () => {
      const dmg = manager.calculateDamage('ak47', 'limbs', 0, false);
      expect(dmg).toBeLessThan(35);
    });

    it('should reduce damage with helmet on headshot', () => {
      const dmgNoHelmet = manager.calculateDamage('ak47', 'head', 100, false);
      const dmgWithHelmet = manager.calculateDamage('ak47', 'head', 100, true);
      expect(dmgWithHelmet).toBeLessThan(dmgNoHelmet);
    });

    it('should reduce damage with armor on torso', () => {
      const dmgNoArmor = manager.calculateDamage('ak47', 'torso', 0, false);
      const dmgWithArmor = manager.calculateDamage('ak47', 'torso', 100, false);
      expect(dmgWithArmor).toBeLessThan(dmgNoArmor);
    });

    it('should return 0 for invalid weapon', () => {
      const dmg = manager.calculateDamage('invalid', 'torso', 0, false);
      expect(dmg).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clear all data for a session', () => {
      const sessionId = 'cleanupTest';
      manager.canFire(sessionId, 'ak47');
      manager.recordFire(sessionId);
      manager.recordPosition(sessionId, { x: 0, y: 0, z: 0 } as any, performance.now());
      manager.clearAll(sessionId);
      // After cleanup, should be able to fire again
      expect(manager.canFire(sessionId, 'ak47')).toBe(true);
    });
  });
});
