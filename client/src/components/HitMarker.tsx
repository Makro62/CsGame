import { useEffect, useState } from "react";
import { gameEvents } from "../lib/gameEvents";

export function HitMarker() {
  const [show, setShow] = useState(false);
  const [headshot, setHeadshot] = useState(false);

  useEffect(() => {
    const off = gameEvents.on("hitMarker", (data) => {
      setHeadshot(data.headshot);
      setShow(true);
    });
    return off;
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 150);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  const color = headshot ? "#ef4444" : "white";

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {/* Cross */}
      <div
        style={{
          position: "absolute",
          width: "20px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "2px",
          height: "20px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Diagonal lines */}
      <div
        style={{
          position: "absolute",
          width: "14px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "14px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-45deg)",
        }}
      />
    </div>
  );
}
