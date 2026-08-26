import { useState, useEffect, useCallback, useRef } from "react";
import { useGameStore } from "../stores/useGameStore";

interface ClickToPlayOverlayProps {
  onLock: () => void;
  /** Hide while a pause/shop modal is open so overlays do not stack. */
  suppressed?: boolean;
}

export function ClickToPlayOverlay({ onLock, suppressed = false }: ClickToPlayOverlayProps) {
  const [visible, setVisible] = useState(true);
  const mode = useGameStore((s) => s.mode);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.requestPointerLock();
    }
  }, []);

  useEffect(() => {
    const checkLock = () => {
      const locked = !!document.pointerLockElement;
      if (locked) {
        setVisible(false);
        onLockRef.current();
      } else {
        setVisible(true);
      }
    };

    document.addEventListener("pointerlockchange", checkLock);
    return () => document.removeEventListener("pointerlockchange", checkLock);
  }, []);

  if (suppressed || !visible) return null;

  const getModeInfo = () => {
    if (mode === "training") {
      return {
        tag: "AIM LAB & RECOIL",
        title: "TRAINING RANGE",
        accent: "#38bdf8",
        glow: "rgba(56, 189, 248, 0.4)",
        hints: ["WASD gerak", "LMB tembak", "RMB ADS / zoom", "R reload", "P settings"],
      };
    }
    if (mode === "offline5v5") {
      return {
        tag: "CONTAINER YARD",
        title: "5V5 OFFLINE",
        accent: "#f59e0b",
        glow: "rgba(245, 158, 11, 0.4)",
        hints: ["WASD gerak", "LMB tembak", "RMB ADS", "B buy menu", "E plant/defuse"],
      };
    }
    if (mode === "l4d") {
      return {
        tag: "FIRST PERSON CAMPAIGN",
        title: "LEFT 4 DEAD",
        accent: "#10b981",
        glow: "rgba(16, 185, 129, 0.4)",
        hints: ["WASD gerak", "LMB tembak", "RMB ADS", "F revive bot", "R reload"],
      };
    }
    return {
      tag: "TWIN-STICK ARENA",
      title: "ZOMBIE SURVIVAL",
      accent: "#ef4444",
      glow: "rgba(239, 68, 68, 0.4)",
      hints: ["WASD gerak", "Mouse aim", "LMB tembak", "B shop", "R reload"],
    };
  };

  const info = getModeInfo();

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(4, 8, 16, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 80,
        cursor: "pointer",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <div
        style={{
          background: "linear-gradient(155deg, rgba(13, 20, 36, 0.96), rgba(8, 12, 22, 0.98))",
          border: `1.5px solid ${info.accent}`,
          borderRadius: 16,
          padding: "32px 48px",
          textAlign: "center",
          boxShadow: `0 0 35px ${info.glow}, 0 20px 50px rgba(0,0,0,0.8)`,
          maxWidth: 480,
          animation: "fadeIn 0.25s ease-out",
        }}
      >
        <div
          style={{
            color: info.accent,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2.5,
            marginBottom: 8,
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          {info.tag}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: "#f8fafc",
            marginBottom: 6,
            fontFamily: "'Rajdhani', 'Chakra Petch', sans-serif",
            letterSpacing: "0.08em",
            textShadow: `0 0 16px ${info.glow}`,
          }}
        >
          {info.title}
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
          Klik di mana saja untuk mengunci mouse & mulai bermain
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            fontSize: 11,
            color: "#cbd5e1",
            flexWrap: "wrap",
          }}
        >
          {info.hints.map((hint, idx) => (
            <span
              key={idx}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "3px 8px",
                borderRadius: 4,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
              }}
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
