import { useEffect } from "react";

/**
 * Frees the mouse cursor while a full-screen menu is open and hands the pointer
 * lock back to the canvas when it closes. Without this the game keeps the lock
 * and the menu's buttons cannot be clicked at all.
 */
export function useMenuPointerLock(relockOnClose = true) {
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    return () => {
      if (!relockOnClose) return;
      const canvas = document.querySelector("canvas");
      canvas?.requestPointerLock();
    };
  }, [relockOnClose]);
}
