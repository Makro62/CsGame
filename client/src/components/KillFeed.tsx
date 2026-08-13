import { useNetworkStore } from "../stores/useNetworkStore";

export function KillFeed() {
  const killFeed = useNetworkStore((s) => s.killFeed);
  const sessionId = useNetworkStore((s) => s.sessionId);

  if (killFeed.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        zIndex: 100,
      }}
    >
      {killFeed.map((event, index) => {
        const isKiller = event.killerId === sessionId;
        const isVictim = event.victimId === sessionId;
        const opacity = 1 - index * 0.15;

        return (
          <div
            key={`${event.timestamp}-${index}`}
            style={{
              background: "rgba(0,0,0,0.7)",
              padding: "6px 12px",
              borderRadius: "4px",
              color: "white",
              fontFamily: "monospace",
              fontSize: "12px",
              opacity,
              transition: "opacity 0.3s",
            }}
          >
            <span
              style={{
                color: isKiller ? "#22c55e" : "#ef4444",
                fontWeight: "bold",
              }}
            >
              {event.killerName}
            </span>
            <span style={{ margin: "0 8px", color: "#9ca3af" }}>
              [{event.weapon.toUpperCase()}]
            </span>
            <span
              style={{
                color: isVictim ? "#ef4444" : "#22c55e",
                fontWeight: "bold",
              }}
            >
              {event.victimName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
