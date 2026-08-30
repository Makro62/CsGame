import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  className?: string
}

/**
 * AnimatedNumber - Smoothly animates number changes
 * Useful for HP, ammo, money displays
 */
export function AnimatedNumber({
  value,
  duration = 200,
  decimals = 0,
  className = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const currentValRef = useRef(value)

  useEffect(() => {
    const startVal = currentValRef.current
    const startTime = Date.now()

    const animationFrame = setInterval(() => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      const newValue =
        startVal + (value - startVal) * progress
      const rounded =
        Math.round(newValue * Math.pow(10, decimals)) / Math.pow(10, decimals)
      currentValRef.current = rounded
      setDisplayValue(rounded)

      if (progress >= 1) {
        clearInterval(animationFrame)
      }
    }, 16) // ~60fps

    return () => clearInterval(animationFrame)
  }, [value, duration, decimals])

  return <span className={className}>{displayValue.toFixed(decimals)}</span>
}
