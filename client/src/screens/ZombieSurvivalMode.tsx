import { useEffect, useCallback, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ZombieArcadeController } from "../game/player/ZombieArcadeController";
import { ShootingSystem } from "../game/weapons/ShootingSystem";
import { ReloadSystem } from "../game/weapons/ReloadSystem";
import { HitMarker } from "../components/HitMarker";
import { DamageVignette } from "../components/DamageVignette";
import { DownedOverlay } from "../components/DownedOverlay";
import { AudioManager } from "../components/AudioManager";
import { ZombieArena } from "../game/map/ZombieArena";
import { ZombieRenderer } from "../game/zombie/ZombieRenderer";
import { PowerUpRenderer } from "../game/zombie/PowerUpRenderer";
import { localZombieEngine } from "../game/zombie/LocalZombieEngine";
import { ZombieMinimap } from "../components/ZombieMinimap";
import { WaveHUD } from "../ui/components/hud/WaveHUD";
import { PointsDisplay } from "../ui/components/hud/PointsDisplay";
import { ExtractionHUD } from "../ui/components/hud/ExtractionHUD";
import { ZombiePlayerHUD } from "../ui/components/hud/ZombiePlayerHUD";
import { WeaponShop } from "../ui/components/zombie/WeaponShop";
import { MysteryBox } from "../ui/components/zombie/MysteryBox";
import { PackAPunch } from "../ui/components/zombie/PackAPunch";
import { AreaUnlockUI, nearestLockedArea } from "../ui/components/zombie/AreaUnlockUI";
import {
  isNearAmmoCrate,
  isNearMedStation,
  nearestPerkMachine,
  nearestWallBuy,
} from "../game/zombie/zombieWorldInteract";
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
  MED_STATION,
  MYSTERY_BOX,
  MYSTERY_BOX_POS,
  PACK_A_PUNCH,
  PACK_A_PUNCH_POS,
  ZOMBIE_INTERACT_RANGE,
  ZOMBIE_POINTS,
  ZOMBIE_SHOP,
} from "@cs-game/shared";
import { HUD_EDGE, HUD_MONO, HUD_Z, hudActionButton, hudBannerStack, hudPanel, hudPromptStack } from "../ui/hudTheme";

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
  onEscape,
  onToggleLeaderboard,
  onInteractAction,
  menuOpen,
}: {
  onToggleShop: () => void;
  onEscape: () => void;
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
  const healTick = useRef<ReturnType<typeof setInterval> | null>(null);
  const healStart = useRef(0);

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

  const stopHeal = useCallback(() => {
    if (healTick.current) {
      clearInterval(healTick.current);
      healTick.current = null;
    }
    useZombieStore.getState().setHealProgress(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (localIsDead || isTyping()) return;
      // When a menu is open, only toggle keys (B, Tab, Escape) pass through
      // so the user can close the menu with the same key that opened it.
      const isToggleKey = e.code === "KeyB" || e.code === "Tab" || e.code === "Escape" || e.code === "KeyL";
      if (menuOpen && !isToggleKey) return;
      switch (e.code) {
        case "KeyF": {
          // Holding [F] next to a downed ally revives them; the server drives
          // the progress bar while we keep the request alive.
          if (e.repeat || reviveTarget.current || healTick.current) break;
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
          const snap = useZombieNetworkStore.getState().lastSnapshot;
          const net = useZombieNetworkStore.getState();
          const maxHp = Math.max(net.hasJuggernog ? 200 : 100, net.localMaxHp || 0);
          if (snap && isNearMedStation(snap.x, snap.z) && net.localHp < maxHp) {
            healStart.current = performance.now();
            useZombieStore.getState().setHealProgress(0.01);
            healTick.current = setInterval(() => {
              const liveSnap = useZombieNetworkStore.getState().lastSnapshot;
              if (!liveSnap || !isNearMedStation(liveSnap.x, liveSnap.z)) {
                stopHeal();
                return;
              }
              const progress = Math.min(
                1,
                (performance.now() - healStart.current) / 1000 / MED_STATION.channelSec
              );
              useZombieStore.getState().setHealProgress(progress);
              if (progress >= 1) {
                stopHeal();
                useZombieNetworkStore.getState().sendHeal();
              }
            }, 50);
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
          e.preventDefault();
          onEscape();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyF") {
        stopRevive();
        stopHeal();
      }
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
      stopHeal();
    };
  }, [
    connected,
    localIsDead,
    menuOpen,
    sendSwitchWeapon,
    sendStartGame,
    switchToSlot,
    onToggleShop,
    onEscape,
    onToggleLeaderboard,
    onInteractAction,
    stopRevive,
    stopHeal,
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
  const localHp = useZombieNetworkStore((s) => s.localHp);
  const localMaxHp = useZombieNetworkStore((s) => s.localMaxHp);
  const hasJuggernog = useZombieNetworkStore((s) => s.hasJuggernog);
  const hasSpeedCola = useZombieNetworkStore((s) => s.hasSpeedCola);
  const hasDoubleTap = useZombieNetworkStore((s) => s.hasDoubleTap);
  const hasQuickRevive = useZombieNetworkStore((s) => s.hasQuickRevive);
  const barricades = useZombieStore((s) => s.barricades);
  const waveState = useZombieStore((s) => s.waveState);
  const currentWave = useZombieStore((s) => s.currentWave);
  const healProgress = useZombieStore((s) => s.healProgress);
  const points = useZombieStore((s) => s.points);
  const fireSale = useZombieStore((s) => s.activePowerUp) === "fire_sale";
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

  const maxHp = Math.max(hasJuggernog ? 200 : 100, localMaxHp || 0);
  if (isNearMedStation(x, z) && localHp < maxHp) {
    if (healProgress > 0) {
      return (
        <PromptBadge
          text={`Healing… ${Math.round(healProgress * 100)}%`}
        />
      );
    }
    const canAfford = points >= MED_STATION.price;
    return (
      <PromptBadge
        text={
          canAfford
            ? `Hold [F] to Heal (${MED_STATION.price} pts)`
            : `Med Station needs ${MED_STATION.price} pts`
        }
      />
    );
  }

  const wallBuy = nearestWallBuy(x, z);
  if (wallBuy) {
    return (
      <PromptBadge
        text={`Press [F] to Buy ${wallBuy.weapon.toUpperCase()} (${wallBuy.price.toLocaleString()} pts)`}
      />
    );
  }

  const perkMachine = nearestPerkMachine(x, z);
  if (perkMachine) {
    const owned =
      (perkMachine.perk === "juggernog" && hasJuggernog) ||
      (perkMachine.perk === "speedcola" && hasSpeedCola) ||
      (perkMachine.perk === "doubletap" && hasDoubleTap) ||
      (perkMachine.perk === "quickrevive" && hasQuickRevive);
    if (owned) {
      return <PromptBadge text={`${perkMachine.perk.toUpperCase()} owned`} />;
    }
    return (
      <PromptBadge
        text={`Press [F] to Buy ${perkMachine.perk.toUpperCase()} (${perkMachine.price.toLocaleString()} pts)`}
      />
    );
  }

  if (isNearAmmoCrate(x, z)) {
    return (
      <PromptBadge text={`Press [F] to Buy Ammo (${ZOMBIE_SHOP.ammoPrice} pts)`} />
    );
  }

  const distToMysteryBox = Math.hypot(x - MYSTERY_BOX_POS.x, z - MYSTERY_BOX_POS.z);
  if (distToMysteryBox <= ZOMBIE_INTERACT_RANGE) {
    const boxPrice = fireSale ? MYSTERY_BOX.fireSalePrice : MYSTERY_BOX.price;
    return <PromptBadge text={`Press [F] to Open Mystery Box (${boxPrice} pts)`} />;
  }

  const distToPaP = Math.hypot(x - PACK_A_PUNCH_POS.x, z - PACK_A_PUNCH_POS.z);
  if (distToPaP <= ZOMBIE_INTERACT_RANGE) {
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

  // Buy phase prompt — remind the player to gear up
  if (waveState === "buy_phase") {
    return (
      <PromptBadge text="BUY PHASE — [B] shop · [F] wall-buy/heal · [SPACE] start wave" />
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

function LocalZombieUpdater({ paused }: { paused: boolean }) {
  useFrame((_, dt) => {
    if (paused) return;
    if (useZombieNetworkStore.getState().isLocal) {
      localZombieEngine.update(dt);
    }
  });
  return null;
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
  const paused = settingsOpen || shopOpen || mysteryBoxOpen || packAPunchOpen || gameOver || leaderboardOpen;

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
      // Local init already opens buy_phase. Online still needs start_game to
      // leave waiting — without skipping that first buy window.
      if (!useZombieNetworkStore.getState().isLocal) {
        useZombieNetworkStore.getState().sendStartGame();
      }
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

  const handleEscape = useCallback(() => {
    if (shopOpen) {
      setShopOpen(false);
      return;
    }
    if (mysteryBoxOpen) {
      setMysteryBoxOpen(false);
      return;
    }
    if (packAPunchOpen) {
      setPackAPunchOpen(false);
      return;
    }
    if (leaderboardOpen) {
      setLeaderboardOpen(false);
      return;
    }
    setSettingsOpen((open) => !open);
  }, [shopOpen, mysteryBoxOpen, packAPunchOpen, leaderboardOpen]);

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
    if (distToMysteryBox <= ZOMBIE_INTERACT_RANGE) {
      setMysteryBoxOpen(true);
      return;
    }

    // 2. Check near Pack-a-Punch
    const distToPaP = Math.hypot(x - PACK_A_PUNCH_POS.x, z - PACK_A_PUNCH_POS.z);
    if (distToPaP <= ZOMBIE_INTERACT_RANGE) {
      setPackAPunchOpen(true);
      return;
    }

    const wallBuy = nearestWallBuy(x, z);
    if (wallBuy) {
      useZombieNetworkStore.getState().sendBuyWeapon(wallBuy.weapon);
      return;
    }

    const perkMachine = nearestPerkMachine(x, z);
    if (perkMachine) {
      useZombieNetworkStore.getState().sendBuyPerk(perkMachine.perk);
      return;
    }

    if (isNearAmmoCrate(x, z)) {
      useZombieNetworkStore.getState().sendBuyAmmo();
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
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#121826" }}>
      {lobbyOpen && (
        <ZombieLobbySetup
          onStart={handleStartGameFromLobby}
          onBack={handleBackToMenu}
        />
      )}

      {!lobbyOpen && (
        <>
      {/* Top Left Menu / Back Button, aligned with the radar below it */}
      <button
        onClick={() => {
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          setShopOpen(false);
          setMysteryBoxOpen(false);
          setPackAPunchOpen(false);
          setLeaderboardOpen(false);
          setSettingsOpen(true);
        }}
        style={{
          ...hudActionButton("red"),
          position: "fixed",
          top: HUD_EDGE,
          left: HUD_EDGE,
          width: 168,
          justifyContent: "center",
          zIndex: HUD_Z.chrome,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#ef4444";
          e.currentTarget.style.color = "#fecaca";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.55)";
          e.currentTarget.style.color = "#f87171";
        }}
      >
        ⚙️ MENU [ESC]
      </button>

      <HotkeyManager
        onToggleShop={toggleShop}
        onEscape={handleEscape}
        onToggleLeaderboard={toggleLeaderboard}
        onInteractAction={handleInteract}
        menuOpen={lobbyOpen || shopOpen || mysteryBoxOpen || packAPunchOpen || settingsOpen || leaderboardOpen}
      />

      <Canvas shadows camera={{ fov: 50, position: [0, 18, -14] }} style={{ cursor: "crosshair" }}>
        <color attach="background" args={["#1a2333"]} />
        <fog attach="fog" args={["#1a2333", 40, 130]} />
        <ambientLight intensity={0.55} color="#9aabbc" />
        <directionalLight castShadow position={[15, 30, 10]} intensity={1.15} color="#d5e0ee" />
        <Physics gravity={[0, -9.81, 0]}>
          <ZombieArena />
          <ZombieArcadeController paused={paused} />
        </Physics>
        <LocalZombieUpdater paused={paused} />
        <ShootingSystem />
        <ReloadSystem />
        <ZombieRenderer zombies={zombies} />
        <PowerUpRenderer powerUps={powerUps} onPickup={handlePickup} playerPosition={playerPos} />
      </Canvas>

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

      {/* Top-right interactive command bar */}
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
          userSelect: "none",
        }}
      >
        <PointsDisplay points={points} />
        <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleShop();
            }}
            title="Open Weapon Shop [B]"
            style={hudActionButton("gold")}
          >
            [B] SHOP
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLeaderboard();
            }}
            title="Toggle Scoreboard [TAB]"
            style={hudActionButton("blue")}
          >
            [TAB] SCORE
          </button>
          {(waveState === "buy_phase" || waveState === "wave_clear" || waveState === "waiting") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                useZombieNetworkStore.getState().sendStartGame();
              }}
              title="Start Wave Now [SPACE]"
              style={hudActionButton("red")}
            >
              [SPACE] START
            </button>
          )}
        </div>
      </div>

      <ZombiePlayerHUD />

      {/* One prompt column above the bottom HUD */}
      <div style={hudPromptStack(150)}>
        <AreaUnlockUI />
        <InteractionPrompt />
      </div>
        </>
      )}
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
