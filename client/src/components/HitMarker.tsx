import { useNetworkStore } from "../stores/useNetworkStore";

export function HitMarker() {
  const hitMarker = useNetworkStore((s) => s.hitMarker);

  if (!hitMarker) return null;

  const color = hitMarker.headshot ? "#ef4444" : "white";

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {/* Cross */}
      <div
        style={{
          position: "absolute",
          width: "20px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "2px",
          height: "20px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Diagonal lines */}
      <div
        style={{
          position: "absolute",
          width: "14px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(45deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "14px",
          height: "2px",
          backgroundColor: color,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-45deg)",
        }}
      />
    </div>
  );
}
