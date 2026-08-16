import { create } from "zustand";
import { Client, Room } from "colyseus.js";
import { GameState, ZombieState, BarricadeState } from "@cs-game/shared";
import { useZombieStore } from "./useZombieStore";
import { zombieSounds } from "../lib/zombieSounds";
import { SERVER_URL } from "../config/network";

const SESSION_KEY = "zombie_room_session";

interface ZombieNetworkState {
  client: Client | null;
  room: Room<GameState> | null;
  sessionId: string | null;
  connected: boolean;
  reconnecting: boolean;

  // Local player
  localHp: number;
  localIsDead: boolean;
  localIsDowned: boolean;
  localDownedTimer: number;
  localWeapon: string;
  localAmmo: number;
  localReserveAmmo: number;
  localArmor: number;
  hasJuggernog: boolean;
  hasSpeedCola: boolean;
  hasDoubleTap: boolean;
  hasQuickRevive: boolean;
  hasPackAPunch: boolean;

  // Stats
  kills: number;
  headshots: number;

  // Snapshot for server reconciliation
  lastSnapshot: { x: number; y: number; z: number; rotationY: number; lastProcessedSeq: number } | null;
  latency: number;

  // Actions
  connect: (nickname: string) => Promise<void>;
  disconnect: () => void;
  sendInput: (data: any) => void;
  sendShoot: (data: any) => void;
  sendReload: () => void;
  sendSwitchWeapon: (weapon: string) => void;
  sendStartGame: () => void;
  sendBuyAmmo: () => void;
  sendBuyArmor: () => void;
  sendBuyPerk: (perk: string) => void;
  sendMysteryBox: () => void;
  sendPackAPunch: () => void;
  sendUnlockArea: (areaId: string) => void;
  sendRepairBarricade: (barricadeId: string) => void;
  sendTriggerExtraction: () => void;
  sendStartRevive: (targetId: string) => void;
  sendCancelRevive: () => void;
  sendTickRevive: (progress: number) => void;
  sendPickupPowerUp: (id: string) => void;
}

export const useZombieNetworkStore = create<ZombieNetworkState>((set, get) => ({
  client: null,
  room: null,
  sessionId: null,
  connected: false,
  reconnecting: false,

  localHp: 100,
  localIsDead: false,
  localIsDowned: false,
  localDownedTimer: 0,
  localWeapon: "deagle",
  localAmmo: 14,
  localReserveAmmo: 70,
  localArmor: 0,
  hasJuggernog: false,
  hasSpeedCola: false,
  hasDoubleTap: false,
  hasQuickRevive: false,
  hasPackAPunch: false,

  kills: 0,
  headshots: 0,

  lastSnapshot: null,
  latency: 0,

  connect: async (nickname: string) => {
    const client = new Client(SERVER_URL);

    try {
      let room: Room<GameState> | null = null;

      // Try reconnect first
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.reconnectionToken && (!parsed.savedAt || Date.now() - parsed.savedAt < 300_000)) {
            room = await client.reconnect<GameState>(parsed.reconnectionToken);
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }

      if (!room) {
        room = await client.joinOrCreate<GameState>("zombie_room", { nickname });
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ reconnectionToken: room.reconnectionToken, savedAt: Date.now() })
        );
      }

      set({
        client,
        room,
        sessionId: room.sessionId,
        connected: true,
        reconnecting: false,
      });

      setupZombieRoom(room);
    } catch (e) {
      console.error("Failed to join zombie room:", e);
      set({ connected: false, reconnecting: false });
    }
  },

  disconnect: () => {
    const { room } = get();
    if (room) {
      room.leave();
    }
    sessionStorage.removeItem(SESSION_KEY);
    set({
      client: null,
      room: null,
      sessionId: null,
      connected: false,
    });
  },

  sendInput: (data: any) => {
    const { room } = get();
    if (room) room.send("input", data);
  },

  sendShoot: (data: any) => {
    const { room } = get();
    if (room) room.send("shoot", data);
  },

  sendReload: () => {
    const { room } = get();
    if (room) room.send("reload");
  },

  sendSwitchWeapon: (weapon: string) => {
    const { room } = get();
    if (room) room.send("switch_weapon", { weapon });
  },

  sendStartGame: () => {
    const { room } = get();
    if (room) room.send("start_game");
  },

  sendBuyAmmo: () => {
    const { room } = get();
    if (room) room.send("buy_ammo");
  },

  sendBuyArmor: () => {
    const { room } = get();
    if (room) room.send("buy_armor");
  },

  sendBuyPerk: (perk: string) => {
    const { room } = get();
    if (room) room.send("buy_perk", { perk });
  },

  sendMysteryBox: () => {
    const { room } = get();
    if (room) room.send("use_mystery_box");
  },

  sendPackAPunch: () => {
    const { room } = get();
    if (room) room.send("use_pack_a_punch");
  },

  sendUnlockArea: (areaId: string) => {
    const { room } = get();
    if (room) room.send("unlock_area", { areaId });
  },

  sendRepairBarricade: (barricadeId: string) => {
    const { room } = get();
    if (room) room.send("repair_barricade", { barricadeId });
  },

  sendTriggerExtraction: () => {
    const { room } = get();
    if (room) room.send("trigger_extraction");
  },

  sendStartRevive: (targetId: string) => {
    const { room } = get();
    if (room) room.send("start_revive", { targetId });
  },

  sendCancelRevive: () => {
    const { room } = get();
    if (room) room.send("cancel_revive");
  },

  sendTickRevive: (progress: number) => {
    const { room } = get();
    if (room) room.send("tick_revive", { progress });
  },

  sendPickupPowerUp: (id: string) => {
    const { room } = get();
    if (room) room.send("pickup_powerup", { id });
  },
}));

function setupZombieRoom(room: Room<GameState>) {
  let prevWaveState = "";

  // State changes from server
  room.onStateChange((state: GameState) => {
    const sessionId = room.sessionId;
    const localPlayer = state.players.get(sessionId);

    // Update local player state
    if (localPlayer) {
      useZombieNetworkStore.setState({
        localHp: localPlayer.hp,
        localIsDead: localPlayer.isDead,
        localIsDowned: localPlayer.isDowned,
        localDownedTimer: localPlayer.downedTimer,
        localWeapon: localPlayer.currentWeapon,
        localAmmo: localPlayer.ammo,
        localReserveAmmo: localPlayer.reserveAmmo,
        localArmor: localPlayer.armor,
        hasJuggernog: localPlayer.hasJuggernog,
        hasSpeedCola: localPlayer.hasSpeedCola,
        hasDoubleTap: localPlayer.hasDoubleTap,
        hasQuickRevive: localPlayer.hasQuickRevive,
        hasPackAPunch: localPlayer.hasPackAPunch,
      });

      useZombieStore.getState().setDownedState(localPlayer.isDowned, localPlayer.downedTimer);
    }

    // Trigger waveClear SFX when entering wave_clear state
    if (state.waveState === "wave_clear" && prevWaveState !== "wave_clear") {
      zombieSounds.waveClear();
    }
    prevWaveState = state.waveState;

    // Update zombie store
    const zombies: ZombieState[] = [];
    state.zombies.forEach((zombie) => {
      zombies.push(zombie);
    });

    const powerUps: import("@cs-game/shared").PowerUpState[] = [];
    state.powerUps.forEach((powerUp) => {
      powerUps.push(powerUp);
    });

    const barricades: BarricadeState[] = [];
    state.barricades.forEach((b) => {
      barricades.push(b);
    });

    const unlockedAreas: string[] = ["spawn"];
    state.unlockedAreas.forEach((_val, areaId) => {
      if (!unlockedAreas.includes(areaId)) unlockedAreas.push(areaId);
    });

    const points = state.points.get(sessionId) ?? 0;

    useZombieStore.setState({
      zombies,
      powerUps,
      barricades,
      unlockedAreas,
      currentWave: state.currentWave,
      waveState: state.waveState,
      zombiesRemaining: state.zombiesRemaining,
      interWaveTimer: state.interWaveTimer,
      points,
      activePowerUp: (state.activePowerUp || null) as import("@cs-game/shared").PowerUpType | null,
      powerUpTimer: state.powerUpTimer,
      extractionActive: state.extractionActive,
      extractionTimer: state.extractionTimer,
      extractionAvailable: state.extractionAvailable,
      evacSuccess: state.evacSuccess,
    });
  });

  // Position snapshot for server reconciliation (handles both formats)
  room.onMessage("snapshot", (data: any) => {
    if (data.players && data.players[room.sessionId]) {
      const p = data.players[room.sessionId];
      useZombieNetworkStore.setState({
        lastSnapshot: {
          x: p.x,
          y: p.y,
          z: p.z,
          rotationY: p.rotationY,
          lastProcessedSeq: p.lastProcessedSeq ?? 0,
        },
      });
    } else if (typeof data.x === "number") {
      useZombieNetworkStore.setState({
        lastSnapshot: {
          x: data.x,
          y: data.y,
          z: data.z,
          rotationY: data.rotationY ?? 0,
          lastProcessedSeq: data.lastProcessedSeq ?? 0,
        },
      });
    }
  });

  // Zombie killed (points already handled by onStateChange)
  room.onMessage("zombieKilled", (data: { zombieId: string; killerId: string; points: number; headshot?: boolean }) => {
    const sessionId = room.sessionId;
    if (data.killerId === sessionId) {
      useZombieNetworkStore.setState((s) => ({
        kills: s.kills + 1,
        headshots: data.headshot ? s.headshots + 1 : s.headshots,
      }));
      zombieSounds.zombieDeath();
    }
  });

  // Hit marker
  room.onMessage("hit", (data: { zombieId: string; damage: number; headshot: boolean }) => {
    zombieSounds.zombieHit();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombieHit", { detail: data }));
    }
  });

  // Reload complete
  room.onMessage("reloadComplete", (data: { ammo: number; reserveAmmo: number }) => {
    useZombieNetworkStore.setState({ localAmmo: data.ammo, localReserveAmmo: data.reserveAmmo });
  });

  // Ammo bought
  room.onMessage("ammoBought", (data: { ammo: number; reserveAmmo: number }) => {
    useZombieNetworkStore.setState({ localAmmo: data.ammo, localReserveAmmo: data.reserveAmmo });
    zombieSounds.purchase();
  });

  // Armor bought
  room.onMessage("armorBought", (data: { armor: number }) => {
    useZombieNetworkStore.setState({ localArmor: data.armor });
    zombieSounds.purchase();
  });

  // Perk bought
  room.onMessage("perkBought", () => {
    zombieSounds.powerUp();
  });

  // Game started
  room.onMessage("gameStarted", (data: { wave: number }) => {
    useZombieStore.setState({ currentWave: data.wave, waveState: "spawning" });
    zombieSounds.waveStart();
  });

  // Player downed
  room.onMessage("playerDowned", (data: { sessionId: string; timer: number }) => {
    if (data.sessionId === room.sessionId) {
      useZombieNetworkStore.setState({ localIsDowned: true, localDownedTimer: data.timer });
      useZombieStore.getState().setDownedState(true, data.timer);
      zombieSounds.playerDeath();
    }
  });

  // Player revived
  room.onMessage("playerRevived", () => {
    zombieSounds.powerUp();
    useZombieStore.getState().setReviveProgress(0, "");
  });

  // Revive progress
  room.onMessage("reviveProgress", (data: { reviverId: string; targetId: string; progress: number }) => {
    useZombieStore.getState().setReviveProgress(data.progress, data.targetId);
  });

  // Player died
  room.onMessage("playerDied", (data: { sessionId: string }) => {
    if (data.sessionId === room.sessionId) {
      useZombieNetworkStore.setState({ localIsDead: true, localIsDowned: false });
      useZombieStore.getState().setDownedState(false, 0);
      zombieSounds.playerDeath();
    }
  });

  // Game Over
  room.onMessage("gameOver", (data: { wave: number; kills: number; headshots: number }) => {
    useZombieNetworkStore.setState({ kills: data.kills, headshots: data.headshots });
  });

  // Barricade events
  room.onMessage("barricadeRepaired", () => {
    zombieSounds.purchase();
  });

  room.onMessage("allBarricadesRepaired", () => {
    zombieSounds.powerUp();
  });

  // Extraction events
  room.onMessage("extractionStarted", () => {
    zombieSounds.waveStart();
  });

  room.onMessage("extractionSuccess", () => {
    zombieSounds.powerUp();
    useZombieStore.setState({ evacSuccess: true });
  });

  room.onMessage("extractionFailed", () => {
    zombieSounds.playerDeath();
  });

  // Power-up collected
  room.onMessage("powerUpCollected", () => {
    zombieSounds.powerUp();
  });

  // Power-up activated
  room.onMessage("powerUpActivated", () => {
    zombieSounds.powerUp();
  });

  // Mystery box spin
  room.onMessage("mysteryBoxSpin", (data: { weapon: string }) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mysteryBoxSpin", { detail: data }));
    }
  });

  // Mystery box result
  room.onMessage("mysteryBoxResult", (data: { weapon: string }) => {
    zombieSounds.purchase();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mysteryBoxResult", { detail: data }));
    }
  });

  // Pack-a-Punch complete
  room.onMessage("packAPunchComplete", () => {
    zombieSounds.powerUp();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("packAPunchComplete"));
    }
  });

  // Area unlocked
  room.onMessage("areaUnlocked", (data: { areaId: string; name: string }) => {
    zombieSounds.powerUp();
    const current = useZombieStore.getState().unlockedAreas;
    useZombieStore.setState({ unlockedAreas: [...current, data.areaId] });
  });

  // Leave
  room.onLeave(() => {
    useZombieNetworkStore.setState({ connected: false, room: null, sessionId: null });
  });
}
