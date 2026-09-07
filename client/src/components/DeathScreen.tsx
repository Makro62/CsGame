import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "../stores/useGameStore";
import { HUD_Z } from "../ui/hudTheme";

export function DeathScreen() {
  const gameMode = useGameStore((s) => s.mode);
  const offlineIsDead = useOffline5v5Store((s) => s.players.get("local")?.isDead ?? false);
  const isDead = gameMode === "offline5v5" ? offlineIsDead : false;

  if (!isDead) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at center, rgba(30,10,10,0.7) 0%, rgba(5,5,10,0.92) 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Rajdhani', monospace",
        color: "white",
        zIndex: HUD_Z.overlay, // 50, strictly below PauseMenu (90)
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontWeight: 900,
          color: "#ef4444",
          letterSpacing: "4px",
          textShadow: "0 0 30px rgba(239,68,68,0.75)",
          marginBottom: "12px",
        }}
      >
        ELIMINATED
      </div>

      <div
        style={{
          fontSize: "clamp(14px, 2vw, 18px)",
          color: "#94a3b8",
          letterSpacing: "1px",
          fontWeight: 700,
        }}
      >
        MENUNGGU RONDE BERIKUTNYA • TEKAN [ESC] UNTUK MENU
      </div>
    </div>
  );
}
