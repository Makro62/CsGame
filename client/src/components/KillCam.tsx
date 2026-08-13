import { useKillCamStore } from "../stores/useKillCamStore";

export function KillCam() {
  const isReplaying = useKillCamStore((s) => s.isReplaying);
  const killerName = useKillCamStore((s) => s.killerName);

  if (!isReplaying) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 200,
      }}
    >
      {/* Red border overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "4px solid rgba(255, 0, 0, 0.6)",
          boxShadow: "inset 0 0 60px rgba(255, 0, 0, 0.3)",
        }}
      />
      
      {/* KILL CAM text */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "monospace",
          fontSize: "28px",
          fontWeight: "bold",
          color: "#ff4444",
          textShadow: "0 0 10px rgba(255, 0, 0, 0.8), 0 2px 4px rgba(0,0,0,0.8)",
          letterSpacing: "4px",
        }}
      >
        KILL CAM
      </div>
      
      {/* Killer name */}
      {killerName && (
        <div
          style={{
            position: "absolute",
            top: "55px",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "monospace",
            fontSize: "16px",
            color: "#ffffff",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          Killed by: {killerName}
        </div>
      )}
    </div>
  );
}
