import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { ZOMBIE_MAP_AREAS } from "@cs-game/shared";

// ============================================================================
// Area Unlock UI (shows locked areas nearby)
// ============================================================================

export function AreaUnlockUI() {
  const points = useZombieStore((s) => s.points);
  const unlockedAreas = useZombieStore((s) => s.unlockedAreas);
  const sendUnlockArea = useZombieNetworkStore((s) => s.sendUnlockArea);

  const lockedAreas = ZOMBIE_MAP_AREAS.filter((area) => {
    if (unlockedAreas.includes(area.id)) return false;
    if (area.requires && !unlockedAreas.includes(area.requires)) return false;
    return true;
  });

  if (lockedAreas.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "120px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {lockedAreas.map((area) => {
        const canAfford = points >= area.price;
        return (
          <button
            key={area.id}
            onClick={() => sendUnlockArea(area.id)}
            disabled={!canAfford}
            style={{
              padding: "10px 16px",
              backgroundColor: canAfford ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)",
              border: canAfford ? "1px solid #22c55e" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              cursor: canAfford ? "pointer" : "not-allowed",
              opacity: canAfford ? 1 : 0.5,
              textAlign: "left",
              color: "#fff",
              fontFamily: "monospace",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "2px" }}>
              🔓 {area.name}
            </div>
            <div style={{ fontSize: "11px", color: canAfford ? "#22c55e" : "#999" }}>
              {area.price} PTS
            </div>
          </button>
        );
      })}
    </div>
  );
}
