import { useEffect, useState } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import { gameEvents } from "../lib/gameEvents";

interface FlashState {
  opacity: number;
  startTime: number;
  duration: number;
}

export function FlashEffect() {
  const [flash, setFlash] = useState<FlashState | null>(null);
  const sessionId = useNetworkStore((s) => s.sessionId);

  useEffect(() => {
    const onFlash = (detail: { x: number; y: number; z: number; throwerId: string }) => {
      if (!detail) return;
      const { localX, localZ } = useNetworkStore.getState();
      const dist = Math.sqrt(
        (detail.x - localX) ** 2 + (detail.z - localZ) ** 2
      );
      const maxDist = 15;
      if (dist > maxDist) return;

      const strength = Math.max(0.2, 1 - dist / maxDist);
      const selfThrown = detail.throwerId === sessionId;
      const opacity = selfThrown ? strength * 0.7 : strength;

      setFlash({
        opacity,
        startTime: performance.now(),
        duration: selfThrown ? 1.2 : 2.4,
      });
    };
    gameEvents.on("flashbang", onFlash);
    return () => gameEvents.off("flashbang", onFlash);
  }, [sessionId]);

  useEffect(() => {
    if (!flash) return;
    const raf = () => {
      const elapsed = (performance.now() - flash.startTime) / 1000;
      const progress = elapsed / flash.duration;
      if (progress >= 1) {
        setFlash(null);
        return;
      }
      // Fast fade-in, slow fade-out
      const fadeIn = Math.min(1, (elapsed / 0.15) * flash.opacity);
      const fadeOut = progress > 0.5 ? 1 - (progress - 0.5) * 2 : 1;
      const opacity = fadeIn * fadeOut * flash.opacity;
      const overlay = document.getElementById("flash-overlay");
      if (overlay) overlay.style.opacity = String(opacity);
      requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [flash]);

  return (
    <div
      id="flash-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        opacity: flash ? flash.opacity : 0,
        pointerEvents: "none",
        zIndex: 400,
        transition: "opacity 0.05s linear",
      }}
    />
  );
}