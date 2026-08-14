import { cn } from '../../../utils/cn'

interface ZoneIndicatorProps {
  zone?: 'buy' | 'plant' | 'bomb_site' | 'none'
  isActive?: boolean
}

/**
 * ZoneIndicator - Shows if player is in a special zone
 * Displays buy zone, bomb plant zone, or bomb site
 */
export function ZoneIndicator({
  zone = 'none',
  isActive = false,
}: ZoneIndicatorProps) {
  if (zone === 'none') return null

  const zoneInfo = {
    buy: {
      label: 'BUY ZONE',
      icon: '🏪',
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/20',
      borderColor: 'border-accent-cyan/50',
    },
    plant: {
      label: 'PLANT ZONE',
      icon: '🎯',
      color: 'text-accent-gold',
      bgColor: 'bg-accent-gold/20',
      borderColor: 'border-accent-gold/50',
    },
    bomb_site: {
      label: 'BOMB SITE',
      icon: '💣',
      color: 'text-health-low',
      bgColor: 'bg-health-low/20',
      borderColor: 'border-health-low/50',
    },
  }

  const info = zoneInfo[zone]

  return (
    <div
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'px-6 py-3 rounded-lg border-2 font-bold tracking-widest',
        'text-center pointer-events-none z-20',
        'transition-all duration-300',
        info.color,
        info.bgColor,
        info.borderColor,
        isActive && 'animate-pulse-scale'
      )}
    >
      <div className="text-2xl mb-1">{info.icon}</div>
      <div className="text-sm font-display">{info.label}</div>
    </div>
  )
}
