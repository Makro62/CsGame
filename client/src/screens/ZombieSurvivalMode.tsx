import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";
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
import { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
import { HeroSelectScreen } from "./HeroSelectScreen";
import { useZombieStore } from "../stores/useZombieStore";
import { useGameStore } from "../stores/useGameStore";
import { useHeroStore } from "../stores/useHeroStore";
import { useAimStore } from "../stores/useAimStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useWeaponSwitch } from "../hooks/useWeaponSwitch";
import { type WeaponKey } from "../stores/useWeaponStore";
import { weaponDisplay } from "../game/weapons/weaponDisplay";
import { equipSurvivalWeapon } from "../game/zombie/survivalBuy";
import { applyHeroToMatch } from "../game/zombie/applyHeroMatch";

const ZOMBIE_CANVAS_ID = "zombie-survival-canvas";
const SHIELD_ARMOR_BONUS = 40;

function lockZombieCanvas() {
  const canvas = (
    document.querySelector("#zombie-survival-canvas canvas") ||
    document.querySelector("canvas")
  ) as HTMLCanvasElement | null;
  canvas?.requestPointerLock();
}

function ArcadeLockCursor() {
  const ndc = useAimStore(s => s.cursorNdc);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const sync = () => setLocked(!!document.pointerLockElement);
    sync();
    document.addEventListener("pointerlockchange", sync);
    return () => document.removeEventListener("pointerlockchange", sync);
  }, []);
  if (!locked) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: `${(ndc.x * 0.5 + 0.5) * 100}vw`,
        top: `${(-ndc.y * 0.5 + 0.5) * 100}vh`,
        width: 18,
        height: 18,
        marginLeft: -9,
        marginTop: -9,
        pointerEvents: "none",
        zIndex: 55,
        border: "2px solid #84cc16",
        borderRadius: "50%",
        boxShadow: "0 0 8px rgba(132,204,22,0.8)",
      }}
    />
  );
}

export function ZombieSurvivalMode() {
  const waveState = useZombieStore(s => s.waveState);
  const currentWave = useZombieStore(s => s.currentWave);
  const player = useZombieStore(s => s.player);
  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const totalZombiesInWave = useZombieStore(s => s.totalZombiesInWave);
  const purchasedWeapons = useZombieStore(s => s.purchasedWeapons);
  const interWaveTimer = useZombieStore(s => s.interWaveTimer);
  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const maxAmmo = useWeaponStore(s => s.maxAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const primaryWeapon = useWeaponStore(s => s.primaryWeapon);
  const secondaryWeapon = useWeaponStore(s => s.secondaryWeapon);
  const knifeSlot = useWeaponStore(s => s.knifeSlot);
  const isReloading = useWeaponStore(s => s.isReloading);
  const { buyMenuOpen, closeBuyMenu, toggleBuyMenu } = useWeaponSwitch();
  const hero = useHeroStore(s => s.hero);
  const abilityReady = useHeroStore(s => s.abilityReady);
  const abilityCooldownRemaining = useHeroStore(s => s.abilityCooldownRemaining);
  const [paused, setPaused] = useState(false);
  const [showWaveAlert, setShowWaveAlert] = useState(false);
  const [heroSelected, setHeroSelected] = useState(false);
  const prevWaveState = useRef(waveState);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const heroSelectedRef = useRef(false);
  heroSelectedRef.current = heroSelected;
  const buyMenuOpenRef = useRef(false);
  buyMenuOpenRef.current = buyMenuOpen;
  const reviveHeld = useRef(false);

  useEffect(() => {
    if (waveState === "wave_active" && prevWaveState.current !== "wave_active") {
      setShowWaveAlert(true);
      const timer = setTimeout(() => setShowWaveAlert(false), 4200);
      return () => clearTimeout(timer);
    }
    prevWaveState.current = waveState;
  }, [waveState]);

  useEffect(() => {
    if (!heroSelected) return;
    useGameStore.getState().setMode("zombie");
    zombieEngine.init();
    useZombieStore.getState().resetGame(true);
    applyHeroToMatch(useHeroStore.getState().hero);
    useHeroStore.getState().resetAbility();
    return () => zombieEngine.cleanup();
  }, [heroSelected]);

  useEffect(() => {
    let raf = 0; let last = performance.now(); let acc = 0;
    const FIXED = 1 / 60;
    const tick = (dt: number) => {
      if (pausedRef.current || !heroSelectedRef.current) return;
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

      useHeroStore.getState().tickCooldown(dt);

      if (st0.waveState === "wave_active") {
        zombieEngine.update(dt);
      }

      const pos = useAimStore.getState().pos;
      for (const p of useZombieStore.getState().powerUps) {
        if (Math.hypot(p.x - pos.x, p.z - pos.z) < 2.2) zombieEngine.collectPowerUp(p.id);
      }
      for (const item of useZombieStore.getState().loot) {
        if (Math.hypot(item.x - pos.x, item.z - pos.z) < 2.0) zombieEngine.collectLoot(item.id);
      }

      if (useZombieStore.getState().player.isDowned) {
        const p = useZombieStore.getState().player;
        if (p.soloRevivesLeft > 0 && reviveHeld.current) {
          const next = Math.min(1, p.reviveProgress + dt / 3);
          if (next >= 1) {
            useZombieStore.setState(s => ({
              player: {
                ...s.player,
                isDowned: false,
                downedTimer: 0,
                reviveProgress: 0,
                soloRevivesLeft: 0,
                hp: Math.max(40, s.player.hp),
              },
            }));
          } else {
            useZombieStore.setState(s => ({ player: { ...s.player, reviveProgress: next } }));
          }
        } else {
          if (p.reviveProgress > 0) {
            useZombieStore.setState(s => ({ player: { ...s.player, reviveProgress: 0 } }));
          }
          const nt = p.downedTimer - dt;
          if (nt <= 0) {
            useZombieStore.setState(s => ({ player: { ...s.player, isDowned: false, downedTimer: 0 }, waveState: "game_over" }));
          } else {
            useZombieStore.setState(s => ({ player: { ...s.player, downedTimer: nt } }));
          }
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

  const [, setLocation] = useLocation();

  const handleBackToMenu = useCallback(() => {
    setPaused(false);
    useGameStore.getState().setMode("menu");
    setLocation("/");
  }, [setLocation]);

  const handleRestart = useCallback(() => {
    setPaused(false);
    zombieEngine.cleanup();
    zombieEngine.init();
    useZombieStore.getState().resetGame(true);
    applyHeroToMatch(useHeroStore.getState().hero);
    useHeroStore.getState().resetAbility();
    closeBuyMenu();
    lockZombieCanvas();
  }, [closeBuyMenu]);

  const resume = useCallback(() => {
    setPaused(false);
    lockZombieCanvas();
  }, []);

  const openSettings = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openSettings"));
  }, []);

  const betweenWaves = waveState === "buy_phase" || waveState === "wave_clear";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF") {
        reviveHeld.current = true;
        return;
      }
      if (e.code === "KeyQ") {
        if (!heroSelectedRef.current || pausedRef.current || buyMenuOpenRef.current) return;
        const used = useHeroStore.getState().triggerAbility();
        if (used) {
          const heroState = useHeroStore.getState();
          if (heroState.hero.ability === "berserk") {
            const pos = useAimStore.getState().pos;
            zombieEngine.berserkBurst(pos.x, pos.z, 8, Math.floor(heroState.hero.stats.damage * 0.8));
          } else if (heroState.hero.ability === "shield") {
            useZombieStore.setState(s => ({
              player: { ...s.player, armor: Math.min(100, s.player.armor + SHIELD_ARMOR_BONUS) },
            }));
          }
        }
        return;
      }
      if (e.code !== "Escape") return;
      if (buyMenuOpen) { closeBuyMenu(); return; }
      if (paused) { resume(); return; }
      setPaused(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "KeyF") reviveHeld.current = false;
    };
    const onVisibility = () => {
      if (document.hidden) {
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [buyMenuOpen, closeBuyMenu, paused, resume]);

  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const totalWaveZombies = Math.max(totalZombiesInWave, zombiesRemaining, 1);
  const killedZombies = Math.max(0, totalWaveZombies - zombiesRemaining);
  const waveProgressPercent = Math.min(100, Math.round((killedZombies / totalWaveZombies) * 100));
  const magPercent = maxAmmo > 0 ? Math.max(0, Math.min(100, (currentAmmo / maxAmmo) * 100)) : 0;

  const handleHeroSelect = useCallback(() => {
    setHeroSelected(true);
    lockZombieCanvas();
  }, []);

  return (
    <div className="w-full h-screen bg-black relative" style={{ cursor: "crosshair" }}>
      {/* Hero Selection Screen */}
      {!heroSelected && <HeroSelectScreen onSelect={handleHeroSelect} />}
      {heroSelected && (
        <ClickToPlayOverlay
          onLock={() => setPaused(false)}
          suppressed={paused || buyMenuOpen || waveState === "game_over"}
          canvasSelector="#zombie-survival-canvas canvas"
        />
      )}
      {heroSelected && <ArcadeLockCursor />}

      <div id={ZOMBIE_CANVAS_ID} className="w-full h-full">
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
      </div>
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
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "linear-gradient(180deg, rgba(13, 20, 16, 0.96), rgba(8, 12, 10, 0.98))",
          border: waveState === "wave_active" ? "1.5px solid rgba(239, 68, 68, 0.6)" : "1.5px solid rgba(132, 204, 22, 0.5)",
          borderRadius: 14,
          padding: "10px 24px",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: 380,
          boxShadow: waveState === "wave_active"
            ? "0 8px 30px rgba(0,0,0,0.8), 0 0 25px rgba(239, 68, 68, 0.25)"
            : "0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(132, 204, 22, 0.2)",
          userSelect: "none",
          textAlign: "center",
        }}
      >
        {/* Mission Status Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 900, letterSpacing: "0.1em" }}>
            <span style={{ color: waveState === "wave_active" ? "#ef4444" : "#84cc16", fontSize: 15 }}>
              {waveState === "wave_active" ? "⚔️ TARGET MISI SURVIVAL" : "🛡️ PERSIAPAN PERTAHANAN"}
            </span>
            <span style={{ background: "rgba(255,255,255,0.1)", padding: "1px 8px", borderRadius: 4, color: "#facc15" }}>
              WAVE {Math.max(1, currentWave)}
            </span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>
            PROGRES: <span style={{ color: "#a3e635", fontSize: 14 }}>{waveProgressPercent}%</span>
          </div>
        </div>

        {/* Dynamic Wave Mission Details */}
        {waveState === "wave_active" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#cbd5e1" }}>
                ZOMBIE DIBUNUH: <span style={{ color: "#4ade80", fontSize: 16, fontWeight: 900 }}>{killedZombies}</span>
                <span style={{ color: "#64748b" }}> / {totalWaveZombies}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#ef4444" }}>
                SISA: <span style={{ fontSize: 18, color: "#f87171" }}>{zombiesRemaining}</span> AKAN DATANG
              </div>
            </div>

            {/* Elimination Progress Bar */}
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  width: `${waveProgressPercent}%`,
                  height: "100%",
                  background: waveProgressPercent >= 80 ? "linear-gradient(90deg, #eab308, #22c55e)" : "linear-gradient(90deg, #dc2626, #f97316)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: zombiesRemaining <= 3 ? "#fef08a" : "#94a3b8", letterSpacing: "0.05em" }}>
              {zombiesRemaining === 0
                ? "🎉 SEMUA ZOMBIE TELAH DIBUNUH! MISI WAVE SELESAI!"
                : `🎯 Bunuh ${zombiesRemaining} zombie lagi supaya misi wave ini selesai!`}
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
          top: 68,
          right: 16,
          zIndex: 40,
          background: "linear-gradient(160deg, rgba(13, 20, 16, 0.94), rgba(8, 12, 10, 0.98))",
          border: "1.5px solid rgba(132, 204, 22, 0.35)",
          borderRadius: 14,
          padding: "12px 16px",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: 230,
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

        {/* List of Purchased Weapons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
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
          bottom: 20,
          right: 20,
          zIndex: 40,
          background: "linear-gradient(145deg, rgba(13, 20, 16, 0.95), rgba(8, 12, 10, 0.98))",
          border: isReloading ? "1.5px solid #eab308" : currentAmmo === 0 ? "1.5px solid #ef4444" : "1.5px solid rgba(56, 189, 248, 0.4)",
          borderRadius: 14,
          padding: "16px 22px",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          minWidth: 260,
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
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1,
              color: currentAmmo === 0 ? "#ef4444" : currentAmmo <= 5 ? "#f97316" : "#38bdf8",
              textShadow: currentAmmo === 0 ? "0 0 15px rgba(239,68,68,0.6)" : "0 0 15px rgba(56,189,248,0.4)",
            }}
          >
            {currentAmmo}
          </span>
          <span style={{ fontSize: 20, color: "#475569", fontWeight: 800 }}>/</span>
          <span style={{ fontSize: 22, color: "#94a3b8", fontWeight: 800 }}>
            {reserveAmmo}
          </span>
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto", fontWeight: 700 }}>
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
        W Atas • S Bawah • A Kiri • D Kanan • Mouse Bidik • Klik Kiri Tembak • R Reload • Q Ability • 1-3 Ganti Senjata • B Toko • F Revive • ESC Menu
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
