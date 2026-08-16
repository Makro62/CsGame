import { useState, useEffect } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import { BOMB_SITES, SPAWN, MAP_OBSTACLES, MAP_BOUNDARY } from "@cs-game/shared";

const MAP_WIDTH = (MAP_BOUNDARY.maxX - MAP_BOUNDARY.minX) + 2; // ~60m
const MAP_HEIGHT = (MAP_BOUNDARY.maxZ - MAP_BOUNDARY.minZ) + 2; // ~40m
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 160;
const SCALE_X = MINIMAP_WIDTH / MAP_WIDTH;
const SCALE_Z = MINIMAP_HEIGHT / MAP_HEIGHT;

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

  const siteA = toMinimap(BOMB_SITES.A.x, BOMB_SITES.A.z);
  const siteB = toMinimap(BOMB_SITES.B.x, BOMB_SITES.B.z);
  const spawnT = toMinimap(SPAWN.T.x, SPAWN.T.z);
  const spawnCT = toMinimap(SPAWN.CT.x, SPAWN.CT.z);

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
        height: MINIMAP_HEIGHT + 48,
        background: "rgba(10, 15, 25, 0.9)",
        border: "2px solid rgba(255,255,255,0.25)",
        borderRadius: "8px",
        zIndex: 100,
        pointerEvents: "none",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      }}
    >
      {/* Compass header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 8px",
          background: "rgba(0,0,0,0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <span style={{ color: "#aaa", fontSize: "10px", fontFamily: "monospace", fontWeight: "bold" }}>
          CONTAINER YARD [M]
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
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Map Obstacles / Containers */}
        {MAP_OBSTACLES.map((obs) => {
          if (obs.id.startsWith("wall_")) return null;
          const minPos = toMinimap(obs.minX, obs.minZ);
          const maxPos = toMinimap(obs.maxX, obs.maxZ);
          const left = Math.min(minPos.x, maxPos.x);
          const top = Math.min(minPos.y, maxPos.y);
          const width = Math.abs(maxPos.x - minPos.x);
          const height = Math.abs(maxPos.y - minPos.y);

          const isWood = obs.material === "wood";
          const isMetal = obs.material === "metal";

          return (
            <div
              key={obs.id}
              style={{
                position: "absolute",
                left,
                top,
                width: Math.max(2, width),
                height: Math.max(2, height),
                backgroundColor: isWood ? "rgba(180, 130, 50, 0.4)" : isMetal ? "rgba(70, 110, 170, 0.45)" : "rgba(100, 100, 100, 0.4)",
                border: `1px solid ${isWood ? "rgba(180, 130, 50, 0.7)" : isMetal ? "rgba(70, 110, 170, 0.7)" : "rgba(120, 120, 120, 0.7)"}`,
              }}
            />
          );
        })}

        {/* Plant Zone A Radius */}
        <div
          style={{
            position: "absolute",
            left: siteA.x - BOMB_SITES.A.radius * SCALE_X,
            top: siteA.y - BOMB_SITES.A.radius * SCALE_Z,
            width: BOMB_SITES.A.radius * SCALE_X * 2,
            height: BOMB_SITES.A.radius * SCALE_Z * 2,
            borderRadius: "50%",
            border: "1px dashed rgba(239, 68, 68, 0.5)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
          }}
        />

        {/* Plant Zone B Radius */}
        <div
          style={{
            position: "absolute",
            left: siteB.x - BOMB_SITES.B.radius * SCALE_X,
            top: siteB.y - BOMB_SITES.B.radius * SCALE_Z,
            width: BOMB_SITES.B.radius * SCALE_X * 2,
            height: BOMB_SITES.B.radius * SCALE_Z * 2,
            borderRadius: "50%",
            border: "1px dashed rgba(59, 130, 246, 0.5)",
            backgroundColor: "rgba(59, 130, 246, 0.08)",
          }}
        />

        {/* Site A Marker */}
        <div
          style={{
            position: "absolute",
            left: siteA.x - 7,
            top: siteA.y - 7,
            width: 14,
            height: 14,
            background: "#ef4444",
            border: "1px solid #fff",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 6px rgba(239, 68, 68, 0.8)",
          }}
        >
          <span style={{ color: "#fff", fontSize: "9px", fontWeight: "900" }}>A</span>
        </div>

        {/* Site B Marker */}
        <div
          style={{
            position: "absolute",
            left: siteB.x - 7,
            top: siteB.y - 7,
            width: 14,
            height: 14,
            background: "#3b82f6",
            border: "1px solid #fff",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 6px rgba(59, 130, 246, 0.8)",
          }}
        >
          <span style={{ color: "#fff", fontSize: "9px", fontWeight: "900" }}>B</span>
        </div>

        {/* T Spawn Badge */}
        <div
          style={{
            position: "absolute",
            left: spawnT.x - 6,
            top: spawnT.y - 6,
            width: 12,
            height: 12,
            background: "rgba(220, 38, 38, 0.85)",
            border: "1px solid #ff7777",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: "8px", fontWeight: "bold" }}>T</span>
        </div>

        {/* CT Spawn Badge */}
        <div
          style={{
            position: "absolute",
            left: spawnCT.x - 6,
            top: spawnCT.y - 6,
            width: 12,
            height: 12,
            background: "rgba(37, 99, 235, 0.85)",
            border: "1px solid #93c5fd",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#fff", fontSize: "8px", fontWeight: "bold" }}>CT</span>
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

        {/* Enemies */}
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

        {/* Local C4 Carrier Badge */}
        {localHasBomb && (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "#eab308",
              color: "#000",
              fontSize: "9px",
              fontWeight: "900",
              padding: "1px 5px",
              borderRadius: "3px",
              fontFamily: "monospace",
              boxShadow: "0 0 6px rgba(234, 179, 8, 0.8)",
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
          gap: "10px",
          padding: "4px",
          background: "rgba(0,0,0,0.4)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>TEAM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>ENEMY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", background: "#ef4444" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>A</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", background: "#3b82f6" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>B</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", background: "rgba(220, 38, 38, 0.85)" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>T BASE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <div style={{ width: "6px", height: "6px", background: "rgba(37, 99, 235, 0.85)" }} />
          <span style={{ color: "#888", fontSize: "8px", fontFamily: "monospace" }}>CT BASE</span>
        </div>
      </div>
    </div>
  );
}
