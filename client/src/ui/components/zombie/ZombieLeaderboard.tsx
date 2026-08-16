import { useState, useEffect } from "react";
import { getLeaderboard, clearLeaderboard, LeaderboardEntry } from "../../../lib/zombieLeaderboard";

// ============================================================================
// Zombie Mode Leaderboard
// ============================================================================

interface ZombieLeaderboardProps {
  onClose: () => void;
}

export function ZombieLeaderboard({ onClose }: ZombieLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "500px",
          maxHeight: "80vh",
          backgroundColor: "#1a1a2e",
          border: "2px solid #ffd700",
          borderRadius: "12px",
          padding: "24px",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#ffd700", fontSize: "24px", fontWeight: "bold" }}>
            HIGH SCORES
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {entries.length === 0 ? (
          <div style={{ textAlign: "center", color: "#666", padding: "40px 0" }}>
            No scores yet. Play a game!
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

        <div style={{ display: "flex", gap: "12px", marginTop: "20px", justifyContent: "center" }}>
          <button
            onClick={handleClear}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              backgroundColor: "rgba(255,0,0,0.2)",
              color: "#ff6666",
              border: "1px solid rgba(255,0,0,0.3)",
              borderRadius: "6px",
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
  padding: "12px 8px",
  textAlign: "left",
  fontSize: "12px",
  color: "#999",
  fontWeight: "bold",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  fontSize: "14px",
  color: "#fff",
};
