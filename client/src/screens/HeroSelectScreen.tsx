import { useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { useHeroStore } from "../stores/useHeroStore";
import { HEROES, HERO_IDS, type HeroDefinition } from "../game/zombie/heroes";
import { MinecraftCharacter } from "../game/player/MinecraftCharacter";
import { FitCharacterCamera, PreviewTurntable } from "../game/player/CharacterPreview";

function RadarChart({ hero }: { hero: HeroDefinition }) {
  const stats = hero.stats;
  const maxVals: Record<string, number> = { maxHp: 200, speed: 10, armor: 100, damage: 50, accuracy: 100 };
  const labels = ["HP", "SPD", "ARM", "DMG", "ACC"];
  const values = [stats.maxHp, stats.speed, stats.armor, stats.damage, stats.accuracy];
  const maxKeys = ["maxHp", "speed", "armor", "damage", "accuracy"];
  const normalized = values.map((v, i) => (v / maxVals[maxKeys[i]]) * 80);

  const cx = 100;
  const cy = 100;
  const r = 80;
  const angleStep = (Math.PI * 2) / 5;
  const dataPoints: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    dataPoints.push(`${cx + Math.cos(angle) * normalized[i]},${cy + Math.sin(angle) * normalized[i]}`);
  }

  return (
    <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
      {[1, 2, 3, 4].map((level) => {
        const lr = (r / 4) * level;
        const pts = Array.from({ length: 5 }, (_, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          return `${cx + Math.cos(angle) * lr},${cy + Math.sin(angle) * lr}`;
        }).join(" ");
        return <polygon key={`grid-${level}`} points={pts} fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="1" />;
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return <line key={`axis-${i}`} x1={cx} y1={cy} x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r} stroke="rgba(0,212,255,0.2)" strokeWidth="1" />;
      })}
      {labels.map((label, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <text
            key={`label-${i}`}
            x={cx + Math.cos(angle) * (r + 15)}
            y={cy + Math.sin(angle) * (r + 15)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.6)"
            fontSize="9"
            fontFamily="Rajdhani, sans-serif"
          >
            {label}
          </text>
        );
      })}
      <polygon points={dataPoints.join(" ")} fill={`${hero.accentColor}33`} stroke={hero.accentColor} strokeWidth="2" />
    </svg>
  );
}

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

function HeroCard({ hero, selected, onClick }: { hero: HeroDefinition; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: selected
          ? `linear-gradient(135deg, ${hero.accentColor}22, ${hero.accentColor}11)`
          : "rgba(255,255,255,0.03)",
        border: selected ? `2px solid ${hero.accentColor}` : "2px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        fontFamily: "'Rajdhani', monospace",
        boxShadow: selected ? `0 0 18px ${hero.accentColor}44` : "none",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: hero.accentColor,
          boxShadow: `0 0 15px ${hero.accentColor}`,
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${hero.accentColor}, ${hero.armorColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          border: `2px solid ${hero.accentColor}44`,
        }}>
          {hero.heroClass === "assault" ? "⚔️" : "🛡️"}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.08em", color: hero.accentColor }}>
            {hero.name}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {hero.heroClass}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 8 }}>
        {hero.description}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 8px", background: `${hero.accentColor}22`, border: `1px solid ${hero.accentColor}44`, borderRadius: 6, fontSize: 10, color: hero.accentColor, fontWeight: 800 }}>
          HP {hero.stats.maxHp}
        </span>
        <span style={{ padding: "2px 8px", background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 6, fontSize: 10, color: "#facc15", fontWeight: 800 }}>
          DMG {hero.stats.damage}
        </span>
        <span style={{ padding: "2px 8px", background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 6, fontSize: 10, color: "#38bdf8", fontWeight: 800 }}>
          SPD {hero.stats.speed}
        </span>
      </div>
    </button>
  );
}

export function HeroSelectScreen({ onSelect }: { onSelect: () => void }) {
  const selectedHeroId = useHeroStore(s => s.selectedHeroId);
  const selectHero = useHeroStore(s => s.selectHero);
  const hero = useHeroStore(s => s.hero);

  const handleSelect = useCallback((id: string) => {
    selectHero(id);
  }, [selectHero]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      height: "100dvh",
      width: "100dvw",
      background: "#050510",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Rajdhani', monospace",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        backgroundSize: "50px 50px",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle at 30% 40%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,107,0,0.04) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <div style={{ textAlign: "center", padding: "clamp(10px, 1.6vh, 22px) 16px clamp(6px, 1vh, 12px)", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 4, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>
          ZOMBIE SURVIVAL
        </div>
        <h1 style={{
          fontSize: "clamp(1.6rem, 4.2vh, 2.6rem)",
          fontWeight: 900,
          background: "linear-gradient(135deg, #00d4ff, #ff6b00)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: 6,
          fontFamily: "'Rajdhani', monospace",
          margin: 0,
          lineHeight: 1.1,
        }}>
          PILIH HERO
        </h1>
        <div style={{ fontSize: "clamp(11px, 1.4vh, 14px)", color: "rgba(255,255,255,0.5)", letterSpacing: 3, marginTop: 4 }}>
          PILIH KARAKTER SEBELUM MEMULAI MISI
        </div>
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "minmax(clamp(120px, 18vw, 220px), 18vw) minmax(clamp(180px, 30vw, 280px), 1fr) minmax(clamp(120px, 18vw, 220px), 18vw)",
        gap: "clamp(12px, 1.4vw, 24px)",
        padding: "0 clamp(12px, 2vw, 30px)",
        maxWidth: "min(1480px, 100%)",
        width: "100%",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflowY: "auto" }}>
          {HERO_IDS.map((id) => (
            <HeroCard
              key={id}
              hero={HEROES[id]}
              selected={selectedHeroId === id}
              onClick={() => handleSelect(id)}
            />
          ))}
        </div>

        <div style={{
          background: "rgba(20,20,40,0.5)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            background: `radial-gradient(ellipse at center bottom, ${hero.accentColor}22 0%, transparent 70%)`,
          }}>
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 160,
              backgroundImage: `linear-gradient(90deg, ${hero.accentColor}18 1px, transparent 1px), linear-gradient(0deg, ${hero.accentColor}18 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              transform: "perspective(500px) rotateX(60deg)",
              transformOrigin: "bottom",
              opacity: 0.4,
            }} />
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="150" fill="none" stroke={hero.accentColor} strokeWidth="1" opacity="0.1" />
              <circle cx="200" cy="200" r="120" fill="none" stroke={hero.accentColor} strokeWidth="1" opacity="0.15" />
              <circle cx="200" cy="200" r="90" fill="none" stroke={hero.accentColor} strokeWidth="1.5" opacity="0.2" />
            </svg>
            <div style={{ position: "absolute", inset: 0 }}>
              <Canvas
                key={hero.id}
                camera={{ position: [0, 1.05, 5.1], fov: 34, near: 0.1, far: 40 }}
                style={{ width: "100%", height: "100%", display: "block" }}
                gl={{ antialias: true, alpha: true }}
              >
                <FitCharacterCamera />
                <ambientLight intensity={0.8} />
                <directionalLight position={[3, 5, 2]} intensity={1.2} />
                <pointLight position={[0, 2, 2]} color={hero.accentColor} intensity={0.6} distance={6} />
                <PreviewTurntable>
                  <MinecraftCharacter
                    team="CT"
                    holdWeapon
                    weaponType={hero.weaponType}
                    heroColor={hero.armorColor}
                    heroAccent={hero.accentColor}
                    bodyStyle={hero.id}
                  />
                </PreviewTurntable>
              </Canvas>
            </div>
            <div style={{
              position: "absolute",
              bottom: 12,
              left: 16,
              zIndex: 10,
              pointerEvents: "none",
            }}>
              <div style={{
                fontSize: "clamp(20px, 3vh, 32px)",
                fontWeight: 900,
                color: hero.accentColor,
                letterSpacing: "0.1em",
                textShadow: `0 0 20px ${hero.accentColor}88`,
                fontFamily: "'Rajdhani', monospace",
              }}>
                {hero.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {hero.heroClass} • {hero.ability.toUpperCase()}
              </div>
            </div>
            <div style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${hero.accentColor}44`,
              borderRadius: 12,
              padding: "10px 16px",
              zIndex: 10,
            }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>SPECIAL ABILITY</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: hero.accentColor, display: "flex", alignItems: "center", gap: 6 }}>
                <span>{hero.ability === "berserk" ? "🔥" : "🛡️"}</span>
                <span>{hero.ability === "berserk" ? "BERSERK MODE" : "ENERGY SHIELD"}</span>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                Cooldown: {hero.abilityCooldown}s
              </div>
            </div>
          </div>
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-around",
            background: "rgba(0,0,0,0.3)",
          }}>
            {[
              { label: "HP", value: hero.stats.maxHp, color: "#4ade80" },
              { label: "DMG", value: hero.stats.damage, color: "#f87171" },
              { label: "SPD", value: hero.stats.speed, color: "#38bdf8" },
              { label: "ARM", value: hero.stats.armor, color: "#a78bfa" },
              { label: "ACC", value: hero.stats.accuracy, color: "#facc15" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: "'Rajdhani', monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflowY: "auto" }}>
          <div style={{ background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: hero.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              STAT RADAR
            </div>
            <div style={{ width: "min(180px, 100%)", height: "min(180px, 22vh)", margin: "0 auto" }}>
              <RadarChart hero={hero} />
            </div>
          </div>
          <div style={{ background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: hero.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              DETAIL STATS
            </div>
            <StatBar label="HEALTH" value={hero.stats.maxHp} max={200} color="#4ade80" />
            <StatBar label="DAMAGE" value={hero.stats.damage} max={50} color="#f87171" />
            <StatBar label="SPEED" value={hero.stats.speed} max={10} color="#38bdf8" />
            <StatBar label="ARMOR" value={hero.stats.armor} max={100} color="#a78bfa" />
            <StatBar label="ACCURACY" value={hero.stats.accuracy} max={100} color="#facc15" />
          </div>
          <div style={{ background: "rgba(20,20,40,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: hero.accentColor, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>
              LOADOUT
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { slot: "PRIMARY", weapon: hero.primaryWeapon.toUpperCase(), icon: "🔫" },
                { slot: "SECONDARY", weapon: hero.secondaryWeapon.toUpperCase(), icon: "🔫" },
                { slot: "MELEE", weapon: hero.knifeWeapon.toUpperCase(), icon: "🗡️" },
              ].map((w) => (
                <div key={w.slot} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
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

      <div style={{ padding: "clamp(10px, 1.6vh, 20px) 20px clamp(12px, 2vh, 24px)", display: "flex", justifyContent: "center", position: "relative", zIndex: 1, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onSelect}
          style={{
            padding: "16px 60px",
            background: `linear-gradient(135deg, ${hero.accentColor}, ${hero.accentColor}cc)`,
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.12em",
            fontFamily: "'Rajdhani', monospace",
            cursor: "pointer",
            boxShadow: `0 0 30px ${hero.accentColor}55, 0 8px 30px rgba(0,0,0,0.5)`,
            textTransform: "uppercase",
          }}
        >
          DEPLOY {hero.name}
        </button>
      </div>
    </div>
  );
}
