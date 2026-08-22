import { create } from "zustand";
import { Client, Room } from "colyseus.js";
import {
  GameState,
  ZombieState,
  BarricadeState,
  WEAPONS,
  ZombieBuyFailReason,
  ZombieDifficulty,
} from "@cs-game/shared";
import { useZombieStore } from "./useZombieStore";
import { useWeaponStore, type WeaponKey } from "./useWeaponStore";
import { useNetworkStore } from "./useNetworkStore";
import { zombieSounds } from "../lib/zombieSounds";
import { SERVER_URL } from "../config/network";
import { localZombieEngine } from "../game/zombie/LocalZombieEngine";

const SESSION_KEY = "zombie_room_session";

const BUY_FAIL_MESSAGES: Record<ZombieBuyFailReason, string> = {
  no_money: "Not enough points",
  already_owned: "Already owned",
  unknown_item: "Not available here",
  unavailable: "Can't buy right now",
  too_far: "Move closer",
  locked: "Unlock the previous area first",
  full: "Already at maximum",
};

/** Lets the shop confirm a purchase only after the server accepted it. */
function emitPurchase(item: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("zombiePurchase", { detail: { item } }));
}

/** Mirrors the server loadout onto the viewmodel, ammo counters included. */
function syncLocalWeapon(weapon: string, ammo: number, reserveAmmo: number, silent = true) {
  if (!(weapon in WEAPONS)) return;
  useWeaponStore.getState().equipWeapon(weapon as WeaponKey, {
    ammo,
    reserveAmmo,
    silent,
  });
}

interface ZombieNetworkState {
  client: Client | null;
  room: Room<GameState> | null;
  sessionId: string | null;
  connected: boolean;
  reconnecting: boolean;
  isLocal: boolean;

  // Local player
  localHp: number;
  localMaxHp: number;
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

  soloRevives: number;
  difficulty: ZombieDifficulty;

  // Stats
  kills: number;
  headshots: number;

  /** Downed teammates the local player can walk up to and revive. */
  downedAllies: { sessionId: string; nickname: string; x: number; z: number }[];
  /** Last rejected purchase, so the shop can explain itself. */
  lastBuyFailure: { item: string; message: string; at: number } | null;

  // Snapshot for server reconciliation
  lastSnapshot: { x: number; y: number; z: number; rotationY: number; lastProcessedSeq: number } | null;
  latency: number;

  // Actions
  connect: (nickname: string, difficulty?: ZombieDifficulty) => Promise<void>;
  disconnect: () => void;
  sendInput: (data: any) => void;
  sendShoot: (data: any) => void;
  sendMelee: (data: any) => void;
  sendReload: () => void;
  sendSwitchWeapon: (weapon: string) => void;
  sendBuyWeapon: (weapon: string) => void;
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
  sendHeal: () => void;
}

const FRESH_MATCH_STATE = {
  localHp: 100,
  localMaxHp: 100,
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
  soloRevives: 0,
  kills: 0,
  headshots: 0,
  downedAllies: [],
  lastBuyFailure: null,
  lastSnapshot: null,
} as const;

export const useZombieNetworkStore = create<ZombieNetworkState>((set, get) => ({
  client: null,
  room: null,
  sessionId: null,
  connected: false,
  reconnecting: false,
  isLocal: false,

  ...FRESH_MATCH_STATE,
  downedAllies: [],
  lastBuyFailure: null,
  difficulty: "normal",

  latency: 0,

  connect: async (nickname: string, difficulty: ZombieDifficulty = "normal") => {
    const client = new Client(SERVER_URL);

    // Never inherit HP, points or perks from a previous run.
    set({ ...FRESH_MATCH_STATE, downedAllies: [], lastBuyFailure: null, difficulty, isLocal: false });
    useZombieStore.getState().resetMatch();

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
        room = await client.joinOrCreate<GameState>("zombie_room", { nickname, difficulty });
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
        isLocal: false,
      });

      setupZombieRoom(room);
    } catch (e) {
      console.warn("Failed to join online room, starting local zombie simulation:", e);
      // Fallback to full offline local simulation
      set({
        client: null,
        room: null,
        sessionId: "local_player",
        connected: true,
        reconnecting: false,
        isLocal: true,
      });
      localZombieEngine.init(difficulty);
    }
  },

  disconnect: () => {
    const { room } = get();
    if (room) {
      room.removeAllListeners();
      room.leave();
    }
    localZombieEngine.stop();
    sessionStorage.removeItem(SESSION_KEY);
    useWeaponStore.getState().resetUpgrades();
    set({
      client: null,
      room: null,
      sessionId: null,
      connected: false,
      isLocal: false,
      ...FRESH_MATCH_STATE,
      downedAllies: [],
      lastBuyFailure: null,
    });
    useZombieStore.getState().resetMatch();
  },

  sendInput: (data: any) => {
    const { room, isLocal } = get();
    if (isLocal) {
      // Local position is updated directly by PlayerController / localZombieEngine
      return;
    }
    if (room) room.send("input", data);
  },

  sendShoot: (data: any) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleShoot(data);
      return;
    }
    if (room) room.send("shoot", data);
  },

  sendMelee: (data: any) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleMelee(data);
      return;
    }
    if (room) room.send("melee", data);
  },

  sendReload: () => {
    const { room } = get();
    if (room) room.send("reload");
  },

  sendSwitchWeapon: (weapon: string) => {
    const { room, isLocal } = get();
    if (isLocal) {
      const stats = WEAPONS[weapon as WeaponKey];
      if (stats) {
        useWeaponStore.getState().equipWeapon(weapon as WeaponKey);
      }
      return;
    }
    if (room) room.send("switch_weapon", { weapon });
  },

  sendBuyWeapon: (weapon: string) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleBuyWeapon(weapon);
      return;
    }
    if (room) room.send("buy_weapon", { weapon });
  },

  sendStartGame: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.skipBuyPhase();
      return;
    }
    if (room) room.send("start_game");
  },

  sendBuyAmmo: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleBuyAmmo();
      return;
    }
    if (room) room.send("buy_ammo");
  },

  sendBuyArmor: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleBuyArmor();
      return;
    }
    if (room) room.send("buy_armor");
  },

  sendBuyPerk: (perk: string) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleBuyPerk(perk);
      return;
    }
    if (room) room.send("buy_perk", { perk });
  },

  sendMysteryBox: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleMysteryBox();
      return;
    }
    if (room) room.send("use_mystery_box");
  },

  sendPackAPunch: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handlePackAPunch();
      return;
    }
    if (room) room.send("use_pack_a_punch");
  },

  sendUnlockArea: (areaId: string) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleUnlockArea(areaId);
      return;
    }
    if (room) room.send("unlock_area", { areaId });
  },

  sendRepairBarricade: (barricadeId: string) => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleRepairBarricade(barricadeId);
      return;
    }
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
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handlePickupPowerUp(id);
      return;
    }
    if (room) room.send("pickup_powerup", { id });
  },

  sendHeal: () => {
    const { room, isLocal } = get();
    if (isLocal) {
      localZombieEngine.handleHeal();
      return;
    }
    if (room) room.send("heal");
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
        localMaxHp: localPlayer.hasJuggernog ? 200 : 100,
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
      useWeaponStore.getState().setFireRateMultiplier(localPlayer.hasDoubleTap ? 1.33 : 1);

      useZombieStore.getState().setDownedState(localPlayer.isDowned, localPlayer.downedTimer);

      // The viewmodel and the fire gate follow the server's weapon, otherwise a
      // mystery box swap or a downed pistol lock leaves the old gun in hand.
      syncLocalWeapon(localPlayer.currentWeapon, localPlayer.ammo, localPlayer.reserveAmmo);
    }

    const downedAllies: ZombieNetworkState["downedAllies"] = [];
    state.players.forEach((player, id) => {
      if (id === sessionId || player.isDead || !player.isDowned) return;
      downedAllies.push({ sessionId: id, nickname: player.nickname, x: player.x, z: player.z });
    });
    useZombieNetworkStore.setState({ downedAllies });

    // Trigger waveClear SFX when entering wave_clear state
    if (state.waveState === "wave_clear" && prevWaveState !== "wave_clear") {
      zombieSounds.waveClear();
    }
    // Trigger buy phase SFX when entering buy_phase state
    if (state.waveState === "buy_phase" && prevWaveState !== "buy_phase" && prevWaveState !== "waiting") {
      zombieSounds.powerUp();
    }
    prevWaveState = state.waveState;

    // Update zombie store
    const zombies: ZombieState[] = [];
    state.zombies.forEach((z) => {
      if (!z.isDead) {
        zombies.push({
          id: z.id,
          type: z.type,
          x: z.x,
          y: z.y ?? 0,
          z: z.z,
          hp: z.hp,
          maxHp: z.maxHp,
          speed: z.speed,
          rotationY: z.rotationY,
          targetId: z.targetId,
          isDead: z.isDead,
          isAttacking: z.isAttacking,
          attackCooldown: z.attackCooldown,
        } as any);
      }
    });

    const powerUps: import("@cs-game/shared").PowerUpState[] = [];
    state.powerUps.forEach((powerUp) => {
      powerUps.push(powerUp);
    });

    const barricades: BarricadeState[] = [];
    state.barricades.forEach((b) => {
      barricades.push(b);
    });

    const unlockedAreas: string[] = [];
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

  room.onMessage("matchSetup", (data: { difficulty: ZombieDifficulty; soloRevives: number }) => {
    useZombieNetworkStore.setState({
      difficulty: data.difficulty,
      soloRevives: data.soloRevives,
    });
  });

  // Position snapshot for server reconciliation (handles both formats)
  room.onMessage("snapshot", (data: any) => {
    if (data.players && data.players[room.sessionId]) {
      const p = data.players[room.sessionId];
      useZombieNetworkStore.setState({
        soloRevives: p.soloRevives ?? useZombieNetworkStore.getState().soloRevives,
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

  // Hit marker. Reusing the shared HUD marker also gives us its audio cue.
  room.onMessage("hit", (data: { zombieId: string; damage: number; headshot: boolean }) => {
    zombieSounds.zombieHit();
    useNetworkStore.getState().showHitMarker(data.headshot);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombieHit", { detail: data }));
    }
  });

  room.onMessage("damage", (data: { victimId: string; damage: number }) => {
    if (data.victimId !== room.sessionId) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombieDamageTaken", { detail: data }));
    }
  });

  // Reload complete
  room.onMessage("reloadComplete", (data: { ammo: number; reserveAmmo: number }) => {
    useZombieNetworkStore.setState({ localAmmo: data.ammo, localReserveAmmo: data.reserveAmmo });
    const weapon = useZombieNetworkStore.getState().localWeapon;
    syncLocalWeapon(weapon, data.ammo, data.reserveAmmo);
    useWeaponStore.getState().cancelReload();
  });

  // Ammo bought
  room.onMessage("ammoBought", (data: { ammo: number; reserveAmmo: number }) => {
    useZombieNetworkStore.setState({ localAmmo: data.ammo, localReserveAmmo: data.reserveAmmo });
    syncLocalWeapon(useZombieNetworkStore.getState().localWeapon, data.ammo, data.reserveAmmo);
    zombieSounds.purchase();
    emitPurchase("ammo");
  });

  room.onMessage(
    "weaponBought",
    (data: { weapon: string; ammo: number; reserveAmmo: number }) => {
      useZombieNetworkStore.setState({
        localWeapon: data.weapon,
        localAmmo: data.ammo,
        localReserveAmmo: data.reserveAmmo,
      });
      syncLocalWeapon(data.weapon, data.ammo, data.reserveAmmo, false);
      zombieSounds.purchase();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("zombieWeaponBought", { detail: data }));
      }
    }
  );

  room.onMessage(
    "weaponSwitched",
    (data: { weapon: string; ammo: number; reserveAmmo: number; dualWield?: boolean }) => {
      useZombieNetworkStore.setState({
        localWeapon: data.weapon,
        localAmmo: data.ammo,
        localReserveAmmo: data.reserveAmmo,
      });
      syncLocalWeapon(data.weapon, data.ammo, data.reserveAmmo, false);
      // Sync dual wield state from server
      if (data.dualWield !== undefined) {
        useWeaponStore.getState().setDualWield(data.dualWield);
      }
    }
  );

  room.onMessage("zombieBuyFailed", (data: { item: string; reason: ZombieBuyFailReason }) => {
    useZombieNetworkStore.setState({
      lastBuyFailure: {
        item: data.item,
        message: BUY_FAIL_MESSAGES[data.reason] ?? "Purchase failed",
        at: Date.now(),
      },
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zombieBuyFailed", { detail: data }));
    }
  });

  // Armor bought
  room.onMessage("armorBought", (data: { armor: number }) => {
    useZombieNetworkStore.setState({ localArmor: data.armor });
    zombieSounds.purchase();
    emitPurchase("armor");
  });

  // Perk bought
  room.onMessage("perkBought", (data: { perk: string }) => {
    zombieSounds.powerUp();
    emitPurchase(data?.perk ?? "perk");
  });

  // Game started
  room.onMessage("gameStarted", (data: { wave: number }) => {
    useZombieStore.setState({ currentWave: data.wave, waveState: "buy_phase" });
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
  room.onMessage(
    "playerRevived",
    (data: { targetId: string; reviverId: string; revivesLeft?: number }) => {
      zombieSounds.powerUp();
      useZombieStore.getState().setReviveProgress(0, "");
      if (data.targetId === room.sessionId) {
        useZombieNetworkStore.setState({
          localIsDowned: false,
          localDownedTimer: 0,
          ...(typeof data.revivesLeft === "number" ? { soloRevives: data.revivesLeft } : {}),
        });
      }
    }
  );

  // Revive progress; only my own revives belong on my screen.
  room.onMessage("reviveProgress", (data: { reviverId: string; targetId: string; progress: number }) => {
    if (data.reviverId !== room.sessionId && data.targetId !== room.sessionId) return;
    const ally = useZombieNetworkStore
      .getState()
      .downedAllies.find((a) => a.sessionId === data.targetId);
    useZombieStore.getState().setReviveProgress(data.progress, ally?.nickname ?? "");
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
  room.onMessage("packAPunchComplete", (data: { weapon: string; dualWield?: boolean }) => {
    zombieSounds.powerUp();
    useWeaponStore.getState().setHasPackAPunch(true);
    if (data.dualWield) {
      useWeaponStore.getState().setDualWield(true);
    }
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
