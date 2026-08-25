import { useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { zombieEngine } from "../game/zombie/ZombieEngine";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { InstancedZombieRenderer } from "../game/zombie/InstancedZombieRenderer";
import { PowerUpRenderer } from "../game/zombie/PowerUpRenderer";
import { Barricade } from "../game/zombie/Barricade";
import { DownedOverlay } from "../components/DownedOverlay";
import { ZombieShootingSystem } from "../game/weapons/ZombieShootingSystem";
import { useZombieStore } from "../stores/useZombieStore";
import { useGameStore } from "../stores/useGameStore";
import { useAimStore } from "../stores/useAimStore";

// START SafeHouse (0,-30) → FINISH Rescue (0,30) — per docs/Zombie_Shooter_System_v1.md §2
const BARRICADES = [
  { id: "b_start", x: 0, z: -25 },
  { id: "b1", x: -5, z: -10 },
  { id: "b2", x: 5, z: -10 },
  { id: "b3", x: -10, z: 0 },
  { id: "b4", x: 10, z: 0 },
  { id: "b_finish", x: 0, z: 25 },
];

const FINISH_Z = 30;
const START_Z = -30;
const FINISH_RADIUS = 6;

export function ZombieSurvivalMode() {
  const waveState = useZombieStore(s => s.waveState);
  const currentWave = useZombieStore(s => s.currentWave);
  const powerUps = useZombieStore(s => s.powerUps);
  const barricades = useZombieStore(s => s.barricades);
  const player = useZombieStore(s => s.player);
  const zombiesRemaining = useZombieStore(s => s.zombiesRemaining);
  const extractionAvailable = useZombieStore(s => s.extractionAvailable);
  const extractionActive = useZombieStore(s => s.extractionActive);
  const extractionTimer = useZombieStore(s => s.extractionTimer);
  const evacSuccess = useZombieStore(s => s.evacSuccess);

  useEffect(() => {
    zombieEngine.init();
    useZombieStore.getState().resetGame();
    useZombieStore.getState().setBarricades(BARRICADES.map(b => ({
      ...b, health: 100, maxHealth: 100, planks: 6, maxPlanks: 6,
    })));
    return () => zombieEngine.cleanup();
  }, []);

  // Fixed timestep loop (1/60 accumulator) + powerup pickup + bleedout
  useEffect(() => {
    let raf = 0; let last = performance.now(); let acc = 0;
    const FIXED = 1/60;
    const tick = (dt: number) => {
      const aim = useAimStore.getState().pos;

      // engine update only during active waves
      const st0 = useZombieStore.getState();
      if (st0.waveState === "wave_active" || st0.waveState === "extraction") {
        zombieEngine.update(dt);
      }

      // PowerUp auto pickup < 2.5m
      for (const p of useZombieStore.getState().powerUps) {
        if (Math.hypot(p.x - aim.x, p.z - aim.z) < 2.5) zombieEngine.collectPowerUp(p.id);
      }

      const st = useZombieStore.getState();

      // Extraction countdown → escape success if still at finish & alive
      if (st.extractionActive) {
        const nt = st.extractionTimer - dt;
        if (nt <= 0) {
          const success = Math.hypot(aim.x, aim.z - FINISH_Z) < FINISH_RADIUS && !st.player.isDowned;
          useZombieStore.setState({ extractionActive:false, waveState:"game_over", evacSuccess: success });
        } else {
          useZombieStore.setState({ extractionTimer: nt });
        }
      }

      // Downed bleedout
      if (useZombieStore.getState().player.isDowned) {
        const p = useZombieStore.getState().player;
        const nt = p.downedTimer - dt;
        if (nt <= 0) {
          useZombieStore.setState(s => ({ player:{...s.player, isDowned:false, downedTimer:0}, waveState:"game_over" }));
        } else {
          useZombieStore.setState(s => ({ player:{...s.player, downedTimer: nt} }));
        }
      }
    };
    const loop = () => {
      const now = performance.now();
      acc += Math.min((now - last)/1000, 0.1);
      last = now;
      let steps = 0;
      while (acc >= FIXED && steps < 4) { tick(FIXED); acc -= FIXED; steps++; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const startWave = useCallback(() => {
    const nextWave = currentWave + 1;
    useZombieStore.getState().setCurrentWave(nextWave);
    zombieEngine.startWave(nextWave);
  }, [currentWave]);

  const handleBackToMenu = useCallback(() => { useGameStore.getState().setMode("menu"); }, []);
  const handleRestart = useCallback(() => {
    useZombieStore.getState().resetGame();
    zombieEngine.init();
    useZombieStore.getState().setBarricades(BARRICADES.map(b => ({...b, health:100, maxHealth:100, planks:6, maxPlanks:6})));
  }, []);

  // Hold F: repair barricade near / revive self when downed (500 pts)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyF") return;
      const st = useZombieStore.getState();
      const aim = useAimStore.getState().pos;

      if (!st.player.isDowned) {
        // repair nearest barricade < 2.5m
        for (const b of st.barricades) {
          if (Math.hypot(b.x - aim.x, b.z - aim.z) < 2.5) { zombieEngine.repairBarricade(b.id); break; }
        }
        return;
      }
      if (st.player.points < 500 || interval) return;
      let progress = 0;
      interval = setInterval(() => {
        progress += 0.05;
        useZombieStore.getState().setPlayer(pl => ({ ...pl, reviveProgress: Math.min(1, progress) }));
        if (progress >= 1 && interval) {
          clearInterval(interval); interval = null;
          useZombieStore.getState().addPoints(-500);
          useZombieStore.getState().setPlayer(pl => ({ ...pl, isDowned:false, downedTimer:0, hp:pl.maxHp, reviveProgress:0 }));
        }
      }, 50);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" && e.code !== "KeyR") return;
      if (interval) { clearInterval(interval); interval = null; }
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

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 18, 16], fov: 50 }}>
        <color attach="background" args={["#0a0f14"]} />
        <fog attach="fog" args={["#0a0f14", 40, 90]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.9} castShadow />
        <Physics gravity={[0, -9.81, 0]}>
          <ZombieArcadeController />
          <InstancedZombieRenderer />
          {powerUps.map(p => (
            <PowerUpRenderer key={p.id} id={p.id} type={p.type} x={p.x} z={p.z} />
          ))}
          {barricades.map(b => (
            <Barricade key={b.id} id={b.id} x={b.x} z={b.z} />
          ))}
          {/* START ring */}
          <mesh position={[0, 0.05, START_Z]} rotation={[-Math.PI/2,0,0]}>
            <ringGeometry args={[3, 3.5, 32]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={2} />
          </mesh>
          {/* FINISH rescue circle */}
          <mesh position={[0, 0.06, FINISH_Z]} rotation={[-Math.PI/2,0,0]}>
            <circleGeometry args={[5, 32]} />
            <meshBasicMaterial color={extractionActive ? "#22c55e" : extractionAvailable ? "#eab308" : "#475569"} transparent opacity={0.35} side={2} />
          </mesh>
          {/* Ground + corridor */}
          <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
            <planeGeometry args={[120, 120]} />
            <meshStandardMaterial color="#1a2a1a" />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0,0.01,0]}>
            <planeGeometry args={[8, 70]} />
            <meshStandardMaterial color="#2a3a2a" roughness={0.9} />
          </mesh>
          <pointLight position={[0, 5, START_Z]} intensity={1.2} distance={20} color="#22c55e" />
          <pointLight position={[0, 5, FINISH_Z]} intensity={extractionActive ? 2.5 : 1.0} distance={25} color={extractionActive ? "#22c55e" : "#eab308"} />
        </Physics>
        <ZombieShootingSystem />
      </Canvas>

      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono bg-black/60 p-3 rounded border border-white/10">
        <div className="text-2xl font-bold">Wave {currentWave} <span className="text-xs font-normal opacity-70">({waveState})</span></div>
        <div className="text-xl text-yellow-300">{player.points} pts</div>
        <div>HP {Math.ceil(player.hp)}/{player.maxHp}{player.armor>0 && <span className="text-blue-300"> • Armor {player.armor}</span>}</div>
        <div className="text-sm opacity-70">Zombies {zombiesRemaining}</div>
        {player.activePowerUps.size>0 && <div className="text-xs text-purple-300">{Array.from(player.activePowerUps.keys()).join(", ")}</div>}
        {extractionAvailable && !extractionActive && waveState !== "game_over" && <div className="text-xs text-yellow-400 animate-pulse">[E] Call Extraction at FINISH</div>}
        {extractionActive && <div className="text-sm text-green-400">EXTRACTING {Math.ceil(extractionTimer)}s — STAY AT FINISH!</div>}
        {waveState === "game_over" && evacSuccess && <div className="text-sm text-green-400 font-bold">EXTRACTION SUCCESS!</div>}
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={handleBackToMenu} className="px-4 py-2 bg-slate-800 text-white rounded border border-white/20 hover:bg-slate-700">MENU</button>
        {(waveState === "waiting" || waveState === "wave_clear") && (
          <button onClick={startWave} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 animate-pulse">
            {waveState === "waiting" ? `START WAVE ${currentWave+1}` : `NEXT WAVE ${currentWave+1}`}
          </button>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono bg-black/70 px-4 py-2 rounded">
        WASD Move • Mouse Aim • Click Shoot • Shift Sprint • F Repair/Revive(500) • E Extract • START(-30)→FINISH(+30)
      </div>

      {(waveState === "waiting" || waveState === "wave_clear" || waveState === "game_over") && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/80 p-6 rounded border border-white/20">
          <div className="text-white text-3xl font-bold mb-4">
            {waveState === "waiting" ? "SURVIVE THE HORDE"
              : waveState === "wave_clear" ? `Wave ${currentWave} Clear! +${currentWave*50}`
              : evacSuccess ? "EXTRACTION SUCCESS!" : "GAME OVER"}
          </div>
          <div className="flex gap-2 justify-center">
            {(waveState === "waiting" || waveState === "wave_clear") && (
              <button onClick={startWave} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                {waveState === "waiting" ? `Start Wave ${currentWave+1}` : "Next Wave"}
              </button>
            )}
            {waveState === "game_over" && (
              <button onClick={handleRestart} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">RESTART</button>
            )}
            <button onClick={handleBackToMenu} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600">MENU</button>
          </div>
        </div>
      )}

      <DownedOverlay />
    </div>
  );
}
