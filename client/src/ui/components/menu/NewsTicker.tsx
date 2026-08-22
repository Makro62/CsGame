import { CSSProperties, useEffect, useRef, useState } from 'react'

const NEWS_ITEMS = [
  { bold: 'UPDATE v3.0', text: 'Recoil wall & marker jarak diperbarui' },
  { bold: 'MAP BARU:', text: 'CONTAINER YARD' },
  { bold: 'EVENT WEEKEND:', text: 'XP x2' },
  { bold: 'SERVER BROWSER v2', text: 'rilis' },
  { bold: 'ANTI-CHEAT BROWSER', text: 'aktif' },
  { bold: 'ZOMBIE:', text: 'Pack-a-Punch kini Lv.3' },
]

const KEYFRAMES = `
@keyframes tickerScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`

export function NewsTicker() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (paused) {
      track.style.animationPlayState = 'paused'
    } else {
      track.style.animationPlayState = 'running'
    }
  }, [paused])

  const items = NEWS_ITEMS.map((item, i) => (
    <span key={i} style={styles.item}>
      <b style={styles.bold}>{item.bold}</b> {item.text}
    </span>
  ))

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={styles.container}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div ref={trackRef} style={styles.track}>
          {items}
          {items}
        </div>
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(11,17,32,0.6)',
    overflow: 'hidden',
  },
  track: {
    display: 'flex',
    width: 'max-content',
    animation: 'tickerScroll 30s linear infinite',
    padding: '8px 0',
  },
  item: {
    color: 'var(--color-text-muted)',
    fontSize: 11,
    letterSpacing: '0.14em',
    whiteSpace: 'nowrap',
    padding: '0 22px',
  },
  bold: {
    color: 'var(--color-accent-cyan)',
    fontWeight: 700,
  },
}
