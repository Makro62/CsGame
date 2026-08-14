import { useEffect } from 'react'
import { useNetworkStore } from '../../../stores/useNetworkStore'
import { useGameStore } from '../../../stores/useGameStore'
import { GlassPanel } from '../shared/GlassPanel'
import { Badge } from '../shared/Badge'

export function SpectatorHUD() {
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
    <div className="fixed top-4 right-4 z-[300] pointer-events-none">
      <GlassPanel className="p-3 min-w-[160px]">
        <Badge variant="danger" size="sm" pulse>
          SPECTATING
        </Badge>

        {target ? (
          <div className="mt-2 space-y-1">
            <div className="text-sm font-bold text-text-primary">
              {target.nickname}
            </div>
            <div className="text-xs text-text-secondary">
              HP: <span className="text-health-full font-mono">{target.hp}</span>
            </div>
            <div className="text-[10px] text-text-muted mt-2">
              Press 1-9 to cycle targets
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-text-muted">
            No targets available
          </div>
        )}
      </GlassPanel>
    </div>
  )
}
