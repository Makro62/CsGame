import { create } from 'zustand'

export type GameMode = 'menu' | 'training' | 'multiplayer'

interface Target {
  id: string
  x: number
  y: number
  z: number
  hp: number
  maxHp: number
  isAlive: boolean
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
  lastInput: {
    forward: boolean
    backward: boolean
    left: boolean
    right: boolean
    sprint: boolean
  } | null
  spectatorTargetIndex: number
  shootEvent: number
  tracerEvent: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } } | null

  setNickname: (name: string) => void
  setMode: (mode: GameMode) => void
  setServerMode: (mode: string) => void
  setCurrentMap: (map: string) => void
  setLastInput: (
    input: {
      forward: boolean
      backward: boolean
      left: boolean
      right: boolean
      sprint: boolean
    } | null
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
  setTracerEvent: (tracer: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } } | null) => void
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
    lastInput: null,
    spectatorTargetIndex: 0,
    shootEvent: 0,
    tracerEvent: null,

    setNickname: (name: string) => {
      set({ nickname: name || 'Player' })
    },

    setServerMode: (mode: string) => {
      set({ serverMode: mode })
    },

    setCurrentMap: (map: string) => {
      set({ currentMap: map })
    },

    setLastInput: (
      input: {
        forward: boolean
        backward: boolean
        left: boolean
        right: boolean
        sprint: boolean
      } | null
    ) => {
      set({ lastInput: input })
    },

    setSpectatorTargetIndex: (index: number) => {
      set({ spectatorTargetIndex: index })
    },

    setMode: (mode: GameMode) => {
      set({ mode })
      if (mode === 'training') {
        get().resetTargets()
        get().resetStats()
        set({ timer: 60, isTimerRunning: false })
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
      const { targets } = get()
      const target = targets[id]
      if (!target || !target.isAlive) return

      const newHp = target.hp - damage
      const isDead = newHp <= 0

      if (isDead) {
        get().removeTarget(id)
        set(state => {
          const newStats = {
            ...state.stats,
            kills: state.stats.kills + 1,
            headshots: state.stats.headshots + (isHeadshot ? 1 : 0),
          }
          newStats.hsRate =
            newStats.kills > 0 ? (newStats.headshots / newStats.kills) * 100 : 0
          return { stats: newStats }
        })
      } else {
        set(state => ({
          targets: { ...state.targets, [id]: { ...target, hp: newHp } },
        }))
      }
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
      const saved = localStorage.getItem('training_best_time')
      if (saved) {
        const time = parseFloat(saved)
        if (!isNaN(time) && isFinite(time)) {
          set(state => ({
            stats: { ...state.stats, bestTime: time },
          }))
        }
      }
    },

    saveBestTime: () => {
      const { timer, stats } = get()
      if (timer < stats.bestTime) {
        localStorage.setItem('training_best_time', timer.toString())
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
  }

  return initialState
})
