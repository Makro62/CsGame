import { useState, useEffect, useCallback, useRef } from "react";

interface ClickToPlayOverlayProps {
  onLock: () => void;
}

export function ClickToPlayOverlay({ onLock }: ClickToPlayOverlayProps) {
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

  if (!visible) return null;

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 50,
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          color: "white",
          marginBottom: "16px",
          textShadow: "0 0 20px rgba(59, 130, 246, 0.8)",
        }}
      >
        CLICK TO PLAY
      </div>
      <div
        style={{
          fontSize: "18px",
          color: "#9ca3af",
          marginBottom: "24px",
        }}
      >
        Click anywhere to lock your mouse
      </div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          fontSize: "14px",
          color: "#6b7280",
        }}
      >
        <span>WASD - Move</span>
        <span>Mouse - Look</span>
        <span>LMB - Shoot</span>
        <span>R - Reload</span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          fontSize: "14px",
          color: "#6b7280",
          marginTop: "8px",
        }}
      >
        <span>Shift - Sprint</span>
        <span>Ctrl - Crouch</span>
        <span>Space - Jump</span>
        <span>B - Buy Menu</span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          fontSize: "12px",
          color: "#4b5563",
        }}
      >
        Press ESC to release mouse
      </div>
    </div>
  );
}
