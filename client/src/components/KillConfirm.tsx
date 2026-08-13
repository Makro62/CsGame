import { useEffect, useRef, useState } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function KillConfirm() {
  const [show, setShow] = useState(false)
  const { sessionId, killFeed } = useNetworkStore()
  const lastKillCount = useRef(0)

  useEffect(() => {
    if (killFeed.length > lastKillCount.current) {
      const latestKill = killFeed[0]
      if (latestKill && latestKill.killerId === sessionId) {
        setShow(true)
        const timeout = setTimeout(() => setShow(false), 600)
        lastKillCount.current = killFeed.length
        return () => clearTimeout(timeout)
      }
    }
    lastKillCount.current = killFeed.length
  }, [killFeed, sessionId])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 150,
        pointerEvents: 'none',
        color: '#FFD700',
        fontSize: 48,
        textShadow:
          '0 0 12px rgba(255,215,0,0.9), 0 0 24px rgba(255,215,0,0.5)',
        animation: 'killFade 0.6s ease-out forwards',
      }}
    >
      💀
      <style>{`@keyframes killFade {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }`}</style>
    </div>
  )
}
