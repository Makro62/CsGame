
interface AmmoCounterProps {
  current: number
  max: number
  reserve: number
  isReloading: boolean
  isSwitching: boolean
  weaponName: string
}

export function AmmoCounter({
  current,
  max,
  reserve,
  isReloading,
  isSwitching,
  weaponName,
}: AmmoCounterProps) {
  const isKnife = weaponName.toLowerCase().includes('knife')
  const isInfinite = reserve === Infinity || reserve > 500
  const isLow = current <= max * 0.25 && current > 0
  const isEmpty = current === 0 && !isKnife

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '14px',
        padding: '12px 20px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        minWidth: '160px',
        fontFamily: "'Inter', monospace, sans-serif",
        color: 'white',
        userSelect: 'none',
        textAlign: 'right',
      }}
    >
      {/* Weapon Label / Status */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '1.5px',
          color: isReloading ? '#f59e0b' : isSwitching ? '#94a3b8' : '#60a5fa',
          marginBottom: '4px',
          textTransform: 'uppercase',
        }}
      >
        {isReloading ? '● RELOADING...' : isSwitching ? '● SWITCHING...' : weaponName.toUpperCase()}
      </div>

      {/* Ammo Numbers */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '6px' }}>
        {isKnife ? (
          <span style={{ fontSize: '24px', fontWeight: 900, color: '#94a3b8', letterSpacing: '1px' }}>
            MELEE
          </span>
        ) : (
          <>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: isReloading
                  ? '#f59e0b'
                  : isEmpty
                  ? '#ef4444'
                  : isLow
                  ? '#facc15'
                  : '#22d3ee',
                lineHeight: 1,
                textShadow: !isReloading && !isEmpty ? '0 0 12px rgba(34, 211, 238, 0.4)' : 'none',
              }}
            >
              {isReloading ? '—' : current}
            </span>
            <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 'bold' }}>/</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#cbd5e1', fontFamily: 'monospace' }}>
              {isInfinite ? '∞' : reserve}
            </span>
          </>
        )}
      </div>

      {/* Bullet Capacity Gauge */}
      {!isKnife && max > 0 && (
        <div
          style={{
            marginTop: '8px',
            width: '100%',
            height: '4px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, (current / max) * 100))}%`,
              height: '100%',
              background:
                isReloading
                  ? '#f59e0b'
                  : isEmpty
                  ? '#ef4444'
                  : isLow
                  ? '#facc15'
                  : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              borderRadius: '999px',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}
    </div>
  )
}
