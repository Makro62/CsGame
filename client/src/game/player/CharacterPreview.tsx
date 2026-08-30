import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Lift so shoes sit on y=0; MinecraftCharacter feet sit slightly below origin. */
const FOOT_LIFT = 0.32;
const BODY_CENTER_Y = 1.02;

export function FitCharacterCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const shortPanel = size.height < 420;
    const narrowPanel = aspect < 0.72;
    const dist = shortPanel ? 5.8 : narrowPanel ? 5.3 : 4.8;
    const fov = shortPanel ? 36 : 30;
    camera.position.set(0, BODY_CENTER_Y, dist);
    camera.lookAt(0, BODY_CENTER_Y, 0);
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      persp.fov = fov;
      persp.near = 0.1;
      persp.far = 40;
      persp.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);

  return null;
}

export function PreviewTurntable({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group ref={ref} position={[0, FOOT_LIFT, 0]} rotation={[0, Math.PI, 0]}>
      {children}
    </group>
  );
}
