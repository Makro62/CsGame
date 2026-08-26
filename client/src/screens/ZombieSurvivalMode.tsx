import { useEffect, useCallback, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { zombieEngine } from "../game/zombie/ZombieEngine";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { InstancedZombieRenderer } from "../game/zombie/InstancedZombieRenderer";
import { PowerUpField } from "../game/zombie/PowerUpRenderer";
import { LootRenderer } from "../game/zombie/LootRenderer";
import { SurvivalArena } from "../game/zombie/SurvivalArena";
import { SurvivalShop } from "../game/zombie/SurvivalShop";
import { DownedOverlay } from "../components/DownedOverlay";
import { ShootingSystem } from "../game/weapons/ShootingSystem";
import { ReloadSystem } from "../game/weapons/ReloadSystem";
import { TracerManager } from "../game/effects/TracerManager";
import { DamageVignette } from "../components/DamageVignette";
import { useZombieStore } from "../stores/useZombieStore";
import { useGameStore } from "../stores/useGameStore";
import { useAimStore } from "../stores/useAimStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useWeaponSwitch } from "../hooks/useWeaponSwitch";

export function ZombieSurvivalMode() {
  const waveState = useZombieStore(s => s.waveState);
  const currentWave = useZombieStore(s => s.currentWave);
  const player = useZombieStore(s => s.player);
  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const interWaveTimer = useZombieStore(s => s.interWaveTimer);
  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const maxAmmo = useWeaponStore(s => s.maxAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const { buyMenuOpen, closeBuyMenu, toggleBuyMenu } = useWeaponSwitch();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const startLoadout = useCallback(() => {
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    ws.resetUpgrades();
    ws.syncLoadout({ primary: "mp5", secondary: "glock", knife: "knife" });
    ws.equipWeapon("mp5");
  }, []);

  useEffect(() => {
    useGameStore.getState().setMode("zombie");
    zombieEngine.init();
    useZombieStore.getState().resetGame(true);
    startLoadout();
    return () => zombieEngine.cleanup();
  }, [startLoadout]);

  useEffect(() => {
    let raf = 0; let last = performance.now(); let acc = 0;
    const FIXED = 1 / 60;
    const tick = (dt: number) => {
      if (pausedRef.current) return;
      const aim = useAimStore.getState().pos;
      const st0 = useZombieStore.getState();

      if (st0.waveState === "buy_phase" || st0.waveState === "wave_clear") {
        const nt = st0.interWaveTimer - dt;
        if (nt <= 0) {
          const nextWave = st0.currentWave + 1;
          useZombieStore.getState().setCurrentWave(nextWave);
          zombieEngine.startWave(nextWave);
          closeBuyMenu();
        } else {
          useZombieStore.getState().setInterWaveTimer(nt);
        }
      }

      if (st0.waveState === "wave_active") {
        zombieEngine.update(dt);
      }

      for (const p of useZombieStore.getState().powerUps) {
        if (Math.hypot(p.x - aim.x, p.z - aim.z) < 2.2) zombieEngine.collectPowerUp(p.id);
      }
      for (const item of useZombieStore.getState().loot) {
        if (Math.hypot(item.x - aim.x, item.z - aim.z) < 2.0) zombieEngine.collectLoot(item.id);
      }

      if (useZombieStore.getState().player.isDowned) {
        const p = useZombieStore.getState().player;
        const nt = p.downedTimer - dt;
        if (nt <= 0) {
          useZombieStore.setState(s => ({ player: { ...s.player, isDowned: false, downedTimer: 0 }, waveState: "game_over" }));
        } else {
          useZombieStore.setState(s => ({ player: { ...s.player, downedTimer: nt } }));
        }
      }
    };
    const loop = () => {
      const now = performance.now();
      acc += Math.min((now - last) / 1000, 0.1);
      last = now;
      let steps = 0;
      while (acc >= FIXED && steps < 4) { tick(FIXED); acc -= FIXED; steps++; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [closeBuyMenu]);

  const handleBackToMenu = useCallback(() => {
    setPaused(false);
    useGameStore.getState().setMode("menu");
    window.location.href = "/";
  }, []);

  const handleRestart = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
    useZombieStore.getState().resetGame(true);
    zombieEngine.init();
    startLoadout();
    closeBuyMenu();
  }, [startLoadout, closeBuyMenu]);

  const resume = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  }, []);

  const openSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openSettings"));
  }, []);

  const betweenWaves = waveState === "buy_phase" || waveState === "wave_clear";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (buyMenuOpen) { closeBuyMenu(); return; }
      if (paused) { resume(); return; }
      setPaused(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buyMenuOpen, closeBuyMenu, openSettings]);

  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));

  return (
    <div className="w-full h-screen bg-black relative" style={{ cursor: "crosshair" }}>
      <Canvas camera={{ position: [0, 22, 11], fov: 48 }} shadows>
        <color attach="background" args={["#12180f"]} />
        <fog attach="fog" args={["#12180f", 40, 90]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#9bb87a", "#2a3018", 0.55]} />
        <directionalLight
          position={[14, 28, 10]}
          intensity={1.25}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={80}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <SurvivalArena />
        <ZombieArcadeController />
        <InstancedZombieRenderer />
        <PowerUpField />
        <LootRenderer />
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
      </Canvas>

      {/* ── Top Left: Glassmorphic Zombie Tactical HUD ── */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 40,
          background: "linear-gradient(145deg, rgba(13, 20, 16, 0.94), rgba(8, 12, 10, 0.98))",
          border: "1.5px solid rgba(132, 204, 22, 0.4)",
          borderRadius: 14,
          padding: "14px 20px",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: 260,
          boxShadow: "0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(132, 204, 22, 0.15)",
          userSelect: "none",
        }}
      >
        {/* Wave & Points Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>☣️</span>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.08em", color: "#a3e635" }}>
              WAVE {Math.max(1, currentWave)}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#facc15", textShadow: "0 0 10px rgba(250, 204, 21, 0.4)" }}>
            {player.points} <span style={{ fontSize: 12, color: "#ca8a04" }}>PTS</span>
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
            <span style={{ fontSize: 12, color: "#64748b" }}>/ {reserveAmmo || maxAmmo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>HORDE:</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#ef4444" }}>{zombiesRemaining}</span>
          </div>
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

      {/* ── Top Right: Standardized Tactical Action Buttons ── */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 40, display: "flex", gap: 8 }}>
        {betweenWaves && (
          <button
            onClick={toggleBuyMenu}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, rgba(77, 124, 15, 0.9), rgba(54, 83, 20, 0.95))",
              border: "1px solid #84cc16",
              borderRadius: 8,
              padding: "8px 16px",
              color: "#f7fee7",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.08em",
              fontFamily: "'Rajdhani', monospace",
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(132, 204, 22, 0.35)",
              transition: "all 0.15s ease",
            }}
          >
            <span>🛒</span>
            <span>ARSENAL [B]</span>
          </button>
        )}
        <button
          onClick={openSettings}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "#38bdf8",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.08em",
            fontFamily: "'Rajdhani', monospace",
            cursor: "pointer",
            boxShadow: "0 0 12px rgba(56, 189, 248, 0.15)",
            transition: "all 0.15s ease",
          }}
        >
          <span>⚙️</span>
          <span>PENGATURAN</span>
        </button>
        <button
          onClick={handleBackToMenu}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(135deg, rgba(127, 29, 29, 0.85), rgba(69, 10, 10, 0.95))",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "#fca5a5",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.08em",
            fontFamily: "'Rajdhani', monospace",
            cursor: "pointer",
            boxShadow: "0 0 12px rgba(239, 68, 68, 0.15)",
            transition: "all 0.15s ease",
          }}
        >
          <span>✕</span>
          <span>MENU</span>
        </button>
      </div>

      {/* ── Bottom Controls Guide ── */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "rgba(8, 12, 18, 0.88)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "6px 20px",
          color: "#94a3b8",
          fontSize: 12,
          fontFamily: "'Rajdhani', monospace",
          fontWeight: 700,
          letterSpacing: "0.05em",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        WASD Gerak • Mouse Arah Bidik • Klik Kiri Tembak • R Reload • 1-3 Ganti Senjata • B Toko • ESC Menu
      </div>

      {/* ── Game Over (K.I.A.) Tactical Modal ── */}
      {waveState === "game_over" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(6px)",
            zIndex: 80,
          }}
        >
          <div
            style={{
              background: "linear-gradient(160deg, rgba(24, 12, 12, 0.98), rgba(12, 6, 6, 0.99))",
              border: "1.5px solid #ef4444",
              borderRadius: 16,
              padding: "36px 48px",
              textAlign: "center",
              boxShadow: "0 0 45px rgba(239, 68, 68, 0.4), 0 20px 50px rgba(0,0,0,0.9)",
              minWidth: 360,
              fontFamily: "'Rajdhani', monospace",
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 900, color: "#ef4444", letterSpacing: "0.15em", marginBottom: 6 }}>
              K.I.A.
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: 20 }}>
              OUTPOST Z-7 SURVIVOR ELIMINATED
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "14px 20px", marginBottom: 24, display: "flex", justifyContent: "space-around" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>SURVIVED</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc" }}>WAVE {currentWave}</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>FINAL SCORE</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#facc15" }}>{player.points} PTS</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={handleRestart}
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #dc2626, #991b1b)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  boxShadow: "0 0 16px rgba(220, 38, 38, 0.4)",
                }}
              >
                COBA LAGI
              </button>
              <button
                onClick={handleBackToMenu}
                style={{
                  padding: "12px 28px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#cbd5e1",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                }}
              >
                MENU UTAMA
              </button>
            </div>
          </div>
        </div>
      )}

      <SurvivalShop open={buyMenuOpen && betweenWaves} onClose={closeBuyMenu} />
      <DamageVignette />
      <DownedOverlay />

      {/* Pause Menu */}
      {paused && waveState !== "game_over" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 90,
          }}
        >
          <div
            style={{
              background: "linear-gradient(155deg, rgba(13, 20, 36, 0.96), rgba(8, 12, 22, 0.98))",
              border: "1.5px solid #84cc16",
              borderRadius: 16,
              padding: "32px 48px",
              textAlign: "center",
              boxShadow: "0 0 35px rgba(132, 204, 22, 0.3), 0 20px 50px rgba(0,0,0,0.8)",
              minWidth: 300,
              fontFamily: "'Rajdhani', monospace",
            }}
          >
            <div style={{ color: "#84cc16", fontSize: 11, fontWeight: 900, letterSpacing: 2.5, marginBottom: 8 }}>
              PAUSED
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginBottom: 24, letterSpacing: "0.08em" }}>
              ZOMBIE SURVIVAL
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={resume}
                style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                LANJUTKAN
              </button>
              <button
                onClick={handleRestart}
                style={{ padding: "12px 28px", background: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid #eab308", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                RESTART
              </button>
              <button
                onClick={handleBackToMenu}
                style={{ padding: "12px 28px", background: "rgba(239,68,68,0.2)", color: "#fecaca", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                KEMBALI KE MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ZombieSurvivalMode;
