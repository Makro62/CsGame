import { useWeaponStore } from "../stores/useWeaponStore";
import { useOffline5v5Store } from "../screens/Offline5v5Store";
import { useGameStore } from "../stores/useGameStore";
import { HUD_Z } from "../ui/hudTheme";

export function ADSOpticSight() {
  const { activeWeapon, isADS, isReloading, isSwitching } = useWeaponStore();
  const gameMode = useGameStore((s) => s.mode);
  const isDead = useOffline5v5Store((s) => s.players.get("local")?.isDead ?? false);
  const isAwp = activeWeapon === "awp";

  if (!isADS || isReloading || isSwitching || isAwp) return null;
  if (gameMode === "offline5v5" && isDead) return null;

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
        zIndex: HUD_Z.overlay, // 50, strictly below PauseMenu (90)
        userSelect: "none",
        background:
          "radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.42) 100%)",
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
          boxShadow: "0 0 5px #ef4444, 0 0 10px rgba(239,68,68,0.6)",
        }}
      />
    </div>
  );
}
