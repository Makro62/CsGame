import { useEffect, useRef } from 'react'
import { useGameStore } from '../stores/useGameStore'
import { useNetworkStore } from '../stores/useNetworkStore'
import { Sound } from './AudioManager'

export default function FootstepPlayer() {
  const lastInput = useGameStore(s => s.lastInput)
  const localIsDead = useNetworkStore(s => s.localIsDead)
  const lastFootstepTime = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (localIsDead || !lastInput) {
        lastFootstepTime.current = 0
        return
      }

      const isMoving = lastInput.forward || lastInput.backward || lastInput.left || lastInput.right
      if (!isMoving) {
        lastFootstepTime.current = 0
        return
      }

      const now = performance.now()
      let intervalMs = 400 // walk

      if (lastInput.sprint) {
        intervalMs = 250 // sprint
      } else if (!lastInput.forward && !lastInput.backward) {
        intervalMs = 600 // crouch/strafe only
      }

      if (now - lastFootstepTime.current >= intervalMs) {
        const type = lastInput.sprint ? 'sprint' : 'walk'
        Sound.footstep(type)
        lastFootstepTime.current = now
      }
    }, 50)

    return () => clearInterval(interval)
  }, [lastInput, localIsDead])

  return null
}
