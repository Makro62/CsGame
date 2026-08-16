import { useZombieStore } from "../stores/useZombieStore";

export function DownedOverlay() {
  const isDowned = useZombieStore((s) => s.isDowned);
  const downedTimer = useZombieStore((s) => s.downedTimer);
  const reviveProgress = useZombieStore((s) => s.reviveProgress);
  const reviveTargetName = useZombieStore((s) => s.reviveTargetName);

  if (!isDowned && reviveProgress <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "40px 20px",
        boxShadow: isDowned ? "inset 0 0 100px 40px rgba(220, 38, 38, 0.75)" : "none",
        backgroundColor: isDowned ? "rgba(185, 28, 28, 0.15)" : "transparent",
        animation: isDowned ? "downedPulse 1.5s infinite alternate" : "none",
      }}
    >
      <style>{`
        @keyframes downedPulse {
          0% { box-shadow: inset 0 0 70px 30px rgba(220, 38, 38, 0.6); }
          100% { box-shadow: inset 0 0 130px 60px rgba(220, 38, 38, 0.9); }
        }
      `}</style>

      {/* Top Banner when Downed */}
      {isDowned && (
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            border: "2px solid #ef4444",
            borderRadius: "8px",
            padding: "12px 28px",
            textAlign: "center",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: "20px", fontWeight: "900", letterSpacing: "2px" }}>
            ⚠️ YOU ARE DOWNED!
          </div>
          <div style={{ color: "#fca5a5", fontSize: "14px", marginTop: "4px" }}>
            Crawling mode active • Bleedout in: <strong style={{ color: "#fff" }}>{Math.ceil(downedTimer)}s</strong>
          </div>
        </div>
      )}

      {/* Center Revive Progress Bar */}
      {reviveProgress > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "1px solid #10b981",
            borderRadius: "10px",
            padding: "16px 24px",
            textAlign: "center",
            minWidth: "280px",
            boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)",
          }}
        >
          <div style={{ color: "#10b981", fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
            {isDowned ? "BEING REVIVED..." : `REVIVING ${reviveTargetName || "ALLY"}...`}
          </div>
          <div
            style={{
              width: "100%",
              height: "12px",
              backgroundColor: "#1f2937",
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid #374151",
            }}
          >
            <div
              style={{
                width: `${reviveProgress}%`,
                height: "100%",
                backgroundColor: "#10b981",
                transition: "width 0.1s linear",
              }}
            />
          </div>
          <div style={{ color: "#9ca3af", fontSize: "12px", marginTop: "6px" }}>
            {Math.round(reviveProgress)}%
          </div>
        </div>
      )}

      <div />
    </div>
  );
}
