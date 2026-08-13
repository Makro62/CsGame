import { useEffect, useRef, useCallback } from "react";
import { useNetworkStore } from "../stores/useNetworkStore";
import { useGameStore } from "../stores/useGameStore";

const RECONCILE_LERP = 0.3;
const RECONCILE_SNAP = 0.5;

export function useNetwork(nickname: string) {
  const { connect, disconnect, sendInput, connected, lastSnapshot, ping, latency } =
    useNetworkStore();
  const seqRef = useRef(0);

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
      sendInput({
        seq: seqRef.current,
        timestamp: performance.now(),
        ...input,
      });
    },
    [sendInput]
  );

  const reconcile = useCallback(
    (
      localPos: { x: number; y: number; z: number },
      snapshot: { x: number; y: number; z: number } | null
    ) => {
      if (!snapshot) return { x: localPos.x, y: localPos.y, z: localPos.z };

      const dx = snapshot.x - localPos.x;
      const dy = snapshot.y - localPos.y;
      const dz = snapshot.z - localPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > RECONCILE_SNAP) {
        return { x: snapshot.x, y: snapshot.y, z: snapshot.z };
      }

      if (dist > RECONCILE_LERP) {
        const lerpFactor = 0.3;
        return {
          x: localPos.x + dx * lerpFactor,
          y: localPos.y + dy * lerpFactor,
          z: localPos.z + dz * lerpFactor,
        };
      }

      return { x: localPos.x, y: localPos.y, z: localPos.z };
    },
    []
  );

  return {
    sendPlayerInput,
    reconcile,
    connected,
    lastSnapshot,
    ping,
    latency,
    seq: seqRef.current,
  };
}
