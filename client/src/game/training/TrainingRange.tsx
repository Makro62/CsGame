import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { HUDLayout } from "../../ui/components/hud/HUDLayout";
import { PlayerController } from "../player/PlayerController";
import { WeaponModel } from "../weapons/WeaponModel";
import { ShootingSystem } from "../weapons/ShootingSystem";
import { ReloadSystem } from "../weapons/ReloadSystem";
import { Crosshair } from "../../components/Crosshair";
import { ClickToPlayOverlay } from "../../components/ClickToPlayOverlay";
import { AudioManager } from "../../components/AudioManager";
import SniperScope from "../../components/SniperScope";
import { ADSOpticSight } from "../../components/ADSOpticSight";
import { PauseMenu } from "../../ui/components/overlays/PauseMenu";
import { AimTrainer, AimTrainerUI } from "./AimTrainer";
import { RecoilPractice, RecoilPracticeUI } from "./RecoilPractice";
import { TrainingArena } from "./TrainingArena";
import { useWeaponStore, WeaponKey } from "../../stores/useWeaponStore";
import { useGameStore } from "../../stores/useGameStore";
import { TracerManager } from "../effects/TracerManager";
import { useWeaponSwitch } from "../../hooks/useWeaponSwitch";
import { GrenadeSystem } from "../weapons/GrenadeSystem";
import { FlashEffect } from "../../components/FlashEffect";
import { HUD_FONT, HUD_MONO, hudPanel } from "../../ui/hudTheme";
import { TRAINING_PANEL_Z } from "./trainingHud";

/** The nav bar owns the top edge, so it stays above the drill panels. */
const TRAINING_NAV_Z = TRAINING_PANEL_Z + 50;

function useLiveFPS() {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animId: number;
    const loop = () => {
      frameCount.current += 1;
      const now = performance.now();
      const delta = now - lastTime.current;
      if (delta >= 500) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return fps;
}

const WEAPON_OPTIONS: Array<{ key: WeaponKey; name: string; slot: "primary" | "secondary" | "knife" }> = [
  { key: "ak47", name: "AK-47", slot: "primary" },
  { key: "m4a1", name: "M4A1-S", slot: "primary" },
  { key: "awp", name: "AWP", slot: "primary" },
  { key: "mp5", name: "MP5-SD", slot: "primary" },
  { key: "deagle", name: "DESERT EAGLE", slot: "secondary" },
  { key: "glock", name: "GLOCK-18", slot: "secondary" },
  { key: "tec9", name: "TEC-9", slot: "secondary" },
  { key: "combatknife", name: "COMBAT KNIFE", slot: "knife" },
];

const ARSENAL_GROUPS: Array<{ slot: "primary" | "secondary" | "knife"; title: string }> = [
  { slot: "primary", title: "PRIMARY [1]" },
  { slot: "secondary", title: "SECONDARY [2]" },
  { slot: "knife", title: "MELEE [3]" },
];

function QuickArsenalSelector() {
  const { activeWeapon, equipWeapon } = useWeaponStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: TRAINING_PANEL_Z,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
        fontFamily: HUD_FONT,
      }}
    >
      {/* Rack grouped by slot so it reads like the buy menu instead of one long row */}
      {isOpen && (
        <div
          style={{
            ...hudPanel("blue"),
            borderRadius: 14,
            padding: "12px 16px",
            display: "flex",
            gap: 18,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {ARSENAL_GROUPS.map((group) => (
            <div key={group.slot} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: "#64748b" }}>
                {group.title}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {WEAPON_OPTIONS.filter((w) => w.slot === group.slot).map((w) => {
                  const isEquipped = activeWeapon === w.key;
                  return (
                    <button
                      key={w.key}
                      onClick={() => equipWeapon(w.key)}
                      style={{
                        padding: "7px 12px",
                        background: isEquipped
                          ? "linear-gradient(135deg, rgba(59, 130, 246, 0.55), rgba(37, 99, 235, 0.75))"
                          : "rgba(255, 255, 255, 0.06)",
                        border: isEquipped ? "1px solid #60a5fa" : "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: 8,
                        color: isEquipped ? "#ffffff" : "#cbd5e1",
                        fontSize: 11,
                        fontWeight: isEquipped ? 900 : 600,
                        letterSpacing: 0.4,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        boxShadow: isEquipped ? "0 0 12px rgba(59, 130, 246, 0.45)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsOpen((p) => !p)}
        style={{
          ...hudPanel(isOpen ? "blue" : "neutral"),
          padding: "7px 16px",
          color: isOpen ? "#93c5fd" : "#cbd5e1",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s",
        }}
      >
        <span>🔫 ARSENAL RACK</span>
        <span style={{ fontSize: 9, color: "#64748b" }}>{isOpen ? "▲ HIDE" : "▼ OPEN"}</span>
      </button>
    </div>
  );
}

function TrainingTopNav({
  mode,
  onModeChange,
  onMenu,
}: {
  mode: "aim" | "recoil";
  onModeChange: (m: "aim" | "recoil") => void;
  onMenu: () => void;
}) {
  const fps = useLiveFPS();
  const frameTime = fps > 0 ? (1000 / fps).toFixed(1) : "16.6";
  const fpsColor = fps >= 55 ? "#4ade80" : fps >= 30 ? "#facc15" : "#f87171";

  return (
    <header
      style={{
        ...hudPanel("blue"),
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: TRAINING_NAV_Z,
        width: "calc(100% - 32px)",
        maxWidth: 1160,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        borderRadius: 14,
        padding: "8px 16px",
        userSelect: "none",
      }}
    >
      {/* Left Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>🎯</span>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "2px", color: "#f8fafc" }}>
            TRAINING RANGE V3
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "1px" }}>
            OFFLINE PRACTICE & AIM LAB
          </div>
        </div>
      </div>

      {/* Center Mode Switcher Tabs */}
      <div
        style={{
          display: "flex",
          background: "rgba(0, 0, 0, 0.45)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          gap: "4px",
        }}
      >
        <button
          onClick={() => onModeChange("aim")}
          style={{
            padding: "8px 18px",
            background:
              mode === "aim"
                ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                : "transparent",
            color: mode === "aim" ? "#ffffff" : "#94a3b8",
            border: mode === "aim" ? "1px solid #60a5fa" : "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "1px",
            boxShadow: mode === "aim" ? "0 0 16px rgba(37, 99, 235, 0.5)" : "none",
            transition: "all 0.2s",
          }}
        >
          🎯 AIM DRILL
        </button>

        <button
          onClick={() => onModeChange("recoil")}
          style={{
            padding: "8px 18px",
            background:
              mode === "recoil"
                ? "linear-gradient(135deg, #d97706, #b45309)"
                : "transparent",
            color: mode === "recoil" ? "#ffffff" : "#94a3b8",
            border: mode === "recoil" ? "1px solid #fbbf24" : "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "1px",
            boxShadow: mode === "recoil" ? "0 0 16px rgba(217, 119, 6, 0.5)" : "none",
            transition: "all 0.2s",
          }}
        >
          ⚡ RECOIL WALL
        </button>
      </div>

      {/* Right Telemetry & Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Integrated Top-Right FPS Telemetry Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "4px 10px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px" }}>⚡</span>
            <span style={{ fontSize: "14px", fontWeight: 900, fontFamily: HUD_MONO, color: fpsColor }}>
              {fps}
            </span>
            <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>FPS</span>
          </div>

          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>|</span>

          <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: HUD_MONO }}>
            {frameTime}ms
          </span>

          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>|</span>

          <span
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: "#38bdf8",
              background: "rgba(56, 189, 248, 0.15)",
              padding: "1px 5px",
              borderRadius: "4px",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            OFFLINE 0ms
          </span>
        </div>

        <button
          onClick={onMenu}
          style={{
            padding: "8px 14px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            color: "#cbd5e1",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: 0.6,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          MENU [ESC]
        </button>
      </div>
    </header>
  );
}

export function TrainingRange() {
  const [trainingMode, setTrainingMode] = useState<"aim" | "recoil">("aim");
  const { buyMenuOpen, closeBuyMenu } = useWeaponSwitch();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    useGameStore.getState().setMode("training");
    const state = useWeaponStore.getState();
    state.setInfiniteAmmo(true);
    state.syncLoadout({
      primary: state.primaryWeapon ?? "ak47",
      secondary: state.secondaryWeapon ?? "deagle",
      knife: state.knifeSlot ?? "knife",
    });
    state.equipWeapon(state.activeWeapon ?? "ak47");
  }, []);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = !!document.pointerLockElement;
      if (!locked && !buyMenuOpen) setPaused(true);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [buyMenuOpen]);

  const resume = useCallback(() => {
    setPaused(false);
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.requestPointerLock();
  }, []);

  const backToMenu = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(false);
    useGameStore.getState().setMode("menu");
  }, []);

  const openPause = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(true);
  }, []);

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

  return (
    <div style={{ width: "100dvw", height: "100dvh", position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
      <Canvas shadows camera={{ fov: 75 }}>
        <color attach="background" args={["#0e1118"]} />
        <fog attach="fog" args={["#0e1118", 40, 80]} />
        <Physics gravity={[0, -9.81, 0]}>
          <TrainingArena mode={trainingMode} />
          <PlayerController />
          <WeaponModel />
          {trainingMode === "aim" && <AimTrainer />}
        </Physics>
        {trainingMode === "recoil" && <RecoilPractice />}
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
        <GrenadeSystem />
      </Canvas>
      <FlashEffect />
      <Crosshair />
      <SniperScope />
      <ADSOpticSight />
      <HUDLayout />
      <AudioManager />
      {trainingMode === "aim" && <AimTrainerUI />}
      {trainingMode === "recoil" && <RecoilPracticeUI />}
      <QuickArsenalSelector />
      <TrainingTopNav mode={trainingMode} onModeChange={setTrainingMode} onMenu={openPause} />
      {paused && (
        <PauseMenu
          title="TRAINING RANGE"
          accent="blue"
          onResume={resume}
          onQuit={backToMenu}
        />
      )}
      {!paused && <ClickToPlayOverlay onLock={() => {}} />}
    </div>
  );
}
