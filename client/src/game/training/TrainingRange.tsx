import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { HUDLayout } from "../../ui/components/hud/HUDLayout";
import { PlayerController } from "../player/PlayerController";
import { WeaponModel } from "../weapons/WeaponModel";
import { ShootingSystem } from "../weapons/ShootingSystem";
import { ReloadSystem } from "../weapons/ReloadSystem";
import { Crosshair } from "../../components/Crosshair";
import { HitMarker } from "../../components/HitMarker";
import { ClickToPlayOverlay } from "../../components/ClickToPlayOverlay";
import { AudioManager } from "../../components/AudioManager";
import SniperScope from "../../components/SniperScope";
import SettingsMenu from "../../screens/SettingsMenu";
import { AimTrainer, AimTrainerUI } from "./AimTrainer";
import { RecoilPractice, RecoilPracticeUI } from "./RecoilPractice";
import { TrainingArena } from "./TrainingArena";
import { useWeaponStore, WeaponKey } from "../../stores/useWeaponStore";
import { useGameStore } from "../../stores/useGameStore";
import { TracerManager } from "../effects/TracerManager";
import { useWeaponSwitch } from "../../hooks/useWeaponSwitch";

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

function QuickArsenalSelector() {
  const { activeWeapon, equipWeapon } = useWeaponStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        userSelect: "none",
        fontFamily: "'Inter', monospace, sans-serif",
      }}
    >
      {/* Expanded Quick Weapon Selector */}
      {isOpen && (
        <div
          style={{
            background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "14px",
            padding: "12px 16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "680px",
          }}
        >
          {WEAPON_OPTIONS.map((w) => {
            const isEquipped = activeWeapon === w.key;
            return (
              <button
                key={w.key}
                onClick={() => {
                  equipWeapon(w.key);
                }}
                style={{
                  padding: "8px 14px",
                  background: isEquipped
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(37, 99, 235, 0.6))"
                    : "rgba(255, 255, 255, 0.06)",
                  border: isEquipped ? "1px solid #60a5fa" : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: isEquipped ? "#ffffff" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: isEquipped ? 900 : 600,
                  cursor: "pointer",
                  boxShadow: isEquipped ? "0 0 12px rgba(59, 130, 246, 0.5)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Bottom Slot Bar */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8))",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "12px",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={() => setIsOpen((p) => !p)}
          style={{
            padding: "8px 14px",
            background: isOpen ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.08)",
            border: isOpen ? "1px solid #60a5fa" : "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "8px",
            color: isOpen ? "#93c5fd" : "#cbd5e1",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>🔫 ARSENAL RACK</span>
          <span style={{ fontSize: "9px" }}>{isOpen ? "▲" : "▼"}</span>
        </button>

        <div style={{ width: "1px", height: "20px", background: "rgba(255, 255, 255, 0.15)" }} />

        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { slot: "1", label: "PRIMARY [1]", key: "ak47" as WeaponKey },
            { slot: "2", label: "PISTOL [2]", key: "deagle" as WeaponKey },
            { slot: "3", label: "KNIFE [3]", key: "combatknife" as WeaponKey },
          ].map((item) => (
            <button
              key={item.slot}
              onClick={() => equipWeapon(item.key)}
              style={{
                padding: "8px 12px",
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                color: "#cbd5e1",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrainingTopNav({
  mode,
  onModeChange,
}: {
  mode: "aim" | "recoil";
  onModeChange: (m: "aim" | "recoil") => void;
}) {
  const { setMode } = useGameStore();
  const [, setLocation] = useLocation();

  return (
    <header
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        width: "calc(100% - 48px)",
        maxWidth: "1000px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75))",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        borderRadius: "14px",
        padding: "8px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.5), 0 0 15px rgba(59,130,246,0.08)",
        fontFamily: "'Inter', monospace, sans-serif",
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
          background: "rgba(0, 0, 0, 0.4)",
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
          🎯 AIM TRAINER
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
          ⚡ RECOIL SPRAY WALL (25M)
        </button>
      </div>

      {/* Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("openSettings"))}
          style={{
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            color: "#cbd5e1",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ⚙️ SETTINGS [P]
        </button>

        <button
          onClick={() => {
            setMode("menu");
            setLocation("/");
          }}
          style={{
            padding: "8px 14px",
            background: "rgba(239, 68, 68, 0.18)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "8px",
            color: "#f87171",
            fontSize: "12px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ← KEMBALI KE MENU
        </button>
      </div>
    </header>
  );
}

export function TrainingRange() {
  const [trainingMode, setTrainingMode] = useState<"aim" | "recoil">("aim");
  useWeaponSwitch();

  useEffect(() => {
    useGameStore.getState().setMode("training");
    const state = useWeaponStore.getState();
    state.setInfiniteAmmo(true);
    // Training hands out a full loadout so slots 1/2/3 all work offline.
    state.syncLoadout({
      primary: state.primaryWeapon ?? "ak47",
      secondary: state.secondaryWeapon ?? "deagle",
      knife: state.knifeSlot ?? "knife",
    });
    state.equipWeapon(state.activeWeapon ?? "ak47");
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
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
      </Canvas>
      <Crosshair />
      <SniperScope />
      <HitMarker />
      <HUDLayout />
      <AudioManager />
      {trainingMode === "aim" && <AimTrainerUI />}
      {trainingMode === "recoil" && <RecoilPracticeUI />}
      <QuickArsenalSelector />
      <TrainingTopNav mode={trainingMode} onModeChange={setTrainingMode} />
      <SettingsMenu />
      <ClickToPlayOverlay onLock={() => {}} />
    </div>
  );
}
