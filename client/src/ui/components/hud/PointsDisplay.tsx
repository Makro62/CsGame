interface PointsDisplayProps {
  points: number;
}

export function PointsDisplay({ points }: PointsDisplayProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#aaa",
          textShadow: "0 1px 3px rgba(0,0,0,0.7)",
        }}
      >
        POINTS
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#ffd700",
          textShadow: "0 0 8px rgba(255,215,0,0.5), 0 2px 4px rgba(0,0,0,0.5)",
          letterSpacing: "1px",
        }}
      >
        {points}
      </div>
    </div>
  );
}
