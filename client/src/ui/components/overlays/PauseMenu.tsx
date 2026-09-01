import { HUD_Z, type HudAccent } from "../../hudTheme";
import { useUiOverlayStore } from "../../../stores/useUiOverlayStore";
import { GameModal, ModalBody, ModalHeader, OverlayButton } from "./GameModal";

export function PauseMenu({
  title,
  accent = "blue",
  onResume,
  onRestart,
  onQuit,
}: {
  title: string;
  accent?: HudAccent;
  onResume: () => void;
  onRestart?: () => void;
  onQuit: () => void;
}) {
  const settingsOpen = useUiOverlayStore((s) => s.settingsOpen);
  if (settingsOpen) return null;

  return (
    <GameModal accent={accent} zIndex={HUD_Z.pause} onBackdrop={onResume}>
      <ModalHeader eyebrow="PAUSED" title={title} />
      <ModalBody>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <OverlayButton variant="primary" onClick={onResume}>
            LANJUTKAN
          </OverlayButton>
          <OverlayButton variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent("openSettings"))}>
            PENGATURAN
          </OverlayButton>
          {onRestart ? (
            <OverlayButton variant="warn" onClick={onRestart}>
              ULANGI
            </OverlayButton>
          ) : null}
          <OverlayButton variant="danger" onClick={onQuit}>
            MENU UTAMA
          </OverlayButton>
        </div>
      </ModalBody>
    </GameModal>
  );
}
