import { useState } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import { WEAPONS, GEAR, BUY_ZONE } from "@cs-game/shared";

interface BuyItem {
  id: string;
  name: string;
  price: number;
  category: "weapon" | "gear" | "utility";
  team?: string;
}

const BUY_CATALOG: BuyItem[] = [
  // Primary Rifles
  { id: "ak47", name: "AK-47", price: WEAPONS.ak47.price, category: "weapon", team: "T" },
  { id: "m4a1", name: "M4A1-S", price: WEAPONS.m4a1.price, category: "weapon", team: "CT" },
  { id: "awp", name: "AWP", price: WEAPONS.awp.price, category: "weapon" },
  { id: "mp5", name: "MP5", price: WEAPONS.mp5.price, category: "weapon" },
  // Pistols
  { id: "deagle", name: "Desert Eagle", price: WEAPONS.deagle.price, category: "weapon" },
  { id: "glock", name: "Glock-18", price: WEAPONS.glock.price, category: "weapon" },
  { id: "tec9", name: "Tec-9", price: WEAPONS.tec9.price, category: "weapon", team: "T" },
  { id: "autopistol", name: "Auto Pistol", price: WEAPONS.autopistol.price, category: "weapon", team: "CT" },
  // Melee
  { id: "knife", name: "Knife", price: WEAPONS.knife.price, category: "weapon" },
  { id: "combatknife", name: "Combat Knife", price: WEAPONS.combatknife.price, category: "weapon" },
  // Gear
  { id: "kevlar", name: "Kevlar Vest", price: GEAR.kevlar.price, category: "gear" },
  { id: "helmet", name: "Helmet + Kevlar", price: GEAR.helmet.price, category: "gear" },
  { id: "defuseKit", name: "Defuse Kit", price: GEAR.defuseKit.price, category: "gear", team: "CT" },
  // Utility
  { id: "grenadeHE", name: "HE Grenade", price: GEAR.grenadeHE.price, category: "utility" },
  { id: "grenadeSmoke", name: "Smoke Grenade", price: GEAR.grenadeSmoke.price, category: "utility" },
  { id: "grenadeFlash", name: "Flashbang", price: GEAR.grenadeFlash.price, category: "utility" },
];

export function BuyMenu({ onClose }: { onClose: () => void }) {
  const { sendBuy, round, localMoney, localTeam, localX, localZ } = useNetworkStore();
  const isBuyPhase = round.phase === "buy";

  if (!isBuyPhase) return null;

  const buyZone = BUY_ZONE[localTeam as keyof typeof BUY_ZONE];
  let inBuyZone = true;
  if (buyZone) {
    const dx = localX - buyZone.x;
    const dz = localZ - buyZone.z;
    inBuyZone = Math.sqrt(dx * dx + dz * dz) <= buyZone.radius;
  }

  const handleBuy = (item: BuyItem) => {
    if (!inBuyZone) return;
    if (localMoney < item.price) return;
    if (item.team && item.team !== localTeam) return;
    sendBuy(item.id);
  };

  const isAllowed = (item: BuyItem) => {
    if (item.team && item.team !== localTeam) return false;
    return true;
  };

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

        <div style={{ marginBottom: "12px", fontSize: "12px", color: "#888" }}>
          Buy Phase: {round.buyPhaseTimeLeft.toFixed(1)}s remaining
        </div>

        {/* Weapons */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#60a5fa",
              textTransform: "uppercase",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Weapons
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {BUY_CATALOG.filter((i) => i.category === "weapon" && isAllowed(i)).map((item) => (
              <BuyItemButton key={item.id} item={item} localMoney={localMoney} disabled={!inBuyZone} onBuy={handleBuy} />
            ))}
          </div>
        </div>

        {/* Gear */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "#fbbf24",
              textTransform: "uppercase",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Gear
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {BUY_CATALOG.filter((i) => i.category === "gear" && isAllowed(i)).map((item) => (
              <BuyItemButton key={item.id} item={item} localMoney={localMoney} disabled={!inBuyZone} onBuy={handleBuy} />
            ))}
          </div>
        </div>

        {/* Utility */}
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "#a78bfa",
              textTransform: "uppercase",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            Utility
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {BUY_CATALOG.filter((i) => i.category === "utility" && isAllowed(i)).map((item) => (
              <BuyItemButton key={item.id} item={item} localMoney={localMoney} disabled={!inBuyZone} onBuy={handleBuy} />
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "#666",
            textAlign: "center",
          }}
        >
          Press B to close • Prices are per-item
        </div>
      </div>
    </div>
  );
}

function BuyItemButton({
  item,
  localMoney,
  disabled,
  onBuy,
}: {
  item: BuyItem;
  localMoney: number;
  disabled?: boolean;
  onBuy: (item: BuyItem) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const canAfford = localMoney >= item.price && !disabled;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{item.name}</span>
        <span style={{ color: canAfford ? "#4ade80" : "#ef4444", fontWeight: "bold" }}>
          ${item.price.toLocaleString()}
        </span>
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
