import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TracerProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  duration?: number;
}

export function BulletTracer({ start, end, color = "#ffffff", duration = 0.05 }: TracerProps) {
  const lineRef = useRef<THREE.Line>(null);
  const opacityRef = useRef(1);

  useEffect(() => {
    opacityRef.current = 1;
  }, []);

  useFrame((_, delta) => {
    if (lineRef.current) {
      opacityRef.current = Math.max(0, opacityRef.current - delta / duration);
      const mat = lineRef.current.material as THREE.Material;
      if (mat.opacity !== undefined) mat.opacity = opacityRef.current;
      lineRef.current.visible = opacityRef.current > 0;
    }
  });

  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <primitive ref={lineRef} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }))} />
  );
}
