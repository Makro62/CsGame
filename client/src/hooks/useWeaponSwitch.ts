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

      // Slot 1: Primary Weapon
      if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
        useWeaponStore.getState().switchToSlot(1)
      }
      // Slot 2: Secondary Pistol
      else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
        useWeaponStore.getState().switchToSlot(2)
      }
      // Slot 3: Knife
      else if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') {
        useWeaponStore.getState().switchToSlot(3)
      }
    }

    function handleWheel(e: WheelEvent) {
      const state = useWeaponStore.getState()
      const current = state.activeWeapon
      const primary = state.primaryWeapon || 'ak47'
      const secondary = state.secondaryWeapon || 'deagle'
      const knife = state.knifeSlot || 'knife'

      const isPrimary = current === primary
      const isSecondary = current === secondary
      const isKnife = current === knife

      if (e.deltaY > 0) {
        // Wheel down: 1 -> 2 -> 3 -> 1
        if (isPrimary) state.switchToSlot(2)
        else if (isSecondary) state.switchToSlot(3)
        else state.switchToSlot(1)
      } else if (e.deltaY < 0) {
        // Wheel up: 1 -> 3 -> 2 -> 1
        if (isPrimary) state.switchToSlot(3)
        else if (isKnife) state.switchToSlot(2)
        else state.switchToSlot(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const toggleBuyMenu = () => setBuyMenuOpen(o => !o)
  const closeBuyMenu = () => setBuyMenuOpen(false)

  return { buyMenuOpen, toggleBuyMenu, closeBuyMenu }
}
