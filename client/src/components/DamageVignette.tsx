import { useEffect, useRef, useState } from "react";
import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "../stores/useGameStore";

export function DamageVignette() {
  const [flash, setFlash] = useState(false);
  const mountedRef = useRef(true);
  const gameMode = useGameStore((s) => s.mode);
  const offlineHp = useOffline5v5Store(s => s.players.get("local")?.hp ?? 100);
  const prevOfflineHp = useRef(offlineHp);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Offline 5v5 HP drop
  useEffect(() => {
    if (gameMode !== "offline5v5") return;
    if (offlineHp < prevOfflineHp.current) setFlash(true);
    prevOfflineHp.current = offlineHp;
  }, [offlineHp, gameMode]);

  // Zombie damage
  useEffect(() => {
    const handleZombieDamage = () => {
      if (mountedRef.current) setFlash(true);
    };
    window.addEventListener("zombieDamageTaken", handleZombieDamage);
    return () => window.removeEventListener("zombieDamageTaken", handleZombieDamage);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(false), 300);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!flash) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        background:
          "radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,0.7) 100%)",
        animation: "damageFlash 0.3s ease-out",
      }}
    />
  );
}
