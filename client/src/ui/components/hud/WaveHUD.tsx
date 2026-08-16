import { WaveState } from "@cs-game/shared";

interface WaveHUDProps {
  currentWave: number;
  waveState: WaveState;
  zombiesRemaining: number;
  interWaveTimer: number;
}

export function WaveHUD({ currentWave, waveState, zombiesRemaining, interWaveTimer }: WaveHUDProps) {
  if (currentWave === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        userSelect: "none",
      }}
    >
      {/* Wave number */}
      <div
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#ffffff",
          textShadow: "0 0 10px rgba(255,100,0,0.8), 0 2px 4px rgba(0,0,0,0.5)",
          letterSpacing: "2px",
        }}
      >
        WAVE {currentWave}
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: "14px",
          color: waveState === "wave_clear" ? "#22c55e" : "#ff6600",
          textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          fontWeight: "bold",
          letterSpacing: "1px",
        }}
      >
        {waveState === "waiting" && "READY"}
        {waveState === "spawning" && "INCOMING..."}
        {waveState === "active" && `${zombiesRemaining} ZOMBIES LEFT`}
        {waveState === "wave_clear" && `WAVE CLEAR! Next in ${Math.ceil(interWaveTimer)}s`}
      </div>

      {/* Progress bar */}
      {waveState === "active" && zombiesRemaining > 0 && (
        <div
          style={{
            width: "200px",
            height: "4px",
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, (1 - zombiesRemaining / (10 + currentWave * 4)) * 100)}%`,
              height: "100%",
              backgroundColor: "#ff6600",
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );
}
