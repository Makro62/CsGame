import { useState, useEffect } from "react";
import { PACK_A_PUNCH } from "@cs-game/shared";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_MONO, HUD_Z, hudPanel } from "../../hudTheme";

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
  const [error, setError] = useState<string | null>(null);

  const price = PACK_A_PUNCH.price;

  useMenuPointerLock();

  useEffect(() => {
    const handleComplete = () => {
      setUpgrading(false);
      setComplete(true);
    };

    // Without this the overlay would sit on "UPGRADING..." forever whenever the
    // server refuses (already upgraded, too far, weapon not allowed).
    const handleFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ item: string }>).detail;
      if (detail.item !== "pack_a_punch") return;
      setUpgrading(false);
      setError(useZombieNetworkStore.getState().lastBuyFailure?.message ?? "Upgrade refused");
    };

    window.addEventListener("packAPunchComplete", handleComplete);
    window.addEventListener("zombieBuyFailed", handleFailed);
    return () => {
      window.removeEventListener("packAPunchComplete", handleComplete);
      window.removeEventListener("zombieBuyFailed", handleFailed);
    };
  }, []);

  useEffect(() => {
    if (!upgrading) return;
    const timeout = setTimeout(() => {
      setUpgrading(false);
      setError("No response from the machine, try again");
    }, 8000);
    return () => clearTimeout(timeout);
  }, [upgrading]);

  const handleUse = () => {
    if (points < price || upgrading) return;
    setUpgrading(true);
    setError(null);
    sendPackAPunch();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(4, 7, 12, 0.82)",
        backdropFilter: "blur(6px)",
        zIndex: HUD_Z.modal,
        fontFamily: HUD_FONT,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !upgrading) onClose();
      }}
    >
      <div
        style={{
          ...hudPanel("amber"),
          width: "min(400px, 100%)",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 4px 0", color: "#fb923c", fontSize: 20, fontWeight: 900, letterSpacing: 1.4 }}>
          PACK-A-PUNCH
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 11, margin: "0 0 8px 0" }}>
          Upgrade senjata aktif jadi {PACK_A_PUNCH.upgradeMultiplier}x damage
        </p>
        {error && (
          <div style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "8px", fontWeight: "bold" }}>
            {error}
          </div>
        )}

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
              <div style={{ fontSize: 20, fontWeight: 900, color: "#ffd700", fontFamily: HUD_MONO }}>
                {PACK_A_PUNCH.upgradeMultiplier}x DAMAGE
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
              padding: "11px 30px",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 1,
              background: points >= price ? "linear-gradient(135deg, #f97316, #ea580c)" : "rgba(255,255,255,0.05)",
              color: points >= price ? "#fff" : "#6b7280",
              border: points >= price ? "1px solid rgba(251,146,60,0.7)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: points >= price ? "pointer" : "not-allowed",
            }}
          >
            UPGRADE ({price.toLocaleString()} PTS)
          </button>
        )}

        {complete && (
          <button
            onClick={onClose}
            style={{
              padding: "11px 30px",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 1,
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#fff",
              border: "1px solid #4ade80",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            CONTINUE
          </button>
        )}

        <div style={{ marginTop: 14, color: "#64748b", fontSize: 11, letterSpacing: 0.6 }}>
          POINTS{" "}
          <span style={{ color: "#ffd700", fontWeight: 800, fontFamily: HUD_MONO }}>
            {points.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
