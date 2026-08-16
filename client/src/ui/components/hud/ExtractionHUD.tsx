import { EXTRACTION_CONFIG } from "@cs-game/shared";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { HUD_MONO, hudPanel, hudPill } from "../../hudTheme";

/** Rendered inside the centered banner stack, so it must not position itself. */
export function ExtractionHUD() {
  const extractionActive = useZombieStore((s) => s.extractionActive);
  const extractionTimer = useZombieStore((s) => s.extractionTimer);
  const extractionAvailable = useZombieStore((s) => s.extractionAvailable);
  const evacSuccess = useZombieStore((s) => s.evacSuccess);
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);

  if (!extractionActive && !extractionAvailable && !evacSuccess) return null;

  const pX = lastSnapshot?.x ?? 0;
  const pZ = lastSnapshot?.z ?? 0;
  const distToHelipad = Math.round(
    Math.hypot(pX - EXTRACTION_CONFIG.helipadPos.x, pZ - EXTRACTION_CONFIG.helipadPos.z)
  );
  const inHelipadZone = distToHelipad <= 12;

  if (evacSuccess) {
    return (
      <div style={{ ...hudPanel("green"), padding: "12px 28px", textAlign: "center" }}>
        <div style={{ color: "#34d399", fontSize: 18, fontWeight: 900, letterSpacing: 1.5 }}>
          🚁 VICTORY — SURVIVORS EXTRACTED
        </div>
        <div style={{ color: "#a7f3d0", fontSize: 12, marginTop: 2 }}>
          +{EXTRACTION_CONFIG.bonusPoints.toLocaleString()} extraction bonus
        </div>
      </div>
    );
  }

  if (extractionActive) {
    return (
      <div
        style={{
          ...hudPanel(inHelipadZone ? "green" : "amber"),
          padding: "10px 22px",
          textAlign: "center",
          animation: "pulse 1.4s infinite",
        }}
      >
        <div
          style={{
            color: inHelipadZone ? "#34d399" : "#fbbf24",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          🚁 {inHelipadZone ? "DEFEND HELIPAD — EVAC INCOMING" : "GET TO THE CHOPPER"}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            marginTop: 6,
          }}
        >
          <span style={{ fontFamily: HUD_MONO, color: "#fff", fontSize: 16, fontWeight: 800 }}>
            ⏱ {Math.ceil(extractionTimer)}s
          </span>
          <span style={hudPill(inHelipadZone ? "green" : "amber")}>
            {inHelipadZone ? "INSIDE EVAC ZONE" : `${distToHelipad}M TO HELIPAD`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...hudPanel("green"), padding: "8px 18px", textAlign: "center" }}>
      <span style={{ color: "#34d399", fontSize: 12, fontWeight: 800, letterSpacing: 0.6 }}>
        🚁 EVAC READY — head north to the helipad and press [F]
      </span>
    </div>
  );
}
