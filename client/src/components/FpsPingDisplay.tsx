import { useEffect, useRef, useState } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'

export default function FpsPingDisplay() {
  const [fps, setFps] = useState(0)
  const { ping } = useNetworkStore()
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let raf: number
    const tick = () => {
      framesRef.current++
      const now = performance.now()
      if (now - lastTimeRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastTimeRef.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const fpsColor = fps > 60 ? '#00ff44' : fps >= 30 ? '#ffcc00' : '#ff3333'
  const pingColor = ping < 80 ? '#00ff44' : ping <= 150 ? '#ffcc00' : '#ff3333'

  return (
    <>
      {/* FPS */}
      <div
        style={{
          position: 'fixed',
          top: 10,
          left: 10,
          color: fpsColor,
          fontSize: 13,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 6px',
          borderRadius: 3,
          zIndex: 200,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {fps} FPS
      </div>
      {/* Ping */}
      <div
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          color: pingColor,
          fontSize: 13,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 6px',
          borderRadius: 3,
          zIndex: 200,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {ping}ms
      </div>
    </>
  )
}
