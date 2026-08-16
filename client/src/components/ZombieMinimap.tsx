import { useState, useEffect } from "react";
import { useZombieStore } from "../stores/useZombieStore";
import { useZombieNetworkStore } from "../stores/useZombieNetworkStore";
import { BARRICADE_CONFIG, EXTRACTION_CONFIG } from "@cs-game/shared";

// Outpost Z-7 Arena dimensions (approx 120m x 120m)
const ARENA_SIZE = 120;
const MINIMAP_SIZE = 190;
const SCALE = MINIMAP_SIZE / ARENA_SIZE;

export function ZombieMinimap() {
  const [visible, setVisible] = useState(true);
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);
  const zombies = useZombieStore((s) => s.zombies);
  const barricades = useZombieStore((s) => s.barricades);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyM") {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!visible) return null;

  const playerX = lastSnapshot?.x ?? 0;
  const playerZ = lastSnapshot?.z ?? -30;
  const playerRot = lastSnapshot?.rotationY ?? 0;
  const arrowAngle = (-playerRot * 180) / Math.PI;

  // Convert world coordinates to minimap coordinates relative to player center
  const toMinimap = (wx: number, wz: number) => ({
    x: (wx - playerX) * SCALE + MINIMAP_SIZE / 2,
    y: (wz - playerZ) * SCALE + MINIMAP_SIZE / 2,
  });

  // Fixed world landmarks in Outpost Z-7
  const safeHousePos = toMinimap(0, -40);
  const mysteryBoxPos = toMinimap(0, 5);
  const packAPunchPos = toMinimap(0, 0);
  const helipadPos = toMinimap(EXTRACTION_CONFIG.helipadPos.x, EXTRACTION_CONFIG.helipadPos.z);

  // Lookup map for barricade boards
  const barricadeBoardMap = new Map<string, number>();
  barricades.forEach((b) => barricadeBoardMap.set(b.id, b.boards));

  return (
    <div
      style={{
        position: "fixed",
        // Sits above the health bar, which owns the bottom-left corner.
        top: 96,
        left: 24,
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE + 32,
        background: "rgba(10, 15, 20, 0.88)",
        border: "2px solid rgba(220, 38, 38, 0.5)",
        borderRadius: "10px",
        zIndex: 40,
        pointerEvents: "none",
        overflow: "hidden",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(220, 38, 38, 0.2)",
        fontFamily: "'Segoe UI', monospace",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "3px 8px",
          background: "rgba(220, 38, 38, 0.2)",
          borderBottom: "1px solid rgba(220, 38, 38, 0.3)",
        }}
      >
        <span style={{ color: "#ef4444", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" }}>
          OUTPOST Z-7 [M]
        </span>
        <span style={{ color: "#ffd700", fontSize: "10px", fontWeight: "bold" }}>
          RADAR
        </span>
      </div>

      {/* Radar Canvas Area */}
      <div
        style={{
          position: "relative",
          width: MINIMAP_SIZE,
          height: MINIMAP_SIZE,
          overflow: "hidden",
          backgroundColor: "#080c10",
        }}
      >
        {/* Radar concentric range circles */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: MINIMAP_SIZE * 0.7,
            height: MINIMAP_SIZE * 0.7,
            borderRadius: "50%",
            border: "1px dashed rgba(255, 255, 255, 0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: MINIMAP_SIZE * 0.35,
            height: MINIMAP_SIZE * 0.35,
            borderRadius: "50%",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
          }}
        />

        {/* Safe House Zone */}
        <div
          style={{
            position: "absolute",
            left: safeHousePos.x - 20 * SCALE,
            top: safeHousePos.y - 12 * SCALE,
            width: 40 * SCALE,
            height: 24 * SCALE,
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.4)",
            borderRadius: "3px",
          }}
        />

        {/* Helipad Zone */}
        <div
          style={{
            position: "absolute",
            left: helipadPos.x - 12 * SCALE,
            top: helipadPos.y - 12 * SCALE,
            width: 24 * SCALE,
            height: 24 * SCALE,
            borderRadius: "50%",
            backgroundColor: "rgba(234, 179, 8, 0.1)",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#ffd700", fontSize: "9px", fontWeight: "900" }}>H</span>
        </div>

        {/* Pack-a-Punch Landmark */}
        <div
          style={{
            position: "absolute",
            left: packAPunchPos.x - 5,
            top: packAPunchPos.y - 5,
            width: 10,
            height: 10,
            backgroundColor: "#7c3aed",
            border: "1px solid #c084fc",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 5px rgba(124, 58, 237, 0.8)",
          }}
          title="Pack-a-Punch"
        >
          <span style={{ color: "#fff", fontSize: "7px", fontWeight: "bold" }}>★</span>
        </div>

        {/* Mystery Box Landmark */}
        <div
          style={{
            position: "absolute",
            left: mysteryBoxPos.x - 5,
            top: mysteryBoxPos.y - 5,
            width: 10,
            height: 10,
            backgroundColor: "#d97706",
            border: "1px solid #fbbf24",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 5px rgba(217, 119, 6, 0.8)",
          }}
          title="Mystery Box"
        >
          <span style={{ color: "#fff", fontSize: "7px", fontWeight: "bold" }}>?</span>
        </div>

        {/* Barricades */}
        {BARRICADE_CONFIG.locations.map((loc) => {
          const bPos = toMinimap(loc.x, loc.z);
          const boards = barricadeBoardMap.get(loc.id) ?? 6;
          const isBroken = boards === 0;
          const isDamaged = boards < 6;

          return (
            <div
              key={loc.id}
              style={{
                position: "absolute",
                left: bPos.x - 3,
                top: bPos.y - 3,
                width: 6,
                height: 6,
                backgroundColor: isBroken ? "#ef4444" : isDamaged ? "#f59e0b" : "#10b981",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "1px",
              }}
              title={`Barricade (${boards}/6 boards)`}
            />
          );
        })}

        {/* Live Zombie Red Dots on Radar */}
        {zombies.map((zombie) => {
          if (zombie.isDead) return null;
          const zPos = toMinimap(zombie.x, zombie.z);
          const isBoss = zombie.type === "boss";
          const isTank = zombie.type === "tank";

          if (isBoss) {
            return (
              <div
                key={zombie.id}
                style={{
                  position: "absolute",
                  left: zPos.x - 6,
                  top: zPos.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#dc2626",
                  border: "1.5px solid #fff",
                  boxShadow: "0 0 8px rgba(220, 38, 38, 1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "pulse 0.6s infinite",
                }}
              >
                <span style={{ fontSize: "7px" }}>💀</span>
              </div>
            );
          }

          return (
            <div
              key={zombie.id}
              style={{
                position: "absolute",
                left: zPos.x - (isTank ? 3.5 : 2.5),
                top: zPos.y - (isTank ? 3.5 : 2.5),
                width: isTank ? 7 : 5,
                height: isTank ? 7 : 5,
                borderRadius: "50%",
                backgroundColor: isTank ? "#f97316" : "#ef4444",
                border: isTank ? "1px solid #fff" : "1px solid rgba(255, 100, 100, 0.6)",
                boxShadow: isTank ? "0 0 4px #f97316" : "0 0 3px #ef4444",
              }}
            />
          );
        })}

        {/* Local Player Arrow in Center */}
        <div
          style={{
            position: "absolute",
            left: MINIMAP_SIZE / 2 - 6,
            top: MINIMAP_SIZE / 2 - 6,
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "11px solid #38bdf8",
            transform: `rotate(${arrowAngle}deg)`,
            filter: "drop-shadow(0 0 4px rgba(56, 189, 248, 0.9))",
          }}
        />
      </div>
    </div>
  );
}
