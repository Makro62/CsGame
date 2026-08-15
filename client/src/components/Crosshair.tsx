import { useWeaponStore } from "../stores/useWeaponStore";
import { useGameStore } from "../stores/useGameStore";
import { useSettingsStore } from "../stores/useSettingsStore";

export function Crosshair() {
  const { activeWeapon, isReloading, isSwitching, isADS, bulletsFired } = useWeaponStore();
  const lastInput = useGameStore((s) => s.lastInput);
  const { crosshairColor, crosshairSize, crosshairStyle } = useSettingsStore();

  if (!activeWeapon || isReloading || isSwitching) return null;

  // Calculate spread based on movement
  const isMoving = lastInput && (lastInput.forward || lastInput.backward || lastInput.left || lastInput.right);
  const isSprinting = lastInput?.sprint;
  
  // Base spread values
  let spreadSize = 0;
  if (!isADS) {
    spreadSize = 4; // Base spread
    if (isMoving) spreadSize += 4;
    if (isSprinting) spreadSize += 8;
    if (bulletsFired > 0) spreadSize += Math.min(bulletsFired * 0.5, 4);
  } else {
    spreadSize = 0; // ADS = perfect accuracy
  }

  const sizeMultiplier = crosshairSize;
  const lineLength = 8 * sizeMultiplier;
  const gap = (3 + spreadSize) * sizeMultiplier;
  const thickness = 2 * sizeMultiplier;

  // For dynamic style, hide lines when ADS
  const showLines = crosshairStyle === 'dynamic' ? !isADS : crosshairStyle === 'cross';
  const showDot = crosshairStyle !== 'cross' || isADS;

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
      {/* Center dot */}
      {showDot && (
        <div
          style={{
            position: "absolute",
            width: `${6 * sizeMultiplier}px`,
            height: `${6 * sizeMultiplier}px`,
            backgroundColor: crosshairColor,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.9)",
          }}
        />
      )}
      
      {/* Top line */}
      {showLines && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${-gap - lineLength}px`,
            width: `${thickness}px`,
            height: `${lineLength}px`,
            backgroundColor: crosshairColor,
            transform: "translateX(-50%)",
          }}
        />
      )}
      
      {/* Bottom line */}
      {showLines && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${gap}px`,
            width: `${thickness}px`,
            height: `${lineLength}px`,
            backgroundColor: crosshairColor,
            transform: "translateX(-50%)",
          }}
        />
      )}
      
      {/* Left line */}
      {showLines && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${-gap - lineLength}px`,
            width: `${lineLength}px`,
            height: `${thickness}px`,
            backgroundColor: crosshairColor,
            transform: "translateY(-50%)",
          }}
        />
      )}
      
      {/* Right line */}
      {showLines && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${gap}px`,
            width: `${lineLength}px`,
            height: `${thickness}px`,
            backgroundColor: crosshairColor,
            transform: "translateY(-50%)",
          }}
        />
      )}
    </div>
  );
}
