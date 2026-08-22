import { CSSProperties } from 'react'

interface AnimatedLogoProps {
  size?: number
  style?: CSSProperties
}

const KEYFRAMES = `
@keyframes logoSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes logoPulse {
  0%, 100% { box-shadow: 0 0 18px -4px var(--color-accent-cyan), inset 0 0 10px -6px var(--color-accent-cyan); }
  50% { box-shadow: 0 0 28px -2px var(--color-accent-cyan), inset 0 0 16px -4px var(--color-accent-cyan); }
}
`

export function AnimatedLogo({ size = 44, style }: AnimatedLogoProps) {
  const crossSize = size * 0.35
  const borderWidth = Math.max(2, size * 0.05)

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          flex: `0 0 ${size}px`,
          borderRadius: '50%',
          border: `${borderWidth}px solid var(--color-accent-cyan)`,
          animation: 'logoSpin 8s linear infinite, logoPulse 3s ease-in-out infinite',
          ...style,
        }}
      >
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: -crossSize * 0.5,
            width: borderWidth,
            height: crossSize,
            background: 'var(--color-accent-cyan)',
            transform: 'translateX(-50%)',
            boxShadow: `0 ${size - crossSize * 0.5 + borderWidth}px 0 var(--color-accent-cyan)`,
          }}
        />
        {/* Horizontal line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: -crossSize * 0.5,
            height: borderWidth,
            width: crossSize,
            background: 'var(--color-accent-cyan)',
            transform: 'translateY(-50%)',
            boxShadow: `${size - crossSize * 0.5 + borderWidth}px 0 0 var(--color-accent-cyan)`,
          }}
        />
      </div>
    </>
  )
}
