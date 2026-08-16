import { useState, useEffect, useRef } from "react";
import { Client, Room, RoomAvailable } from "colyseus.js";
import { SERVER_URL } from "../config/network";

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
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const connectToLobby = async () => {
      try {
        const client = new Client(SERVER_URL);
        clientRef.current = client;

        const lobby = await client.joinOrCreate("lobby", {
          filter: { name: "fps_room" },
        });
        lobbyRef.current = lobby;

        // Receive full room list
        lobby.onMessage("rooms", (roomList: RoomAvailable[]) => {
          setRooms(roomList.filter((r) => r.name === "fps_room"));
          setLoading(false);
        });

        // Room added
        lobby.onMessage("+", ([roomId, room]: [string, RoomAvailable]) => {
          if (room.name === "fps_room") {
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

        // Room removed
        lobby.onMessage("-", (roomId: string) => {
          setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
        });

        // Room updated
        lobby.onMessage("*", () => {
          // Full state sync, handled by rooms message
        });

        lobby.onError((code, message) => {
          console.error("Lobby error:", code, message);
          setError("Failed to connect to lobby");
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to connect to lobby:", err);
        setError("Failed to connect to server");
        setLoading(false);
      }
    };

    connectToLobby();

    return () => {
      if (lobbyRef.current) {
        lobbyRef.current.leave();
      }
    };
  }, []);

  const handleJoinRoom = (roomId: string) => {
    onJoinRoom(roomId);
    onClose();
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // The lobby will push updates automatically
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: 1000,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
          border: "2px solid #0f3460",
          borderRadius: "8px",
          padding: "24px",
          width: "700px",
          maxHeight: "80vh",
          color: "white",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #0f3460",
            paddingBottom: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", color: "#e94560" }}>
            SERVER BROWSER
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: "6px 12px",
                backgroundColor: "#0f3460",
                color: "white",
                border: "1px solid #e94560",
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              REFRESH
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 12px",
                backgroundColor: "#333",
                color: "white",
                border: "1px solid #666",
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: "12px",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Create Room Button */}
        <button
          onClick={onCreateRoom}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#e94560",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "14px",
            fontWeight: "bold",
            marginBottom: "16px",
          }}
        >
          CREATE NEW ROOM
        </button>

        {/* Room List */}
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            border: "1px solid #0f3460",
            borderRadius: "4px",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#888",
              }}
            >
              Loading servers...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#e94560",
              }}
            >
              {error}
            </div>
          ) : rooms.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#888",
              }}
            >
              No rooms available. Create one!
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.roomId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid #0f3460",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onClick={() => handleJoinRoom(room.roomId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(233, 69, 96, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                    {room.metadata?.name || "Game Room"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
                    Mode: {room.metadata?.mode || "bomb_defusal"} | Map:{" "}
                    {room.metadata?.map || "container_yard"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                    {room.clients}/{room.maxClients || 10}
                  </div>
                  <div style={{ fontSize: "10px", color: "#888" }}>players</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "12px",
            fontSize: "11px",
            color: "#666",
            textAlign: "center",
          }}
        >
          Click a room to join • {rooms.length} room(s) available
        </div>
      </div>
    </div>
  );
}
