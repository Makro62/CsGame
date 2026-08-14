import { useKillCamStore } from '../../../stores/useKillCamStore'
import { Badge } from '../shared/Badge'

export function KillCamOverlay() {
  const isReplaying = useKillCamStore(s => s.isReplaying)
  const killerName = useKillCamStore(s => s.killerName)

  if (!isReplaying) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {/* Red border overlay */}
      <div className="absolute inset-0 border-4 border-health-low/60 shadow-[inset_0_0_60px_rgba(255,0,0,0.3)]" />

      {/* KILL CAM badge */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2">
        <Badge variant="danger" size="lg" pulse>
          KILL CAM
        </Badge>
      </div>

      {/* Killer name */}
      {killerName && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 text-sm text-text-primary font-mono">
          Killed by: <span className="text-health-low font-bold">{killerName}</span>
        </div>
      )}
    </div>
  )
}
