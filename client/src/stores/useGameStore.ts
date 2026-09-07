import { create } from 'zustand'
import { gameEvents } from '../lib/gameEvents'
import { sanitizeDamage, sanitizeRegenAmount } from '../lib/numericGuards'

export type GameMode = 'menu' | 'training' | 'zombie' | 'offline5v5' | 'l4d'

interface Target {
  id: string
  x: number
  y: number
  z: number
  hp: number
  maxHp: number
  isAlive: boolean
}

export interface PlayerInputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  sprint: boolean
  slide: boolean
  airborne: boolean
}

interface TrainingStats {
  kills: number
  headshots: number
  shotsFired: number
  shotsHit: number
  accuracy: number
  hsRate: number
  bestTime: number
}

interface GameState {
  mode: GameMode
  serverMode: string
  nickname: string
  currentMap: string
  targets: Record<string, Target>
  stats: TrainingStats
  timer: number
  isTimerRunning: boolean
  botDifficulty: number
  botCount: number
  lastInput: PlayerInputState | null
  spectatorTargetIndex: number
  shootEvent: number
  tracerEvent: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; color?: string } | null
  // Jump Stamina
  jumpStamina: number
  maxJumpStamina: number

  setNickname: (name: string) => void
  setMode: (mode: GameMode) => void
  setServerMode: (mode: string) => void
  setCurrentMap: (map: string) => void
  setBotDifficulty: (diff: number) => void
  setBotCount: (count: number) => void
  setLastInput: (input: PlayerInputState | null) => void
  updateLastInput: (
    forward: boolean,
    backward: boolean,
    left: boolean,
    right: boolean,
    sprint: boolean,
    slide: boolean,
    airborne: boolean
  ) => void
  setSpectatorTargetIndex: (index: number) => void
  addTarget: (target: Target) => void
  removeTarget: (id: string) => void
  damageTarget: (id: string, damage: number, isHeadshot: boolean) => void
  resetTargets: () => void
  incrementShots: () => void
  incrementHits: () => void
  resetStats: () => void
  setTimer: (time: number) => void
  startTimer: () => void
  stopTimer: () => void
  loadBestTime: () => void
  saveBestTime: () => void
  triggerShoot: () => void
  setTracerEvent: (tracer: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; color?: string } | null) => void
  // Jump Stamina actions
  useJumpStamina: () => boolean
  regenJumpStamina: (amount: number) => void
  resetJumpStamina: () => void
}

export const useGameStore = create<GameState>()((set, get) => {
  const initialState: GameState = {
    mode: 'menu',
    serverMode: 'bomb_defusal',
    nickname: 'Player',
    currentMap: 'container_yard',
    targets: {},
    stats: {
      kills: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
      accuracy: 0,
      hsRate: 0,
      bestTime: Infinity,
    },
    timer: 60,
    isTimerRunning: false,
    botDifficulty: 2,
    botCount: 3,
    lastInput: null,
    spectatorTargetIndex: 0,
    shootEvent: 0,
    tracerEvent: null,
    // Jump Stamina
    jumpStamina: 3,
    maxJumpStamina: 3,

    setNickname: (name: string) => {
      set({ nickname: name || 'Player' })
    },

    setServerMode: (mode: string) => {
      set({ serverMode: mode })
    },

    setCurrentMap: (map: string) => {
      set({ currentMap: map })
    },

    setBotDifficulty: (diff: number) => {
      set({ botDifficulty: diff })
    },

    setBotCount: (count: number) => {
      set({ botCount: Math.max(1, Math.min(5, count)) })
    },

    updateLastInput: (
      forward: boolean,
      backward: boolean,
      left: boolean,
      right: boolean,
      sprint: boolean,
      slide: boolean,
      airborne: boolean
    ) => {
      const current = get().lastInput;
      if (
        current &&
        current.forward === forward &&
        current.backward === backward &&
        current.left === left &&
        current.right === right &&
        current.sprint === sprint &&
        current.slide === slide &&
        current.airborne === airborne
      ) {
        return;
      }
      if (current) {
        current.forward = forward;
        current.backward = backward;
        current.left = left;
        current.right = right;
        current.sprint = sprint;
        current.slide = slide;
        current.airborne = airborne;
        set({ lastInput: current });
      } else {
        set({
          lastInput: { forward, backward, left, right, sprint, slide, airborne },
        });
      }
    },

    setLastInput: (input: PlayerInputState | null) => {
      if (!input) {
        if (get().lastInput !== null) set({ lastInput: null });
        return;
      }
      get().updateLastInput(
        input.forward,
        input.backward,
        input.left,
        input.right,
        input.sprint,
        input.slide,
        input.airborne
      );
    },

    setSpectatorTargetIndex: (index: number) => {
      set({ spectatorTargetIndex: index })
    },

    setMode: (mode: GameMode) => {
      set({ mode })
      if (mode === 'training') {
        // Clear multiplayer session to prevent stale reconnection attempts
        sessionStorage.removeItem('cs_game_session')
        get().resetTargets()
        get().resetStats()
        set({ timer: 60, isTimerRunning: false })
      } else if (mode === 'offline5v5') {
        sessionStorage.removeItem('cs_game_session')
      }
    },

    addTarget: (target: Target) => {
      set(state => ({
        targets: { ...state.targets, [target.id]: target },
      }))
    },

    removeTarget: (id: string) => {
      set(state => {
        const { [id]: _, ...rest } = state.targets
        return { targets: rest }
      })
    },

    damageTarget: (id: string, damage: number, isHeadshot: boolean) => {
      const amount = sanitizeDamage(damage)
      if (amount === null) return
      const { targets } = get()
      const target = targets[id] || { id, x: 0, y: 0, z: 0, hp: 100, maxHp: 100, isAlive: true }
      if (!target.isAlive) return

      const newHp = target.hp - amount
      const isDead = newHp <= 0

      // Emit event so Bot instance can react immediately
      gameEvents.emit('targetDamaged', { id, damage: amount, isHeadshot, isDead, newHp: Math.max(0, newHp) })

      set(state => {
        const headshotIncrement = isHeadshot ? 1 : 0
        const killIncrement = isDead ? 1 : 0
        const newStats = {
          ...state.stats,
          kills: state.stats.kills + killIncrement,
          headshots: state.stats.headshots + headshotIncrement,
        }
        // Accurate headshot rate: relative to total shots hit, or fallback to kills
        newStats.hsRate =
          newStats.shotsHit > 0
            ? (newStats.headshots / newStats.shotsHit) * 100
            : newStats.kills > 0
            ? (newStats.headshots / newStats.kills) * 100
            : 0

        if (isDead) {
          const { [id]: _, ...rest } = state.targets
          return { stats: newStats, targets: rest }
        } else {
          return {
            stats: newStats,
            targets: { ...state.targets, [id]: { ...target, hp: newHp } },
          }
        }
      })
    },

    resetTargets: () => {
      set({ targets: {} })
    },

    incrementShots: () => {
      set(state => ({
        stats: {
          ...state.stats,
          shotsFired: state.stats.shotsFired + 1,
        },
      }))
    },

    incrementHits: () => {
      set(state => {
        const newStats = {
          ...state.stats,
          shotsHit: state.stats.shotsHit + 1,
        }
        newStats.accuracy =
          newStats.shotsFired > 0
            ? (newStats.shotsHit / newStats.shotsFired) * 100
            : 0
        return { stats: newStats }
      })
    },

    resetStats: () => {
      set({
        stats: {
          kills: 0,
          headshots: 0,
          shotsFired: 0,
          shotsHit: 0,
          accuracy: 0,
          hsRate: 0,
          bestTime: get().stats.bestTime,
        },
      })
    },

    setTimer: (time: number) => {
      set({ timer: time })
    },

    startTimer: () => {
      set({ isTimerRunning: true })
    },

    stopTimer: () => {
      set({ isTimerRunning: false })
    },

    loadBestTime: () => {
      try {
        const saved = localStorage.getItem('training_best_time')
        if (saved) {
          const time = parseFloat(saved)
          if (!isNaN(time) && isFinite(time)) {
            set(state => ({
              stats: { ...state.stats, bestTime: time },
            }))
          }
        }
      } catch { /* private browsing / sandbox */ }
    },

    saveBestTime: () => {
      const { timer, stats } = get()
      if (timer < stats.bestTime) {
        try { localStorage.setItem('training_best_time', timer.toString()) } catch { /* private browsing */ }
        set(state => ({
          stats: { ...state.stats, bestTime: timer },
        }))
      }
    },

    triggerShoot: () => {
      set(state => ({ shootEvent: state.shootEvent + 1 }))
    },

    setTracerEvent: (tracer) => {
      set({ tracerEvent: tracer })
    },

    // Jump Stamina actions
    useJumpStamina: () => {
      const { jumpStamina } = get()
      if (jumpStamina > 0) {
        set({ jumpStamina: jumpStamina - 1 })
        return true
      }
      return false
    },

    regenJumpStamina: (amount: number) => {
      const add = sanitizeRegenAmount(amount)
      if (add <= 0) return
      const { jumpStamina, maxJumpStamina } = get()
      if (jumpStamina < maxJumpStamina) {
        set({ jumpStamina: Math.min(maxJumpStamina, jumpStamina + add) })
      }
    },

    resetJumpStamina: () => {
      const { maxJumpStamina } = get()
      set({ jumpStamina: maxJumpStamina })
    },
  }

  return initialState
})
