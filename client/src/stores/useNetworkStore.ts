import { create } from "zustand";
import { Client, Room } from "colyseus.js";
import {
  GameState,
  PlayerState,
  Snapshot,
  ROUND,
  WEAPONS,
  RoundPhase,
  BuyFailedMessage,
} from "@cs-game/shared";
import { useWeaponStore, type WeaponKey } from "./useWeaponStore";
import { Sound } from "../components/AudioManager";
import { useGameStore } from "./useGameStore";
import { startKillCamRecording, stopKillCamRecording } from "./useKillCamStore";
import { SERVER_URL } from "../config/network";
import { gameEvents } from "../lib/gameEvents";

interface RemotePlayer {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  nickname: string;
  team: string;
  hp: number;
  isDead: boolean;
  currentWeapon: string;
  hasBomb: boolean;
  kills: number;
  deaths: number;
  isSprinting: boolean;
  isCrouching: boolean;
}

interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

interface DamageEvent {
  shooterId: string;
  victimId: string;
  damage: number;
  hp: number;
  headshot: boolean;
}

interface RoundState {
  phase: RoundPhase;
  roundTimeLeft: number;
  buyPhaseTimeLeft: number;
  roundNumber: number;
  teamRedScore: number;
  teamBlueScore: number;
  bombPlanted: boolean;
  bombTimeLeft: number;
  bombSite: string;
  isHalfTime: boolean;
  isOvertime: boolean;
  isSuddenDeath: boolean;
  readyCount: number;
  maxRounds: number;
  gameMode: string;
  kothCapturingTeam: string;
  kothCaptureProgress: number;
  kothScoreT: number;
  kothScoreCT: number;
}

interface VoteRequest {
  targetId: string;
  targetNickname: string;
  initiatorId: string;
}

interface SmokeData {
  x: number;
  z: number;
  timeLeft: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: string;
  message: string;
  team?: string;
  timestamp: number;
}

interface NetworkState {
  client: Client | null;
  room: Room<GameState> | null;
  sessionId: string | null;
  connected: boolean;
  reconnecting: boolean;
  remotePlayers: Map<string, RemotePlayer>;
  lastSnapshot: Snapshot | null;
  ping: number;
  pingHistory: number[];
  latency: number;
  killFeed: KillEvent[];
  hitMarker: { headshot: boolean; timestamp: number } | null;
  round: RoundState;
  playerScores: Map<string, number>;
  smokes: SmokeData[];
  localHp: number;
  localIsDead: boolean;
  localMoney: number;
  localTeam: string;
  localWeapon: string;
  localPrimaryWeapon: string;
  localSecondaryWeapon: string;
  localKnifeSlot: string;
  localAmmo: number;
  localReserveAmmo: number;
  localArmor: number;
  localHelmet: boolean;
  localGrenadeHE: number;
  localGrenadeSmoke: number;
  localGrenadeFlash: number;
  localHasBomb: boolean;
  localReady: boolean;
  localKills: number;
  localDeaths: number;
  localX: number;
  localZ: number;
  localRotationY: number;
  droppedBombPos: { x: number; y: number; z: number } | null;
  voteRequest: VoteRequest | null;
  chatMessages: ChatMessage[];
  deathRecap: { killerName: string; weapon: string; headshot: boolean } | null;
  connectionError: string | null;
  reconnectDeadline: number;

  connect: (nickname: string, mode?: string, team?: "T" | "CT" | "auto") => Promise<void>;
  joinRoomById: (roomId: string, nickname: string) => Promise<void>;
  disconnect: () => void;
  sendInput: (input: Record<string, unknown>) => void;
  sendShoot: (data: Record<string, unknown>) => void;
  sendReload: () => void;
  sendBuy: (item: string) => void;
  sendReady: () => void;
  sendPlantStart: (site: "A" | "B") => void;
  sendPlantCancel: () => void;
  sendDefuseStart: (kit: boolean) => void;
  sendDefuseCancel: () => void;
  sendPickupBomb: () => void;
  sendSwitchWeapon: (slot: number) => void;
  sendMelee: (direction: { x: number; y: number; z: number }) => void;
  sendThrowGrenade: (data: { type: "he" | "smoke" | "flash"; origin: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } }) => void;
  sendFFVote: (vote: boolean) => void;
  sendGameMode: (mode: string) => void;
  sendVoteRequest: (targetId: string) => void;
  sendVote: (targetId: string, vote: boolean) => void;
  sendChat: (message: string) => void;
  addKillEvent: (event: KillEvent) => void;
  showHitMarker: (headshot: boolean) => void;
  measurePing: () => void;
}

const initialRound: RoundState = {
  phase: "waiting",
  roundTimeLeft: 0,
  buyPhaseTimeLeft: 0,
  roundNumber: 1,
  teamRedScore: 0,
  teamBlueScore: 0,
  bombPlanted: false,
  bombTimeLeft: 0,
  bombSite: "",
  isHalfTime: false,
  isOvertime: false,
  isSuddenDeath: false,
  readyCount: 0,
  maxRounds: ROUND.maxRounds,
  gameMode: "bomb_defusal",
  kothCapturingTeam: "",
  kothCaptureProgress: 0,
  kothScoreT: 0,
  kothScoreCT: 0,
};

const SESSION_KEY = "cs_game_session";
const MAX_RECONNECT_ATTEMPTS = 12;
const RECONNECT_WINDOW_MS = 60_000; // matches SERVER.reconnectTTL (60s)

// ─── Reconnect bookkeeping ──────────────────────────────────────
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
let retryNickname = "";
let retryMode = "bomb_defusal";

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryCount = 0;
}

export const useNetworkStore = create<NetworkState>()((set, get) => ({
  client: null,
  room: null,
  sessionId: null,
  connected: false,
  reconnecting: false,
  remotePlayers: new Map(),
  lastSnapshot: null,
  ping: 0,
  pingHistory: [],
  latency: 0,
  killFeed: [],
  hitMarker: null,
  round: { ...initialRound },
  playerScores: new Map(),
  smokes: [],
  localHp: 100,
  localIsDead: false,
  localMoney: 800,
  localTeam: "",
  localWeapon: "",
  localPrimaryWeapon: "",
  localSecondaryWeapon: "",
  localKnifeSlot: "knife",
  localAmmo: 0,
  localReserveAmmo: 0,
  localArmor: 0,
  localHelmet: false,
  localGrenadeHE: 0,
  localGrenadeSmoke: 0,
  localGrenadeFlash: 0,
  localHasBomb: false,
  localReady: false,
  localKills: 0,
  localDeaths: 0,
  localX: 0,
  localZ: 0,
  localRotationY: 0,
  droppedBombPos: null,
  voteRequest: null,
  chatMessages: [],
  deathRecap: null,
  connectionError: null,
  reconnectDeadline: 0,

  connect: async (nickname: string, mode = "bomb_defusal", teamChoice?: "T" | "CT" | "auto") => {
    clearRetry();
    retryNickname = nickname;
    retryMode = mode;

    const client = new Client(SERVER_URL);
    let room: Room<GameState> | null = null;
    let isReconnect = false;

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const { reconnectionToken, savedAt } = parsed;
          // Reject stale tokens (> 5 minutes old)
          if (!reconnectionToken || (savedAt && Date.now() - savedAt > 300_000)) {
            sessionStorage.removeItem(SESSION_KEY);
          } else {
            room = await client.reconnect<GameState>(reconnectionToken);
            isReconnect = true;
          }
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }

      if (!room) {
        room = await client.joinOrCreate<GameState>("fps_room", {
          nickname,
          mode,
          team: teamChoice && teamChoice !== "auto" ? teamChoice : undefined,
        });
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
        connectionError: null,
        reconnectDeadline: 0,
      });

      setupRoom(room, nickname, mode, isReconnect);
    } catch (e) {
      console.error("Failed to join room:", e);
      set({
        reconnecting: false,
        connected: false,
        connectionError: e instanceof Error ? e.message : "Failed to connect to server",
      });
    }
  },

  joinRoomById: async (roomId: string, nickname: string) => {
    clearRetry();
    retryNickname = nickname;
    retryMode = "bomb_defusal";

    const client = new Client(SERVER_URL);

    try {
      const room = await client.joinById<GameState>(roomId, { nickname });
      
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ reconnectionToken: room.reconnectionToken, savedAt: Date.now() })
      );

      set({
        client,
        room,
        sessionId: room.sessionId,
        connected: true,
        reconnecting: false,
        connectionError: null,
        reconnectDeadline: 0,
      });

      setupRoom(room, nickname, "bomb_defusal", false);
    } catch (e) {
      console.error("Failed to join room by ID:", e);
      set({
        reconnecting: false,
        connected: false,
        connectionError: e instanceof Error ? e.message : "Failed to join room",
      });
    }
  },

  disconnect: () => {
    clearRetry();
    sessionStorage.removeItem(SESSION_KEY);
    const { room } = get();
    if (room) {
      room.leave();
    }
    set({
      client: null,
      room: null,
      sessionId: null,
      connected: false,
      reconnecting: false,
      remotePlayers: new Map(),
      lastSnapshot: null,
      killFeed: [],
      hitMarker: null,
      voteRequest: null,
      round: { ...initialRound },
      playerScores: new Map(),
      smokes: [],
      localHp: 100,
      localIsDead: false,
      localMoney: 800,
      localTeam: "",
      localWeapon: "",
      localPrimaryWeapon: "",
      localSecondaryWeapon: "",
      localKnifeSlot: "knife",
      localAmmo: 0,
      localReserveAmmo: 0,
      localGrenadeHE: 0,
      localGrenadeSmoke: 0,
      localGrenadeFlash: 0,
      localHasBomb: false,
      localReady: false,
      localKills: 0,
      localDeaths: 0,
      localX: 0,
      localZ: 0,
      localRotationY: 0,
      droppedBombPos: null,
      chatMessages: [],
    });
  },

  sendInput: (input: Record<string, unknown>) => {
    const { room } = get();
    if (room) room.send("input", input);
  },

  sendShoot: (data: Record<string, unknown>) => {
    const { room } = get();
    if (room) room.send("shoot", data);
  },

  sendReload: () => {
    const { room } = get();
    if (room) room.send("reload");
  },

  sendBuy: (item: string) => {
    const { room } = get();
    if (room) room.send("buy", { item });
  },

  sendReady: () => {
    const { room } = get();
    if (room) room.send("ready");
  },

  sendPlantStart: (site: "A" | "B") => {
    const { room } = get();
    if (room) room.send("plant_start", { site });
  },

  sendPlantCancel: () => {
    const { room } = get();
    if (room) room.send("plant_cancel");
  },

  sendDefuseStart: (kit: boolean) => {
    const { room } = get();
    if (room) room.send("defuse_start", { kit });
  },

  sendDefuseCancel: () => {
    const { room } = get();
    if (room) room.send("defuse_cancel");
  },

  sendPickupBomb: () => {
    const { room } = get();
    if (room) room.send("pickup_bomb");
  },

  sendSwitchWeapon: (slot: number) => {
    const { room } = get();
    if (room) room.send("switch_weapon", { slot });
  },

  sendMelee: (direction: { x: number; y: number; z: number }) => {
    const { room } = get();
    if (room) room.send("melee", { direction, timestamp: performance.now() });
  },

  sendThrowGrenade: (data) => {
    const { room } = get();
    if (room) room.send("throw_grenade", data);
  },

  sendFFVote: (vote: boolean) => {
    const { room } = get();
    if (room) room.send("ff_vote", { vote });
  },

  sendGameMode: (mode: string) => {
    const { room } = get();
    if (room) room.send("set_game_mode", { mode });
  },

  sendVoteRequest: (targetId: string) => {
    const { room } = get();
    if (room) room.send("vote_request", { targetId });
  },

  sendVote: (targetId: string, vote: boolean) => {
    const { room } = get();
    if (room) room.send("vote_kick", { targetId, vote });
  },

  sendChat: (message: string) => {
    const { room } = get();
    if (room) room.send("chat", { message });
  },

  addKillEvent: (event: KillEvent) => {
    const { sessionId } = useNetworkStore.getState();
    const isDeath = sessionId && event.victimId === sessionId;
    
    // Start kill cam recording if we're the victim
    if (isDeath && event.killerId !== sessionId) {
      startKillCamRecording(event.killerId, event.killerName);
    }
    
    // Stop kill cam recording if we killed someone (we were recording them)
    if (event.killerId === sessionId) {
      stopKillCamRecording();
    }
    
    set((state) => ({
      killFeed: [event, ...state.killFeed].slice(0, 5),
      deathRecap: isDeath ? {
        killerName: event.killerName,
        weapon: event.weapon,
        headshot: event.headshot,
      } : state.deathRecap,
    }));
  },

  showHitMarker: (headshot: boolean) => {
    set({ hitMarker: { headshot, timestamp: performance.now() } });
    setTimeout(() => {
      set({ hitMarker: null });
    }, 200);
  },

  measurePing: () => {
    const { room } = get();
    if (!room) return;

    const startTime = performance.now();
    room.send("ping", { timestamp: startTime });
  },
}));

// ─── Room wiring (shared by initial join and reconnect) ─────────
function setupRoom(
  room: Room<GameState>,
  nickname: string,
  mode: string,
  isReconnect: boolean
) {
  if (!isReconnect) {
    // Apply the selected game mode right after joining.
    room.send("set_game_mode", { mode });
  }

  room.onStateChange((state: GameState) => {
    const remotePlayers = new Map<string, RemotePlayer>();
    state.players.forEach((player: PlayerState, id: string) => {
      if (id !== room.sessionId) {
        remotePlayers.set(id, {
          x: player.x,
          y: player.y,
          z: player.z,
          rotationY: player.rotationY,
          nickname: player.nickname,
          team: player.team,
          hp: player.hp,
          isDead: player.isDead,
          currentWeapon: player.currentWeapon,
          hasBomb: player.hasBomb,
          kills: player.kills,
          deaths: player.deaths,
          isSprinting: player.isSprinting,
          isCrouching: player.isCrouching,
        });
      }
    });

    const localPlayer = state.players.get(room.sessionId);
    const playerScores = new Map<string, number>();
    state.playerScores.forEach((score, key) => {
      playerScores.set(key, score);
    });
    const smokes: SmokeData[] = [];
    state.smokes.forEach((smoke) => {
      smokes.push({ x: smoke.x, z: smoke.z, timeLeft: smoke.timeLeft });
    });

    useNetworkStore.setState({
      remotePlayers,
      playerScores,
      smokes,
      localHp: localPlayer ? localPlayer.hp : 100,
      localIsDead: localPlayer ? localPlayer.isDead : false,
      localMoney: localPlayer ? localPlayer.money : 800,
      localTeam: localPlayer ? localPlayer.team : "",
      localWeapon: localPlayer ? localPlayer.currentWeapon : "",
      localPrimaryWeapon: localPlayer ? localPlayer.primaryWeapon : "",
      localSecondaryWeapon: localPlayer ? localPlayer.secondaryWeapon : "",
      localKnifeSlot: localPlayer ? localPlayer.knifeSlot : "knife",
      localAmmo: localPlayer ? localPlayer.ammo : 0,
      localReserveAmmo: localPlayer ? localPlayer.reserveAmmo : 0,
      localArmor: localPlayer ? localPlayer.armor : 0,
      localHelmet: localPlayer ? localPlayer.hasHelmet : false,
      localGrenadeHE: localPlayer ? localPlayer.grenadeHE : 0,
      localGrenadeSmoke: localPlayer ? localPlayer.grenadeSmoke : 0,
      localGrenadeFlash: localPlayer ? localPlayer.grenadeFlash : 0,
      localHasBomb: localPlayer ? localPlayer.hasBomb : false,
      localReady: localPlayer ? localPlayer.isReady : false,
      localKills: localPlayer ? localPlayer.kills : 0,
      localDeaths: localPlayer ? localPlayer.deaths : 0,
      localX: localPlayer ? localPlayer.x : 0,
      localZ: localPlayer ? localPlayer.z : 0,
      localRotationY: localPlayer ? localPlayer.rotationY : 0,
      round: {
        phase: state.phase,
        roundTimeLeft: state.roundTimeLeft,
        buyPhaseTimeLeft: state.buyPhaseTimeLeft,
        roundNumber: state.roundNumber,
        teamRedScore: state.teamRedScore,
        teamBlueScore: state.teamBlueScore,
        bombPlanted: state.bombPlanted,
        bombTimeLeft: state.bombTimeLeft,
        bombSite: state.bombSite,
        isHalfTime: state.isHalfTime,
        isOvertime: state.isOvertime,
        isSuddenDeath: state.isSuddenDeath,
        readyCount: state.readyCount,
        maxRounds: state.maxRounds,
        gameMode: state.gameMode,
        kothCapturingTeam: state.kothCapturingTeam || "",
        kothCaptureProgress: state.kothCaptureProgress || 0,
        kothScoreT: state.kothScoreT || 0,
        kothScoreCT: state.kothScoreCT || 0,
      },
    });

    if (localPlayer) {
      useWeaponStore.getState().syncLoadout({
        primary: localPlayer.primaryWeapon,
        secondary: localPlayer.secondaryWeapon,
        knife: localPlayer.knifeSlot,
      });
    }
  });

  room.onMessage("snapshot", (snapshot: Snapshot) => {
    // Only trust snapshots during the active phase to avoid
    // stale snap-back teleports while in buy/waiting phases.
    if (useNetworkStore.getState().round.phase !== "active") return;
    useNetworkStore.setState({ lastSnapshot: snapshot });
  });

  room.onMessage("vote_request", (data: VoteRequest) => {
    useNetworkStore.setState({ voteRequest: data });
  });

  room.onMessage("kicked", (data: { targetId: string; targetNickname: string }) => {
    useNetworkStore.setState({ voteRequest: null });
    if (data.targetId === room.sessionId) {
      alert(`You were kicked by vote (${data.targetNickname}'s initiator voted).`);
    }
  });

  room.onMessage("damage", (data: DamageEvent) => {
    const { sessionId, showHitMarker } = useNetworkStore.getState();
    if (sessionId && data.shooterId === sessionId) {
      showHitMarker(data.headshot);
    }
  });

  room.onMessage("kill", (event: KillEvent) => {
    useNetworkStore.getState().addKillEvent(event);
  });

  room.onMessage(
    "itemBought",
    (data: {
      playerId: string;
      item: string;
      slot: "weapon" | "gear";
      currentWeapon: string;
    }) => {
      // Purchases are broadcast to everyone; only react to our own.
      if (data.playerId !== room.sessionId) return;
      gameEvents.emit("buyResult", { item: data.item, ok: true });
      if (data.currentWeapon && data.currentWeapon in WEAPONS) {
        useWeaponStore.getState().equipWeapon(data.currentWeapon as WeaponKey);
      }
    }
  );

  room.onMessage("buyFailed", (data: BuyFailedMessage) => {
    gameEvents.emit("buyResult", { item: data.item, ok: false, reason: data.reason });
  });

  room.onMessage("switchFailed", () => {
    Sound.dryFire();
  });

  room.onMessage("bombDropped", (data: { x: number; y: number; z: number }) => {
    useNetworkStore.setState({ droppedBombPos: data });
  });

  room.onMessage("bombPickedUp", () => {
    useNetworkStore.setState({ droppedBombPos: null });
  });

  room.onMessage("bombPlanted", () => {
    useNetworkStore.setState({ droppedBombPos: null });
  });

  room.onMessage(
    "weaponSwitched",
    (data: { playerId: string; weapon: string; slot: number; ammo: number; reserveAmmo: number }) => {
      if (data.playerId !== room.sessionId) return;
      useWeaponStore
        .getState()
        .equipWeapon(data.weapon as WeaponKey, { ammo: data.ammo, silent: true });
    }
  );

  room.onMessage("grenadeThrown", (data: { id: string; type: string; throwerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }) => {
    gameEvents.emit("nadeThrown", data);
  });

  room.onMessage("grenadeDetonated", (data: { id: string; type: string; x: number; y: number; z: number }) => {
    gameEvents.emit("nadeDetonated", data);
  });

  room.onMessage("flash", (data: { x: number; y: number; z: number; throwerId: string }) => {
    gameEvents.emit("flashbang", data);
  });

  room.onMessage("pong", (data: { timestamp: number }) => {
    const rtt = performance.now() - data.timestamp;
    const { pingHistory } = useNetworkStore.getState();
    const newHistory = [...pingHistory, rtt].slice(-20);
    const avgPing = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
    useNetworkStore.setState({ ping: Math.round(avgPing), latency: avgPing / 2, pingHistory: newHistory });

    // Report RTT to server for lag compensation (throttled to once per second)
    if (Math.random() < 0.1) {
      room.send("clientRTT", { rtt: avgPing });
    }
  });

  room.onMessage("chat", (data: { senderId: string; sender: string; message: string; team?: string; timestamp: number }) => {
    const msg: ChatMessage = {
      id: `${data.senderId}-${data.timestamp}-${Math.random()}`,
      senderId: data.senderId,
      sender: data.sender,
      message: data.message,
      team: data.team,
      timestamp: data.timestamp || Date.now(),
    };
    useNetworkStore.setState((state) => ({
      chatMessages: [...state.chatMessages.slice(-49), msg],
    }));
  });

  room.onMessage("radio", (data: { sender: string; code: number; team: string }) => {
    gameEvents.emit("radioCommand", { sessionId: data.sender, command: String(data.code), nickname: data.sender });
  });

  room.onMessage("ffVoteStarted", (data: { initiatorId: string; initiatorName: string; team: string }) => {
    gameEvents.emit("ffVoteStarted", data);
  });

  room.onMessage("forfeitAccepted", (data: { surrenderedTeam: string; winner: string }) => {
    gameEvents.emit("forfeitAccepted", data);
  });

  room.onMessage("playerReconnected", (data: { sessionId: string; nickname: string }) => {
    gameEvents.emit("playerReconnected", data);
  });

  room.onLeave(() => {
    // Keep the session stored so we can attempt a reconnect.
    useNetworkStore.setState({
      connected: false,
      room: null,
      sessionId: null,
      remotePlayers: new Map(),
      lastSnapshot: null,
      killFeed: [],
      hitMarker: null,
      voteRequest: null,
      reconnectDeadline: Date.now() + RECONNECT_WINDOW_MS,
    });
    // Only attempt reconnect in multiplayer mode, not training
    const currentMode = useGameStore.getState().mode;
    if (currentMode !== "training") {
      scheduleReconnect(nickname, mode);
    }
  });
}

function scheduleReconnect(nickname: string, mode: string) {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (!saved) return;

  retryNickname = nickname;
  retryMode = mode;

  if (retryCount >= MAX_RECONNECT_ATTEMPTS) {
    sessionStorage.removeItem(SESSION_KEY);
    useNetworkStore.setState({ reconnecting: false });
    return;
  }

  retryCount++;
  useNetworkStore.setState({ reconnecting: true });

  const client = new Client(SERVER_URL);
  let reconnectionToken = "";
  try {
    const parsed = JSON.parse(saved);
    reconnectionToken = parsed.reconnectionToken;
    // Reject stale tokens (> 5 minutes old)
    if (parsed.savedAt && Date.now() - parsed.savedAt > 300_000) {
      sessionStorage.removeItem(SESSION_KEY);
      useNetworkStore.setState({ reconnecting: false });
      return;
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    useNetworkStore.setState({ reconnecting: false });
    return;
  }

  if (!reconnectionToken) {
    sessionStorage.removeItem(SESSION_KEY);
    useNetworkStore.setState({ reconnecting: false });
    return;
  }

  client
    .reconnect<GameState>(reconnectionToken)
    .then((room) => {
      const typedRoom = room as Room<GameState>;
      clearRetry();
      useNetworkStore.setState({
        client,
        room: typedRoom,
        sessionId: typedRoom.sessionId,
        connected: true,
        reconnecting: false,
      });
      setupRoom(typedRoom, retryNickname, retryMode, true);
    })
    .catch(() => {
      clearRetry();
      retryTimer = setTimeout(() => scheduleReconnect(retryNickname, retryMode), 5000);
    });
}
