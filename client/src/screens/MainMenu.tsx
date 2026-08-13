import { useGameStore } from "../stores/useGameStore";

const SERVER_MODES: { id: string; name: string; desc: string }[] = [
  { id: "bomb_defusal", name: "BOMB DEFUSAL", desc: "5v5 • plant/defuse • buy economy" },
  { id: "ffa", name: "FFA DEATHMATCH", desc: "Free-for-all • first to 20 kills" },
  { id: "tdm", name: "TEAM DEATHMATCH", desc: "T vs CT • first to 75 kills" },
];

export function MainMenu() {
  const { setMode, nickname, setNickname, serverMode, setServerMode } = useGameStore();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
        color: "white",
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          margin: "0 0 8px 0",
          textShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
        }}
      >
        CS WEB FPS
      </h1>
      <p
        style={{
          fontSize: "16px",
          color: "#9ca3af",
          margin: "0 0 32px 0",
        }}
      >
        CS:GO / Krunker Style Browser FPS
      </p>

      {/* Nickname Input */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "6px",
            textTransform: "uppercase",
          }}
        >
          Nickname
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={16}
          style={{
            padding: "10px 16px",
            fontSize: "16px",
            fontFamily: "monospace",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            color: "white",
            textAlign: "center",
            width: "240px",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.6)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(59,130,246,0.3)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Mode Selection */}
      <div style={{ marginBottom: "24px", textAlign: "center" }}>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "8px",
            textTransform: "uppercase",
          }}
        >
          Game Mode
        </label>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {SERVER_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setServerMode(m.id)}
              title={m.desc}
              style={{
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: "bold",
                fontFamily: "monospace",
                background:
                  serverMode === m.id
                    ? "rgba(59,130,246,0.35)"
                    : "rgba(255,255,255,0.08)",
                border:
                  serverMode === m.id
                    ? "1px solid rgba(59,130,246,0.8)"
                    : "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                color: serverMode === m.id ? "#93c5fd" : "#cbd5e1",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "300px",
        }}
      >
        <button
          onClick={() => setMode("training")}
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          TRAINING RANGE
        </button>

        <button
          onClick={() => setMode("multiplayer")}
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          MULTIPLAYER (5v5)
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          color: "#6b7280",
          fontSize: "12px",
          textAlign: "center",
        }}
      >
        <p>WASD - Move | Mouse - Look | LMB - Shoot | R - Reload</p>
        <p>Shift - Sprint | Ctrl - Crouch | Space - Jump | B - Buy Menu</p>
        <p>G - Throw Grenade (hold = preview) | X - Cycle Grenade</p>
      </div>
    </div>
  );
}
