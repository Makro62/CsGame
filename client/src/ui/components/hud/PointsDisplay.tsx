import { HUD_MONO, hudPanel } from "../../hudTheme";

interface PointsDisplayProps {
  points: number;
}

/** Rendered inside the top-right HUD column, so it must not position itself. */
export function PointsDisplay({ points }: PointsDisplayProps) {
  return (
    <div
      style={{
        ...hudPanel("gold"),
        padding: "6px 14px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: "#94a3b8" }}>
        POINTS
      </span>
      <span
        style={{
          fontFamily: HUD_MONO,
          fontSize: 22,
          fontWeight: 900,
          color: "#ffd700",
          textShadow: "0 0 10px rgba(255, 215, 0, 0.45)",
        }}
      >
        {points.toLocaleString()}
      </span>
    </div>
  );
}
