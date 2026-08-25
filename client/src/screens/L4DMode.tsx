import { useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { ZombieShootingSystem } from "../game/weapons/ZombieShootingSystem";
import { useL4DStore } from "../stores/useL4DStore";
import { L4DDirector } from "../game/l4d/L4DDirector";
import { L4DCampaignMap } from "../game/l4d/L4DCampaignMap";
import { useGameStore } from "../stores/useGameStore";
import { useAimStore } from "../stores/useAimStore";

function L4DInfectedRenderer() {
  const infected = useL4DStore(s=> s.infected);
  return (
    <group>
      {infected.filter(i=>!i.isDead).map(inf=>{
        const isTank = inf.type==="tank", isWitch = inf.type==="witch", isSpecial = inf.type!=="common";
        const col = isTank ? "#7f1d1d" : isWitch ? "#f5f5f5" : inf.type==="hunter" ? "#3b82f6" : inf.type==="smoker" ? "#22c55e" : inf.type==="boomer" ? "#eab308" : "#4a7a2a";
        const scale: [number,number,number] = isTank ? [1.6,1.8,1.2] : isWitch ? [0.9,1.4,0.7] : isSpecial ? [0.8,1.3,0.6] : [0.6,1.2,0.45];
        const y = isTank? 1.1 : 0.75;
        return (
          <group key={inf.id} position={[inf.x, inf.y, inf.z]} rotation={[0, inf.rotationY, 0]}>
            <mesh position={[0,y,0]}>
              <boxGeometry args={scale} />
              <meshStandardMaterial color={col} emissive={isSpecial? col: undefined} emissiveIntensity={isSpecial?0.2:0} />
            </mesh>
            {/* eyes */}
            <mesh position={[-0.12, y+0.42, 0.22]}>
              <sphereGeometry args={[0.07,8,8]} />
              <meshStandardMaterial color={isTank? "#ff2222":"#ffaaaa"} emissive="#ff2222" emissiveIntensity={isTank?2:1} />
            </mesh>
            <mesh position={[0.12, y+0.42, 0.22]}>
              <sphereGeometry args={[0.07,8,8]} />
              <meshStandardMaterial color={isTank? "#ff2222":"#ffaaaa"} emissive="#ff2222" emissiveIntensity={isTank?2:1} />
            </mesh>
            {/* witch claws / boomer belly */}
            {inf.type==="witch" && <mesh position={[0, y-0.15, 0.3]}><boxGeometry args={[0.3,0.1,0.5]} /><meshStandardMaterial color="#e5e7eb" /></mesh>}
            {inf.type==="boomer" && <mesh position={[0, y, 0.2]}><sphereGeometry args={[0.35,10,10]} /><meshStandardMaterial color="#facc15" transparent opacity={0.85} /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

function SurvivorBots() {
  const survivors = useL4DStore(s=> s.survivors);
  // bots follow player (survivor_0)
  return (
    <group>
      {survivors.map((s, idx)=>{
        if (idx===0) return null; // player is rendered via ZombieArcadeController
        if (s.isDead) return null;
        return (
          <group key={s.id} position={[s.x, 0, s.z]}>
            <mesh position={[0,0.9,0]}>
              <capsuleGeometry args={[0.3, 0.9, 8, 12]} />
              <meshStandardMaterial color={s.isDowned? "#ef4444" : "#38bdf8"} />
            </mesh>
            {/* downed indicator */}
            {s.isDowned && <mesh position={[0,1.6,0]}><boxGeometry args={[0.6,0.12,0.12]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} /></mesh>}
          </group>
        );
      })}
    </group>
  );
}

export function L4DMode() {
  const directorRef = useRef<L4DDirector | null>(null);
  const survivors = useL4DStore(s=> s.survivors);
  const chapter = useL4DStore(s=> s.chapter);
  const chapterState = useL4DStore(s=> s.chapterState);
  const finaleState = useL4DStore(s=> s.finaleState);
  const finaleTimer = useL4DStore(s=> s.finaleTimer);
  const hordeActive = useL4DStore(s=> s.hordeActive);
  const hordeTimer = useL4DStore(s=> s.hordeTimer);
  const directorIntensity = useL4DStore(s=> s.directorIntensity);
  const infected = useL4DStore(s=> s.infected);
  const isGameOver = useL4DStore(s=> s.isGameOver);
  const isVictory = useL4DStore(s=> s.isVictory);
  const panicLevel = useL4DStore(s=> s.panicLevel);
  const chapterProgress = useL4DStore(s=> s.chapterProgress);
  const crescendoActive = useL4DStore(s=> s.crescendoActive);
  const rescueVehicleArrived = useL4DStore(s=> s.rescueVehicleArrived);

  useEffect(()=> {
    directorRef.current = new L4DDirector();
    directorRef.current.init();
    useL4DStore.getState().resetCampaign(chapter);
    // use neutral safe room start
    useL4DStore.setState({ chapterState: "safeRoom" });
    return ()=> { directorRef.current = null; };
  }, [chapter]);

  // Main director + survivor bot follow loop (fixed timestep)
  useEffect(()=>{
    let raf:number; let last = performance.now(); let acc = 0;
    const FIXED = 1/60;
    const loop = ()=>{
      const now = performance.now();
      const frameDt = Math.min((now - last)/1000, 0.1);
      last = now;
      acc += frameDt;
      let steps = 0;
      while (acc >= FIXED && steps < 4) {
        this_tick(FIXED);
        acc -= FIXED; steps++;
      }
      raf = requestAnimationFrame(loop);
    };

    const this_tick = (dt: number) => {
      const now = performance.now();

      // Update survivor 0 (player) from aim store
      const aim = useAimStore.getState();
      useL4DStore.setState(s=>{
        const next = [...s.survivors];
        next[0] = { ...next[0], x: aim.pos.x, z: aim.pos.z };
        return { survivors: next };
      });

      // Bots follow player with offset + shoot nearest
      const st = useL4DStore.getState();
      const p = st.survivors[0];
      for (let i=1;i<st.survivors.length;i++) {
        const bot = st.survivors[i];
        if (bot.isDead || bot.isDowned) continue;
        const targetX = p.x + (i%2? 2.2: -2.2) + Math.sin(now*0.001 + i)*0.6;
        const targetZ = p.z - 2.0 - i*0.7;
        const dx = targetX - bot.x, dz = targetZ - bot.z, d=Math.hypot(dx,dz);
        if (d>0.4) {
          const nx = bot.x + (dx/d)* 3.4 * dt;
          const nz = bot.z + (dz/d)* 3.4 * dt;
          useL4DStore.getState().updateSurvivor(bot.id, s=> ({...s, x: nx, z: nz}));
        }
        // bot shoots nearest infected within 18m
        let nearest: typeof st.infected[0] | null = null;
        let nd = Infinity;
        for (const inf of st.infected) {
          if (inf.isDead) continue;
          const dd = Math.hypot(inf.x-bot.x, inf.z-bot.z);
          if (dd < nd) { nd = dd; nearest = inf; }
        }
        if (nearest && nd < 18 && Math.random()<0.08) {
          const dmg = 22 + Math.random()*14;
          const nhp = nearest.hp - dmg;
          useL4DStore.setState(s=> ({ infected: s.infected.map(x=> x.id===nearest!.id ? (nhp<=0? {...x, isDead:true, hp:0} : {...x, hp:nhp}) : x)}));
        }
      }

      // Director pacing + spawns
      directorRef.current?.setSurvivorPositions(useL4DStore.getState().survivors.filter(s=>!s.isDead).map(s=> ({x:s.x, z:s.z})));
      directorRef.current?.update(dt);

      // Infected attack damage to nearby survivors
      const survivorsNow = useL4DStore.getState().survivors;
      for (const inf of useL4DStore.getState().infected) {
        if (inf.isDead || !inf.isAttacking) continue;
        for (const sv of survivorsNow) {
          if (sv.isDead || sv.isDowned) continue;
          if (Math.hypot(inf.x - sv.x, inf.z - sv.z) < 2.0 && Math.random()<0.10) {
            const dmg = inf.type==="tank"? 28 : inf.type==="witch"? 35 : inf.type==="hunter"? 18 : 10;
            useL4DStore.getState().updateSurvivor(sv.id, s=>{
              const nhp = Math.max(0, s.hp - dmg);
              if (nhp<=0) return {...s, hp:0, isDowned:false, isDead:true};
              if (nhp<20) return {...s, hp: nhp, isDowned:true};
              return {...s, hp: nhp};
            });
          }
        }
      }

      // Chapter progress along START -36 to FINALE +36*scale (use current map lenScale via chapter)
      const scale = st.chapter===1?1:st.chapter===2?1.15:st.chapter===3?1.35:1.5;
      const finishZ = 36*scale;
      const prog = Math.max(0, Math.min(1, (aim.pos.z + 36*scale) / (finishZ + 36*scale)));
      useL4DStore.setState({ chapterProgress: prog });

      const st2 = useL4DStore.getState();
      // safeRoom -> traverse when leaving start zone
      if (st2.chapterState==="safeRoom" && p.z > -28) {
        useL4DStore.setState({ chapterState: "traverse" });
      }
      // all alive at rescue?
      const finals = st2.survivors.filter(s=>!s.isDead);
      const atRescue = finals.filter(s=> Math.hypot(s.x - 0, s.z - finishZ) < 8).length;
      if (st2.chapterState==="traverse" && finals.length>0 && atRescue===finals.length) {
        useL4DStore.setState({ chapterState: "finale", finaleState: "call_rescue", finaleTimer: 4 });
      }
      // Finale timers
      if (st2.chapterState==="finale") {
        if (st2.finaleState==="call_rescue") {
          const nt = st2.finaleTimer - dt;
          if (nt<=0) {
            useL4DStore.setState({ finaleState: "holdout", finaleTimer: 40, rescueVehicleArrived: false });
            directorRef.current?.crescendo();
          } else useL4DStore.setState({ finaleTimer: nt });
        } else if (st2.finaleState==="holdout") {
          const nt = st2.finaleTimer - dt;
          if (nt<=20 && !st2.rescueVehicleArrived) useL4DStore.setState({ rescueVehicleArrived: true });
          if (nt<=0) useL4DStore.setState({ finaleState: "escape", finaleTimer: 10 });
          else useL4DStore.setState({ finaleTimer: nt });
        } else if (st2.finaleState==="escape") {
          const nt = st2.finaleTimer - dt;
          if (atRescue===finals.length && finals.length>0) {
            // escape success → next chapter or victory
            if (st2.chapter < 4) {
              const nextChapter = (st2.chapter+1) as typeof st2.chapter;
              useL4DStore.getState().resetCampaign(nextChapter);
              directorRef.current?.init();
            } else {
              useL4DStore.setState({ isVictory:true, finaleState: "completed" });
            }
          } else if (nt<=0) {
            useL4DStore.setState({ isGameOver:true });
          } else {
            useL4DStore.setState({ finaleTimer: nt });
          }
        }
      }
      // Game over when everyone dead
      const alive = useL4DStore.getState().survivors.filter(s=>!s.isDead).length;
      if (alive===0 && !useL4DStore.getState().isGameOver) useL4DStore.setState({ isGameOver:true });
    };

    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  }, []);

  const handleBack = useCallback(()=> useGameStore.getState().setMode("menu"), []);
  const handleRestart = useCallback(()=> {
    useL4DStore.getState().resetCampaign(1);
    directorRef.current?.init();
  }, []);

  const aliveCount = survivors.filter(s=>!s.isDead).length;
  const subtitle = chapterState==="safeRoom" ? "SAFE ROOM — START" : chapterState==="traverse" ? `CHAPTER ${chapter} — TRAVERSE` : `FINALE — ${finaleState.toUpperCase()}`;

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 20, -18], fov: 52 }} shadows>
        <color attach="background" args={["#0a1410"]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 24, 8]} intensity={1.1} castShadow />
        <Physics gravity={[0,-9.81,0]}>
          <L4DCampaignMap />
          <ZombieArcadeController />
          <SurvivorBots />
          <L4DInfectedRenderer />
        </Physics>
        <ZombieShootingSystem />
      </Canvas>

      {/* Top HUD */}
      <div className="absolute top-3 left-3 bg-black/60 border border-white/10 rounded px-3 py-2 text-white font-mono">
        <div className="text-lg font-bold">L4D CAMPAIGN {chapter}/4</div>
        <div className="text-xs opacity-80">{subtitle}</div>
        <div className="text-xs">Director {Math.round(directorIntensity)}% • Panic {Math.round(panicLevel)}% {hordeActive && <span className="text-red-400 animate-pulse">HORDE {Math.ceil(hordeTimer)}s</span>}</div>
        <div className="text-xs">Progress {Math.round(chapterProgress*100)}% START→FINISH</div>
        <div className="text-xs opacity-70">Infected: {infected.filter(i=>!i.isDead).length} • Survivors Alive: {aliveCount}/4</div>
        {chapterState==="finale" && <div className="text-sm text-yellow-300">Finale {finaleState} {finaleTimer>0 ? Math.ceil(finaleTimer)+"s" : ""} {rescueVehicleArrived && "— VEHICLE ARRIVED!"}</div>}
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={handleBack} className="px-4 py-2 bg-slate-800 text-white rounded border border-white/20 hover:bg-slate-700">MENU</button>
        <button onClick={handleRestart} className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600">RESTART</button>
      </div>

      {/* Survivor health */}
      <div className="absolute bottom-3 left-3 flex gap-2">
        {survivors.map(s=>(
          <div key={s.id} className={`px-3 py-2 rounded border text-xs font-mono ${s.isDead? "bg-red-900 border-red-600 text-white/50" : s.isDowned? "bg-yellow-900 border-yellow-600 text-white" : "bg-black/60 border-white/20 text-white"}`}>
            <div className="font-bold">{s.name} {s.id==="survivor_0" && "(YOU)"}</div>
            <div>HP {Math.ceil(s.hp)}/100 {s.hasMedkit && "⊕"} {s.hasPills && "💊"}</div>
            {s.isDowned && <div className="text-yellow-300 animate-pulse">DOWNED — HELP [F]</div>}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 bg-black/60 border border-white/10 rounded px-3 py-2 text-white/70 text-xs font-mono">
        WASD Move • Mouse Aim • Click Shoot • F Help/Heal • Reach FINISH; Hold at Rescue to Escape
      </div>

      {/* Horde flash */}
      {hordeActive && <div className="absolute inset-0 pointer-events-none border-4 border-red-600/40 animate-pulse" />}

      {/* Crescendo hint */}
      {crescendoActive && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-700 text-white px-6 py-3 rounded font-bold animate-bounce">CRESCENDO — HOLD THE LINE!</div>}

      {/* Game Over / Victory */}
      {(isGameOver || isVictory) && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center">
          <div className={`text-5xl font-bold mb-4 ${isVictory? "text-green-400":"text-red-500"}`}>{isVictory? "CAMPAIGN COMPLETE!" : "PARTY WIPED"}</div>
          <div className="text-white/80 mb-6">Chapter {chapter} • Director max {Math.round(directorIntensity)}% • Survivors {aliveCount}/4</div>
          <div className="flex gap-3">
            <button onClick={handleRestart} className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">PLAY AGAIN</button>
            <button onClick={handleBack} className="px-6 py-3 bg-slate-700 text-white rounded hover:bg-slate-600">MENU</button>
          </div>
        </div>
      )}

      {/* Player hit flash */}
      {survivors[0].isDowned && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-900/80 text-white px-8 py-4 rounded font-bold text-xl">DOWNED — Hold [F] (500 pts) or wait for bot</div>
        </div>
      )}
    </div>
  );
}
