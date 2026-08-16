import { useState } from "react";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useWeaponStore, WeaponKey } from "../../../stores/useWeaponStore";

// ============================================================================
// Zombie Mode Weapon Shop
// ============================================================================

interface ShopWeapon {
  id: string;
  name: string;
  price: number;
  type: "primary" | "secondary" | "ammo" | "armor" | "perk";
  description: string;
  stats: string;
}

const SHOP_WEAPONS: ShopWeapon[] = [
  // Primary
  { id: "ak47", name: "AK-47", price: 1200, type: "primary", description: "High damage assault rifle", stats: "DMG 35 | MAG 30" },
  { id: "m4a1", name: "M4A1", price: 1400, type: "primary", description: "Balanced assault rifle", stats: "DMG 31 | MAG 25" },
  { id: "mp5", name: "MP5", price: 800, type: "primary", description: "Fast SMG, low recoil", stats: "DMG 24 | MAG 30" },
  { id: "awp", name: "AWP", price: 2500, type: "primary", description: "One-shot sniper", stats: "DMG 115 | MAG 5" },
  // Secondary
  { id: "deagle", name: "Deagle", price: 400, type: "secondary", description: "Powerful pistol", stats: "DMG 53 | MAG 14" },
  { id: "glock", name: "Glock", price: 200, type: "secondary", description: "Standard pistol", stats: "DMG 22 | MAG 20" },
  // Ammo & Armor
  { id: "ammo", name: "Max Ammo", price: 500, type: "ammo", description: "Full refill current weapon", stats: "Refills magazine + reserve" },
  { id: "armor", name: "Body Armor", price: 750, type: "armor", description: "100 armor points", stats: "Reduces damage taken" },
  // Perks
  { id: "juggernog", name: "Juggernog", price: 2500, type: "perk", description: "+100 HP (200 total)", stats: "Survive more hits" },
  { id: "speedcola", name: "Speed Cola", price: 3000, type: "perk", description: "Reload 50% faster", stats: "Quick reload" },
  { id: "doubletap", name: "Double Tap", price: 2000, type: "perk", description: "1.33x fire rate", stats: "Shoot faster" },
  { id: "quickrevive", name: "Quick Revive", price: 1500, type: "perk", description: "Self-revive in solo / Fast revive in co-op", stats: "Auto-revive once" },
];

export const ZOMBIE_PERKS = {
  juggernog: { price: 2500, hpBonus: 100, description: "+100 HP" },
  speedcola: { price: 3000, reloadMultiplier: 0.5, description: "Reload 50% faster" },
  doubletap: { price: 2000, fireRateMultiplier: 1.33, description: "Shoot faster" },
  quickrevive: { price: 1500, selfRevive: true, description: "Self-revive in solo" },
} as const;

export type PerkId = keyof typeof ZOMBIE_PERKS;

interface WeaponShopProps {
  onClose: () => void;
}

export function WeaponShop({ onClose }: WeaponShopProps) {
  const points = useZombieStore((s) => s.points);
  const sendBuyAmmo = useZombieNetworkStore((s) => s.sendBuyAmmo);
  const sendBuyArmor = useZombieNetworkStore((s) => s.sendBuyArmor);
  const sendBuyPerk = useZombieNetworkStore((s) => s.sendBuyPerk);
  const sendSwitchWeapon = useZombieNetworkStore((s) => s.sendSwitchWeapon);
  const equipWeapon = useWeaponStore((s) => s.equipWeapon);

  const [selectedTab, setSelectedTab] = useState<"weapons" | "perks">("weapons");
  const [notification, setNotification] = useState<string | null>(null);

  const handleBuy = (item: ShopWeapon) => {
    if (points < item.price) {
      setNotification("Not enough points!");
      setTimeout(() => setNotification(null), 2000);
      return;
    }

    switch (item.type) {
      case "primary":
      case "secondary":
        sendSwitchWeapon(item.id);
        equipWeapon(item.id as WeaponKey);
        setNotification(`Bought & equipped ${item.name}!`);
        break;
      case "ammo":
        sendBuyAmmo();
        setNotification("Ammo refilled!");
        break;
      case "armor":
        sendBuyArmor();
        setNotification("Armor bought!");
        break;
      case "perk":
        sendBuyPerk(item.id);
        setNotification(`Bought ${item.name}!`);
        break;
    }
    setTimeout(() => setNotification(null), 2000);
  };

  const filteredWeapons = SHOP_WEAPONS.filter((w) => {
    if (selectedTab === "weapons") return w.type !== "perk";
    return w.type === "perk";
  });

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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "700px",
          maxHeight: "80vh",
          backgroundColor: "#1a1a2e",
          border: "2px solid #ff6600",
          borderRadius: "12px",
          padding: "24px",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "#ff6600", fontSize: "24px", fontWeight: "bold" }}>
            SURVIVOR ARMORY & UPGRADES
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ color: "#ffd700", fontSize: "18px", fontWeight: "bold" }}>
              {points} PTS
            </span>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#999",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {(["weapons", "perks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: "monospace",
                background: selectedTab === tab ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.05)",
                border: selectedTab === tab ? "1px solid #ff6600" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: selectedTab === tab ? "#ff6600" : "#999",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Notification */}
        {notification && (
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(255,102,0,0.2)",
              border: "1px solid #ff6600",
              borderRadius: "6px",
              color: "#ff6600",
              fontSize: "14px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {notification}
          </div>
        )}

        {/* Weapon/Perk List */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          {filteredWeapons.map((item) => {
            const canAfford = points >= item.price;
            return (
              <div
                key={item.id}
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: canAfford ? "1px solid rgba(255,102,0,0.4)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: "16px" }}>
                      {item.name}
                    </span>
                    <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "14px" }}>
                      {item.price} PTS
                    </span>
                  </div>
                  <div style={{ color: "#999", fontSize: "12px", marginBottom: "8px" }}>
                    {item.description}
                  </div>
                  <div style={{ color: "#666", fontSize: "11px", fontFamily: "monospace" }}>
                    {item.stats}
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  style={{
                    marginTop: "12px",
                    padding: "8px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    backgroundColor: canAfford ? "#ff6600" : "#333",
                    color: canAfford ? "#fff" : "#666",
                    border: "none",
                    borderRadius: "6px",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    transition: "background 0.2s",
                  }}
                >
                  BUY
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
