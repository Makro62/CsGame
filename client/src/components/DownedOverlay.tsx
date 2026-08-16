import { useZombieStore } from "../stores/useZombieStore";
import { HUD_FONT, HUD_MONO, HUD_Z, hudPanel } from "../ui/hudTheme";

export function DownedOverlay() {
  const isDowned = useZombieStore((s) => s.isDowned);
  const downedTimer = useZombieStore((s) => s.downedTimer);
  const reviveProgress = useZombieStore((s) => s.reviveProgress);
  const reviveTargetName = useZombieStore((s) => s.reviveTargetName);

  if (!isDowned && reviveProgress <= 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: HUD_Z.overlay,
        fontFamily: HUD_FONT,
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

      {/* Sits above the contextual prompt row so the two never collide. */}
      {isDowned && (
        <div
          style={{
            ...hudPanel("red"),
            position: "absolute",
            bottom: 210,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 26px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#f87171", fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>
            ⚠️ YOU ARE DOWNED
          </div>
          <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 2 }}>
            Crawling • Bleedout in{" "}
            <strong style={{ color: "#fff", fontFamily: HUD_MONO }}>{Math.ceil(downedTimer)}s</strong>
          </div>
        </div>
      )}

      {/* Revive progress sits just under the crosshair, not on top of it. */}
      {reviveProgress > 0 && (
        <div
          style={{
            ...hudPanel("green"),
            position: "absolute",
            top: "calc(50% + 60px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 22px",
            textAlign: "center",
            minWidth: 260,
          }}
        >
          <div style={{ color: "#34d399", fontSize: 13, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>
            {isDowned ? "BEING REVIVED..." : `REVIVING ${(reviveTargetName || "ALLY").toUpperCase()}...`}
          </div>
          <div
            style={{
              width: "100%",
              height: 10,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 5,
              overflow: "hidden",
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
          <div style={{ fontFamily: HUD_MONO, color: "#94a3b8", fontSize: 11, marginTop: 6 }}>
            {Math.round(reviveProgress)}%
          </div>
        </div>
      )}
    </div>
  );
}
