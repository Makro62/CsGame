import { useEffect, useRef, useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { cn } from '../../../utils/cn'

interface NetworkMonitorProps {
  ping: number
  fps: number
  packetLoss?: number
  showHistory?: boolean
}

/**
 * NetworkMonitor - Displays network stats (ping, FPS, packet loss)
 * Shows history graph if enabled
 */
export function NetworkMonitor({
  ping,
  fps,
  packetLoss = 0,
  showHistory = false,
}: NetworkMonitorProps) {
  const [pingHistory, setPingHistory] = useState<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Update ping history
  useEffect(() => {
    setPingHistory(prev => [...prev.slice(-59), ping])
  }, [ping])

  // Draw history graph
  useEffect(() => {
    if (!canvasRef.current || !showHistory || pingHistory.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const maxPing = Math.max(...pingHistory, 200)

    // Clear
    ctx.fillStyle = 'rgba(10, 10, 15, 0.5)'
    ctx.fillRect(0, 0, width, height)

    // Draw lines
    ctx.strokeStyle = '#4488ff'
    ctx.lineWidth = 1
    ctx.beginPath()

    pingHistory.forEach((p, i) => {
      const x = (i / (pingHistory.length - 1)) * width
      const y = height - (p / maxPing) * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })

    ctx.stroke()
  }, [pingHistory, showHistory])

  const getPingColor = () => {
    if (ping < 50) return 'text-health-full'
    if (ping < 100) return 'text-health-mid'
    return 'text-health-low'
  }

  return (
    <GlassPanel className="p-2 min-w-[100px]">
      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
        NET
      </div>

      {/* Stats */}
      <div className="space-y-0.5">
        <div
          className={cn(
            'text-sm font-mono font-bold flex justify-between',
            getPingColor()
          )}
        >
          <span>PING</span>
          <span>{ping}ms</span>
        </div>
        <div className="text-sm font-mono font-bold text-text-secondary flex justify-between">
          <span>FPS</span>
          <span>{Math.round(fps)}</span>
        </div>
        {packetLoss > 0 && (
          <div className="text-sm font-mono font-bold text-health-low flex justify-between">
            <span>LOSS</span>
            <span>{packetLoss.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* History graph */}
      {showHistory && (
        <canvas
          ref={canvasRef}
          width={80}
          height={40}
          className="w-full mt-1 border border-white/10 rounded"
        />
      )}
    </GlassPanel>
  )
}
