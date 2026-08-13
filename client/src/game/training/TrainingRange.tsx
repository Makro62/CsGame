import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { ContainerYard } from "../map/ContainerYard";
import { PlayerController } from "../player/PlayerController";
import { WeaponModel } from "../weapons/WeaponModel";
import { ShootingSystem } from "../weapons/ShootingSystem";
import { ReloadSystem } from "../weapons/ReloadSystem";
import { Crosshair } from "../../components/Crosshair";
import { HUD } from "../../components/HUD";
import { HitMarker } from "../../components/HitMarker";
import { ClickToPlayOverlay } from "../../components/ClickToPlayOverlay";
import SettingsMenu from "../../screens/SettingsMenu";
import { AimTrainer, AimTrainerUI } from "./AimTrainer";
import { RecoilPractice, RecoilPracticeUI } from "./RecoilPractice";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useGameStore } from "../../stores/useGameStore";
import { TracerManager } from "../effects/TracerManager";
import { useWeaponSwitch } from "../../hooks/useWeaponSwitch";

function WeaponSelection() {
  const { equipWeapon, activeWeapon, primaryWeapon, secondaryWeapon, knifeSlot } = useWeaponStore();

  const weaponSlots = [
    { key: "1", weapon: primaryWeapon || "ak47", label: "1: PRIMARY" },
    { key: "2", weapon: secondaryWeapon || "deagle", label: "2: PISTOL" },
    { key: "3", weapon: knifeSlot || "knife", label: "3: KNIFE" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        zIndex: 100,
      }}
    >
      {weaponSlots.map((slot) => (
        <button
          key={slot.key}
          onClick={() => equipWeapon(slot.weapon)}
          style={{
            padding: "8px 16px",
            backgroundColor:
              activeWeapon === slot.weapon
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.5)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}

function TrainingModeSelector({
  mode,
  onModeChange,
}: {
  mode: "aim" | "recoil";
  onModeChange: (m: "aim" | "recoil") => void;
}) {
  const { setMode } = useGameStore();

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "8px",
        zIndex: 100,
      }}
    >
      <button
        onClick={() => onModeChange("aim")}
        style={{
          padding: "8px 16px",
          backgroundColor:
            mode === "aim" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.5)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        AIM TRAINER
      </button>
      <button
        onClick={() => onModeChange("recoil")}
        style={{
          padding: "8px 16px",
          backgroundColor:
            mode === "recoil" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.5)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        RECOIL PRACTICE
      </button>
      <button
        onClick={() => setMode("menu")}
        style={{
          padding: "8px 16px",
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        BACK
      </button>
    </div>
  );
}

export function TrainingRange() {
  const [trainingMode, setTrainingMode] = useState<"aim" | "recoil">("aim");
  useWeaponSwitch();

  useEffect(() => {
    // Auto-equip default weapon on mount
    useWeaponStore.getState().equipWeapon("deagle");
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
      <Canvas shadows camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          castShadow
          position={[10, 10, 10]}
          intensity={1.5}
        />
        <Physics gravity={[0, -9.81, 0]}>
          <ContainerYard />
          <PlayerController />
          <WeaponModel />
          {trainingMode === "aim" && <AimTrainer />}
          {trainingMode === "recoil" && <RecoilPractice />}
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
      </Canvas>
      <Crosshair />
      <HitMarker />
      <HUD />
      {trainingMode === "aim" && <AimTrainerUI />}
      {trainingMode === "recoil" && <RecoilPracticeUI />}
      <WeaponSelection />
      <TrainingModeSelector mode={trainingMode} onModeChange={setTrainingMode} />
      <SettingsMenu />
      <ClickToPlayOverlay onLock={() => {}} />
    </div>
  );
}
