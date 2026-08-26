import { useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { zombieEngine } from "../game/zombie/ZombieEngine";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { InstancedZombieRenderer } from "../game/zombie/InstancedZombieRenderer";
import { PowerUpRenderer } from "../game/zombie/PowerUpRenderer";
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
  const powerUps = useZombieStore(s => s.powerUps);
  const player = useZombieStore(s => s.player);
  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const interWaveTimer = useZombieStore(s => s.interWaveTimer);
  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const maxAmmo = useWeaponStore(s => s.maxAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const { buyMenuOpen, closeBuyMenu, toggleBuyMenu } = useWeaponSwitch();

  const startLoadout = useCallback(() => {
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    ws.resetUpgrades();
    ws.syncLoadout({ primary: "mp5", secondary: "glock", knife: "knife" });
    ws.equipWeapon("mp5");
  }, []);

  useEffect(() => {
    zombieEngine.init();
    useZombieStore.getState().resetGame(true);
    startLoadout();
    return () => zombieEngine.cleanup();
  }, [startLoadout]);

  useEffect(() => {
    let raf = 0; let last = performance.now(); let acc = 0;
    const FIXED = 1 / 60;
    const tick = (dt: number) => {
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
  }, []);

  const handleBackToMenu = useCallback(() => { useGameStore.getState().setMode("menu"); }, []);
  const handleRestart = useCallback(() => {
    useZombieStore.getState().resetGame(true);
    zombieEngine.init();
    startLoadout();
    closeBuyMenu();
  }, [startLoadout, closeBuyMenu]);

  const betweenWaves = waveState === "buy_phase" || waveState === "wave_clear";

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
        <Physics gravity={[0, -9.81, 0]}>
          <SurvivalArena />
          <ZombieArcadeController />
          <InstancedZombieRenderer />
          {powerUps.map(p => (
            <PowerUpRenderer key={p.id} id={p.id} type={p.type} x={p.x} z={p.z} />
          ))}
          <LootRenderer />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
      </Canvas>

      <div className="absolute top-4 left-4 text-white font-mono bg-black/65 p-3 rounded border border-lime-700/40">
        <div className="text-2xl font-bold tracking-wide">WAVE {Math.max(1, currentWave)}</div>
        <div className="text-xl text-yellow-300">{player.points} pts</div>
        <div>HP {Math.ceil(player.hp)}/{player.maxHp}{player.armor > 0 && <span className="text-blue-300"> • ARM {player.armor}</span>}</div>
        <div className="text-sm opacity-80">{(activeWeapon ?? "—").toUpperCase()} {currentAmmo}/{reserveAmmo || maxAmmo}</div>
        <div className="text-sm opacity-70">Horde {zombiesRemaining}</div>
        {player.activePowerUps.size > 0 && <div className="text-xs text-purple-300">{Array.from(player.activePowerUps.keys()).join(", ")}</div>}
        {betweenWaves && <div className="text-xs text-lime-400 mt-1">NEXT WAVE {Math.ceil(interWaveTimer)}s • [B] SHOP</div>}
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={handleBackToMenu} className="px-4 py-2 bg-slate-800 text-white rounded border border-white/20 hover:bg-slate-700">MENU</button>
        {betweenWaves && (
          <button onClick={toggleBuyMenu} className="px-4 py-2 bg-lime-800 text-white rounded font-bold hover:bg-lime-700">SHOP [B]</button>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono bg-black/70 px-4 py-2 rounded">
        WASD gerak • Mouse aim • Klik tembak • Shift lari • R reload • 1-3 senjata • B shop antar wave
      </div>

      {waveState === "game_over" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/85 p-6 rounded border border-red-700/50">
          <div className="text-white text-3xl font-bold mb-2">K.I.A.</div>
          <div className="text-white/70 mb-4">Wave {currentWave} • {player.points} pts</div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleRestart} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">RESTART</button>
            <button onClick={handleBackToMenu} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600">MENU</button>
          </div>
        </div>
      )}

      <SurvivalShop open={buyMenuOpen && betweenWaves} onClose={closeBuyMenu} />
      <DamageVignette />
      <DownedOverlay />
    </div>
  );
}
