/**
 * Barrel export — Training Range (gamePlayKit + modul latihan).
 *
 *   import { Canvas } from "@react-three/fiber";
 *   import { Physics } from "@react-three/rapier";
 *   import { WeaponModel, AimTrainer, TrainingArena, ... } from "./trainingKit";
 */

export * from "../gamePlayKit";

export { AimTrainer, AimTrainerUI } from "./AimTrainer";
export { RecoilPractice, RecoilPracticeUI } from "./RecoilPractice";
export { TrainingArena } from "./TrainingArena";
export { TRAINING_PANEL_Z } from "./trainingHud";
