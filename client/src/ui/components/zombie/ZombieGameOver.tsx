import { useState } from "react";
import { EXTRACTION_CONFIG } from "@cs-game/shared";
import { addToLeaderboard, calculateScore } from "../../../lib/zombieLeaderboard";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_MONO, HUD_Z, hudPanel } from "../../hudTheme";

// ============================================================================
// Zombie Game Over / Victory Screen
// ============================================================================

interface ZombieGameOverProps {
  wave: number;
  kills: number;
  headshots: number;
  evacuated?: boolean;
  onRestart: () => void;
  onMenu: () => void;
}

export function ZombieGameOver({ wave, kills, headshots, evacuated = false, onRestart, onMenu }: ZombieGameOverProps) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const baseScore = calculateScore(wave, kills, headshots);
  const score = evacuated ? baseScore + EXTRACTION_CONFIG.bonusPoints : baseScore;

  // The run is over, so hand the cursor back for good: the nickname field and
  // the buttons are unusable while the canvas still owns the pointer lock.
  useMenuPointerLock(false);

  const handleSave = () => {
    if (!name.trim()) return;
    addToLeaderboard({ name: name.trim(), wave, kills, score });
    setSaved(true);
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
        backgroundColor: "rgba(4, 7, 12, 0.9)",
        backdropFilter: "blur(6px)",
        zIndex: HUD_Z.modal,
        fontFamily: HUD_FONT,
      }}
    >
      <div
        style={{
          ...hudPanel(evacuated ? "green" : "red"),
          width: "min(460px, 100%)",
          borderRadius: 16,
          padding: 28,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: "0 0 6px 0",
            color: evacuated ? "#34d399" : "#f87171",
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          {evacuated ? "🚁 EXTRACTED" : "GAME OVER"}
        </h1>

        <p style={{ color: evacuated ? "#a7f3d0" : "#94a3b8", fontSize: 13, marginTop: 0, marginBottom: 18 }}>
          {evacuated
            ? "Congratulations! You survived the horde and reached extraction."
            : "The outbreak overwhelmed your squad."}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            margin: "20px 0",
            backgroundColor: "rgba(255,255,255,0.03)",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Stat label="WAVE" value={String(wave)} />
          <Stat label="KILLS" value={String(kills)} />
          <Stat label="SCORE" value={score.toLocaleString()} color="#ffd700" />
        </div>

        {/* Save score */}
        {!saved ? (
          <div style={{ marginBottom: "24px" }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter nickname for Leaderboard"
              maxLength={16}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: 14,
                fontFamily: HUD_MONO,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 8,
                color: "#fff",
                textAlign: "center",
                marginBottom: 10,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                padding: "9px 22px",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1,
                background: name.trim() ? "linear-gradient(135deg, #facc15, #eab308)" : "rgba(255,255,255,0.05)",
                color: name.trim() ? "#1a1a1a" : "#6b7280",
                border: name.trim() ? "1px solid #fde047" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                cursor: name.trim() ? "pointer" : "not-allowed",
              }}
            >
              SAVE TO LEADERBOARD
            </button>
          </div>
        ) : (
          <div style={{ color: "#34d399", marginBottom: 20, fontSize: 12, fontWeight: 800 }}>
            ✅ Score tersimpan di leaderboard lokal
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onRestart}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 1,
              background: "linear-gradient(135deg, #16a34a, #15803d)",
              color: "#fff",
              border: "1px solid #4ade80",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onMenu}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 1,
              background: "rgba(255,255,255,0.06)",
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "#f8fafc" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: 1.2, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 900, fontFamily: HUD_MONO }}>{value}</div>
    </div>
  );
}
