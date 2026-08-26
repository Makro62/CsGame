import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "../stores/useGameStore";

export function DeathScreen() {
  const gameMode = useGameStore((s) => s.mode);
  const offlineIsDead = useOffline5v5Store(s => s.players.get("local")?.isDead ?? false);
  const isDead = gameMode === "offline5v5" ? offlineIsDead : false;

  if (!isDead) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
        color: "white",
        zIndex: 150,
        pointerEvents: "none",
        filter: "grayscale(100%)",
      }}
    >
      <div
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          color: "#ef4444",
          textShadow: "0 0 20px rgba(239,68,68,0.8)",
          marginBottom: "24px",
        }}
      >
        YOU DIED
      </div>

      <div style={{ fontSize: "20px", color: "#aaa" }}>
        Menunggu ronde berikutnya
      </div>
    </div>
  );
}
