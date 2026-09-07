import { useState, useCallback } from "react";
import { useZombieStore, type StagePerkOption } from "../../stores/useZombieStore";
import { Sound } from "../../components/AudioManager";

const PERK_OPTIONS: StagePerkOption[] = [
  {
    id: "hollow_point",
    name: "Peluru Hollow-Point",
    desc: "+35% Damage Peluru untuk semua senjata.",
    icon: "💥",
    rarity: "epic",
  },
  {
    id: "titan_armor",
    name: "Nanoshield Titan",
    desc: "+60 Armor dan memulihkan HP hingga penuh seketika.",
    icon: "🛡️",
    rarity: "legendary",
  },
  {
    id: "rapid_stim",
    name: "Stimulant Adrenalin",
    desc: "+20% Kecepatan Gerak & Reload senjata instan.",
    icon: "⚡",
    rarity: "rare",
  },
  {
    id: "reserve_cache",
    name: "Peti Amunisi Militer",
    desc: "Maksimum kapasitas peluru cadangan bertambah 2x lipat.",
    icon: "📦",
    rarity: "rare",
  },
];

interface SurvivorBreakModalProps {
  onAdvance: () => void;
}

export function SurvivorBreakModal({ onAdvance }: SurvivorBreakModalProps) {
  const currentStage = useZombieStore((s) => s.currentStage);
  const stageBreakTimer = useZombieStore((s) => s.stageBreakTimer);
  const stagePerks = useZombieStore((s) => s.stagePerks);
  const claimStagePerk = useZombieStore((s) => s.claimStagePerk);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pick 3 random cards for this break
  const [availablePerks] = useState(() => {
    return [...PERK_OPTIONS].sort(() => Math.random() - 0.5).slice(0, 3);
  });

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      claimStagePerk(id);
      try {
        Sound.deploy("mp5");
      } catch {}
    },
    [claimStagePerk]
  );

  const nextSectorName =
    currentStage === 1
      ? "SEKTOR 2: LAB BIO-TECH & GUDANG"
      : "SEKTOR 3: BUNKER EVAKUASI & HELIPAD";

  const nextGateName = currentStage === 1 ? "BLAST GATE 01" : "BLAST GATE 02";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, rgba(6, 12, 16, 0.88) 0%, rgba(2, 4, 8, 0.96) 100%)",
        backdropFilter: "blur(10px)",
        userSelect: "none",
        fontFamily: "'Rajdhani', monospace",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "linear-gradient(170deg, rgba(16, 26, 20, 0.95), rgba(9, 14, 12, 0.98))",
          border: "2px solid #84cc16",
          borderRadius: 20,
          boxShadow: "0 0 50px rgba(132, 204, 22, 0.3), 0 20px 60px rgba(0,0,0,0.9)",
          padding: "clamp(18px, 3vw, 28px)",
          color: "#fff",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Glowing Accents */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            height: 3,
            background: "linear-gradient(90deg, transparent, #84cc16, #a3e635, transparent)",
            boxShadow: "0 0 15px #84cc16",
          }}
        />

        {/* Stage Clear Banner */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 16px", borderRadius: 20, background: "rgba(132, 204, 22, 0.15)", border: "1px solid rgba(132, 204, 22, 0.4)", marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.15em", color: "#a3e635" }}>
            STAGE {currentStage} BERSIH • SURVIVOR BREAK
          </span>
        </div>

        {/* Big Header */}
        <h2
          style={{
            fontSize: "clamp(24px, 4.5vw, 36px)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            margin: "4px 0",
            textShadow: "0 0 20px rgba(132, 204, 22, 0.6)",
            color: "#f8fafc",
          }}
        >
          MAP BARU DIBUKA: {nextSectorName}
        </h2>

        <p style={{ color: "#94a3b8", fontSize: "clamp(12px, 1.8vw, 15px)", margin: "4px 0 18px 0" }}>
          Pintu <strong style={{ color: "#facc15" }}>{nextGateName}</strong> telah terbuka!
          Pilih pasokan taktis Anda sebelum gelombang di sektor baru dimulai.
        </p>

        {/* Circular / Bar Countdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            margin: "0 auto 20px auto",
            padding: "8px 18px",
            background: "rgba(0, 0, 0, 0.4)",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            width: "fit-content",
          }}
        >
          <span style={{ fontSize: 20 }}>⏳</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800 }}>WAKTU JEDA TERSISA</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#facc15" }}>
              {Math.ceil(stageBreakTimer)} DETIK
            </div>
          </div>
        </div>

        {/* Perk Selection Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 22,
          }}
        >
          {availablePerks.map((p) => {
            const isSelected = selectedId === p.id || stagePerks.includes(p.id);
            const borderGlow =
              p.rarity === "legendary"
                ? "#f59e0b"
                : p.rarity === "epic"
                ? "#a855f7"
                : "#38bdf8";

            return (
              <div
                key={p.id}
                onClick={() => handleSelect(p.id)}
                style={{
                  background: isSelected
                    ? "linear-gradient(145deg, rgba(132, 204, 22, 0.25), rgba(20, 35, 24, 0.95))"
                    : "linear-gradient(145deg, rgba(20, 28, 24, 0.7), rgba(12, 18, 15, 0.9))",
                  border: isSelected ? "2px solid #84cc16" : `1.5px solid ${borderGlow}55`,
                  borderRadius: 14,
                  padding: "16px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: isSelected ? "scale(1.03)" : "scale(1)",
                  boxShadow: isSelected
                    ? "0 0 25px rgba(132, 204, 22, 0.4)"
                    : `0 4px 15px rgba(0,0,0,0.5)`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{p.icon}</div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    color: borderGlow,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  ★ {p.rarity}
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.35 }}>
                  {p.desc}
                </div>

                <div style={{ marginTop: 12 }}>
                  {isSelected ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#84cc16",
                        background: "rgba(132, 204, 22, 0.2)",
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "1px solid #84cc16",
                      }}
                    >
                      ✓ AKTIF
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#cbd5e1",
                        background: "rgba(255, 255, 255, 0.08)",
                        padding: "3px 10px",
                        borderRadius: 6,
                      }}
                    >
                      KLIK PILIH
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button: Enter Next Map */}
        <button
          type="button"
          onClick={onAdvance}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: "linear-gradient(135deg, #65a30d, #84cc16)",
            border: "none",
            borderRadius: 12,
            color: "#051103",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            cursor: "pointer",
            boxShadow: "0 0 30px rgba(132, 204, 22, 0.6), 0 4px 12px rgba(0,0,0,0.6)",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.filter = "brightness(1.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          <span>⚡</span>
          <span>MASUK {nextSectorName} SEKARANG [SPASI]</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}
