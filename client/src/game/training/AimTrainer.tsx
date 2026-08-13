import { useEffect, useRef, useCallback } from "react";
import { useGameStore } from "../../stores/useGameStore";
import { Target } from "./Target";

const SPAWN_RANGE = { x: [-15, 15], z: [-30, -10] };
const MAX_TARGETS = 5;

export function AimTrainer() {
  const targets = useGameStore((s) => s.targets);
  const addTarget = useGameStore((s) => s.addTarget);
  const incrementHits = useGameStore((s) => s.incrementHits);
  const isTimerRunning = useGameStore((s) => s.isTimerRunning);

  const spawnTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnTarget = useCallback(() => {
    const id = `target-${Date.now()}-${Math.random()}`;
    const x =
      SPAWN_RANGE.x[0] +
      Math.random() * (SPAWN_RANGE.x[1] - SPAWN_RANGE.x[0]);
    const z =
      SPAWN_RANGE.z[0] +
      Math.random() * (SPAWN_RANGE.z[1] - SPAWN_RANGE.z[0]);

    addTarget({
      id,
      x,
      y: 0,
      z,
      hp: 100,
      maxHp: 100,
      isAlive: true,
    });
  }, [addTarget]);

  const handleTargetHit = useCallback(
    (headshot: boolean) => {
      incrementHits(headshot);
    },
    [incrementHits]
  );

  // Spawn targets periodically while running
  useEffect(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current);
      spawnTimer.current = null;
    }

    if (!isTimerRunning) return;

    // Spawn immediately
    if (targets.size < MAX_TARGETS) {
      spawnTarget();
    }

    spawnTimer.current = setInterval(() => {
      const currentTargets = useGameStore.getState().targets;
      if (currentTargets.size < MAX_TARGETS) {
        spawnTarget();
      }
    }, 800);

    return () => {
      if (spawnTimer.current) {
        clearInterval(spawnTimer.current);
      }
    };
  }, [isTimerRunning, spawnTarget]);

  return (
    <group>
      {/* Render targets */}
      {Array.from(targets.values()).map((target) => (
        <Target
          key={target.id}
          id={target.id}
          position={[target.x, target.y, target.z]}
          onHit={handleTargetHit}
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
    </group>
  );
}

export function AimTrainerUI() {
  const timer = useGameStore((s) => s.timer);
  const isTimerRunning = useGameStore((s) => s.isTimerRunning);
  const stats = useGameStore((s) => s.stats);
  const startTimer = useGameStore((s) => s.startTimer);
  const stopTimer = useGameStore((s) => s.stopTimer);
  const setTimer = useGameStore((s) => s.setTimer);
  const resetStats = useGameStore((s) => s.resetStats);
  const resetTargets = useGameStore((s) => s.resetTargets);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer with ref to avoid closure issues
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!isTimerRunning) return;

    countdownRef.current = setInterval(() => {
      const state = useGameStore.getState();
      const newTime = state.timer - 1;
      
      if (newTime <= 0) {
        useGameStore.getState().stopTimer();
        useGameStore.getState().saveBestTime();
        useGameStore.getState().setTimer(0);
      } else {
        useGameStore.getState().setTimer(newTime);
      }
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isTimerRunning]);

  const handleStart = () => {
    resetTargets();
    resetStats();
    setTimer(60);
    startTimer();
  };

  const handleReset = () => {
    stopTimer();
    resetTargets();
    resetStats();
    setTimer(60);
  };

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
          background: "rgba(0,0,0,0.7)",
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <h2 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>
          AIM TRAINER
        </h2>

        {/* Timer */}
        <div style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "8px" }}>
          {timer}s
        </div>

        {/* Stats */}
        <div style={{ fontSize: "12px", marginBottom: "12px" }}>
          <div>Kills: {stats.kills}</div>
          <div>Headshots: {stats.headshots}</div>
          <div>Accuracy: {stats.accuracy.toFixed(1)}%</div>
          <div>HS Rate: {stats.hsRate.toFixed(1)}%</div>
          <div>Best: {stats.bestTime === Infinity ? "---" : `${stats.bestTime}s`}</div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "8px" }}>
          {!isTimerRunning ? (
            <button
              onClick={handleStart}
              style={{
                padding: "8px 16px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              START
            </button>
          ) : (
            <button
              onClick={stopTimer}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              STOP
            </button>
          )}
          <button
            onClick={handleReset}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
