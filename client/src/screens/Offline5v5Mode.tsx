import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useOffline5v5Store } from "./Offline5v5Store";
import { Offline5v5Select } from "./Offline5v5Select";
import {
  getMapById,
  ensureProcedural5v5,
  PROCEDURAL_5V5_ID,
  PlayerController,
  WeaponModel,
  TacticalBotModel,
  ShootingSystem,
  ReloadSystem,
  GrenadeSystem,
  Crosshair,
  BuyMenu,
  DamageVignette,
  DeathScreen,
  SniperScope,
  ADSOpticSight,
  FlashEffect,
  TracerManager,
  ClickToPlayOverlay,
  useWeaponSwitch,
  useGameStore,
  useWeaponStore,
  distToBombSite,
  nearestBombSite,
  resolveBombSites,
  CalloutLabels,
  getAgent,
  PauseMenu,
  InGameChrome,
  GameModal,
  ModalBody,
  ModalHeader,
  OverlayButton,
  HUD_Z,
} from "../game/offline/offline5v5Kit";

function RemoteBots() {
  const players = useOffline5v5Store((s) => s.players);
  const bots = Array.from(players.values()).filter((p) => p.id !== "local");

  // Assign agent colors to bots based on team
  const getBotColors = (team: string, id: string) => {
    const tColors = [
      { shirt: "#5a1e1e", vest: "#3f1515", pants: "#3f3b32", helmet: "#3f1515", accent: "#ef4444" },
      { shirt: "#4a3a1e", vest: "#3d2e15", pants: "#3f3b32", helmet: "#3d2e15", accent: "#f97316" },
      { shirt: "#2d1e4a", vest: "#231538", pants: "#3f3b32", helmet: "#231538", accent: "#a855f7" },
      { shirt: "#1e3a4a", vest: "#152d38", pants: "#3f3b32", helmet: "#152d38", accent: "#22d3ee" },
      { shirt: "#4a1e3a", vest: "#38152d", pants: "#3f3b32", helmet: "#38152d", accent: "#ec4899" },
    ];
    const ctColors = [
      { shirt: "#1e3a5f", vest: "#0f172a", pants: "#1e293b", helmet: "#111827", accent: "#3b82f6" },
      { shirt: "#1e293b", vest: "#1e293b", pants: "#1e293b", helmet: "#1e293b", accent: "#60a5fa" },
      { shirt: "#1e3a3a", vest: "#134e4a", pants: "#1e293b", helmet: "#134e4a", accent: "#22d3ee" },
      { shirt: "#3a3a1e", vest: "#3f3d15", pants: "#1e293b", helmet: "#3f3d15", accent: "#facc15" },
      { shirt: "#1a1a2e", vest: "#111827", pants: "#1e293b", helmet: "#111827", accent: "#818cf8" },
    ];
    const idx = parseInt(id.replace(/\D/g, "")) % 5;
    return team === "T" ? tColors[idx] : ctColors[idx];
  };

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
              agentColors={getBotColors(bot.team, bot.id)}
            />
          </group>
        );
      })}
    </>
  );
}

function OfflineLoop({ paused }: { paused: boolean }) {
  const last = useRef(performance.now());
  const acc = useRef(0);
  useFrame(() => {
    if (paused) return;
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
  const phase = useOffline5v5Store((s) => s.phase);
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch({ buyMenu: phase === "buy" });
  const roundNumber = useOffline5v5Store((s) => s.roundNumber);
  const teamRedScore = useOffline5v5Store((s) => s.teamRedScore);
  const teamBlueScore = useOffline5v5Store((s) => s.teamBlueScore);
  const roundTimeLeft = useOffline5v5Store((s) => s.roundTimeLeft);
  const buyPhaseTimeLeft = useOffline5v5Store((s) => s.buyPhaseTimeLeft);
  const bombPlanted = useOffline5v5Store((s) => s.bombPlanted);
  const bombTimeLeft = useOffline5v5Store((s) => s.bombTimeLeft);
  const bombSite = useOffline5v5Store((s) => s.bombSite);
  const players = useOffline5v5Store((s) => s.players);
  const initMatch = useOffline5v5Store((s) => s.initMatch);
  const me = useOffline5v5Store((s) => s.players.get("local"));
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<"T" | "CT" | null>(null);
  const [showSelection, setShowSelection] = useState(true);
  const MapComp = selectedMapId ? getMapById(selectedMapId).component : null;
  const [paused, setPaused] = useState(false);

  const handleFullSelect = useCallback((team: "T" | "CT", mapId: string, agentId: string) => {
    if (mapId === PROCEDURAL_5V5_ID) ensureProcedural5v5();
    useGameStore.getState().setMode("offline5v5");
    useGameStore.getState().setCurrentMap(mapId);
    initMatch(nickname || "Player", team, "medium", mapId);
    const agentDef = getAgent(agentId);
    useOffline5v5Store.setState((s) => {
      const local = s.players.get("local");
      if (!local) return {};
      const updated = new Map(s.players);
      updated.set("local", { ...local, nickname: agentDef.name });
      return { players: updated };
    });
    const me = useOffline5v5Store.getState().players.get("local");
    const ws = useWeaponStore.getState();
    ws.setInfiniteAmmo(false);
    if (me) {
      ws.syncLoadout({ primary: me.primaryWeapon, secondary: me.secondaryWeapon, knife: me.knifeSlot });
      if (me.currentWeapon) ws.equipWeapon(me.currentWeapon as never);
    }
    setSelectedTeam(team);
    setSelectedMapId(mapId);
    setShowSelection(false);
  }, [initMatch, nickname]);

  // Player lists for top header status
  const allPlayers = Array.from(players.values());
  const tPlayers = allPlayers.filter((p) => p.team === "T");
  const ctPlayers = allPlayers.filter((p) => p.team === "CT");

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

  useEffect(() => {
    if (phase !== "buy" && buyMenuOpen) {
      closeBuyMenu();
    }
  }, [phase, buyMenuOpen, closeBuyMenu]);

  const resume = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  }, []);

  const back = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(false);
    setSelectedMapId(null);
    setSelectedTeam(null);
    setShowSelection(true);
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

  const openPause = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(true);
  }, []);

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
    setSelectedMapId(null);
    setSelectedTeam(null);
    setShowSelection(true);
  }, []);

  if (showSelection || !selectedMapId || !MapComp) {
    return (
      <Offline5v5Select
        onSelect={handleFullSelect}
        onBack={() => {
          setMode("menu");
          setLocation("/");
        }}
      />
    );
  }

  const ActiveMap = MapComp;

  return (
    <div style={{ width: "100dvw", height: "100dvh", position: "relative", overflow: "hidden", background: "#0a0e14" }}>
      <Canvas shadows camera={{ fov: 75, position: [0, 5, -22] }}>
        <color attach="background" args={["#0e1520"]} />
        <fog attach="fog" args={["#0e1520", 48, 110]} />
        <Physics gravity={[0, -9.81, 0]}>
          <ActiveMap />
          <PlayerController key={`${selectedTeam}-${selectedMapId}-${roundNumber}`} />
          <RemoteBots />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <GrenadeSystem />
        <TracerManager />
        <CalloutLabels mapId={selectedMapId} />
        <OfflineLoop paused={paused} />
      </Canvas>

      {/* ── 5v5 Tactical Match Top Header ── */}
      <div
        style={{
          position: "fixed",
          top: "clamp(8px, 2vw, 14px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 40,
          background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(8,12,22,0.92))",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 12,
          padding: "clamp(4px, 1vw, 6px) clamp(12px, 2vw, 20px)",
          color: "#fff",
          fontFamily: "'Rajdhani', monospace",
          display: "flex",
          gap: "clamp(10px, 2vw, 20px)",
          alignItems: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          userSelect: "none",
          maxWidth: "96dvw",
        }}
      >
        {/* T Side Team Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1vw, 10px)" }}>
          <span style={{ color: "#ef4444", fontWeight: 900, fontSize: "clamp(12px, 2vw, 16px)" }}>T</span>
          <span style={{ color: "#f87171", fontWeight: 900, fontSize: "clamp(16px, 3vw, 22px)", minWidth: 24, textAlign: "center" }}>
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
        <div style={{ textAlign: "center", minWidth: "clamp(80px, 15vw, 100px)", borderLeft: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)", padding: "0 clamp(8px, 1.5vw, 14px)" }}>
          {bombPlanted ? (
            <div style={{ color: "#facc15", fontWeight: 900, fontSize: "clamp(11px, 1.8vw, 14px)", animation: "pulseBtnGlow 1s infinite" }}>
              💣 {bombSite ? `SITE ${bombSite}` : "BOMB"} ({Math.ceil(bombTimeLeft)}s)
            </div>
          ) : (
            <div style={{ color: "#38bdf8", fontWeight: 900, fontSize: "clamp(14px, 2.5vw, 18px)" }}>
              {(() => {
                const t = phase === "buy" ? buyPhaseTimeLeft : roundTimeLeft;
                return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, "0")}`;
              })()}
            </div>
          )}
          <div style={{ fontSize: "clamp(8px, 1.2vw, 10px)", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
            ROUND {roundNumber} • {phase === "buy" ? "BUY TIME" : phase}
          </div>
        </div>

        {/* CT Side Team Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 1vw, 10px)" }}>
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
          <span style={{ color: "#60a5fa", fontWeight: 900, fontSize: "clamp(16px, 3vw, 22px)", minWidth: 24, textAlign: "center" }}>
            {teamBlueScore}
          </span>
          <span style={{ color: "#3b82f6", fontWeight: 900, fontSize: "clamp(12px, 2vw, 16px)" }}>CT</span>
        </div>
      </div>

      {phase !== "matchEnd" && <InGameChrome onMenu={openPause} />}

      <Crosshair />

      {/* ── Offline HUD — HP, Armor, Money, Ammo, Weapon, Bomb ── */}
      {me && !me.isDead && phase !== "matchEnd" && (
        <>
          {/* Bottom-left: HP + Armor */}
          <div
            style={{
              position: "fixed",
              bottom: "clamp(8px, 2vw, 16px)",
              left: "clamp(8px, 2vw, 16px)",
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 18px)",
              color: "#fff",
              fontFamily: "'Rajdhani', monospace",
              minWidth: "clamp(120px, 30vw, 150px)",
              maxWidth: "32dvw",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 8px)", marginBottom: 4 }}>
              <span
                style={{
                  color: me.hp > 60 ? "#4ade80" : me.hp > 25 ? "#facc15" : "#ef4444",
                  fontWeight: 900,
                  fontSize: "clamp(18px, 3vw, 24px)",
                }}
              >
                {Math.ceil(me.hp)}
              </span>
              <span style={{ color: "#94a3b8", fontSize: "clamp(10px, 1.5vw, 12px)", fontWeight: 700 }}>HP</span>
            </div>
            {me.armor > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#60a5fa", fontSize: "clamp(12px, 1.8vw, 15px)", fontWeight: 800 }}>{me.armor}</span>
                <span style={{ color: "#94a3b8", fontSize: "clamp(9px, 1.2vw, 11px)" }}>{me.hasHelmet ? "Kevlar + Helmet" : "Kevlar"}</span>
              </div>
            )}
          </div>

          {/* Bottom-right: Ammo + Weapon */}
          <div
            style={{
              position: "fixed",
              bottom: "clamp(8px, 2vw, 16px)",
              right: "clamp(8px, 2vw, 16px)",
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "clamp(6px, 1.5vw, 10px) clamp(10px, 2vw, 18px)",
              color: "#fff",
              fontFamily: "'Rajdhani', monospace",
              textAlign: "right",
              minWidth: "clamp(120px, 30vw, 150px)",
              maxWidth: "32dvw",
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ color: "#38bdf8", fontSize: "clamp(10px, 1.5vw, 13px)", fontWeight: 900, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>
              {me.currentWeapon}
            </div>
            <div>
              <span style={{ color: "#facc15", fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 900 }}>{me.ammo}</span>{" "}
              <span style={{ color: "#94a3b8", fontSize: "clamp(11px, 1.5vw, 14px)" }}>/ {me.reserveAmmo}</span>
            </div>
          </div>

          {/* Bottom-center: Money */}
          <div
            style={{
              position: "fixed",
              bottom: "clamp(8px, 2vw, 16px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 40,
              background: "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(8,12,22,0.95))",
              border: "1.5px solid rgba(74,222,128,0.4)",
              borderRadius: 10,
              padding: "clamp(4px, 1vw, 6px) clamp(10px, 2vw, 16px)",
              color: "#4ade80",
              fontFamily: "'Rajdhani', monospace",
              fontSize: "clamp(12px, 2vw, 16px)",
              fontWeight: 900,
              boxShadow: "0 0 16px rgba(74,222,128,0.2)",
            }}
          >
            ${me.money}
          </div>

          {/* Bomb / defuse prompt — only when the action is actually available */}
          {/* Bomb / defuse prompt — only when the action is actually available */}
          {me.hasBomb && me.team === "T" && !bombPlanted && distToBombSite(me, nearestBombSite(me)) <= resolveBombSites()[nearestBombSite(me)].radius && (
            <div
              style={{
                position: "fixed",
                bottom: "clamp(48px, 8vh, 56px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 40,
                background: "rgba(234,179,8,0.25)",
                border: "1.5px solid #eab308",
                borderRadius: 8,
                padding: "clamp(4px, 1vw, 6px) clamp(10px, 2vw, 16px)",
                color: "#facc15",
                fontFamily: "'Rajdhani', monospace",
                fontSize: "clamp(11px, 1.5vw, 13px)",
                fontWeight: 900,
              }}
            >
              Tahan E untuk plant
            </div>
          )}

          {me.team === "CT" && bombPlanted && !me.isDefusing && distToBombSite(me, (bombSite === "B" ? "B" : "A")) <= resolveBombSites()[bombSite === "B" ? "B" : "A"].radius && (
            <div
              style={{
                position: "fixed",
                bottom: "clamp(48px, 8vh, 56px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 40,
                background: "rgba(59,130,246,0.25)",
                border: "1.5px solid #60a5fa",
                borderRadius: 8,
                padding: "clamp(4px, 1vw, 6px) clamp(10px, 2vw, 16px)",
                color: "#93c5fd",
                fontFamily: "'Rajdhani', monospace",
                fontSize: "clamp(11px, 1.5vw, 13px)",
                fontWeight: 900,
              }}
            >
              Tahan E untuk defuse
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
                padding: "16px 28px",
                minWidth: 280,
                color: "#facc15",
                fontFamily: "'Rajdhani', monospace",
                fontSize: 18,
                fontWeight: 900,
                textAlign: "center",
                boxShadow: "0 0 30px rgba(234,179,8,0.5)",
              }}
            >
              <div style={{ marginBottom: 10, letterSpacing: "0.06em" }}>PLANTING C4 BOMB... TAHAN [E]</div>
              <div style={{ width: "100%", height: 10, background: "rgba(0,0,0,0.6)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(234,179,8,0.4)" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, me.plantProgress * 100))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #ca8a04, #facc15)",
                    transition: "width 0.05s linear",
                  }}
                />
              </div>
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
                padding: "16px 28px",
                minWidth: 280,
                color: "#93c5fd",
                fontFamily: "'Rajdhani', monospace",
                fontSize: 18,
                fontWeight: 900,
                textAlign: "center",
                boxShadow: "0 0 30px rgba(96,165,250,0.5)",
              }}
            >
              <div style={{ marginBottom: 10, letterSpacing: "0.06em" }}>DEFUSING BOMB... TAHAN [E]</div>
              <div style={{ width: "100%", height: 10, background: "rgba(0,0,0,0.6)", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(96,165,250,0.4)" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, me.defuseProgress * 100))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                    transition: "width 0.05s linear",
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      <SniperScope />
      <ADSOpticSight />
      <DamageVignette />
      <DeathScreen />
      <FlashEffect />

      {buyMenuOpen && phase === "buy" && <BuyMenu onClose={closeBuyMenu} />}

      {paused && phase !== "matchEnd" && (
        <PauseMenu title="5V5 OFFLINE" accent="amber" onResume={resume} onQuit={back} />
      )}

      {/* Click-to-play overlay — only show when NOT paused */}
      {!paused && phase !== "matchEnd" && <ClickToPlayOverlay onLock={() => {}} suppressed={buyMenuOpen} />}

      {phase === "roundEnd" && !paused && (
        <div
          style={{
            position: "fixed",
            top: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 45,
            pointerEvents: "none",
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 10,
            padding: "8px 22px",
            color: "#e2e8f0",
            fontFamily: "'Rajdhani', monospace",
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          RONDE SELESAI
        </div>
      )}

      {/* Match Over Modal */}
      {phase === "matchEnd" && (
        <GameModal accent="blue" zIndex={HUD_Z.modal}>
          <ModalHeader eyebrow="MATCH OVER" title={`${teamRedScore} : ${teamBlueScore}`} />
          <ModalBody>
            <div style={{ color: teamRedScore > teamBlueScore ? "#f87171" : "#60a5fa", marginBottom: 16, fontWeight: 800 }}>
              {teamRedScore > teamBlueScore ? "TERRORISTS WIN" : "COUNTER-TERRORISTS WIN"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <OverlayButton variant="primary" onClick={rematch}>ULANGI</OverlayButton>
              <OverlayButton variant="danger" onClick={back}>MENU UTAMA</OverlayButton>
            </div>
          </ModalBody>
        </GameModal>
      )}
    </div>
  );
}
