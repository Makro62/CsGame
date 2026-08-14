import { useEffect, useState } from 'react'
import { cn } from '../../../utils/cn'

export interface HitMarkerEvent {
  id: string
  damage: number
  direction?: 'up' | 'down' | 'left' | 'right'
  isHeadshot?: boolean
  isCritical?: boolean
}

interface HitMarkerProps {
  events: HitMarkerEvent[]
  size?: 'sm' | 'md' | 'lg'
}

/**
 * HitMarker - Displays impact feedback with damage numbers
 * Shows directional indicators and floating damage text
 */
export function HitMarker({ events, size = 'md' }: HitMarkerProps) {
  const [visibleEvents, setVisibleEvents] = useState<HitMarkerEvent[]>([])

  useEffect(() => {
    const newEvents = events.slice(-5) // Keep last 5 events visible
    setVisibleEvents(newEvents)
  }, [events])

  const sizeStyles = {
    sm: { container: 'w-16 h-16', cross: 'w-8 h-8' },
    md: { container: 'w-24 h-24', cross: 'w-12 h-12' },
    lg: { container: 'w-32 h-32', cross: 'w-16 h-16' },
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {/* Center crosshair impact indicator */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          sizeStyles[size].cross
        )}
      >
        <div className="relative w-full h-full">
          {/* Horizontal line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent-gold/30 -translate-y-1/2" />
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-accent-gold/30 -translate-x-1/2" />
          {/* Corner marks */}
          <div className="absolute top-0 left-0 w-1 h-1 border-t-2 border-l-2 border-accent-gold/50" />
          <div className="absolute top-0 right-0 w-1 h-1 border-t-2 border-r-2 border-accent-gold/50" />
          <div className="absolute bottom-0 left-0 w-1 h-1 border-b-2 border-l-2 border-accent-gold/50" />
          <div className="absolute bottom-0 right-0 w-1 h-1 border-b-2 border-r-2 border-accent-gold/50" />
        </div>
      </div>

      {/* Floating damage numbers */}
      {visibleEvents.map(event => (
        <DamageNumber key={event.id} event={event} size={size} />
      ))}
    </div>
  )
}

interface DamageNumberProps {
  event: HitMarkerEvent
  size: 'sm' | 'md' | 'lg'
}

function DamageNumber({ event, size }: DamageNumberProps) {
  const directionOffsets = {
    up: { x: 0, y: -60 },
    down: { x: 0, y: 60 },
    left: { x: -60, y: 0 },
    right: { x: 60, y: 0 },
  }

  const offset = event.direction
    ? directionOffsets[event.direction]
    : { x: 0, y: 0 }
  const fontSizeClass =
    size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'

  return (
    <div
      className={cn(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-slide-in-up font-black font-mono',
        fontSizeClass,
        event.isHeadshot
          ? 'text-accent-gold animate-pulse'
          : 'text-text-primary'
      )}
      style={{
        textShadow: '0 0 8px rgba(0,0,0,0.8)',
        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
      }}
    >
      {event.isHeadshot ? 'HS' : event.damage}
    </div>
  )
}
