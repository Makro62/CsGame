import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { gameEvents } from "../lib/gameEvents";

interface HitIndicator {
  id: number;
  angle: number; // in radians (0 = front, PI/2 = right, PI = back, -PI/2 = left)
  createdAt: number;
  damage: number;
}

export function DamageIndicator() {
  const [indicators, setIndicators] = useState<HitIndicator[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const processHit = (data: { shooterX: number; shooterZ: number; damage?: number }) => {
      const { shooterX, shooterZ, damage = 25 } = data;

      // Get camera position and forward direction
      const camera = (window as unknown as { __CS_GAME_CAMERA__?: THREE.Camera }).__CS_GAME_CAMERA__;
      let playerX = 0;
      let playerZ = 0;
      let camYaw = 0;

      if (camera) {
        playerX = camera.position.x;
        playerZ = camera.position.z;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        camYaw = Math.atan2(dir.x, dir.z);
      } else {
        const local = useOffline5v5Store.getState().players.get("local");
        if (local) {
          playerX = local.x;
          playerZ = local.z;
          camYaw = local.rotationY;
        }
      }

      // World angle from player to shooter
      const dx = shooterX - playerX;
      const dz = shooterZ - playerZ;
      const worldAngle = Math.atan2(dx, dz);

      // Relative angle to screen (0 = top, Math.PI = bottom, Math.PI/2 = right, -Math.PI/2 = left)
      let relAngle = worldAngle - camYaw;
      while (relAngle > Math.PI) relAngle -= Math.PI * 2;
      while (relAngle < -Math.PI) relAngle += Math.PI * 2;

      idRef.current += 1;
      const newHit: HitIndicator = {
        id: idRef.current,
        angle: relAngle,
        createdAt: performance.now(),
        damage,
      };

      setIndicators((prev) => [...prev.slice(-4), newHit]);
    };

    const handleWindowHit = (e: Event) => {
      const customEvent = e as CustomEvent<{ shooterX: number; shooterZ: number; damage?: number }>;
      if (!customEvent.detail) return;
      processHit(customEvent.detail);
    };

    const handleGameEventHit = (payload: { shooterX: number; shooterZ: number; damage: number }) => {
      processHit(payload);
    };

    window.addEventListener("playerHitFeedback", handleWindowHit);
    gameEvents.on("playerHitFeedback", handleGameEventHit);

    return () => {
      window.removeEventListener("playerHitFeedback", handleWindowHit);
      gameEvents.off("playerHitFeedback", handleGameEventHit);
    };
  }, []);

  // Fade out timer
  useEffect(() => {
    if (indicators.length === 0) return;
    const interval = setInterval(() => {
      const now = performance.now();
      setIndicators((prev) => prev.filter((ind) => now - ind.createdAt < 1200));
    }, 50);
    return () => clearInterval(interval);
  }, [indicators.length]);

  if (indicators.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {indicators.map((ind) => {
        const age = (performance.now() - ind.createdAt) / 1200;
        const opacity = Math.max(0, 1 - age);
        const rotDeg = (ind.angle * 180) / Math.PI;

        return (
          <div
            key={ind.id}
            style={{
              position: "absolute",
              width: "min(60vw, 420px)",
              height: "min(60vw, 420px)",
              transform: `rotate(${rotDeg}deg)`,
              pointerEvents: "none",
              opacity,
              transition: "opacity 0.05s linear",
            }}
          >
            {/* Top Red Damage Arc */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "120px",
                height: "28px",
                background: "radial-gradient(ellipse at top, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.4) 60%, transparent 100%)",
                borderTop: "3.5px solid #ef4444",
                borderRadius: "50% 50% 0 0",
                filter: "drop-shadow(0 0 10px #ef4444)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
