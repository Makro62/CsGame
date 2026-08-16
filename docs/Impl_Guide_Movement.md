# 📖 Panduan Implementasi: Karakter, Pergerakan & Movement Tech (v2.0)

Panduan langkah-demi-langkah implementasi movement menggunakan **Rapier.js KinematicCharacterController** + full **Movement Tech Suite** (slide-hop, air strafe, curve slide, moon-jump, short-hop, frame-perfect buffer, slide control).

> **Referensi:** [Design_Player.md](Design_Player.md#4-movement-physics-bible) (parameter) • [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) (status fitur #18-32)

---

## Urutan Implementasi (Prioritas)

```
1. Setup Rapier Physics & KinematicCharacterController
2. Input WASD Hook (+ input buffer timestamp)
3. Mouse Look (Camera Rotation)
4. Gerakan Dasar (Walk) + Strafe Multiplier
5. Sprint (Shift)
6. Jump & Gravitasi
7. Crouch (Ctrl, hitbox 50%)
8. Slide + Slide-Hop Chain
9. Air Strafing / Strafe-Hop
10. Curve Slide
11. Moon-Jump & Short-Hop
12. Frame-Perfect Buffer + Scroll Wheel
13. Slide Control Setting (FPS Normalization)
14. Head Bobbing
15. Enemy Outline Glow
```

---

## 1. Setup Rapier KinematicCharacterController

**File:** `client/src/game/player/PlayerController.tsx`

**Kenapa Kinematic (bukan Dynamic RigidBody)?** Dynamic body bisa "tersentak" saat menabrak sudut kontainer; kinematic controller presisi — kita tentukan arah, Rapier hanya hitung tabrakan.

```ts
world.createCharacterController(offset: 0.1)
  → enableAutostep(0.5, 0.2, true)      // naik ramp otomatis
  → enableSnapToGround(0.5)              // menempel tanah saat turun ramp
```

**RigidBody:** `type="kinematicPosition"`, collider `capsule` (tinggi 1.8m, radius 0.4m).

---

## 2. Input WASD Hook + Input Buffer

**File:** `client/src/hooks/usePlayerInput.ts`

```ts
{
  forward, backward, left, right,   // WASD
  jump, sprint, crouch, ads, shoot, reload,
  // BARU: input buffer (timestamp-based)
  jumpBuffer: number[]              // array timestamp ketika jump ditekan
}
```

**Aturan:** gunakan `useRef` (bukan `useState` per-key → re-render berlebihan). **Timestamps wajib** — semua timing movement dihitung dari `performance.now()`, bukan frame count (kunci FPS-independent).

**Scroll wheel jump (baru):** `wheel` event + deltaY > 0 → push timestamp ke jumpBuffer (sesuai Krunker pro-style).

---

## 3. Mouse Look

- `PointerLockControls` (drei) tangani rotasi kamera.
- Kamera mengikuti posisi kepala: `camera.position.set(x, y + eyeHeight, z)`.
- Arah WASD relatif kamera: `direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0))`.

---

## 4-7. Walk / Sprint / Jump / Crouch (Dasar)

| State | Speed | Syarat |
| :--- | :--- | :--- |
| Walk | 5 m/s | WASD |
| Sprint | 7.5 m/s | Shift + velocity > 0 (tidak bisa shoot) |
| Crouch | 2.5 m/s | Ctrl; kamera lerp 0.8 → 0.4m; hitbox scale 0.5 |
| Jump | JUMP_VELOCITY 5 m/s | Space + grounded |

**Gravitasi:** `-9.81 m/s²`; `velocityY` reset ke `-0.1` saat grounded (snap-to-ground).

**Strafe Multiplier (baru):** bila 2 tombol arah aktif (W+A/W+D) → kecepatan base × **1.2** (bukan normalisasi 1.0). Rumus:
```
direction = normalize(front + side) * (1.2 ketika diagonal)
```

---

## 8. Slide & Slide-Hop Chain

**Untuk singkat, ikuti spek pada ["Urutan Implementasi"](#urutan-implementasi-prioritas) #8 & pseudo-code di bawah:**

```ts
if (input.sprint && input.crouch && grounded && speed > 4) {
  slideState = { startTime: now(), duration: 0.6 }
  hitboxScale = 0.5   // sama dengan crouch
  friction = 0.5      // hampir tanpa gesekan
}

// di useFrame:
if (slideState.active) {
  if (input.jump && now() - jumpBuffer.last <= 150ms) {
    velocityXZ *= 1.3            // SLIDE-HOP: momentum boost
    velocityY = JUMP_VELOCITY    // jump
    slideState.active = false    // kembali airborne
  }
  if (now() - slideState.startTime > 0.6) endSlide()
}
```

**Error handling:** jika pemain tidak bergerak (velocity < 4) saat crouch+sprint → jangan trigger slide (hanya crouch biasa). Jika slide berakhir di tengah lereng → autostep menahan.

---

## 9. Air Strafing / Strafe-Hop

```ts
// di useFrame, saat !grounded:
const inputDir = getInputDir()          // W+A/D
if (inputDir && velocity.lengthSq() > 0.1) {
  const targetYaw = camera.rotation.y
  const velYaw = atan2(vel.x, vel.z)
  let delta = angleDelta(targetYaw, velYaw)   // -PI..PI
  delta = clamp(delta, -MAX_TURN, MAX_TURN)   // MAX_TURN = 30° per jump
  // rotasikan velocity sebesar delta * airControl (0.75)
  vel.applyAxisAngle(up, delta * 0.75)
  if (abs(delta) > MAX_TURN) vel *= 0.8        // penalti turn tajam
}
```

**Game feel:** strafe searah putaran kamera memberi akselerasi; berlawanan arah memperlambat (Krunker-style steering).

---

## 10. Curve Slide

```ts
// saat slideState.active:
const velYaw = atan2(vel.x, vel.z)
const camYaw = camera.rotation.y
const rot = angleDelta(camYaw, velYaw)
if (abs(rot) > 0.01) {
  const step = clamp(rot, -0.1, 0.1)     // max 10° per tick
  vel.applyAxisAngle(up, step)
  if (abs(rot) > 0.6) vel *= 0.95         // belok 35°+ mulai kehilangan
}
```

**Loss kecepatan saat curve ≤ 30° total: < 10%** (QA).

---

## 11. Moon-Jump & Short-Hop

```ts
// Moon-jump: jump dalam 150ms setelah release crouch
if (input.jump && now() - crouchReleasedAt <= 150) {
  velocityY = JUMP_VELOCITY * 1.4     // height × 1.4
}

// Short-hop: ADS di udara mengurangi tinggi jump
if (!grounded && input.ads) {
  // clamp velocityY ke JUMP_VELOCITY * 0.6 (height -40%)
  velocityY = min(velocityY, JUMP_VELOCITY * 0.6)
}
```

---

## 12. Frame-Perfect Buffer + Scroll Wheel

```ts
// jumpBuffer: array timestamps
const onJumpInput = (t: number) => {
  jumpBuffer.push(t)
  if (jumpBuffer.length > 5) jumpBuffer.shift()
}

// di useFrame sebelum physics:
const now = performance.now()
jumpBuffer = jumpBuffer.filter(t => now - t <= 100)   // window ±100ms
if (grounded && jumpBuffer.length > 0) {
  velocityY = JUMP_VELOCITY
  jumpBuffer = []
}
```

**Scroll wheel:** `window.addEventListener('wheel', e => e.deltaY < 0 && onJumpInput(now))`.

---

## 13. Slide Control Setting (FPS Normalization)

```ts
// Setting tersimpan di useGameStore (0-10, default 6)
const slideFactor = lerp(0.5, 1.0, slideControl / 10)

// diterapkan di friction slide:
friction_slide = 0.5 * (2 - slideFactor)   // 0 = 1.0 (keras), 10 = 0.25 (licin)
// dan traction saat turn:
traction = lerp(1.2, 0.8, slideFactor)
```

**Kenapa:** pemain 60 FPS memiliki lebih banyak friction natural (frame-per-frame); setting ini menyamakan dengan pemain 240 FPS.

---

## 14. Head Bobbing

```ts
const bobSpeed = isSprinting ? 10 : 5
const bobAmount = isSprinting ? 0.06 : 0.04
cameraOffset.y = Math.sin(time * bobSpeed) * bobAmount * (speed > 0 ? 1 : 0)
```

Nonaktif saat ADS, udara, atau slide.

---

## 15. Enemy Outline Glow

1. Render normal mesh.
2. Render kedua: scale 1.05, solid merah/oranye, `side: THREE.BackSide`.
- Hilang saat musuh di dalam smoke (check smoke zone).

---

## QA Checklist Movement Tech (implementasi)

- [ ] Slide-hop chain 3x tanpa speed reset.
- [ ] Air strafe: belok 30° bekerja, > 30° loss 20%.
- [ ] Curve slide rotasi 30° → loss < 10%.
- [ ] Moon-jump 1.4×, short-hop 0.6× height.
- [ ] Scroll wheel jump bekerja (jumpBuffer).
- [ ] Slide control 0 vs 10 terasa beda pada 60 FPS.
- [ ] Diagonal (W+A) 20% lebih cepat (1.2×).
- [ ] Tidak ada momentum reset saat jump.
- [ ] Crouch hitbox 50% memengaruhi raycast musuh.
- [ ] Semua konstanta physics dari package `shared` (client = server).

---

## Referensi Cepat: Konstanta Physics (harus di shared/)

```
walkSpeed=5, sprintSpeed=7.5, crouchSpeed=2.5, jumpVelocity=5, gravity=9.81,
strafeMultiplier=1.2, slideDuration=0.6, slideBoost=1.3, maxVelocity=12,
friction: walk=5, sprint=3, slide=0.5, air=0, airControl=0.75,
maxStrafeTurn=30°, curveTurnPerTick=0.1rad, moonJump=1.4, shortHop=0.6,
inputWindow=100ms, slideControlDefault=6
```
