import { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  pulse?: boolean
}

/**
 * Badge - Status badge component
 * Used for labels, status indicators, and small notifications
 */
export function Badge({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  animated = false,
  pulse = false,
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-bg-secondary text-text-primary border border-white/10',
    success: 'bg-health-full/10 text-health-full border border-health-full/30',
    danger: 'bg-health-low/10 text-health-low border border-health-low/30',
    warning: 'bg-health-mid/10 text-health-mid border border-health-mid/30',
    info: 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30',
    gold: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/30',
  }

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs font-bold',
    md: 'px-3 py-1.5 text-sm font-bold',
    lg: 'px-4 py-2 text-base font-bold',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all',
        variantStyles[variant],
        sizeStyles[size],
        animated && 'animate-slide-in-up',
        pulse && 'animate-pulse-scale',
        className
      )}
    >
      {children}
    </span>
  )
}
