import { useEffect, useRef } from "react";
import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useNetworkStore } from "../../stores/useNetworkStore";

const RELOAD_CANCEL_WINDOW = 0.4; // 40% of reload time

export function ReloadSystem() {
  const {
    activeWeapon,
    isReloading,
    currentAmmo,
    maxAmmo,
    startReload,
    cancelReload,
    finishReload,
  } = useWeaponStore();
  const { sendReload } = useNetworkStore();

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadStartTime = useRef<number>(0);

  // Handle R key for reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && activeWeapon && !isReloading) {
        if (currentAmmo < maxAmmo) {
          startReload();
          sendReload();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWeapon, isReloading, currentAmmo, maxAmmo, startReload, sendReload]);

  // Handle reload timer
  useEffect(() => {
    if (isReloading && activeWeapon) {
      const stats = WEAPONS[activeWeapon];
      reloadStartTime.current = performance.now();

      reloadTimer.current = setTimeout(() => {
        finishReload();
      }, stats.reload * 1000);

      return () => {
        if (reloadTimer.current) {
          clearTimeout(reloadTimer.current);
        }
      };
    }
  }, [isReloading, activeWeapon, finishReload]);

  // Handle reload cancel (right click or shift)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (isReloading && e.button === 2) {
        // Right click to cancel
        const elapsed = performance.now() - reloadStartTime.current;
        const reloadTime = activeWeapon ? WEAPONS[activeWeapon].reload * 1000 : 0;
        const progress = elapsed / reloadTime;

        if (progress < RELOAD_CANCEL_WINDOW) {
          cancelReload();
          if (reloadTimer.current) {
            clearTimeout(reloadTimer.current);
          }
        }
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [isReloading, activeWeapon, cancelReload]);

  // Auto-reload when empty
  useEffect(() => {
    if (activeWeapon && currentAmmo === 0 && !isReloading) {
      startReload();
      sendReload();
    }
  }, [activeWeapon, currentAmmo, isReloading, startReload, sendReload]);

  return null;
}
