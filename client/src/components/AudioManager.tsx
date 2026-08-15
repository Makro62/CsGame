import { useEffect, useRef } from 'react'
import { useNetworkStore } from '../stores/useNetworkStore'
import { useSettingsStore } from '../stores/useSettingsStore'

function getEffectiveVolume(): number {
  const { masterVolume, sfxVolume } = useSettingsStore.getState()
  return (masterVolume / 100) * (sfxVolume / 100)
}

let audioCtx: AudioContext | null = null
let unlocked = false
const reloadAudioTimers: ReturnType<typeof setTimeout>[] = []

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

// ─── Spatial Audio: bind Web Audio listener to camera position ───
// Must be called every frame from the game loop to keep spatial audio accurate.
export function updateAudioListener(
  camX: number, camY: number, camZ: number,
  lookAtX: number, lookAtY: number, lookAtZ: number,
) {
  const ctx = getCtx()
  const listener = ctx.listener
  if (!listener) return

  // Position the listener at the camera
  if (listener.positionX) {
    listener.positionX.setValueAtTime(camX, ctx.currentTime)
    listener.positionY.setValueAtTime(camY, ctx.currentTime)
    listener.positionZ.setValueAtTime(camZ, ctx.currentTime)
  } else if ('setPosition' in listener) {
    (listener as any).setPosition(camX, camY, camZ)
  }

  // Orientation: forward vector (lookAt - position) and up vector
  const dx = lookAtX - camX
  const dy = lookAtY - camY
  const dz = lookAtZ - camZ
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const fwdX = dx / len
  const fwdY = dy / len
  const fwdZ = dz / len

  if (listener.forwardX) {
    listener.forwardX.setValueAtTime(fwdX, ctx.currentTime)
    listener.forwardY.setValueAtTime(fwdY, ctx.currentTime)
    listener.forwardZ.setValueAtTime(fwdZ, ctx.currentTime)
    listener.upX.setValueAtTime(0, ctx.currentTime)
    listener.upY.setValueAtTime(1, ctx.currentTime)
    listener.upZ.setValueAtTime(0, ctx.currentTime)
  } else if ('setOrientation' in listener) {
    (listener as any).setOrientation(fwdX, fwdY, fwdZ, 0, 1, 0)
  }
}

async function ensureUnlocked() {
  if (unlocked) return
  const ctx = getCtx()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  unlocked = true
}

function playNoise(duration: number, volume: number, filterFreq: number) {
  const ctx = getCtx()
  const sampleRate = ctx.sampleRate
  const length = sampleRate * duration
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterFreq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start()
  source.stop(ctx.currentTime + duration)
}

function playTone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export const Sound = {
  gunshot(weapon: string) {
    const volumes: Record<string, number> = {
      ak47: 0.7,
      m4a1: 0.55,
      awp: 0.9,
      deagle: 0.8,
      mp5: 0.35,
      glock: 0.4,
      tec9: 0.45,
      autopistol: 0.42,
      knife: 0.3,
      combatknife: 0.3,
    }
    const freqs: Record<string, number> = {
      ak47: 3000,
      m4a1: 3500,
      awp: 2000,
      deagle: 2500,
      mp5: 4000,
      glock: 3500,
      tec9: 4000,
      autopistol: 3800,
      knife: 5000,
      combatknife: 5000,
    }
    const durations: Record<string, number> = {
      ak47: 0.06,
      m4a1: 0.05,
      awp: 0.12,
      deagle: 0.08,
      mp5: 0.04,
      glock: 0.04,
      tec9: 0.035,
      autopistol: 0.04,
      knife: 0.03,
      combatknife: 0.03,
    }
    const v = (volumes[weapon] ?? 0.5) * getEffectiveVolume()
    const f = freqs[weapon] ?? 3000
    const d = durations[weapon] ?? 0.05
    playNoise(d, v, f)
    // Add a tonal punch for heavier weapons
    if (weapon === 'awp' || weapon === 'deagle') {
      playTone(150, d, v * 0.4, 'sine')
    }
  },

  hitmarker() {
    playTone(1200, 0.03, 0.3 * getEffectiveVolume())
  },

  headshot() {
    playTone(1800, 0.05, 0.4 * getEffectiveVolume())
  },

  dryFire() {
    const vol = getEffectiveVolume()
    playNoise(0.015, 0.25 * vol, 4500)
    playTone(550, 0.02, 0.15 * vol, 'triangle')
  },

  deploy(weapon: string) {
    const vol = getEffectiveVolume()
    const isKnife = weapon === 'knife' || weapon === 'combatknife'
    if (isKnife) {
      playNoise(0.03, 0.25 * vol, 5500)
      playTone(1100, 0.03, 0.15 * vol, 'sine')
    } else {
      playNoise(0.025, 0.2 * vol, 3500)
      playTone(380, 0.025, 0.12 * vol, 'triangle')
    }
  },

  reloadSequence(weapon: string, duration: number) {
    this.cancelReload()
    const vol = getEffectiveVolume()
    const isPistol = ['deagle', 'glock', 'tec9', 'autopistol'].includes(weapon)
    const isSniper = weapon === 'awp'

    // Stage 1: Magazine release / unseat click & slide (~18% of duration)
    const t1 = setTimeout(() => {
      // Mag release click
      playNoise(0.025, 0.22 * vol, 3800)
      playTone(400, 0.03, 0.12 * vol, 'triangle')
    }, Math.max(50, duration * 0.18 * 1000))
    reloadAudioTimers.push(t1)

    // Stage 2: Magazine insert snap / heavy lock (~58% of duration)
    const t2 = setTimeout(() => {
      // Solid mechanical click
      playNoise(0.035, 0.32 * vol, 2800)
      playTone(isSniper ? 280 : isPistol ? 480 : 350, 0.04, 0.25 * vol, 'sine')
      playTone(isSniper ? 550 : isPistol ? 850 : 700, 0.03, 0.18 * vol, 'square')
    }, Math.max(100, duration * 0.58 * 1000))
    reloadAudioTimers.push(t2)

    // Stage 3: Bolt cock / slide rack release (~80% of duration)
    const t3 = setTimeout(() => {
      // Bolt / slide rack mechanical sound
      playNoise(0.03, 0.28 * vol, 4200)
      playTone(isSniper ? 220 : isPistol ? 600 : 450, 0.035, 0.2 * vol, 'triangle')
      // Second snap (bolt release forward)
      setTimeout(() => {
        playNoise(0.02, 0.22 * vol, 4800)
        playTone(isSniper ? 300 : isPistol ? 700 : 520, 0.025, 0.15 * vol, 'sine')
      }, 50)
    }, Math.max(150, duration * 0.80 * 1000))
    reloadAudioTimers.push(t3)
  },

  cancelReload() {
    while (reloadAudioTimers.length > 0) {
      const timer = reloadAudioTimers.pop()
      if (timer) clearTimeout(timer)
    }
  },

  reloadClick() {
    playNoise(0.02, 0.25 * getEffectiveVolume(), 5000)
  },

  killConfirm() {
    const ctx = getCtx()
    const t = ctx.currentTime
    const vol = 0.3 * getEffectiveVolume()
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = 800
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 1200
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)
    osc1.start(t)
    osc2.start(t)
    osc1.stop(t + 0.1)
    osc2.stop(t + 0.1)
  },

  bombBeep() {
    playTone(440, 0.2, 0.3 * getEffectiveVolume())
  },

  footstep(type: 'walk' | 'sprint' | 'crouch' = 'walk') {
    const vol = getEffectiveVolume()
    const baseVol = type === 'sprint' ? 0.15 : type === 'crouch' ? 0.05 : 0.1
    const freq = type === 'sprint' ? 800 : type === 'crouch' ? 400 : 600
    const duration = type === 'sprint' ? 0.04 : type === 'crouch' ? 0.06 : 0.05
    playNoise(duration, baseVol * vol, freq)
  },
}

export function AudioManager() {
  const hitMarker = useNetworkStore((s) => s.hitMarker)
  const killFeed = useNetworkStore((s) => s.killFeed)
  const lastKillLen = useRef(0)
  const lastHitTime = useRef(0)

  useEffect(() => {
    function onFirstInteract() {
      ensureUnlocked()
      window.removeEventListener('pointerdown', onFirstInteract)
      window.removeEventListener('keydown', onFirstInteract)
    }
    window.addEventListener('pointerdown', onFirstInteract)
    window.addEventListener('keydown', onFirstInteract)
    return () => {
      window.removeEventListener('pointerdown', onFirstInteract)
      window.removeEventListener('keydown', onFirstInteract)
    }
  }, [])

  // Play hitmarker/headshot sound when we hit someone
  useEffect(() => {
    if (hitMarker && hitMarker.timestamp !== lastHitTime.current) {
      lastHitTime.current = hitMarker.timestamp
      if (hitMarker.headshot) {
        Sound.headshot()
      } else {
        Sound.hitmarker()
      }
    }
  }, [hitMarker])

  // Play kill confirm sound
  useEffect(() => {
    if (killFeed.length > lastKillLen.current) {
      Sound.killConfirm()
    }
    lastKillLen.current = killFeed.length
  }, [killFeed])

  return null
}
