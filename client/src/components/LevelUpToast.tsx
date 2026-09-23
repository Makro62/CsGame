import { useEffect, useState } from "react";
import { useProgressStore } from "../stores/useProgressStore";

export function LevelUpToast() {
  const lastLevelUp = useProgressStore((s) => s.lastLevelUp);
  const clearLevelUp = useProgressStore((s) => s.clearLevelUp);
  const [visible, setVisible] = useState<number | null>(null);

  useEffect(() => {
    if (lastLevelUp == null) return;
    setVisible(lastLevelUp);
    const t = setTimeout(() => {
      setVisible(null);
      clearLevelUp();
    }, 3200);
    return () => clearTimeout(t);
  }, [lastLevelUp, clearLevelUp]);

  if (visible == null) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 120,
        pointerEvents: "none",
        textAlign: "center",
        fontFamily: "'Rajdhani', monospace",
        animation: "levelUpIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.96))",
          border: "2px solid #facc15",
          borderRadius: 16,
          padding: "14px 36px",
          boxShadow: "0 0 40px rgba(250,204,21,0.45), 0 12px 40px rgba(0,0,0,0.7)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3, color: "#facc15" }}>
          LEVEL UP
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: "#fde68a", lineHeight: 1 }}>
          {visible}
        </div>
      </div>
    </div>
  );
}
