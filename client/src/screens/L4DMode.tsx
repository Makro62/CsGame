import { useEffect, useRef, useCallback, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PlayerController } from "../game/player/PlayerController";
import { WeaponModel } from "../game/weapons/WeaponModel";
import { ShootingSystem } from "../game/weapons/ShootingSystem";
import { ReloadSystem } from "../game/weapons/ReloadSystem";
import { TracerManager } from "../game/effects/TracerManager";
import { Crosshair } from "../components/Crosshair";
import { DamageVignette } from "../components/DamageVignette";
import { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
import { useL4DStore } from "../stores/useL4DStore";
import { L4DDirector } from "../game/l4d/L4DDirector";
import { L4DCampaignMap, l4dFinishZ } from "../game/l4d/L4DCampaignMap";
import { useGameStore } from "../stores/useGameStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useWeaponSwitch } from "../hooks/useWeaponSwitch";
import SettingsMenu from "./SettingsMenu";

function L4DInfectedRenderer() {
  const infected = useL4DStore(s => s.infected);
  return (
    <group>
      {infected.filter(i => !i.isDead).map(inf => {
        const isTank = inf.type === "tank", isWitch = inf.type === "witch", isSpecial = inf.type !== "common";
        const col = isTank ? "#7f1d1d" : isWitch ? "#f5f5f5" : inf.type === "hunter" ? "#3b82f6" : inf.type === "smoker" ? "#22c55e" : inf.type === "boomer" ? "#eab308" : "#4a7a2a";
        const s = isTank ? 1.5 : isWitch ? 0.9 : isSpecial ? 0.85 : 0.65;
        const bodyH = isTank ? 0.9 : 0.55;
        return (
          <group key={inf.id} position={[inf.x, inf.y, inf.z]} rotation={[0, inf.rotationY, 0]} userData={{ infectedId: inf.id }}>
            <mesh position={[0, bodyH + 0.35, 0]} castShadow userData={{ infectedId: inf.id, isHead: false }}>
              <capsuleGeometry args={[s * 0.42, bodyH + 0.15, 4, 8]} />
              <meshStandardMaterial color={col} emissive={isSpecial ? col : "#000000"} emissiveIntensity={isSpecial ? 0.25 : 0} roughness={0.7} />
            </mesh>
            <mesh position={[0, bodyH + 0.35 + s * 0.55, 0]} castShadow userData={{ infectedId: inf.id, isHead: true }}>
              <sphereGeometry args={[s * 0.26, 8, 8]} />
              <meshStandardMaterial color={col} roughness={0.6} />
            </mesh>
            <mesh position={[-0.08 * s, bodyH + 0.3 + s * 0.55, 0.16 * s]}>
              <sphereGeometry args={[0.04 * s, 6, 6]} />
              <meshStandardMaterial color="#ff2222" emissive="#ff2222" emissiveIntensity={isTank ? 2.5 : 1.4} />
            </mesh>
            <mesh position={[0.08 * s, bodyH + 0.3 + s * 0.55, 0.16 * s]}>
              <sphereGeometry args={[0.04 * s, 6, 6]} />
              <meshStandardMaterial color="#ff2222" emissive="#ff2222" emissiveIntensity={isTank ? 2.5 : 1.4} />
            </mesh>
            {inf.type === "boomer" && (
              <mesh position={[0, bodyH + 0.15, 0.22 * s]}>
                <sphereGeometry args={[0.28 * s, 8, 8]} />
                <meshStandardMaterial color="#facc15" transparent opacity={0.85} />
              </mesh>
            )}
            {inf.type === "smoker" && inf.grabTarget && (
              <mesh position={[0, 1.2, 0.4]}>
                <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
                <meshStandardMaterial color="#86efac" emissive="#22c55e" emissiveIntensity={0.6} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function SurvivorBots() {
  const survivors = useL4DStore(s => s.survivors);
  return (
    <group>
      {survivors.map((s, idx) => {
        if (idx === 0 || s.isDead) return null;
        return (
          <group key={s.id} position={[s.x, 0, s.z]}>
            <mesh position={[0, 0.7, 0]} castShadow>
              <capsuleGeometry args={[0.28, 0.55, 4, 8]} />
              <meshStandardMaterial color={s.isDowned ? "#dc2626" : "#0ea5e9"} roughness={0.6} />
            </mesh>
            <mesh position={[0, 1.32, 0]} castShadow>
              <sphereGeometry args={[0.2, 8, 8]} />
              <meshStandardMaterial color="#f0c090" roughness={0.5} />
            </mesh>
            <mesh position={[0.28, 0.75, 0.28]} rotation={[0.5, 0, 0]}>
              <capsuleGeometry args={[0.06, 0.32, 4, 6]} />
              <meshStandardMaterial color="#f0c090" />
            </mesh>
            <mesh position={[0.28, 0.7, 0.55]}>
              <boxGeometry args={[0.05, 0.05, 0.32]} />
              <meshStandardMaterial color="#222" metalness={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function L4DSimLoop({ directorRef }: { directorRef: React.MutableRefObject<L4DDirector | null> }) {
  const last = useRef(performance.now());
  const acc = useRef(0);
  const botRevive = useRef(0);
  const playerRevive = useRef(0);

  useFrame(() => {
    const now = performance.now();
    acc.current += Math.min((now - last.current) / 1000, 0.1);
    last.current = now;
    const FIXED = 1 / 60;
    let steps = 0;
    while (acc.current >= FIXED && steps < 4) {
      tick(FIXED, now);
      acc.current -= FIXED;
      steps++;
    }
  });

  const tick = (dt: number, now: number) => {
    const st = useL4DStore.getState();
    if (st.isGameOver || st.isVictory) return;
    const p = st.survivors[0];
    const finishZ = l4dFinishZ(st.chapter);

    for (let i = 1; i < st.survivors.length; i++) {
      const bot = st.survivors[i];
      if (bot.isDead) continue;
      if (bot.isDowned) {
        const nt = bot.downedTimer - dt;
        if (nt <= 0) useL4DStore.getState().updateSurvivor(bot.id, s => ({ ...s, isDead: true, isDowned: false, downedTimer: 0 }));
        else useL4DStore.getState().updateSurvivor(bot.id, s => ({ ...s, downedTimer: nt }));
        continue;
      }
      const helpTarget = p.isDowned ? p : st.survivors.find(s => s.isDowned && !s.isDead && s.id !== bot.id);
      const targetX = helpTarget ? helpTarget.x : p.x + (i % 2 ? 1.6 : -1.6);
      const targetZ = helpTarget ? helpTarget.z : p.z - 1.4 - i * 0.45;
      const dx = targetX - bot.x, dz = targetZ - bot.z, d = Math.hypot(dx, dz);
      if (d > 0.35) {
        useL4DStore.getState().updateSurvivor(bot.id, s => ({
          ...s,
          x: s.x + (dx / d) * 3.2 * dt,
          z: s.z + (dz / d) * 3.2 * dt,
        }));
      }
      if (helpTarget && d < 1.7) {
        botRevive.current += dt;
        if (botRevive.current >= 3.5) {
          botRevive.current = 0;
          useL4DStore.getState().updateSurvivor(helpTarget.id, s => ({
            ...s, isDowned: false, downedTimer: 0, hp: Math.max(40, s.hp), pinnedBy: null, grabbedBy: null,
          }));
        }
      } else {
        botRevive.current = Math.max(0, botRevive.current - dt);
      }

      let nearest = null as typeof st.infected[0] | null;
      let nd = Infinity;
      for (const inf of st.infected) {
        if (inf.isDead) continue;
        const dd = Math.hypot(inf.x - bot.x, inf.z - bot.z);
        if (dd < nd) { nd = dd; nearest = inf; }
      }
      if (nearest && nd < 16 && Math.random() < 0.1) {
        useL4DStore.getState().damageInfected(nearest.id, 20 + Math.random() * 12);
      }
    }

    directorRef.current?.setSurvivorPositions(useL4DStore.getState().survivors.filter(s => !s.isDead).map(s => ({ x: s.x, z: s.z })));
    directorRef.current?.update(dt);

    const survivorsNow = useL4DStore.getState().survivors;
    for (const inf of useL4DStore.getState().infected) {
      if (inf.isDead || !inf.isAttacking) continue;
      if (inf.type === "hunter" && inf.pinTarget) continue;
      for (const sv of survivorsNow) {
        if (sv.isDead || sv.isDowned) continue;
        if (Math.hypot(inf.x - sv.x, inf.z - sv.z) < 1.8 && Math.random() < 0.1) {
          const dmg = inf.type === "tank" ? 28 : inf.type === "witch" ? 40 : inf.type === "hunter" ? 18 : 10;
          useL4DStore.getState().updateSurvivor(sv.id, s => {
            const nhp = Math.max(0, s.hp - dmg);
            if (nhp <= 0) return { ...s, hp: 0, isDowned: false, isDead: true };
            if (nhp < 20) return { ...s, hp: nhp, isDowned: true, downedTimer: 22 };
            return { ...s, hp: nhp };
          });
          if (sv.id === "survivor_0") {
            window.dispatchEvent(new CustomEvent("zombieDamageTaken"));
          }
        }
      }
    }

    const st2 = useL4DStore.getState();
    const player = st2.survivors[0];
    if (player.isDowned && !player.isDead) {
      const nt = player.downedTimer - dt;
      if (nt <= 0) useL4DStore.getState().updateSurvivor(player.id, s => ({ ...s, isDead: true, isDowned: false }));
      else useL4DStore.getState().updateSurvivor(player.id, s => ({ ...s, downedTimer: nt }));
    }

    const prog = Math.max(0, Math.min(1, (player.z + 36) / (finishZ + 36)));
    useL4DStore.setState({ chapterProgress: prog });

    if (st2.chapterState === "safeRoom" && player.z > -28) {
      useL4DStore.setState({ chapterState: "traverse" });
    }
    const finals = st2.survivors.filter(s => !s.isDead);
    const atRescue = finals.filter(s => Math.hypot(s.x, s.z - finishZ) < 8).length;
    if (st2.chapterState === "traverse" && finals.length > 0 && atRescue === finals.length) {
      useL4DStore.setState({ chapterState: "finale", finaleState: "call_rescue", finaleTimer: 4 });
    }
    if (st2.chapterState === "finale") {
      if (st2.finaleState === "call_rescue") {
        const nt = st2.finaleTimer - dt;
        if (nt <= 0) {
          useL4DStore.setState({ finaleState: "holdout", finaleTimer: 40, rescueVehicleArrived: false });
          directorRef.current?.crescendo();
        } else useL4DStore.setState({ finaleTimer: nt });
      } else if (st2.finaleState === "holdout") {
        const nt = st2.finaleTimer - dt;
        if (nt <= 20 && !st2.rescueVehicleArrived) useL4DStore.setState({ rescueVehicleArrived: true });
        if (nt <= 0) useL4DStore.setState({ finaleState: "escape", finaleTimer: 12 });
        else useL4DStore.setState({ finaleTimer: nt });
      } else if (st2.finaleState === "escape") {
        const nt = st2.finaleTimer - dt;
        if (atRescue === finals.length && finals.length > 0) {
          if (st2.chapter < 4) {
            const nextChapter = (st2.chapter + 1) as typeof st2.chapter;
            useL4DStore.getState().resetCampaign(nextChapter);
            directorRef.current?.init();
          } else {
            useL4DStore.setState({ isVictory: true, finaleState: "completed" });
          }
        } else if (nt <= 0) {
          useL4DStore.setState({ isGameOver: true });
        } else {
          useL4DStore.setState({ finaleTimer: nt });
        }
      }
    }
    const alive = useL4DStore.getState().survivors.filter(s => !s.isDead).length;
    if (alive === 0 && !useL4DStore.getState().isGameOver) useL4DStore.setState({ isGameOver: true });
    void now;
    void playerRevive;
  };

  return null;
}

export function L4DMode() {
  const directorRef = useRef<L4DDirector | null>(null);
  const survivors = useL4DStore(s => s.survivors);
  const chapter = useL4DStore(s => s.chapter);
  const chapterState = useL4DStore(s => s.chapterState);
  const finaleState = useL4DStore(s => s.finaleState);
  const finaleTimer = useL4DStore(s => s.finaleTimer);
  const hordeActive = useL4DStore(s => s.hordeActive);
  const hordeTimer = useL4DStore(s => s.hordeTimer);
  const directorIntensity = useL4DStore(s => s.directorIntensity);
  const infected = useL4DStore(s => s.infected);
  const isGameOver = useL4DStore(s => s.isGameOver);
  const isVictory = useL4DStore(s => s.isVictory);
  const crescendoActive = useL4DStore(s => s.crescendoActive);
  const rescueVehicleArrived = useL4DStore(s => s.rescueVehicleArrived);
  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const [session, setSession] = useState(0);
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    directorRef.current = new L4DDirector();
    directorRef.current.init();
    useL4DStore.getState().resetCampaign(chapter);
    useL4DStore.setState({ chapterState: "safeRoom" });
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    ws.syncLoadout({ primary: "ak47", secondary: "glock", knife: "knife" });
    ws.equipWeapon("ak47");
    return () => { directorRef.current = null; };
  }, [chapter]);

  useEffect(() => {
    let holding = false;
    let progress = 0;
    let raf = 0;
    const tick = () => {
      if (!holding) return;
      const st = useL4DStore.getState();
      const me = st.survivors[0];
      const downed = st.survivors.find(s => s.isDowned && !s.isDead && s.id !== "survivor_0");
      if (!downed || me.isDowned || me.isDead) { progress = 0; return; }
      if (Math.hypot(me.x - downed.x, me.z - downed.z) > 2.2) { progress = 0; return; }
      progress += 1 / 60 / 3.2;
      if (progress >= 1) {
        useL4DStore.getState().updateSurvivor(downed.id, s => ({
          ...s, isDowned: false, downedTimer: 0, hp: 40, pinnedBy: null, grabbedBy: null,
        }));
        progress = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || holding) return;
      holding = true; progress = 0; raf = requestAnimationFrame(tick);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "KeyF") return;
      holding = false; cancelAnimationFrame(raf); progress = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleBack = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(false);
    useGameStore.getState().setMode("menu");
  }, []);
  const handleRestart = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
    useL4DStore.getState().resetCampaign(1);
    directorRef.current?.init();
    setSession(s => s + 1);
    const ws = useWeaponStore.getState();
    ws.syncLoadout({ primary: "ak47", secondary: "glock", knife: "knife" });
    ws.equipWeapon("ak47");
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  }, []);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = !!document.pointerLockElement;
      if (!locked && !buyMenuOpen && !isGameOver && !isVictory) setPaused(true);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [buyMenuOpen, isGameOver, isVictory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (buyMenuOpen) { closeBuyMenu(); return; }
        if (paused) resume();
        else if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, buyMenuOpen, closeBuyMenu, resume]);

  const aliveCount = survivors.filter(s => !s.isDead).length;
  const me = survivors[0];
  const bileActive = me && me.bileUntil > Date.now();
  const subtitle = chapterState === "safeRoom" ? "SAFE ROOM" : chapterState === "traverse" ? `CHAPTER ${chapter}` : `FINALE — ${finaleState.toUpperCase()}`;

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas shadows camera={{ fov: 75, position: [0, 1.6, -34] }}>
        <color attach="background" args={["#070c09"]} />
        <fog attach="fog" args={["#070c09", 12, 48]} />
        <ambientLight intensity={0.28} />
        <hemisphereLight args={["#3a4a40", "#0a0c08", 0.35]} />
        <directionalLight position={[6, 14, 4]} intensity={0.5} castShadow />
        <Physics gravity={[0, -9.81, 0]}>
          <L4DCampaignMap />
          <PlayerController key={`${chapter}-${session}`} />
          <SurvivorBots />
          <L4DInfectedRenderer />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
        <L4DSimLoop directorRef={directorRef} />
      </Canvas>

      <div className="absolute top-3 left-3 bg-black/60 border border-white/10 rounded px-3 py-2 text-white font-mono">
        <div className="text-lg font-bold">L4D {chapter}/4</div>
        <div className="text-xs opacity-80">{subtitle}</div>
        <div className="text-xs">Director {Math.round(directorIntensity)}% {hordeActive && <span className="text-red-400 animate-pulse">HORDE {Math.ceil(hordeTimer)}s</span>}</div>
        <div className="text-xs opacity-70">Infected {infected.filter(i => !i.isDead).length} • Alive {aliveCount}/4</div>
        {chapterState === "finale" && <div className="text-sm text-yellow-300">Finale {finaleState} {finaleTimer > 0 ? `${Math.ceil(finaleTimer)}s` : ""} {rescueVehicleArrived && "— RESCUE!"}</div>}
      </div>
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={handleBack} className="px-4 py-2 bg-slate-800 text-white rounded border border-white/20 hover:bg-slate-700">MENU</button>
        <button onClick={handleRestart} className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600">RESTART</button>
      </div>

      <div className="absolute bottom-3 left-3 flex gap-2">
        {survivors.map(s => (
          <div key={s.id} className={`px-3 py-2 rounded border text-xs font-mono ${s.isDead ? "bg-red-900 border-red-600 text-white/50" : s.isDowned ? "bg-yellow-900 border-yellow-600 text-white" : "bg-black/60 border-white/20 text-white"}`}>
            <div className="font-bold">{s.name} {s.id === "survivor_0" && "(YOU)"}</div>
            <div>HP {Math.ceil(s.hp)}/100</div>
            {s.isDowned && <div className="text-yellow-300 animate-pulse">DOWNED {Math.ceil(s.downedTimer)}s</div>}
            {s.grabbedBy && <div className="text-green-300">SMOKER!</div>}
            {s.pinnedBy && <div className="text-blue-300">HUNTER PIN</div>}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 right-3 bg-black/60 border border-white/10 rounded px-3 py-2 text-white font-mono text-right">
        <div className="text-lg">{(activeWeapon ?? "—").toUpperCase()}</div>
        <div className="text-2xl">{currentAmmo} <span className="text-sm opacity-60">/ {reserveAmmo}</span></div>
        <div className="text-white/60 text-xs">WASD • LMB • RMB ADS • R reload • F revive</div>
      </div>

      <Crosshair />
      <DamageVignette />
      {hordeActive && <div className="absolute inset-0 pointer-events-none border-4 border-red-600/35 animate-pulse" />}
      {bileActive && <div className="absolute inset-0 pointer-events-none bg-lime-500/25" />}
      {crescendoActive && <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-red-700 text-white px-6 py-3 rounded font-bold">CRESCENDO — HOLD THE LINE</div>}
      {me?.isDowned && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-950/80 text-white px-8 py-4 rounded font-bold text-xl">INCAPACITATED — wait for a teammate</div>
        </div>
      )}
      {(isGameOver || isVictory) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40">
          <div className={`text-5xl font-bold mb-4 ${isVictory ? "text-green-400" : "text-red-500"}`}>{isVictory ? "CAMPAIGN COMPLETE" : "PARTY WIPED"}</div>
          <div className="flex gap-3">
            <button onClick={handleRestart} className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">PLAY AGAIN</button>
            <button onClick={handleBack} className="px-6 py-3 bg-slate-700 text-white rounded hover:bg-slate-600">MENU</button>
          </div>
        </div>
      )}
      <ClickToPlayOverlay onLock={() => {}} suppressed={buyMenuOpen || isGameOver || isVictory || paused} />
      <SettingsMenu />
      {/* Pause Menu */}
      {paused && !isGameOver && !isVictory && (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 90,
          }}
        >
          <div style={{
            background: "linear-gradient(155deg, rgba(13, 20, 36, 0.96), rgba(8, 12, 22, 0.98))",
            border: "1.5px solid #10b981", borderRadius: 16, padding: "32px 48px", textAlign: "center",
            boxShadow: "0 0 35px rgba(16,185,129,0.3), 0 20px 50px rgba(0,0,0,0.8)", minWidth: 300,
          }}>
            <div style={{ color: "#10b981", fontSize: 11, fontWeight: 900, letterSpacing: 2.5, marginBottom: 8, fontFamily: "monospace" }}>
              PAUSED
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginBottom: 24, fontFamily: "monospace", letterSpacing: "0.08em" }}>
              LEFT 4 DEAD
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={resume}
                style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                RESUME
              </button>
              <button
                onClick={handleRestart}
                style={{ padding: "12px 28px", background: "rgba(234,179,8,0.2)", color: "#facc15", border: "1px solid #eab308", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                RESTART
              </button>
              <button
                onClick={handleBack}
                style={{ padding: "12px 28px", background: "rgba(239,68,68,0.2)", color: "#fecaca", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
