/**
 * Server-Side Prediction & Reconciliation
 * Based on patterns from TOSIOS and t5c
 *
 * Maintains an input replay buffer so we can re-simulate
 * from the server's last acknowledged state + unacknowledged inputs.
 */

import * as THREE from 'three'

export interface PlayerInput {
  seq: number
  timestamp: number
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  sprint: boolean
  crouch: boolean
  rotationY: number
}

export interface Snapshot {
  seq: number
  x: number
  y: number
  z: number
  vx?: number
  vy?: number
  vz?: number
}

const MAX_BUFFER_SIZE = 60 // ~1s at 60fps
const MAX_REPLAY_COUNT = 10
const INTERPOLATION_DELAY = 0.1 // 100ms behind

export class ServerPredictionManager {
  private inputBuffer: PlayerInput[] = []
  private nextSeq: number = 0
  private pendingInputs: PlayerInput[] = []

  /** Local prediction */
  private predictedPos = new THREE.Vector3()
  private velocityY: number = 0

  /** Interpolation target (for remote players) */
  private interpolationTarget = new THREE.Vector3()
  private interpolationFrom = new THREE.Vector3()
  private interpolationAlpha: number = 0
  private lastInterpolationTime: number = 0

  // ─── Input Management ──────────────────────────────────────
  createInput(input: Omit<PlayerInput, 'seq' | 'timestamp'>): PlayerInput {
    const playerInput: PlayerInput = {
      seq: this.nextSeq++,
      timestamp: performance.now(),
      ...input,
    }

    this.inputBuffer.push(playerInput)
    if (this.inputBuffer.length > MAX_BUFFER_SIZE) {
      this.inputBuffer.shift()
    }

    this.pendingInputs.push(playerInput)

    return playerInput
  }

  getPendingInputs(): PlayerInput[] {
    return [...this.pendingInputs]
  }

  // ─── Server Acknowledgment ─────────────────────────────────
  acknowledgeSnapshot(snapshot: Snapshot) {
    // Remove acknowledged inputs (server processed up to this seq)
    this.pendingInputs = this.pendingInputs.filter(
      input => input.seq > snapshot.seq
    )

    // Re-simulate from acked state + remaining inputs
    if (this.pendingInputs.length > 0) {
      this.replayInputs(snapshot)
    }
  }

  private replayInputs(baseSnapshot: Snapshot) {
    let x = baseSnapshot.x
    let y = baseSnapshot.y
    let z = baseSnapshot.z

    const replayCount = Math.min(this.pendingInputs.length, MAX_REPLAY_COUNT)

    for (let i = 0; i < replayCount; i++) {
      const input = this.pendingInputs[i]
      const dt = i === 0
        ? 0.016
        : (input.timestamp - this.pendingInputs[i - 1].timestamp) / 1000

      // Simple replay simulation (full physics would use CharacterController)
      const speed = input.sprint ? 11.5 : 8.5
      const sin = Math.sin(input.rotationY)
      const cos = Math.cos(input.rotationY)

      let moveX = 0
      let moveZ = 0

      if (input.forward) { moveX -= sin; moveZ -= cos }
      if (input.backward) { moveX += sin; moveZ += cos }
      if (input.left) { moveX -= cos; moveZ += sin }
      if (input.right) { moveX += cos; moveZ -= sin }

      const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
      if (len > 0) {
        moveX = (moveX / len) * speed * dt
        moveZ = (moveZ / len) * speed * dt
      }

      x += moveX
      z += moveZ

      if (input.jump) {
        y += 0.3
      }
    }

    this.predictedPos.set(x, y, z)
  }

  // ─── Client-Side Prediction ────────────────────────────────
  predict(currentPos: THREE.Vector3, input: PlayerInput, dt: number): THREE.Vector3 {
    this.predictedPos.copy(currentPos)

    // Apply input movement
    const speed = input.sprint ? 11.5 : 8.5
    const sin = Math.sin(input.rotationY)
    const cos = Math.cos(input.rotationY)

    let moveX = 0
    let moveZ = 0

    if (input.forward) { moveX -= sin; moveZ -= cos }
    if (input.backward) { moveX += sin; moveZ += cos }
    if (input.left) { moveX -= cos; moveZ += sin }
    if (input.right) { moveX += cos; moveZ -= sin }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (len > 0) {
      moveX = (moveX / len) * speed * dt
      moveZ = (moveZ / len) * speed * dt
    }

    this.predictedPos.x += moveX
    this.predictedPos.z += moveZ

    // Apply jump
    if (input.jump) {
      this.velocityY = 8.5
    }

    // Apply gravity
    this.velocityY -= 30 * dt
    this.predictedPos.y += this.velocityY * dt

    return this.predictedPos.clone()
  }

  // ─── Reconciliation ───────────────────────────────────────
  /**
   * Reconcile local position with server snapshot.
   * Returns corrected position with dead reckoning.
   */
  reconcile(
    localPos: THREE.Vector3,
    serverSnapshot: Snapshot | null,
    snapThreshold: number = 0.5,
    lerpThreshold: number = 0.3
  ): THREE.Vector3 {
    if (!serverSnapshot) return localPos.clone()

    this.acknowledgeSnapshot(serverSnapshot)

    const serverPos = new THREE.Vector3(
      serverSnapshot.x,
      serverSnapshot.y,
      serverSnapshot.z
    )

    const error = localPos.distanceTo(serverPos)

    if (error < lerpThreshold) {
      // Close enough — keep local prediction
      return localPos.clone()
    }

    if (error > snapThreshold) {
      // Too far — snap to server
      return serverPos.clone()
    }

    // Blend between server and local
    const lerpFactor = 0.3
    return new THREE.Vector3(
      THREE.MathUtils.lerp(localPos.x, serverPos.x, lerpFactor),
      THREE.MathUtils.lerp(localPos.y, serverPos.y, lerpFactor),
      THREE.MathUtils.lerp(localPos.z, serverPos.z, lerpFactor)
    )
  }

  // ─── Interpolation (for remote players) ───────────────────
  /**
   * Smoothly interpolate between two snapshots.
   * Call this in useFrame with performance.now().
   */
  interpolate(
    currentSnapshot: Snapshot,
    previousSnapshot: Snapshot | null,
    now: number
  ): THREE.Vector3 {
    if (!previousSnapshot) {
      return new THREE.Vector3(currentSnapshot.x, currentSnapshot.y, currentSnapshot.z)
    }

    // Update interpolation buffer
    if (now - this.lastInterpolationTime > 100) {
      this.interpolationFrom.set(
        previousSnapshot.x,
        previousSnapshot.y,
        previousSnapshot.z
      )
      this.interpolationTarget.set(
        currentSnapshot.x,
        currentSnapshot.y,
        currentSnapshot.z
      )
      this.lastInterpolationTime = now
    }

    // Interpolate with delay
    const timeSinceUpdate = (now - this.lastInterpolationTime) / 1000
    const alpha = Math.min(1, (timeSinceUpdate + INTERPOLATION_DELAY) / 0.1)

    this.interpolationAlpha = alpha

    return new THREE.Vector3().lerpVectors(
      this.interpolationFrom,
      this.interpolationTarget,
      alpha
    )
  }

  // ─── Dead Reckoning ───────────────────────────────────────
  /**
   * Extrapolate position based on last known velocity.
   * Used when server snapshots are delayed.
   */
  deadReckon(
    snapshot: Snapshot,
    dt: number
  ): THREE.Vector3 {
    if (snapshot.vx === undefined || snapshot.vy === undefined || snapshot.vz === undefined) {
      return new THREE.Vector3(snapshot.x, snapshot.y, snapshot.z)
    }

    return new THREE.Vector3(
      snapshot.x + snapshot.vx * dt,
      snapshot.y + snapshot.vy * dt,
      snapshot.z + snapshot.vz * dt
    )
  }

  // ─── Stats ────────────────────────────────────────────────
  getStats() {
    return {
      pendingInputs: this.pendingInputs.length,
      bufferSize: this.inputBuffer.length,
      lastSeq: this.nextSeq - 1,
      interpolationAlpha: this.interpolationAlpha,
    }
  }
}
