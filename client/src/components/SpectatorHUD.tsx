import { useEffect } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'
import { useGameStore } from '../stores/useGameStore'

export default function SpectatorHUD() {
  const localIsDead = useNetworkStore(s => s.localIsDead)
  const remotePlayers = useNetworkStore(s => s.remotePlayers)
  const targetIndex = useGameStore(s => s.spectatorTargetIndex)
  const setTargetIndex = useGameStore(s => s.setSpectatorTargetIndex)
  const players = Array.from(remotePlayers.values())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!localIsDead) return
      const k = parseInt(e.key, 10)
      if (!isNaN(k) && k >= 1 && k <= 9) {
        const idx = Math.min(k - 1, Math.max(0, players.length - 1))
        setTargetIndex(idx)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [localIsDead, players.length, setTargetIndex])

  if (!localIsDead) return null

  const target = players[targetIndex]

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        background: 'rgba(0,0,0,0.6)',
        padding: '8px 12px',
        borderRadius: 8,
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 300,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.9 }}>SPECTATING</div>
      {target ? (
        <div style={{ marginTop: 6, fontSize: 12 }}>
          <div style={{ fontWeight: 'bold' }}>{target.nickname}</div>
          <div>HP: {target.hp}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#ccc' }}>
            Press 1-9 to cycle targets
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 12, color: '#ccc' }}>
          No targets
        </div>
      )}
    </div>
  )
}
