import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface GrenadeIndicatorProps {
  heGrenades: number
  smokeGrenades: number
  flashGrenades: number
  selectedType?: 'he' | 'smoke' | 'flash' | 'none'
  maxGrenades?: number
}

/**
 * GrenadeIndicator - Displays available grenades
 * Shows equipped grenade type and counts
 */
export function GrenadeIndicator({
  heGrenades,
  smokeGrenades,
  flashGrenades,
  selectedType = 'none',
  maxGrenades = 3,
}: GrenadeIndicatorProps) {
  const totalGrenades = heGrenades + smokeGrenades + flashGrenades
  const isMax = totalGrenades >= maxGrenades

  const grenades = [
    { type: 'he' as const, label: 'HE', count: heGrenades, icon: '💣' },
    {
      type: 'smoke' as const,
      label: 'SMOKE',
      count: smokeGrenades,
      icon: '💨',
    },
    {
      type: 'flash' as const,
      label: 'FLASH',
      count: flashGrenades,
      icon: '⚡',
    },
  ]

  return (
    <GlassPanel className="p-3 min-w-[140px]">
      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
        GRENADES
      </div>

      <div className="space-y-1">
        {grenades.map(grenade => (
          <div
            key={grenade.type}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded transition-all',
              selectedType === grenade.type
                ? 'bg-accent-gold/20 border border-accent-gold/50'
                : 'bg-bg-secondary/50'
            )}
          >
            <span className="text-lg">{grenade.icon}</span>
            <span className="text-xs font-bold text-text-muted flex-1">
              {grenade.label}
            </span>
            <span
              className={cn(
                'text-sm font-bold font-mono',
                grenade.count > 0 ? 'text-accent-gold' : 'text-text-muted'
              )}
            >
              {grenade.count}
            </span>
          </div>
        ))}
      </div>

      {/* Grenade count indicator */}
      <div className="mt-2 flex gap-1 justify-center">
        {Array.from({ length: maxGrenades }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              i < totalGrenades ? 'bg-accent-gold' : 'bg-bg-secondary'
            )}
          />
        ))}
      </div>

      {isMax && (
        <div className="mt-1.5 text-[10px] font-bold text-accent-gold text-center animate-pulse">
          MAX GRENADES
        </div>
      )}
    </GlassPanel>
  )
}
