// @ts-nocheck
import { useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { zombieEngine, ZombieEngine } from "../game/zombie/ZombieEngine";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { InstancedZombieRenderer } from "../game/zombie/InstancedZombieRenderer";
import { PowerUpRenderer } from "../game/zombie/PowerUpRenderer";
import { Barricade } from "../game/zombie/Barricade";
import { DownedOverlay } from "../components/DownedOverlay";
import { ZombieShootingSystem } from "../game/weapons/ZombieShootingSystem";
import { useZombieStore } from "../stores/useZombieStore";
import { useGameStore } from "../stores/useGameStore";

// START at Safe House (0,-30) → FINISH at Helipad (0,30) - clear progression gates
const BARRICADES = [
  { id: "b_start", x: 0, z: -25 },  // START gate
  { id: "b1", x: -5, z: -10 },
  { id: "b2", x: 5, z: -10 },
  { id: "b3", x: -10, z: 0 },
  { id: "b4", x: 10, z: 0 },
  { id: "b_finish", x: 0, z: 25 }, // FINISH gate
];

export function ZombieSurvivalMode() {
  const engineRef = useRef<ZombieEngine | null>(null);
  const waveState = useZombieStore(s => s.waveState);
  const currentWave = useZombieStore(s => s.currentWave);
  const powerUps = useZombieStore(s => s.powerUps);
  const barricades = useZombieStore(s => s.barricades);
  const player = useZombieStore(s => s.player);

  useEffect(() => {
    const engine = zombieEngine;
    engineRef.current = engine;
    engine.init();
    useZombieStore.getState().setBarricades(BARRICADES.map(b => ({
      ...b, health: 100, maxHealth: 100, planks: 6, maxPlanks: 6,
    })));
    useZombieStore.getState().setCurrentWave(0);
    useZombieStore.getState().setWaveState("waiting");
    return () => engine.cleanup();
  }, []);

  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      engineRef.current?.update(dt);
      // Handle powerUp auto-collect when near player (proximity via aim pos)
      const aim = (window as unknown as Record<string, unknown>).__zombieAim as { pos?: { x:number; z:number } } | undefined;
      if (aim?.pos) {
        for (const p of useZombieStore.getState().powerUps) {
          if (Math.hypot(p.x - aim.pos.x, p.z - aim.pos.z) < 2.5) {
            engineRef.current?.collectPowerUp(p.id);
          }
        }
      }
      // Extraction timer
      const st = useZombieStore.getState();
      if (st.extractionActive) {
        const nt = Math.max(0, st.extractionTimer - dt);
        useZombieStore.setState({ extractionTimer: nt });
        if (nt <= 0) {
          useZombieStore.setState({ extractionActive: false, waveState: "game_over" });
        }
      }
      // Downed timer
      if (st.player.isDowned) {
        const nt = Math.max(0, st.player.downedTimer - dt);
        if (nt <= 0) {
          useZombieStore.getState().setPlayer(p => ({ ...p, isDowned: false, downedTimer: 0, hp: p.maxHp }));
          useZombieStore.getState().setWaveState("game_over");
        } else {
          useZombieStore.getState().setPlayer(p => ({ ...p, downedTimer: nt }));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Downed revive handling (hold F)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let holding = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || holding) return;
      const p = useZombieStore.getState().player;
      if (!p.isDowned) {
        // Try repair near barricade via engine
        const aim = (window as unknown as Record<string, unknown>).__zombieAim as { pos?: { x:number; z:number } } | undefined;
        if (aim?.pos) {
          for (const b of useZombieStore.getState().barricades) {
            if (Math.hypot(b.x - aim.pos.x, b.z - aim.pos.z) < 2.5) {
              engineRef.current?.repairBarricade(b.id);
              break;
            }
          }
        }
        return;
      }
      if (p.points < 500) return;
      holding = true;
      let progress = 0;
      interval = setInterval(() => {
        progress += 0.05;
        useZombieStore.getState().setPlayer(pl => ({ ...pl, reviveProgress: Math.min(1, progress) }));
        if (progress >= 1) {
          if (interval) clearInterval(interval);
          holding = false;
          useZombieStore.getState().addPoints(-500);
          useZombieStore.getState().setPlayer(pl => ({ ...pl, isDowned: false, downedTimer: 0, hp: pl.maxHp, reviveProgress: 0 }));
        }
      }, 50);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" && e.code !== "KeyR") return;
      if (interval) clearInterval(interval);
      holding = false;
      useZombieStore.getState().setPlayer(p => ({ ...p, reviveProgress: 0 }));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (interval) clearInterval(interval);
    };
  }, []);

  const startWave = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextWave = currentWave + 1;
    useZombieStore.getState().setCurrentWave(nextWave);
    engine.startWave(nextWave);
  }, [currentWave]);

  const handleBackToMenu = useCallback(() => {
    useGameStore.getState().setMode("menu");
  }, []);

  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const extractionAvailable = useZombieStore(s => s.extractionAvailable);
  const extractionActive = useZombieStore(s => s.extractionActive);
  const extractionTimer = useZombieStore(s => s.extractionTimer);

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 18, 16], fov: 50 }}>
        <color attach="background" args={["#0a0f14"]} />
        <fog attach="fog" args={["#0a0f14", 40, 90]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.9} castShadow />
        <Physics gravity={[0, -9.81, 0]}>
          <ZombieArcadeController engineRef={engineRef} />
          <InstancedZombieRenderer />
          {powerUps.map(p => (
            <PowerUpRenderer key={p.id} id={p.id} type={p.type} x={p.x} z={p.z} />
          ))}
          {barricades.map(b => (
            <Barricade key={b.id} id={b.id} x={b.x} z={b.z} />
          ))}
          {/* START / FINISH markers */}
          <mesh position={[0, 0.05, -30]} rotation={[-Math.PI/2,0,0]}>
            <ringGeometry args={[3, 3.5, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={2} />
          </mesh>
          <mesh position={[0, 0.02, -30]} rotation={[-Math.PI/2,0,0]}>
            <planeGeometry args={[12, 3]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.15} side={2} />
          </mesh>
          <mesh position={[0, 0.06, 30]} rotation={[-Math.PI/2,0,0]}>
            <circleGeometry args={[5, 32]} />
            <meshBasicMaterial color={extractionActive ? "#22c55e" : extractionAvailable ? "#eab308" : "#475569"} transparent opacity={0.35} side={2} />
          </mesh>
          {/* Ground with START-FINISH corridor visual */}
          <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0,0,0]}>
            <planeGeometry args={[120, 120]} />
            <meshStandardMaterial color="#1a2a1a" />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0,0.01,0]}>
            <planeGeometry args={[8, 70]} />
            <meshStandardMaterial color="#2a3a2a" roughness={0.9} />
          </mesh>
          {/* Corridor lights */}
          <pointLight position={[0, 5, -30]} intensity={1.2} distance={20} color="#22c55e" />
          <pointLight position={[0, 5, 30]} intensity={extractionActive ? 2.5 : 1.0} distance={25} color={extractionActive ? "#22c55e" : "#eab308"} />
        </Physics>
        <ZombieShootingSystem engineRef={engineRef} />
      </Canvas>

      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono bg-black/50 p-3 rounded border border-white/10">
        <div className="text-2xl font-bold">Wave: {currentWave} <span className="text-sm font-normal opacity-70">({waveState})</span></div>
        <div className="text-xl text-yellow-300">Points: {player.points}</div>
        <div className="text-lg">HP: {Math.ceil(player.hp)}/{player.maxHp} {player.armor>0 && <span className="text-blue-300">Armor:{player.armor}</span>}</div>
        <div className="text-sm opacity-70">Zombies: {zombiesRemaining} | Barricades: {barricades.length}</div>
        {player.activePowerUps.size>0 && <div className="text-xs text-purple-300">PowerUps: {Array.from(player.activePowerUps.keys()).join(", ")}</div>}
        {extractionAvailable && !extractionActive && <div className="text-xs text-yellow-400 animate-pulse">Extraction READY at FINISH (0,30)</div>}
        {extractionActive && <div className="text-sm text-green-400">Extracting {Math.ceil(extractionTimer)}s ... Reach FINISH!</div>}
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={handleBackToMenu} className="px-4 py-2 bg-slate-800 text-white rounded border border-white/20 hover:bg-slate-700">MENU</button>
        {(waveState === "waiting" || waveState === "wave_clear") && (
          <button onClick={startWave} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 animate-pulse">
            {waveState === "waiting" ? "START WAVE 1 [SPACE]" : `START WAVE ${currentWave+1}`}
          </button>
        )}
      </div>

      {/* Bottom hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono bg-black/60 px-4 py-2 rounded">
        WASD Move • Mouse Aim • Click Shoot • Shift Sprint • F Repair/Revive (500 pts) • START (-30) → FINISH (30)
      </div>

      {/* Wave State UI center */}
      {(waveState === "waiting" || waveState === "wave_clear" || waveState === "game_over") && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/70 p-6 rounded border border-white/20">
          <div className="text-white text-3xl font-bold mb-4">
            {waveState === "waiting" ? "SURVIVE THE HORDE" : waveState === "wave_clear" ? `Wave ${currentWave} Complete!` : `GAME OVER - Wave ${currentWave}`}
          </div>
          {waveState === "waiting" && <div className="text-white/70 text-sm mb-4">Zombies spawn around radius 45m • SpatialGrid 5m • Instanced rendering</div>}
          <div className="flex gap-2 justify-center">
            {(waveState === "waiting" || waveState === "wave_clear") && (
              <button onClick={startWave} className="px-6 py-3 bg-green-600 text-white rounded-lg text-xl hover:bg-green-700">
                {waveState === "waiting" ? "Press SPACE to Start" : "Start Next Wave"}
              </button>
            )}
            {waveState === "game_over" && (
              <button onClick={() => { useZombieStore.getState().resetGame(); engineRef.current?.init(); useZombieStore.getState().setBarricades(BARRICADES.map(b => ({...b, health:100, maxHealth:100, planks:6, maxPlanks:6}))); }} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">RESTART</button>
            )}
            <button onClick={handleBackToMenu} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600">MENU</button>
          </div>
        </div>
      )}

      <DownedOverlay />

      {/* Trigger extraction via key E at finish */}
      <ExtractionTrigger engineRef={engineRef} />
    </div>
  );
}

function ExtractionTrigger({ engineRef }: { engineRef: React.RefObject<ZombieEngine | null> }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const st = useZombieStore.getState();
      if (!st.extractionAvailable || st.extractionActive) return;
      const aim = (window as unknown as Record<string, unknown>).__zombieAim as { pos?: { x:number; z:number } } | undefined;
      if (!aim?.pos) return;
      if (Math.hypot(aim.pos.x - 0, aim.pos.z - 30) < 6) {
        useZombieStore.setState({ extractionActive: true, extractionTimer: 15, waveState: "extraction" });
        // spawn burst then extraction success will be handled in main loop
        setTimeout(() => {
          // if still alive at finish after 15s, success
          const s = useZombieStore.getState();
          const a = (window as unknown as Record<string, unknown>).__zombieAim as { pos?: { x:number; z:number } } | undefined;
          if (a?.pos && Math.hypot(a.pos.x, a.pos.z - 30) < 6 && !s.player.isDowned) {
            useZombieStore.setState({ waveState: "game_over" });
          }
        }, 15000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
