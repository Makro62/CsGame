import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface RoundTimerProps {
  phase: 'buy' | 'active' | 'roundEnd' | 'matchEnd' | 'waiting'
  timeLeft: number
  roundNumber: number
  teamRedScore: number
  teamBlueScore: number
  isOvertime?: boolean
  isSuddenDeath?: boolean
  bombPlanted?: boolean
  bombTimeLeft?: number
}

/**
 * RoundTimer - Displays round phase, time remaining, and score
 * Shows panic mode when time is low or bomb is about to explode
 */
export function RoundTimer({
  phase,
  timeLeft,
  roundNumber,
  teamRedScore,
  teamBlueScore,
  isOvertime,
  isSuddenDeath,
  bombPlanted,
  bombTimeLeft,
}: RoundTimerProps) {
  const isPanic = phase === 'active' && timeLeft <= 10
  const isBombPanic = bombPlanted && (bombTimeLeft || 0) <= 10

  return (
    <GlassPanel
      className={cn(
        'flex flex-col items-center px-6 py-2 min-w-[200px]',
        (isPanic || isBombPanic) && 'animate-panic-glow border-health-low/50'
      )}
      variant={isBombPanic ? 'danger' : 'default'}
    >
      {/* Phase Label */}
      <div
        className={cn(
          'text-xs font-bold tracking-[0.2em] uppercase',
          phase === 'buy' && 'text-accent-gold',
          phase === 'active' && 'text-text-primary',
          phase === 'roundEnd' && 'text-text-muted',
          isOvertime && 'text-accent-purple animate-pulse'
        )}
      >
        {isSuddenDeath
          ? 'SUDDEN DEATH'
          : isOvertime
            ? 'OVERTIME'
            : phase === 'buy'
              ? 'BUY PHASE'
              : phase === 'active'
                ? `ROUND ${roundNumber}`
                : phase === 'roundEnd'
                  ? 'ROUND END'
                  : 'WAITING'}
      </div>

      {/* Timer */}
      <div
        className={cn(
          'text-4xl font-black font-mono leading-none mt-1',
          isPanic || isBombPanic
            ? 'text-health-low animate-pulse'
            : 'text-text-primary'
        )}
      >
        {formatTime(timeLeft)}
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-lg font-bold text-terrorist">{teamRedScore}</span>
        <span className="text-text-muted text-xs">VS</span>
        <span className="text-lg font-bold text-counter">{teamBlueScore}</span>
      </div>

      {/* Bomb timer indicator */}
      {bombPlanted && bombTimeLeft !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          <div
            className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              bombTimeLeft <= 10 ? 'bg-health-low' : 'bg-accent-gold'
            )}
          />
          <span
            className={cn(
              'text-xs font-mono font-bold',
              bombTimeLeft <= 10 ? 'text-health-low' : 'text-accent-gold'
            )}
          >
            {formatTime(bombTimeLeft)}
          </span>
        </div>
      )}
    </GlassPanel>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
