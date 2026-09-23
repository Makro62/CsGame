import { useEffect, useState } from "react";
import { gameEvents } from "../lib/gameEvents";

export function HitMarker() {
  const [show, setShow] = useState(false);
  const [headshot, setHeadshot] = useState(false);
  const [killed, setKilled] = useState(false);

  useEffect(() => {
    const onHit = (data: { headshot: boolean; killed?: boolean }) => {
      setHeadshot(data.headshot);
      setKilled(!!data.killed);
      setShow(true);
    };
    gameEvents.on("hitMarker", onHit);
    return () => {
      gameEvents.off("hitMarker", onHit);
    };
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), killed ? 220 : 140);
    return () => clearTimeout(t);
  }, [show, killed]);

  if (!show) return null;

  const color = killed ? "#facc15" : headshot ? "#ef4444" : "#ffffff";
  const size = killed ? 28 : headshot ? 22 : 20;
  const ringSize = killed ? 48 : headshot ? 36 : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 100,
        animation: "hitMarkerPop 0.16s ease-out",
      }}
    >
      <style>{`
        @keyframes hitMarkerPop {
          0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
        }
        @keyframes hitMarkerRing {
          0% { transform: translate(-50%, -50%) scale(0.4); opacity: 1; border-width: 3px; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; border-width: 1px; }
        }
        @keyframes hitMarkerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
      {ringSize > 0 && (
        <div
          style={{
            position: "absolute",
            width: ringSize,
            height: ringSize,
            top: "50%",
            left: "50%",
            borderRadius: "50%",
            border: `3px solid ${color}`,
            boxShadow: `0 0 12px ${color}`,
            transform: "translate(-50%, -50%)",
            animation: "hitMarkerRing 0.28s ease-out forwards",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          width: size,
          height: 2,
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: killed ? `0 0 8px ${color}` : "none",
          animation: headshot && !killed ? "hitMarkerPulse 0.14s ease-in-out" : undefined,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 2,
          height: size,
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: killed ? `0 0 8px ${color}` : "none",
          animation: headshot && !killed ? "hitMarkerPulse 0.14s ease-in-out" : undefined,
        }}
      />
      <div style={{ position: "absolute", width: size * 0.7, height: 2, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(45deg)" }} />
      <div style={{ position: "absolute", width: size * 0.7, height: 2, backgroundColor: color, top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)" }} />
    </div>
  );
}
