import type { CSSProperties } from "react";

/**
 * Layout constants shared by the Training Range overlays. The drill panels used
 * to pick their own corners, which put them under the top navigation bar or on
 * top of the weapon rack; they now all dock to the same left column.
 */

export const TRAINING_PANEL_WIDTH = 244;

/** Z order kept above the shared HUD (z-100) but below the top nav (z-200). */
export const TRAINING_PANEL_Z = 150;

/** Left column that starts just below the top navigation bar. */
export const TRAINING_PANEL_ANCHOR: CSSProperties = {
  position: "fixed",
  top: 92,
  left: 16,
  zIndex: TRAINING_PANEL_Z,
};
