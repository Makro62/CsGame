import { useEffect, useRef } from "react";
import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useNetworkStore } from "../../stores/useNetworkStore";
import { Sound } from "../../components/AudioManager";

const RELOAD_CANCEL_WINDOW = 0.5; // Up to 50% of reload time can be cancelled by user

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

  // Handle R key for manual reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && activeWeapon && !isReloading) {
        const stats = WEAPONS[activeWeapon];
        if (stats && stats.reload > 0 && currentAmmo < maxAmmo) {
          startReload();
          sendReload();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWeapon, isReloading, currentAmmo, maxAmmo, startReload, sendReload]);

  // Handle reload timer and audio sequence
  useEffect(() => {
    if (isReloading && activeWeapon) {
      const stats = WEAPONS[activeWeapon];
      if (!stats || stats.reload <= 0) {
        cancelReload();
        return;
      }

      reloadStartTime.current = performance.now();

      // Trigger audio sequence
      Sound.reloadSequence(activeWeapon, stats.reload);

      reloadTimer.current = setTimeout(() => {
        finishReload();
      }, stats.reload * 1000);

      return () => {
        if (reloadTimer.current) {
          clearTimeout(reloadTimer.current);
          reloadTimer.current = null;
        }
      };
    } else {
      Sound.cancelReload();
    }
  }, [isReloading, activeWeapon, finishReload, cancelReload]);

  // Handle reload cancel (right click)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (isReloading && e.button === 2) {
        const elapsed = performance.now() - reloadStartTime.current;
        const reloadTime = activeWeapon ? WEAPONS[activeWeapon].reload * 1000 : 0;
        const progress = reloadTime > 0 ? elapsed / reloadTime : 1;

        if (progress < RELOAD_CANCEL_WINDOW) {
          cancelReload();
          Sound.cancelReload();
          if (reloadTimer.current) {
            clearTimeout(reloadTimer.current);
            reloadTimer.current = null;
          }
        }
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [isReloading, activeWeapon, cancelReload]);

  // Auto-reload when weapon clip is empty and weapon is reloadable
  useEffect(() => {
    if (activeWeapon && currentAmmo === 0 && !isReloading) {
      const stats = WEAPONS[activeWeapon];
      if (stats && stats.reload > 0 && maxAmmo > 0) {
        startReload();
        sendReload();
      }
    }
  }, [activeWeapon, currentAmmo, maxAmmo, isReloading, startReload, sendReload]);

  return null;
}
