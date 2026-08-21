import type { CSSProperties } from "react";

/**
 * Shared look & layout tokens for the in-game HUDs (Zombie Survival and
 * Training Range). Both modes used to hand-position every widget with its own
 * font stack and z-index, which made panels overlap. Anything that draws on top
 * of the canvas should pull its spacing, colours and stacking order from here.
 */

export const HUD_FONT = "'Inter', 'Segoe UI', system-ui, sans-serif";
export const HUD_MONO = "'JetBrains Mono', 'Consolas', monospace";

/** Single source of truth for HUD stacking so overlays never fight each other. */
export const HUD_Z = {
  /** Corner widgets: health, ammo, minimap, points. */
  hud: 30,
  /** Centered status banners: wave, extraction, power-up. */
  banner: 40,
  /** Contextual "[F] to ..." prompts near the bottom. */
  prompt: 45,
  /** Full-screen state overlays such as the downed vignette. */
  overlay: 50,
  /** Always-clickable chrome: menu button, mode tabs. */
  chrome: 60,
  /** Modals: shop, mystery box, settings, game over. */
  modal: 1000,
} as const;

/** Outer margin used by every HUD corner so the corners line up. */
export const HUD_EDGE = 16;

export type HudAccent = "red" | "gold" | "green" | "blue" | "amber" | "violet" | "neutral";

const ACCENTS: Record<HudAccent, { border: string; glow: string; text: string }> = {
  red: { border: "rgba(239, 68, 68, 0.55)", glow: "rgba(239, 68, 68, 0.18)", text: "#f87171" },
  gold: { border: "rgba(255, 215, 0, 0.5)", glow: "rgba(255, 215, 0, 0.16)", text: "#ffd700" },
  green: { border: "rgba(16, 185, 129, 0.55)", glow: "rgba(16, 185, 129, 0.18)", text: "#34d399" },
  blue: { border: "rgba(59, 130, 246, 0.5)", glow: "rgba(59, 130, 246, 0.16)", text: "#60a5fa" },
  amber: { border: "rgba(245, 158, 11, 0.55)", glow: "rgba(245, 158, 11, 0.18)", text: "#fbbf24" },
  violet: { border: "rgba(124, 58, 237, 0.55)", glow: "rgba(124, 58, 237, 0.2)", text: "#c084fc" },
  neutral: { border: "rgba(255, 255, 255, 0.14)", glow: "rgba(0, 0, 0, 0)", text: "#cbd5e1" },
};

/** Accent colour for text/icons that sit next to a panel of the same accent. */
export function hudAccentColor(accent: HudAccent): string {
  return ACCENTS[accent].text;
}

/** The one panel style every HUD widget shares: dark glass + accent border. */
export function hudPanel(accent: HudAccent = "neutral"): CSSProperties {
  const { border, glow } = ACCENTS[accent];
  return {
    background: "linear-gradient(150deg, rgba(10, 14, 22, 0.88), rgba(17, 24, 39, 0.82))",
    border: `1px solid ${border}`,
    borderRadius: 12,
    backdropFilter: "blur(10px)",
    boxShadow: `0 10px 28px rgba(0, 0, 0, 0.55), 0 0 18px ${glow}`,
    fontFamily: HUD_FONT,
  };
}

/** Small uppercase pill used for perks, statuses and hotkey hints. */
export function hudPill(accent: HudAccent = "neutral"): CSSProperties {
  const { border, text } = ACCENTS[accent];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: "rgba(0, 0, 0, 0.4)",
    color: text,
    fontFamily: HUD_FONT,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.8,
    whiteSpace: "nowrap",
  };
}

/** Compact clickable HUD chrome used by zombie command buttons. */
export function hudActionButton(accent: HudAccent = "neutral"): CSSProperties {
  const { border, text } = ACCENTS[accent];
  return {
    ...hudPill(accent),
    pointerEvents: "auto",
    cursor: "pointer",
    fontSize: 11,
    padding: "6px 11px",
    fontWeight: 800,
    color: text,
    border: `1px solid ${border}`,
  };
}
export function hudBannerStack(top: number): CSSProperties {
  return {
    position: "fixed",
    top,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    zIndex: HUD_Z.banner,
    pointerEvents: "none",
    userSelect: "none",
    maxWidth: "min(560px, calc(100vw - 320px))",
    fontFamily: HUD_FONT,
  };
}

/** Column for the contextual prompts that sit above the bottom HUD. */
export function hudPromptStack(bottom: number): CSSProperties {
  return {
    position: "fixed",
    bottom,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    zIndex: HUD_Z.prompt,
    pointerEvents: "none",
    userSelect: "none",
    fontFamily: HUD_FONT,
  };
}
