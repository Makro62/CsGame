import { cn } from '../../../utils/cn'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  className?: string
  barClassName?: string
  variant?: 'default' | 'health' | 'ammo' | 'progress'
  animated?: boolean
  showLabel?: boolean
}

/**
 * ProgressBar - Animated progress bar component
 * Used for HP bars, ammo bars, and other progress indicators
 */
export function ProgressBar({
  value,
  max = 100,
  className = '',
  barClassName = '',
  variant = 'default',
  animated = true,
  showLabel = false,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const variantStyles = {
    default: {
      container: 'bg-bg-secondary',
      bar: 'bg-text-secondary',
    },
    health: {
      container: 'bg-bg-secondary',
      bar:
        percentage > 60
          ? 'bg-health-full'
          : percentage > 25
            ? 'bg-health-mid'
            : 'bg-health-low',
    },
    ammo: {
      container: 'bg-bg-secondary',
      bar: percentage > 25 ? 'bg-ammo-full' : 'bg-ammo-low',
    },
    progress: {
      container: 'bg-bg-secondary/50',
      bar: 'bg-accent-gold',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={cn('relative w-full', className)}>
      {/* Background */}
      <div
        className={cn('h-full rounded-full overflow-hidden', styles.container)}
      >
        {/* Fill */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-spring',
            styles.bar,
            barClassName,
            animated && 'will-change-width'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Optional label */}
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary pointer-events-none">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
