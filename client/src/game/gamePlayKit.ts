/**
 * Barrel export — sistem FPS gameplay (player, senjata, HUD, store).
 *
 * Dipakai mode in-game (Training, L4D, 5v5, dll.) supaya import pendek:
 *   import { WeaponModel, ShootingSystem, Crosshair } from "../game/gamePlayKit";
 *
 * Karakter & mesh senjata third-person ada di characterWeaponKit.ts.
 */

// Player & combat systems
export { PlayerController } from "./player/PlayerController";
export { WeaponModel } from "./characterWeaponKit";
export { ShootingSystem } from "./weapons/ShootingSystem";
export { ReloadSystem } from "./weapons/ReloadSystem";
export { GrenadeSystem } from "./weapons/GrenadeSystem";
export { TracerManager } from "./effects/TracerManager";

// HUD & overlay
export { HUDLayout } from "../ui/components/hud/HUDLayout";
export { Crosshair } from "../components/Crosshair";
export { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
export { AudioManager } from "../components/AudioManager";
export { default as SniperScope } from "../components/SniperScope";
export { ADSOpticSight } from "../components/ADSOpticSight";
export { FlashEffect } from "../components/FlashEffect";
export { DamageVignette } from "../components/DamageVignette";
export { PauseMenu } from "../ui/components/overlays/PauseMenu";
export { InGameChrome } from "../ui/components/overlays/InGameChrome";
export {
  GameModal,
  ModalBody,
  ModalHeader,
  OverlayButton,
} from "../ui/components/overlays/GameModal";

// Store & hooks
export { useWeaponStore, type WeaponKey } from "../stores/useWeaponStore";
export { useGameStore } from "../stores/useGameStore";
export { useWeaponSwitch } from "../hooks/useWeaponSwitch";

// HUD theme
export { HUD_FONT, HUD_MONO, hudPanel, HUD_Z, hudActionButton } from "../ui/hudTheme";
