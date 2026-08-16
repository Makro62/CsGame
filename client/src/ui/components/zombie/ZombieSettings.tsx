import { useState } from "react";
import { zombieSounds } from "../../../lib/zombieSounds";

// ============================================================================
// Zombie Mode Settings
// ============================================================================

interface ZombieSettingsProps {
  onClose: () => void;
}

export function ZombieSettings({ onClose }: ZombieSettingsProps) {
  const [volume, setVolume] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "350px",
          backgroundColor: "#1a1a2e",
          border: "2px solid #666",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "20px", fontWeight: "bold" }}>
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Sound Toggle */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <div
              onClick={handleSoundToggle}
              style={{
                width: "48px",
                height: "24px",
                borderRadius: "12px",
                backgroundColor: soundEnabled ? "#22c55e" : "#333",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  position: "absolute",
                  top: "2px",
                  left: soundEnabled ? "26px" : "2px",
                  transition: "left 0.2s",
                }}
              />
            </div>
            <span style={{ color: "#fff", fontSize: "14px" }}>Sound Effects</span>
          </label>
        </div>

        {/* Volume Slider */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", color: "#999", fontSize: "12px", marginBottom: "8px" }}>
            Volume: {volume}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Controls */}
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ color: "#999", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>
            Controls
          </h3>
          <div style={{ color: "#666", fontSize: "12px", lineHeight: 1.8 }}>
            <div><span style={{ color: "#ff6600" }}>WASD</span> - Move</div>
            <div><span style={{ color: "#ff6600" }}>Mouse</span> - Look</div>
            <div><span style={{ color: "#ff6600" }}>LMB</span> - Shoot</div>
            <div><span style={{ color: "#ff6600" }}>R</span> - Reload</div>
            <div><span style={{ color: "#ff6600" }}>1/2</span> - Switch Weapon</div>
            <div><span style={{ color: "#ff6600" }}>B</span> - Weapon Shop</div>
            <div><span style={{ color: "#ff6600" }}>Space</span> - Start Wave</div>
            <div><span style={{ color: "#ff6600" }}>Shift</span> - Sprint</div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "bold",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
