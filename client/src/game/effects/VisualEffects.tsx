import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TracerProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: string;
  duration?: number;
}

export function BulletTracer({ start, end, color = "#ffea60", duration = 0.09 }: TracerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const opacityRef = useRef(1);

  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    dir.normalize();
    quat.setFromUnitVectors(up, dir);

    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  useEffect(() => {
    opacityRef.current = 1;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      opacityRef.current = Math.max(0, opacityRef.current - delta / duration);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = opacityRef.current;
      }
      meshRef.current.visible = opacityRef.current > 0;
    }
  });

  return (
    <group position={position} quaternion={quaternion}>
      {/* Sleek slim tracer outer streak */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.012, 0.012, length, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Fine inner core */}
      <mesh>
        <cylinderGeometry args={[0.005, 0.005, length, 4]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
