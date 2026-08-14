import { useEffect, useRef, useCallback } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import { useGameStore } from "../stores/useGameStore";
import { ServerPredictionManager } from "../game/network/ServerPredictionManager";

const RECONCILE_LERP = 0.3;
const RECONCILE_SNAP = 0.5;

export function useNetwork(nickname: string) {
  const { connect, disconnect, sendInput, connected, lastSnapshot, ping, latency } =
    useNetworkStore();
  const seqRef = useRef(0);
  const predictionRef = useRef(new ServerPredictionManager());

  useEffect(() => {
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
        { x: localPos.x, y: localPos.y, z: localPos.z } as any,
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
