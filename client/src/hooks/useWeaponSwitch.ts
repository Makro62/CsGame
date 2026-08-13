import { useState, useEffect } from "react";
import { useWeaponStore } from "../stores/useWeaponStore";

export function useWeaponSwitch() {
  const [buyMenuOpen, setBuyMenuOpen] = useState(false);
  const { equipWeapon, primaryWeapon, secondaryWeapon } = useWeaponStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyB") {
        setBuyMenuOpen((o) => !o);
        return;
      }

      if (e.code === "Digit1") {
        // Slot 1: Primary Weapon
        const primary = primaryWeapon || "ak47";
        equipWeapon(primary);
      } else if (e.code === "Digit2") {
        // Slot 2: Secondary Pistol
        const secondary = secondaryWeapon || "deagle";
        equipWeapon(secondary);
      } else if (e.code === "Digit3") {
        // Slot 3: Knife
        equipWeapon("knife");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [equipWeapon, primaryWeapon, secondaryWeapon]);

  const toggleBuyMenu = () => setBuyMenuOpen((o) => !o);
  const closeBuyMenu = () => setBuyMenuOpen(false);

  return { buyMenuOpen, toggleBuyMenu, closeBuyMenu };
}
