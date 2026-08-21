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
  if (currentWave === 0 && waveState !== "buy_phase") return null;

  const cleared = waveState === "wave_clear";
  const buying = waveState === "buy_phase";
  const total = 10 + currentWave * 4;
  const progress = Math.max(0, Math.min(100, (1 - zombiesRemaining / total) * 100));

  const status = buying
    ? `BUY TIME ${Math.ceil(interWaveTimer)}S`
    : waveState === "waiting"
      ? "READY"
      : waveState === "spawning"
        ? "INCOMING"
        : cleared
          ? `NEXT IN ${Math.ceil(interWaveTimer)}S`
          : `${zombiesRemaining} LEFT`;

  const panelColor = buying ? "gold" : cleared ? "green" : "red";
  const pillColor = buying ? "gold" : cleared ? "green" : "amber";

  return (
    <div
      style={{
        ...hudPanel(panelColor),
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
            textShadow: buying
              ? "0 0 12px rgba(255,215,0,0.5)"
              : cleared
                ? "0 0 12px rgba(34,197,94,0.5)"
                : "0 0 12px rgba(239,68,68,0.55)",
          }}
        >
          {buying ? "BUY PHASE" : `WAVE ${currentWave}`}
        </span>
        <span style={hudPill(pillColor)}>{status}</span>
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
            width: buying ? `${Math.max(0, (interWaveTimer / 15) * 100)}%` : cleared ? "100%" : waveState === "active" ? `${progress}%` : "0%",
            height: "100%",
            background: buying ? "#ffd700" : cleared ? "#22c55e" : "#ef4444",
            transition: "width 0.3s ease-out",
          }}
        />
      </div>
    </div>
  );
}
