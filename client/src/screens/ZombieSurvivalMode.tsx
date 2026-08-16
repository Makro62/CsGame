import { useEffect, useCallback, useRef, useState } from "react";
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
import { AreaUnlockUI, nearestLockedArea } from "../ui/components/zombie/AreaUnlockUI";
import { ZombieLeaderboard } from "../ui/components/zombie/ZombieLeaderboard";
import { ZombieSettings } from "../ui/components/zombie/ZombieSettings";
import { ZombieLobbySetup, DifficultyLevel } from "../ui/components/zombie/ZombieLobbySetup";
import { ZombieGameOver } from "../ui/components/zombie/ZombieGameOver";
import { useZombieStore } from "../stores/useZombieStore";
import { useZombieNetworkStore } from "../stores/useZombieNetworkStore";
import { useGameStore } from "../stores/useGameStore";
import { useWeaponStore } from "../stores/useWeaponStore";
import {
  BARRICADE_CONFIG,
  EXTRACTION_CONFIG,
  MYSTERY_BOX,
  MYSTERY_BOX_POS,
  PACK_A_PUNCH,
  PACK_A_PUNCH_POS,
  ZOMBIE_POINTS,
} from "@cs-game/shared";
import {
  HUD_EDGE,
  HUD_MONO,
  HUD_Z,
  hudBannerStack,
  hudPanel,
  hudPill,
  hudPromptStack,
} from "../ui/hudTheme";

/** Reviving an ally takes a held key, so a stray tap cannot start it. */
const REVIVE_RANGE = 3;

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

/** Nearest downed teammate within reach, or null. */
function nearestDownedAlly() {
  const { lastSnapshot, downedAllies } = useZombieNetworkStore.getState();
  if (!lastSnapshot || downedAllies.length === 0) return null;

  let closest: (typeof downedAllies)[number] | null = null;
  let closestDist = Infinity;
  for (const ally of downedAllies) {
    const dist = Math.hypot(ally.x - lastSnapshot.x, ally.z - lastSnapshot.z);
    if (dist <= REVIVE_RANGE && dist < closestDist) {
      closest = ally;
      closestDist = dist;
    }
  }
  return closest;
}

/** True when the player may call in the evac, matching the server's rules. */
function canCallExtraction(): { allowed: boolean; free: boolean } {
  const { currentWave, extractionActive, extractionAvailable, points } = useZombieStore.getState();
  if (extractionActive) return { allowed: false, free: false };

  const free = extractionAvailable || currentWave >= EXTRACTION_CONFIG.unlockWave;
  if (free) return { allowed: true, free: true };

  const manual =
    currentWave >= EXTRACTION_CONFIG.manualMinWave && points >= EXTRACTION_CONFIG.manualCost;
  return { allowed: manual, free: false };
}

// ============================================================================
// Hotkey & Action Handler
// ============================================================================

function HotkeyManager({
  onToggleShop,
  onToggleSettings,
  onToggleLeaderboard,
  onInteractAction,
  menuOpen,
}: {
  onToggleShop: () => void;
  onToggleSettings: () => void;
  onToggleLeaderboard: () => void;
  onInteractAction: () => void;
  menuOpen: boolean;
}) {
  const sendSwitchWeapon = useZombieNetworkStore((s) => s.sendSwitchWeapon);
  const sendStartGame = useZombieNetworkStore((s) => s.sendStartGame);
  const switchToSlot = useWeaponStore((s) => s.switchToSlot);
  const connected = useZombieNetworkStore((s) => s.connected);
  const localIsDead = useZombieNetworkStore((s) => s.localIsDead);
  const reviveTarget = useRef<string | null>(null);
  const reviveTick = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRevive = useCallback(() => {
    if (reviveTick.current) {
      clearInterval(reviveTick.current);
      reviveTick.current = null;
    }
    if (reviveTarget.current) {
      reviveTarget.current = null;
      useZombieNetworkStore.getState().sendCancelRevive();
      useZombieStore.getState().setReviveProgress(0, "");
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (localIsDead || isTyping()) return;
      if (menuOpen && e.code !== "Escape") return;
      switch (e.code) {
        case "KeyF": {
          // Holding [F] next to a downed ally revives them; the server drives
          // the progress bar while we keep the request alive.
          if (e.repeat || reviveTarget.current) break;
          const ally = nearestDownedAlly();
          if (ally && !useZombieNetworkStore.getState().localIsDowned) {
            reviveTarget.current = ally.sessionId;
            useZombieNetworkStore.getState().sendStartRevive(ally.sessionId);
            reviveTick.current = setInterval(() => {
              if (!nearestDownedAlly()) {
                stopRevive();
                return;
              }
              useZombieNetworkStore.getState().sendTickRevive(0);
            }, 250);
            break;
          }
          onInteractAction();
          break;
        }
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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyF") stopRevive();
    };

    const handleWheel = (e: WheelEvent) => {
      if (localIsDead || menuOpen || isTyping()) return;
      const state = useWeaponStore.getState();
      const current = state.activeWeapon;
      const primary = state.primaryWeapon;
      const secondary = state.secondaryWeapon;

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
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("wheel", handleWheel);
      stopRevive();
    };
  }, [
    connected,
    localIsDead,
    menuOpen,
    sendSwitchWeapon,
    sendStartGame,
    switchToSlot,
    onToggleShop,
    onToggleSettings,
    onToggleLeaderboard,
    onInteractAction,
    stopRevive,
  ]);

  return null;
}

// ============================================================================
// Contextual Interaction Prompt Overlay
// ============================================================================

function InteractionPrompt() {
  const lastSnapshot = useZombieNetworkStore((s) => s.lastSnapshot);
  const downedAllies = useZombieNetworkStore((s) => s.downedAllies);
  const localIsDowned = useZombieNetworkStore((s) => s.localIsDowned);
  const barricades = useZombieStore((s) => s.barricades);
  const waveState = useZombieStore((s) => s.waveState);
  const currentWave = useZombieStore((s) => s.currentWave);
  // Recomputed from the store on every position update, hence the read below.
  useZombieStore((s) => s.points);
  useZombieStore((s) => s.extractionActive);

  if (!lastSnapshot) return null;
  const { x, z } = lastSnapshot;

  // Reviving a teammate outranks every other prompt.
  if (!localIsDowned && downedAllies.length > 0) {
    const ally = downedAllies.find(
      (item) => Math.hypot(item.x - x, item.z - z) <= REVIVE_RANGE
    );
    if (ally) {
      return <PromptBadge text={`Hold [F] to Revive ${ally.nickname}`} />;
    }
  }

  const distToMysteryBox = Math.hypot(x - MYSTERY_BOX_POS.x, z - MYSTERY_BOX_POS.z);
  if (distToMysteryBox <= 4) {
    return <PromptBadge text={`Press [F] to Open Mystery Box (${MYSTERY_BOX.price} pts)`} />;
  }

  const distToPaP = Math.hypot(x - PACK_A_PUNCH_POS.x, z - PACK_A_PUNCH_POS.z);
  if (distToPaP <= 4) {
    return (
      <PromptBadge
        text={`Press [F] to Upgrade Weapon (${PACK_A_PUNCH.price.toLocaleString()} pts)`}
      />
    );
  }

  // Check near damaged barricade
  for (const loc of BARRICADE_CONFIG.locations) {
    const distSq = (loc.x - x) ** 2 + (loc.z - z) ** 2;
    if (distSq < 16) {
      const b = barricades.find((item) => item.id === loc.id);
      if (!b || b.boards < BARRICADE_CONFIG.maxBoards) {
        return (
          <PromptBadge
            text={`Press [F] to Repair Barricade (+${ZOMBIE_POINTS.barricadeRepair} pts)`}
          />
        );
      }
    }
  }

  const distToHelipad = Math.hypot(
    x - EXTRACTION_CONFIG.helipadPos.x,
    z - EXTRACTION_CONFIG.helipadPos.z
  );
  if (distToHelipad <= 14) {
    const { allowed, free } = canCallExtraction();
    if (allowed) {
      return (
        <PromptBadge
          text={
            free
              ? "Press [F] to Call Helipad Evac (Free)"
              : `Press [F] to Call Helipad Evac (${EXTRACTION_CONFIG.manualCost.toLocaleString()} pts)`
          }
        />
      );
    }
    if (currentWave < EXTRACTION_CONFIG.manualMinWave) {
      return (
        <PromptBadge
          text={`Evac unlocks at Wave ${EXTRACTION_CONFIG.manualMinWave}`}
        />
      );
    }
    return (
      <PromptBadge
        text={`Evac needs ${EXTRACTION_CONFIG.manualCost.toLocaleString()} pts`}
      />
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
        ...hudPanel("gold"),
        padding: "8px 20px",
        color: "#ffd700",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: 0.4,
        textAlign: "center",
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
        ...hudPanel("red"),
        background: "linear-gradient(150deg, rgba(153, 27, 27, 0.92), rgba(69, 10, 10, 0.9))",
        padding: "10px 28px",
        animation: "pulse 0.6s infinite",
      }}
    >
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: 2, textAlign: "center" }}>
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

    return () => {
      useZombieNetworkStore.getState().disconnect();
    };
  }, []);

  // Joining happens after the lobby closes so the chosen difficulty reaches the
  // room and no wave starts while the setup screen is still up.
  const handleStartGameFromLobby = useCallback(
    async (difficulty: DifficultyLevel) => {
      setLobbyOpen(false);
      useGameStore.getState().setMode("zombie");
      useWeaponStore.getState().syncLoadout({ primary: "", secondary: "deagle", knife: "knife" });
      useWeaponStore.getState().equipWeapon("deagle");

      await connect(nickname || "Survivor", difficulty);
      useZombieNetworkStore.getState().sendStartGame();
    },
    [connect, nickname]
  );

  const handleBackToMenu = useCallback(() => {
    useZombieNetworkStore.getState().disconnect();
    useGameStore.getState().setMode("menu");
  }, []);

  const handleRestart = useCallback(() => {
    setGameOver(false);
    setSettingsOpen(false);
    setShopOpen(false);
    setMysteryBoxOpen(false);
    setPackAPunchOpen(false);
    // Leave cleanly first so the room does not keep a ghost player around.
    useZombieNetworkStore.getState().disconnect();
    setLobbyOpen(true);
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

    // 1. Check near Mystery Box
    const distToMysteryBox = Math.hypot(x - MYSTERY_BOX_POS.x, z - MYSTERY_BOX_POS.z);
    if (distToMysteryBox <= 4) {
      setMysteryBoxOpen(true);
      return;
    }

    // 2. Check near Pack-a-Punch
    const distToPaP = Math.hypot(x - PACK_A_PUNCH_POS.x, z - PACK_A_PUNCH_POS.z);
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
        if (!b || b.boards < BARRICADE_CONFIG.maxBoards) {
          useZombieNetworkStore.getState().sendRepairBarricade(loc.id);
          return;
        }
      }
    }

    // 4. Buy the locked door we are standing at.
    const lockedArea = nearestLockedArea(x, z, useZombieStore.getState().unlockedAreas);
    if (lockedArea && useZombieStore.getState().points >= lockedArea.price) {
      useZombieNetworkStore.getState().sendUnlockArea(lockedArea.id);
      return;
    }

    // 5. Check near helipad for extraction. Paid evac is allowed from the
    // manual unlock wave, exactly like the server accepts it.
    const distToHelipad = Math.hypot(
      x - EXTRACTION_CONFIG.helipadPos.x,
      z - EXTRACTION_CONFIG.helipadPos.z
    );
    if (distToHelipad <= 14 && canCallExtraction().allowed) {
      useZombieNetworkStore.getState().sendTriggerExtraction();
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

      {/* Top Left Menu / Back Button, aligned with the radar below it */}
      <button
        onClick={toggleSettings}
        style={{
          ...hudPanel("red"),
          position: "fixed",
          top: HUD_EDGE,
          left: HUD_EDGE,
          width: 168,
          padding: "7px 12px",
          color: "#f8fafc",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1,
          cursor: "pointer",
          zIndex: HUD_Z.chrome,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#ef4444";
          e.currentTarget.style.color = "#fecaca";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.55)";
          e.currentTarget.style.color = "#f8fafc";
        }}
      >
        ⚙️ MENU [ESC]
      </button>

      <HotkeyManager
        onToggleShop={toggleShop}
        onToggleSettings={toggleSettings}
        onToggleLeaderboard={toggleLeaderboard}
        onInteractAction={handleInteract}
        menuOpen={lobbyOpen || shopOpen || mysteryBoxOpen || packAPunchOpen || settingsOpen}
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

      {/* One centered column so wave / boss / power-up / evac never overlap */}
      <div style={hudBannerStack(HUD_EDGE)}>
        <WaveHUD
          currentWave={currentWave}
          waveState={waveState}
          zombiesRemaining={zombiesRemaining}
          interWaveTimer={interWaveTimer}
        />
        <BossWaveWarning />
        <ActivePowerUpIndicator activePowerUp={activePowerUp} powerUpTimer={powerUpTimer} />
        <ExtractionHUD />
      </div>

      {/* Top-right column: score plus the hotkeys players need mid-run */}
      <div
        style={{
          position: "fixed",
          top: HUD_EDGE,
          right: HUD_EDGE,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          zIndex: HUD_Z.hud,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <PointsDisplay points={points} />
        <div style={{ display: "flex", gap: 4 }}>
          <span style={hudPill("gold")}>[B] SHOP</span>
          <span style={hudPill("neutral")}>[F] USE</span>
          <span style={hudPill("neutral")}>[TAB] SCORE</span>
        </div>
      </div>

      <ZombiePlayerHUD />

      {/* One prompt column above the bottom HUD */}
      <div style={hudPromptStack(150)}>
        <AreaUnlockUI />
        <InteractionPrompt />
      </div>
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
        ...hudPanel("gold"),
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ color: "#ffd700", fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>
        {activePowerUp.replace(/_/g, " ").toUpperCase()}
      </span>
      <span style={{ fontFamily: HUD_MONO, color: "#fff", fontSize: 12, fontWeight: 800 }}>
        {Math.ceil(powerUpTimer)}s
      </span>
    </div>
  );
}
