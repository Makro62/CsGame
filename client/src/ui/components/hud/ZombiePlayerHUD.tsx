import { useZombieNetworkStore } from "../../../stores/useZombieNetworkStore";
import { HUD_EDGE, HUD_FONT, HUD_MONO, HUD_Z, hudPanel, hudPill, type HudAccent } from "../../hudTheme";

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
  const hpColor = hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#eab308" : "#ef4444";

  const perks: Array<{ key: string; label: string; accent: HudAccent; title: string }> = [];
  if (hasJuggernog) perks.push({ key: "jugg", label: "❤️ JUGG", accent: "red", title: "Juggernog (+100 HP)" });
  if (hasSpeedCola) perks.push({ key: "speed", label: "⚡ SPEED", accent: "green", title: "Speed Cola (reload lebih cepat)" });
  if (hasDoubleTap) perks.push({ key: "tap", label: "🔥 2X TAP", accent: "amber", title: "Double Tap (fire rate naik)" });
  if (hasQuickRevive) perks.push({ key: "revive", label: "🛡️ QUICK REVIVE", accent: "blue", title: "Quick Revive" });
  if (hasPackAPunch) perks.push({ key: "pap", label: "⭐ PAP", accent: "violet", title: "Pack-a-Punch aktif" });
  if (soloRevives > 0)
    perks.push({
      key: "solo",
      label: `✚ ${soloRevives}x SELF-REVIVE`,
      accent: "green",
      title: "Self-revive tersisa di run ini",
    });

  return (
    <div
      style={{
        position: "fixed",
        bottom: HUD_EDGE,
        left: HUD_EDGE,
        right: HUD_EDGE,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: HUD_FONT,
        zIndex: HUD_Z.hud,
      }}
    >
      {/* Left: perks, health, armor */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 260 }}>
        {perks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {perks.map((perk) => (
              <span key={perk.key} title={perk.title} style={hudPill(perk.accent)}>
                {perk.label}
              </span>
            ))}
          </div>
        )}

        <div style={{ ...hudPanel("neutral"), padding: "8px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ color: "#f87171", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>
              HEALTH
            </span>
            <span style={{ fontFamily: HUD_MONO, color: "#fff", fontSize: 14, fontWeight: 800 }}>
              {Math.max(0, localHp)}
              <span style={{ color: "#64748b", fontSize: 11 }}> / {maxHp}</span>
            </span>
          </div>
          <Bar percent={hpPercent} color={hpColor} height={8} />

          {localArmor > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: "#38bdf8", fontSize: 10, fontWeight: 800, letterSpacing: 1.2 }}>
                  ARMOR
                </span>
                <span style={{ fontFamily: HUD_MONO, color: "#38bdf8", fontSize: 12, fontWeight: 800 }}>
                  {localArmor}
                </span>
              </div>
              <Bar percent={Math.min(100, localArmor)} color="#38bdf8" height={4} />
            </div>
          )}
        </div>
      </div>

      {/* Right: weapon, ammo, kills */}
      <div style={{ ...hudPanel("red"), padding: "8px 14px", textAlign: "right", minWidth: 170 }}>
        <div
          style={{
            color: hasPackAPunch ? "#c084fc" : "#fb923c",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {hasPackAPunch ? `${localWeapon} ⭐` : localWeapon}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            justifyContent: "flex-end",
            fontFamily: HUD_MONO,
          }}
        >
          <span style={{ color: "#fff", fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
            {localAmmo}
          </span>
          <span style={{ color: "#94a3b8", fontSize: 14, fontWeight: 700 }}>/ {localReserveAmmo}</span>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 0.6, marginTop: 2 }}>
          💀 KILLS <strong style={{ color: "#fff", fontFamily: HUD_MONO }}>{kills}</strong>
        </div>
      </div>
    </div>
  );
}

function Bar({ percent, color, height }: { percent: number; color: string; height: number }) {
  return (
    <div
      style={{
        marginTop: 4,
        width: "100%",
        height,
        borderRadius: height / 2,
        background: "rgba(255, 255, 255, 0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: color,
          transition: "width 0.2s ease",
        }}
      />
    </div>
  );
}
