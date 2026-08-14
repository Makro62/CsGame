import { GlassPanel } from '../shared/GlassPanel'
import { Badge } from '../shared/Badge'
import { cn } from '../../../utils/cn'

interface BombIndicatorProps {
  hasBomb: boolean
  bombPlanted: boolean
  bombSite: string
  bombTimeLeft: number
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function BombIndicator({
  hasBomb,
  bombPlanted,
  bombSite,
  bombTimeLeft,
}: BombIndicatorProps) {
  if (!hasBomb && !bombPlanted) return null

  const isPanic = bombPlanted && bombTimeLeft <= 10

  return (
    <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      {hasBomb && !bombPlanted && (
        <Badge variant="gold" size="md" pulse>
          C4
        </Badge>
      )}

      {bombPlanted && (
        <GlassPanel
          className={cn(
            'px-6 py-2 flex items-center gap-2',
            isPanic && 'animate-panic-glow border-health-low/50'
          )}
          variant={isPanic ? 'danger' : 'default'}
        >
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full animate-pulse',
              isPanic ? 'bg-health-low' : 'bg-accent-gold'
            )}
          />
          <span className="font-mono text-sm font-bold">
            BOMB PLANTED - SITE {bombSite}
          </span>
          <span
            className={cn(
              'font-mono text-lg font-black',
              isPanic ? 'text-health-low animate-pulse' : 'text-accent-gold'
            )}
          >
            {formatTime(bombTimeLeft)}
          </span>
        </GlassPanel>
      )}
    </div>
  )
}
