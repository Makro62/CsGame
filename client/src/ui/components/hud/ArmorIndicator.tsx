import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface ArmorIndicatorProps {
  armor: number
  hasHelmet: boolean
  maxArmor?: number
}

/**
 * ArmorIndicator - Displays armor/kevlar status with helmet indicator
 */
export function ArmorIndicator({
  armor,
  hasHelmet,
  maxArmor = 100,
}: ArmorIndicatorProps) {
  const armorPercent = (armor / maxArmor) * 100
  const hasArmor = armor > 0

  return (
    <GlassPanel className={cn('p-3 min-w-[140px]', !hasArmor && 'opacity-50')}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-armor uppercase tracking-wider">
          ARMOR
        </span>
        {hasArmor && (
          <span className="text-xs font-bold text-armor">{armor}</span>
        )}
      </div>

      {hasArmor && (
        <>
          {/* Armor bar */}
          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-armor rounded-full transition-all duration-300"
              style={{ width: `${armorPercent}%` }}
            />
          </div>

          {/* Helmet indicator */}
          {hasHelmet && (
            <div className="flex items-center gap-1 px-2 py-1 bg-armor/10 rounded border border-armor/30">
              <span className="text-sm">🎖️</span>
              <span className="text-xs font-bold text-armor">
                COMBAT HELMET
              </span>
            </div>
          )}
        </>
      )}

      {!hasArmor && (
        <div className="text-xs font-bold text-text-muted text-center py-2">
          NO ARMOR
        </div>
      )}
    </GlassPanel>
  )
}
