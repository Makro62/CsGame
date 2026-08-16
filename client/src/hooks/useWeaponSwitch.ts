import { useState, useEffect, useRef } from 'react'
import { useWeaponStore } from '../stores/useWeaponStore'

function isTyping(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    (el as HTMLElement).isContentEditable === true
  )
}

export function useWeaponSwitch() {
  const [buyMenuOpen, setBuyMenuOpen] = useState(false)
  // Read inside the listeners so they always see the current menu state.
  const buyMenuOpenRef = useRef(false)
  buyMenuOpenRef.current = buyMenuOpen

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping()) return

      if (e.code === 'KeyB') {
        setBuyMenuOpen(o => !o)
        return
      }

      // The buy menu owns the number keys while it is open.
      if (buyMenuOpenRef.current) return

      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        useWeaponStore.getState().switchToSlot(1)
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        useWeaponStore.getState().switchToSlot(2)
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        useWeaponStore.getState().switchToSlot(3)
      }
    }

    function handleWheel(e: WheelEvent) {
      if (buyMenuOpenRef.current || isTyping()) return

      const state = useWeaponStore.getState()
      const order: Array<1 | 2 | 3> = [1, 2, 3]
      const slotOf = (weapon: string | null): 1 | 2 | 3 | null => {
        if (!weapon) return null
        if (weapon === state.primaryWeapon) return 1
        if (weapon === state.secondaryWeapon) return 2
        if (weapon === state.knifeSlot) return 3
        return null
      }
      const weaponOf = (slot: 1 | 2 | 3) =>
        slot === 1 ? state.primaryWeapon : slot === 2 ? state.secondaryWeapon : state.knifeSlot

      const current = slotOf(state.activeWeapon) ?? 3
      const step = e.deltaY > 0 ? 1 : -1

      // Skip empty slots so the wheel never stalls on a slot we do not own.
      for (let i = 1; i <= order.length; i++) {
        const next = (((current - 1 + step * i) % 3) + 3) % 3
        const slot = order[next]
        if (weaponOf(slot)) {
          state.switchToSlot(slot)
          return
        }
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
