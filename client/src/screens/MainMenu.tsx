import { useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "../stores/useGameStore";
import { useNetworkStore } from "../stores/useNetworkStore";
import { ServerBrowser } from "../components/ServerBrowser";
import { MAPS } from "../game/map/MapRegistry";

type ModeId = "training" | "zombie" | "match" | "offline5v5";

interface ModeCard {
  id: ModeId;
  glyph: string;
  title: string;
  tagline: string;
  players: string;
  accent: string;
  accentSoft: string;
  features: string[];
  action: string;
}

const MODES: ModeCard[] = [
  {
    id: "training",
    glyph: "◎",
    title: "TRAINING RANGE",
    tagline: "Latihan aim & kontrol recoil tanpa lawan",
    players: "SOLO • OFFLINE",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,",
    features: [
      "Target dummy & bot aim trainer",
      "Recoil wall 25 m",
      "Marker jarak 5-30 m",
    ],
    action: "MULAI LATIHAN",
  },
  {
    id: "offline5v5",
    glyph: "🤖",
    title: "5V5 OFFLINE vs BOT",
    tagline: "Bomb defusal local, lawan 9 bot AI",
    players: "SOLO • OFFLINE • NO SERVER",
    accent: "#f59e0b",
    accentSoft: "rgba(245,158,11,",
    features: ["Buy menu & ekonomi CS", "Bot AI beli senjata & tanam bom", "Full 15 ronde bomb defusal"],
    action: "MULAI OFFLINE",
  },
  {
    id: "zombie",
    glyph: "☣",
    title: "ZOMBIE SURVIVAL",
    tagline: "Wave survival third-person di Outpost Z-7",
    players: "1-4 PEMAIN • CO-OP",
    accent: "#dc2626",
    accentSoft: "rgba(220,38,38,",
    features: ["Zombie makin tebal tiap wave", "Shop senjata & Pack-a-Punch", "Heal setelah wave / Med Station"],
    action: "MASUK OUTBREAK",
  },
  {
    id: "match",
    glyph: "⚔",
    title: "COMPETITIVE 5V5",
    tagline: "Bomb defusal online dengan buy economy",
    players: "5V5 • ONLINE",
    accent: "#3b82f6",
    accentSoft: "rgba(59,130,246,",
    features: ["Plant / defuse 15 ronde", "Buy menu & ekonomi", "Overtime 7-7"],
    action: "QUICK JOIN 5V5",
  },
];

const KEYFRAMES = `
@keyframes menuRise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes menuGlow {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
`;

import { MatchLobbySetup, TeamChoice } from "../ui/components/match/MatchLobbySetup";

export function MainMenu() {
  const { setMode, nickname, setNickname, setServerMode, currentMap, setCurrentMap } = useGameStore();
  const [, setLocation] = useLocation();
  const [showBrowser, setShowBrowser] = useState(false);
  const [showMatchLobby, setShowMatchLobby] = useState(false);
  const [selected, setSelected] = useState<ModeId>("match");
  const connect = useNetworkStore((s) => s.connect);
  const joinRoomById = useNetworkStore((s) => s.joinRoomById);

  const activeMode = MODES.find((m) => m.id === selected) ?? MODES[2];

  const handleStart5v5 = (teamChoice: TeamChoice) => {
    setShowMatchLobby(false);
    setServerMode("bomb_defusal");
    connect(nickname, "bomb_defusal", teamChoice);
    setMode("multiplayer");
    setLocation("/play");
  };

  const launchSelected = () => {
    if (selected === "training") {
      setMode("training");
      setLocation("/training");
      return;
    }
    if (selected === "offline5v5") {
      setMode("offline5v5");
      setLocation("/offline5v5");
      return;
    }
    if (selected === "zombie") {
      setMode("zombie");
      setLocation("/zombie");
      return;
    }
    setShowMatchLobby(true);
  };

  const handleJoinRoom = (roomId: string) => {
    setServerMode("bomb_defusal");
    joinRoomById(roomId, nickname);
    setMode("multiplayer");
    setLocation("/play");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        background:
          "radial-gradient(900px 520px at 18% 8%, rgba(59,130,246,0.16), transparent 60%)," +
          "radial-gradient(760px 460px at 84% 82%, rgba(139,92,246,0.14), transparent 62%)," +
          "linear-gradient(160deg, #0b1020 0%, #111a33 48%, #0c1428 100%)",
        fontFamily: "monospace",
        color: "white",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Subtle grid overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 78%)",
        }}
      />

      <div
        style={{
          position: "relative",
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "28px 24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "26px",
          minHeight: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            animation: "menuRise 0.4s ease both",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1
                style={{
                  fontSize: "34px",
                  fontWeight: "bold",
                  letterSpacing: "6px",
                  margin: 0,
                  textShadow: "0 0 24px rgba(59,130,246,0.45)",
                }}
              >
                CS WEB FPS
              </h1>
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "1.5px",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(59,130,246,0.45)",
                  color: "#93c5fd",
                  background: "rgba(59,130,246,0.12)",
                }}
              >
                v3.0
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "12px", letterSpacing: "2px", color: "#7c8aa5" }}>
              BROWSER TACTICAL SHOOTER
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "10px", letterSpacing: "1.5px", color: "#6b7280" }}>NICKNAME</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                style={{
                  padding: "9px 14px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  letterSpacing: "1px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: "10px",
                  color: "white",
                  width: "180px",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.65)";
                  e.currentTarget.style.boxShadow = "0 0 14px rgba(59,130,246,0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </header>

        {/* Mode cards */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {MODES.map((mode, i) => {
            const isActive = selected === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelected(mode.id)}
                onDoubleClick={launchSelected}
                style={{
                  position: "relative",
                  textAlign: "left",
                  padding: "20px 20px 18px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  color: "white",
                  background: isActive
                    ? `linear-gradient(155deg, ${mode.accentSoft}0.20) 0%, rgba(15,22,42,0.92) 62%)`
                    : "rgba(255,255,255,0.045)",
                  border: isActive
                    ? `1px solid ${mode.accentSoft}0.75)`
                    : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: isActive ? `0 14px 34px ${mode.accentSoft}0.22)` : "none",
                  transform: isActive ? "translateY(-3px)" : "none",
                  transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s, background 0.18s",
                  animation: `menuRise 0.45s ease ${0.05 * i}s both`,
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = `${mode.accentSoft}0.45)`;
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "22px",
                      width: "40px",
                      height: "40px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "12px",
                      color: mode.accent,
                      background: `${mode.accentSoft}0.14)`,
                      border: `1px solid ${mode.accentSoft}0.35)`,
                    }}
                  >
                    {mode.glyph}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: "9px",
                        letterSpacing: "1.5px",
                        color: mode.accent,
                        animation: "menuGlow 2s ease-in-out infinite",
                      }}
                    >
                      ● SELECTED
                    </span>
                  )}
                </div>

                <h2
                  style={{
                    fontSize: "16px",
                    letterSpacing: "1.5px",
                    margin: "14px 0 6px",
                    color: isActive ? "white" : "#dbe4f0",
                  }}
                >
                  {mode.title}
                </h2>
                <p style={{ fontSize: "11.5px", lineHeight: 1.5, color: "#93a1b8", margin: "0 0 12px" }}>
                  {mode.tagline}
                </p>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px" }}>
                  {mode.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontSize: "11px",
                        color: "#8494ad",
                        padding: "2px 0",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <span style={{ color: mode.accent }}>›</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <span
                  style={{
                    fontSize: "9.5px",
                    letterSpacing: "1.5px",
                    padding: "4px 9px",
                    borderRadius: "999px",
                    color: mode.accent,
                    background: `${mode.accentSoft}0.12)`,
                    border: `1px solid ${mode.accentSoft}0.3)`,
                  }}
                >
                  {mode.players}
                </span>
              </button>
            );
          })}
        </section>

        {/* Launch panel */}
        <section
          style={{
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(10,16,32,0.66)",
            backdropFilter: "blur(8px)",
            padding: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            alignItems: "flex-end",
            justifyContent: "space-between",
            animation: "menuRise 0.5s ease 0.15s both",
          }}
        >
          <div style={{ minWidth: "240px" }}>
            <p style={{ margin: 0, fontSize: "10px", letterSpacing: "2px", color: "#6b7280" }}>
              SIAP DIMAINKAN
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "18px",
                letterSpacing: "1.5px",
                color: activeMode.accent,
              }}
            >
              {activeMode.title}
            </p>

            {(selected === "match" || selected === "offline5v5") && (
              <div style={{ marginTop: "16px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "10px", letterSpacing: "1.5px", color: "#6b7280" }}>
                  PILIH MAP
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  {MAPS.map((m) => {
                    const active = currentMap === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setCurrentMap(m.id)}
                        title={m.description}
                        style={{
                          padding: "8px 14px",
                          fontSize: "11.5px",
                          fontFamily: "monospace",
                          letterSpacing: "1px",
                          borderRadius: "9px",
                          cursor: "pointer",
                          color: active ? "#c4b5fd" : "#9aa7bd",
                          background: active ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.05)",
                          border: active
                            ? "1px solid rgba(139,92,246,0.7)"
                            : "1px solid rgba(255,255,255,0.12)",
                          transition: "all 0.15s",
                        }}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {selected === "match" && (
              <button
                onClick={() => setShowBrowser(true)}
                style={{
                  padding: "15px 22px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  letterSpacing: "1.5px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  color: "#c4b5fd",
                  background: "rgba(139,92,246,0.14)",
                  border: "1px solid rgba(139,92,246,0.45)",
                  transition: "all 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.26)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                }}
              >
                SERVER BROWSER
              </button>
            )}

            <button
              onClick={launchSelected}
              style={{
                padding: "15px 34px",
                fontSize: "15px",
                fontFamily: "monospace",
                fontWeight: "bold",
                letterSpacing: "2px",
                borderRadius: "12px",
                cursor: "pointer",
                color: "white",
                border: "none",
                background: `linear-gradient(135deg, ${activeMode.accent} 0%, ${activeMode.accentSoft}0.7) 100%)`,
                boxShadow: `0 12px 30px ${activeMode.accentSoft}0.35)`,
                transition: "transform 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 16px 38px ${activeMode.accentSoft}0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = `0 12px 30px ${activeMode.accentSoft}0.35)`;
              }}
            >
              {activeMode.action}
            </button>
          </div>
        </section>

        {/* Controls footer */}
        <footer
          style={{
            marginTop: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 18px",
            fontSize: "10.5px",
            letterSpacing: "0.5px",
            color: "#5f6b82",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "14px",
          }}
        >
          <span>WASD Gerak</span>
          <span>Mouse Arah</span>
          <span>LMB Tembak</span>
          <span>R Reload</span>
          <span>Shift Sprint</span>
          <span>Ctrl Jongkok</span>
          <span>Space Lompat</span>
          <span>B Buy Menu</span>
          <span>G Granat</span>
          <span>X Ganti Granat</span>
        </footer>
      </div>

      {showBrowser && (
        <ServerBrowser
          onClose={() => setShowBrowser(false)}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={() => setShowMatchLobby(true)}
        />
      )}

      {showMatchLobby && (
        <MatchLobbySetup
          onStart={handleStart5v5}
          onBack={() => setShowMatchLobby(false)}
        />
      )}
    </div>
  );
}
