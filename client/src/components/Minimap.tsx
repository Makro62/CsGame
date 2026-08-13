import { useState, useEffect } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";

const MAP_WIDTH = 60;
const MAP_HEIGHT = 40;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 160;
const SCALE_X = MINIMAP_WIDTH / MAP_WIDTH;
const SCALE_Z = MINIMAP_HEIGHT / MAP_HEIGHT;

const SITE_A = { x: -5, z: -15 };
const SITE_B = { x: 5, z: 15 };

export default function Minimap() {
  const [visible, setVisible] = useState(false);
  const { round, remotePlayers, sessionId, localTeam, localHasBomb, localX, localZ, localRotationY, droppedBombPos } =
    useNetworkStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") setVisible((v) => !v);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  if (!visible) return null;

  const localXPos = localX;
  const localZPos = localZ;

  const toMinimap = (worldX: number, worldZ: number) => ({
    x: (worldX - localXPos) * SCALE_X + MINIMAP_WIDTH / 2,
    y: (worldZ - localZPos) * SCALE_Z + MINIMAP_HEIGHT / 2,
  });

  const siteA = toMinimap(SITE_A.x, SITE_A.z);
  const siteB = toMinimap(SITE_B.x, SITE_B.z);

  const teammates: { id: string; x: number; z: number; hasBomb: boolean }[] = [];
  const enemies: { id: string; x: number; z: number }[] = [];
  remotePlayers.forEach((p, id) => {
    if (id !== sessionId) {
      if (p.team === localTeam) {
        teammates.push({ id, x: p.x, z: p.z, hasBomb: p.hasBomb });
      } else {
        enemies.push({ id, x: p.x, z: p.z });
      }
    }
  });

  const localRot = localRotationY;
  const arrowAngle = (-localRot * 180) / Math.PI;

  // Compass directions
  const getCompassDir = (angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    if (normalized >= 315 || normalized < 45) return "N";
    if (normalized >= 45 && normalized < 135) return "E";
    if (normalized >= 135 && normalized < 225) return "S";
    return "W";
  };

  const compassDir = getCompassDir(-localRot * (180 / Math.PI));

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT + 40,
        background: "rgba(0,0,0,0.85)",
        border: "2px solid rgba(255,255,255,0.3)",
        borderRadius: "8px",
        zIndex: 100,
        pointerEvents: "none",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Compass header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 8px",
          background: "rgba(0,0,0,0.5)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <span style={{ color: "#888", fontSize: "10px", fontFamily: "monospace" }}>
          MAP [M]
        </span>
        <span style={{ color: "#4ade80", fontSize: "12px", fontFamily: "monospace", fontWeight: "bold" }}>
          {compassDir}
        </span>
      </div>

      {/* Map area */}
      <div
        style={{
          position: "relative",
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          overflow: "hidden",
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Map perimeter */}
        <div
          style={{
            position: "absolute",
            inset: 4,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "2px",
          }}
        />

        {/* Site A */}
        <div
          style={{
            position: "absolute",
            left: siteA.x - 6,
            top: siteA.y - 6,
            width: 12,
            height: 12,
            background: "rgba(239,68,68,0.8)",
            border: "1px solid rgba(239,68,68,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: "8px", fontWeight: "bold" }}>A</span>
        </div>

        {/* Site B */}
        <div
          style={{
            position: "absolute",
            left: siteB.x - 6,
            top: siteB.y - 6,
            width: 12,
            height: 12,
            background: "rgba(59,130,246,0.8)",
            border: "1px solid rgba(59,130,246,1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: "8px", fontWeight: "bold" }}>B</span>
        </div>

        {/* Teammates */}
        {teammates.map((t) => {
          const pos = toMinimap(t.x, t.z);
          return (
            <div
              key={t.id}
              style={{
                position: "absolute",
                left: pos.x - 4,
                top: pos.y - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.hasBomb ? "#eab308" : "#22c55e",
                border: `1px solid ${t.hasBomb ? "#ca8a04" : "#16a34a"}`,
                boxShadow: `0 0 4px ${t.hasBomb ? "rgba(234,179,8,0.8)" : "rgba(34,197,94,0.5)"}`,
              }}
            />
          );
        })}

        {/* Enemies (if spotted) */}
        {enemies.map((e) => {
          const pos = toMinimap(e.x, e.z);
          return (
            <div
              key={e.id}
              style={{
                position: "absolute",
                left: pos.x - 4,
                top: pos.y - 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                border: "1px solid #dc2626",
                boxShadow: "0 0 4px rgba(239,68,68,0.5)",
              }}
            />
          );
        })}

        {/* Local player arrow */}
        <div
          style={{
            position: "absolute",
            left: MINIMAP_WIDTH / 2 - 6,
            top: MINIMAP_HEIGHT / 2 - 6,
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "12px solid #fff",
            transform: `rotate(${arrowAngle}deg)`,
            filter: "drop-shadow(0 0 3px rgba(255,255,255,0.8))",
          }}
        />

        {/* Bomb indicator */}
        {localHasBomb && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(234,179,8,0.9)",
              padding: "2px 6px",
              borderRadius: "4px",
              color: "#000",
              fontSize: "9px",
              fontWeight: "bold",
              fontFamily: "monospace",
            }}
          >
            C4
          </div>
        )}

        {/* Bomb planted indicator */}
        {round.bombPlanted && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(239,68,68,0.9)",
              padding: "2px 6px",
              borderRadius: "4px",
              color: "#fff",
              fontSize: "8px",
              fontWeight: "bold",
              fontFamily: "monospace",
              animation: "pulse 1s infinite",
            }}
          >
            BOMB PLANTED
          </div>
        )}

        {/* Dropped bomb marker */}
        {droppedBombPos && !round.bombPlanted && (
          <div
            style={{
              position: "absolute",
              left: toMinimap(droppedBombPos.x, droppedBombPos.z).x - 6,
              top: toMinimap(droppedBombPos.x, droppedBombPos.z).y - 6,
              width: 12,
              height: 12,
              background: "rgba(234,179,8,0.9)",
              border: "1px solid #ca8a04",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 1s infinite",
            }}
          >
            <span style={{ fontSize: "8px" }}>💣</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          padding: "4px",
          background: "rgba(0,0,0,0.3)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>TEAM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>ENEMY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "6px", height: "6px", background: "#ef4444" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>SITE A</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "6px", height: "6px", background: "#3b82f6" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>SITE B</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#eab308" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>BOMB</span>
        </div>
      </div>
    </div>
  );
}
