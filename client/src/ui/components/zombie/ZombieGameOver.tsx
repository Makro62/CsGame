import { useState } from "react";
import { addToLeaderboard, calculateScore } from "../../../lib/zombieLeaderboard";

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
  const score = evacuated ? baseScore + 5000 : baseScore;

  const handleSave = () => {
    if (!name.trim()) return;
    addToLeaderboard({ name: name.trim(), wave, kills, score });
    setSaved(true);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.92)",
        zIndex: 1000,
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "480px",
          backgroundColor: "#111827",
          border: evacuated ? "2px solid #10b981" : "2px solid #dc2626",
          borderRadius: "14px",
          padding: "36px",
          textAlign: "center",
          boxShadow: evacuated ? "0 0 35px rgba(16, 185, 129, 0.4)" : "0 0 35px rgba(220, 38, 38, 0.4)",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px 0",
            color: evacuated ? "#10b981" : "#dc2626",
            fontSize: "42px",
            fontWeight: "900",
            letterSpacing: "2px",
          }}
        >
          {evacuated ? "🚁 EXTRACTED!" : "GAME OVER"}
        </h1>

        <p style={{ color: evacuated ? "#a7f3d0" : "#9ca3af", fontSize: "14px", marginTop: 0, marginBottom: "20px" }}>
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
          <div>
            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>WAVE</div>
            <div style={{ color: "#fff", fontSize: "26px", fontWeight: "bold" }}>{wave}</div>
          </div>
          <div>
            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>KILLS</div>
            <div style={{ color: "#fff", fontSize: "26px", fontWeight: "bold" }}>{kills}</div>
          </div>
          <div>
            <div style={{ color: "#ffd700", fontSize: "12px", marginBottom: "4px" }}>TOTAL SCORE</div>
            <div style={{ color: "#ffd700", fontSize: "26px", fontWeight: "bold" }}>
              {score.toLocaleString()}
            </div>
          </div>
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
                padding: "12px",
                fontSize: "15px",
                fontFamily: "monospace",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: "#fff",
                textAlign: "center",
                marginBottom: "12px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: name.trim() ? "#ffd700" : "#374151",
                color: name.trim() ? "#000" : "#9ca3af",
                border: "none",
                borderRadius: "8px",
                cursor: name.trim() ? "pointer" : "not-allowed",
              }}
            >
              SAVE TO LEADERBOARD
            </button>
          </div>
        ) : (
          <div style={{ color: "#10b981", marginBottom: "24px", fontSize: "14px", fontWeight: "bold" }}>
            ✅ Score recorded to Local Leaderboard!
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onRestart}
            style={{
              padding: "14px 28px",
              fontSize: "15px",
              fontWeight: "bold",
              backgroundColor: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            PLAY AGAIN
          </button>
          <button
            onClick={onMenu}
            style={{
              padding: "14px 28px",
              fontSize: "15px",
              fontWeight: "bold",
              backgroundColor: "#374151",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
