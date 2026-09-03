/**
 * Rain / snow / dust points for the procedural 5v5 map.
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WeatherParticleConfig } from "./MapVariants";

export function WeatherParticles({
  config,
  bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
  height = 20,
}: {
  config: WeatherParticleConfig;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  height?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = config.count;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      pos[i3 + 1] = Math.random() * height;
      pos[i3 + 2] = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      vel[i3] = config.windX * (0.5 + Math.random() * 0.5);
      vel[i3 + 1] = -config.speed * (0.8 + Math.random() * 0.4);
      vel[i3 + 2] = config.windZ * (0.5 + Math.random() * 0.5);
    }
    return [pos, vel];
  }, [count, bounds, height, config]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3] * delta;
      arr[i3 + 1] += velocities[i3 + 1] * delta;
      arr[i3 + 2] += velocities[i3 + 2] * delta;

      if (arr[i3 + 1] < 0 || arr[i3] < bounds.minX - 5 || arr[i3] > bounds.maxX + 5 || arr[i3 + 2] < bounds.minZ - 5 || arr[i3 + 2] > bounds.maxZ + 5) {
        arr[i3] = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        arr[i3 + 1] = height + Math.random() * 3;
        arr[i3 + 2] = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
      }
    }
    posAttr.needsUpdate = true;
  });

  if (config.type === "none") return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={config.color}
        size={config.size}
        transparent
        opacity={config.opacity}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
