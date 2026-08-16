import { GlassPanel } from '../shared/GlassPanel'

interface ScoreBoardProps {
  gameMode: string
  teamRedScore: number
  teamBlueScore: number
  ffaTop?: { name: string; score: number } | null
}

export function ScoreBoard({
  gameMode,
  teamRedScore,
  teamBlueScore,
  ffaTop,
}: ScoreBoardProps) {
  const isDefusal = gameMode === 'bomb_defusal'
  const isFfa = gameMode === 'ffa' || gameMode === 'gun_game'
  const isTdm = gameMode === 'tdm'

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center items-center gap-4 px-6 py-3 z-[100] pointer-events-none">
      {/* Left score */}
      {isDefusal && (
        <GlassPanel className="px-5 py-1.5 min-w-[80px] text-center" variant="default">
          <span className="text-xl font-black font-display text-counter">
            CT {teamBlueScore}
          </span>
        </GlassPanel>
      )}
      {isFfa && ffaTop && (
        <GlassPanel className="px-5 py-1.5" variant="default">
          <span className="text-sm font-bold text-text-primary">
            TOP {ffaTop.name}: {ffaTop.score}
          </span>
        </GlassPanel>
      )}
      {isTdm && (
        <GlassPanel className="px-5 py-1.5 min-w-[80px] text-center" variant="default">
          <span className="text-xl font-black font-display text-terrorist">
            T {teamRedScore}
          </span>
        </GlassPanel>
      )}

      {/* Round timer placeholder - actual timer is in RoundTimer component */}

      {/* Right score */}
      {isDefusal && (
        <GlassPanel className="px-5 py-1.5 min-w-[80px] text-center" variant="default">
          <span className="text-xl font-black font-display text-terrorist">
            {teamRedScore} T
          </span>
        </GlassPanel>
      )}
      {isFfa && (
        <GlassPanel className="px-5 py-1.5" variant="dark">
          <span className="text-sm font-bold text-accent-cyan">FFA</span>
        </GlassPanel>
      )}
      {isTdm && (
        <GlassPanel className="px-5 py-1.5 min-w-[80px] text-center" variant="default">
          <span className="text-xl font-black font-display text-counter">
            CT {teamBlueScore}
          </span>
        </GlassPanel>
      )}
    </div>
  )
}
