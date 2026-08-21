import { useState } from "react";
import { ZombieDifficulty } from "@cs-game/shared";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_Z, hudPanel } from "../../hudTheme";

/** The lobby offers exactly the difficulties the server knows about. */
export type DifficultyLevel = ZombieDifficulty;

interface ZombieLobbySetupProps {
  onStart: (difficulty: DifficultyLevel) => void;
  onBack: () => void;
}

const DIFFICULTIES: {
  id: DifficultyLevel;
  name: string;
  badge: string;
  color: string;
  desc: string;
  perks: string[];
}[] = [
  {
    id: "casual",
    name: "CASUAL",
    badge: "EASY",
    color: "#22c55e",
    desc: "Cocok untuk pemula yang ingin eksplorasi map dan senjata.",
    perks: ["Zombie HP -20%", "+25% Bonus Poin per kill", "5x Solo Self-Revives"],
  },
  {
    id: "normal",
    name: "NORMAL",
    badge: "STANDARD",
    color: "#f59e0b",
    desc: "Pengalaman survival Call of Duty Zombies klasik seimbang.",
    perks: ["100% Standard Stats", "3x Solo Self-Revives", "Helipad Evac di Wave 10"],
  },
  {
    id: "hardcore",
    name: "HARDCORE",
    badge: "VETERAN",
    color: "#ef4444",
    desc: "Tantangan intensif dengan gelombang zombie yang lebih agresif.",
    perks: ["Zombie Speed +20%", "Damage Zombie +30%", "1x Solo Self-Revive"],
  },
  {
    id: "nightmare",
    name: "NIGHTMARE",
    badge: "EXTREME",
    color: "#a855f7",
    desc: "Gelombang tanpa ampun untuk survivor berpengalaman tinggi.",
    perks: ["Boss lebih sering muncul", "Amunisi terbatas", "0x Free Self-Revive"],
  },
];

export function ZombieLobbySetup({ onStart, onBack }: ZombieLobbySetupProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("normal");

  // Restarting a run brings this screen back while the canvas may still hold the
  // pointer lock, which would make every button here unclickable.
  useMenuPointerLock(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(4, 7, 12, 0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: HUD_Z.modal,
        fontFamily: HUD_FONT,
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          ...hudPanel("red"),
          width: "min(820px, 100%)",
          maxHeight: "88vh",
          borderRadius: 18,
          padding: 28,
          overflowY: "auto",
        }}
      >
        {/* Header with Back Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ color: "#ef4444", fontSize: "12px", fontWeight: "900", letterSpacing: "2px" }}>
              ☣ OPERATION OUTBREAK
            </div>
            <h1 style={{ margin: "4px 0 0 0", color: "#f8fafc", fontSize: 24, fontWeight: 900, letterSpacing: 1 }}>
              OUTPOST Z-7 SURVIVAL SETUP
            </h1>
          </div>
          <button
            onClick={onBack}
            style={{
              padding: "10px 18px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              color: "#aaa",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "#aaa";
            }}
          >
            ← KEMBALI KE MENU
          </button>
        </div>

        {/* Difficulty Selection Cards */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ color: "#aaa", fontSize: "13px", fontWeight: "bold", marginBottom: "12px", textTransform: "uppercase" }}>
            PILIH TINGKAT KESULITAN
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              return (
                <div
                  key={diff.id}
                  onClick={() => setSelectedDifficulty(diff.id)}
                  style={{
                    padding: "16px",
                    backgroundColor: isSelected ? "rgba(220, 38, 38, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: isSelected ? `2px solid ${diff.color}` : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: diff.color, fontSize: "16px", fontWeight: "bold" }}>
                      {diff.name}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        backgroundColor: diff.color,
                        color: "#000",
                        fontSize: "10px",
                        fontWeight: "900",
                        borderRadius: "4px",
                      }}
                    >
                      {diff.badge}
                    </span>
                  </div>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "10px" }}>
                    {diff.desc}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {diff.perks.map((p, i) => (
                      <span key={i} style={{ color: "#ccc", fontSize: "11px" }}>
                        • {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Quick Cheatsheet */}
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "28px",
          }}
        >
          <div style={{ color: "#ffd700", fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>
            🎮 KONTROL & PANDUAN SURVIVOR
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", color: "#aaa", fontSize: "12px" }}>
            <div><strong style={{ color: "#fff" }}>[W, A, S, D]</strong> Gerak / Jalan</div>
            <div><strong style={{ color: "#fff" }}>[1, 2, 3 / Scroll]</strong> Ganti Senjata</div>
            <div><strong style={{ color: "#fff" }}>[Klik Kiri]</strong> Tembak Senjata</div>
            <div><strong style={{ color: "#fff" }}>[R]</strong> Reload Amunisi</div>
            <div><strong style={{ color: "#fff" }}>[F]</strong> Wall-buy / Ammo / Perk / PaP</div>
            <div><strong style={{ color: "#fff" }}>[Tahan F]</strong> Heal Med Station / Revive</div>
            <div><strong style={{ color: "#fff" }}>[B]</strong> Buka Armory Shop</div>
            <div><strong style={{ color: "#fff" }}>[M]</strong> Buka / Tutup Mini-Map</div>
            <div><strong style={{ color: "#fff" }}>[TAB]</strong> Papan Skor</div>
            <div><strong style={{ color: "#fff" }}>[Space]</strong> Skip buy phase / mulai wave</div>
            <div><strong style={{ color: "#fff" }}>[ESC]</strong> Pause / Settings Menu</div>
          </div>
          <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 11 }}>
            Start: 1000 pts · 20s buy time · Deagle. Beli MP5 di dinding Safe House, isi darah di Med Station (tahan F, 400 pts).
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={() => onStart(selectedDifficulty)}
            style={{
              flex: 1,
              padding: "15px",
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              border: "1px solid rgba(248, 113, 113, 0.7)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
              letterSpacing: 1.2,
              boxShadow: "0 0 25px rgba(220, 38, 38, 0.4)",
              transition: "filter 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            🔥 DEPLOY TO OUTPOST Z-7
          </button>
        </div>
      </div>
    </div>
  );
}
