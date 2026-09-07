import React from "react";
import {
  useZombieStore,
  useHeroStore,
  useWeaponStore,
  type WeaponKey,
  weaponDisplay,
  equipSurvivalWeapon,
  InGameChrome,
  hudActionButton,
} from "../game/zombie/zombieKit";

interface ZombieSurvivalHUDProps {
  onOpenPause: () => void;
  onToggleBuyMenu: () => void;
  showWaveAlert: boolean;
}

export const ZombieSurvivalHUD = React.memo(function ZombieSurvivalHUD({
  onOpenPause,
  onToggleBuyMenu,
  showWaveAlert,
}: ZombieSurvivalHUDProps) {
  // Store subscriptions isolated here so Canvas does NOT re-render
  const waveState = useZombieStore(s => s.waveState);
  const currentWave = useZombieStore(s => s.currentWave);
  const player = useZombieStore(s => s.player);
  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const totalZombiesInWave = useZombieStore(s => s.totalZombiesInWave);
  const purchasedWeapons = useZombieStore(s => s.purchasedWeapons);
  const interWaveTimer = useZombieStore(s => s.interWaveTimer);
  const currentStage = useZombieStore(s => s.currentStage);
  const stageBreakActive = useZombieStore(s => s.stageBreakActive);
  const gate1Open = useZombieStore(s => s.gate1Open);
  const gate2Open = useZombieStore(s => s.gate2Open);
  const cameraPerspective = useZombieStore(s => s.cameraPerspective ?? "arcade");

  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const maxAmmo = useWeaponStore(s => s.maxAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const primaryWeapon = useWeaponStore(s => s.primaryWeapon);
  const secondaryWeapon = useWeaponStore(s => s.secondaryWeapon);
  const knifeSlot = useWeaponStore(s => s.knifeSlot);
  const isReloading = useWeaponStore(s => s.isReloading);

  const hero = useHeroStore(s => s.hero);
  const abilityReady = useHeroStore(s => s.abilityReady);
  const abilityCooldownRemaining = useHeroStore(s => s.abilityCooldownRemaining);

  const hpPercent = THREEClamp01(player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0);
  const magPercent = THREEClamp01(maxAmmo > 0 ? (currentAmmo / maxAmmo) * 100 : 0);
  const betweenWaves = (waveState === "buy_phase" || waveState === "wave_clear") && !stageBreakActive;
  const totalWaveZombies = Math.max(1, totalZombiesInWave);
  const killedCount = Math.max(0, totalWaveZombies - zombiesRemaining);
  const waveProgress = THREEClamp01((killedCount / totalWaveZombies) * 100);

  return (
    <>
      {/* ── Top Left: Health, Armor, Ability, Wave & Points ── */}
      <div
        style={{
          position: "fixed",
          top: "clamp(8px, 2vw, 16px)",
          left: "clamp(8px, 2vw, 16px)",
          zIndex: 40,
          background: "linear-gradient(145deg, rgba(13, 20, 16, 0.94), rgba(8, 12, 10, 0.98))",
          border: "1.5px solid rgba(132, 204, 22, 0.4)",
          borderRadius: 14,
          padding: "clamp(8px, 1.5vw, 14px) clamp(12px, 2vw, 20px)",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: "clamp(160px, 30vw, 260px)",
          maxWidth: "42dvw",
          boxShadow: "0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(132, 204, 22, 0.15)",
          userSelect: "none",
        }}
      >
        {/* Wave & Points Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 8px)" }}>
            <span style={{ fontSize: "clamp(16px, 2vw, 20px)" }}>☣️</span>
            <span style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 900, letterSpacing: "0.08em", color: "#a3e635" }}>
              WAVE {Math.max(1, currentWave)}
            </span>
          </div>
          <div style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 900, color: "#facc15", textShadow: "0 0 10px rgba(250, 204, 21, 0.4)" }}>
            {player.points} <span style={{ fontSize: "clamp(10px, 1.5vw, 12px)", color: "#ca8a04" }}>PTS</span>
          </div>
        </div>

        {/* Health Bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 3 }}>
            <span style={{ color: "#86efac" }}>HEALTH</span>
            <span style={{ color: hpPercent > 40 ? "#86efac" : "#f87171" }}>{Math.ceil(player.hp)} / {player.maxHp}</span>
          </div>
          <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${hpPercent}%`,
                height: "100%",
                background: hpPercent > 50 ? "linear-gradient(90deg, #22c55e, #4ade80)" : hpPercent > 25 ? "linear-gradient(90deg, #eab308, #facc15)" : "linear-gradient(90deg, #dc2626, #ef4444)",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* Armor Status if active */}
        {player.armor > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#60a5fa", marginBottom: 8 }}>
            <span>ARMOR</span>
            <span>{player.armor} ARM</span>
          </div>
        )}

        {/* Ammo & Horde Info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#cbd5e1" }}>{(activeWeapon ?? "—").toUpperCase()}</span>
            {player.weaponTiers?.[activeWeapon ?? ""] ? (
              <span style={{ fontSize: 10, fontWeight: 900, background: "rgba(234, 179, 8, 0.2)", color: "#fde047", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(234, 179, 8, 0.5)" }}>
                TIER {player.weaponTiers[activeWeapon ?? ""]} ⚡
              </span>
            ) : null}
            <span style={{ fontSize: 16, fontWeight: 900, color: "#38bdf8" }}>{currentAmmo}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>/ {reserveAmmo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>HORDE:</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#ef4444" }}>{zombiesRemaining}</span>
          </div>
        </div>

        {/* Hero Ability Status */}
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{
            padding: "3px 10px",
            background: abilityReady ? `${hero.accentColor}22` : "rgba(255,255,255,0.05)",
            border: `1px solid ${abilityReady ? hero.accentColor : "rgba(255,255,255,0.15)"}`,
            borderRadius: 6,
            fontSize: 11,
            color: abilityReady ? hero.accentColor : "#64748b",
            fontWeight: 900,
            letterSpacing: "0.05em",
          }}>
            {hero.ability === "berserk" ? "🔥" : "🛡️"} [Q] {hero.ability === "berserk" ? "BERSERK" : "SHIELD"}
            {!abilityReady && ` ${Math.ceil(abilityCooldownRemaining)}s`}
          </span>
          <span style={{
            padding: "2px 8px",
            background: `${hero.accentColor}15`,
            border: `1px solid ${hero.accentColor}33`,
            borderRadius: 4,
            fontSize: 10,
            color: hero.accentColor,
            fontWeight: 800,
          }}>
            ★ {hero.name}
          </span>
        </div>

        {/* Perks and Power-up badges */}
        {(player.perks.length > 0 || player.activePowerUps.size > 0) && (
          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {player.perks.map((pk, idx) => (
              <span key={`perk-${idx}`} style={{ padding: "2px 8px", background: "rgba(168, 85, 247, 0.2)", border: "1px solid #a855f7", borderRadius: 6, fontSize: 10, color: "#d8b4fe", fontWeight: 800 }}>
                ★ {pk.toUpperCase()}
              </span>
            ))}
            {Array.from(player.activePowerUps.keys()).map((pk, idx) => (
              <span key={`pwr-${idx}`} style={{ padding: "2px 8px", background: "rgba(234, 179, 8, 0.2)", border: "1px solid #eab308", borderRadius: 6, fontSize: 10, color: "#fef08a", fontWeight: 800 }}>
                ⚡ {pk.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {betweenWaves && (
          <div style={{ marginTop: 10, padding: "6px 12px", background: "rgba(132, 204, 22, 0.15)", border: "1px dashed #84cc16", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 900, color: "#bef264" }}>
            NEXT WAVE IN {Math.ceil(interWaveTimer)}s • TEKAN [B] UNTUK SHOP
          </div>
        )}
      </div>

      {/* ── Top Chrome / Menu Button ── */}
      {waveState !== "game_over" && (
        <InGameChrome
          onMenu={onOpenPause}
          extra={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => useZombieStore.getState().toggleCameraPerspective()}
                style={hudActionButton("blue")}
                title="Ganti Sudut Pandang Kamera (V)"
              >
                KAMERA: {cameraPerspective.toUpperCase()} [V]
              </button>
              {betweenWaves && (
                <button type="button" onClick={onToggleBuyMenu} style={hudActionButton("green")}>
                  ARSENAL [B]
                </button>
              )}
            </div>
          }
        />
      )}

      {/* ── Center Screen: Zombie Incoming Threat Alert ── */}
      {showWaveAlert && waveState === "wave_active" && (
        <div
          style={{
            position: "fixed",
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 60,
            pointerEvents: "none",
            userSelect: "none",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(153, 27, 27, 0.96), rgba(69, 10, 10, 0.98))",
              border: "2px solid #ef4444",
              borderRadius: 16,
              padding: "16px 36px",
              boxShadow: "0 0 50px rgba(239, 68, 68, 0.7), 0 10px 40px rgba(0,0,0,0.9)",
              fontFamily: "'Rajdhani', monospace",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fca5a5", letterSpacing: "0.2em", marginBottom: 4 }}>
              ⚠️ PERINGATAN: HORDE ZOMBIE MENDEKAT!
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}>
              GELOMBANG {currentWave} DIMULAI
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fef08a", marginTop: 4, letterSpacing: "0.08em" }}>
              ☣️ {totalWaveZombies} ZOMBIE SEDANG MENYERANG • HABISI SEMUANYA UNTUK SELESAIKAN MISI!
            </div>
          </div>
        </div>
      )}

      {/* ── Top Center: Wave Mission Objective & Elimination Tracker ── */}
      <div
        style={{
          position: "fixed",
          top: "clamp(8px, 2vw, 16px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "linear-gradient(180deg, rgba(13, 20, 16, 0.96), rgba(8, 12, 10, 0.98))",
          border: waveState === "wave_active" ? "1.5px solid rgba(239, 68, 68, 0.6)" : "1.5px solid rgba(132, 204, 22, 0.5)",
          borderRadius: 14,
          padding: "clamp(6px, 1vw, 10px) clamp(14px, 2vw, 24px)",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: "clamp(220px, 42vw, 380px)",
          maxWidth: "52dvw",
          boxShadow: waveState === "wave_active"
            ? "0 8px 30px rgba(0,0,0,0.8), 0 0 25px rgba(239, 68, 68, 0.25)"
            : "0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(132, 204, 22, 0.2)",
          userSelect: "none",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.06em", color: waveState === "wave_active" ? "#fca5a5" : "#bef264" }}>
              {waveState === "wave_active" ? `ELIMINASI SEMUA ZOMBIE (STAGE ${currentStage})` : `PERSIAPAN GELOMBANG ${currentWave + 1}`}
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>
            {waveState === "wave_active" ? `${killedCount} / ${totalWaveZombies} KILLED` : "STATUS AMAN"}
          </div>
        </div>

        {waveState === "wave_active" ? (
          <div>
            <div style={{ width: "100%", height: 7, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: `${waveProgress}%`,
                  height: "100%",
                  background: waveProgress >= 100 ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #ef4444, #f97316)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, fontWeight: 700, color: "#64748b" }}>
              <span>PROGRES MISI</span>
              <span style={{ color: "#ef4444" }}>SISA {zombiesRemaining} ZOMBIE</span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#bef264", letterSpacing: "0.08em" }}>
              ⏳ ZOMBIE BERIKUTNYA DATANG DALAM: <span style={{ fontSize: 18, color: "#facc15" }}>{Math.ceil(interWaveTimer)}</span> DETIK
            </div>
            <div style={{ fontSize: 11, color: "#86efac", marginTop: 3 }}>
              🛒 Tekan [B] untuk buka Toko Arsenal, beli senjata & isi peluru sebelum gelombang datang!
            </div>
          </div>
        )}
      </div>

      {/* ── Right Side: Arsenal Senjata yang Telah Dibeli ── */}
      <div
        style={{
          position: "fixed",
          top: "clamp(52px, 10vh, 68px)",
          right: "clamp(8px, 2vw, 16px)",
          zIndex: 40,
          background: "linear-gradient(160deg, rgba(13, 20, 16, 0.94), rgba(8, 12, 10, 0.98))",
          border: "1.5px solid rgba(132, 204, 22, 0.35)",
          borderRadius: 14,
          padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 1.5vw, 16px)",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: "clamp(160px, 28vw, 230px)",
          maxWidth: "36dvw",
          boxShadow: "0 8px 30px rgba(0,0,0,0.7), 0 0 16px rgba(132, 204, 22, 0.1)",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔫</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#a3e635", letterSpacing: "0.08em" }}>
              SENJATA DIBELI ({purchasedWeapons.length})
            </span>
          </div>
          <span style={{ fontSize: 10, color: "#64748b" }}>KLIK / [1-3]</span>
        </div>

        <div className="tactical-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", paddingRight: 6 }}>
          {purchasedWeapons.map((wId) => {
            const info = weaponDisplay(wId);
            const isActive = activeWeapon === wId;
            const tier = player.weaponTiers?.[wId] ?? 0;
            const inSlot =
              wId === primaryWeapon ? "1" : wId === secondaryWeapon ? "2" : wId === knifeSlot ? "3" : null;

            return (
              <div
                key={wId}
                onClick={() => {
                  if (isActive) return;
                  equipSurvivalWeapon(wId as WeaponKey, false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: isActive ? "rgba(132, 204, 22, 0.2)" : "rgba(255,255,255,0.04)",
                  border: isActive ? "1px solid #84cc16" : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{info.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: isActive ? "#bef264" : "#f1f5f9", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{info.label}</span>
                      {tier > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 900, background: "#ca8a04", color: "#fef08a", padding: "0 4px", borderRadius: 3 }}>
                          T{tier}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>
                      {info.type} • DMG {info.dmg}
                    </div>
                  </div>
                </div>

                <div>
                  {isActive ? (
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#84cc16", background: "rgba(132, 204, 22, 0.2)", padding: "2px 6px", borderRadius: 4 }}>
                      AKTIF
                    </span>
                  ) : inSlot ? (
                    <span style={{ fontSize: 10, color: "#94a3b8", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4 }}>
                      [{inSlot}]
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", padding: "2px 6px", borderRadius: 4 }}>
                      PASANG
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Right: Tactical Ammo & Reload Status HUD ── */}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(8px, 2vw, 20px)",
          right: "clamp(8px, 2vw, 20px)",
          zIndex: 40,
          background: "linear-gradient(145deg, rgba(13, 20, 16, 0.95), rgba(8, 12, 10, 0.98))",
          border: isReloading ? "1.5px solid #eab308" : currentAmmo === 0 ? "1.5px solid #ef4444" : "1.5px solid rgba(56, 189, 248, 0.4)",
          borderRadius: 14,
          padding: "clamp(10px, 1.5vw, 16px) clamp(14px, 2vw, 22px)",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: "clamp(160px, 30vw, 260px)",
          maxWidth: "42dvw",
          boxShadow: isReloading
            ? "0 8px 30px rgba(0,0,0,0.8), 0 0 25px rgba(234, 179, 8, 0.3)"
            : currentAmmo === 0
            ? "0 8px 30px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.4)"
            : "0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.15)",
          userSelect: "none",
        }}
      >
        {/* Weapon Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{weaponDisplay(activeWeapon).icon}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#f8fafc", letterSpacing: "0.08em" }}>
              {weaponDisplay(activeWeapon).label.toUpperCase()}
            </span>
          </div>

          {player.weaponTiers?.[activeWeapon ?? ""] ? (
            <span style={{ fontSize: 11, fontWeight: 900, background: "rgba(234, 179, 8, 0.2)", color: "#fde047", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(234, 179, 8, 0.5)" }}>
              TIER {player.weaponTiers[activeWeapon ?? ""]} ⚡
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
              {weaponDisplay(activeWeapon).type}
            </span>
          )}
        </div>

        {/* Large Caliber Ammo Counter */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0" }}>
          <span
            style={{
              fontSize: "clamp(26px, 5vw, 42px)",
              fontWeight: 900,
              lineHeight: 1,
              color: currentAmmo === 0 ? "#ef4444" : currentAmmo <= 5 ? "#f97316" : "#38bdf8",
              textShadow: currentAmmo === 0 ? "0 0 15px rgba(239,68,68,0.6)" : "0 0 15px rgba(56,189,248,0.4)",
            }}
          >
            {currentAmmo}
          </span>
          <span style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "#475569", fontWeight: 800 }}>/</span>
          <span style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: "#94a3b8", fontWeight: 800 }}>
            {reserveAmmo}
          </span>
          <span style={{ fontSize: "clamp(9px, 1.2vw, 11px)", color: "#64748b", marginLeft: "auto", fontWeight: 700 }}>
            MAG: {maxAmmo}
          </span>
        </div>

        {/* Magazine Ammo Gauge Bar */}
        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", margin: "6px 0 8px 0" }}>
          <div
            style={{
              width: `${magPercent}%`,
              height: "100%",
              background: magPercent > 50 ? "linear-gradient(90deg, #38bdf8, #0ea5e9)" : magPercent > 20 ? "linear-gradient(90deg, #eab308, #f59e0b)" : "linear-gradient(90deg, #dc2626, #ef4444)",
              transition: "width 0.15s ease",
            }}
          />
        </div>

        {/* Status Alerts */}
        {isReloading ? (
          <div style={{ background: "rgba(234, 179, 8, 0.2)", border: "1px solid #eab308", borderRadius: 6, padding: "4px 8px", textAlign: "center", fontSize: 12, fontWeight: 900, color: "#fef08a", letterSpacing: "0.08em" }}>
            ⟳ SEDANG RELOAD...
          </div>
        ) : currentAmmo === 0 ? (
          <div style={{ background: "rgba(239, 68, 68, 0.25)", border: "1px solid #ef4444", borderRadius: 6, padding: "4px 8px", textAlign: "center", fontSize: 12, fontWeight: 900, color: "#fca5a5", letterSpacing: "0.08em" }}>
            ⚠️ PELURU HABIS! TEKAN [R]
          </div>
        ) : currentAmmo <= 5 ? (
          <div style={{ background: "rgba(249, 115, 22, 0.2)", border: "1px solid #f97316", borderRadius: 6, padding: "2px 8px", textAlign: "center", fontSize: 11, fontWeight: 800, color: "#fdba74" }}>
            ⚠️ PELURU MENIPIS
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", fontWeight: 700 }}>
            <span>[R] RELOAD</span>
            <span>[1-3] GANTI SENJATA</span>
          </div>
        )}
      </div>

      {/* ── Bottom Controls Guide ── */}
      <div
        style={{
          position: "fixed",
          bottom: "clamp(8px, 2vw, 16px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "rgba(8, 12, 18, 0.88)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "clamp(4px, 1vw, 6px) clamp(10px, 2vw, 20px)",
          color: "#94a3b8",
          fontSize: "clamp(9px, 1.2vw, 12px)",
          fontFamily: "'Rajdhani', monospace",
          fontWeight: 700,
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          userSelect: "none",
          pointerEvents: "none",
          maxWidth: "96dvw",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        W Atas • S Bawah • A Kiri • D Kanan • Mouse Bidik • Klik Kiri Tembak • R Reload • Q Ability • 1-3 Ganti Senjata • V Kamera (Arcade/FPS) • B Toko • F Barikade • ESC Menu
      </div>

      {/* Waypoint Alert Banner when Gate opens */}
      {gate1Open && currentStage === 1 && !stageBreakActive && (
        <div
          style={{
            position: "fixed",
            top: "clamp(64px, 12vh, 82px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 45,
            background: "linear-gradient(90deg, rgba(22, 163, 74, 0.95), rgba(34, 197, 94, 0.98))",
            border: "1.5px solid #4ade80",
            padding: "6px 22px",
            borderRadius: 20,
            color: "#fff",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            boxShadow: "0 0 25px rgba(34, 197, 94, 0.6)",
            pointerEvents: "none",
            fontFamily: "'Rajdhani', monospace",
          }}
        >
          🚪 GERBANG 1 TERBUKA! MASUKI SEKTOR 2 (LAB BIO-TECH)
        </div>
      )}

      {gate2Open && currentStage === 2 && !stageBreakActive && (
        <div
          style={{
            position: "fixed",
            top: "clamp(64px, 12vh, 82px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 45,
            background: "linear-gradient(90deg, rgba(22, 163, 74, 0.95), rgba(34, 197, 94, 0.98))",
            border: "1.5px solid #4ade80",
            padding: "6px 22px",
            borderRadius: 20,
            color: "#fff",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            boxShadow: "0 0 25px rgba(34, 197, 94, 0.6)",
            pointerEvents: "none",
            fontFamily: "'Rajdhani', monospace",
          }}
        >
          🚁 GERBANG 2 TERBUKA! MENUJU HELIPAD UNTUK EVAKUASI AKHIR
        </div>
      )}
    </>
  );
});

function THREEClamp01(val: number): number {
  return Math.min(100, Math.max(0, val));
}
