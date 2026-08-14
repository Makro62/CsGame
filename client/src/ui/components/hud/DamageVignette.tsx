import { useEffect, useState } from 'react'
import { cn } from '../../../utils/cn'

interface DamageVignetteProps {
  damageDirection?: 'front' | 'back' | 'left' | 'right'
  intensity?: number // 0-1
  isHealing?: boolean
}

/**
 * DamageVignette - Visual feedback overlay when taking damage
 * Shows radial vignette and optional directional damage indicator
 * Includes screen shake effect
 */
export function DamageVignette({
  damageDirection,
  intensity = 0.5,
  isHealing,
}: DamageVignetteProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (intensity > 0) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(timer)
    }
  }, [intensity])

  if (!show) return null

  const directionRotation = {
    front: 0,
    right: 90,
    back: 180,
    left: 270,
  }

  const rotation = damageDirection ? directionRotation[damageDirection] : 0

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Radial vignette */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          isHealing ? 'bg-heal-vignette' : 'bg-damage-vignette'
        )}
        style={{
          background: isHealing
            ? 'radial-gradient(circle, transparent 50%, rgba(20, 220, 20, 0.3) 100%)'
            : `radial-gradient(circle, transparent 60%, rgba(220, 20, 20, ${intensity * 0.8}) 100%)`,
        }}
      />

      {/* Directional indicator */}
      {!isHealing && damageDirection && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-health-low/60 animate-damage-indicator" />
        </div>
      )}

      {/* Screen shake overlay (subtle blur) */}
      <div className="absolute inset-0 backdrop-blur-[1px] animate-shake" />
    </div>
  )
}
