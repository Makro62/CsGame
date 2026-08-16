import { WaveState } from "@cs-game/shared";
import { HUD_MONO, hudPanel, hudPill } from "../../hudTheme";

interface WaveHUDProps {
  currentWave: number;
  waveState: WaveState;
  zombiesRemaining: number;
  interWaveTimer: number;
}

/** Rendered inside the centered banner stack, so it must not position itself. */
export function WaveHUD({ currentWave, waveState, zombiesRemaining, interWaveTimer }: WaveHUDProps) {
  if (currentWave === 0) return null;

  const cleared = waveState === "wave_clear";
  const total = 10 + currentWave * 4;
  const progress = Math.max(0, Math.min(100, (1 - zombiesRemaining / total) * 100));

  const status =
    waveState === "waiting"
      ? "READY"
      : waveState === "spawning"
        ? "INCOMING"
        : cleared
          ? `NEXT IN ${Math.ceil(interWaveTimer)}S`
          : `${zombiesRemaining} LEFT`;

  return (
    <div
      style={{
        ...hudPanel(cleared ? "green" : "red"),
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 18px",
        minWidth: 220,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: HUD_MONO,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 2,
            color: "#f8fafc",
            textShadow: cleared ? "0 0 12px rgba(34,197,94,0.5)" : "0 0 12px rgba(239,68,68,0.55)",
          }}
        >
          WAVE {currentWave}
        </span>
        <span style={hudPill(cleared ? "green" : "amber")}>{status}</span>
      </div>

      <div
        style={{
          width: "100%",
          height: 4,
          borderRadius: 2,
          background: "rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${cleared ? 100 : waveState === "active" ? progress : 0}%`,
            height: "100%",
            background: cleared ? "#22c55e" : "#ef4444",
            transition: "width 0.3s ease-out",
          }}
        />
      </div>
    </div>
  );
}
