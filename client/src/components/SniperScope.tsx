import type { CSSProperties } from "react";
import { useWeaponStore } from "../stores/useWeaponStore";

export default function SniperScope() {
  const { activeWeapon, isADS } = useWeaponStore();

  if (activeWeapon !== "awp" || !isADS) return null;

  const style: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 150,
    pointerEvents: "none",
  };

  const panelBase: CSSProperties = {
    position: "absolute",
    background: "rgba(0,0,0,0.92)",
  };

  return (
    <div style={style}>
      {/* Top panel */}
      <div
        style={{
          ...panelBase,
          top: 0,
          left: 0,
          right: 0,
          height: "calc(50vh - 30vh)",
        }}
      />
      {/* Bottom panel */}
      <div
        style={{
          ...panelBase,
          bottom: 0,
          left: 0,
          right: 0,
          height: "calc(50vh - 30vh)",
        }}
      />
      {/* Left panel */}
      <div
        style={{
          ...panelBase,
          top: "calc(50vh - 30vh)",
          left: 0,
          right: "calc(50vw + 30vh)",
          height: "60vh",
        }}
      />
      {/* Right panel */}
      <div
        style={{
          ...panelBase,
          top: "calc(50vh - 30vh)",
          left: "calc(50vw + 30vh)",
          right: 0,
          height: "60vh",
        }}
      />
      {/* Scope lens border ring */}
      <div
        style={{
          position: "absolute",
          top: "calc(50vh - 30vh)",
          left: "calc(50vw - 30vh)",
          width: "60vh",
          height: "60vh",
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)",
        }}
      />
      {/* Crosshair horizontal */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "60vh",
          height: "1px",
          background: "rgba(255,255,255,0.7)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Crosshair vertical */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "1px",
          height: "60vh",
          background: "rgba(255,255,255,0.7)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Center dot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          background: "#ff0000",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 4px rgba(255,0,0,0.8)",
        }}
      />
      {/* Mil-dot marks on horizontal line */}
      {[-12, -6, 6, 12].map((offset) => (
        <div
          key={`h${offset}`}
          style={{
            position: "absolute",
            top: "50%",
            left: `calc(50% + ${offset}vh)`,
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.5)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {/* Mil-dot marks on vertical line */}
      {[-12, -6, 6, 12].map((offset) => (
        <div
          key={`v${offset}`}
          style={{
            position: "absolute",
            top: `calc(50% + ${offset}vh)`,
            left: "50%",
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.5)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
