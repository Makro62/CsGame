import { useEffect } from "react";
import { gameEvents } from "../lib/gameEvents";
import { useGameStore } from "../stores/useGameStore";
import { useProgressStore } from "../stores/useProgressStore";

export function ProgressBridge() {
  useEffect(() => {
    const onHit = (data: { headshot: boolean; killed?: boolean }) => {
      if (!data.killed) return;
      const mode = useGameStore.getState().mode;
      if (mode === "menu" || mode === "training") return;
      useProgressStore.getState().recordKill({ headshot: data.headshot });
    };

    const onDamaged = (data: { isDead: boolean; isHeadshot: boolean }) => {
      if (!data.isDead) return;
      if (useGameStore.getState().mode !== "training") return;
      useProgressStore.getState().recordKill({ headshot: data.isHeadshot });
    };

    gameEvents.on("hitMarker", onHit);
    gameEvents.on("targetDamaged", onDamaged);
    return () => {
      gameEvents.off("hitMarker", onHit);
      gameEvents.off("targetDamaged", onDamaged);
    };
  }, []);

  return null;
}
