import type { CSSProperties, ReactNode } from "react";
import {
  HUD_FONT,
  HUD_Z,
  modalBackdrop,
  modalCard,
  overlayButton,
  type HudAccent,
  type OverlayBtnVariant,
} from "../../hudTheme";

export function GameModal({
  accent = "blue",
  zIndex = HUD_Z.shop,
  onBackdrop,
  children,
  cardStyle,
}: {
  accent?: HudAccent;
  zIndex?: number;
  onBackdrop?: () => void;
  children: ReactNode;
  cardStyle?: CSSProperties;
}) {
  return (
    <div style={modalBackdrop(zIndex)} onClick={onBackdrop}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...modalCard(accent), ...cardStyle }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  eyebrow,
  title,
  extra,
  onClose,
}: {
  eyebrow?: string;
  title: string;
  extra?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      style={{
        padding: "16px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: HUD_FONT,
      }}
    >
      <div>
        {eyebrow ? (
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.2, color: "#94a3b8", marginBottom: 4 }}>
            {eyebrow}
          </div>
        ) : null}
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.08em", color: "#f8fafc" }}>
          {title}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {extra}
        {onClose ? (
          <button type="button" onClick={onClose} style={{ ...overlayButton("ghost"), width: "auto", minHeight: 36, padding: "8px 12px", fontSize: 12 }}>
            ESC
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: 20, overflowY: "auto", flex: 1, minHeight: 0 }}>
      {children}
    </div>
  );
}

export function OverlayButton({
  variant = "ghost",
  onClick,
  disabled,
  children,
}: {
  variant?: OverlayBtnVariant;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...overlayButton(variant),
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
