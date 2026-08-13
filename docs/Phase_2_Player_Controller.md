# Fase 2: Player Kinematic Controller & Movement Tech (v2.0)

Berdasarkan praktik terbaik FPS, **TIDAK** menggunakan Dynamic RigidBody biasa, melainkan **Kinematic Character Controller** bawaan Rapier — mencegah bug tersangkut, mantul, atau menembus lantai.

> **Referensi spek lengkap:** [Design_Player.md](Design_Player.md#4-movement-physics-bible) • [Impl_Guide_Movement.md](Impl_Guide_Movement.md)

## Prerequisites

- Phase 1 selesai (Canvas + Physics + Ground berjalan).
- Konstanta `PHYSICS` tersedia dari `@cs-game/shared`.

## 1. Hook Input (WASD + tambahan)

- `usePlayerInput` memakai `useRef` (bukan useState per-key).
- **Timestamps wajib** (`performance.now()`) untuk input buffer frame-perfect.
- Dukung scroll wheel → jump.

## 2. Kinematic Character Controller

```tsx
// src/game/player/Player.tsx
const world = useRapier().world
const controller = world.createCharacterController(0.1)
controller.enableAutostep(0.5, 0.2, true)   // naik ramp
controller.enableSnapToGround(0.5)           // turun ramp
```

- RigidBody `type="kinematicPosition"`, collider capsule 1.8m (stand) / 0.9m (crouch).
- Gravitasi manual di useFrame (kinematic tidak terpengaruh gravitasi).

## 3. Perhitungan Gerak (Walk → Sprint → Crouch)

```ts
const SPEED = input.sprint ? 7.5 : input.crouch ? 2.5 : 5
direction.applyEuler(new THREE.Euler(0, camera.rotation.y, 0))
if (diagonal) direction *= 1.2   // strafe multiplier
```

## 4. Movement Tech (Fase 2 Extended — BARU)

| Tech | Implementasi (ringkas) |
| :--- | :--- |
| Slide-Hop | Crouch+sprint (v>4) → slide 0.6s; jump saat slide → velocity × 1.3 |
| Air Strafe | Rotasi velocity ke arah kamera maks 30°/jump, airControl 0.75 |
| Curve Slide | Rotasi velocity saat slide maks 10°/tick, loss <10% (≤30°) |
| Moon-Jump | Jump dlm 150ms setelah release crouch → velY × 1.4 |
| Short-Hop | ADS di udara → clamp velY ke 0.6× jump |
| Input Buffer | Window 100ms; scroll wheel push timestamp |
| Slide Control | Setting 0-10 memengaruhi friction slide & traction turn |

Semua detail kode di [Impl_Guide_Movement.md](Impl_Guide_Movement.md) (step 8-13).

## Rollback Procedure

- Movement terasa aneh/stuck → kembalikan ke kontrol dasar (disable tech 4 sementara via flag `ENABLE_MOVEMENT_TECH=false`).
- Gunakan git tag `phase-2-basic` sebelum movement tech.

## Verification Steps

- [ ] WASD + jump + crouch normal (tanpa tech) berjalan.
- [ ] Slide-hop chain 3x; air strafe 30°; moon-jump & short-hop bekerja.
- [ ] Sintesis: waktu tempuh T→A pakai slide-hop = ±3.3s (dalam 20% toleransi).
- [ ] Kamera mengikuti (eye 0.8 / 0.4 crouch), tidak clipping tembok.
- [ ] Auto-reload & input buffering tidak menyebabkan jitter di 60 FPS.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Pemain menembus lantai | Pastikan Ground memakai RigidBody `fixed` + collider; snapToGround aktif |
| Slide hop tidak menambah kecepatan | Cek friction 0.5 saat slide; jangan reset velocityXZ saat jump |
| Tersangkut di sudut kontainer | Autostep konfigurasi + collider kontainer 5% lebih kecil dari visual |
| Physics desync client-server | Selalu import konstanta dari `PHYSICS` (jangan hardcode) |
