import { useCallback, useEffect } from "react";
import * as THREE from "three";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { zombieEngine } from "../zombie/ZombieEngine";

export function ZombieShootingSystem({ engineRef }: { engineRef?: React.RefObject<typeof zombieEngine> }) {
  const weapon = useWeaponStore(s => s.activeWeapon);
  const isReloading = useWeaponStore(s => s.isReloading);
  const activeEngine = engineRef?.current ?? zombieEngine;

  const shoot = useCallback(() => {
    if (isReloading) return;
    const engine = activeEngine; if (!engine) return;

    const aimData = (window as unknown as Record<string, unknown>).__zombieAim as { origin: THREE.Vector3; direction: THREE.Vector3 } | undefined;
    if (!aimData) return;

    const damage = weapon === "awp" ? 150 : weapon === "shotgun" ? 15 : 35;
    const isHeadshot = Math.random() < 0.15;

    engine.handleShoot(aimData.origin as THREE.Vector3, aimData.direction as THREE.Vector3, damage, isHeadshot);
  }, [weapon, isReloading, activeEngine]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) shoot();
    };
    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [shoot]);

  return null;
}
