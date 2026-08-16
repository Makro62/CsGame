import { useEffect, useState } from "react";
import { WEAPONS, ZOMBIE_SHOP } from "@cs-game/shared";
import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { useZombieStore } from "../../../stores/useZombieStore";
import { useMenuPointerLock } from "../../../hooks/useMenuPointerLock";
import { HUD_FONT, HUD_MONO, HUD_Z, hudPanel } from "../../hudTheme";

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
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(4, 7, 12, 0.82)",
        backdropFilter: "blur(6px)",
        zIndex: HUD_Z.modal,
        fontFamily: HUD_FONT,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...hudPanel("amber"),
          width: "min(720px, 100%)",
          maxHeight: "min(78vh, 720px)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header stays put while the list scrolls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#fb923c", fontSize: 18, fontWeight: 900, letterSpacing: 1.4 }}>
              SURVIVOR ARMORY
            </h2>
            <div style={{ color: "#64748b", fontSize: 10, letterSpacing: 1 }}>
              WEAPONS · AMMO · PERKS
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontFamily: HUD_MONO,
                color: "#ffd700",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              {points.toLocaleString()}
              <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 4 }}>PTS</span>
            </span>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                color: "#cbd5e1",
                fontSize: 16,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "12px 20px 0",
          }}
        >
          {(["weapons", "perks"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                padding: "7px 18px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                background: selectedTab === tab ? "rgba(251, 146, 60, 0.22)" : "rgba(255,255,255,0.05)",
                border:
                  selectedTab === tab
                    ? "1px solid rgba(251, 146, 60, 0.7)"
                    : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: selectedTab === tab ? "#fb923c" : "#94a3b8",
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
              margin: "12px 20px 0",
              padding: "8px 14px",
              backgroundColor: notification.ok ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
              border: `1px solid ${notification.ok ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
              borderRadius: 8,
              color: notification.ok ? "#86efac" : "#fca5a5",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {notification.text}
          </div>
        )}

        {/* Weapon/Perk List */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 10,
            padding: 20,
            overflowY: "auto",
          }}
        >
          {filteredWeapons.map((item) => {
            const canAfford = points >= item.price;
            return (
              <div
                key={item.id}
                style={{
                  padding: 14,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: canAfford
                    ? "1px solid rgba(251, 146, 60, 0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 14 }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontFamily: HUD_MONO,
                        color: canAfford ? "#ffd700" : "#6b7280",
                        fontWeight: 800,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.price.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 10, fontFamily: HUD_MONO }}>
                    {item.stats}
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                  style={{
                    padding: "8px",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1,
                    background: canAfford
                      ? "linear-gradient(135deg, #f97316, #ea580c)"
                      : "rgba(255,255,255,0.05)",
                    color: canAfford ? "#fff" : "#6b7280",
                    border: canAfford ? "1px solid rgba(251,146,60,0.7)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    cursor: canAfford ? "pointer" : "not-allowed",
                    transition: "background 0.2s",
                  }}
                >
                  {canAfford ? "BUY" : "NOT ENOUGH POINTS"}
                </button>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "8px 20px 12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            color: "#64748b",
            fontSize: 10,
            letterSpacing: 0.8,
            textAlign: "center",
          }}
        >
          [B] atau [ESC] untuk menutup · harga sama dengan validasi server
        </div>
      </div>
    </div>
  );
}
