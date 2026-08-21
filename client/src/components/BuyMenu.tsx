import { useState, useEffect } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import {
  WEAPONS,
  GEAR,
  BUY_ZONE,
  PRIMARY_WEAPONS,
  SECONDARY_WEAPONS,
  type BuyFailReason,
} from "@cs-game/shared";
import { gameEvents } from "../lib/gameEvents";

interface BuyItem {
  id: string;
  name: string;
  price: number;
  category: "weapon" | "gear" | "utility";
  /** Which team may buy it; undefined means both */
  team?: string;
  hotkey: string;
}

const WEAPON_NAMES: Record<string, string> = {
  ak47: "AK-47",
  m4a1: "M4A1-S",
  awp: "AWP",
  mp5: "MP5",
  deagle: "Desert Eagle",
  glock: "Glock-18",
  tec9: "Tec-9",
  autopistol: "Auto Pistol",
  combatknife: "Combat Knife",
};

const GEAR_NAMES: Record<string, string> = {
  kevlar: "Kevlar Vest",
  helmet: "Helmet + Kevlar",
  defuseKit: "Defuse Kit",
  grenadeHE: "HE Grenade",
  grenadeSmoke: "Smoke Grenade",
  grenadeFlash: "Flashbang",
};

const FAIL_MESSAGES: Record<BuyFailReason, string> = {
  not_buy_phase: "Buy phase is over",
  outside_buy_zone: "Move into your buy zone first",
  too_fast: "Slow down — one purchase at a time",
  unknown_item: "That item does not exist",
  wrong_team: "Not available for your team",
  no_money: "Not enough money",
  already_owned: "You already have that",
  max_grenades: "Grenade limit reached",
};

// Team restrictions come straight from the weapon table so the menu can never
// disagree with what the server accepts.
function weaponItem(id: string, hotkey: string): BuyItem {
  const stats = WEAPONS[id as keyof typeof WEAPONS];
  return {
    id,
    name: WEAPON_NAMES[id] ?? id,
    price: stats.price,
    category: "weapon",
    team: stats.team === "both" ? undefined : stats.team,
    hotkey,
  };
}

function gearItem(id: string, category: "gear" | "utility", hotkey: string): BuyItem {
  const entry = GEAR[id as keyof typeof GEAR] as { price: number; team?: string };
  return {
    id,
    name: GEAR_NAMES[id] ?? id,
    price: entry.price,
    category,
    team: entry.team,
    hotkey,
  };
}

const BUY_CATALOG: BuyItem[] = [
  ...PRIMARY_WEAPONS.map((id, i) => weaponItem(id, `${i + 1}`)),
  ...SECONDARY_WEAPONS.map((id, i) => weaponItem(id, `${i + 5}`)),
  weaponItem("combatknife", "9"),
  gearItem("kevlar", "gear", "Q"),
  gearItem("helmet", "gear", "W"),
  gearItem("defuseKit", "gear", "E"),
  gearItem("grenadeHE", "utility", "A"),
  gearItem("grenadeSmoke", "utility", "S"),
  gearItem("grenadeFlash", "utility", "D"),
];

export function BuyMenu({ onClose }: { onClose: () => void }) {
  const {
    sendBuy,
    round,
    localMoney,
    localTeam,
    localX,
    localZ,
    localPrimaryWeapon,
    localSecondaryWeapon,
    localKnifeSlot,
    localArmor,
    localHelmet,
    localGrenadeHE,
    localGrenadeSmoke,
    localGrenadeFlash,
  } = useNetworkStore();
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  // The game holds pointer lock, so the cursor cannot reach these buttons
  // until we release it. Re-lock when the menu closes.
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    return () => {
      const canvas = document.querySelector("canvas");
      canvas?.requestPointerLock();
    };
  }, []);

  useEffect(() => {
    const onResult = ({
      item,
      ok,
      reason,
    }: {
      item: string;
      ok: boolean;
      reason?: BuyFailReason;
    }) => {
      const name =
        WEAPON_NAMES[item] ?? GEAR_NAMES[item] ?? item;
      setFeedback(
        ok
          ? { text: `${name} purchased`, ok: true }
          : { text: reason ? FAIL_MESSAGES[reason] : "Purchase rejected", ok: false }
      );
    };
    gameEvents.on("buyResult", onResult);
    return () => gameEvents.off("buyResult", onResult);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 1800);
    return () => clearTimeout(timer);
  }, [feedback]);

  const buyZone = BUY_ZONE[localTeam as keyof typeof BUY_ZONE];
  let inBuyZone = true;
  if (buyZone) {
    const dx = localX - buyZone.x;
    const dz = localZ - buyZone.z;
    inBuyZone = Math.sqrt(dx * dx + dz * dz) <= buyZone.radius;
  }

  const ownedLabel = (item: BuyItem): string | null => {
    switch (item.id) {
      case "kevlar":
        return localArmor > 0 ? "OWNED" : null;
      case "helmet":
        return localHelmet && localArmor > 0 ? "OWNED" : null;
      case "grenadeHE":
        return localGrenadeHE > 0 ? `x${localGrenadeHE}` : null;
      case "grenadeSmoke":
        return localGrenadeSmoke > 0 ? `x${localGrenadeSmoke}` : null;
      case "grenadeFlash":
        return localGrenadeFlash > 0 ? `x${localGrenadeFlash}` : null;
      default:
        break;
    }
    if (item.category !== "weapon") return null;
    if (
      item.id === localPrimaryWeapon ||
      item.id === localSecondaryWeapon ||
      item.id === localKnifeSlot
    ) {
      return "OWNED";
    }
    return null;
  };

  const handleBuy = (item: BuyItem) => {
    if (item.team && item.team !== localTeam) return;
    if (!inBuyZone) {
      setFeedback({ text: FAIL_MESSAGES.outside_buy_zone, ok: false });
      return;
    }
    if (localMoney < item.price) {
      setFeedback({ text: FAIL_MESSAGES.no_money, ok: false });
      return;
    }
    sendBuy(item.id);
  };

  const isAllowed = (item: BuyItem) => !item.team || item.team === localTeam;

  // Keyboard shortcuts: the whole point of a CS buy menu is buying fast.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      const item = BUY_CATALOG.find(
        (i) => i.hotkey.toLowerCase() === e.key.toLowerCase()
      );
      if (item) {
        e.preventDefault();
        // Read fresh state from stores to avoid stale closures
        const state = useNetworkStore.getState();
        if (item.team && item.team !== state.localTeam) return;
        const buyZone = BUY_ZONE[state.localTeam as keyof typeof BUY_ZONE];
        if (buyZone) {
          const dx = state.localX - buyZone.x;
          const dz = state.localZ - buyZone.z;
          if (Math.sqrt(dx * dx + dz * dz) > buyZone.radius) {
            setFeedback({ text: FAIL_MESSAGES.outside_buy_zone, ok: false });
            return;
          }
        }
        if (state.localMoney < item.price) {
          setFeedback({ text: FAIL_MESSAGES.no_money, ok: false });
          return;
        }
        state.sendBuy(item.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const renderSection = (
    title: string,
    color: string,
    category: BuyItem["category"]
  ) => (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontSize: "12px",
          color,
          textTransform: "uppercase",
          marginBottom: "8px",
          fontWeight: "bold",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {BUY_CATALOG.filter((i) => i.category === category && isAllowed(i)).map((item) => (
          <BuyItemButton
            key={item.id}
            item={item}
            localMoney={localMoney}
            disabled={!inBuyZone}
            owned={ownedLabel(item)}
            onBuy={handleBuy}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 200,
        background: "rgba(0,0,0,0.3)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(15,23,42,0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "520px",
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: "monospace",
          color: "white",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
              BUY MENU ({localTeam || "T"})
            </h2>
            <div style={{ color: "#4ade80", fontSize: "14px", fontWeight: "bold", marginTop: "4px" }}>
              Money: ${localMoney.toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            [ESC]
          </button>
        </div>

        {!inBuyZone && (
          <div style={{ marginBottom: "12px", fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>
            ⚠️ MUST BE INSIDE BUY ZONE TO PURCHASE
          </div>
        )}

        {feedback && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "bold",
              color: feedback.ok ? "#4ade80" : "#fca5a5",
              background: feedback.ok ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${feedback.ok ? "rgba(74,222,128,0.35)" : "rgba(239,68,68,0.35)"}`,
            }}
          >
            {feedback.text}
          </div>
        )}

        <div style={{ marginBottom: "12px", fontSize: "12px", color: "#888" }}>
          Buy Phase: {round.buyPhaseTimeLeft.toFixed(1)}s remaining
        </div>

        {renderSection("Weapons", "#60a5fa", "weapon")}
        {renderSection("Gear", "#fbbf24", "gear")}
        {renderSection("Utility", "#a78bfa", "utility")}

        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "#666",
            textAlign: "center",
          }}
        >
          Press the key on a card to buy • B or ESC to close
        </div>
      </div>
    </div>
  );
}

function BuyItemButton({
  item,
  localMoney,
  disabled,
  owned,
  onBuy,
}: {
  item: BuyItem;
  localMoney: number;
  disabled?: boolean;
  owned: string | null;
  onBuy: (item: BuyItem) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isOwned = owned === "OWNED";
  const canAfford = localMoney >= item.price && !disabled && !isOwned;
  const weaponStats = item.category === "weapon" ? WEAPONS[item.id as keyof typeof WEAPONS] : null;
  const dps = weaponStats ? (weaponStats.dmg * weaponStats.fireRate).toFixed(1) : null;

  return (
    <button
      onClick={() => canAfford && onBuy(item)}
      disabled={!canAfford}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: canAfford ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "6px",
        padding: "8px 12px",
        color: canAfford ? "white" : "#666",
        cursor: canAfford ? "pointer" : "not-allowed",
        fontFamily: "monospace",
        fontSize: "12px",
        transition: "all 0.15s",
        opacity: canAfford ? 1 : 0.5,
        textAlign: "left",
      }}
      onMouseOver={(e) => {
        if (canAfford) {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
        }
      }}
      onMouseOut={(e) => {
        if (canAfford) {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <span>
          <span style={{ color: "#64748b", marginRight: "6px" }}>[{item.hotkey}]</span>
          {item.name}
        </span>
        {owned ? (
          <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{owned}</span>
        ) : (
          <span style={{ color: canAfford ? "#4ade80" : "#ef4444", fontWeight: "bold" }}>
            ${item.price.toLocaleString()}
          </span>
        )}
      </div>
      {weaponStats && isHovered && (
        <div style={{ marginTop: "8px", fontSize: "10px", color: "#888", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
            <span>DMG: <span style={{ color: "#ef4444" }}>{weaponStats.dmg}</span></span>
            <span>HS: <span style={{ color: "#fbbf24" }}>{weaponStats.headshot}</span></span>
            <span>ROF: <span style={{ color: "#60a5fa" }}>{weaponStats.fireRate.toFixed(1)}/s</span></span>
            <span>MAG: <span style={{ color: "#a78bfa" }}>{weaponStats.mag}</span></span>
            <span>DPS: <span style={{ color: "#4ade80" }}>{dps}</span></span>
            <span>RLD: <span style={{ color: "#888" }}>{weaponStats.reload}s</span></span>
          </div>
        </div>
      )}
    </button>
  );
}
