import { useEffect, useState } from "react";
import { WEAPONS, ZOMBIE_SHOP } from "@cs-game/shared";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";

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

// Prices always come from the shared config so the label matches what the
// server charges; only the wording lives here.
function weaponEntry(
  id: keyof typeof WEAPONS,
  name: string,
  type: "primary" | "secondary",
  description: string
): ShopWeapon {
  const stats = WEAPONS[id];
  return {
    id,
    name,
    price: ZOMBIE_SHOP.weaponPrices[id] ?? 0,
    type,
    description,
    stats: `DMG ${stats.dmg} | MAG ${stats.mag}`,
  };
}

const SHOP_WEAPONS: ShopWeapon[] = [
  weaponEntry("ak47", "AK-47", "primary", "High damage assault rifle"),
  weaponEntry("m4a1", "M4A1", "primary", "Balanced assault rifle"),
  weaponEntry("mp5", "MP5", "primary", "Fast SMG, low recoil"),
  weaponEntry("awp", "AWP", "primary", "One-shot sniper"),
  weaponEntry("deagle", "Deagle", "secondary", "Powerful pistol"),
  weaponEntry("glock", "Glock", "secondary", "Standard pistol"),
  {
    id: "ammo",
    name: "Max Ammo",
    price: ZOMBIE_SHOP.ammoPrice,
    type: "ammo",
    description: "Full refill current weapon",
    stats: "Refills magazine + reserve",
  },
  {
    id: "armor",
    name: "Body Armor",
    price: ZOMBIE_SHOP.armorPrice,
    type: "armor",
    description: "100 armor points",
    stats: "Reduces damage taken",
  },
  {
    id: "juggernog",
    name: "Juggernog",
    price: ZOMBIE_SHOP.perks.juggernog.price,
    type: "perk",
    description: "+100 HP (200 total)",
    stats: "Survive more hits",
  },
  {
    id: "speedcola",
    name: "Speed Cola",
    price: ZOMBIE_SHOP.perks.speedcola.price,
    type: "perk",
    description: "Reload 50% faster",
    stats: "Quick reload",
  },
  {
    id: "doubletap",
    name: "Double Tap",
    price: ZOMBIE_SHOP.perks.doubletap.price,
    type: "perk",
    description: "1.33x fire rate",
    stats: "Shoot faster",
  },
  {
    id: "quickrevive",
    name: "Quick Revive",
    price: ZOMBIE_SHOP.perks.quickrevive.price,
    type: "perk",
    description: "One extra life in solo / faster co-op revive",
    stats: "Costs one life when used",
  },
];

interface WeaponShopProps {
  onClose: () => void;
}

export function WeaponShop({ onClose }: WeaponShopProps) {
  const points = useZombieStore((s) => s.points);
  const sendBuyWeapon = useZombieNetworkStore((s) => s.sendBuyWeapon);
  const sendBuyAmmo = useZombieNetworkStore((s) => s.sendBuyAmmo);
  const sendBuyArmor = useZombieNetworkStore((s) => s.sendBuyArmor);
  const sendBuyPerk = useZombieNetworkStore((s) => s.sendBuyPerk);

  const [selectedTab, setSelectedTab] = useState<"weapons" | "perks">("weapons");
  const [notification, setNotification] = useState<{ text: string; ok: boolean } | null>(null);

  useMenuPointerLock();

  // Success and failure both come back from the server; nothing is announced
  // before the points have actually changed hands.
  useEffect(() => {
    const nameOf = (id: string) =>
      SHOP_WEAPONS.find((item) => item.id === id)?.name ?? id.replace(/_/g, " ");

    const onFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ item: string }>).detail;
      const failure = useZombieNetworkStore.getState().lastBuyFailure;
      setNotification({
        text: `${nameOf(detail.item)}: ${failure?.message ?? "Purchase failed"}`,
        ok: false,
      });
    };

    const onWeapon = (event: Event) => {
      const detail = (event as CustomEvent<{ weapon: string }>).detail;
      setNotification({ text: `Bought & equipped ${nameOf(detail.weapon)}!`, ok: true });
    };

    const onPurchase = (event: Event) => {
      const detail = (event as CustomEvent<{ item: string }>).detail;
      setNotification({ text: `Bought ${nameOf(detail.item)}!`, ok: true });
    };

    window.addEventListener("zombieBuyFailed", onFailed);
    window.addEventListener("zombieWeaponBought", onWeapon);
    window.addEventListener("zombiePurchase", onPurchase);
    return () => {
      window.removeEventListener("zombieBuyFailed", onFailed);
      window.removeEventListener("zombieWeaponBought", onWeapon);
      window.removeEventListener("zombiePurchase", onPurchase);
    };
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 2200);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleBuy = (item: ShopWeapon) => {
    if (points < item.price) {
      setNotification({ text: "Not enough points!", ok: false });
      return;
    }

    switch (item.type) {
      case "primary":
      case "secondary":
        sendBuyWeapon(item.id);
        break;
      case "ammo":
        sendBuyAmmo();
        break;
      case "armor":
        sendBuyArmor();
        break;
      case "perk":
        sendBuyPerk(item.id);
        break;
    }
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
              backgroundColor: notification.ok ? "rgba(255,102,0,0.2)" : "rgba(239,68,68,0.2)",
              border: `1px solid ${notification.ok ? "#ff6600" : "#ef4444"}`,
              borderRadius: "6px",
              color: notification.ok ? "#ff6600" : "#fca5a5",
              fontSize: "14px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {notification.text}
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
