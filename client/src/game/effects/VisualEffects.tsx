import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Muzzle flash effect
export function MuzzleFlash({ position, active }: { position: THREE.Vector3; active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.visible = active;
    }
    if (lightRef.current) {
      lightRef.current.intensity = active ? 5 : 0;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[0, 0, Math.random() * Math.PI * 2]}>
        <planeGeometry args={[0.15, 0.15]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={meshRef} rotation={[0, 0, Math.random() * Math.PI * 2]}>
        <planeGeometry args={[0.1, 0.1]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight ref={lightRef} color="#ffaa00" intensity={0} distance={3} decay={2} />
    </group>
  );
}

// Bullet tracer effect
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

// Impact spark effect
interface ImpactSparkProps {
  position: THREE.Vector3;
}

export function ImpactSpark({ position }: ImpactSparkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());
  const particles = useRef<{ velocity: THREE.Vector3; life: number }[]>([]);

  useEffect(() => {
    startTime.current = performance.now();
    particles.current = Array.from({ length: 8 }, () => ({
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      life: 0.3 + Math.random() * 0.2,
    }));
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;

    groupRef.current.children.forEach((child, i) => {
      const p = particles.current[i];
      if (!p) return;

      if (elapsed < p.life) {
        child.position.add(p.velocity.clone().multiplyScalar(0.016));
        p.velocity.y -= 9.81 * 0.016;
        const mat = (child as THREE.Mesh).material as THREE.Material;
        if (mat.opacity !== undefined) mat.opacity = 1 - elapsed / p.life;
        child.visible = true;
      } else {
        child.visible = false;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.02]} />
          <meshBasicMaterial
            color="#ffaa00"
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// Screen shake effect
export function ScreenShake({ intensity = 0.1, duration = 0.1 }: { intensity?: number; duration?: number }) {
  const { camera } = useThree();
  const shakeRef = useRef({ active: false, startTime: 0, intensity: 0, duration: 0 });
  const originalPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleShoot = () => {
      if (!shakeRef.current.active) {
        originalPosition.current.copy(camera.position);
        shakeRef.current = {
          active: true,
          startTime: performance.now(),
          intensity,
          duration,
        };
      }
    };

    window.addEventListener("shoot", handleShoot);
    return () => window.removeEventListener("shoot", handleShoot);
  }, [camera, intensity, duration]);

  useFrame(() => {
    if (!shakeRef.current.active) return;

    const elapsed = (performance.now() - shakeRef.current.startTime) / 1000;
    if (elapsed > shakeRef.current.duration) {
      shakeRef.current.active = false;
      camera.position.copy(originalPosition.current);
      return;
    }

    const progress = elapsed / shakeRef.current.duration;
    const decay = 1 - progress;
    const shake = shakeRef.current.intensity * decay;

    camera.position.x = originalPosition.current.x + (Math.random() - 0.5) * shake;
    camera.position.y = originalPosition.current.y + (Math.random() - 0.5) * shake;
  });

  return null;
}

// Shell casing effect
interface ShellCasingProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

export function ShellCasing({ position, direction }: ShellCasingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocity = useRef(new THREE.Vector3());
  const startTime = useRef(performance.now());

  useEffect(() => {
    startTime.current = performance.now();
    velocity.current.set(
      direction.x * 2 + (Math.random() - 0.5) * 0.5,
      3 + Math.random() * 2,
      direction.z * 2 + (Math.random() - 0.5) * 0.5
    );
  }, [direction]);

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = (performance.now() - startTime.current) / 1000;
    if (elapsed > 1) {
      meshRef.current.visible = false;
      return;
    }

    velocity.current.y -= 9.81 * 0.016;
    meshRef.current.position.add(velocity.current.clone().multiplyScalar(0.016));
    meshRef.current.rotation.x += 0.1;
    meshRef.current.rotation.z += 0.05;

    if (meshRef.current.position.y < 0) {
      meshRef.current.position.y = 0;
      velocity.current.y *= -0.3;
      velocity.current.x *= 0.8;
      velocity.current.z *= 0.8;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.005, 0.005, 0.02, 6]} />
      <meshBasicMaterial color="#ffcc00" />
    </mesh>
  );
}

// Blood splatter effect
interface BloodSplatterProps {
  position: THREE.Vector3;
}

export function BloodSplatter({ position }: BloodSplatterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(performance.now());

  useEffect(() => {
    startTime.current = performance.now();
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = (performance.now() - startTime.current) / 1000;
    const opacity = Math.max(0, 1 - elapsed / 0.5);
    groupRef.current.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.Material;
      if (mat.opacity !== undefined) mat.opacity = opacity;
    });
    groupRef.current.visible = opacity > 0;
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
          ]}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
        >
          <planeGeometry args={[0.05, 0.05]} />
          <meshBasicMaterial color="#8b0000" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
