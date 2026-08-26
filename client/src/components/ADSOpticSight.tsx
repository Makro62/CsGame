import { useState, useEffect } from "react";
import * as THREE from "three";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useGameStore } from "../stores/useGameStore";
import { useOffline5v5Store } from "../screens/Offline5v5Store";

interface ScreenTarget {
  id: string;
  x: number;
  y: number;
  distance: number;
  hp: number;
  maxHp: number;
  label: string;
}

export function ADSOpticSight() {
  const { activeWeapon, isADS, isReloading, isSwitching } = useWeaponStore();
  const [screenTargets, setScreenTargets] = useState<ScreenTarget[]>([]);
  const isAwp = activeWeapon === "awp";

  // Target spotter loop: when ADS is active, calculate screen positions of enemies
  useEffect(() => {
    if (!isADS || isReloading || isSwitching) {
      setScreenTargets([]);
      return;
    }

    let animId: number;
    const tempVec = new THREE.Vector3();

    const scanTargets = () => {
      const canvas = document.querySelector("canvas");
      // @ts-expect-error Three.js internal camera reference
      const camera = window.__CS_GAME_CAMERA__ as THREE.PerspectiveCamera | undefined;

      if (!canvas || !camera) {
        animId = requestAnimationFrame(scanTargets);
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const visibleTargets: ScreenTarget[] = [];

      // 1. Training / General Targets
      const targets = useGameStore.getState().targets;
      Object.values(targets).forEach((t) => {
        if (!t.isAlive || t.hp <= 0) return;
        tempVec.set(t.x, t.y + 1.3, t.z);
        const dist = camera.position.distanceTo(tempVec);
        tempVec.project(camera);

        // Check if target is in front of camera and inside screen bounds
        if (tempVec.z > -1 && tempVec.z < 1) {
          const sx = (tempVec.x * 0.5 + 0.5) * w;
          const sy = (-(tempVec.y * 0.5) + 0.5) * h;

          if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
            visibleTargets.push({
              id: t.id,
              x: sx,
              y: sy,
              distance: Math.round(dist),
              hp: t.hp,
              maxHp: t.maxHp || 100,
              label: "TARGET",
            });
          }
        }
      });

      // 2. Offline 5v5 Bots
      const offlinePlayers = useOffline5v5Store.getState().players;
      offlinePlayers.forEach((p) => {
        if (p.id === "local" || p.isDead) return;
        tempVec.set(p.x, 1.4, p.z);
        const dist = camera.position.distanceTo(tempVec);
        tempVec.project(camera);

        if (tempVec.z > -1 && tempVec.z < 1) {
          const sx = (tempVec.x * 0.5 + 0.5) * w;
          const sy = (-(tempVec.y * 0.5) + 0.5) * h;

          if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
            visibleTargets.push({
              id: p.id,
              x: sx,
              y: sy,
              distance: Math.round(dist),
              hp: (p as any).health || 100,
              maxHp: 100,
              label: p.team === "CT" ? "BOT CT" : "BOT T",
            });
          }
        }
      });

      setScreenTargets(visibleTargets);
      animId = requestAnimationFrame(scanTargets);
    };

    animId = requestAnimationFrame(scanTargets);
    return () => cancelAnimationFrame(animId);
  }, [isADS, isReloading, isSwitching]);

  if (!isADS || isReloading || isSwitching) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 140,
        userSelect: "none",
      }}
    >
      {/* Tactical Optical Vignette & Red-Dot for non-AWP weapons */}
      {!isAwp && (
        <>
          {/* Subtle Outer Scope Lens Blur */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {/* Optic Sight Ring & Center Dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "1.5px solid rgba(56, 189, 248, 0.4)",
              boxShadow: "0 0 12px rgba(56, 189, 248, 0.3), inset 0 0 10px rgba(56, 189, 248, 0.15)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {/* Illuminated Center Dot */}
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 8px #ef4444, 0 0 14px #ef4444",
              }}
            />
            {/* Outer ticks */}
            <div style={{ position: "absolute", top: 4, width: 2, height: 8, background: "#38bdf8" }} />
            <div style={{ position: "absolute", bottom: 4, width: 2, height: 8, background: "#38bdf8" }} />
            <div style={{ position: "absolute", left: 4, width: 8, height: 2, background: "#38bdf8" }} />
            <div style={{ position: "absolute", right: 4, width: 8, height: 2, background: "#38bdf8" }} />
          </div>

          {/* ADS Mode Tag */}
          <div
            style={{
              position: "absolute",
              top: "calc(50% + 75px)",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              fontWeight: 800,
              color: "#38bdf8",
              letterSpacing: "2px",
              background: "rgba(0,0,0,0.5)",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid rgba(56,189,248,0.3)",
            }}
          >
            ADS OPTIC // {activeWeapon?.toUpperCase()}
          </div>
        </>
      )}

      {/* Tactical Enemy Vision Markers / Spotter Tracking HUD */}
      {screenTargets.map((target) => (
        <div
          key={target.id}
          style={{
            position: "absolute",
            left: `${target.x}px`,
            top: `${target.y}px`,
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Target Detection Diamond / Bracket */}
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "1.5px solid #ef4444",
              transform: "rotate(45deg)",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "4px",
                height: "4px",
                backgroundColor: "#ef4444",
                borderRadius: "50%",
              }}
            />
          </div>

          {/* Target Distance & Label Banner */}
          <div
            style={{
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(10, 14, 24, 0.88)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              borderRadius: "3px",
              padding: "1px 5px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              fontWeight: 800,
              color: "#fca5a5",
              boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#ef4444" }}>▼</span>
            <span>{target.label}</span>
            <span style={{ color: "#38bdf8" }}>{target.distance}M</span>
          </div>

          {/* Target Health Mini-Bar */}
          <div
            style={{
              width: "36px",
              height: "3px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: "2px",
              overflow: "hidden",
              border: "0.5px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100))}%`,
                height: "100%",
                background: target.hp > 50 ? "#22c55e" : target.hp > 25 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
