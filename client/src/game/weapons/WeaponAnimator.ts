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
  private playing: boolean = false
  private onComplete: (() => void) | null = null

  /** Current interpolated transform */
  public position = new THREE.Vector3()
  public rotation = new THREE.Euler()
  public scale = new THREE.Vector3(1, 1, 1)

  /** Base idle transform (relative to camera) */
  public basePosition = new THREE.Vector3(0.2, -0.15, -0.4)
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
        { time: 0.1, position: new THREE.Vector3(0, 0.02, 0.05), rotation: new THREE.Euler(-0.15, 0, 0) },
        { time: 0.3, position: new THREE.Vector3(0, -0.01, -0.02), rotation: new THREE.Euler(0.05, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.25,
      loop: false,
    })

    // Reload animation
    this.addClip({
      name: 'reload',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 0.15, position: new THREE.Vector3(0.05, -0.08, 0.05), rotation: new THREE.Euler(0.3, 0.2, 0.1) },
        { time: 0.5, position: new THREE.Vector3(0.08, -0.12, 0.08), rotation: new THREE.Euler(0.5, 0.3, 0.15) },
        { time: 0.85, position: new THREE.Vector3(0.03, -0.05, 0.02), rotation: new THREE.Euler(0.2, 0.1, 0.05) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 2.0,
      loop: false,
    })

    // Draw animation (equip)
    this.addClip({
      name: 'draw',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0.2, -0.3, -0.1), rotation: new THREE.Euler(0.5, 0.3, 0) },
        { time: 0.6, position: new THREE.Vector3(0.05, -0.08, -0.1), rotation: new THREE.Euler(0.1, 0.1, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.5,
      loop: false,
    })

    // Holster animation
    this.addClip({
      name: 'holster',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 0.4, position: new THREE.Vector3(0.1, -0.2, -0.1), rotation: new THREE.Euler(0.3, 0.2, 0) },
        { time: 1, position: new THREE.Vector3(0.2, -0.35, 0.1), rotation: new THREE.Euler(0.6, 0.4, 0) },
      ],
      duration: 0.4,
      loop: false,
    })

    // ADS in
    this.addClip({
      name: 'ads_in',
      keyframes: [
        { time: 0, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(-0.05, 0.02, 0.08), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.2,
      loop: false,
    })

    // ADS out
    this.addClip({
      name: 'ads_out',
      keyframes: [
        { time: 0, position: new THREE.Vector3(-0.05, 0.02, 0.08), rotation: new THREE.Euler(0, 0, 0) },
        { time: 1, position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler(0, 0, 0) },
      ],
      duration: 0.2,
      loop: false,
    })
  }

  // ─── Clip Management ──────────────────────────────────────
  addClip(clip: AnimationClip) {
    this.clips.set(clip.name, clip)
  }

  play(clipName: string, onComplete?: () => void) {
    const clip = this.clips.get(clipName)
    if (!clip) return

    this.currentClip = clipName
    this.currentTime = 0
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

  // ─── Procedural Bob ───────────────────────────────────────
  updateBob(dt: number, speed: number, isSprinting: boolean, isGrounded: boolean) {
    if (isGrounded && speed > 0.5) {
      const bobSpeed = isSprinting ? 14 : 8
      this.bobPhase += dt * bobSpeed
      this.bobIntensity = THREE.MathUtils.lerp(
        this.bobIntensity,
        isSprinting ? 1.0 : 0.6,
        dt * 8
      )
    } else {
      this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0, dt * 6)
    }

    const bobX = Math.sin(this.bobPhase) * 0.003 * this.bobIntensity
    const bobY = Math.abs(Math.cos(this.bobPhase)) * 0.004 * this.bobIntensity
    this.bobOffset.set(bobX, bobY, 0)
  }

  // ─── Procedural Sway ─────────────────────────────────────
  updateSway(dt: number, mouseX: number, mouseY: number) {
    this.swayTarget.set(-mouseX * 0.002, -mouseY * 0.002)
    this.swayCurrent.lerp(this.swayTarget, 1 - Math.exp(-8 * dt))

    this.swayOffset.set(
      this.swayCurrent.x * 0.01,
      this.swayCurrent.y * 0.01,
      0
    )
    this.swayRotation.set(
      this.swayCurrent.y * 0.01,
      this.swayCurrent.x * 0.01,
      0
    )
  }

  // ─── Kick (recoil) ───────────────────────────────────────
  addKick(recoilX: number, recoilY: number, recoilZ: number) {
    this.kickOffset.set(0, recoilY * 0.01, recoilZ * 0.005)
    this.kickRotation.set(recoilX * 0.02, 0, 0)
  }

  updateKick(dt: number) {
    this.kickOffset.lerp(new THREE.Vector3(), dt * 12)
    this.kickRotation.x = THREE.MathUtils.lerp(this.kickRotation.x, 0, dt * 12)
    this.kickRotation.y = THREE.MathUtils.lerp(this.kickRotation.y, 0, dt * 12)
    this.kickRotation.z = THREE.MathUtils.lerp(this.kickRotation.z, 0, dt * 12)
  }

  // ─── Update ──────────────────────────────────────────────
  update(dt: number): void {
    // Update clip animation
    if (this.playing && this.currentClip) {
      const clip = this.clips.get(this.currentClip)
      if (clip) {
        this.currentTime += dt

        if (this.currentTime >= clip.duration) {
          if (clip.loop) {
            this.currentTime %= clip.duration
          } else {
            this.playing = false
            this.currentTime = clip.duration
            const cb = this.onComplete
            this.onComplete = null
            if (cb) cb()
          }
        }

        // Interpolate keyframes
        const t = this.currentTime / clip.duration
        const interpolated = this.interpolateKeyframes(clip.keyframes, t)
        this.position.copy(interpolated.position)
        this.rotation.copy(interpolated.rotation)
      }
    }

    // Apply procedural offsets (additive)
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
