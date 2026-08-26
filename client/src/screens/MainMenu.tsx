import { CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "../stores/useGameStore";

// Mode Assets
import trainingThumb from "../assets/modes/training_thumb.jpg";
import offline5v5Thumb from "../assets/modes/offline5v5_thumb.jpg";
import zombieThumb from "../assets/modes/zombie_thumb.jpg";
import l4dThumb from "../assets/modes/l4d_thumb.jpg";

import zombieCharArt from "../assets/modes/zombie_char_art.jpg";
import ctCharArt from "../assets/modes/ct_char_art.jpg";
import trainingCharArt from "../assets/modes/training_char_art.jpg";
import survivorCharArt from "../assets/modes/survivor_char_art.jpg";

type ModeId = "training" | "offline5v5" | "zombie" | "l4d";

interface ModeHighlight {
  icon: "biohazard" | "med" | "target" | "ammo" | "shield";
  text: string;
}

interface ModeControl {
  key: string;
  label: string;
}

interface ModeCard {
  id: ModeId;
  title: string;
  tagline: string;
  badge: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  image: string;
  charArt: string;
  iconType: "target" | "crosshair" | "biohazard" | "skull";
  features: string[];
  highlights: ModeHighlight[];
  controls: ModeControl[];
  action: string;
}

const MODES: ModeCard[] = [
  {
    id: "training",
    title: "TRAINING RANGE",
    tagline: "Latihan aim dan recoil tanpa lawan.",
    badge: "SOLO · OFFLINE",
    accent: "#22c55e",
    accentSoft: "rgba(34, 197, 94,",
    accentGlow: "rgba(34, 197, 94, 0.4)",
    image: trainingThumb,
    charArt: trainingCharArt,
    iconType: "target",
    features: ["Dummy, recoil wall, dan marker jarak", "Tidak butuh server"],
    highlights: [
      { icon: "target", text: "Dummy presisi & recoil spray wall" },
      { icon: "ammo", text: "Semua senjata CS bebas dicoba" },
    ],
    controls: [
      { key: "WASD", label: "gerak" },
      { key: "LMB", label: "Tembak" },
      { key: "R", label: "reload" },
      { key: "1–3", label: "ganti senjata" },
    ],
    action: "▶ MULAI LATIHAN AIM [DEPLOY]",
  },
  {
    id: "offline5v5",
    title: "5V5 OFFLINE",
    tagline: "Bomb defusal lokal lawan 9 bot.",
    badge: "SOLO · OFFLINE",
    accent: "#f59e0b",
    accentSoft: "rgba(245, 158, 11,",
    accentGlow: "rgba(245, 158, 11, 0.4)",
    image: offline5v5Thumb,
    charArt: ctCharArt,
    iconType: "crosshair",
    features: ["Ekonomi, buy menu, plant / defuse", "Map: Container Yard"],
    highlights: [
      { icon: "shield", text: "Ekonomi ronde CS & Buy Menu (B)" },
      { icon: "target", text: "Bomb defusal & 9 bot AI taktis" },
    ],
    controls: [
      { key: "WASD", label: "gerak" },
      { key: "LMB", label: "Tembak" },
      { key: "B", label: "buy menu" },
      { key: "E", label: "plant / defuse" },
    ],
    action: "▶ MULAI MATCH 5V5 [DEPLOY]",
  },
  {
    id: "zombie",
    title: "ZOMBIE SURVIVAL",
    tagline: "Arena twin-stick horde — gaya Alien Shooter.",
    badge: "SOLO · OFFLINE",
    accent: "#ef4444",
    accentSoft: "rgba(239, 68, 68,",
    accentGlow: "rgba(239, 68, 68, 0.45)",
    image: zombieThumb,
    charArt: zombieCharArt,
    iconType: "biohazard",
    features: ["Kamera isometric, mouse aim", "Courtyard kiting, bunker sudut, shop antar wave"],
    highlights: [
      { icon: "biohazard", text: "Horde masuk dari 4 gerbang, kiting di lapangan" },
      { icon: "ammo", text: "Pickup senjata, HP, ammo + shop antar wave" },
    ],
    controls: [
      { key: "WASD", label: "gerak" },
      { key: "Mouse", label: "aim" },
      { key: "LMB", label: "tembak" },
      { key: "B", label: "shop" },
    ],
    action: "▶ SURVIVAL OUTPOST Z-7 [DEPLOY]",
  },
  {
    id: "l4d",
    title: "LEFT 4 DEAD – CAMPAIGN",
    tagline: "First-person campaign 4 survivor, Director AI, rescue.",
    badge: "SOLO + 3 BOT · OFFLINE",
    accent: "#10b981",
    accentSoft: "rgba(16, 185, 129,",
    accentGlow: "rgba(16, 185, 129, 0.4)",
    image: l4dThumb,
    charArt: survivorCharArt,
    iconType: "skull",
    features: [
      "FPS: Safe Room → Traverse → Finale Rescue",
      "Special: Hunter pin, Smoker grab, Boomer bile, Tank, Witch",
      "Director horde, crescendo, 3 bot teammate",
    ],
    highlights: [
      { icon: "target", text: "First-person, 4 chapter linear campaign" },
      { icon: "biohazard", text: "Hunter / Smoker / Boomer / Tank / Witch" },
      { icon: "shield", text: "Bot revive & rescue vehicle finale" },
    ],
    controls: [
      { key: "WASD", label: "gerak" },
      { key: "LMB", label: "tembak" },
      { key: "RMB", label: "ADS" },
      { key: "F", label: "revive" },
    ],
    action: "▶ MULAI KAMPANYE L4D [DEPLOY]",
  },
];

const KEYFRAMES = `
@keyframes pulseActiveBorder {
  0%, 100% {
    box-shadow: 0 0 16px var(--glow-color), inset 0 0 10px var(--glow-color-subtle);
  }
  50% {
    box-shadow: 0 0 24px var(--glow-color-bright), inset 0 0 14px var(--glow-color-subtle);
  }
}
@keyframes pulseBtnGlow {
  0%, 100% {
    box-shadow: 0 0 18px var(--glow-color), 0 4px 12px rgba(0,0,0,0.6);
  }
  50% {
    box-shadow: 0 0 28px var(--glow-color-bright), 0 6px 16px rgba(0,0,0,0.8);
  }
}
@keyframes crosshairSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes scanlines {
  0% { background-position: 0 0; }
  100% { background-position: 0 100%; }
}
`;

export function MainMenu() {
  const { setMode, nickname, setNickname, setCurrentMap } = useGameStore();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<ModeId>("zombie");

  const activeMode = MODES.find((m) => m.id === selected) ?? MODES[2];

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
    if (selected === "l4d") {
      setMode("l4d");
      setLocation("/l4d");
      return;
    }
  };

  return (
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>

      {/* Ambient background volumetric glow */}
      <div
        style={{
          ...styles.ambientGlow,
          top: "-15vw",
          left: "-10vw",
          background: "#0284c7",
          opacity: 0.12,
        }}
      />
      <div
        style={{
          ...styles.ambientGlow,
          bottom: "-18vw",
          right: "-8vw",
          background: activeMode.accent,
          opacity: 0.14,
          transition: "background 0.5s ease",
        }}
      />

      {/* Cyber tactical grid background */}
      <div style={styles.gridOverlay} />

      {/* Bottom metallic floor grating / neon bar lighting */}
      <div style={styles.floorContainer}>
        <div
          style={{
            ...styles.floorLightBeam,
            background: `linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.2) 20%, rgba(56,189,248,0.85) 50%, rgba(56,189,248,0.2) 80%, transparent 100%)`,
          }}
        />
        <div style={styles.floorGrill} />
      </div>

      {/* Main container */}
      <div style={styles.container}>
        {/* Top Header */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            {/* Custom Crosshair SVG Icon matching the reference */}
            <div style={styles.logoIconWrap}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={styles.crosshairSvg}>
                <circle
                  cx="17"
                  cy="17"
                  r="13.5"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />
                <circle cx="17" cy="17" r="7" stroke="#38bdf8" strokeWidth="1.4" opacity="0.75" />
                <line x1="17" y1="1" x2="17" y2="7" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <line x1="17" y1="27" x2="17" y2="33" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="17" x2="7" y2="17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="17" x2="33" y2="17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <circle cx="17" cy="17" r="2" fill="#38bdf8" />
              </svg>
            </div>
            <h1 style={styles.title}>CS WEB FPS</h1>
          </div>

          {/* Nickname input & Settings button top right */}
          <div style={styles.headerRight}>
            <div style={styles.nickGroup}>
              <span style={styles.nickLabel}>NICKNAME</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={16}
                placeholder="Player"
                style={styles.nickInput}
              />
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openSettings'))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#38bdf8',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.08em',
                fontFamily: "'Rajdhani', monospace",
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.15)';
              }}
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              <span>PENGATURAN</span>
            </button>
          </div>
        </header>

        {/* Dashboard 2-Column Content */}
        <div style={styles.mainLayout}>
          {/* Left Column: Pilih Mode (2x2 Grid) */}
          <section style={styles.leftCol}>
            <h2 style={styles.colTitle}>Pilih Mode</h2>
            <div style={styles.cardGrid}>
              {MODES.map((mode) => {
                const isActive = selected === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => setSelected(mode.id)}
                    onDoubleClick={launchSelected}
                    style={{
                      ...styles.modeCard,
                      borderColor: isActive ? mode.accent : "rgba(255, 255, 255, 0.08)",
                      boxShadow: isActive
                        ? `0 0 20px ${mode.accentGlow}, inset 0 0 14px ${mode.accentSoft}0.12)`
                        : "0 4px 16px rgba(0, 0, 0, 0.4)",
                      "--glow-color": mode.accentGlow,
                      "--glow-color-bright": `${mode.accentSoft}0.65)`,
                      "--glow-color-subtle": `${mode.accentSoft}0.12)`,
                      animation: isActive ? "pulseActiveBorder 3s infinite ease-in-out" : "none",
                    } as CSSProperties}
                  >
                    {/* Top Row: Icon Badge + Solo Badge */}
                    <div style={styles.cardTopRow}>
                      <div
                        style={{
                          ...styles.cardIconBox,
                          borderColor: `${mode.accentSoft}0.65)`,
                          backgroundColor: `${mode.accentSoft}0.15)`,
                          color: mode.accent,
                        }}
                      >
                        {mode.iconType === "target" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" fill="currentColor" />
                          </svg>
                        )}
                        {mode.iconType === "crosshair" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="12" cy="12" r="9" />
                            <line x1="12" y1="2" x2="12" y2="7" />
                            <line x1="12" y1="17" x2="12" y2="22" />
                            <line x1="2" y1="12" x2="7" y2="12" />
                            <line x1="17" y1="12" x2="22" y2="12" />
                          </svg>
                        )}
                        {mode.iconType === "biohazard" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a4 4 0 00-3.46 2H5.08a2 2 0 00-1.73 1l-2 3.46a2 2 0 000 2l2 3.46a2 2 0 001.73 1h3.46A4 4 0 0012 16a4 4 0 003.46-1.08h3.46a2 2 0 001.73-1l2-3.46a2 2 0 000-2l-2-3.46a2 2 0 00-1.73-1h-3.46A4 4 0 0012 2zm0 2a2 2 0 110 4 2 2 0 010-4zm0 8a2 2 0 110 4 2 2 0 010-4z" />
                          </svg>
                        )}
                        {mode.iconType === "skull" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2a8 8 0 00-8 8c0 2.5 1.1 4.7 2.8 6.2.2.2.4.5.4.8v2a2 2 0 002 2h5.6a2 2 0 002-2v-2c0-.3.2-.6.4-.8C18.9 14.7 20 12.5 20 10a8 8 0 00-8-8zm-3 8a2 2 0 110-4 2 2 0 010 4zm6 0a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        )}
                      </div>

                      <div style={styles.cardPillBadge}>{mode.badge}</div>
                    </div>

                    {/* Mode Card Thumbnail Art */}
                    <div style={styles.cardThumbWrap}>
                      <img src={mode.image} alt={mode.title} style={styles.cardThumbImg} />
                      <div style={styles.cardThumbGradient} />
                    </div>

                    {/* Mode Title & Description */}
                    <div style={styles.cardTextContent}>
                      <h3 style={styles.cardTitle}>{mode.title}</h3>
                      <p style={styles.cardTagline}>{mode.tagline}</p>

                      {/* Bullet features */}
                      <div style={styles.cardBullets}>
                        {mode.features.map((feat, fIdx) => (
                          <div key={fIdx} style={styles.cardBulletItem}>
                            <span style={styles.bulletArrow}>›</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column: Siap Dimainkan (Mode Preview & Launch Panel) */}
          <aside style={styles.rightCol}>
            <h2 style={styles.colTitle}>Siap Dimainkan</h2>
            <div
              style={{
                ...styles.previewPanel,
                borderColor: activeMode.accent,
                boxShadow: `0 0 24px ${activeMode.accentGlow}, inset 0 0 18px ${activeMode.accentSoft}0.1)`,
                "--glow-color": activeMode.accentGlow,
                "--glow-color-bright": `${activeMode.accentSoft}0.65)`,
                "--glow-color-subtle": `${activeMode.accentSoft}0.12)`,
                animation: "pulseActiveBorder 3s infinite ease-in-out",
              } as CSSProperties}
            >
              {/* Background Character Art on the right side */}
              <div style={styles.charArtWrap}>
                <img
                  src={activeMode.charArt}
                  alt={activeMode.title}
                  style={styles.charArtImg}
                />
                <div style={styles.charArtOverlayGradient} />
              </div>

              {/* Panel Details & Left Info */}
              <div style={styles.previewContent}>
                <div style={styles.previewHeader}>
                  <h3 style={{ ...styles.previewTitle, color: activeMode.accent }}>
                    {activeMode.title}
                  </h3>
                  <p style={styles.previewTagline}>{activeMode.tagline}</p>
                </div>

                {/* Highlights List with custom icons */}
                <div style={styles.highlightList}>
                  {activeMode.highlights.map((item, idx) => (
                    <div key={idx} style={styles.highlightItem}>
                      <span style={{ ...styles.highlightIcon, color: activeMode.accent }}>
                        {item.icon === "biohazard" && "☣"}
                        {item.icon === "med" && "✚"}
                        {item.icon === "target" && "◎"}
                        {item.icon === "ammo" && "⚡"}
                        {item.icon === "shield" && "🛡"}
                      </span>
                      <span style={styles.highlightText}>{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Controls section */}
                <div style={styles.controlsSection}>
                  <div style={styles.controlsLabel}>Kontrol</div>
                  <div style={styles.controlsChipsRow}>
                    {activeMode.controls.map((ctrl, cIdx) => (
                      <div key={cIdx} style={styles.controlChip}>
                        <span style={styles.chipKey}>{ctrl.key}</span>
                        <span style={styles.chipLabel}>{ctrl.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Launch Button */}
                <div style={styles.launchBtnWrap}>
                  <button
                    onClick={launchSelected}
                    style={{
                      ...styles.launchBtn,
                      background: `linear-gradient(90deg, ${activeMode.accent} 0%, ${activeMode.accentSoft}0.85) 100%)`,
                      borderColor: "rgba(255, 255, 255, 0.25)",
                      "--glow-color": activeMode.accentGlow,
                      "--glow-color-bright": `${activeMode.accentSoft}0.7)`,
                      animation: "pulseBtnGlow 2.5s infinite ease-in-out",
                    } as CSSProperties}
                  >
                    <span>{activeMode.action}</span>
                    <span style={styles.launchBtnIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.9" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Bar: Keybinds Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerKeyHints}>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>WASD</span>
              <span style={styles.footerKeyText}>Gerak</span>
            </div>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>MOUSE</span>
              <span style={styles.footerKeyText}>Arah</span>
            </div>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>LMB</span>
              <span style={styles.footerKeyText}>Tembak</span>
            </div>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>R</span>
              <span style={styles.footerKeyText}>Reload</span>
            </div>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>B</span>
              <span style={styles.footerKeyText}>Buy</span>
            </div>
            <div style={styles.footerHintItem}>
              <span style={styles.footerKeyBox}>ESC</span>
              <span style={styles.footerKeyText}>Menu</span>
            </div>
          </div>

          <div style={styles.footerBuildInfo}>
            CS WEB FPS // OFFLINE READY // V2.6.4
          </div>
        </footer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    background: "#060a12",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#e2e8f0",
    position: "relative",
    boxSizing: "border-box",
  },
  ambientGlow: {
    position: "fixed",
    width: "55vw",
    height: "55vw",
    borderRadius: "50%",
    filter: "blur(110px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  gridOverlay: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(56,189,248,0.035) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(56,189,248,0.035) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    maskImage: "radial-gradient(ellipse 95% 85% at 50% 30%, #000 40%, transparent 100%)",
    WebkitMaskImage: "radial-gradient(ellipse 95% 85% at 50% 30%, #000 40%, transparent 100%)",
    zIndex: 1,
  },

  floorContainer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55px",
    pointerEvents: "none",
    zIndex: 1,
  },
  floorLightBeam: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    boxShadow: "0 0 16px rgba(56, 189, 248, 0.7), 0 0 30px rgba(56, 189, 248, 0.3)",
  },
  floorGrill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "53px",
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(56,189,248,0.04) 0px, rgba(56,189,248,0.04) 2px, transparent 2px, transparent 18px)",
    maskImage: "linear-gradient(to top, #000 20%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to top, #000 20%, transparent 100%)",
  },
  container: {
    position: "relative",
    zIndex: 2,
    maxWidth: "1140px",
    margin: "0 auto",
    padding: "20px 24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "4px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    filter: "drop-shadow(0 0 8px rgba(56, 189, 248, 0.65))",
  },
  crosshairSvg: {
    display: "block",
  },
  title: {
    fontSize: "21px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    margin: 0,
    fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
    color: "#ffffff",
    textShadow: "0 0 12px rgba(56, 189, 248, 0.4)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
  },
  nickGroup: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4px",
  },
  nickLabel: {
    fontSize: "10px",
    letterSpacing: "0.18em",
    fontWeight: 700,
    color: "#718096",
    fontFamily: "'Rajdhani', sans-serif",
  },
  nickInput: {
    background: "#0c1322",
    border: "1px solid #1e293b",
    borderRadius: "4px",
    color: "#ffffff",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600,
    fontSize: "13px",
    padding: "6px 12px",
    width: "140px",
    outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.42fr) minmax(320px, 0.98fr)",
    gap: "20px",
    alignItems: "stretch",
    flex: 1,
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  colTitle: {
    fontSize: "17px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#ffffff",
    margin: 0,
    fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    flex: 1,
  },
  modeCard: {
    borderRadius: "8px",
    border: "1px solid",
    backgroundColor: "#0a0f1c",
    backgroundImage: "linear-gradient(170deg, #0d1526 0%, #070c18 100%)",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "all 0.22s ease-in-out",
    userSelect: "none",
    position: "relative",
    overflow: "hidden",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconBox: {
    width: "28px",
    height: "28px",
    display: "grid",
    placeItems: "center",
    borderRadius: "5px",
    border: "1px solid",
  },
  cardPillBadge: {
    fontSize: "9.5px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#cbd5e1",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "rgba(10, 16, 28, 0.65)",
    padding: "2px 8px",
    borderRadius: "10px",
    fontFamily: "'Rajdhani', sans-serif",
  },
  cardThumbWrap: {
    width: "100%",
    height: "82px",
    borderRadius: "5px",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#050811",
  },
  cardThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  cardThumbGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(7,12,24,0.75) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  cardTextContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  cardTitle: {
    fontSize: "13.5px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    margin: 0,
    color: "#ffffff",
    fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
  },
  cardTagline: {
    fontSize: "11px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.35,
  },
  cardBullets: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginTop: "4px",
  },
  cardBulletItem: {
    fontSize: "10.5px",
    color: "#718096",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    lineHeight: 1.3,
  },
  bulletArrow: {
    color: "#64748b",
    fontWeight: 700,
    fontSize: "12px",
  },
  previewPanel: {
    flex: 1,
    borderRadius: "10px",
    border: "1.5px solid",
    backgroundColor: "rgba(9, 14, 26, 0.94)",
    backgroundImage: "linear-gradient(165deg, rgba(13, 21, 38, 0.96) 0%, rgba(7, 11, 20, 0.98) 100%)",
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    minHeight: "380px",
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  charArtWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: "60px",
    width: "60%",
    pointerEvents: "none",
    zIndex: 1,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  charArtImg: {
    height: "100%",
    width: "auto",
    maxWidth: "100%",
    objectFit: "contain",
    objectPosition: "right center",
    opacity: 0.9,
    filter: "contrast(1.05) drop-shadow(0 0 20px rgba(0,0,0,0.8))",
  },
  charArtOverlayGradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to right, rgba(9, 14, 26, 1) 0%, rgba(9, 14, 26, 0.6) 35%, transparent 75%)," +
      "linear-gradient(to top, rgba(9, 14, 26, 0.9) 0%, transparent 40%)",
    pointerEvents: "none",
  },
  previewContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    height: "100%",
  },
  previewHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  previewTitle: {
    fontSize: "19px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    margin: 0,
    fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
    textShadow: "0 0 10px rgba(0,0,0,0.5)",
  },
  previewTagline: {
    fontSize: "12px",
    color: "#cbd5e1",
    margin: 0,
  },
  highlightList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  highlightItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#e2e8f0",
    fontWeight: 500,
  },
  highlightIcon: {
    fontSize: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
  },
  highlightText: {
    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
  },
  mapSelectContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "2px",
  },
  mapBtnRow: {
    display: "flex",
    gap: "6px",
  },
  mapSelectBtn: {
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    fontFamily: "'Rajdhani', sans-serif",
    cursor: "pointer",
    border: "1px solid",
    transition: "all 0.2s ease",
  },
  controlsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "2px",
  },
  controlsLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#718096",
    fontFamily: "'Rajdhani', sans-serif",
    textTransform: "uppercase",
  },
  controlsChipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  controlChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(10, 16, 30, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(4px)",
  },
  chipKey: {
    color: "#38bdf8",
    fontWeight: 700,
    fontSize: "10.5px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  chipLabel: {
    color: "#cbd5e1",
    fontSize: "11px",
    fontWeight: 500,
  },
  launchBtnWrap: {
    marginTop: "auto",
    paddingTop: "16px",
  },
  launchBtn: {
    width: "100%",
    padding: "13px 20px",
    borderRadius: "6px",
    border: "1px solid",
    color: "#ffffff",
    fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "0.16em",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s ease",
    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
    boxSizing: "border-box",
  },
  launchBtnIcon: {
    display: "inline-flex",
    alignItems: "center",
    opacity: 0.9,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: "4px",
    flexWrap: "wrap",
    gap: "12px",
  },
  footerKeyHints: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  footerHintItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  footerKeyBox: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#38bdf8",
    backgroundColor: "#0a1324",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    padding: "2px 6px",
    borderRadius: "3px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  footerKeyText: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 500,
  },
  footerBuildInfo: {
    fontSize: "10px",
    color: "#475569",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.08em",
  },
};
