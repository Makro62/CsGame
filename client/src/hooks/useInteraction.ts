import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCallback, useState } from "react";

export function useInteraction(maxDistance = 3.5) {
  const { camera, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  const [target, setTarget] = useState<THREE.Object3D | null>(null);

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let foundTarget: THREE.Object3D | null = null;
    for (const hit of intersects) {
      if ((hit.object as any).userData?.skipShot || (hit.object as any).userData?.isZombie) continue;
      if (hit.distance <= maxDistance) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if ((obj as any).userData?.interactiveType) {
            foundTarget = obj;
            break;
          }
          obj = obj.parent;
        }
        if (foundTarget) break;
      }
    }
    if (foundTarget !== target) setTarget(foundTarget);
  });

  const interact = useCallback(() => {
    if (target && (target as any).userData?.onInteract) {
      (target as any).userData.onInteract();
    }
  }, [target]);

  return { target, interact };
}
