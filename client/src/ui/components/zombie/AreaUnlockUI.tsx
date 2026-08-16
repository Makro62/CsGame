import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { ZOMBIE_INTERACT_RANGE, ZOMBIE_MAP_AREAS, MapArea } from "@cs-game/shared";
import { HUD_MONO, hudPanel } from "../../hudTheme";

// ============================================================================
// Area Unlock UI (door prompt for the area the player is standing next to)
// ============================================================================

/** The locked door in reach, matching the range the server validates. */
export function nearestLockedArea(
  x: number,
  z: number,
  unlockedAreas: string[]
): MapArea | null {
  let closest: MapArea | null = null;
  let closestDist = Infinity;

  for (const area of ZOMBIE_MAP_AREAS) {
    if (area.price <= 0) continue;
    if (unlockedAreas.includes(area.id)) continue;
    if (area.requires && !unlockedAreas.includes(area.requires)) continue;

    const dist = Math.hypot(area.x - x, area.z - z);
    if (dist <= area.radius + ZOMBIE_INTERACT_RANGE && dist < closestDist) {
      closest = area;
      closestDist = dist;
    }
  }

  return closest;
}

export function AreaUnlockUI() {
  const points = useZombieStore((s) => s.points);
  const unlockedAreas = useZombieStore((s) => s.unlockedAreas);
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);

  if (!lastSnapshot) return null;

  const area = nearestLockedArea(lastSnapshot.x, lastSnapshot.z, unlockedAreas);
  if (!area) return null;

  const canAfford = points >= area.price;

  return (
    <div
      style={{
        ...hudPanel(canAfford ? "green" : "neutral"),
        padding: "8px 18px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}>
        {canAfford ? `Press [F] to unlock ${area.name}` : `🔒 ${area.name} locked`}
      </div>
      <div
        style={{
          fontFamily: HUD_MONO,
          fontSize: 11,
          fontWeight: 800,
          color: canAfford ? "#34d399" : "#f87171",
        }}
      >
        {area.price.toLocaleString()} PTS
      </div>
    </div>
  );
}
