import { useEffect, useRef, useCallback, useState } from "react"
import { useGameStore } from "../../stores/useGameStore"
import { Bot, type BotDifficulty, type BotBehavior } from "./Bot"

// Bot zone of TrainingArena, kept clear of the firing line
const SPAWN_RANGE = { x: [-16, 16], z: [-40, -14] }
const MAX_BOTS = 5
const BEHAVIORS: BotBehavior[] = ["peeker", "rusher", "camper", "awper"]

export function AimTrainer() {
  const botDifficulty = useGameStore((s) => (s.botDifficulty || 2) as BotDifficulty)
  const botCount = useGameStore((s) => s.botCount || 3)
  const [activeBots, setActiveBots] = useState<
    Array<{
      id: string
      x: number
      z: number
      behavior: BotBehavior
      difficulty: BotDifficulty
    }>
  >([])

  // Ensure bots are continuously populated up to botCount
  useEffect(() => {
    setActiveBots((prev) => {
      if (prev.length === botCount) return prev
      if (prev.length > botCount) return prev.slice(0, botCount)

      const next = [...prev]
      while (next.length < botCount) {
        const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const x =
          SPAWN_RANGE.x[0] +
          Math.random() * (SPAWN_RANGE.x[1] - SPAWN_RANGE.x[0])
        const z =
          SPAWN_RANGE.z[0] +
          Math.random() * (SPAWN_RANGE.z[1] - SPAWN_RANGE.z[0])
        const behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)]
        next.push({ id, x, z, behavior, difficulty: botDifficulty })
      }
      return next
    })
  }, [botCount, botDifficulty])

  const handleBotKill = useCallback(() => {
    // Kill stats are incremented in damageTarget
  }, [])

  const handleBotHit = useCallback((_headshot: boolean) => {
    // Hit tracking handled by store
  }, [])

  return (
    <group>
      {/* Render bots */}
      {activeBots.map((bot) => (
        <Bot
          key={bot.id}
          id={bot.id}
          position={[bot.x, 0, bot.z]}
          onHit={handleBotHit}
          onKill={handleBotKill}
          difficulty={botDifficulty}
          behavior={bot.behavior}
          respawnTime={2000}
        />
      ))}
    </group>
  )
}

export function AimTrainerUI() {
  const timer = useGameStore((s) => s.timer)
  const isTimerRunning = useGameStore((s) => s.isTimerRunning)
  const stats = useGameStore((s) => s.stats)
  const startTimer = useGameStore((s) => s.startTimer)
  const stopTimer = useGameStore((s) => s.stopTimer)
  const setTimer = useGameStore((s) => s.setTimer)
  const resetStats = useGameStore((s) => s.resetStats)
  const resetTargets = useGameStore((s) => s.resetTargets)
  const difficulty = useGameStore((s) => (s.botDifficulty || 2) as BotDifficulty)
  const setDifficulty = useGameStore((s) => s.setBotDifficulty)
  const botCount = useGameStore((s) => s.botCount || 3)
  const setBotCount = useGameStore((s) => s.setBotCount)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }

    if (!isTimerRunning) return

    countdownRef.current = setInterval(() => {
      const state = useGameStore.getState()
      const newTime = state.timer - 1

      if (newTime <= 0) {
        useGameStore.getState().stopTimer()
        useGameStore.getState().saveBestTime()
        useGameStore.getState().setTimer(0)
      } else {
        useGameStore.getState().setTimer(newTime)
      }
    }, 1000)

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [isTimerRunning])

  const handleStart = () => {
    resetTargets()
    resetStats()
    setTimer(60)
    startTimer()
  }

  const handleReset = () => {
    stopTimer()
    resetTargets()
    resetStats()
    setTimer(60)
  }

  const diffLabels: Record<BotDifficulty, string> = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Expert",
    5: "Legend",
  }

  const diffColors: Record<BotDifficulty, string> = {
    1: "#22c55e",
    2: "#3b82f6",
    3: "#f59e0b",
    4: "#f97316",
    5: "#ef4444",
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        left: "24px",
        color: "white",
        fontFamily: "'Inter', monospace, sans-serif",
        zIndex: 100,
        userSelect: "none",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75))",
          backdropFilter: "blur(16px)",
          padding: "20px",
          borderRadius: "16px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          boxShadow: "0 16px 36px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.1)",
          width: "250px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🎯</span>
            <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "1.5px", color: "#60a5fa" }}>
              AIM DRILL V3
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: isTimerRunning ? "rgba(34, 197, 94, 0.2)" : "rgba(100, 116, 139, 0.2)",
              color: isTimerRunning ? "#4ade80" : "#94a3b8",
              border: `1px solid ${isTimerRunning ? "rgba(34, 197, 94, 0.4)" : "rgba(100, 116, 139, 0.3)"}`,
              fontWeight: "bold",
              letterSpacing: "1px",
            }}
          >
            {isTimerRunning ? "● ACTIVE" : "IDLE"}
          </span>
        </div>

        {/* Timer Digital Display */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.45)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "10px",
            marginBottom: "14px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "32px", fontWeight: 900, fontFamily: "monospace", color: isTimerRunning ? "#22d3ee" : "#f1f5f9", textShadow: isTimerRunning ? "0 0 16px rgba(34, 211, 238, 0.5)" : "none" }}>
            {timer}<span style={{ fontSize: "16px", color: "#64748b", marginLeft: "2px" }}>s</span>
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "1px" }}>SESSION TIMER (60s)</div>
        </div>

        {/* Difficulty Selector */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>
            <span>DIFFICULTY</span>
            <span style={{ color: diffColors[difficulty] }}>{diffLabels[difficulty].toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            {([1, 2, 3, 4, 5] as BotDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: "11px",
                  fontWeight: 900,
                  background: difficulty === d ? diffColors[d] : "rgba(255,255,255,0.06)",
                  color: difficulty === d ? "white" : "#94a3b8",
                  border: difficulty === d ? `1px solid ${diffColors[d]}` : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: difficulty === d ? `0 0 10px ${diffColors[d]}88` : "none",
                  transition: "all 0.2s",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Bot Count */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px", fontWeight: "bold" }}>TARGET DUMMIES / BOTS</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "4px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setBotCount(Math.max(1, botCount - 1))}
              style={{
                width: "28px",
                height: "28px",
                fontSize: "14px",
                fontWeight: "bold",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              -
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: "14px", fontWeight: 800, color: "#38bdf8" }}>
              {botCount} ACTIVE
            </div>
            <button
              onClick={() => setBotCount(Math.min(MAX_BOTS, botCount + 1))}
              style={{
                width: "28px",
                height: "28px",
                fontSize: "14px",
                fontWeight: "bold",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Stats Telemetry */}
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: "10px", padding: "10px", marginBottom: "14px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "11px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Kills:</span>
            <span style={{ fontWeight: 800, color: "#f8fafc" }}>{stats.kills}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Headshots:</span>
            <span style={{ fontWeight: 800, color: "#f87171" }}>{stats.headshots}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Accuracy:</span>
            <span style={{ fontWeight: 800, color: stats.accuracy >= 50 ? "#4ade80" : stats.accuracy >= 25 ? "#facc15" : "#94a3b8" }}>
              {stats.accuracy.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>HS Rate:</span>
            <span style={{ fontWeight: 800, color: "#38bdf8" }}>{stats.hsRate.toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "4px" }}>
            <span style={{ color: "#94a3b8" }}>Best Record:</span>
            <span style={{ fontWeight: 800, color: "#fbbf24" }}>
              {stats.bestTime === Infinity ? "---" : `${stats.bestTime}s`}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "8px" }}>
          {!isTimerRunning ? (
            <button
              onClick={handleStart}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "white",
                border: "1px solid #4ade80",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "12px",
                letterSpacing: "1px",
                boxShadow: "0 0 16px rgba(22, 163, 74, 0.4)",
              }}
            >
              ▶ START DRILL
            </button>
          ) : (
            <button
              onClick={stopTimer}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                color: "white",
                border: "1px solid #f87171",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "12px",
                letterSpacing: "1px",
                boxShadow: "0 0 16px rgba(220, 38, 38, 0.4)",
              }}
            >
              ⏹ STOP DRILL
            </button>
          )}
          <button
            onClick={handleReset}
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "11px",
            }}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  )
}
