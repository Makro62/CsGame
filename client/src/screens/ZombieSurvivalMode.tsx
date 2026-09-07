import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Canvas } from "@react-three/fiber";
import { HeroSelectScreen } from "./HeroSelectScreen";
import { ZombieSurvivalHUD } from "./ZombieSurvivalHUD";
import {
  zombieEngine,
  ZombieArcadeController,
  InstancedZombieRenderer,
  PowerUpField,
  LootRenderer,
  SurvivalArena,
  SurvivalShop,
  DownedOverlay,
  ShootingSystem,
  ReloadSystem,
  TracerManager,
  DamageVignette,
  ClickToPlayOverlay,
  useZombieStore,
  useGameStore,
  useHeroStore,
  useAimStore,
  useWeaponSwitch,
  applyHeroToMatch,
  findRepairableBarricade,
  PauseMenu,
  GameModal,
  ModalBody,
  ModalHeader,
  OverlayButton,
  HUD_Z,
  WeaponModel,
} from "../game/zombie/zombieKit";
import { SurvivorBreakModal } from "../game/zombie/SurvivorBreakModal";

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
        left: `${(ndc.x * 0.5 + 0.5) * 100}dvw`,
        top: `${(-ndc.y * 0.5 + 0.5) * 100}dvh`,
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
  const stageBreakActive = useZombieStore(s => s.stageBreakActive);
  const cameraPerspective = useZombieStore(s => s.cameraPerspective ?? "arcade");
  const { buyMenuOpen, closeBuyMenu, toggleBuyMenu } = useWeaponSwitch();
  const betweenWaves = (waveState === "buy_phase" || waveState === "wave_clear") && !stageBreakActive;

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

  const handleAdvanceStage = useCallback(() => {
    const st = useZombieStore.getState();
    st.advanceToNextStage();
    const nextWave = st.currentWave + 1;
    st.setCurrentWave(nextWave);
    zombieEngine.startWave(nextWave);
    lockZombieCanvas();
  }, []);

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

      if ((st0.waveState === "buy_phase" || st0.waveState === "wave_clear") && !st0.stageBreakActive) {
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

      // Survivor.io Campaign Stage Break Countdown
      if (st0.stageBreakActive) {
        const nt = st0.stageBreakTimer - dt;
        if (nt <= 0) {
          handleAdvanceStage();
        } else {
          useZombieStore.getState().setStageBreakTimer(nt);
        }
      }

      useHeroStore.getState().tickCooldown(dt);

      if (st0.waveState === "wave_active" && !st0.stageBreakActive) {
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

  const openPause = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (useZombieStore.getState().stageBreakActive) {
          e.preventDefault();
          handleAdvanceStage();
          return;
        }
      }
      if (e.code === "KeyV") {
        useZombieStore.getState().toggleCameraPerspective();
        return;
      }
      if (e.code === "KeyF") {
        reviveHeld.current = true;
        const pos = useAimStore.getState().pos;
        const zs = useZombieStore.getState();
        const repairId = findRepairableBarricade(pos.x, pos.z, zs.barricades);
        if (repairId) {
          zs.repairBarricade(repairId);
          return;
        }
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



  const handleHeroSelect = useCallback(() => {
    setHeroSelected(true);
    lockZombieCanvas();
  }, []);

  return (
    <div className="w-full bg-black relative" style={{ cursor: "crosshair", height: "100dvh", width: "100dvw" }}>
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
      <Canvas camera={{ position: [0, 5, 10], fov: 65 }} shadows>
        <color attach="background" args={["#0a0e17"]} />
        <fog attach="fog" args={["#0a0e17", 45, 95]} />
        <ambientLight intensity={0.75} color="#cbd5e1" />
        <hemisphereLight args={["#60a5fa", "#1e293b", 0.6]} />
        <directionalLight
          position={[20, 32, 16]}
          intensity={1.5}
          color="#f8fafc"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={90}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-16, 20, -12]} intensity={0.45} color="#38bdf8" />
        <SurvivalArena />
        <ZombieArcadeController />
        <InstancedZombieRenderer />
        <PowerUpField />
        <LootRenderer />
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
        {cameraPerspective === "fps" && <WeaponModel />}
      </Canvas>
      </div>
      <ZombieSurvivalHUD
        onOpenPause={openPause}
        onToggleBuyMenu={toggleBuyMenu}
        showWaveAlert={showWaveAlert}
      />

      {waveState === "game_over" && (
        <GameModal accent="red" zIndex={HUD_Z.modal}>
          <ModalHeader eyebrow="K.I.A." title={`WAVE ${useZombieStore.getState().currentWave}`} />
          <ModalBody>
            <div style={{ color: "#94a3b8", marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
              {useZombieStore.getState().player.points} PTS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <OverlayButton variant="danger" onClick={handleRestart}>ULANGI</OverlayButton>
              <OverlayButton variant="ghost" onClick={handleBackToMenu}>MENU UTAMA</OverlayButton>
            </div>
          </ModalBody>
        </GameModal>
      )}

      {/* Survivor.io Break Modal */}
      {stageBreakActive && <SurvivorBreakModal onAdvance={handleAdvanceStage} />}

      <SurvivalShop open={buyMenuOpen && betweenWaves} onClose={closeBuyMenu} />
      <DamageVignette />
      <DownedOverlay />

      {paused && waveState !== "game_over" && (
        <PauseMenu
          title="ZOMBIE SURVIVAL"
          accent="green"
          onResume={resume}
          onRestart={handleRestart}
          onQuit={handleBackToMenu}
        />
      )}
    </div>
  );
}
