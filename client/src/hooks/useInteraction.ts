import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useCallback, useState } from "react";

interface InteractiveUserData {
  skipShot?: boolean;
  isZombie?: boolean;
  interactiveType?: string;
  onInteract?: () => void;
}

function userDataOf(obj: THREE.Object3D): InteractiveUserData {
  return obj.userData as InteractiveUserData;
}

export function useInteraction(maxDistance = 3.5) {
  const { camera, scene } = useThree();
  const raycaster = new THREE.Raycaster();
  const [target, setTarget] = useState<THREE.Object3D | null>(null);

  useFrame(() => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let foundTarget: THREE.Object3D | null = null;
    for (const hit of intersects) {
      const hitData = userDataOf(hit.object);
      if (hitData.skipShot || hitData.isZombie) continue;
      if (hit.distance <= maxDistance) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (userDataOf(obj).interactiveType) {
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
    const onInteract = target ? userDataOf(target).onInteract : undefined;
    if (onInteract) onInteract();
  }, [target]);

  return { target, interact };
}
