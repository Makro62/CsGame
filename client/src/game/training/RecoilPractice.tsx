import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useWeaponStore } from "../../stores/useWeaponStore";

const MAX_DECALS = 50;
const DECAL_LIFETIME = 10000; // 10 seconds

interface Decal {
  id: string;
  position: THREE.Vector3;
  createdAt: number;
  mesh: THREE.Mesh | null;
}

export function RecoilPractice() {
  const { scene, camera } = useThree();
  const decals = useRef<Decal[]>([]);
  const { activeWeapon, currentAmmo, isReloading } = useWeaponStore();

  // Clean up old decals
  useFrame(() => {
    const now = performance.now();
    decals.current = decals.current.filter((decal) => {
      if (now - decal.createdAt > DECAL_LIFETIME) {
        if (decal.mesh) {
          scene.remove(decal.mesh);
          decal.mesh.geometry.dispose();
          (decal.mesh.material as THREE.Material).dispose();
        }
        return false;
      }
      return true;
    });
  });

  // Handle shooting to create decals
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || !activeWeapon || currentAmmo <= 0 || isReloading)
        return;

      // Get camera direction for raycasting
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      
      // Raycast to find impact point on the back wall (z = -34.5)
      // Plane equation: z = -34.5
      // Ray: camera.position + t * direction
      // t = (-34.5 - camera.position.z) / direction.z
      const t = (-34.5 - camera.position.z) / direction.z;
      
      if (t > 0) {
        const position = new THREE.Vector3(
          camera.position.x + direction.x * t + (Math.random() - 0.5) * 0.05,
          camera.position.y + direction.y * t + (Math.random() - 0.5) * 0.05,
          -34.5
        );
        
        createDecal(position);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [activeWeapon, currentAmmo, isReloading, camera]);

  const createDecal = (position: THREE.Vector3) => {
    // Remove oldest if at limit
    if (decals.current.length >= MAX_DECALS) {
      const oldest = decals.current.shift();
      if (oldest?.mesh) {
        scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geometry = new THREE.CircleGeometry(0.04, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(0, position.y, 0);
    scene.add(mesh);

    decals.current.push({
      id: `decal-${Date.now()}-${Math.random()}`,
      position: position.clone(),
      createdAt: performance.now(),
      mesh,
    });
  };

  return null;
}

export function RecoilPracticeUI() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "white",
        fontFamily: "monospace",
        fontSize: "12px",
        background: "rgba(0,0,0,0.7)",
        padding: "8px 16px",
        borderRadius: "4px",
        zIndex: 100,
        textAlign: "center",
      }}
    >
      <div>RECOIL PRACTICE - Shoot the wall to see patterns</div>
      <div style={{ fontSize: "10px", color: "#9ca3af" }}>
        Infinite ammo • Bullet holes last 10s
      </div>
    </div>
  );
}
