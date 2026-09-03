/**
 * Barrel export — Offline 5v5 mode (gamePlayKit + bot + map/combat).
 */

export * from "../gamePlayKit";
export { TacticalBotModel } from "../characterWeaponKit";

export { getMapById } from "../map/MapRegistry";
export { ensureProcedural5v5, PROCEDURAL_5V5_ID } from "../map/ProceduralMapRegistry";
export { CalloutLabels } from "../map/CalloutLabels";
export { distToBombSite, nearestBombSite, resolveBombSites } from "./offlineCombat";
export { getAgent } from "./agents";
export { BuyMenu } from "../../components/BuyMenu";
export { DeathScreen } from "../../components/DeathScreen";
