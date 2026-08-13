import { create } from "zustand";
import { useNetworkStore } from "./useNetworkStore";

interface KillCamFrame {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  timestamp: number;
}

interface KillCamState {
  // Recording
  isRecording: boolean;
  killerId: string | null;
  killerName: string | null;
  frames: KillCamFrame[];
  
  // Replay
  isReplaying: boolean;
  replayIndex: number;
  replayStartTime: number;
  
  // Actions
  startRecording: (killerId: string, killerName: string) => void;
  stopRecording: () => void;
  recordFrame: () => void;
  startReplay: () => void;
  stopReplay: () => void;
  getReplayFrame: (currentTime: number) => KillCamFrame | null;
}

const RECORD_INTERVAL = 50; // ms between frames
const MAX_FRAMES = 60; // 3 seconds at 50ms intervals

export const useKillCamStore = create<KillCamState>((set, get) => ({
  isRecording: false,
  killerId: null,
  killerName: null,
  frames: [],
  
  isReplaying: false,
  replayIndex: 0,
  replayStartTime: 0,
  
  startRecording: (killerId, killerName) => {
    set({
      isRecording: true,
      killerId,
      killerName,
      frames: [],
    });
  },
  
  stopRecording: () => {
    set({ isRecording: false });
  },
  
  recordFrame: () => {
    const { isRecording, killerId, frames } = get();
    if (!isRecording || !killerId) return;
    
    const remotePlayers = useNetworkStore.getState().remotePlayers;
    const killer = remotePlayers.get(killerId);
    if (!killer) return;
    
    const newFrame: KillCamFrame = {
      x: killer.x,
      y: killer.y,
      z: killer.z,
      rotationY: killer.rotationY,
      timestamp: performance.now(),
    };
    
    const newFrames = [...frames, newFrame].slice(-MAX_FRAMES);
    set({ frames: newFrames });
  },
  
  startReplay: () => {
    const { frames } = get();
    if (frames.length === 0) return;
    
    set({
      isReplaying: true,
      replayIndex: 0,
      replayStartTime: performance.now(),
    });
  },
  
  stopReplay: () => {
    set({
      isReplaying: false,
      replayIndex: 0,
    });
  },
  
  getReplayFrame: (currentTime) => {
    const { frames, replayStartTime, isReplaying } = get();
    if (!isReplaying || frames.length === 0) return null;
    
    const elapsed = currentTime - replayStartTime;
    const totalDuration = frames[frames.length - 1].timestamp - frames[0].timestamp;
    
    // Replay is done
    if (elapsed > totalDuration + 1000) {
      get().stopReplay();
      return null;
    }
    
    // Find the frame closest to current elapsed time
    const targetTime = frames[0].timestamp + elapsed;
    let frameIndex = 0;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].timestamp <= targetTime) {
        frameIndex = i;
      } else {
        break;
      }
    }
    
    return frames[frameIndex];
  },
}));

// Recording interval handle
let recordInterval: ReturnType<typeof setInterval> | null = null;

export function startKillCamRecording(killerId: string, killerName: string) {
  useKillCamStore.getState().startRecording(killerId, killerName);
  
  if (recordInterval) clearInterval(recordInterval);
  recordInterval = setInterval(() => {
    useKillCamStore.getState().recordFrame();
  }, RECORD_INTERVAL);
}

export function stopKillCamRecording() {
  useKillCamStore.getState().stopRecording();
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
}
