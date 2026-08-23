import { useCallback, useRef } from "react";
// Offline stub — original network hook removed.
export function useNetwork(_nickname: string) {
  const seqRef = useRef(0);
  const sendPlayerInput = useCallback(() => { seqRef.current++; }, []);
  const reconcile = useCallback((localPos: { x:number;y:number;z:number }, _snapshot: unknown) => localPos, []);
  const getPredictionStats = useCallback(() => ({ pendingInputs: 0, bufferSize: 0, lastSeq: seqRef.current }), []);
  return { sendPlayerInput, reconcile, connected: false, lastSnapshot: null, ping: 0, latency: 0, seq: seqRef.current, getPredictionStats };
}
