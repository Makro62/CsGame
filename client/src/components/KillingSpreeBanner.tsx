import { useEffect, useRef, useState } from "react";
import { gameEvents } from "../lib/gameEvents";
import {
  createMultiKillState,
  multikillLabel,
  registerMultiKill,
  type MultiKillState,
} from "../game/progress/multiKill";

export function KillingSpreeBanner() {
  const [label, setLabel] = useState<string | null>(null);
  const stateRef = useRef<MultiKillState>(createMultiKillState());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onHit = (data: { headshot: boolean; killed?: boolean }) => {
      if (!data.killed) return;
      stateRef.current = registerMultiKill(stateRef.current, performance.now());
      const next = multikillLabel(stateRef.current.count);
      if (!next) return;
      setLabel(next);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setLabel(null), 1600);
    };
    gameEvents.on("hitMarker", onHit);
    return () => {
      gameEvents.off("hitMarker", onHit);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!label) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "32%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 110,
        pointerEvents: "none",
        fontFamily: "'Rajdhani', monospace",
        textAlign: "center",
        animation: "spreeIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(127,29,29,0.95), rgba(69,10,10,0.97))",
          border: "2px solid #facc15",
          borderRadius: 14,
          padding: "12px 32px",
          boxShadow: "0 0 36px rgba(250,204,21,0.5)",
          color: "#fde68a",
          fontSize: "clamp(20px, 4vw, 32px)",
          fontWeight: 900,
          letterSpacing: "0.12em",
          textShadow: "0 0 16px rgba(250,204,21,0.6)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
