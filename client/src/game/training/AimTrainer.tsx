import { useEffect, useRef, useCallback, useState } from "react"
import { useGameStore } from "../../stores/useGameStore"
import { Bot, type BotDifficulty, type BotBehavior } from "./Bot"

const SPAWN_RANGE = { x: [-15, 15], z: [-30, -10] }
const MAX_BOTS = 5
const BEHAVIORS: BotBehavior[] = ["peeker", "rusher", "camper", "awper"]

export function AimTrainer() {
  const isTimerRunning = useGameStore((s) => s.isTimerRunning)
  const [difficulty] = useState<BotDifficulty>(2)
  const [botCount] = useState(3)
  const [activeBots, setActiveBots] = useState<
    Array<{
      id: string
      x: number
      z: number
      behavior: BotBehavior
      difficulty: BotDifficulty
    }>
  >([])

  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const spawnBot = useCallback(() => {
    if (activeBots.length >= botCount) return

    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const x =
      SPAWN_RANGE.x[0] +
      Math.random() * (SPAWN_RANGE.x[1] - SPAWN_RANGE.x[0])
    const z =
      SPAWN_RANGE.z[0] +
      Math.random() * (SPAWN_RANGE.z[1] - SPAWN_RANGE.z[0])
    const behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)]

    setActiveBots((prev) => [...prev, { id, x, z: x > 0 ? z + 5 : z, behavior, difficulty }])
  }, [activeBots.length, botCount, difficulty])

  const handleBotKill = useCallback(() => {
    useGameStore.getState().incrementShots()
    useGameStore.getState().incrementHits()
  }, [])

  const handleBotHit = useCallback((_headshot: boolean) => {
    // Hit tracking handled by store
  }, [])

  // Spawn bots periodically
  useEffect(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current)
      spawnTimer.current = null
    }

    if (!isTimerRunning) {
      setActiveBots([])
      return
    }

    // Spawn immediately
    if (activeBots.length < botCount) {
      spawnBot()
    }

    spawnTimer.current = setInterval(() => {
      // Respawn dead bots
      setActiveBots((prev) => {
        if (prev.length < botCount) {
          const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const x =
            SPAWN_RANGE.x[0] +
            Math.random() * (SPAWN_RANGE.x[1] - SPAWN_RANGE.x[0])
          const z =
            SPAWN_RANGE.z[0] +
            Math.random() * (SPAWN_RANGE.z[1] - SPAWN_RANGE.z[0])
          const behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)]
          return [...prev, { id, x, z, behavior, difficulty }]
        }
        return prev
      })
    }, 2000)

    return () => {
      if (spawnTimer.current) {
        clearInterval(spawnTimer.current)
      }
    }
  }, [isTimerRunning, botCount, difficulty])

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
          difficulty={bot.difficulty}
          behavior={bot.behavior}
          respawnTime={2000}
        />
      ))}

      {/* Training Area Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, -20]} receiveShadow>
        <boxGeometry args={[40, 30, 1]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 5, -35]}>
        <boxGeometry args={[40, 10, 1]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Side Walls */}
      <mesh position={[-20, 5, -20]}>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>
      <mesh position={[20, 5, -20]}>
        <boxGeometry args={[1, 10, 30]} />
        <meshStandardMaterial color="#2d3748" />
      </mesh>

      {/* Cover objects */}
      <mesh position={[-8, 0.75, -15]}>
        <boxGeometry args={[3, 1.5, 1]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[10, 0.5, -22]}>
        <boxGeometry args={[2, 1, 2]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, 0.6, -28]}>
        <boxGeometry args={[4, 1.2, 1]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
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
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [difficulty, setDifficulty] = useState<BotDifficulty>(2)
  const [botCount, setBotCount] = useState(3)

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
        top: "20px",
        left: "20px",
        color: "white",
        fontFamily: "monospace",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.8)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          width: "220px",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#fbbf24" }}>
          TRAINING RANGE
        </h2>

        {/* Timer */}
        <div style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px", textAlign: "center" }}>
          {timer}s
        </div>

        {/* Difficulty Selector */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px" }}>DIFFICULTY</div>
          <div style={{ display: "flex", gap: "4px" }}>
            {([1, 2, 3, 4, 5] as BotDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontSize: "10px",
                  fontWeight: "bold",
                  background: difficulty === d ? diffColors[d] : "rgba(255,255,255,0.1)",
                  color: difficulty === d ? "white" : "#9ca3af",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ fontSize: "10px", color: diffColors[difficulty], textAlign: "center", marginTop: "2px" }}>
            {diffLabels[difficulty]}
          </div>
        </div>

        {/* Bot Count */}
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px" }}>BOTS</div>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button
              onClick={() => setBotCount(Math.max(1, botCount - 1))}
              style={{
                width: "24px",
                height: "24px",
                fontSize: "14px",
                fontWeight: "bold",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              -
            </button>
            <div style={{ flex: 1, textAlign: "center", fontSize: "16px", fontWeight: "bold" }}>
              {botCount}
            </div>
            <button
              onClick={() => setBotCount(Math.min(MAX_BOTS, botCount + 1))}
              style={{
                width: "24px",
                height: "24px",
                fontSize: "14px",
                fontWeight: "bold",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ fontSize: "11px", marginBottom: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Kills</span>
            <span style={{ fontWeight: "bold" }}>{stats.kills}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Headshots</span>
            <span style={{ fontWeight: "bold" }}>{stats.headshots}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Accuracy</span>
            <span style={{ fontWeight: "bold" }}>{stats.accuracy.toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>HS Rate</span>
            <span style={{ fontWeight: "bold" }}>{stats.hsRate.toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Best</span>
            <span style={{ fontWeight: "bold", color: "#fbbf24" }}>
              {stats.bestTime === Infinity ? "---" : `${stats.bestTime}s`}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "6px" }}>
          {!isTimerRunning ? (
            <button
              onClick={handleStart}
              style={{
                flex: 1,
                padding: "8px 0",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              START
            </button>
          ) : (
            <button
              onClick={stopTimer}
              style={{
                flex: 1,
                padding: "8px 0",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              STOP
            </button>
          )}
          <button
            onClick={handleReset}
            style={{
              padding: "8px 12px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  )
}
