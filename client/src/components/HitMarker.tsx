import { useEffect, useState } from "react";
import { gameEvents } from "../lib/gameEvents";

export function HitMarker() {
  const [show, setShow] = useState(false);
  const [headshot, setHeadshot] = useState(false);
  const [killed, setKilled] = useState(false);

  useEffect(() => {
    const off = gameEvents.on("hitMarker", (data) => {
      setHeadshot(data.headshot);
      setKilled(!!data.killed);
      setShow(true);
    });
    return off;
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), killed ? 220 : 140);
    return () => clearTimeout(t);
  }, [show, killed]);

  if (!show) return null;

  const color = killed ? "#facc15" : headshot ? "#ef4444" : "#ffffff";
  const size = killed ? 26 : 20;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 100,
        animation: "hitMarkerPop 0.14s ease-out",
      }}
    >
      <style>{`
        @keyframes hitMarkerPop {
          0% { transform: translate(-50%, -50%) scale(1.45); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
        }
      `}</style>
      <div style={{ position: "absolute", width: size, height: 2, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 2, height: size, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: size * 0.7, height: 2, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(45deg)" }} />
      <div style={{ position: "absolute", width: size * 0.7, height: 2, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)" }} />
    </div>
  );
}
