import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore, type WeaponKey } from "../../stores/useWeaponStore";
import { useZombieStore } from "../../stores/useZombieStore";

const SHOP_WEAPONS: Array<{ id: WeaponKey; cost: number; label: string }> = [
  { id: "mp5", cost: 800, label: "MP5" },
  { id: "deagle", cost: 700, label: "Desert Eagle" },
  { id: "ak47", cost: 1500, label: "AK-47" },
  { id: "m4a1", cost: 1600, label: "M4A1-S" },
  { id: "awp", cost: 2800, label: "AWP" },
];

const SHOP_GEAR = [
  { id: "ammo", cost: 200, label: "Refill Ammo" },
  { id: "armor", cost: 500, label: "Armor +50" },
  { id: "medkit", cost: 400, label: "Full Heal" },
] as const;

function refillAmmo() {
  const ws = useWeaponStore.getState();
  const w = ws.activeWeapon;
  if (!w) return;
  const stats = WEAPONS[w];
  if (!stats) return;
  useWeaponStore.setState({
    currentAmmo: stats.mag,
    reserveAmmo: stats.reserveAmmo,
    primaryAmmo: ws.primaryWeapon ? WEAPONS[ws.primaryWeapon]?.mag ?? ws.primaryAmmo : ws.primaryAmmo,
    primaryReserve: ws.primaryWeapon ? WEAPONS[ws.primaryWeapon]?.reserveAmmo ?? ws.primaryReserve : ws.primaryReserve,
    secondaryAmmo: ws.secondaryWeapon ? WEAPONS[ws.secondaryWeapon]?.mag ?? ws.secondaryAmmo : ws.secondaryAmmo,
    secondaryReserve: ws.secondaryWeapon ? WEAPONS[ws.secondaryWeapon]?.reserveAmmo ?? ws.secondaryReserve : ws.secondaryReserve,
  });
}

export function SurvivalShop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const points = useZombieStore(s => s.player.points);

  if (!open) return null;

  const buyWeapon = (id: WeaponKey, cost: number) => {
    const st = useZombieStore.getState();
    if (st.player.points < cost) return;
    st.addPoints(-cost);
    useWeaponStore.getState().equipWeapon(id);
  };

  const buyGear = (id: typeof SHOP_GEAR[number]["id"], cost: number) => {
    const st = useZombieStore.getState();
    if (st.player.points < cost) return;
    st.addPoints(-cost);
    if (id === "ammo") refillAmmo();
    if (id === "armor") st.setPlayer(p => ({ ...p, armor: Math.min(100, p.armor + 50) }));
    if (id === "medkit") st.setPlayer(p => ({ ...p, hp: p.maxHp }));
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #1a1f18, #0e120c)",
          border: "1px solid #6a7a3a",
          borderRadius: 12,
          padding: 24,
          minWidth: 420,
          color: "#e8f0d0",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>ARSENAL</div>
          <div style={{ color: "#eab308" }}>{points} pts</div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>SENJATA</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {SHOP_WEAPONS.map(w => (
            <button
              key={w.id}
              onClick={() => buyWeapon(w.id, w.cost)}
              disabled={points < w.cost}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                background: points < w.cost ? "rgba(255,255,255,0.04)" : "rgba(106,122,58,0.25)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: points < w.cost ? "#64748b" : "#f1f5f9",
                borderRadius: 6,
                cursor: points < w.cost ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {w.label} <span style={{ float: "right" }}>{w.cost}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>GEAR</div>
        <div style={{ display: "grid", gap: 6 }}>
          {SHOP_GEAR.map(g => (
            <button
              key={g.id}
              onClick={() => buyGear(g.id, g.cost)}
              disabled={points < g.cost}
              style={{
                textAlign: "left",
                padding: "8px 12px",
                background: points < g.cost ? "rgba(255,255,255,0.04)" : "rgba(56,120,90,0.25)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: points < g.cost ? "#64748b" : "#f1f5f9",
                borderRadius: 6,
                cursor: points < g.cost ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {g.label} <span style={{ float: "right" }}>{g.cost}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: 10,
            background: "#334155",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          TUTUP [B]
        </button>
      </div>
    </div>
  );
}

export { refillAmmo };
