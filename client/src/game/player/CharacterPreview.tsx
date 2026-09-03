import { useLayoutEffect, useRef, useEffect, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Lift so shoes sit on y=0; MinecraftCharacter feet sit slightly below origin. */
const FOOT_LIFT = 0.32;
const BODY_CENTER_Y = 1.05;

export function FitCharacterCamera() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const shortPanel = size.height < 420;
    const narrowPanel = aspect < 0.72;
    // Generous distance and FOV so all character models (including tall/helmeted) have ample headroom
    const dist = shortPanel ? 6.2 : narrowPanel ? 5.6 : 5.1;
    const fov = shortPanel ? 38 : 34;
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
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const autoRotate = useRef(true);
  const idleTimer = useRef<number | null>(null);
  const { gl } = useThree();

  useEffect(() => {
    const dom = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      autoRotate.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !ref.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      ref.current.rotation.y += dx * 0.01;
    };
    const onPointerUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        autoRotate.current = true;
      }, 1800);
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [gl]);

  useFrame((_, dt) => {
    if (ref.current && autoRotate.current && !isDragging.current) {
      ref.current.rotation.y += dt * 0.35;
    }
  });

  return (
    // Start facing forward at a subtle heroic 3/4 angle
    <group ref={ref} position={[0, FOOT_LIFT, 0]} rotation={[0, -0.15, 0]}>
      {children}
    </group>
  );
}
