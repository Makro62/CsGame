import React, { useState } from "react";
import { useGameStore } from "../../../stores/useGameStore";

export type TeamChoice = "T" | "CT" | "auto";

interface MatchLobbySetupProps {
  onStart: (team: TeamChoice) => void;
  onBack: () => void;
}

export const MatchLobbySetup: React.FC<MatchLobbySetupProps> = ({ onStart, onBack }) => {
  const nickname = useGameStore((s) => s.nickname);
  const setNickname = useGameStore((s) => s.setNickname);
  const [selectedTeam, setSelectedTeam] = useState<TeamChoice>("auto");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 10, 20, 0.88)",
        backdropFilter: "blur(14px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Inter', monospace, sans-serif",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          background: "linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.98))",
          border: "1px solid rgba(59, 130, 246, 0.35)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(59, 130, 246, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "28px" }}>⚔️</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: "26px",
                  fontWeight: 900,
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  color: "#60a5fa",
                  textShadow: "0 0 16px rgba(96, 165, 250, 0.4)",
                }}
              >
                COMPETITIVE 5V5 MATCH SETUP
              </h2>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#94a3b8" }}>
              Bomb Defusal 15 Ronde • Map Container Yard v3 • 5 Terrorists vs 5 Counter-Terrorists
            </p>
          </div>

          <div
            style={{
              padding: "6px 12px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#93c5fd",
              letterSpacing: "1px",
              fontWeight: "bold",
            }}
          >
            FIRST TO 8 WINS
          </div>
        </div>

        {/* Nickname Input */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <label style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold", letterSpacing: "1px" }}>
            CALLSIGN / NICKNAME:
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Survivor"
            maxLength={16}
            style={{
              flex: 1,
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
        </div>

        {/* Team Selection */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              color: "#cbd5e1",
              marginBottom: "12px",
            }}
          >
            PILIH TIM (TEAM SELECTION):
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            {/* Auto Assign */}
            <div
              onClick={() => setSelectedTeam("auto")}
              style={{
                background:
                  selectedTeam === "auto"
                    ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(15, 23, 42, 0.9))"
                    : "rgba(15, 23, 42, 0.6)",
                border:
                  selectedTeam === "auto"
                    ? "2px solid #06b6d4"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>🎲</span>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#22d3ee" }}>AUTO-ASSIGN</span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
                Masuk ke tim yang seimbang secara otomatis.
              </p>
            </div>

            {/* Terrorists */}
            <div
              onClick={() => setSelectedTeam("T")}
              style={{
                background:
                  selectedTeam === "T"
                    ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(15, 23, 42, 0.9))"
                    : "rgba(15, 23, 42, 0.6)",
                border:
                  selectedTeam === "T"
                    ? "2px solid #ef4444"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>🔴</span>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#f87171" }}>TERRORISTS (T)</span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
                Tanam C4 di Site A atau Site B, atau eliminasi seluruh Counter-Terrorists.
              </p>
            </div>

            {/* Counter-Terrorists */}
            <div
              onClick={() => setSelectedTeam("CT")}
              style={{
                background:
                  selectedTeam === "CT"
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(15, 23, 42, 0.9))"
                    : "rgba(15, 23, 42, 0.6)",
                border:
                  selectedTeam === "CT"
                    ? "2px solid #3b82f6"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>🔵</span>
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#60a5fa" }}>COUNTER-TERRORISTS</span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: 1.4 }}>
                Amankan Site A & Site B, jinakkan C4, atau eliminasi seluruh Terrorists.
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Tactical Guide */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: "12px",
            padding: "14px 18px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#38bdf8", marginBottom: "8px", letterSpacing: "1px" }}>
            TACTICAL QUICK GUIDE & CONTROLS:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              fontSize: "11px",
              color: "#cbd5e1",
            }}
          >
            <div><span style={{ color: "#facc15" }}>[B]</span> Buka Buy Menu (15s)</div>
            <div><span style={{ color: "#facc15" }}>[HOLD E]</span> Plant / Defuse C4</div>
            <div><span style={{ color: "#facc15" }}>[1/2/3]</span> Ganti Senjata / Scroll</div>
            <div><span style={{ color: "#facc15" }}>[G]</span> Drop Senjata / C4</div>
            <div><span style={{ color: "#facc15" }}>[R]</span> Reload Mag</div>
            <div><span style={{ color: "#facc15" }}>[Shift]</span> Silent Walk</div>
            <div><span style={{ color: "#facc15" }}>[Ctrl]</span> Crouch</div>
            <div><span style={{ color: "#facc15" }}>[P / ESC]</span> Settings & Leave</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
          <button
            onClick={onBack}
            style={{
              padding: "12px 24px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              color: "#cbd5e1",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ← KEMBALI KE MENU
          </button>

          <button
            onClick={() => onStart(selectedTeam)}
            style={{
              padding: "14px 38px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              border: "1px solid #60a5fa",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 900,
              letterSpacing: "1px",
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(37, 99, 235, 0.5)",
              transition: "all 0.2s",
            }}
          >
            ⚔️ MULAI MATCH 5V5
          </button>
        </div>
      </div>
    </div>
  );
};
