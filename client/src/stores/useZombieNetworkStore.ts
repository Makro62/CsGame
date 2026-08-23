// @ts-nocheck
// Stub offline — original ZombieNetworkStore removed. All zombie logic now in useZombieStore + ZombieEngine (offline).
import { create } from "zustand";
import { useZombieStore } from "./useZombieStore";
import { zombieEngine } from "../game/zombie/ZombieEngine";

interface StubZombieNetworkState {
  connected: boolean; isLocal: boolean; difficulty: string; soloRevives: number;
  localHp: number; localMaxHp: number; localIsDead: boolean; localIsDowned: boolean; localDownedTimer: number;
  localWeapon: string; localAmmo: number; localReserveAmmo: number; localArmor: number;
  hasJuggernog: boolean; hasSpeedCola: boolean; hasDoubleTap: boolean; hasQuickRevive: boolean; hasPackAPunch: boolean;
  kills: number; headshots: number; downedAllies: unknown[]; lastSnapshot: { x:number; y:number; z:number; rotationY:number; lastProcessedSeq:number } | null;
  latency: number; lastBuyFailure: unknown;
  connect: (nickname: string, difficulty?: string) => Promise<void>;
  disconnect: () => void;
  sendInput: (d: unknown) => void;
  sendShoot: (d: unknown) => void;
  sendMelee: (d: unknown) => void;
  sendReload: () => void;
  sendSwitchWeapon: (w: string) => void;
  sendBuyWeapon: (w: string) => void;
  sendStartGame: () => void;
  sendBuyAmmo: () => void;
  sendBuyArmor: () => void;
  sendBuyPerk: (p: string) => void;
  sendMysteryBox: () => void;
  sendPackAPunch: () => void;
  sendUnlockArea: (id: string) => void;
  sendRepairBarricade: (id: string) => void;
  sendTriggerExtraction: () => void;
  sendStartRevive: (id: string) => void;
  sendCancelRevive: () => void;
  sendTickRevive: (p: number) => void;
  sendPickupPowerUp: (id: string) => void;
  sendHeal: () => void;
}

export const useZombieNetworkStore = create<StubZombieNetworkState>(() => ({
  connected: true, isLocal: true, difficulty: "normal", soloRevives: 3,
  localHp: 100, localMaxHp: 100, localIsDead: false, localIsDowned: false, localDownedTimer: 0,
  localWeapon: "deagle", localAmmo: 14, localReserveAmmo: 70, localArmor: 0,
  hasJuggernog: false, hasSpeedCola: false, hasDoubleTap: false, hasQuickRevive: false, hasPackAPunch: false,
  kills: 0, headshots: 0, downedAllies: [], lastBuyFailure: null,
  lastSnapshot: { x: 0, y: 0, z: 0, rotationY: 0, lastProcessedSeq: 0 },
  latency: 0,
  connect: async () => {
    useZombieStore.getState().resetGame();
    zombieEngine.init();
  },
  disconnect: () => {
    zombieEngine.cleanup();
    useZombieStore.getState().resetGame();
  },
  sendInput: () => {},
  sendShoot: (d: unknown) => {
    const data = d as { origin?: { x:number;y:number;z:number }; direction?: { x:number;y:number;z:number } } | undefined;
    if (data?.origin && data?.direction) {
      // @ts-ignore - engine expects THREE vectors but we accept plain
      try { zombieEngine.handleShoot(data.origin as unknown as never, data.direction as unknown as never, 35, false); } catch {}
    }
  },
  sendMelee: (d: unknown) => {
    try { (zombieEngine as unknown as { handleMelee: (x: unknown)=>void }).handleMelee(d); } catch {}
  },
  sendReload: () => {},
  sendSwitchWeapon: () => {},
  sendBuyWeapon: (w: string) => zombieEngine.handleBuyWeapon?.(w),
  sendStartGame: () => {},
  sendBuyAmmo: () => {},
  sendBuyArmor: () => {},
  sendBuyPerk: (p: string) => zombieEngine.handleBuyPerk?.(p),
  sendMysteryBox: () => zombieEngine.handleMysteryBox?.(),
  sendPackAPunch: () => zombieEngine.handlePackAPunch?.(),
  sendUnlockArea: (id: string) => zombieEngine.handleUnlockArea?.(id),
  sendRepairBarricade: (id: string) => zombieEngine.handleRepairBarricade?.(id),
  sendTriggerExtraction: () => {},
  sendStartRevive: () => {},
  sendCancelRevive: () => {},
  sendTickRevive: () => {},
  sendPickupPowerUp: (id: string) => zombieEngine.collectPowerUp?.(id),
  sendHeal: () => zombieEngine.handleHeal?.(),
}));
