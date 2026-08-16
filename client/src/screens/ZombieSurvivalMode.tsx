import { useEffect, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { PlayerController } from "../game/player/PlayerController";
import { WeaponModel } from "../game/weapons/WeaponModel";
import { ShootingSystem } from "../game/weapons/ShootingSystem";
import { ReloadSystem } from "../game/weapons/ReloadSystem";
import { Crosshair } from "../components/Crosshair";
import { HitMarker } from "../components/HitMarker";
import { DamageVignette } from "../components/DamageVignette";
import { DownedOverlay } from "../components/DownedOverlay";
import { AudioManager } from "../components/AudioManager";
import { ClickToPlayOverlay } from "../components/ClickToPlayOverlay";
import { ZombieArena } from "../game/map/ZombieArena";
import { ZombieRenderer } from "../game/zombie/ZombieRenderer";
import { PowerUpRenderer } from "../game/zombie/PowerUpRenderer";
import { ZombieMinimap } from "../components/ZombieMinimap";
import { WaveHUD } from "../ui/components/hud/WaveHUD";
import { PointsDisplay } from "../ui/components/hud/PointsDisplay";
import { ExtractionHUD } from "../ui/components/hud/ExtractionHUD";
import { ZombiePlayerHUD } from "../ui/components/hud/ZombiePlayerHUD";
import { WeaponShop } from "../ui/components/zombie/WeaponShop";
import { MysteryBox } from "../ui/components/zombie/MysteryBox";
import { PackAPunch } from "../ui/components/zombie/PackAPunch";
import { AreaUnlockUI } from "../ui/components/zombie/AreaUnlockUI";
import { ZombieLeaderboard } from "../ui/components/zombie/ZombieLeaderboard";
import { ZombieSettings } from "../ui/components/zombie/ZombieSettings";
import { ZombieLobbySetup, DifficultyLevel } from "../ui/components/zombie/ZombieLobbySetup";
import { ZombieGameOver } from "../ui/components/zombie/ZombieGameOver";
import { useZombieStore } from "../stores/useZombieStore";
import { useZombieNetworkStore } from "../stores/useZombieNetworkStore";
import { useGameStore } from "../stores/useGameStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import { BARRICADE_CONFIG } from "@cs-game/shared";

// ============================================================================
// Hotkey & Action Handler
// ============================================================================

function HotkeyManager({
  onToggleShop,
  onToggleSettings,
  onToggleLeaderboard,
  onInteractAction,
}: {
  onToggleShop: () => void;
  onToggleSettings: () => void;
  onToggleLeaderboard: () => void;
  onInteractAction: () => void;
}) {
  const sendSwitchWeapon = useZombieNetworkStore((s) => s.sendSwitchWeapon);
  const sendStartGame = useZombieNetworkStore((s) => s.sendStartGame);
  const switchToSlot = useWeaponStore((s) => s.switchToSlot);
  const connected = useZombieNetworkStore((s) => s.connected);
  const localIsDead = useZombieNetworkStore((s) => s.localIsDead);

  useEffect(() => {
    if (!connected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (localIsDead) return;
      switch (e.code) {
        case "KeyF":
          onInteractAction();
          break;
        case "Digit1":
        case "Numpad1": {
          switchToSlot(1);
          const active = useWeaponStore.getState().activeWeapon;
          if (active) sendSwitchWeapon(active);
          break;
        }
        case "Digit2":
        case "Numpad2": {
          switchToSlot(2);
          const active = useWeaponStore.getState().activeWeapon;
          if (active) sendSwitchWeapon(active);
          break;
        }
        case "Digit3":
        case "Numpad3": {
          switchToSlot(3);
          const active = useWeaponStore.getState().activeWeapon;
          if (active) sendSwitchWeapon(active);
          break;
        }
        case "Space":
          sendStartGame();
          break;
        case "KeyB":
          onToggleShop();
          break;
        case "KeyL":
        case "Tab":
          e.preventDefault();
          onToggleLeaderboard();
          break;
        case "Escape":
          onToggleSettings();
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (localIsDead) return;
      const state = useWeaponStore.getState();
      const current = state.activeWeapon;
      const primary = state.primaryWeapon || "ak47";
      const secondary = state.secondaryWeapon || "deagle";

      const isPrimary = current === primary;
      const isSecondary = current === secondary;

      if (e.deltaY > 0) {
        // Wheel down: 1 -> 2 -> 3 -> 1
        if (isPrimary) switchToSlot(2);
        else if (isSecondary) switchToSlot(3);
        else switchToSlot(1);
      } else if (e.deltaY < 0) {
        // Wheel up: 1 -> 3 -> 2 -> 1
        if (isPrimary) switchToSlot(3);
        else if (isSecondary) switchToSlot(1);
        else switchToSlot(2);
      }

      const active = useWeaponStore.getState().activeWeapon;
      if (active) sendSwitchWeapon(active);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [connected, localIsDead, sendSwitchWeapon, sendStartGame, switchToSlot, onToggleShop, onToggleSettings, onToggleLeaderboard, onInteractAction]);

  return null;
}

// ============================================================================
// Contextual Interaction Prompt Overlay
// ============================================================================

function InteractionPrompt() {
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);
  const barricades = useZombieStore((s) => s.barricades);
  const extractionAvailable = useZombieStore((s) => s.extractionAvailable);
  const extractionActive = useZombieStore((s) => s.extractionActive);
  const waveState = useZombieStore((s) => s.waveState);
  const currentWave = useZombieStore((s) => s.currentWave);

  if (!lastSnapshot) return null;
  const { x, z } = lastSnapshot;

  // Check near mystery box [0, 5]
  const distToMysteryBox = Math.sqrt(x ** 2 + (z - 5) ** 2);
  if (distToMysteryBox <= 4) {
    return (
      <PromptBadge text="Press [F] to Open Mystery Box (950 pts)" />
    );
  }

  // Check near Pack-a-Punch [0, 0]
  const distToPaP = Math.sqrt(x ** 2 + z ** 2);
  if (distToPaP <= 4) {
    return (
      <PromptBadge text="Press [F] to Upgrade Weapon (5,000 pts)" />
    );
  }

  // Check near damaged barricade
  for (const loc of BARRICADE_CONFIG.locations) {
    const distSq = (loc.x - x) ** 2 + (loc.z - z) ** 2;
    if (distSq < 16) {
      const b = barricades.find((item) => item.id === loc.id);
      if (!b || b.boards < 6) {
        return (
          <PromptBadge text="Press [F] to Repair Barricade (+10 pts)" />
        );
      }
    }
  }

  // Check near helipad [0, 50]
  const distToHelipad = Math.sqrt(x ** 2 + (z - 50) ** 2);
  if (distToHelipad <= 14 && extractionAvailable && !extractionActive) {
    return (
      <PromptBadge text="Press [F] to Call Helipad Evac (5,000 pts / Free at Wave 10)" />
    );
  }

  // Wave start prompt if waiting
  if (waveState === "waiting" || (waveState === "wave_clear" && currentWave === 0)) {
    return (
      <PromptBadge text="Press [SPACE] to Start Wave 1" />
    );
  }

  return null;
}

function PromptBadge({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "160px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        border: "1px solid #ffd700",
        borderRadius: "8px",
        padding: "8px 20px",
        color: "#ffd700",
        fontSize: "14px",
        fontWeight: "bold",
        pointerEvents: "none",
        zIndex: 35,
        boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)",
      }}
    >
      {text}
    </div>
  );
}

// ============================================================================
// Boss Wave Warning
// ============================================================================

function BossWaveWarning() {
  const currentWave = useZombieStore((s) => s.currentWave);
  const waveState = useZombieStore((s) => s.waveState);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (currentWave > 0 && currentWave % 5 === 0 && waveState === "spawning") {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentWave, waveState]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "16px 32px",
        backgroundColor: "rgba(220,38,38,0.9)",
        borderRadius: "8px",
        border: "2px solid #ff0000",
        animation: "pulse 0.5s infinite",
        zIndex: 45,
      }}
    >
      <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold", textAlign: "center" }}>
        ⚠️ BOSS WAVE
      </div>
    </div>
  );
}

// ============================================================================
// Main Zombie Survival Screen
// ============================================================================

export function ZombieSurvivalMode() {
  const connect = useZombieNetworkStore((s) => s.connect);
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);
  const kills = useZombieNetworkStore((s) => s.kills);
  const headshots = useZombieNetworkStore((s) => s.headshots);
  const nickname = useGameStore((s) => s.nickname);

  const [lobbyOpen, setLobbyOpen] = useState(true);
  const [shopOpen, setShopOpen] = useState(false);
  const [mysteryBoxOpen, setMysteryBoxOpen] = useState(false);
  const [packAPunchOpen, setPackAPunchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const {
    currentWave,
    waveState,
    zombiesRemaining,
    interWaveTimer,
    points,
    zombies,
    powerUps,
    activePowerUp,
    powerUpTimer,
    evacSuccess,
  } = useZombieStore();

  const localIsDead = useZombieNetworkStore((s) => s.localIsDead);

  useEffect(() => {
    useGameStore.getState().setMode("zombie");
    useWeaponStore.getState().equipWeapon("deagle");
    connect(nickname || "Survivor");

    return () => {
      useZombieNetworkStore.getState().disconnect();
    };
  }, []);

  const handleStartGameFromLobby = useCallback((_diff: DifficultyLevel) => {
    setLobbyOpen(false);
    useGameStore.getState().setMode("zombie");
    useWeaponStore.getState().equipWeapon("deagle");
    useZombieNetworkStore.getState().sendStartGame();
  }, []);

  const handleBackToMenu = useCallback(() => {
    useZombieNetworkStore.getState().disconnect();
    useGameStore.getState().setMode("menu");
  }, []);

  const handleRestart = useCallback(() => {
    setGameOver(false);
    setSettingsOpen(false);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (localIsDead || evacSuccess) {
      const timer = setTimeout(() => setGameOver(true), 2500);
      return () => clearTimeout(timer);
    }
    setGameOver(false);
  }, [localIsDead, evacSuccess]);

  const toggleShop = useCallback(() => setShopOpen((p) => !p), []);
  const toggleSettings = useCallback(() => setSettingsOpen((p) => !p), []);
  const toggleLeaderboard = useCallback(() => setLeaderboardOpen((p) => !p), []);

  const handlePickup = useCallback((id: string) => {
    useZombieNetworkStore.getState().sendPickupPowerUp(id);
  }, []);

  // Contextual Interaction [F]
  const handleInteract = useCallback(() => {
    const snap = useZombieNetworkStore.getState().lastSnapshot;
    if (!snap) return;
    const { x, z } = snap;

    // 1. Check near Mystery Box [0, 5]
    const distToMysteryBox = Math.sqrt(x ** 2 + (z - 5) ** 2);
    if (distToMysteryBox <= 4) {
      setMysteryBoxOpen(true);
      return;
    }

    // 2. Check near Pack-a-Punch [0, 0]
    const distToPaP = Math.sqrt(x ** 2 + z ** 2);
    if (distToPaP <= 4) {
      setPackAPunchOpen(true);
      return;
    }

    // 3. Check near damaged barricade
    const barricades = useZombieStore.getState().barricades;
    for (const loc of BARRICADE_CONFIG.locations) {
      const distSq = (loc.x - x) ** 2 + (loc.z - z) ** 2;
      if (distSq < 16) {
        const b = barricades.find((item) => item.id === loc.id);
        if (!b || b.boards < 6) {
          useZombieNetworkStore.getState().sendRepairBarricade(loc.id);
          return;
        }
      }
    }

    // 4. Check near helipad for extraction
    const distToHelipad = Math.sqrt(x ** 2 + (z - 50) ** 2);
    if (distToHelipad <= 14) {
      const { extractionAvailable, extractionActive } = useZombieStore.getState();
      if (extractionAvailable && !extractionActive) {
        useZombieNetworkStore.getState().sendTriggerExtraction();
      }
    }
  }, []);

  const playerPos = { x: lastSnapshot?.x ?? 0, z: lastSnapshot?.z ?? -30 };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#080c14" }}>
      {lobbyOpen && (
        <ZombieLobbySetup
          onStart={handleStartGameFromLobby}
          onBack={handleBackToMenu}
        />
      )}

      {/* Top Left Menu / Back Button */}
      <button
        onClick={toggleSettings}
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          padding: "8px 16px",
          backgroundColor: "rgba(10, 15, 25, 0.8)",
          border: "1px solid rgba(220, 38, 38, 0.6)",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 60,
          boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.3)";
          e.currentTarget.style.borderColor = "#ef4444";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(10, 15, 25, 0.8)";
          e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.6)";
        }}
      >
        ⚙️ MENU / BACK [ESC]
      </button>

      <HotkeyManager
        onToggleShop={toggleShop}
        onToggleSettings={toggleSettings}
        onToggleLeaderboard={toggleLeaderboard}
        onInteractAction={handleInteract}
      />

      <Canvas shadows camera={{ fov: 75, position: [0, 1.6, -30] }}>
        <color attach="background" args={["#080c14"]} />
        <fog attach="fog" args={["#080c14", 15, 80]} />
        <ambientLight intensity={0.25} color="#556677" />
        <directionalLight castShadow position={[15, 30, 10]} intensity={0.8} color="#99aabb" />
        <Physics gravity={[0, -9.81, 0]}>
          <ZombieArena />
          <PlayerController />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <ZombieRenderer zombies={zombies} />
        <PowerUpRenderer powerUps={powerUps} onPickup={handlePickup} playerPosition={playerPos} />
      </Canvas>

      <Crosshair />
      <HitMarker />
      <DamageVignette />
      <DownedOverlay />
      <AudioManager />
      <ZombieMinimap />
      <WaveHUD currentWave={currentWave} waveState={waveState} zombiesRemaining={zombiesRemaining} interWaveTimer={interWaveTimer} />
      <PointsDisplay points={points} />
      <ZombiePlayerHUD />
      <ExtractionHUD />
      <AreaUnlockUI />
      <InteractionPrompt />
      <BossWaveWarning />
      <ActivePowerUpIndicator activePowerUp={activePowerUp} powerUpTimer={powerUpTimer} />
      {!lobbyOpen && <ClickToPlayOverlay onLock={() => {}} />}
      {shopOpen && <WeaponShop onClose={toggleShop} />}
      {mysteryBoxOpen && <MysteryBox onClose={() => setMysteryBoxOpen(false)} />}
      {packAPunchOpen && <PackAPunch onClose={() => setPackAPunchOpen(false)} />}
      {settingsOpen && (
        <ZombieSettings
          onClose={toggleSettings}
          onRestart={handleRestart}
          onMenu={handleBackToMenu}
        />
      )}
      {leaderboardOpen && <ZombieLeaderboard onClose={() => setLeaderboardOpen(false)} />}
      {gameOver && (
        <ZombieGameOver
          wave={currentWave}
          kills={kills}
          headshots={headshots}
          evacuated={evacSuccess}
          onRestart={handleRestart}
          onMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}

function ActivePowerUpIndicator({ activePowerUp, powerUpTimer }: { activePowerUp: string | null; powerUpTimer: number }) {
  if (!activePowerUp) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "100px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 16px",
        backgroundColor: "rgba(0,0,0,0.7)",
        borderRadius: "8px",
        border: "1px solid #ffd700",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        zIndex: 30,
      }}
    >
      <span style={{ color: "#ffd700", fontWeight: "bold", fontSize: "14px" }}>
        {activePowerUp.replace(/_/g, " ").toUpperCase()}
      </span>
      <span style={{ color: "#fff", fontSize: "12px" }}>{Math.ceil(powerUpTimer)}s</span>
    </div>
  );
}
