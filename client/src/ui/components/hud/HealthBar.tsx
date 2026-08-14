import { useEffect, useRef, useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { AnimatedNumber } from '../shared/AnimatedNumber'
import { cn } from '../../../utils/cn'

interface HealthBarProps {
  hp: number
  maxHp?: number
  armor: number
  hasHelmet: boolean
}

/**
 * HealthBar - Displays player HP and armor status
 * Includes animations for damage and critical states
 */
export function HealthBar({
  hp,
  maxHp = 100,
  armor,
  hasHelmet,
}: HealthBarProps) {
  const [displayHp, setDisplayHp] = useState(hp)
  const [flashRed, setFlashRed] = useState(false)
  const prevHpRef = useRef(hp)

  // Damage flash effect
  useEffect(() => {
    if (hp < prevHpRef.current) {
      setFlashRed(true)
      const timer = setTimeout(() => setFlashRed(false), 200)
      return () => clearTimeout(timer)
    }
    prevHpRef.current = hp
  }, [hp])

  // Smooth number transition
  useEffect(() => {
    const timer = setTimeout(() => setDisplayHp(hp), 50)
    return () => clearTimeout(timer)
  }, [hp])

  const hpPercent = (hp / maxHp) * 100
  const hpColor =
    hp > 60
      ? 'text-health-full'
      : hp > 25
        ? 'text-health-mid'
        : 'text-health-low'
  const hpGlow = hp <= 25 ? 'animate-pulse-glow' : ''
  const variantType = hp <= 25 ? 'danger' : 'default'

  return (
    <GlassPanel
      variant={variantType}
      className={cn(
        'relative overflow-hidden p-3 min-w-[140px]',
        flashRed && 'animate-damage-flash'
      )}
    >
      {/* Background damage flash overlay */}
      {flashRed && (
        <div className="absolute inset-0 bg-health-low/20 animate-fade-out pointer-events-none" />
      )}

      <div className="flex items-end gap-2">
        {/* HP Number */}
        <div
          className={cn(
            'text-3xl font-black font-display leading-none',
            hpColor
          )}
        >
          <AnimatedNumber value={displayHp} duration={200} />
        </div>

        <div className="flex flex-col gap-0.5 mb-0.5">
          <span className="text-xs font-bold text-text-muted tracking-wider">
            HP
          </span>
          {armor > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-armor font-semibold">
                {hasHelmet ? 'HELM' : 'KEVLAR'}
              </span>
              <span className="text-[10px] text-armor">{armor}</span>
            </div>
          )}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mt-2 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-spring',
            hpColor.replace('text-', 'bg-'),
            hpGlow
          )}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Critical HP heartbeat effect */}
      {hp <= 25 && (
        <div className="absolute inset-0 rounded-lg border-2 border-health-low/50 animate-pulse-border pointer-events-none" />
      )}
    </GlassPanel>
  )
}
