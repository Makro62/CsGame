/**
 * Weapon Animation System
 * Based on patterns from three-fps
 *
 * Manages procedural weapon animations: bob, sway, kick, reload, draw, holster.
 * Uses keyframe-based animation with interpolation.
 */

import * as THREE from 'three'

// ─── Animation Keyframe ─────────────────────────────────────────
interface Keyframe {
  time: number // 0-1 normalized
  position: THREE.Vector3
  rotation: THREE.Euler
  scale?: THREE.Vector3
}

interface AnimationClip {
  name: string
  keyframes: Keyframe[]
  duration: number // seconds
  loop: boolean
}

// ─── Weapon Animator ────────────────────────────────────────────
export class WeaponAnimator {
  private clips: Map<string, AnimationClip> = new Map()
  private currentClip: string | null = null
  private currentTime: number = 0
  private activeDuration: number = 1.0
  private playing: boolean = false
  private onComplete: (() => void) | null = null

  /** Current interpolated transform */
  public position = new THREE.Vector3()
  public rotation = new THREE.Euler()
  public scale = new THREE.Vector3(1, 1, 1)

  /** Base idle transform (relative to camera) */
  public basePosition = new THREE.Vector3(0.22, -0.22, -0.40)
  public baseRotation = new THREE.Euler(0, 0, 0)

  /** Procedural modifiers (additive) */
  private bobOffset = new THREE.Vector3()
  private swayOffset = new THREE.Vector3()
  private swayRotation = new THREE.Euler()
  private kickOffset = new THREE.Vector3()
  private kickRotation = new THREE.Euler()

  /** Bob state */
  private bobPhase: number = 0
  private bobIntensity: number = 0

  /** Sway state */
  private swayTarget = new THREE.Vector2()
  private swayCurrent = new THREE.Vector2()

  constructor() {
    this.initDefaultClips()
  }

  // ─── Default Clips ────────────────────────────────────────
  private initDefaultClips() {
    // Fire animation
    this.addClip({
      name: 'fire',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 0.1, position: new THREE.Vector3(0, 0.015, 0.04), rotation: new THREE.Euler(-0.12, 0, 0) },
        { time: 0.35, position: new THREE.Vector3(0, -0.005, -0.01), rotation: new THREE.Euler(0.04, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.22,
      loop: false,
    })

    // Steady Reload animation (no extra tilting/raising/dipping)
    this.addClip({
      name: 'reload',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 2.2,
      loop: false,
    })

    // Draw animation (steady equip)
    this.addClip({
      name: 'draw',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.15,
      loop: false,
    })

    // Holster animation (steady holster)
    this.addClip({
      name: 'holster',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.15,
      loop: false,
    })

    // ADS in
    this.addClip({
      name: 'ads_in',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.18,
      loop: false,
    })

    // ADS out
    this.addClip({
      name: 'ads_out',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.18,
      loop: false,
    })
  }

  // ─── Clip Management ──────────────────────────────────────
  addClip(clip: AnimationClip) {
    this.clips.set(clip.name, clip)
  }

  play(clipName: string, customDuration?: number, onComplete?: () => void) {
    const clip = this.clips.get(clipName)
    if (!clip) return

    this.currentClip = clipName
    this.currentTime = 0
    this.activeDuration = customDuration && customDuration > 0 ? customDuration : clip.duration
    this.playing = true
    this.onComplete = onComplete ?? null
  }

  stop() {
    this.currentClip = null
    this.currentTime = 0
    this.playing = false
    this.onComplete = null
  }

  isPlaying(): boolean {
    return this.playing
  }

  getCurrentClip(): string | null {
    return this.currentClip
  }

  getNormalizedProgress(): number {
    if (!this.playing || this.activeDuration <= 0) return 0
    return Math.min(1, Math.max(0, this.currentTime / this.activeDuration))
  }

  // ─── Procedural Bob ───────────────────────────────────────
  updateBob(dt: number, speed: number, isSprinting: boolean, isGrounded: boolean) {
    if (isGrounded && speed > 0.5) {
      const bobSpeed = isSprinting ? 13 : 7.5
      this.bobPhase += dt * bobSpeed
      this.bobIntensity = THREE.MathUtils.lerp(
        this.bobIntensity,
        isSprinting ? 1.0 : 0.5,
        dt * 8
      )
    } else {
      // Subtle idle breathing motion
      this.bobPhase += dt * 2.0
      this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0.12, dt * 4)
    }

    const bobX = Math.sin(this.bobPhase) * 0.0025 * this.bobIntensity
    const bobY = Math.abs(Math.cos(this.bobPhase)) * 0.0035 * this.bobIntensity
    this.bobOffset.set(bobX, bobY, 0)
  }

  // ─── Procedural Sway ─────────────────────────────────────
  updateSway(dt: number, mouseDeltaX: number, mouseDeltaY: number) {
    // Smooth mouse sway with clamping
    const clampedX = Math.max(-25, Math.min(25, mouseDeltaX))
    const clampedY = Math.max(-25, Math.min(25, mouseDeltaY))

    this.swayTarget.set(-clampedX * 0.0008, -clampedY * 0.0008)
    this.swayCurrent.lerp(this.swayTarget, 1 - Math.exp(-12 * dt))

    this.swayOffset.set(
      this.swayCurrent.x * 0.015,
      this.swayCurrent.y * 0.015,
      0
    )
    this.swayRotation.set(
      this.swayCurrent.y * 0.02,
      this.swayCurrent.x * 0.02,
      this.swayCurrent.x * 0.015
    )
  }

  // ─── Kick (recoil) ───────────────────────────────────────
  addKick(recoilX: number, recoilY: number, recoilZ: number) {
    this.kickOffset.set(0, recoilY * 0.008, recoilZ * 0.005)
    this.kickRotation.set(recoilX * 0.015, 0, 0)
  }

  updateKick(dt: number) {
    this.kickOffset.lerp(new THREE.Vector3(), dt * 14)
    this.kickRotation.x = THREE.MathUtils.lerp(this.kickRotation.x, 0, dt * 14)
    this.kickRotation.y = THREE.MathUtils.lerp(this.kickRotation.y, 0, dt * 14)
    this.kickRotation.z = THREE.MathUtils.lerp(this.kickRotation.z, 0, dt * 14)
  }

  // ─── Update ──────────────────────────────────────────────
  update(dt: number): void {
    const clipPos = new THREE.Vector3(0, 0, 0)
    const clipRot = new THREE.Euler(0, 0, 0)

    // Update clip animation
    if (this.playing && this.currentClip) {
      const clip = this.clips.get(this.currentClip)
      if (clip) {
        this.currentTime += dt

        if (this.currentTime >= this.activeDuration) {
          if (clip.loop) {
            this.currentTime %= this.activeDuration
          } else {
            this.playing = false
            this.currentTime = this.activeDuration
            const cb = this.onComplete
            this.onComplete = null
            if (cb) cb()
          }
        }

        // Interpolate keyframes
        const t = Math.min(1, Math.max(0, this.currentTime / this.activeDuration))
        const interpolated = this.interpolateKeyframes(clip.keyframes, t)
        clipPos.copy(interpolated.position)
        clipRot.copy(interpolated.rotation)
      }
    }

    // Set clean base from clip (or zero when idle)
    this.position.copy(clipPos)
    this.rotation.copy(clipRot)

    // Apply procedural offsets (fresh per-frame, no accumulation)
    this.position.add(this.bobOffset)
    this.position.add(this.swayOffset)
    this.position.add(this.kickOffset)
    this.rotation.x += this.swayRotation.x + this.kickRotation.x
    this.rotation.y += this.swayRotation.y + this.kickRotation.y
    this.rotation.z += this.swayRotation.z + this.kickRotation.z
  }

  private interpolateKeyframes(keyframes: Keyframe[], t: number): Keyframe {
    // Find surrounding keyframes
    let prev = keyframes[0]
    let next = keyframes[keyframes.length - 1]

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
        prev = keyframes[i]
        next = keyframes[i + 1]
        break
      }
    }

    // Calculate interpolation factor
    const range = next.time - prev.time
    const localT = range > 0 ? (t - prev.time) / range : 0

    // Smooth step
    const smoothT = localT * localT * (3 - 2 * localT)

    // Interpolate position
    const position = new THREE.Vector3().lerpVectors(prev.position, next.position, smoothT)

    // Interpolate rotation
    const rotation = new THREE.Euler(
      THREE.MathUtils.lerp(prev.rotation.x, next.rotation.x, smoothT),
      THREE.MathUtils.lerp(prev.rotation.y, next.rotation.y, smoothT),
      THREE.MathUtils.lerp(prev.rotation.z, next.rotation.z, smoothT)
    )

    return { time: t, position, rotation }
  }

  // ─── Reset ───────────────────────────────────────────────
  reset() {
    this.stop()
    this.position.set(0, 0, 0)
    this.rotation.set(0, 0, 0)
    this.bobOffset.set(0, 0, 0)
    this.swayOffset.set(0, 0, 0)
    this.kickOffset.set(0, 0, 0)
    this.bobPhase = 0
    this.bobIntensity = 0
    this.swayCurrent.set(0, 0)
    this.swayTarget.set(0, 0)
  }
}
