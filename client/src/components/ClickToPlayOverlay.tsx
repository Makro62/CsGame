import { useState, useEffect, useCallback, useRef } from "react";

interface ClickToPlayOverlayProps {
  onLock: () => void;
  /** Hide while a pause/shop modal is open so overlays do not stack. */
  suppressed?: boolean;
}

export function ClickToPlayOverlay({ onLock, suppressed = false }: ClickToPlayOverlayProps) {
  const [visible, setVisible] = useState(true);
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

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(4, 8, 14, 0.45)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 80,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "linear-gradient(150deg, rgba(10,14,22,0.94), rgba(17,24,39,0.9))",
          border: "1px solid rgba(239,68,68,0.45)",
          borderRadius: 16,
          padding: "28px 40px",
          textAlign: "center",
          boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ color: "#ef4444", fontSize: 11, fontWeight: 900, letterSpacing: 2, marginBottom: 8 }}>
          OUTPOST Z-7
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#f8fafc", marginBottom: 8 }}>
          KLIK UNTUK BERMAIN
        </div>
        <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 18 }}>
          Kunci mouse ke game — ESC untuk pause
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
          <span>WASD gerak</span>
          <span>LMB tembak</span>
          <span>F interaksi</span>
          <span>B shop</span>
        </div>
      </div>
    </div>
  );
}
