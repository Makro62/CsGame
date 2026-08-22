import { CSSProperties, useEffect, useState, useCallback } from 'react'

let toastId = 0
const listeners = new Set<(msg: string) => void>()

export function showToast(message: string) {
  listeners.forEach((fn) => fn(message))
}

const KEYFRAMES = `
@keyframes toastSlideIn {
  from { transform: translate(-50%, 80px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}
@keyframes toastSlideOut {
  from { transform: translate(-50%, 0); opacity: 1; }
  to { transform: translate(-50%, 80px); opacity: 0; }
}
`

export function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; leaving: boolean }[]>([])

  const addToast = useCallback((msg: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, msg, leaving: false }])
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 400)
    }, 2600)
  }, [])

  useEffect(() => {
    listeners.add(addToast)
    return () => { listeners.delete(addToast) }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={styles.container}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              animation: t.leaving
                ? 'toastSlideOut 0.4s ease forwards'
                : 'toastSlideIn 0.4s ease',
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    left: '50%',
    bottom: 26,
    transform: 'translateX(-50%)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
  },
  toast: {
    background: 'rgba(13,20,36,0.95)',
    border: '1px solid var(--color-accent-cyan)',
    color: 'var(--color-text-primary)',
    padding: '12px 22px',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.05em',
    boxShadow: '0 0 24px -8px var(--color-accent-cyan)',
    whiteSpace: 'nowrap',
  },
}
