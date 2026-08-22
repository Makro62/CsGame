import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "../stores/useGameStore";
import { useNetworkStore } from "../stores/useNetworkStore";
import { ServerBrowser } from "../components/ServerBrowser";
import { MAPS } from "../game/map/MapRegistry";
import { AnimatedLogo } from "../ui/components/menu/AnimatedLogo";
import { NewsTicker } from "../ui/components/menu/NewsTicker";
import { OnlineStats } from "../ui/components/menu/OnlineStats";
import { ToastContainer } from "../ui/components/menu/Toast";
import { GlassPanel } from "../ui/components/shared/GlassPanel";
import { Badge } from "../ui/components/shared/Badge";
import { HUD_MONO } from "../ui/hudTheme";
import { MatchLobbySetup, TeamChoice } from "../ui/components/match/MatchLobbySetup";

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
  variant: "success" | "warning" | "danger" | "info";
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
    variant: "success",
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
    variant: "warning",
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
    variant: "danger",
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
    variant: "info",
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
@keyframes gridOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

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
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>
      <ToastContainer />

      {/* Grid overlay */}
      <div style={styles.gridOverlay} />

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoRow}>
              <AnimatedLogo size={40} />
              <h1 style={styles.title}>CS WEB FPS</h1>
              <Badge variant="info" size="sm">v3.0</Badge>
            </div>
            <p style={styles.subtitle}>BROWSER TACTICAL SHOOTER</p>
          </div>

          <div style={styles.headerRight}>
            <OnlineStats />
            <div style={styles.nickGroup}>
              <span style={styles.nickLabel}>NICKNAME</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                style={styles.nickInput}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.65)";
                  e.currentTarget.style.boxShadow = "0 0 14px rgba(59,130,246,0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </header>

        {/* News Ticker */}
        <NewsTicker />

        {/* Mode cards */}
        <section style={styles.modeGrid}>
          {MODES.map((mode, i) => {
            const isActive = selected === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelected(mode.id)}
                onDoubleClick={launchSelected}
                style={{
                  ...styles.modeCard,
                  background: isActive
                    ? `linear-gradient(155deg, ${mode.accentSoft}0.20) 0%, rgba(15,22,42,0.92) 62%)`
                    : "rgba(255,255,255,0.045)",
                  border: isActive
                    ? `1px solid ${mode.accentSoft}0.75)`
                    : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: isActive ? `0 14px 34px ${mode.accentSoft}0.22)` : "none",
                  transform: isActive ? "translateY(-3px)" : "none",
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
                <div style={styles.cardTop}>
                  <span
                    style={{
                      ...styles.cardIcon,
                      color: mode.accent,
                      background: `${mode.accentSoft}0.14)`,
                      border: `1px solid ${mode.accentSoft}0.35)`,
                    }}
                  >
                    {mode.glyph}
                  </span>
                  {isActive && (
                    <span style={{ ...styles.selectedBadge, color: mode.accent, animation: "menuGlow 2s ease-in-out infinite" }}>
                      ● SELECTED
                    </span>
                  )}
                </div>

                <h2 style={{ ...styles.cardTitle, color: isActive ? "white" : "#dbe4f0" }}>
                  {mode.title}
                </h2>
                <p style={styles.cardTagline}>{mode.tagline}</p>

                <ul style={styles.cardFeatures}>
                  {mode.features.map((f) => (
                    <li key={f} style={styles.cardFeature}>
                      <span style={{ color: mode.accent }}>›</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Badge variant={mode.variant} size="sm">{mode.players}</Badge>
              </button>
            );
          })}
        </section>

        {/* Launch panel */}
        <GlassPanel
          style={{
            ...styles.launchPanel,
            animation: "menuRise 0.5s ease 0.15s both",
          }}
        >
          <div style={styles.launchLeft}>
            <p style={styles.launchLabel}>SIAP DIMAINKAN</p>
            <p style={{ ...styles.launchTitle, color: activeMode.accent }}>
              {activeMode.title}
            </p>

            {(selected === "match" || selected === "offline5v5") && (
              <div style={{ marginTop: 14 }}>
                <p style={styles.launchLabel}>PILIH MAP</p>
                <div style={styles.mapRow}>
                  {MAPS.map((m) => {
                    const active = currentMap === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setCurrentMap(m.id)}
                        title={m.description}
                        style={{
                          ...styles.mapBtn,
                          color: active ? "#c4b5fd" : "#9aa7bd",
                          background: active ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.05)",
                          border: active
                            ? "1px solid rgba(139,92,246,0.7)"
                            : "1px solid rgba(255,255,255,0.12)",
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

          <div style={styles.launchRight}>
            {selected === "match" && (
              <button
                onClick={() => setShowBrowser(true)}
                style={styles.serverBrowserBtn}
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
                ...styles.launchBtn,
                background: `linear-gradient(135deg, ${activeMode.accent} 0%, ${activeMode.accentSoft}0.7) 100%)`,
                boxShadow: `0 12px 30px ${activeMode.accentSoft}0.35)`,
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
        </GlassPanel>

        {/* Controls footer */}
        <footer style={styles.footer}>
          <span style={styles.keyHint}><b style={styles.key}>WASD</b> Gerak</span>
          <span style={styles.keyHint}><b style={styles.key}>MOUSE</b> Arah</span>
          <span style={styles.keyHint}><b style={styles.key}>LMB</b> Tembak</span>
          <span style={styles.keyHint}><b style={styles.key}>R</b> Reload</span>
          <span style={styles.keyHint}><b style={styles.key}>SHIFT</b> Sprint</span>
          <span style={styles.keyHint}><b style={styles.key}>CTRL</b> Jongkok</span>
          <span style={styles.keyHint}><b style={styles.key}>SPACE</b> Lompat</span>
          <span style={styles.keyHint}><b style={styles.key}>B</b> Buy Menu</span>
          <span style={styles.keyHint}><b style={styles.key}>G</b> Granat</span>
          <span style={styles.keyHint}><b style={styles.key}>X</b> Ganti Granat</span>
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

const styles: Record<string, CSSProperties> = {
  root: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    background:
      "radial-gradient(900px 520px at 18% 8%, rgba(59,130,246,0.16), transparent 60%)," +
      "radial-gradient(760px 460px at 84% 82%, rgba(139,92,246,0.14), transparent 62%)," +
      "linear-gradient(160deg, #0b1020 0%, #111a33 48%, #0c1428 100%)",
    fontFamily: HUD_MONO,
    color: "white",
  },
  gridOverlay: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
    backgroundSize: "56px 56px",
    maskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 78%)",
    WebkitMaskImage: "radial-gradient(circle at 50% 40%, black 30%, transparent 78%)",
  },
  container: {
    position: "relative",
    maxWidth: 1080,
    margin: "0 auto",
    padding: "28px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    animation: "menuRise 0.4s ease both",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: "0.28em",
    margin: 0,
    textShadow: "0 0 24px rgba(59,130,246,0.45)",
    fontFamily: "'Chakra Petch', sans-serif",
  },
  subtitle: {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.42em",
    color: "var(--color-text-muted)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  nickGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  nickLabel: {
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "var(--color-text-muted)",
  },
  nickInput: {
    padding: "9px 14px",
    fontSize: 13,
    fontFamily: HUD_MONO,
    letterSpacing: "0.05em",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "white",
    width: 180,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  modeCard: {
    position: "relative",
    textAlign: "left",
    padding: "20px 20px 18px",
    borderRadius: 14,
    cursor: "pointer",
    fontFamily: HUD_MONO,
    color: "white",
    transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s, background 0.18s",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIcon: {
    fontSize: 20,
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
  },
  selectedBadge: {
    fontSize: 9,
    letterSpacing: "0.15em",
  },
  cardTitle: {
    fontSize: 15,
    letterSpacing: "0.12em",
    margin: "14px 0 6px",
  },
  cardTagline: {
    fontSize: 11,
    lineHeight: 1.5,
    color: "var(--color-text-muted)",
    margin: "0 0 12px",
  },
  cardFeatures: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 14px",
  },
  cardFeature: {
    fontSize: 11,
    color: "#8494ad",
    padding: "2px 0",
    display: "flex",
    gap: 8,
  },
  launchPanel: {
    borderRadius: 14,
    padding: 20,
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  launchLeft: {
    minWidth: 240,
  },
  launchLabel: {
    margin: 0,
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "var(--color-text-muted)",
  },
  launchTitle: {
    margin: "6px 0 0",
    fontSize: 18,
    letterSpacing: "0.12em",
    fontWeight: 700,
  },
  mapRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  mapBtn: {
    padding: "8px 14px",
    fontSize: 11,
    fontFamily: HUD_MONO,
    letterSpacing: "0.08em",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  launchRight: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  serverBrowserBtn: {
    padding: "14px 20px",
    fontSize: 12,
    fontFamily: HUD_MONO,
    fontWeight: 700,
    letterSpacing: "0.12em",
    borderRadius: 10,
    cursor: "pointer",
    color: "#c4b5fd",
    background: "rgba(139,92,246,0.14)",
    border: "1px solid rgba(139,92,246,0.45)",
    transition: "all 0.18s",
  },
  launchBtn: {
    padding: "14px 30px",
    fontSize: 14,
    fontFamily: HUD_MONO,
    fontWeight: 700,
    letterSpacing: "0.18em",
    borderRadius: 10,
    cursor: "pointer",
    color: "white",
    border: "none",
    transition: "transform 0.18s, box-shadow 0.18s",
  },
  footer: {
    marginTop: "auto",
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 16px",
    fontSize: 10,
    letterSpacing: "0.04em",
    color: "var(--color-text-muted)",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    paddingTop: 12,
  },
  keyHint: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  key: {
    color: "var(--color-accent-cyan)",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10,16,29,0.8)",
    padding: "2px 6px",
    fontSize: 9,
    borderRadius: 3,
  },
};
