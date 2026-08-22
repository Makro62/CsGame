import { CSSProperties, useState, useEffect, useRef } from "react";
import { Client, Room, RoomAvailable } from "colyseus.js";
import { SERVER_URL } from "../config/network";
import { GlassPanel } from "../ui/components/shared/GlassPanel";
import { Badge } from "../ui/components/shared/Badge";
import { HUD_MONO } from "../ui/hudTheme";

interface ServerBrowserProps {
  onClose: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export function ServerBrowser({ onClose, onJoinRoom, onCreateRoom }: ServerBrowserProps) {
  const [rooms, setRooms] = useState<RoomAvailable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lobbyRef = useRef<Room | null>(null);

  useEffect(() => {
    let cancelled = false;
    const connectToLobby = async () => {
      try {
        const client = new Client(SERVER_URL);
        const lobby = await client.joinOrCreate("lobby", {
          filter: { name: "fps_room" },
        });
        if (cancelled) { lobby.leave(); return; }
        lobbyRef.current = lobby;

        lobby.onMessage("rooms", (roomList: RoomAvailable[]) => {
          if (!cancelled) {
            setRooms(roomList.filter((r) => r.name === "fps_room"));
            setLoading(false);
          }
        });

        lobby.onMessage("+", ([roomId, room]: [string, RoomAvailable]) => {
          if (!cancelled && room.name === "fps_room") {
            setRooms((prev) => {
              const exists = prev.findIndex((r) => r.roomId === roomId);
              if (exists >= 0) {
                const updated = [...prev];
                updated[exists] = room;
                return updated;
              }
              return [...prev, room];
            });
          }
        });

        lobby.onMessage("-", (roomId: string) => {
          if (!cancelled) setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
        });

        lobby.onMessage("*", () => {});

        lobby.onError((code, message) => {
          if (!cancelled) {
            console.error("Lobby error:", code, message);
            setError("Failed to connect to lobby");
            setLoading(false);
          }
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to connect to lobby:", err);
          setError("Failed to connect to server");
          setLoading(false);
        }
      }
    };

    connectToLobby();
    return () => {
      cancelled = true;
      lobbyRef.current?.leave();
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    onJoinRoom(roomId);
    onClose();
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div style={S.overlay}>
      <GlassPanel variant="dark" style={S.modal}>
        <div style={S.header}>
          <h2 style={S.title}>SERVER BROWSER</h2>
          <Badge variant="default" size="sm">{rooms.length} room(s)</Badge>
          <div style={S.headerActions}>
            <button onClick={handleRefresh} style={S.iconBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-cyan)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
            >⟳</button>
            <button onClick={onClose} style={S.iconBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
            >✕</button>
          </div>
        </div>

        <button onClick={onCreateRoom} style={S.createBtn}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          + CREATE NEW ROOM
        </button>

        <div style={S.roomList}>
          {loading ? (
            <div style={S.emptyState}>Loading servers...</div>
          ) : error ? (
            <div style={{ ...S.emptyState, color: "var(--color-health-low)" }}>{error}</div>
          ) : rooms.length === 0 ? (
            <div style={S.emptyState}>No rooms available. Create one!</div>
          ) : (
            rooms.map((room) => (
              <div key={room.roomId} style={S.roomRow}
                onClick={() => handleJoinRoom(room.roomId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59,130,246,0.12)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                <div style={S.roomInfo}>
                  <span style={S.roomName}>{room.metadata?.name || "Game Room"}</span>
                  <span style={S.roomMeta}>
                    {room.metadata?.mode || "bomb_defusal"} · {room.metadata?.map || "container_yard"}
                  </span>
                </div>
                <div style={S.roomStats}>
                  <Badge variant="default" size="sm">{room.clients}/{room.maxClients || 10}</Badge>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={S.footer}>Click a room to join</div>
      </GlassPanel>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(3,7,15,0.85)", backdropFilter: "blur(5px)",
    zIndex: 1000, fontFamily: HUD_MONO, padding: 18,
  },
  modal: {
    width: "min(660px, 94vw)", maxHeight: "80vh", padding: 22,
    display: "flex", flexDirection: "column", gap: 14,
  },
  header: {
    display: "flex", alignItems: "center", gap: 12,
    borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12,
  },
  title: {
    margin: 0, fontSize: 16, letterSpacing: "0.18em", fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  headerActions: { marginLeft: "auto", display: "flex", gap: 8 },
  iconBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.15)",
    color: "var(--color-accent-cyan)", width: 34, height: 34,
    fontSize: 16, cursor: "pointer", borderRadius: 6,
    transition: "all 0.2s", fontFamily: HUD_MONO,
  },
  createBtn: {
    width: "100%", padding: 12, fontWeight: 700, fontSize: 13,
    letterSpacing: "0.12em", cursor: "pointer", fontFamily: HUD_MONO,
    color: "white", border: "none", borderRadius: 8,
    background: "var(--color-terrorist)",
    transition: "filter 0.2s",
  },
  roomList: {
    maxHeight: "40vh", overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
  },
  emptyState: {
    padding: "40px 20px", textAlign: "center",
    color: "var(--color-text-muted)", fontSize: 13,
  },
  roomRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer", background: "rgba(255,255,255,0.03)",
    border: "1px solid transparent",
    transition: "background 0.15s, border-color 0.15s",
  },
  roomInfo: { display: "flex", flexDirection: "column", gap: 3 },
  roomName: { fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" },
  roomMeta: { fontSize: 10, color: "var(--color-text-muted)", letterSpacing: "0.08em" },
  roomStats: { display: "flex", gap: 8, alignItems: "center" },
  footer: {
    marginTop: 4, fontSize: 10, color: "var(--color-text-muted)",
    textAlign: "center", letterSpacing: "0.08em",
  },
};
