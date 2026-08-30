import { useState } from "react";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import { useZombieStore } from "../../stores/useZombieStore";
import { refillAllAmmo } from "./ZombieEngine";
import { Sound } from "../../components/AudioManager";
import { weaponDisplay } from "../weapons/weaponDisplay";
import { purchaseOrEquipSurvivalWeapon } from "./survivalBuy";

interface ShopWeapon {
  id: WeaponKey;
  cost: number;
  type: string;
}

const SHOP_WEAPONS: ShopWeapon[] = [
  { id: "glock", cost: 0, type: "PISTOL" },
  { id: "deagle", cost: 650, type: "HEAVY PISTOL" },
  { id: "mp5", cost: 850, type: "SMG" },
  { id: "ak47", cost: 1400, type: "RIFLE" },
  { id: "m4a1", cost: 1500, type: "RIFLE" },
  { id: "awp", cost: 2600, type: "SNIPER" },
];

const SHOP_PERKS = [
  { id: "double_tap", cost: 1600, label: "Double Tap Root Beer", desc: "+40% Fire Rate & +40% Damage", icon: "⚡" },
  { id: "speed_cola", cost: 1200, label: "Speed Cola", desc: "+50% Faster Reload Speed", icon: "🥤" },
  { id: "juggernog", cost: 1800, label: "Juggernog Armor", desc: "+100 Max HP & Instant Shield", icon: "🛡️" },
];

const SHOP_GEAR = [
  { id: "ammo", cost: 200, label: "Full Ammo Restock", desc: "Refills current and reserve magazines", icon: "📦" },
  { id: "armor", cost: 450, label: "Kevlar Armor (+50)", desc: "Absorbs 50% zombie hit damage", icon: "🦺" },
  { id: "medkit", cost: 350, label: "Combat Medkit (Full Heal)", desc: "Restores player HP to max capacity", icon: "✚" },
] as const;

export function SurvivalShop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"weapons" | "upgrades" | "perks">("weapons");
  const points = useZombieStore(s => s.player.points);
  const player = useZombieStore(s => s.player);
  const purchasedWeapons = useZombieStore(s => s.purchasedWeapons);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);

  if (!open) return null;

  const currentTier = player.weaponTiers[activeWeapon ?? ""] ?? 0;
  const upgradeCost = currentTier === 0 ? 1200 : currentTier === 1 ? 2400 : 3800;

  const buyWeapon = (id: WeaponKey, cost: number) => {
    const result = purchaseOrEquipSurvivalWeapon(id, cost);
    if (result === "bought") Sound.gunshot(id);
    else if (result === "equipped") Sound.deploy(id);
  };

  const handleUpgradeTier = () => {
    if (!activeWeapon || currentTier >= 3) return;
    const ok = useZombieStore.getState().upgradeWeaponTier(activeWeapon, upgradeCost);
    if (ok) {
      refillAllAmmo();
      Sound.deploy(activeWeapon);
    }
  };

  const buyPerk = (perkId: string, cost: number) => {
    const ok = useZombieStore.getState().addPerk(perkId, cost);
    if (ok) {
      if (perkId === "juggernog") {
        useZombieStore.getState().setPlayer(p => ({
          ...p,
          maxHp: p.maxHp + 100,
          hp: p.hp + 100,
          armor: Math.min(100, p.armor + 50),
        }));
      }
      if (perkId === "double_tap") {
        useWeaponStore.getState().setFireRateMultiplier(1.4);
      }
    }
  };

  const buyGear = (id: typeof SHOP_GEAR[number]["id"], cost: number) => {
    const st = useZombieStore.getState();
    if (st.player.points < cost) return;
    st.addPoints(-cost);
    if (id === "ammo") refillAllAmmo();
    if (id === "armor") st.setPlayer(p => ({ ...p, armor: Math.min(100, p.armor + 50) }));
    if (id === "medkit") st.setPlayer(p => ({ ...p, hp: p.maxHp }));
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 8, 16, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        userSelect: "none",
        fontFamily: "'Rajdhani', monospace",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(165deg, rgba(16, 24, 18, 0.98) 0%, rgba(9, 14, 12, 0.99) 100%)",
          border: "1.5px solid rgba(132, 204, 22, 0.5)",
          boxShadow: "0 0 35px rgba(132, 204, 22, 0.25), 0 20px 50px rgba(0, 0, 0, 0.8)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 620,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          color: "#ecfccb",
          boxSizing: "border-box",
        }}
      >
        {/* Shop Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid rgba(132, 204, 22, 0.2)", paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛒</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "0.1em", color: "#bef264" }}>
                OUTPOST ARSENAL & UPGRADES
              </div>
              <div style={{ fontSize: 11, color: "#86efac", opacity: 0.8 }}>
                PERSENJATAAN & PENINGKATAN KEKUATAN
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(250, 204, 21, 0.15)", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(250, 204, 21, 0.4)" }}>
            <span style={{ fontSize: 18 }}>🪙</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#facc15" }}>{points}</span>
            <span style={{ fontSize: 11, color: "#ca8a04", fontWeight: 800 }}>PTS</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab("weapons")}
            style={{
              flex: 1,
              padding: "9px 12px",
              background: activeTab === "weapons" ? "linear-gradient(135deg, rgba(101, 163, 13, 0.9), rgba(77, 124, 15, 0.95))" : "rgba(255, 255, 255, 0.05)",
              border: activeTab === "weapons" ? "1px solid #a3e635" : "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: activeTab === "weapons" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            🔫 SENJATA CS
          </button>
          <button
            onClick={() => setActiveTab("upgrades")}
            style={{
              flex: 1,
              padding: "9px 12px",
              background: activeTab === "upgrades" ? "linear-gradient(135deg, rgba(202, 138, 4, 0.9), rgba(161, 98, 7, 0.95))" : "rgba(255, 255, 255, 0.05)",
              border: activeTab === "upgrades" ? "1px solid #facc15" : "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: activeTab === "upgrades" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            ⚡ UPGRADE TIER
          </button>
          <button
            onClick={() => setActiveTab("perks")}
            style={{
              flex: 1,
              padding: "9px 12px",
              background: activeTab === "perks" ? "linear-gradient(135deg, rgba(147, 51, 234, 0.9), rgba(126, 34, 206, 0.95))" : "rgba(255, 255, 255, 0.05)",
              border: activeTab === "perks" ? "1px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              color: activeTab === "perks" ? "#ffffff" : "#94a3b8",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            🧪 PERK & GEAR
          </button>
        </div>

        {/* Tab Content: Weapons */}
        {activeTab === "weapons" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, overflowY: "auto", maxHeight: 330, paddingRight: 4 }}>
            {SHOP_WEAPONS.map(w => {
              const isEquipped = activeWeapon === w.id;
              const isOwned = purchasedWeapons.includes(w.id);
              const canAfford = points >= w.cost;
              const canAct = isEquipped ? false : isOwned || canAfford;
              const info = weaponDisplay(w.id);
              const actionLabel = isEquipped ? "TERPASANG" : isOwned ? "PASANG" : "BELI";
              const priceLabel = isEquipped || isOwned
                ? (isOwned && !isEquipped ? "DIMILIKI" : "")
                : (w.cost > 0 ? `${w.cost} PTS` : "FREE");
              return (
                <div
                  key={w.id}
                  style={{
                    background: isEquipped ? "rgba(101, 163, 13, 0.25)" : isOwned ? "rgba(56, 189, 248, 0.12)" : "rgba(0, 0, 0, 0.4)",
                    border: isEquipped ? "1.5px solid #a3e635" : isOwned ? "1px solid rgba(56, 189, 248, 0.45)" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{info.label}</span>
                      <span style={{ fontSize: 10, color: "#a3e635", fontWeight: 800 }}>{w.type}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      DMG: <span style={{ color: "#facc15", fontWeight: 800 }}>{info.dmg}</span> • MAG: <span style={{ color: "#38bdf8", fontWeight: 800 }}>{info.mag}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => buyWeapon(w.id, w.cost)}
                    disabled={!canAct}
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: isEquipped
                        ? "rgba(163, 230, 53, 0.3)"
                        : isOwned
                          ? "linear-gradient(90deg, #0284c7, #0369a1)"
                          : canAfford
                            ? "linear-gradient(90deg, #65a30d, #4d7c0f)"
                            : "rgba(255, 255, 255, 0.05)",
                      border: "none",
                      borderRadius: 6,
                      color: isEquipped ? "#a3e635" : canAct ? "#ffffff" : "#64748b",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: canAct ? "pointer" : "default",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{actionLabel}</span>
                    <span>{priceLabel}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Tier Upgrades (Pack-A-Punch) */}
        {activeTab === "upgrades" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 330 }}>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(202, 138, 4, 0.2), rgba(161, 98, 7, 0.1))",
                border: "1.5px solid rgba(234, 179, 8, 0.4)",
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#fef08a" }}>
                    SENJATA AKTIF: {(activeWeapon ?? "—").toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: "#fde047", marginTop: 2 }}>
                    STATUS: {currentTier === 0 ? "STANDARD TIER 0" : `⚡ TIER ${currentTier} OVERCHARGED`}
                  </div>
                </div>
                <div style={{ fontSize: 24 }}>⚡</div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: currentTier >= 1 ? "rgba(234, 179, 8, 0.3)" : "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, border: currentTier >= 1 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fde047" }}>TIER I</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>+85% DAMAGE</div>
                </div>
                <div style={{ background: currentTier >= 2 ? "rgba(234, 179, 8, 0.3)" : "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, border: currentTier >= 2 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fde047" }}>TIER II</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>+170% DMG & RELOAD</div>
                </div>
                <div style={{ background: currentTier >= 3 ? "rgba(234, 179, 8, 0.3)" : "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, border: currentTier >= 3 ? "1px solid #facc15" : "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#fde047" }}>TIER III (MAX)</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>+260% DMG & PIERCE</div>
                </div>
              </div>

              <button
                onClick={handleUpgradeTier}
                disabled={currentTier >= 3 || points < upgradeCost}
                style={{
                  marginTop: 14,
                  width: "100%",
                  padding: "10px 14px",
                  background: currentTier >= 3 ? "rgba(255,255,255,0.05)" : points >= upgradeCost ? "linear-gradient(90deg, #ca8a04, #a16207)" : "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(234, 179, 8, 0.6)",
                  borderRadius: 8,
                  color: currentTier >= 3 ? "#94a3b8" : points >= upgradeCost ? "#ffffff" : "#64748b",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: currentTier >= 3 || points < upgradeCost ? "default" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{currentTier >= 3 ? "SENJATA SUDAH MAKSIMAL" : `TINGKATKAN KE TIER ${currentTier + 1}`}</span>
                <span>{currentTier >= 3 ? "MAX" : `${upgradeCost} PTS`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Perks & Gear */}
        {activeTab === "perks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", maxHeight: 330 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#c084fc", letterSpacing: "0.08em" }}>PERKS PERMANEN</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {SHOP_PERKS.map(p => {
                const owned = player.perks.includes(p.id);
                const canAfford = points >= p.cost;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: owned ? "rgba(147, 51, 234, 0.25)" : "rgba(0, 0, 0, 0.4)",
                      border: owned ? "1.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: "#cbd5e1" }}>{p.desc}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => buyPerk(p.id, p.cost)}
                      disabled={owned || !canAfford}
                      style={{
                        padding: "6px 12px",
                        background: owned ? "rgba(192, 132, 252, 0.3)" : canAfford ? "linear-gradient(90deg, #9333ea, #7e22ce)" : "rgba(255, 255, 255, 0.05)",
                        border: "none",
                        borderRadius: 6,
                        color: owned ? "#c084fc" : canAfford ? "#ffffff" : "#64748b",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: owned || !canAfford ? "default" : "pointer",
                      }}
                    >
                      {owned ? "SUDAH AKTIF" : `${p.cost} PTS`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: "#86efac", letterSpacing: "0.08em", marginTop: 6 }}>SUPPLIES & GEAR</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {SHOP_GEAR.map(g => (
                <div
                  key={g.id}
                  style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{g.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: "#cbd5e1" }}>{g.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => buyGear(g.id, g.cost)}
                    disabled={points < g.cost}
                    style={{
                      padding: "6px 12px",
                      background: points >= g.cost ? "linear-gradient(90deg, #16a34a, #15803d)" : "rgba(255, 255, 255, 0.05)",
                      border: "none",
                      borderRadius: 6,
                      color: points >= g.cost ? "#ffffff" : "#64748b",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: points < g.cost ? "default" : "pointer",
                    }}
                  >
                    {g.cost} PTS
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 10,
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            color: "#e2e8f0",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.08em",
            transition: "all 0.15s ease",
          }}
        >
          KEMBALI KE PERMAINAN [B / ESC]
        </button>
      </div>
    </div>
  );
}
