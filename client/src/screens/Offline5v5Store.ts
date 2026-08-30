/**
 * Re-export facade for Offline 5v5 Mode.
 * Modular store has been refactored into:
 * - client/src/stores/useOffline5v5Store.ts
 * - client/src/game/offline/types.ts
 * - client/src/game/offline/BotAI.ts
 * - client/src/game/offline/CombatSystem.ts
 * - client/src/game/offline/EconomySystem.ts
 * - client/src/game/offline/RoundManager.ts
 */

export { useOffline5v5Store } from "../stores/useOffline5v5Store";
export type {
  BotTacticalState,
  LocalPlayer,
  RoundPhase,
  KillEvent,
  BombPatch,
  BombState,
  BotDifficultyLevel,
  BotDifficultyConfig,
  BotReloadState,
  OfflineGameState,
} from "../game/offline/types";
export { DIFFICULTIES, botThink, botBuy, mkPlayer, defaultLoadout, refillAmmo } from "../game/offline/BotAI";
export { executeLocalShoot } from "../game/offline/CombatSystem";
export { getWeaponStats, executeLocalBuy } from "../game/offline/EconomySystem";
export { tickRound, endRound, resetForRound } from "../game/offline/RoundManager";
