import { useState, useEffect } from "react";
import { getLeaderboard, clearLeaderboard, LeaderboardEntry } from "../../../lib/zombieLeaderboard";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_MONO, HUD_Z, hudPanel } from "../../hudTheme";

// ============================================================================
// Zombie Mode Leaderboard
// ============================================================================

interface ZombieLeaderboardProps {
  onClose: () => void;
}

export function ZombieLeaderboard({ onClose }: ZombieLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useMenuPointerLock();

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  const handleClear = () => {
    clearLeaderboard();
    setEntries([]);
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...hudPanel("gold"),
          width: "min(500px, 100%)",
          maxHeight: "min(78vh, 680px)",
          borderRadius: 16,
          padding: 22,
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, color: "#ffd700", fontSize: 18, fontWeight: 900, letterSpacing: 1.4 }}>
            HIGH SCORES
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              color: "#cbd5e1",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {entries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: "36px 0" }}>
            Belum ada skor. Selesaikan satu run dulu.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>NAME</th>
                <th style={thStyle}>WAVE</th>
                <th style={thStyle}>KILLS</th>
                <th style={thStyle}>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #222",
                    backgroundColor: i === 0 ? "rgba(255,215,0,0.1)" : "transparent",
                  }}
                >
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{entry.name}</td>
                  <td style={tdStyle}>{entry.wave}</td>
                  <td style={tdStyle}>{entry.kills}</td>
                  <td style={{ ...tdStyle, color: "#ffd700", fontWeight: "bold" }}>
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 18, justifyContent: "center" }}>
          <button
            onClick={handleClear}
            style={{
              padding: "8px 16px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.8,
              background: "rgba(239, 68, 68, 0.14)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            CLEAR SCORES
          </button>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px",
  textAlign: "left",
  fontSize: 10,
  letterSpacing: 1,
  color: "#94a3b8",
  fontWeight: 800,
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "9px 8px",
  fontSize: 13,
  color: "#e2e8f0",
  fontFamily: HUD_MONO,
};
