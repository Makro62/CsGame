# Fase 3: Weapon Mechanics & Shooting (v2.0)

Fase ini menambahkan mekanik tembak-menembak (shooting) via **Raycasting** dari kamera (tengah layar) untuk mendeteksi objek/musuh, plus recoil, reload, dan switch.

> **Referensi:** [Impl_Guide_Weapons.md](Impl_Guide_Weapons.md) • [Design_Weapons.md](Design_Weapons.md)

## Prerequisites

- Phase 2 selesai (player controller + movement tech).
- `useWeaponStore` tersedia (Zustand).

## 1. UI Overlay: Crosshair

- Dot crosshair 6×6px CSS (lihat [Design_CSS_UI_System.md](Design_CSS_UI_System.md#a-dot-crosshair)).
- Tampil hanya saat pointer locked & bukan buy menu.

## 2. Model Senjata di Tangan (FPV)

- Group anak kamera pada posisi `[0.3, -0.3, -0.5]` + weapon sway (sin(time)).
- Per-senjata: AK 3 balok, M4 + silencer cylinder, AWP laras panjang + scope.

## 3. Logika Menembak (Raycast)

```tsx
const raycaster = new THREE.Raycaster()
raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
const intersects = raycaster.intersectObjects(scene.children, true)
```

- Client: tracer/spark/decal instan + hitmarker prediksi.
- Server: validasi + lag compensation (Fase 4 networking).

## 4. Recoil & Spray (v2.0)

- `RecoilController`: table lookup pattern "7" (AK), recovery lerp 0.15/frame.
- Spray spread: +0.003 per peluru, reset 300ms, cap per senjata.

## 5. Reload & Switch (BARU)

- Reload: timer per senjata + lockout (tembak/sprint/nade).
- **Cancel window 40%** — reload dapat dibatalkan aman di awal.
- Switch: deploy timer per senjata; tidak bisa shoot selama deploy.

## 6. Granat (Fase 3 Extended)

- HE / Smoke / Flash: RigidBody dynamic + BallCollider, lintasan parabolik.
- Trajectory preview garis putus-putus (1.5s, cooldown 5s).
- Detail: [Impl_Guide_Weapons.md](Impl_Guide_Weapons.md) step 11-14.

## Rollback Procedure

- Jika recoil terasa overpowered → kembalikan pattern table lama (git).
- Jika tracer mengganggu performa → turunkan pool 20 → 8 sementara.

## Verification Steps

- [ ] Klik kiri → console mencatat objek yang tertembak (Fase 3 dasar).
- [ ] Model senjata tampil di pojok kanan bawah & sway halus.
- [ ] Recoil "7" deterministik (2x spray identik = offset sama).
- [ ] Reload lockout bekerja; cancel window 40% benar.
- [ ] Granat: HE meledak 2s, smoke 15s block LOS, flash sudut → durasi.
- [ ] Crosshair hilang saat buy menu / non-lock.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Raycast menembus tembok | Gunakan layering: raycast harus ausktujuan semua collider physics |
| Weapon tidak ikut kamera | Render weapon sebagai child camera (bukan world) |
| Instant recharge ammo | Validasi ammo di server (jangan trust client) |
