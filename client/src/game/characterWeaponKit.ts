/**
 * Barrel export — karakter, pose third-person, mesh senjata, dan rig FPS.
 *
 * Pakai satu import di file luar modul internal:
 *   import { MinecraftCharacter, WeaponModel, weaponCategoryFromId } from "../game/characterWeaponKit";
 *
 * Jangan import dari sini di file internal (MinecraftCharacter, TacticalBotModel, WeaponModel, dll.)
 * supaya tidak circular dependency.
 */

// ── Karakter & preview ───────────────────────────────────────────────────────
export { MinecraftCharacter } from "./player/MinecraftCharacter";
export { TacticalBotModel } from "./player/TacticalBotModel";
export { CharacterGear } from "./player/CharacterGear";
export { FitCharacterCamera, PreviewTurntable } from "./player/CharacterPreview";

export {
  getCharacterLook,
  CHARACTER_LOOKS,
} from "./player/characterLooks";
export type {
  CharacterLook,
  HeadStyle,
  GearFlag,
} from "./player/characterLooks";

// ── Pose & attachment third-person ─────────────────────────────────────────
export {
  THIRD_PERSON_ARM_POSES,
  TACTICAL_ELBOW_POSES,
  BLOCKY_WEAPON_ATTACH,
  TACTICAL_WEAPON_ATTACH,
  weaponCategoryFromType,
  weaponCategoryFromId,
} from "./player/thirdPersonWeaponRig";
export type {
  ThirdPersonWeaponCategory,
  ArmPose,
  WeaponAttach,
  TacticalElbowPose,
} from "./player/thirdPersonWeaponRig";

// ── Mesh senjata (FPS + third-person) ───────────────────────────────────────
export {
  WPN,
  makeKarambitBladeGeometry,
  FpsKarambitModel,
  ThirdPersonKarambit,
  ThirdPersonPistol,
  ThirdPersonSmg,
  ThirdPersonAk47,
  ThirdPersonM4,
  ThirdPersonAwp,
} from "./weapons/weaponGeometries";

// ── FPS weapon view & rig ────────────────────────────────────────────────────
export { WeaponModel } from "./weapons/WeaponModel";
export { weaponDisplay } from "./weapons/weaponDisplay";
export {
  WEAPON_POSITIONS,
  WEAPON_ROTATIONS,
  ADS_ROTATIONS,
  ADS_POSITIONS,
  MUZZLE_OFFSETS,
  DEAGLE_HANDS,
  GLOCK_HANDS,
  TEC9_HANDS,
  AUTOPISTOL_HANDS,
  AKIMBO_HANDS,
  getADSPosition,
  getMuzzleOffset,
  isAkimboWeapon,
} from "./weapons/weaponRig";
export type { AkimboSide, AkimboHand } from "./weapons/weaponRig";
