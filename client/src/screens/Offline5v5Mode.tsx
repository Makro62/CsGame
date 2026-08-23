import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { getMapById } from "../game/map/MapRegistry";
import { HUDLayout } from "../ui/components/hud/HUDLayout";
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
        connected: false,
        killFeed: store.killFeed.map((k, i) => ({
          killerId: `k${i}`,
          killerName: k.killerName,
          victimId: `v${i}`,
          victimName: k.victimName,
          weapon: k.weapon,
          headshot: k.headshot,
          timestamp: k.timestamp,
        })),
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
  const { setMode, nickname } = useGameStore();
  const [, setLocation] = useLocation();
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const round = useNetworkStore((s) => s.round);
  const initMatch = useOffline5v5Store((s) => s.initMatch);
  const MapComponent = getMapById("container_yard").component;
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    useGameStore.getState().setMode("offline5v5");
    useGameStore.getState().setCurrentMap("container_yard");

    initMatch(nickname || "Player", "T");
    const me = useOffline5v5Store.getState().players.get("local");
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    if (me) {
      ws.syncLoadout({
        primary: me.primaryWeapon,
        secondary: me.secondaryWeapon,
        knife: me.knifeSlot,
      });
      ws.equipWeapon(me.currentWeapon as never);
    }
  }, [initMatch, nickname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const store = useOffline5v5Store.getState();
      const me = store.players.get("local");
      if (!me || me.isDead) return;
      if (me.team === "T" && me.hasBomb && !store.bombPlanted) {
        store.localPlantStart("");
      } else if (me.team === "CT" && store.bombPlanted) {
        store.localDefuseStart();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      const store = useOffline5v5Store.getState();
      store.localPlantCancel();
      store.localDefuseCancel();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

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
      <HUDLayout />
      <Crosshair />
      <SniperScope />
      <HitMarker />
      <DamageVignette />
      <DeathScreen />
      <FlashEffect />
      {buyMenuOpen && round.phase === "buy" && <BuyMenu onClose={closeBuyMenu} />}
      <ClickToPlayOverlay onLock={() => {}} suppressed={buyMenuOpen} />
      <SettingsMenu />
      {round.phase === "matchEnd" && (
        <MatchEndOverlay onBack={handleBack} onRematch={handleRematch} />
      )}
    </div>
  );
}
