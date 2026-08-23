import { useEffect, useRef, useState } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";

export function DamageVignette() {
  const [flash, setFlash] = useState(false);
  const room = useNetworkStore((s) => s.room);
  const sessionId = useNetworkStore((s) => s.sessionId);
  const localHp = useNetworkStore((s) => s.localHp);
  const prevHp = useRef(localHp);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!room || !sessionId) return;

    const handler = (data: { victimId: string }) => {
      if (mountedRef.current && data.victimId === sessionId) {
        setFlash(true);
      }
    };

    room.onMessage("damage", handler);
  }, [room, sessionId]);

  // Offline 5v5 reports damage as HP drops on the mirrored network store.
  useEffect(() => {
    if (localHp < prevHp.current) setFlash(true);
    prevHp.current = localHp;
  }, [localHp]);
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
