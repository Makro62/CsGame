import { useEffect, useRef, useCallback, useState } from "react";
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
import { DamageIndicator } from "../components/DamageIndicator";
import { DeathScreen } from "../components/DeathScreen";
import SniperScope from "../components/SniperScope";
import { ADSOpticSight } from "../components/ADSOpticSight";
import { FlashEffect } from "../components/FlashEffect";
import { TracerManager } from "../game/effects/TracerManager";
import { CalloutLabels } from "../game/map/CalloutLabels";
import { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
import SettingsMenu from "./SettingsMenu";
import { useWeaponSwitch } from "../hooks/useWeaponSwitch";
import { useGameStore } from "../stores/useGameStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { useOffline5v5Store } from "./Offline5v5Store";
import { TacticalBotModel } from "../game/player/TacticalBotModel";

function RemoteBots() {
  const players = useOffline5v5Store((s) => s.players);
  const bots = Array.from(players.values()).filter((p) => p.id !== "local");
  return (
    <>
      {bots.map((bot) => {
        const moving =
          bot.botState === "patrol" ||
          bot.botState === "retreat" ||
          bot.botState === "engage";
        return (
          <group
            key={bot.id}
            position={[bot.x, 0, bot.z]}
            rotation={[0, bot.rotationY, 0]}
          >
            <TacticalBotModel
              id={bot.id}
              team={bot.team as "T" | "CT"}
              currentWeapon={bot.currentWeapon || (bot.team === "T" ? "ak47" : "m4a1")}
              isDead={bot.isDead}
              isMoving={moving}
              isPlanting={bot.isPlanting}
              isDefusing={bot.isDefusing}
              lastShootTime={bot.botLastShootTime}
              rotationY={bot.rotationY}
            />
          </group>
        );
      })}
    </>
  );
}

function OfflineLoop() {
  const last = useRef(performance.now());
  const acc = useRef(0);
  useFrame(() => {
    const now = performance.now();
    const dt = Math.min((now - last.current) / 1000, 0.1);
    last.current = now;
    acc.current += dt;
    let steps = 0;
    while (acc.current >= 1 / 60 && steps < 4) {
      useOffline5v5Store.getState().tick(1 / 60);
      acc.current -= 1 / 60;
      steps++;
    }
  });
  return null;
}

export function Offline5v5Mode() {
  const { setMode, nickname } = useGameStore();
  const [, setLocation] = useLocation();
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const phase = useOffline5v5Store((s) => s.phase);
  const roundNumber = useOffline5v5Store((s) => s.roundNumber);
  const teamRedScore = useOffline5v5Store((s) => s.teamRedScore);
  const teamBlueScore = useOffline5v5Store((s) => s.teamBlueScore);
  const roundTimeLeft = useOffline5v5Store((s) => s.roundTimeLeft);
  const bombPlanted = useOffline5v5Store((s) => s.bombPlanted);
  const bombTimeLeft = useOffline5v5Store((s) => s.bombTimeLeft);
  const bombSite = useOffline5v5Store((s) => s.bombSite);
  const players = useOffline5v5Store((s) => s.players);
  const initMatch = useOffline5v5Store((s) => s.initMatch);
  const me = useOffline5v5Store((s) => s.players.get("local"));
  const MapComp = getMapById("container_yard").component;
  const inited = useRef(false);
  const [paused, setPaused] = useState(false);

  // Player lists for top header status
  const allPlayers = Array.from(players.values());
  const tPlayers = allPlayers.filter((p) => p.team === "T");
  const ctPlayers = allPlayers.filter((p) => p.team === "CT");

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
    const onPointerLockChange = () => {
      const locked = !!document.pointerLockElement;
      if (!locked && !buyMenuOpen) {
        setPaused(true);
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [buyMenuOpen]);

  const resume = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  }, []);

  const back = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(false);
    useOffline5v5Store.setState({
      phase: "buy",
      roundNumber: 1,
      teamRedScore: 0,
      teamBlueScore: 0,
      bombPlanted: false,
      bombTimeLeft: 0,
      bombSite: "",
      bombDropped: false,
      bombDropX: 0,
      bombDropZ: 0,
      roundTimeLeft: 0,
      killFeed: [],
      players: new Map(),
    });
    setMode("menu");
    setLocation("/");
  }, [setMode, setLocation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (buyMenuOpen) {
          closeBuyMenu();
          return;
        }
        if (paused) {
          resume();
        } else {
          if (document.pointerLockElement) document.exitPointerLock();
        }
        return;
      }
      if (e.code !== "KeyE") return;
      if (paused) return;
      const s = useOffline5v5Store.getState();
      const me = s.players.get("local");
      if (!me || me.isDead) return;
      if (me.team === "T" && me.hasBomb && !s.bombPlanted) s.localPlantStart("");
      else if (me.team === "CT" && s.bombPlanted) s.localDefuseStart();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "KeyE" || paused) return;
      const s = useOffline5v5Store.getState();
      s.localPlantCancel();
      s.localDefuseCancel();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [paused, buyMenuOpen, closeBuyMenu, resume]);

  const rematch = useCallback(() => {
    useOffline5v5Store.getState().initMatch(nickname || "Player", "T");
  }, [nickname]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#0a0e14" }}>
      <Canvas shadows camera={{ fov: 75, position: [0, 5, -22] }}>
        <color attach="background" args={["#0e1520"]} />
        <fog attach="fog" args={["#0e1520", 30, 90]} />
        <ambientLight intensity={0.55} color="#9ab" />
        <directionalLight castShadow position={[12, 18, 10]} intensity={1.2} color="#fff" />
        <Physics gravity={[0, -9.81, 0]}>
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

      {/* ── 5v5 Tactical Match Top Header ── */}
      <div
        style={{
          position: "fixed",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(8,12,22,0.92))",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          padding: "6px 20px",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          display: "flex",
          gap: 20,
          alignItems: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          userSelect: "none",
        }}
      >
        {/* T Side Team Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#ef4444", fontWeight: 900, fontSize: 16 }}>TERRORIST</span>
          <span style={{ color: "#f87171", fontWeight: 900, fontSize: 22, minWidth: 24, textAlign: "center" }}>
            {teamRedScore}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {tPlayers.map((tp, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 16,
                  borderRadius: 2,
                  background: tp.isDead ? "rgba(239,68,68,0.2)" : "#ef4444",
                  border: `1px solid ${tp.isDead ? "rgba(239,68,68,0.4)" : "#f87171"}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Center Round Timer & Bomb Indicator */}
        <div style={{ textAlign: "center", minWidth: 100, borderLeft: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)", padding: "0 14px" }}>
          {bombPlanted ? (
            <div style={{ color: "#facc15", fontWeight: 900, fontSize: 14, animation: "pulseBtnGlow 1s infinite" }}>
              💣 {bombSite ? `SITE ${bombSite}` : "BOMB"} ({Math.ceil(bombTimeLeft)}s)
            </div>
          ) : (
            <div style={{ color: "#38bdf8", fontWeight: 900, fontSize: 18 }}>
              {Math.floor(roundTimeLeft / 60)}:{(Math.floor(roundTimeLeft % 60)).toString().padStart(2, "0")}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            ROUND {roundNumber} • {phase === "buy" ? "BUY TIME" : phase}
          </div>
        </div>

        {/* CT Side Team Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {ctPlayers.map((cp, idx) => (
              <div
                key={idx}
                style={{
                  width: 8,
                  height: 16,
                  borderRadius: 2,
                  background: cp.isDead ? "rgba(59,130,246,0.2)" : "#3b82f6",
                  border: `1px solid ${cp.isDead ? "rgba(59,130,246,0.4)" : "#60a5fa"}`,
                }}
              />
            ))}
          </div>
          <span style={{ color: "#60a5fa", fontWeight: 900, fontSize: 22, minWidth: 24, textAlign: "center" }}>
            {teamBlueScore}
          </span>
          <span style={{ color: "#3b82f6", fontWeight: 900, fontSize: 16 }}>COUNTER-T</span>
        </div>

        <button
          onClick={back}
          style={{
            marginLeft: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid #ef4444",
            color: "#fecaca",
            borderRadius: 6,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          MENU [ESC]
        </button>
      </div>

      <Crosshair />

      {/* ── Offline HUD — HP, Armor, Money, Ammo, Weapon, Bomb ── */}
      {me && !me.isDead && phase !== "matchEnd" && (
        <>
          {/* Bottom-left: HP + Armor */}
          <div
            style={{
              position: "fixed",
              bottom: 16,
              left: 16,
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "10px 18px",
              color: "#fff",
              fontFamily: "'Rajdhani', monospace",
              minWidth: 150,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  color: me.hp > 60 ? "#4ade80" : me.hp > 25 ? "#facc15" : "#ef4444",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {Math.ceil(me.hp)}
              </span>
              <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>HP</span>
            </div>
            {me.armor > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#60a5fa", fontSize: 15, fontWeight: 800 }}>{me.armor}</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{me.hasHelmet ? "Kevlar + Helmet" : "Kevlar"}</span>
              </div>
            )}
          </div>

          {/* Bottom-right: Ammo + Weapon */}
          <div
            style={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "10px 18px",
              color: "#fff",
              fontFamily: "'Rajdhani', monospace",
              textAlign: "right",
              minWidth: 150,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ color: "#38bdf8", fontSize: 13, fontWeight: 900, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>
              {me.currentWeapon}
            </div>
            <div>
              <span style={{ color: "#facc15", fontSize: 24, fontWeight: 900 }}>{me.ammo}</span>{" "}
              <span style={{ color: "#94a3b8", fontSize: 14 }}>/ {me.reserveAmmo}</span>
            </div>
          </div>

          {/* Bottom-center: Money */}
          <div
            style={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(74,222,128,0.4)",
              borderRadius: 10,
              padding: "6px 16px",
              color: "#4ade80",
              fontFamily: "'Rajdhani', monospace",
              fontSize: 16,
              fontWeight: 900,
              boxShadow: "0 0 16px rgba(74,222,128,0.2)",
            }}
          >
            ${me.money}
          </div>

          {/* Bomb indicator */}
          {me.hasBomb && me.team === "T" && (
            <div
              style={{
                position: "fixed",
                bottom: 56,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 40,
                background: "rgba(234,179,8,0.25)",
                border: "1.5px solid #eab308",
                borderRadius: 8,
                padding: "6px 16px",
                color: "#facc15",
                fontFamily: "'Rajdhani', monospace",
                fontSize: 13,
                fontWeight: 900,
                boxShadow: "0 0 16px rgba(234,179,8,0.4)",
              }}
            >
              💣 C4 BOMB [E to Plant at Site]
            </div>
          )}

          {me.isPlanting && (
            <div
              style={{
                position: "fixed",
                top: "40%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 50,
                background: "rgba(15,23,42,0.95)",
                border: "2px solid #eab308",
                borderRadius: 14,
                padding: "16px 32px",
                color: "#facc15",
                fontFamily: "'Rajdhani', monospace",
                fontSize: 18,
                fontWeight: 900,
                textAlign: "center",
                boxShadow: "0 0 30px rgba(234,179,8,0.5)",
              }}
            >
              PLANTING C4 BOMB... TAHAN [E]
            </div>
          )}

          {me.isDefusing && (
            <div
              style={{
                position: "fixed",
                top: "40%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                zIndex: 50,
                background: "rgba(15,23,42,0.95)",
                border: "2px solid #60a5fa",
                borderRadius: 14,
                padding: "16px 32px",
                color: "#93c5fd",
                fontFamily: "'Rajdhani', monospace",
                fontSize: 18,
                fontWeight: 900,
                textAlign: "center",
                boxShadow: "0 0 30px rgba(96,165,250,0.5)",
              }}
            >
              DEFUSING BOMB... TAHAN [E]
            </div>
          )}
        </>
      )}

      <SniperScope />
      <ADSOpticSight />
      <HitMarker />
      <DamageVignette />
      <DamageIndicator />
      <DeathScreen />
      <FlashEffect />

      {buyMenuOpen && phase === "buy" && <BuyMenu onClose={closeBuyMenu} />}
      <SettingsMenu />

      {/* Pause Menu — shown when pointer lock exits */}
      {paused && phase !== "matchEnd" && (
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
              border: "1.5px solid #f59e0b",
              borderRadius: 16,
              padding: "32px 48px",
              textAlign: "center",
              boxShadow: "0 0 35px rgba(245,158,11,0.3), 0 20px 50px rgba(0,0,0,0.8)",
              minWidth: 300,
            }}
          >
            <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 900, letterSpacing: 2.5, marginBottom: 8, fontFamily: "monospace" }}>
              PAUSED
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f8fafc", marginBottom: 24, fontFamily: "monospace", letterSpacing: "0.08em" }}>
              5V5 OFFLINE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={resume}
                style={{ padding: "12px 28px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                RESUME
              </button>
              <button
                onClick={rematch}
                style={{ padding: "12px 28px", background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid #22c55e", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                REMATCH
              </button>
              <button
                onClick={back}
                style={{ padding: "12px 28px", background: "rgba(239,68,68,0.2)", color: "#fecaca", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-to-play overlay — only show when NOT paused */}
      {!paused && <ClickToPlayOverlay onLock={() => {}} suppressed={buyMenuOpen} />}

      {/* Match Over Modal */}
      {phase === "matchEnd" && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", zIndex: 80 }}>
          <div style={{ background: "rgba(15,23,42,0.95)", border: "1.5px solid #3b82f6", borderRadius: 16, padding: "36px 48px", textAlign: "center", boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}>
            <h1 style={{ color: "#fff", fontSize: 26, marginBottom: 8, fontFamily: "'Rajdhani', monospace", fontWeight: 900 }}>
              MATCH OVER — {teamRedScore} : {teamBlueScore}
            </h1>
            <p style={{ color: teamRedScore > teamBlueScore ? "#f87171" : "#60a5fa", marginBottom: 20, fontSize: 18, fontWeight: 800 }}>
              {teamRedScore > teamBlueScore ? "TERRORISTS WIN THE MATCH" : "COUNTER-TERRORISTS WIN THE MATCH"}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={rematch} style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 900 }}>
                REMATCH
              </button>
              <button onClick={back} style={{ padding: "10px 24px", background: "rgba(239,68,68,0.2)", color: "#fecaca", border: "1px solid #ef4444", borderRadius: 8, cursor: "pointer", fontWeight: 900 }}>
                MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Offline5v5Mode;
