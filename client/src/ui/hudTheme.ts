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
  /** ESC pause menu. */
  pause: 90,
  /** Buy / shop panels. */
  shop: 200,
  /** Settings sits above pause so the two never stack as twins. */
  settings: 700,
  /** Game-over / match-over. */
  modal: 1000,
} as const;

/** Outer margin used by every HUD corner so the corners line up. Responsive via clamp. */
export const HUD_EDGE = 16;
/** Responsive edge: clamp(8px, 2vw, 16px) as CSS string for inline styles. */
export const HUD_EDGE_RESPONSIVE = "clamp(8px, 2vw, 16px)";

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
    borderRadius: "clamp(8px, 1.2vw, 12px)",
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
    padding: "clamp(2px, 0.5vw, 3px) clamp(6px, 1vw, 8px)",
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: "rgba(0, 0, 0, 0.4)",
    color: text,
    fontFamily: HUD_FONT,
    fontSize: "clamp(9px, 1.8vw, 10px)",
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
    fontSize: "clamp(10px, 2vw, 11px)",
    padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
    minHeight: "36px",
    fontWeight: 800,
    color: text,
    border: `1px solid ${border}`,
  };
}

/** Column that keeps centered banners from stacking on top of each other. */
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
    maxWidth: "min(560px, calc(100vw - 16px))",
    width: "calc(100vw - 16px)",
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

/** Shared dimmed backdrop for pause, buy, settings, and end-game cards. */
export function modalBackdrop(zIndex: number): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(4, 8, 16, 0.78)",
    backdropFilter: "blur(8px)",
    zIndex,
    padding: 16,
    boxSizing: "border-box",
    userSelect: "none",
    fontFamily: HUD_FONT,
  };
}

/** One card shape for every overlay so buy / pause / settings match. */
export function modalCard(accent: HudAccent = "blue"): CSSProperties {
  return {
    ...hudPanel(accent),
    width: "min(92vw, 560px)",
    minWidth: "min(520px, 92vw)",
    maxWidth: "96vw",
    maxHeight: "80dvh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    padding: 0,
    textAlign: "left",
  };
}

export type OverlayBtnVariant = "primary" | "warn" | "danger" | "ghost" | "accent";

/** Shared overlay button so pause / shop / game-over never mix Tailwind vs inline. */
export function overlayButton(variant: OverlayBtnVariant = "ghost"): CSSProperties {
  const palettes: Record<OverlayBtnVariant, { bg: string; color: string; border: string }> = {
    primary: { bg: "linear-gradient(90deg, #0284c7, #0369a1)", color: "#fff", border: "1px solid rgba(56, 189, 248, 0.6)" },
    accent: { bg: "linear-gradient(90deg, #4d7c0f, #3f6212)", color: "#fff", border: "1px solid rgba(132, 204, 22, 0.55)" },
    warn: { bg: "rgba(234, 179, 8, 0.16)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.45)" },
    danger: { bg: "rgba(239, 68, 68, 0.16)", color: "#fecaca", border: "1px solid rgba(239, 68, 68, 0.45)" },
    ghost: { bg: "rgba(255, 255, 255, 0.06)", color: "#e2e8f0", border: "1px solid rgba(255, 255, 255, 0.14)" },
  };
  const p = palettes[variant];
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    minHeight: 44,
    padding: "12px 20px",
    background: p.bg,
    color: p.color,
    border: p.border,
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: HUD_FONT,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.06em",
    boxSizing: "border-box",
  };
}
