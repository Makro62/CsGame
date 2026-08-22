import { CSSProperties, useEffect, useState } from 'react'
import { HUD_MONO } from '../../hudTheme'

const KEYFRAMES = `
@keyframes statBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes statPulse {
  50% { box-shadow: 0 0 14px -2px var(--color-accent-cyan); }
}
`

export function OnlineStats() {
  const [online, setOnline] = useState(1248)
  const [ping, setPing] = useState(14)

  useEffect(() => {
    const interval = setInterval(() => {
      setOnline((prev) => Math.max(900, prev + Math.floor(Math.random() * 81) - 40))
      setPing(9 + Math.floor(Math.random() * 18))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={styles.row}>
        <div style={styles.stat}>
          <span style={styles.dot} />
          <span style={styles.value}>{online.toLocaleString('id-ID')}</span>
          <span style={styles.label}>ONLINE</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.value}>{ping}</span>
          <span style={styles.label}>MS</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.value}>128</span>
          <span style={styles.label}>TICK</span>
        </div>
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  row: {
    display: 'flex',
    gap: 10,
  },
  stat: {
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(13,20,36,0.7)',
    padding: '7px 12px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 7,
    animation: 'statPulse 3s infinite',
  },
  value: {
    fontFamily: HUD_MONO,
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--color-text-primary)',
  },
  label: {
    fontFamily: HUD_MONO,
    fontSize: 9,
    letterSpacing: '0.18em',
    color: 'var(--color-text-muted)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--color-health-full)',
    boxShadow: '0 0 8px var(--color-health-full)',
    animation: 'statBlink 1.6s infinite',
    alignSelf: 'center',
  },
}
