import { useState, useEffect } from "react";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";

// ============================================================================
// Pack-a-Punch UI
// ============================================================================

interface PackAPunchProps {
  onClose: () => void;
}

export function PackAPunch({ onClose }: PackAPunchProps) {
  const points = useZombieStore((s) => s.points);
  const sendPackAPunch = useZombieNetworkStore((s) => s.sendPackAPunch);
  const [upgrading, setUpgrading] = useState(false);
  const [complete, setComplete] = useState(false);

  const price = 5000;

  useEffect(() => {
    const handleComplete = () => {
      setUpgrading(false);
      setComplete(true);
    };

    window.addEventListener("packAPunchComplete", handleComplete);
    return () => window.removeEventListener("packAPunchComplete", handleComplete);
  }, []);

  const handleUse = () => {
    if (points < price || upgrading) return;
    setUpgrading(true);
    sendPackAPunch();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !upgrading) onClose();
      }}
    >
      <div
        style={{
          width: "400px",
          backgroundColor: "#1a1a2e",
          border: "2px solid #f97316",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", color: "#f97316", fontSize: "24px", fontWeight: "bold" }}>
          PACK-A-PUNCH
        </h2>
        <p style={{ color: "#999", fontSize: "12px", margin: "0 0 16px 0" }}>
          Upgrade your weapon for 1.5x damage
        </p>

        {/* Upgrade animation */}
        <div
          style={{
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          {upgrading ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "24px",
                  color: "#f97316",
                  animation: "pulse 0.5s infinite",
                }}
              >
                ⚡ UPGRADING... ⚡
              </div>
            </div>
          ) : complete ? (
            <div>
              <div style={{ color: "#22c55e", fontSize: "14px", marginBottom: "4px" }}>
                Weapon Upgraded!
              </div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ffd700" }}>
                1.5x DAMAGE
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: "14px" }}>
              Upgrade your current weapon
            </div>
          )}
        </div>

        {/* Use button */}
        {!upgrading && !complete && (
          <button
            onClick={handleUse}
            disabled={points < price}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: points >= price ? "#f97316" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: points >= price ? "pointer" : "not-allowed",
              opacity: points >= price ? 1 : 0.5,
            }}
          >
            UPGRADE ({price} PTS)
          </button>
        )}

        {complete && (
          <button
            onClick={onClose}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            CONTINUE
          </button>
        )}

        <div style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
          Points: <span style={{ color: "#ffd700", fontWeight: "bold" }}>{points}</span>
        </div>
      </div>
    </div>
  );
}
