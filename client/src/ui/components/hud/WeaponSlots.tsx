import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface WeaponSlot {
  slot: number
  weaponName: string
  isActive: boolean
}

interface WeaponSlotsProps {
  slots: WeaponSlot[]
}

export function WeaponSlots({ slots }: WeaponSlotsProps) {
  return (
    <GlassPanel className="px-3 py-2 flex gap-3 text-xs font-mono">
      {slots.map(slot => (
        <div
          key={slot.slot}
          className={cn(
            'transition-colors duration-200',
            slot.isActive ? 'text-health-full font-bold' : 'text-text-muted'
          )}
        >
          <span className="text-text-muted">{slot.slot}:</span>{' '}
          {slot.weaponName ? slot.weaponName.toUpperCase() : '-'}
        </div>
      ))}
    </GlassPanel>
  )
}
