import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { L4D_SURVIVORS, L4D_SURVIVOR_IDS, type L4DSurvivorDef, getL4DSurvivor } from "../game/l4d/l4dSurvivors";
import { MinecraftCharacter } from "../game/player/MinecraftCharacter";
import { FitCharacterCamera, PreviewTurntable } from "../game/player/CharacterPreview";

// ── Radar Chart SVG ──
function RadarChart({ survivor }: { survivor: L4DSurvivorDef }) {
  const stats = survivor.stats;
  const maxVals: Record<string, number> = { maxHp: 150, speed: 7, armor: 20, damage: 40, accuracy: 100 };
  const labels = ["HP", "SPD", "ARM", "DMG", "ACC"];
  const values = [stats.maxHp, stats.speed, stats.armor, stats.damage, stats.accuracy];
  const maxKeys = ["maxHp", "speed", "armor", "damage", "accuracy"];
  const normalized = values.map((v, i) => (v / maxVals[maxKeys[i]]) * 80);

  const cx = 100, cy = 100, r = 80;
  const angleStep = (Math.PI * 2) / 5;

  const gridLevels = [1, 2, 3, 4];
  const dataPoints: string[] = [];

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    dataPoints.push(`${cx + Math.cos(angle) * normalized[i]},${cy + Math.sin(angle) * normalized[i]}`);
  }

  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
      {gridLevels.map((level) => {
        const lr = (r / 4) * level;
        const pts = Array.from({ length: 5 }, (_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return `${cx + Math.cos(angle) * lr},${cy + Math.sin(angle) * lr}`;
        }).join(" ");
        return <polygon key={`grid-${level}`} points={pts} fill="none" stroke="rgba(74,222,128,0.2)" strokeWidth="1" />;
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return <line key={`axis-${i}`} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="rgba(74,222,128,0.2)" strokeWidth="1" />;
      })}
      {labels.map((label, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const lx = cx + Math.cos(angle) * (r + 15);
        const ly = cy + Math.sin(angle) * (r + 15);
        return <text key={`label-${i}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="Rajdhani, sans-serif">{label}</text>;
      })}
      <polygon points={dataPoints.join(" ")} fill={`${survivor.accentColor}33`} stroke={survivor.accentColor} strokeWidth="2" />
    </svg>
  );
}

// ── Stat Bar ──
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 3, fontFamily: "'Rajdhani', monospace" }}>
        <span style={{ color: "#94a3b8" }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

// ── Survivor Card ──
function SurvivorCard({ survivor, selected, onClick }: {
  survivor: L4DSurvivorDef; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: selected
          ? `linear-gradient(135deg, ${survivor.accentColor}22, ${survivor.accentColor}11)`
          : "rgba(255,255,255,0.03)",
        border: selected ? `2px solid ${survivor.accentColor}` : "2px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "10px 12px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: "'Rajdhani', monospace",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: survivor.accentColor,
          boxShadow: `0 0 15px ${survivor.accentColor}`,
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${survivor.accentColor}, ${survivor.armorColor})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, border: `2px solid ${survivor.accentColor}44`,
        }}>
          {survivor.role === "Tank" ? "💪" : survivor.role === "Support" ? "💚" : survivor.role === "Scout" ? "🏃" : "🎲"}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.08em", color: survivor.accentColor }}>
            {survivor.name}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {survivor.role}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 8 }}>
        {survivor.description}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 6px", background: `${survivor.accentColor}22`, border: `1px solid ${survivor.accentColor}44`, borderRadius: 6, fontSize: 9, color: survivor.accentColor, fontWeight: 800 }}>
          HP {survivor.stats.maxHp}
        </span>
        <span style={{ padding: "2px 6px", background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 6, fontSize: 9, color: "#facc15", fontWeight: 800 }}>
          DMG {survivor.stats.damage}
        </span>
        <span style={{ padding: "2px 6px", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, fontSize: 9, color: "#38bdf8", fontWeight: 800 }}>
          SPD {survivor.stats.speed}
        </span>
      </div>
    </button>
  );
}

// ── Main Survivor Select Screen ──
interface L4DSurvivorSelectProps {
  onSelect: (survivorId: string) => void;
}

export function L4DSurvivorSelect({ onSelect }: L4DSurvivorSelectProps) {
  const [selectedId, setSelectedId] = useState("coach");
  const previewSurvivor = L4D_SURVIVORS[selectedId] ?? getL4DSurvivor(selectedId);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleConfirm = useCallback(() => {
    onSelect(selectedId);
  }, [onSelect, selectedId]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      height: "100dvh", width: "100dvw",
      background: "#050510",
      display: "flex", flexDirection: "column",
      fontFamily: "'Rajdhani', monospace",
      overflow: "hidden",
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: "linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(circle at 30% 40%, rgba(74,222,128,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(34,197,94,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", padding: "clamp(10px, 1.6vh, 22px) 16px clamp(6px, 1vh, 12px)", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 900, letterSpacing: 4, color: "#64748b", marginBottom: 4, textTransform: "uppercase",
        }}>
          SURVIVOR CAMPAIGN
        </div>
        <h1 style={{
          fontSize: "clamp(1.6rem, 4.2vh, 2.6rem)", fontWeight: 900,
          background: "linear-gradient(135deg, #4ade80, #22c55e)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          letterSpacing: 6, fontFamily: "'Rajdhani', monospace", margin: 0, lineHeight: 1.1,
        }}>
          PILIH SURVIVOR
        </h1>
        <div style={{ fontSize: "clamp(11px, 1.4vh, 14px)", color: "rgba(255,255,255,0.5)", letterSpacing: 3, marginTop: 4 }}>
          1 SENJATA · 3 TEMAN · BUKA WILAYAH BARU SETELAH CLEAR
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, minHeight: 0, display: "grid",
        gridTemplateColumns: "minmax(clamp(120px, 18vw, 220px), 18vw) minmax(clamp(180px, 30vw, 280px), 1fr) minmax(clamp(120px, 18vw, 220px), 18vw)",
        gap: "clamp(12px, 1.4vw, 24px)", padding: "0 clamp(12px, 2vw, 30px)",
        maxWidth: "min(1480px, 100%)", width: "100%",
        margin: "0 auto", position: "relative", zIndex: 1,
      }}>
        {/* Left: Survivor cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflowY: "auto" }}>
          {L4D_SURVIVOR_IDS.map((id) => (
            <SurvivorCard
              key={id}
              survivor={L4D_SURVIVORS[id]}
              selected={selectedId === id}
              onClick={() => handleSelect(id)}
            />
          ))}
        </div>

        {/* Center: 3D Preview */}
        <div style={{
          background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20,
          overflow: "hidden", position: "relative", display: "flex", flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{
            flex: 1, minHeight: 0, position: "relative",
            background: `radial-gradient(ellipse at center bottom, ${previewSurvivor.accentColor}22 0%, transparent 70%)`,
          }}>
            {/* Holographic floor */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 160,
              backgroundImage: `linear-gradient(90deg, ${previewSurvivor.accentColor}18 1px, transparent 1px), linear-gradient(0deg, ${previewSurvivor.accentColor}18 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              transform: "perspective(500px) rotateX(60deg)", transformOrigin: "bottom", opacity: 0.4,
            }} />

            {/* Aura rings */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="150" fill="none" stroke={previewSurvivor.accentColor} strokeWidth="1" opacity="0.1" />
              <circle cx="200" cy="200" r="120" fill="none" stroke={previewSurvivor.accentColor} strokeWidth="1" opacity="0.15" />
              <circle cx="200" cy="200" r="90" fill="none" stroke={previewSurvivor.accentColor} strokeWidth="1.5" opacity="0.2" />
            </svg>

            {/* 3D Character */}
            <div style={{ position: "absolute", inset: 0 }}>
              <Canvas
                key={previewSurvivor.id}
                camera={{ position: [0, 1.02, 4.5], fov: 32, near: 0.1, far: 40 }}
                style={{ width: "100%", height: "100%", display: "block" }}
                gl={{ antialias: true, alpha: true }}
              >
                <FitCharacterCamera />
                <ambientLight intensity={0.8} />
                <directionalLight position={[3, 5, 2]} intensity={1.2} />
                <pointLight position={[0, 2, 2]} color={previewSurvivor.accentColor} intensity={0.6} distance={6} />
                <PreviewTurntable>
                  <MinecraftCharacter
                    team="CT"
                    holdWeapon
                    heroColor={previewSurvivor.armorColor}
                    heroAccent={previewSurvivor.accentColor}
                    bodyStyle={previewSurvivor.id}
                  />
                </PreviewTurntable>
              </Canvas>
            </div>

            {/* Survivor name overlay */}
            <div style={{ position: "absolute", bottom: 12, left: 16, zIndex: 10, pointerEvents: "none" }}>
              <div style={{
                fontSize: "clamp(20px, 3vh, 32px)", fontWeight: 900, color: previewSurvivor.accentColor,
                letterSpacing: "0.1em", textShadow: `0 0 20px ${previewSurvivor.accentColor}88`,
                fontFamily: "'Rajdhani', monospace",
              }}>
                {previewSurvivor.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {previewSurvivor.role} — {previewSurvivor.ability.replace("_", " ").toUpperCase()}
              </div>
            </div>

            {/* Ability badge */}
            <div style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
              border: `1px solid ${previewSurvivor.accentColor}44`, borderRadius: 12,
              padding: "10px 16px", zIndex: 10,
            }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>SPECIAL ABILITY</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: previewSurvivor.accentColor, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{previewSurvivor.role === "Tank" ? "💪" : previewSurvivor.role === "Support" ? "💚" : previewSurvivor.role === "Scout" ? "🏃" : "🎲"}</span>
                <span>{previewSurvivor.ability.replace("_", " ").toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Cooldown: {previewSurvivor.abilityCooldown}s
              </div>
            </div>
          </div>

          {/* Bottom stats bar */}
          <div style={{
            padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex", justifyContent: "space-around", background: "rgba(0,0,0,0.3)",
          }}>
            {[
              { label: "HP", value: previewSurvivor.stats.maxHp, color: "#4ade80" },
              { label: "DMG", value: previewSurvivor.stats.damage, color: "#f87171" },
              { label: "SPD", value: previewSurvivor.stats.speed, color: "#38bdf8" },
              { label: "ARM", value: previewSurvivor.stats.armor, color: "#a78bfa" },
              { label: "ACC", value: previewSurvivor.stats.accuracy, color: "#facc15" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'Rajdhani', monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Radar + Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflowY: "auto" }}>
          <div style={{
            background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, padding: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: previewSurvivor.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              STAT RADAR
            </div>
            <div style={{ width: "min(160px, 100%)", height: "min(160px, 20vh)", margin: "0 auto" }}>
              <RadarChart survivor={previewSurvivor} />
            </div>
          </div>

          <div style={{
            background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, padding: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: previewSurvivor.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              DETAIL STATS
            </div>
            <StatBar label="HEALTH" value={previewSurvivor.stats.maxHp} max={150} color="#4ade80" />
            <StatBar label="DAMAGE" value={previewSurvivor.stats.damage} max={40} color="#f87171" />
            <StatBar label="SPEED" value={previewSurvivor.stats.speed} max={7} color="#38bdf8" />
            <StatBar label="ARMOR" value={previewSurvivor.stats.armor} max={20} color="#a78bfa" />
            <StatBar label="ACCURACY" value={previewSurvivor.stats.accuracy} max={100} color="#facc15" />
          </div>

          <div style={{
            background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, padding: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: previewSurvivor.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              LOADOUT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { slot: "SENJATA", weapon: previewSurvivor.primaryWeapon.toUpperCase(), icon: "🔫" },
              ].map((w) => (
                <div key={w.slot} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                }}>
                  <span style={{ fontSize: 16 }}>{w.icon}</span>
                  <div>
                    <div style={{ fontSize: 9, color: "#64748b", fontWeight: 800, letterSpacing: 1 }}>{w.slot}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#f1f5f9" }}>{w.weapon}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Confirm button */}
      <div style={{
        padding: "clamp(10px, 1.6vh, 20px) 20px clamp(12px, 2vh, 24px)", display: "flex", justifyContent: "center",
        position: "relative", zIndex: 1, flexShrink: 0,
      }}>
        <button
          onClick={handleConfirm}
          style={{
            padding: "16px 60px",
            background: `linear-gradient(135deg, ${previewSurvivor.accentColor}, ${previewSurvivor.accentColor}cc)`,
            border: "none", borderRadius: 12, color: "#fff",
            fontSize: 18, fontWeight: 900, letterSpacing: "0.12em",
            fontFamily: "'Rajdhani', monospace", cursor: "pointer",
            boxShadow: `0 0 30px ${previewSurvivor.accentColor}55, 0 8px 30px rgba(0,0,0,0.5)`,
            transition: "all 0.3s ease", textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 0 40px ${previewSurvivor.accentColor}77, 0 12px 40px rgba(0,0,0,0.6)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0 30px ${previewSurvivor.accentColor}55, 0 8px 30px rgba(0,0,0,0.5)`;
          }}
        >
          DEPLOY {previewSurvivor.name}
        </button>
      </div>
    </div>
  );
}
