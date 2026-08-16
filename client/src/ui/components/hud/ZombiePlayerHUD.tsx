import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";

export function ZombiePlayerHUD() {
  const localHp = useZombieNetworkStore((s) => s.localHp);
  const localArmor = useZombieNetworkStore((s) => s.localArmor);
  const localAmmo = useZombieNetworkStore((s) => s.localAmmo);
  const localReserveAmmo = useZombieNetworkStore((s) => s.localReserveAmmo);
  const localWeapon = useZombieNetworkStore((s) => s.localWeapon);
  const hasJuggernog = useZombieNetworkStore((s) => s.hasJuggernog);
  const hasSpeedCola = useZombieNetworkStore((s) => s.hasSpeedCola);
  const hasDoubleTap = useZombieNetworkStore((s) => s.hasDoubleTap);
  const hasQuickRevive = useZombieNetworkStore((s) => s.hasQuickRevive);
  const hasPackAPunch = useZombieNetworkStore((s) => s.hasPackAPunch);
  const kills = useZombieNetworkStore((s) => s.kills);
  const soloRevives = useZombieNetworkStore((s) => s.soloRevives);

  const maxHp = hasJuggernog ? 200 : 100;
  const hpPercent = Math.max(0, Math.min(100, (localHp / maxHp) * 100));

  return (
    <div
      style={{
        position: "absolute",
        bottom: "24px",
        left: "24px",
        right: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "'Segoe UI', Roboto, monospace",
        zIndex: 30,
      }}
    >
      {/* Bottom Left: Health, Armor, Perks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "240px" }}>
        {/* Perk Icons Bar */}
        <div style={{ display: "flex", gap: "6px" }}>
          {hasJuggernog && (
            <div
              title="Juggernog (+100 HP)"
              style={{
                backgroundColor: "#dc2626",
                border: "1px solid #f87171",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ❤️ JUGG
            </div>
          )}
          {hasSpeedCola && (
            <div
              title="Speed Cola (Fast Reload)"
              style={{
                backgroundColor: "#16a34a",
                border: "1px solid #4ade80",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ⚡ SPEED
            </div>
          )}
          {hasDoubleTap && (
            <div
              title="Double Tap (Fire Rate Boost)"
              style={{
                backgroundColor: "#d97706",
                border: "1px solid #fbbf24",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              🔥 2X TAP
            </div>
          )}
          {hasQuickRevive && (
            <div
              title="Quick Revive (Self/Fast Revive)"
              style={{
                backgroundColor: "#2563eb",
                border: "1px solid #60a5fa",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              🛡️ REVIVE
            </div>
          )}
          {hasPackAPunch && (
            <div
              title="Pack-a-Punch Upgraded"
              style={{
                backgroundColor: "#7c3aed",
                border: "1px solid #c084fc",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ⭐ PAP
            </div>
          )}
          {soloRevives > 0 && (
            <div
              title="Self-revives left in this run"
              style={{
                backgroundColor: "#0f766e",
                border: "1px solid #2dd4bf",
                borderRadius: "4px",
                padding: "2px 6px",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ✚ {soloRevives}x SELF-REVIVE
            </div>
          )}
        </div>

        {/* Health Bar */}
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            padding: "8px 12px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "#ef4444", fontSize: "13px", fontWeight: "bold" }}>HEALTH</span>
            <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>
              {localHp} / {maxHp}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${hpPercent}%`,
                height: "100%",
                backgroundColor: localHp > 50 ? "#22c55e" : localHp > 25 ? "#eab308" : "#ef4444",
                transition: "width 0.2s ease",
              }}
            />
          </div>

          {/* Armor Bar if player has armor */}
          {localArmor > 0 && (
            <div style={{ marginTop: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: "bold" }}>ARMOR</span>
                <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: "bold" }}>{localArmor}</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, localArmor)}%`,
                    height: "100%",
                    backgroundColor: "#38bdf8",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Right: Weapon & Ammo */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "8px",
          padding: "8px 16px",
          textAlign: "right",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ color: "#f97316", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>
          {hasPackAPunch ? `${localWeapon} (PAP)` : localWeapon}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "flex-end" }}>
          <span style={{ color: "#fff", fontSize: "28px", fontWeight: "900" }}>{localAmmo}</span>
          <span style={{ color: "#9ca3af", fontSize: "16px", fontWeight: "bold" }}>/ {localReserveAmmo}</span>
        </div>
        <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px" }}>
          💀 Kills: <strong style={{ color: "#fff" }}>{kills}</strong>
        </div>
      </div>
    </div>
  );
}
