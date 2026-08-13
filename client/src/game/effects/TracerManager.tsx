import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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

  useEffect(() => {
    let raf = 0;
    const onTracer = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        start: THREE.Vector3;
        end: THREE.Vector3;
      };
      if (!detail?.start || !detail?.end) return;
      setTracers((prev) => {
        const now = performance.now();
        const alive = prev.filter((t) => now - t.createdAt < TRACER_DURATION * 1000);
        if (alive.length >= MAX_TRACERS) alive.shift();
        idRef.current += 1;
        return [
          ...alive,
          {
            id: idRef.current,
            start: detail.start.clone(),
            end: detail.end.clone(),
            createdAt: now,
          },
        ];
      });

      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          setTracers((prev) =>
            prev.filter((t) => performance.now() - t.createdAt < TRACER_DURATION * 1000)
          );
        });
      }
    };
    window.addEventListener("tracer", onTracer);
    return () => {
      window.removeEventListener("tracer", onTracer);
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