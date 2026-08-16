import { useZombieStore } from "../../../stores/useZombieStore";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";

export function ExtractionHUD() {
  const extractionActive = useZombieStore((s) => s.extractionActive);
  const extractionTimer = useZombieStore((s) => s.extractionTimer);
  const extractionAvailable = useZombieStore((s) => s.extractionAvailable);
  const evacSuccess = useZombieStore((s) => s.evacSuccess);
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);

  if (!extractionActive && !extractionAvailable && !evacSuccess) return null;

  // Calculate distance to Helipad [0, 50]
  const pX = lastSnapshot?.x ?? 0;
  const pZ = lastSnapshot?.z ?? 0;
  const distToHelipad = Math.round(Math.sqrt(pX ** 2 + (pZ - 50) ** 2));
  const inHelipadZone = distToHelipad <= 12;

  if (evacSuccess) {
    return (
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(16, 185, 129, 0.9)",
          border: "2px solid #34d399",
          borderRadius: "8px",
          padding: "16px 36px",
          textAlign: "center",
          boxShadow: "0 0 30px rgba(52, 211, 153, 0.7)",
          zIndex: 40,
        }}
      >
        <div style={{ color: "#fff", fontSize: "24px", fontWeight: "900", letterSpacing: "2px" }}>
          🚁 VICTORY — SURVIVORS EXTRACTED!
        </div>
        <div style={{ color: "#d1fae5", fontSize: "14px", marginTop: "4px" }}>
          +5,000 Extraction Bonus Points Awarded!
        </div>
      </div>
    );
  }

  if (extractionActive) {
    return (
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          border: inHelipadZone ? "2px solid #10b981" : "2px solid #f59e0b",
          borderRadius: "10px",
          padding: "14px 28px",
          textAlign: "center",
          boxShadow: inHelipadZone ? "0 0 25px rgba(16, 185, 129, 0.6)" : "0 0 25px rgba(245, 158, 11, 0.6)",
          zIndex: 40,
          animation: "pulse 1s infinite",
        }}
      >
        <div style={{ color: inHelipadZone ? "#10b981" : "#f59e0b", fontSize: "20px", fontWeight: "900", letterSpacing: "1px" }}>
          🚁 {inHelipadZone ? "DEFEND HELIPAD! EVAC INCOMING" : "GET TO THE CHOPPER!"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "6px" }}>
          <div style={{ color: "#fff", fontSize: "18px", fontWeight: "bold" }}>
            ⏱️ {Math.ceil(extractionTimer)}s
          </div>
          <div style={{ color: inHelipadZone ? "#34d399" : "#fbbf24", fontSize: "14px" }}>
            {inHelipadZone ? "✅ Inside Evac Zone" : `📍 Distance to Helipad: ${distToHelipad}m`}
          </div>
        </div>
      </div>
    );
  }

  if (extractionAvailable) {
    return (
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          border: "1px solid #10b981",
          borderRadius: "8px",
          padding: "10px 24px",
          textAlign: "center",
          zIndex: 40,
        }}
      >
        <span style={{ color: "#34d399", fontWeight: "bold", fontSize: "14px" }}>
          🚁 HELIPAD EVACUATION READY! Reach Helipad (North) or Press [F] near Helipad
        </span>
      </div>
    );
  }

  return null;
}
