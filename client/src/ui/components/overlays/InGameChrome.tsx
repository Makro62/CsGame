import type { ReactNode } from "react";
import { HUD_EDGE_RESPONSIVE, HUD_Z, hudActionButton } from "../../hudTheme";

/** Single HUD control for pause. Settings / quit live inside the ESC menu. */
export function InGameChrome({
  extra,
  onMenu,
}: {
  extra?: ReactNode;
  onMenu: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: HUD_EDGE_RESPONSIVE,
        right: HUD_EDGE_RESPONSIVE,
        zIndex: HUD_Z.chrome,
        display: "flex",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      {extra}
      <button type="button" onClick={onMenu} style={hudActionButton("neutral")}>
        MENU [ESC]
      </button>
    </div>
  );
}
