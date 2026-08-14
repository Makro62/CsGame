import { AnimatedNumber } from '../shared/AnimatedNumber'
import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface MoneyDisplayProps {
  amount: number
  maxAmount?: number
  canBuy?: boolean
  showBudget?: boolean
}

/**
 * MoneyDisplay - Shows player economy/budget
 * Displays money with animations and budget status
 */
export function MoneyDisplay({
  amount,
  maxAmount,
  canBuy = true,
  showBudget = false,
}: MoneyDisplayProps) {
  const isVeryLow = amount < 2400
  const variant = isVeryLow ? 'danger' : canBuy ? 'default' : 'dark'

  return (
    <GlassPanel className="p-3 min-w-[140px]" variant={variant}>
      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
        BALANCE
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold text-money">$</span>
        <div
          className={cn(
            'text-3xl font-black font-mono leading-none',
            isVeryLow && 'text-health-low'
          )}
        >
          <AnimatedNumber value={amount} duration={300} decimals={0} />
        </div>
      </div>

      {/* Budget indicator bar */}
      {showBudget && maxAmount && (
        <div className="mt-2 h-0.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isVeryLow ? 'bg-health-low' : 'bg-money'
            )}
            style={{ width: `${Math.min((amount / maxAmount) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Status indicator */}
      {isVeryLow && (
        <div className="mt-1.5 text-[10px] font-bold text-health-low animate-pulse">
          LOW BUDGET
        </div>
      )}

      {!canBuy && (
        <div className="mt-1.5 text-[10px] font-bold text-text-muted">
          ECO ROUND
        </div>
      )}
    </GlassPanel>
  )
}
