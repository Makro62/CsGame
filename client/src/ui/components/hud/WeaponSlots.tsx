import { useWeaponStore } from '../../../stores/useWeaponStore'

interface WeaponSlot {
  slot: number
  weaponName: string
  isActive: boolean
}

interface WeaponSlotsProps {
  slots: WeaponSlot[]
}

export function WeaponSlots({ slots }: WeaponSlotsProps) {
  const switchToSlot = useWeaponStore((s) => s.switchToSlot)
  const cycleGrenadeType = useWeaponStore((s) => s.cycleGrenadeType)

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '6px 10px',
        display: 'flex',
        gap: '6px',
        userSelect: 'none',
        pointerEvents: 'auto',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
        fontFamily: "'Inter', monospace, sans-serif",
      }}
    >
      {slots.map((slot) => {
        const hasWeapon = !!slot.weaponName && slot.weaponName !== '-'
        if (!hasWeapon && slot.slot > 3) return null

        return (
          <button
            key={slot.slot}
            onClick={(e) => {
              e.stopPropagation()
              if (slot.slot === 4) {
                cycleGrenadeType()
              } else {
                switchToSlot(slot.slot as 1 | 2 | 3 | 4)
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: slot.isActive
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.6))'
                : 'rgba(0, 0, 0, 0.25)',
              border: slot.isActive
                ? '1px solid #60a5fa'
                : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: slot.isActive ? '0 0 12px rgba(59, 130, 246, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 900,
                color: slot.isActive ? '#93c5fd' : '#64748b',
              }}
            >
              {slot.slot}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: slot.isActive ? 800 : 600,
                color: slot.isActive ? '#ffffff' : '#94a3b8',
                letterSpacing: '0.5px',
              }}
            >
              {slot.weaponName ? slot.weaponName.toUpperCase() : 'EMPTY'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
