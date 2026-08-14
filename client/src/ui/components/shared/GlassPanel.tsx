import { CSSProperties, ReactNode } from 'react'
import { cn } from '../../../utils/cn'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: 'default' | 'dark' | 'accent' | 'danger'
  intensity?: 'low' | 'medium' | 'high'
  border?: boolean
  glow?: boolean
}

/**
 * GlassPanel - Reusable glassmorphism component
 * Uses CSS custom properties and Tailwind classes for consistent styling
 */
export function GlassPanel({
  children,
  className,
  style,
  variant = 'default',
  intensity = 'medium',
  border = true,
  glow = false,
}: GlassPanelProps) {
  const variantStyles = {
    default: 'bg-glass backdrop-blur-md',
    dark: 'bg-secondary backdrop-blur-xl',
    accent: 'bg-glass border-accent-gold/30',
    danger: 'bg-glass border-health-low/30',
  }

  const intensityStyles = {
    low: 'bg-opacity-40',
    medium: 'bg-opacity-70',
    high: 'bg-opacity-90',
  }

  return (
    <div
      className={cn(
        'rounded-lg',
        variantStyles[variant],
        intensityStyles[intensity],
        border && 'border border-white/10',
        glow && 'shadow-lg shadow-white/5',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}
