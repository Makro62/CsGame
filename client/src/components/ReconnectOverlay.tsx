import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "../stores/useGameStore";
import { useNetworkStore } from "../stores/useNetworkStore";

// Full-screen overlay shown while the connection is lost but the
// server keeps the player state for the reconnect window (60s).
export function ReconnectOverlay() {
  const connected = useNetworkStore((s) => s.connected);
  const reconnecting = useNetworkStore((s) => s.reconnecting);
  const reconnectDeadline = useNetworkStore((s) => s.reconnectDeadline);
  const [, setLocation] = useLocation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [connected]);

  const expired = !connected && reconnectDeadline > 0 && now > reconnectDeadline;
  const show = !connected && (reconnecting || expired);

  if (!show) return null;

  const secondsLeft = Math.max(0, Math.ceil((reconnectDeadline - now) / 1000));

  const backToMenu = () => {
    useNetworkStore.getState().disconnect();
    useGameStore.getState().setMode("menu");
    setLocation("/");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        zIndex: 300,
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "22px",
          color: "#f5a623",
          fontWeight: "bold",
        }}
      >
        {expired ? "CONNECTION LOST" : "RECONNECTING..."}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: "14px", color: "#aaa" }}>
        {expired
          ? "Reconnect window expired. Return to menu."
          : `Server keeps your state for ${secondsLeft}s`}
      </div>
      {expired && (
        <button
          onClick={backToMenu}
          style={{
            fontFamily: "monospace",
            fontSize: "15px",
            padding: "10px 28px",
            background: "#f5a623",
            color: "#0a0a0f",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          BACK TO MENU
        </button>
      )}
    </div>
  );
}