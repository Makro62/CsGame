import { useEffect, useState } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";

const RESPAWN_TIME = 4; // Slightly longer than server's 3s to account for latency

export function DeathScreen() {
  const localIsDead = useNetworkStore((s) => s.localIsDead);
  const connected = useNetworkStore((s) => s.connected);
  const deathRecap = useNetworkStore((s) => s.deathRecap);
  const [countdown, setCountdown] = useState(RESPAWN_TIME);

  useEffect(() => {
    if (localIsDead) {
      setCountdown(RESPAWN_TIME);
    }
  }, [localIsDead]);

  useEffect(() => {
    if (!localIsDead) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [localIsDead]);

  if (!connected || !localIsDead) return null;

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
      
      {/* Death Recap */}
      {deathRecap && (
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            padding: "16px 24px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "14px", color: "#888", marginBottom: "8px" }}>
            Killed by
          </div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ef4444", marginBottom: "8px" }}>
            {deathRecap.killerName}
          </div>
          <div style={{ fontSize: "14px", color: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: "2px 8px", 
              borderRadius: "4px",
              textTransform: "uppercase",
              fontSize: "12px"
            }}>
              {deathRecap.weapon}
            </span>
            {deathRecap.headshot && (
              <span style={{ color: "#fbbf24", fontSize: "12px" }}>
                HEADSHOT
              </span>
            )}
          </div>
        </div>
      )}
      
      <div
        style={{
          fontSize: "24px",
          color: "#aaa",
        }}
      >
        Respawn in {countdown}
      </div>
    </div>
  );
}
