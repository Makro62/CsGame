import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "../../stores/useGameStore";
import { BulletTracer } from "./VisualEffects";

interface Tracer {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  createdAt: number;
}

const TRACER_DURATION = 0.08;
const MAX_TRACERS = 24;

export function TracerManager() {
  const [tracers, setTracers] = useState<Tracer[]>([]);
  const idRef = useRef(0);
  const lastEvent = useRef(useGameStore.getState().tracerEvent);

  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      if (state.tracerEvent && state.tracerEvent !== lastEvent.current) {
        lastEvent.current = state.tracerEvent;
        const { start, end } = state.tracerEvent;
        setTracers((prev) => {
          const now = performance.now();
          const alive = prev.filter((t) => now - t.createdAt < TRACER_DURATION * 1000);
          if (alive.length >= MAX_TRACERS) alive.shift();
          idRef.current += 1;
          return [
            ...alive,
            {
              id: idRef.current,
              start: new THREE.Vector3(start.x, start.y, start.z),
              end: new THREE.Vector3(end.x, end.y, end.z),
              createdAt: now,
            },
          ];
        });
      }
    });

    let raf = 0;
    const cleanup = () => {
      setTracers((prev) =>
        prev.filter((t) => performance.now() - t.createdAt < TRACER_DURATION * 1000)
      );
      raf = 0;
    };

    const tick = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        cleanup();
      });
    };

    const interval = setInterval(tick, 16);

    return () => {
      unsub();
      clearInterval(interval);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <group>
      {tracers.map((t) => (
        <BulletTracer
          key={t.id}
          start={t.start}
          end={t.end}
          duration={TRACER_DURATION}
          color="#ffd54a"
        />
      ))}
    </group>
  );
}
