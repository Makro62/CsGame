import { CSSProperties, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "../stores/useGameStore";
import { useNetworkStore } from "../stores/useNetworkStore";
import { ServerBrowser } from "../components/ServerBrowser";
import { MAPS } from "../game/map/MapRegistry";
import { AnimatedLogo } from "../ui/components/menu/AnimatedLogo";
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
  controls: string[];
  action: string;
  variant: "success" | "warning" | "danger" | "info";
}

const MODES: ModeCard[] = [
  {
    id: "training",
    glyph: "◎",
    title: "TRAINING RANGE",
    tagline: "Latihan aim dan recoil tanpa lawan.",
    players: "SOLO · OFFLINE",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,",
    features: ["Dummy, recoil wall, dan marker jarak", "Tidak butuh server"],
    controls: ["WASD gerak", "LMB tembak", "R reload", "1–3 ganti senjata"],
    action: "MULAI LATIHAN",
    variant: "success",
  },
  {
    id: "offline5v5",
    glyph: "◎",
    title: "5V5 OFFLINE",
    tagline: "Bomb defusal lokal lawan 9 bot.",
    players: "SOLO · OFFLINE",
    accent: "#f59e0b",
    accentSoft: "rgba(245,158,11,",
    features: ["Ekonomi, buy menu, plant / defuse", "Map: Container Yard"],
    controls: ["WASD gerak", "LMB tembak", "B buy menu", "E plant / defuse"],
    action: "MULAI OFFLINE",
    variant: "warning",
  },
  {
    id: "zombie",
    glyph: "☣",
    title: "ZOMBIE SURVIVAL",
    tagline: "Wave survival arcade di Outpost Z-7.",
    players: "1–4 PEMAIN",
    accent: "#dc2626",
    accentSoft: "rgba(220,38,38,",
    features: ["Shop senjata & Pack-a-Punch", "Med station & extraction"],
    controls: ["WASD gerak", "LMB tembak", "F interaksi", "B shop"],
    action: "MASUK OUTBREAK",
    variant: "danger",
  },
  {
    id: "match",
    glyph: "⚔",
    title: "COMPETITIVE 5V5",
    tagline: "Bomb defusal online dengan lag compensation.",
    players: "5V5 · ONLINE",
    accent: "#3b82f6",
    accentSoft: "rgba(59,130,246,",
    features: ["15 ronde plant / defuse", "Buy economy & overtime"],
    controls: ["WASD gerak", "LMB tembak", "B buy menu", "E plant / defuse"],
    action: "QUICK JOIN",
    variant: "info",
  },
];

const KEYFRAMES = `
@keyframes menuRise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes glowBreathe {
  0% { opacity: 0.12; transform: scale(1); }
  100% { opacity: 0.24; transform: scale(1.12); }
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

  const activeMode = MODES.find((m) => m.id === selected) ?? MODES[3];
  const availableMaps = selected === "offline5v5"
    ? MAPS.filter((m) => m.id === "container_yard")
    : MAPS;

  useEffect(() => {
    if (selected === "offline5v5" && currentMap !== "container_yard") {
      setCurrentMap("container_yard");
    }
  }, [selected, currentMap, setCurrentMap]);

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
      setCurrentMap("container_yard");
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
      <div style={{ ...styles.ambientGlow, top: "-18vw", left: "-12vw", background: "#1d4ed8" }} />
      <div style={{ ...styles.ambientGlow, bottom: "-22vw", right: "-12vw", background: "#7c2d12", animationDelay: "2s" }} />
      <div style={styles.gridOverlay} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <AnimatedLogo size={36} />
            <h1 style={styles.title}>CS WEB FPS</h1>
          </div>
          <div style={styles.headerRight}>
            <label style={styles.nickGroup}>
              <span style={styles.nickLabel}>NICKNAME</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                style={styles.nickInput}
              />
            </label>
          </div>
        </header>

        <div style={styles.layout}>
          <section style={styles.modesCol}>
            <h2 style={styles.sectionTitle}>Pilih Mode</h2>
            <div style={styles.modeGrid}>
              {MODES.map((mode) => {
                const isActive = selected === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelected(mode.id)}
                    onDoubleClick={launchSelected}
                    style={{
                      ...styles.modeCard,
                      background: isActive
                        ? `linear-gradient(155deg, ${mode.accentSoft}0.2) 0%, rgba(15,22,42,0.96) 70%)`
                        : "linear-gradient(180deg, #101a2e 0%, #0b1220 100%)",
                      borderColor: isActive ? `${mode.accentSoft}0.85)` : "rgba(255,255,255,0.1)",
                      boxShadow: isActive ? `0 10px 28px -8px ${mode.accentSoft}0.4)` : "none",
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
                      <Badge variant={mode.variant} size="sm">{mode.players}</Badge>
                    </div>
                    <h3 style={{ ...styles.cardTitle, color: isActive ? "#fff" : "#dbe4f0" }}>
                      {mode.title}
                    </h3>
                    <p style={styles.cardTagline}>{mode.tagline}</p>
                    <ul style={styles.cardFeatures}>
                      {mode.features.map((feature) => (
                        <li key={feature} style={styles.cardFeature}>
                          <span style={{ color: mode.accent }}>›</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </section>

          <aside style={styles.detailCol}>
            <h2 style={styles.sectionTitle}>Siap Dimainkan</h2>
            <GlassPanel
              style={{
                ...styles.detailPanel,
                borderTop: `3px solid ${activeMode.accent}`,
              }}
            >
              <p style={{ ...styles.detailTitle, color: activeMode.accent }}>{activeMode.title}</p>
              <p style={styles.detailCopy}>{activeMode.tagline}</p>
              <ul style={styles.detailList}>
                {activeMode.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p style={styles.detailLabel}>Kontrol</p>
              <div style={styles.controlRow}>
                {activeMode.controls.map((hint) => (
                  <span key={hint} style={styles.controlChip}>{hint}</span>
                ))}
              </div>

              {(selected === "match" || selected === "offline5v5") && (
                <div>
                  <p style={styles.detailLabel}>Map</p>
                  <div style={styles.mapRow}>
                    {availableMaps.map((map) => {
                      const active = currentMap === map.id;
                      return (
                        <button
                          key={map.id}
                          onClick={() => setCurrentMap(map.id)}
                          style={{
                            ...styles.mapBtn,
                            color: active ? "#fff" : "#94a3b8",
                            background: active ? `${activeMode.accentSoft}0.22)` : "rgba(13,20,36,0.6)",
                            borderColor: active ? activeMode.accent : "rgba(255,255,255,0.12)",
                          }}
                        >
                          {map.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={styles.launchRow}>
                {selected === "match" && (
                  <button onClick={() => setShowBrowser(true)} style={styles.secondaryBtn}>
                    SERVER BROWSER
                  </button>
                )}
                <button
                  onClick={launchSelected}
                  style={{
                    ...styles.launchBtn,
                    background: `linear-gradient(135deg, ${activeMode.accent} 0%, ${activeMode.accentSoft}0.8) 100%)`,
                    boxShadow: `0 10px 24px ${activeMode.accentSoft}0.32)`,
                  }}
                >
                  {activeMode.action}
                </button>
              </div>
            </GlassPanel>
          </aside>
        </div>

        <footer style={styles.footer}>
          <div style={styles.keyHintsRow}>
            <span style={styles.keyHint}><b style={styles.key}>WASD</b> Gerak</span>
            <span style={styles.keyHint}><b style={styles.key}>MOUSE</b> Arah</span>
            <span style={styles.keyHint}><b style={styles.key}>LMB</b> Tembak</span>
            <span style={styles.keyHint}><b style={styles.key}>R</b> Reload</span>
            <span style={styles.keyHint}><b style={styles.key}>B</b> Buy</span>
            <span style={styles.keyHint}><b style={styles.key}>ESC</b> Menu</span>
          </div>
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
    background: "#070b14",
    fontFamily: HUD_MONO,
    color: "#dbe7ff",
    position: "relative",
  },
  ambientGlow: {
    position: "fixed",
    width: "55vw",
    height: "55vw",
    borderRadius: "50%",
    filter: "blur(100px)",
    opacity: 0.16,
    pointerEvents: "none",
    zIndex: 0,
    animation: "glowBreathe 9s ease-in-out infinite alternate",
  },
  gridOverlay: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    maskImage: "radial-gradient(ellipse 90% 70% at 50% 18%, #000 28%, transparent 100%)",
    WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 18%, #000 28%, transparent 100%)",
    zIndex: 1,
  },
  container: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1120,
    margin: "0 auto",
    padding: "28px 24px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 28,
    minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    animation: "menuRise 0.35s ease both",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "0.18em",
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
    color: "#fff",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  nickGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  nickLabel: {
    fontSize: 9,
    letterSpacing: "0.22em",
    color: "#7d8cab",
  },
  nickInput: {
    background: "rgba(13,20,36,0.85)",
    border: "1px solid rgba(44,64,102,0.8)",
    borderRadius: 4,
    color: "#fff",
    fontFamily: HUD_MONO,
    fontWeight: 600,
    fontSize: 13,
    padding: "8px 12px",
    width: 168,
    outline: "none",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
    gap: 20,
    alignItems: "stretch",
    flex: 1,
  },
  modesCol: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
  },
  detailCol: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#fff",
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    flex: 1,
  },
  modeCard: {
    borderRadius: 8,
    border: "1px solid",
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 168,
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
  },
  cardTagline: {
    fontSize: 12,
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.45,
  },
  cardFeatures: {
    listStyle: "none",
    padding: 0,
    margin: "auto 0 0",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardFeature: {
    fontSize: 11,
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  detailPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 20,
    background: "linear-gradient(180deg, rgba(14,23,40,0.94) 0%, rgba(11,17,32,0.96) 100%)",
    borderRadius: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.1em",
    margin: 0,
    fontFamily: "'Chakra Petch', sans-serif",
  },
  detailCopy: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 1.5,
  },
  detailList: {
    margin: 0,
    paddingLeft: 16,
    color: "#cbd5e1",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  detailLabel: {
    margin: "4px 0 0",
    fontSize: 10,
    letterSpacing: "0.18em",
    color: "#7d8cab",
  },
  controlRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  controlChip: {
    fontSize: 11,
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(13,20,36,0.7)",
    borderRadius: 4,
    padding: "5px 8px",
  },
  mapRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  mapBtn: {
    padding: "8px 12px",
    fontSize: 12,
    fontFamily: HUD_MONO,
    fontWeight: 600,
    borderRadius: 4,
    cursor: "pointer",
    border: "1px solid",
  },
  launchRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: "auto",
  },
  secondaryBtn: {
    border: "1px solid rgba(56,189,248,0.4)",
    background: "rgba(13,20,36,0.8)",
    color: "#38bdf8",
    fontFamily: "'Chakra Petch', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.12em",
    padding: "12px 16px",
    borderRadius: 6,
    cursor: "pointer",
  },
  launchBtn: {
    border: "none",
    color: "#07101f",
    fontFamily: "'Chakra Petch', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.14em",
    padding: "12px 22px",
    borderRadius: 6,
    cursor: "pointer",
    flex: 1,
    minWidth: 160,
  },
  footer: {
    paddingTop: 8,
  },
  keyHintsRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  keyHint: {
    fontSize: 11,
    color: "#7d8cab",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  key: {
    color: "#38bdf8",
    background: "#0a101d",
    border: "1px solid rgba(56,189,248,0.3)",
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 10,
  },
};
