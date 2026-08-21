import { useState } from "react";
import { zombieSounds } from "../../../lib/zombieSounds";
import { useSettingsStore } from "../../../stores/useSettingsStore";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_Z, hudPanel } from "../../hudTheme";

// ============================================================================
// Zombie Mode In-Game Pause & Settings Menu
// ============================================================================

interface ZombieSettingsProps {
  onClose: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export function ZombieSettings({ onClose, onRestart, onMenu }: ZombieSettingsProps) {
  const [volume, setVolume] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  const setSensitivity = useSettingsStore((s) => s.setSensitivity);

  useMenuPointerLock();

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    zombieSounds.setVolume(v / 100);
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    zombieSounds.setEnabled(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(4, 7, 12, 0.82)",
        zIndex: HUD_Z.modal,
        fontFamily: HUD_FONT,
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...hudPanel("red"),
          width: "min(460px, 100%)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: "900", letterSpacing: "1.5px" }}>
              ☣ SURVIVAL PAUSED
            </div>
            <h2 style={{ margin: "2px 0 0 0", color: "#f8fafc", fontSize: 19, fontWeight: 900, letterSpacing: 0.6 }}>
              SETTINGS & MENU
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 8,
              color: "#cbd5e1",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Mouse Sensitivity Slider */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "bold" }}>Mouse Sensitivity</span>
            <span style={{ color: "#38bdf8", fontSize: "13px", fontWeight: "bold" }}>{sensitivity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
          />
        </div>

        {/* Volume Slider */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "bold" }}>Sound Volume</span>
            <span style={{ color: "#ffd700", fontSize: "13px", fontWeight: "bold" }}>{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#ffd700", cursor: "pointer" }}
          />
        </div>

        {/* Sound Effects Toggle */}
        <div style={{ marginBottom: "22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#ccc", fontSize: "13px", fontWeight: "bold" }}>Audio Effects (SFX)</span>
          <button
            onClick={handleSoundToggle}
            style={{
              padding: "4px 14px",
              backgroundColor: soundEnabled ? "#16a34a" : "#374151",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {soundEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {/* Keybinds Reference */}
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "24px",
            fontSize: "11px",
            color: "#888",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
          }}
        >
          <div><strong style={{ color: "#fff" }}>[ESC]</strong> Pause / Settings</div>
          <div><strong style={{ color: "#fff" }}>[WASD]</strong> Move</div>
          <div><strong style={{ color: "#fff" }}>[1/2/3/Scroll]</strong> Weapons</div>
          <div><strong style={{ color: "#fff" }}>[F]</strong> Interact</div>
          <div><strong style={{ color: "#fff" }}>[Hold F]</strong> Heal / Revive</div>
          <div><strong style={{ color: "#fff" }}>[B]</strong> Shop</div>
          <div><strong style={{ color: "#fff" }}>[R]</strong> Reload</div>
          <div><strong style={{ color: "#fff" }}>[M]</strong> Radar</div>
          <div><strong style={{ color: "#fff" }}>[TAB]</strong> Score</div>
          <div><strong style={{ color: "#fff" }}>[Space]</strong> Start wave</div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "12px",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          >
            ▶ RESUME SURVIVAL
          </button>

          <button
            onClick={onRestart}
            style={{
              padding: "12px",
              backgroundColor: "rgba(234, 179, 8, 0.15)",
              border: "1px solid #eab308",
              borderRadius: "8px",
              color: "#eab308",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.15)")}
          >
            🔄 RESTART MATCH
          </button>

          <button
            onClick={onMenu}
            style={{
              padding: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              borderRadius: "8px",
              color: "#ef4444",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.15)")}
          >
            🚪 LEAVE TO MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}
