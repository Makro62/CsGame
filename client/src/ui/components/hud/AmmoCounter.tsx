import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface AmmoCounterProps {
  current: number
  max: number
  reserve: number
  isReloading: boolean
  isSwitching: boolean
  weaponName: string
}

/**
 * AmmoCounter - Displays current ammo, reserve, and reload/switch status
 * Includes animations for reload progress and low-ammo warnings
 */
export function AmmoCounter({
  current,
  max,
  reserve,
  isReloading,
  isSwitching,
  weaponName,
}: AmmoCounterProps) {
  const isLow = current <= max * 0.25 && current > 0
  const isEmpty = current === 0

  return (
    <GlassPanel className="p-3 min-w-[120px] text-right">
      {/* Weapon Name */}
      <div className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1">
        {isReloading ? (
          <span className="text-ammo-reload animate-pulse">RELOADING...</span>
        ) : isSwitching ? (
          <span className="text-text-muted">SWITCHING...</span>
        ) : (
          weaponName
        )}
      </div>

      {/* Ammo Numbers */}
      <div className="flex items-baseline justify-end gap-1">
        <span
          className={cn(
            'text-3xl font-black font-mono leading-none transition-colors duration-200',
            isEmpty && 'text-ammo-low animate-pulse',
            isLow && 'text-ammo-low',
            !isEmpty && !isLow && 'text-ammo-full'
          )}
        >
          {isReloading ? '—' : current}
        </span>
        <span className="text-lg font-mono text-text-muted">/</span>
        <span className="text-lg font-mono text-text-secondary">{reserve}</span>
      </div>

      {/* Low ammo warning bar */}
      {!isReloading && !isSwitching && (
        <div className="mt-2 h-0.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isEmpty
                ? 'bg-ammo-low w-0'
                : isLow
                  ? 'bg-ammo-low'
                  : 'bg-text-muted'
            )}
            style={{ width: isEmpty ? '0%' : `${(current / max) * 100}%` }}
          />
        </div>
      )}

      {/* Reload progress bar */}
      {isReloading && (
        <div className="mt-2 h-0.5 bg-bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-ammo-reload rounded-full animate-reload-progress" />
        </div>
      )}
    </GlassPanel>
  )
}
