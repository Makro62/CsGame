import { useRef } from 'react'

interface CrosshairProps {
  isADS: boolean
  isMoving: boolean
  isReloading: boolean
  bulletsFired: number
  weaponSpread: number
  style?: 'dot' | 'cross' | 'dynamic'
  color?: string
  size?: number
}

/**
 * Crosshair - Dynamic crosshair component
 * Adjusts spread based on movement, ADS, and recoil
 * Shows scope overlay for sniper weapons
 */
export function Crosshair({
  isADS,
  isMoving,
  isReloading,
  bulletsFired,
  weaponSpread,
  style = 'dynamic',
  color = '#ffffff',
  size = 1,
}: CrosshairProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate spread size based on movement and recoil
  const baseSpread = isADS ? 2 : 4
  const movementSpread = isMoving ? 6 : 0
  const recoilSpread = Math.min(bulletsFired * 1.5, 20)
  const totalSpread = (baseSpread + movementSpread + recoilSpread) * size

  // Hide crosshair when ADS with sniper (AWP scope)
  if (isADS && weaponSpread > 0.5) {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* AWP Scope overlay */}
        <div className="absolute inset-0 bg-black/40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[300px] h-[300px] rounded-full border-2 border-white/20" />
          </div>
          {/* Crosshair lines */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{ opacity: isReloading ? 0.3 : 1 }}
    >
      {style === 'dot' && (
        <div
          className="rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]"
          style={{
            width: 6 * size,
            height: 6 * size,
            backgroundColor: color,
          }}
        />
      )}

      {style === 'cross' && (
        <div
          className="relative"
          style={{ width: totalSpread * 2 + 4, height: totalSpread * 2 + 4 }}
        >
          {/* Center dot */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 2 * size,
              height: 2 * size,
              backgroundColor: color,
            }}
          />
          {/* Top line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-1/2"
            style={{
              width: 2 * size,
              height: totalSpread,
              backgroundColor: color,
              marginBottom: 2 * size,
            }}
          />
          {/* Bottom line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-1/2"
            style={{
              width: 2 * size,
              height: totalSpread,
              backgroundColor: color,
              marginTop: 2 * size,
            }}
          />
          {/* Left line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-1/2"
            style={{
              width: totalSpread,
              height: 2 * size,
              backgroundColor: color,
              marginRight: 2 * size,
            }}
          />
          {/* Right line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-1/2"
            style={{
              width: totalSpread,
              height: 2 * size,
              backgroundColor: color,
              marginLeft: 2 * size,
            }}
          />
        </div>
      )}

      {style === 'dynamic' && (
        <div className="relative flex items-center justify-center">
          {/* Dynamic spread circle */}
          <div
            className="absolute rounded-full border-2 border-white/40 transition-all duration-100"
            style={{
              width: totalSpread * 2,
              height: totalSpread * 2,
              borderColor: color,
            }}
          />
          {/* Center dot */}
          <div
            className="rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]"
            style={{
              width: 4 * size,
              height: 4 * size,
              backgroundColor: color,
            }}
          />
          {/* Hit confirmation lines (appear briefly on hit) */}
          <div className="absolute inset-0 animate-hit-confirm opacity-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-2 bg-white" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-2 bg-white" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-2 bg-white" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-px w-2 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
