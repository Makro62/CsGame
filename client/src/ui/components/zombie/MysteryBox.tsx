import { useState, useEffect, useRef } from "react";
import { MYSTERY_BOX } from "@cs-game/shared";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";

// ============================================================================
// Mystery Box UI
// ============================================================================

interface MysteryBoxProps {
  onClose: () => void;
}

export function MysteryBox({ onClose }: MysteryBoxProps) {
  const points = useZombieStore((s) => s.points);
  const activePowerUp = useZombieStore((s) => s.activePowerUp);
  const sendMysteryBox = useZombieNetworkStore((s) => s.sendMysteryBox);
  const [spinning, setSpinning] = useState(false);
  const [currentWeapon, setCurrentWeapon] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spinIndexRef = useRef(0);

  const isFireSale = activePowerUp === "fire_sale";
  const price = isFireSale ? MYSTERY_BOX.fireSalePrice : MYSTERY_BOX.price;

  useMenuPointerLock();

  useEffect(() => {
    const handleSpin = (e: CustomEvent) => {
      setCurrentWeapon(e.detail.weapon);
      spinIndexRef.current++;
    };

    const handleResult = (e: CustomEvent) => {
      setResult(e.detail.weapon);
      setSpinning(false);
    };

    // A rejected spin has to unlock the UI again, otherwise the box stays
    // "spinning" forever and the player is trapped in the menu.
    const handleFailed = (e: Event) => {
      const detail = (e as CustomEvent<{ item: string }>).detail;
      if (detail.item !== "mystery_box") return;
      setSpinning(false);
      setError(useZombieNetworkStore.getState().lastBuyFailure?.message ?? "Cannot use the box");
    };

    window.addEventListener("mysteryBoxSpin", handleSpin as EventListener);
    window.addEventListener("mysteryBoxResult", handleResult as EventListener);
    window.addEventListener("zombieBuyFailed", handleFailed);
    return () => {
      window.removeEventListener("mysteryBoxSpin", handleSpin as EventListener);
      window.removeEventListener("mysteryBoxResult", handleResult as EventListener);
      window.removeEventListener("zombieBuyFailed", handleFailed);
    };
  }, []);

  // Never let a lost server reply keep the overlay locked.
  useEffect(() => {
    if (!spinning) return;
    const timeout = setTimeout(() => {
      setSpinning(false);
      setError("No response from the box, try again");
    }, (MYSTERY_BOX.spinDuration + 6) * 1000);
    return () => clearTimeout(timeout);
  }, [spinning]);

  const handleUse = () => {
    if (points < price || spinning) return;
    setSpinning(true);
    setResult(null);
    setError(null);
    sendMysteryBox();
  };

  const WEAPON_NAMES: Record<string, string> = {
    ak47: "AK-47",
    m4a1: "M4A1",
    mp5: "MP5",
    awp: "AWP",
    deagle: "Deagle",
    glock: "Glock",
    tec9: "Tec-9",
    autopistol: "Auto Pistol",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !spinning) onClose();
      }}
    >
      <div
        style={{
          width: "400px",
          backgroundColor: "#1a1a2e",
          border: "2px solid #9333ea",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", color: "#9333ea", fontSize: "24px", fontWeight: "bold" }}>
          MYSTERY BOX
        </h2>
        {isFireSale && (
          <div style={{ color: "#ff6600", fontSize: "12px", marginBottom: "8px", fontWeight: "bold" }}>
            FIRE SALE ACTIVE! Only {MYSTERY_BOX.fireSalePrice} points!
          </div>
        )}
        {error && (
          <div style={{ color: "#fca5a5", fontSize: "13px", marginBottom: "8px", fontWeight: "bold" }}>
            {error}
          </div>
        )}

        {/* Weapon display */}
        <div
          style={{
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          {spinning ? (
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#fff",
                animation: "pulse 0.1s infinite",
              }}
            >
              {WEAPON_NAMES[currentWeapon] || currentWeapon}
            </div>
          ) : result ? (
            <div>
              <div style={{ color: "#22c55e", fontSize: "14px", marginBottom: "4px" }}>
                You received:
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ffd700" }}>
                {WEAPON_NAMES[result] || result}
              </div>
            </div>
          ) : (
            <div style={{ color: "#666", fontSize: "14px" }}>
              Spend {price} points for a random weapon
            </div>
          )}
        </div>

        {/* Use button */}
        {!spinning && !result && (
          <button
            onClick={handleUse}
            disabled={points < price}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: points >= price ? "#9333ea" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: points >= price ? "pointer" : "not-allowed",
              opacity: points >= price ? 1 : 0.5,
            }}
          >
            SPIN ({price} PTS)
          </button>
        )}

        {result && (
          <button
            onClick={onClose}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            CONTINUE
          </button>
        )}

        <div style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
          Points: <span style={{ color: "#ffd700", fontWeight: "bold" }}>{points}</span>
        </div>
      </div>
    </div>
  );
}
