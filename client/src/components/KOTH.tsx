import { useNetworkStore } from "../stores/useNetworkStore";

export function KOTH() {
  const round = useNetworkStore((s) => s.round);

  // Only show in KOTH mode during active phase
  if (round.gameMode !== "koth" || round.phase !== "active") {
    return null;
  }

  const capturingTeam = round.kothCapturingTeam || "";
  const progress = round.kothCaptureProgress || 0;
  const scoreT = round.kothScoreT || 0;
  const scoreCT = round.kothScoreCT || 0;

  const isContested = capturingTeam === "contested";

  let statusText = "UNCONTESTED";
  let statusColor = "#888";
  if (isContested) {
    statusText = "CONTESTED";
    statusColor = "#fbbf24";
  } else if (capturingTeam) {
    statusText = `${capturingTeam} CAPTURING`;
    statusColor = capturingTeam === "T" ? "#ef4444" : "#3b82f6";
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "monospace",
        zIndex: 100,
        textAlign: "center",
      }}
    >
      {/* Score */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#ef4444",
            textShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
          }}
        >
          T: {scoreT}/3
        </div>
        <div
          style={{
            fontSize: "16px",
            color: "#888",
            alignSelf: "center",
          }}
        >
          KOTH
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#3b82f6",
            textShadow: "0 0 10px rgba(59, 130, 246, 0.5)",
          }}
        >
          CT: {scoreCT}/3
        </div>
      </div>

      {/* Capture Progress Bar */}
      <div
        style={{
          width: "300px",
          height: "12px",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          marginBottom: "6px",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: isContested
              ? "#fbbf24"
              : capturingTeam === "T"
              ? "#ef4444"
              : capturingTeam === "CT"
              ? "#3b82f6"
              : "#888",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {/* Status Text */}
      <div
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: statusColor,
          textShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
          letterSpacing: "2px",
        }}
      >
        {statusText} {progress > 0 && !isContested ? `${Math.floor(progress)}%` : ""}
      </div>
    </div>
  );
}
