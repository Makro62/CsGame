import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useNetworkStore } from "../stores/useNetworkStore";
import { useGameStore } from "../stores/useGameStore";
import { ServerPredictionManager } from "../game/network/ServerPredictionManager";

const RECONCILE_LERP = 0.3;
const RECONCILE_SNAP = 0.5;
const INPUT_SEND_INTERVAL_MS = 33; // ~30Hz input send rate

export function useNetwork(nickname: string) {
  const { connect, disconnect, sendInput, connected, lastSnapshot, ping, latency } =
    useNetworkStore();
  const seqRef = useRef(0);
  const predictionRef = useRef(new ServerPredictionManager());
  const lastSendTime = useRef(0);

  useEffect(() => {
    const gameMode = useGameStore.getState().mode;
    if (gameMode === "training" || gameMode === "zombie") return; // Training is offline-only, Zombie has its own room
    const serverMode = useGameStore.getState().serverMode;
    connect(nickname, serverMode);
    return () => {
      disconnect();
    };
  }, [nickname, connect, disconnect]);

  const sendPlayerInput = useCallback(
    (input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      jump: boolean;
      sprint: boolean;
      crouch: boolean;
      rotationY: number;
    }) => {
      if (!connected) return; // Skip in training / offline mode
      const now = performance.now();
      if (now - lastSendTime.current < INPUT_SEND_INTERVAL_MS) return;
      lastSendTime.current = now;

      seqRef.current++;
      const playerInput = predictionRef.current.createInput({
        forward: input.forward,
        backward: input.backward,
        left: input.left,
        right: input.right,
        jump: input.jump,
        sprint: input.sprint,
        crouch: input.crouch,
        rotationY: input.rotationY,
      });
      sendInput(playerInput as unknown as Record<string, unknown>);
    },
    [sendInput]
  );

  const reconcile = useCallback(
    (
      localPos: { x: number; y: number; z: number },
      snapshot: { x: number; y: number; z: number } | null
    ) => {
      if (!snapshot) return { x: localPos.x, y: localPos.y, z: localPos.z };

      // Acknowledge server snapshot (removes acknowledged inputs, replays remaining)
      predictionRef.current.acknowledgeSnapshot({
        seq: 0,
        x: snapshot.x,
        y: snapshot.y,
        z: snapshot.z,
      });

      // Use ServerPredictionManager for enhanced reconciliation
      const result = predictionRef.current.reconcile(
        new THREE.Vector3(localPos.x, localPos.y, localPos.z),
        { seq: 0, x: snapshot.x, y: snapshot.y, z: snapshot.z },
        RECONCILE_SNAP,
        RECONCILE_LERP
      );

      return { x: result.x, y: result.y, z: result.z };
    },
    []
  );

  const getPredictionStats = useCallback(() => {
    return predictionRef.current.getStats();
  }, []);

  return {
    sendPlayerInput,
    reconcile,
    connected,
    lastSnapshot,
    ping,
    latency,
    seq: seqRef.current,
    getPredictionStats,
  };
}
