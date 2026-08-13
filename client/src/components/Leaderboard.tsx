import { useEffect, useState } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";

type BoardPlayer = {
  id: string;
  nickname: string;
  team: string;
  kills: number;
  deaths: number;
  score: number;
  ping: number;
};

export function Leaderboard() {
  const [held, setHeld] = useState(false);
  const remotePlayers = useNetworkStore((s) => s.remotePlayers);
  const playerScores = useNetworkStore((s) => s.playerScores);
  const sessionId = useNetworkStore((s) => s.sessionId);
  const localTeam = useNetworkStore((s) => s.localTeam);
  const localKills = useNetworkStore((s) => s.localKills);
  const localDeaths = useNetworkStore((s) => s.localDeaths);
  const ping = useNetworkStore((s) => s.ping);
  const sendVoteRequest = useNetworkStore((s) => s.sendVoteRequest);
  const gameMode = useNetworkStore((s) => s.round.gameMode);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setHeld(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  if (!held || !sessionId) return null;

  const players: BoardPlayer[] = [];

  if (localTeam) {
    players.push({
      id: sessionId,
      nickname: "You",
      team: localTeam,
      kills: localKills,
      deaths: localDeaths,
      score: playerScores.get(sessionId) ?? 0,
      ping,
    });
  }

  remotePlayers.forEach((p, id) => {
    players.push({
      id,
      nickname: p.nickname,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      score: playerScores.get(id) ?? 0,
      ping: 0,
    });
  });

  // Score-based header for FFA/TDM, team split for defusal
  const isScoreMode = gameMode === "ffa" || gameMode === "tdm";

  const sortedPlayers = isScoreMode
    ? [...players].sort((a, b) => b.score - a.score)
    : players;

  const ctPlayers = sortedPlayers.filter((p) => p.team === "CT");
  const tPlayers = sortedPlayers.filter((p) => p.team === "T");

  const renderRows = (teamPlayers: BoardPlayer[]) => (
    <div style={{ background: "rgba(0,0,0,0.6)", padding: "4px 0" }}>
      <div
        style={{
          display: "flex",
          padding: "4px 16px",
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#888",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ flex: 2 }}>Player</div>
        <div style={{ flex: 1, textAlign: "center" }}>K</div>
        <div style={{ flex: 1, textAlign: "center" }}>D</div>
        {isScoreMode && <div style={{ flex: 1, textAlign: "center" }}>Score</div>}
        <div style={{ flex: 1, textAlign: "center" }}>Ping</div>
        <div style={{ flex: 1, textAlign: "center" }}></div>
      </div>
      {teamPlayers.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            padding: "6px 16px",
            fontFamily: "monospace",
            fontSize: "14px",
            color: p.id === sessionId ? "#facc15" : "white",
            background:
              p.id === sessionId ? "rgba(250,204,21,0.1)" : "transparent",
            pointerEvents: p.id !== sessionId ? "auto" : "none",
          }}
        >
          <div style={{ flex: 2 }}>{p.nickname}</div>
          <div style={{ flex: 1, textAlign: "center" }}>{p.kills}</div>
          <div style={{ flex: 1, textAlign: "center" }}>{p.deaths}</div>
          {isScoreMode && (
            <div style={{ flex: 1, textAlign: "center" }}>{p.score}</div>
          )}
          <div style={{ flex: 1, textAlign: "center" }}>{p.ping}</div>
          <div style={{ flex: 1, textAlign: "center" }}>
            {p.id !== sessionId && (
              <button
                onClick={() => sendVoteRequest(p.id)}
                style={{
                  padding: "2px 10px",
                  fontSize: "11px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                KICK
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTeam = (label: string, color: string, rows: React.ReactNode) => (
    <div style={{ flex: 1, minWidth: "300px", maxWidth: "560px" }}>
      <div
        style={{
          background: color,
          padding: "8px 16px",
          fontFamily: "monospace",
          fontSize: "16px",
          fontWeight: "bold",
          color: "white",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      {rows}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
        gap: "2px",
        fontFamily: "monospace",
        color: "white",
        zIndex: 200,
        pointerEvents: "none",
      }}
    >
      {isScoreMode ? (
        <div style={{ width: "min(720px, 90vw)" }}>
          {renderTeam(
            gameMode === "ffa" ? "FREE FOR ALL" : "TEAM DEATHMATCH",
            "rgba(80,80,80,0.8)",
            renderRows(sortedPlayers)
          )}
        </div>
      ) : (
        <>
          {renderTeam("CT", "rgba(0,100,200,0.8)", renderRows(ctPlayers))}
          {renderTeam("T", "rgba(200,50,0,0.8)", renderRows(tPlayers))}
        </>
      )}
    </div>
  );
}