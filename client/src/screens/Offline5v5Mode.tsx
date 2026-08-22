import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { getMapById } from "../game/map/MapRegistry";
import { PlayerController } from "../game/player/PlayerController";
import { RemotePlayers } from "../game/player/RemotePlayers";
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
import { useNetworkStore } from "../stores/useNetworkStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useOffline5v5Store } from "./Offline5v5Store";

function OfflineGameLoop() {
  const lastTime = useRef(performance.now());
  const lastSyncTime = useRef(0);
  const cachedRemotePlayers = useRef(new Map<string, {
    x: number; y: number; z: number; rotationY: number;
    nickname: string; team: string; hp: number; isDead: boolean;
    currentWeapon: string; hasBomb: boolean; kills: number; deaths: number;
    isSprinting: boolean; isCrouching: boolean;
  }>());

  useFrame(() => {
    const now = performance.now();
    const dt = Math.min((now - lastTime.current) / 1000, 0.1);
    lastTime.current = now;
    const store = useOffline5v5Store.getState();
    store.tick(dt);

    // Throttle network store update to ~20 Hz (50ms) to reduce React render pressure
    if (now - lastSyncTime.current < 50) return;
    lastSyncTime.current = now;

    const me = store.players.get("local");
    if (me) {
      const remoteMap = cachedRemotePlayers.current;
      remoteMap.clear();
      store.players.forEach((p, id) => {
        if (id !== "local") {
          remoteMap.set(id, {
            x: p.x,
            y: p.y,
            z: p.z,
            rotationY: p.rotationY,
            nickname: p.nickname,
            team: p.team,
            hp: p.hp,
            isDead: p.isDead,
            currentWeapon: p.currentWeapon,
            hasBomb: p.hasBomb,
            kills: p.kills,
            deaths: p.deaths,
            isSprinting: false,
            isCrouching: false,
          });
        }
      });

      useNetworkStore.setState({
        remotePlayers: new Map(remoteMap),
        localHp: me.hp,
        localIsDead: me.isDead,
        localMoney: me.money,
        localTeam: me.team,
        localWeapon: me.currentWeapon,
        localPrimaryWeapon: me.primaryWeapon,
        localSecondaryWeapon: me.secondaryWeapon,
        localKnifeSlot: me.knifeSlot,
        localAmmo: me.ammo,
        localReserveAmmo: me.reserveAmmo,
        localArmor: me.armor,
        localHelmet: me.hasHelmet,
        localGrenadeHE: me.grenadeHE,
        localGrenadeSmoke: me.grenadeSmoke,
        localGrenadeFlash: me.grenadeFlash,
        localHasBomb: me.hasBomb,
        localKills: me.kills,
        localDeaths: me.deaths,
        localX: me.x,
        localZ: me.z,
        localRotationY: me.rotationY,
        sessionId: "local",
        connected: true,
        round: {
          phase: store.phase,
          roundTimeLeft: store.roundTimeLeft,
          buyPhaseTimeLeft: store.buyPhaseTimeLeft,
          roundNumber: store.roundNumber,
          teamRedScore: store.teamRedScore,
          teamBlueScore: store.teamBlueScore,
          bombPlanted: store.bombPlanted,
          bombTimeLeft: store.bombTimeLeft,
          bombSite: store.bombSite,
          isHalfTime: store.isHalfTime,
          isOvertime: false,
          isSuddenDeath: false,
          readyCount: 0,
          maxRounds: store.maxRounds,
          gameMode: "bomb_defusal",
          kothCapturingTeam: "",
          kothCaptureProgress: 0,
          kothScoreT: 0,
          kothScoreCT: 0,
        },
      });
    }
  });

  return null;
}

function OfflineTopNav({ onBack }: { onBack: () => void }) {
  const round = useNetworkStore((s) => s.round);
  const scoreT = useOffline5v5Store((s) => s.teamRedScore);
  const scoreCT = useOffline5v5Store((s) => s.teamBlueScore);

  return (
    <header style={{
      position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 400,
      display: "flex", alignItems: "center", gap: 16, padding: "8px 20px",
      background: "rgba(10,16,32,0.88)", border: "1px solid rgba(59,130,246,0.3)",
      borderRadius: 12, backdropFilter: "blur(10px)", fontFamily: "monospace",
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#f87171", letterSpacing: 1 }}>T</span>
      <span style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc" }}>{scoreT}</span>
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 14 }}>-</span>
      <span style={{ fontSize: 18, fontWeight: 900, color: "#f8fafc" }}>{scoreCT}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#60a5fa", letterSpacing: 1 }}>CT</span>
      <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 4px" }}>|</span>
      <span style={{
        fontSize: 10, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 6,
        background: round.phase === "buy" ? "rgba(250,204,21,0.2)" : "rgba(34,197,94,0.2)",
        color: round.phase === "buy" ? "#facc15" : "#4ade80",
        border: `1px solid ${round.phase === "buy" ? "rgba(250,204,21,0.4)" : "rgba(34,197,94,0.4)"}`,
      }}>
        {round.phase === "buy" ? `BUY ${Math.ceil(round.buyPhaseTimeLeft)}s` :
         round.phase === "active" ? `R${round.roundNumber} ${Math.ceil(round.roundTimeLeft)}s` :
         round.phase === "roundEnd" ? "ROUND END" :
         round.phase === "matchEnd" ? "MATCH END" : round.phase.toUpperCase()}
      </span>
      <button onClick={onBack} style={{
        padding: "5px 12px", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
        borderRadius: 6, color: "#f87171", fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
        cursor: "pointer", fontFamily: "monospace",
      }}>
        &#8592; MENU
      </button>
    </header>
  );
}

function MatchEndOverlay({ onBack, onRematch }: { onBack: () => void; onRematch: () => void }) {
  const s = useOffline5v5Store();
  const tWin = s.teamRedScore > s.teamBlueScore;
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.8)", zIndex: 500,
    }}>
      <div style={{
        background: "rgba(15,23,42,0.95)", border: "1px solid rgba(59,130,246,0.4)",
        borderRadius: 16, padding: "40px 60px", textAlign: "center", fontFamily: "monospace",
      }}>
        <h1 style={{ fontSize: 28, color: "#f8fafc", marginBottom: 8 }}>MATCH OVER</h1>
        <p style={{ fontSize: 24, fontWeight: 900, color: "#60a5fa" }}>
          {s.teamRedScore} - {s.teamBlueScore}
        </p>
        <p style={{ fontSize: 14, color: tWin ? "#f87171" : "#60a5fa", margin: "8px 0 24px" }}>
          {tWin ? "TERRORISTS WIN" : "COUNTER-TERRORISTS WIN"}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onRematch} style={{
            padding: "12px 28px", fontSize: 13, fontWeight: 800, letterSpacing: 1,
            borderRadius: 10, cursor: "pointer", fontFamily: "monospace",
            color: "white", border: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          }}>REMATCH</button>
          <button onClick={onBack} style={{
            padding: "12px 28px", fontSize: 13, fontWeight: 800, letterSpacing: 1,
            borderRadius: 10, cursor: "pointer", fontFamily: "monospace",
            color: "#f87171", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
          }}>MENU</button>
        </div>
      </div>
    </div>
  );
}

export function Offline5v5Mode() {
  const { setMode, nickname, currentMap } = useGameStore();
  const [, setLocation] = useLocation();
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const round = useNetworkStore((s) => s.round);
  const initMatch = useOffline5v5Store((s) => s.initMatch);
  const MapComponent = getMapById(currentMap).component;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    useGameStore.getState().setMode("offline5v5");

    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    ws.syncLoadout({ primary: "ak47", secondary: "deagle", knife: "knife" });
    ws.equipWeapon("deagle");

    initMatch(nickname || "Player", "T");
  }, [initMatch, nickname]);

  const handleBack = useCallback(() => {
    useNetworkStore.getState().disconnect();
    setMode("menu");
    setLocation("/");
  }, [setMode, setLocation]);

  const handleRematch = useCallback(() => {
    useOffline5v5Store.getState().initMatch(nickname || "Player", "T");
  }, [nickname]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
      <Canvas shadows camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 10, 10]} intensity={1.5} />
        <Physics gravity={[0, -9.81, 0]}>
          <MapComponent />
          <PlayerController />
          <RemotePlayers />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <GrenadeSystem />
        <TracerManager />
        <CalloutLabels />
        <OfflineGameLoop />
      </Canvas>
      <Crosshair />
      <SniperScope />
      <HitMarker />
      <DamageVignette />
      <DeathScreen />
      <FlashEffect />
      <OfflineTopNav onBack={handleBack} />
      {buyMenuOpen && round.phase === "buy" && <BuyMenu onClose={closeBuyMenu} />}
      <ClickToPlayOverlay onLock={() => {}} />
      <SettingsMenu />
      {round.phase === "matchEnd" && (
        <MatchEndOverlay onBack={handleBack} onRematch={handleRematch} />
      )}
    </div>
  );
}

export default Offline5v5Mode;
