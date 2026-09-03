import { useWeaponStore } from "../stores/useWeaponStore";

export function ADSOpticSight() {
  const { activeWeapon, isADS, isReloading, isSwitching } = useWeaponStore();
  const isAwp = activeWeapon === "awp";

  if (!isADS || isReloading || isSwitching || isAwp) return null;

  const isPistol =
    activeWeapon === "glock" ||
    activeWeapon === "deagle" ||
    activeWeapon === "tec9" ||
    activeWeapon === "autopistol";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 140,
        userSelect: "none",
        background:
          "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.12) 82%, rgba(0,0,0,0.38) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: isPistol ? "3px" : "4px",
          height: isPistol ? "3px" : "4px",
          borderRadius: "50%",
          backgroundColor: "#ef4444",
          boxShadow: "0 0 5px #ef4444",
        }}
      />
    </div>
  );
}
