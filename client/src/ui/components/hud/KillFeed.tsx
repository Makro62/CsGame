import { useEffect, useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

export interface KillEvent {
  id: string
  killerName: string
  victimName: string
  weapon: string
  headshot: boolean
  teamKill?: boolean
}

interface KillFeedProps {
  events: KillEvent[]
  maxEvents?: number
}

/**
 * KillFeed - Displays recent kill events with animations
 * Supports team kill detection and headshot indicators
 */
export function KillFeed({ events, maxEvents = 5 }: KillFeedProps) {
  const [visibleEvents, setVisibleEvents] = useState<KillEvent[]>([])

  useEffect(() => {
    const newEvents = events.slice(0, maxEvents)
    setVisibleEvents(newEvents)
  }, [events, maxEvents])

  return (
    <div className="flex flex-col gap-1 items-end">
      {visibleEvents.map((event, index) => (
        <KillFeedItem
          key={event.id}
          event={event}
          index={index}
          isNew={index === 0}
        />
      ))}
    </div>
  )
}

interface KillFeedItemProps {
  event: KillEvent
  index: number
  isNew: boolean
}

function KillFeedItem({ event, index, isNew }: KillFeedItemProps) {
  return (
    <GlassPanel
      className={cn(
        'px-3 py-1.5 flex items-center gap-2 text-sm',
        'animate-slide-in-right',
        isNew && 'animate-kill-flash',
        event.teamKill && 'border-health-low/30'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Killer */}
      <span
        className={cn(
          'font-semibold',
          event.teamKill ? 'text-health-low' : 'text-terrorist'
        )}
      >
        {event.killerName}
      </span>

      {/* Weapon Icon */}
      <span className="text-text-muted text-xs">
        [{event.weapon.toUpperCase()}]
      </span>

      {/* Headshot indicator */}
      {event.headshot && (
        <span className="text-accent-gold text-xs font-bold animate-pulse">
          HS
        </span>
      )}

      {/* Victim */}
      <span className="font-semibold text-counter">{event.victimName}</span>
    </GlassPanel>
  )
}
