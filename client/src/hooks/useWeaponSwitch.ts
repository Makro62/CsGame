import { useState, useEffect } from 'react'
import { useWeaponStore } from '../stores/useWeaponStore'

export function useWeaponSwitch() {
  const [buyMenuOpen, setBuyMenuOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'KeyB') {
        setBuyMenuOpen(o => !o)
        return
      }

      // Read from store at event time to avoid closure staleness
      const state = useWeaponStore.getState()
      const { equipWeapon, primaryWeapon, secondaryWeapon } = state

      if (e.code === 'Digit1') {
        // Slot 1: Primary Weapon
        const primary = primaryWeapon || 'ak47'
        equipWeapon(primary)
      } else if (e.code === 'Digit2') {
        // Slot 2: Secondary Pistol
        const secondary = secondaryWeapon || 'deagle'
        equipWeapon(secondary)
      } else if (e.code === 'Digit3') {
        // Slot 3: Knife
        equipWeapon('knife')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleBuyMenu = () => setBuyMenuOpen(o => !o)
  const closeBuyMenu = () => setBuyMenuOpen(false)

  return { buyMenuOpen, toggleBuyMenu, closeBuyMenu }
}
