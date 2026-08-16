import { useEffect, useRef, useState } from 'react'

interface HealthBarProps {
  hp: number
  maxHp?: number
  armor: number
  hasHelmet: boolean
}

export function HealthBar({
  hp,
  maxHp = 100,
  armor,
  hasHelmet,
}: HealthBarProps) {
  const [flashRed, setFlashRed] = useState(false)
  const prevHpRef = useRef(hp)

  useEffect(() => {
    if (hp < prevHpRef.current) {
      setFlashRed(true)
      const timer = setTimeout(() => setFlashRed(false), 250)
      return () => clearTimeout(timer)
    }
    prevHpRef.current = hp
  }, [hp])

  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const isCritical = hp <= 25

  return (
    <div
      style={{
        background: flashRed
          ? 'rgba(239, 68, 68, 0.4)'
          : 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8))',
        backdropFilter: 'blur(16px)',
        border: isCritical
          ? '1px solid #ef4444'
          : '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '14px',
        padding: '12px 18px',
        boxShadow: isCritical
          ? '0 0 20px rgba(239, 68, 68, 0.4)'
          : '0 10px 25px rgba(0, 0, 0, 0.5)',
        minWidth: '160px',
        fontFamily: "'Inter', monospace, sans-serif",
        color: 'white',
        userSelect: 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '18px' }}>❤️</span>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: hp > 50 ? '#4ade80' : hp > 25 ? '#facc15' : '#f87171',
              lineHeight: 1,
            }}
          >
            {hp}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>HP</span>
        </div>

        {armor > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
            <span style={{ fontSize: '12px' }}>🛡️</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#93c5fd', fontFamily: 'monospace' }}>
              {armor}
            </span>
            <span style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 'bold' }}>
              {hasHelmet ? 'HELM' : 'KEV'}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Health Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${hpPercent}%`,
            height: '100%',
            background:
              hp > 50
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : hp > 25
                ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                : 'linear-gradient(90deg, #ef4444, #dc2626)',
            borderRadius: '999px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
