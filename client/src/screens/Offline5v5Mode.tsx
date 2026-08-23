// Clean offline 5v5 — fixed dark screen
import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { getMapById } from "../game/map/MapRegistry";
import { PlayerController } from "../game/player/PlayerController";
import { WeaponModel } from "../game/weapons/WeaponModel";
import { ShootingSystem } from "../game/weapons/ShootingSystem";
import { ReloadSystem } from "../game/weapons/ReloadSystem";
import { GrenadeSystem } from "../game/weapons/GrenadeSystem";
import { Crosshair } from "../components/Crosshair";
import { HitMarker } from "../components/HitMarker";
import { BuyMenu } from "../components/BuyMenu";
import { DamageVignette } from "../components/DamageVignette";
import { DeathScreen } from "../components/DeathScreen";
import SniperScope from "../components/SniperScope";
import { FlashEffect } from "../components/FlashEffect";
import { TracerManager } from "../game/effects/TracerManager";
import { CalloutLabels } from "../game/map/CalloutLabels";
import { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
import SettingsMenu from "./SettingsMenu";
import { useWeaponSwitch } from "../hooks/useWeaponSwitch";
import { useGameStore } from "../stores/useGameStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useOffline5v5Store } from "./Offline5v5Store";
import { MinecraftCharacter } from "../game/player/MinecraftCharacter";

function RemoteBots() {
  const players = useOffline5v5Store(s => s.players);
  const bots = Array.from(players.values()).filter(p => p.id !== "local");
  return (
    <>
      {bots.map(bot => (
        <group key={bot.id} position={[bot.x, 0, bot.z]} rotation={[0, bot.rotationY, 0]}>
          <MinecraftCharacter team={bot.team as "T"|"CT"} isDead={bot.isDead} holdWeapon />
        </group>
      ))}
    </>
  );
}

function OfflineLoop() {
  const last = useRef(performance.now());
  const acc = useRef(0);
  useFrame(() => {
    const now = performance.now();
    const dt = Math.min((now - last.current)/1000, 0.1);
    last.current = now;
    acc.current += dt;
    let steps = 0;
    while (acc.current >= 1/60 && steps < 4) {
      useOffline5v5Store.getState().tick(1/60);
      acc.current -= 1/60;
      steps++;
    }
  });
  return null;
}

export function Offline5v5Mode() {
  const { setMode, nickname } = useGameStore();
  const [, setLocation] = useLocation();
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const phase = useOffline5v5Store(s => s.phase);
  const roundNumber = useOffline5v5Store(s => s.roundNumber);
  const teamRedScore = useOffline5v5Store(s => s.teamRedScore);
  const teamBlueScore = useOffline5v5Store(s => s.teamBlueScore);
  const initMatch = useOffline5v5Store(s => s.initMatch);
  const MapComp = getMapById("container_yard").component;
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    useGameStore.getState().setMode("offline5v5");
    useGameStore.getState().setCurrentMap("container_yard");
    initMatch(nickname || "Player", "T");
    const me = useOffline5v5Store.getState().players.get("local");
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    if (me) {
      ws.syncLoadout({ primary: me.primaryWeapon, secondary: me.secondaryWeapon, knife: me.knifeSlot });
      if (me.currentWeapon) ws.equipWeapon(me.currentWeapon as never);
    }
  }, [initMatch, nickname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const s = useOffline5v5Store.getState();
      const me = s.players.get("local");
      if (!me || me.isDead) return;
      if (me.team === "T" && me.hasBomb && !s.bombPlanted) s.localPlantStart("");
      else if (me.team === "CT" && s.bombPlanted) s.localDefuseStart();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const s = useOffline5v5Store.getState();
      s.localPlantCancel(); s.localDefuseCancel();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); };
  }, []);

  const back = useCallback(() => { setMode("menu"); setLocation("/"); }, [setMode, setLocation]);
  const rematch = useCallback(() => { useOffline5v5Store.getState().initMatch(nickname || "Player", "T"); }, [nickname]);

  return (
    <div style={{ width:"100vw", height:"100vh", position:"relative", overflow:"hidden", background:"#0a0e14" }}>
      <Canvas shadows camera={{ fov: 75, position: [0,5,-22] }}>
        <color attach="background" args={["#0e1520"]} />
        <fog attach="fog" args={["#0e1520", 30, 90]} />
        <ambientLight intensity={0.55} color="#9ab" />
        <directionalLight castShadow position={[12,18,10]} intensity={1.2} color="#fff" />
        <Physics gravity={[0,-9.81,0]}>
          <MapComp />
          <PlayerController />
          <RemoteBots />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <GrenadeSystem />
        <TracerManager />
        <CalloutLabels />
        <OfflineLoop />
      </Canvas>

      {/* Offline HUD top */}
      <div style={{ position:"fixed", top:14, left:"50%", transform:"translateX(-50%)", zIndex:40, background:"rgba(15,23,42,0.9)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 18px", color:"#fff", fontFamily:"monospace", fontSize:12, display:"flex", gap:16, alignItems:"center" }}>
        <span style={{ color:"#f87171" }}>T {teamRedScore}</span>
        <span style={{ color:"#94a3b8" }}>Round {roundNumber} • {phase}</span>
        <span style={{ color:"#60a5fa" }}>{teamBlueScore} CT</span>
        <button onClick={back} style={{ marginLeft:12, background:"rgba(239,68,68,0.2)", border:"1px solid #ef4444", color:"#fecaca", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>MENU [ESC]</button>
      </div>

      <Crosshair />
      <SniperScope />
      <HitMarker />
      <DamageVignette />
      <DeathScreen />
      <FlashEffect />
      {buyMenuOpen && phase==="buy" && <BuyMenu onClose={closeBuyMenu} />}
      <ClickToPlayOverlay onLock={()=>{}} suppressed={buyMenuOpen} />
      <SettingsMenu />
      {phase==="matchEnd" && (
        <div style={{ position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", zIndex:80 }}>
          <div style={{ background:"rgba(15,23,42,0.95)", border:"1px solid #3b82f6", borderRadius:16, padding:"36px 48px", textAlign:"center" }}>
            <h1 style={{ color:"#fff", fontSize:26, marginBottom:8 }}>MATCH OVER — {teamRedScore} : {teamBlueScore}</h1>
            <p style={{ color: teamRedScore>teamBlueScore ? "#f87171" : "#60a5fa", marginBottom:20 }}>{teamRedScore>teamBlueScore ? "TERRORISTS WIN" : "CT WIN"}</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button onClick={rematch} style={{ padding:"10px 22px", background:"#2563eb", color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>REMATCH</button>
              <button onClick={back} style={{ padding:"10px 22px", background:"rgba(239,68,68,0.2)", color:"#fecaca", border:"1px solid #ef4444", borderRadius:8, cursor:"pointer" }}>MENU</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
