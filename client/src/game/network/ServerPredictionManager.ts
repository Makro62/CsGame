// Offline stub — ServerPredictionManager removed for offline mode
import * as THREE from "three";
export interface PlayerInput { seq:number; timestamp:number; forward:boolean; backward:boolean; left:boolean; right:boolean; jump:boolean; sprint:boolean; crouch:boolean; rotationY:number; }
export interface Snapshot { seq:number; x:number; y:number; z:number; }
export class ServerPredictionManager {
  createInput(input: Omit<PlayerInput,'seq'|'timestamp'>): PlayerInput { return { seq: 1, timestamp: performance.now(), ...input }; }
  getPendingInputs(): PlayerInput[] { return []; }
  acknowledgeSnapshot(_s: Snapshot) {}
  predict(currentPos: THREE.Vector3): THREE.Vector3 { return currentPos.clone(); }
  reconcile(localPos: THREE.Vector3): THREE.Vector3 { return localPos.clone(); }
  interpolate(currentSnapshot: Snapshot): THREE.Vector3 { return new THREE.Vector3(currentSnapshot.x, currentSnapshot.y, currentSnapshot.z); }
  deadReckon(snapshot: Snapshot): THREE.Vector3 { return new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z); }
  getStats() { return { pendingInputs: 0, bufferSize: 0, lastSeq: 0, interpolationAlpha: 0 }; }
}
