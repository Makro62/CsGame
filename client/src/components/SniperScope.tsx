import type { CSSProperties } from "react";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "../stores/useGameStore";
import { HUD_Z } from "../ui/hudTheme";

export default function SniperScope() {
  const { activeWeapon, isADS } = useWeaponStore();
  const gameMode = useGameStore((s) => s.mode);
  const isDead = useOffline5v5Store((s) => s.players.get("local")?.isDead ?? false);

  if (activeWeapon !== "awp" || !isADS) return null;
  if (gameMode === "offline5v5" && isDead) return null;

  const style: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: HUD_Z.overlay, // 50, below PauseMenu (90)
    pointerEvents: "none",
    userSelect: "none",
  };

  return (
    <div style={style}>
      {/* Outer black mask with seamless circular aperture and realistic optic glass falloff */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "68vh",
          height: "68vh",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          boxShadow: "0 0 0 100vmax rgba(4, 6, 12, 0.98), inset 0 0 45px 15px rgba(0, 0, 0, 0.92)",
          border: "2px solid rgba(255, 255, 255, 0.22)",
        }}
      />
      {/* Scope crosshair horizontal */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "68vh",
          height: "1px",
          background: "rgba(255, 255, 255, 0.75)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Scope crosshair vertical */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "1px",
          height: "68vh",
          background: "rgba(255, 255, 255, 0.75)",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Scope center dot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          background: "#ef4444",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 5px rgba(239, 68, 68, 0.9)",
        }}
      />
      {/* Mil-dot marks on horizontal line */}
      {[-14, -7, 7, 14].map((offset) => (
        <div
          key={`h${offset}`}
          style={{
            position: "absolute",
            top: "50%",
            left: `calc(50% + ${offset}vh)`,
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.6)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {/* Mil-dot marks on vertical line */}
      {[-14, -7, 7, 14].map((offset) => (
        <div
          key={`v${offset}`}
          style={{
            position: "absolute",
            top: `calc(50% + ${offset}vh)`,
            left: "50%",
            width: "2px",
            height: "2px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.6)",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
