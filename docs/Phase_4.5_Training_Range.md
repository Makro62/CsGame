# Phase 4.5: Training Range — Mode Single (v2.0)

Mode offline untuk berlatih menembak, pergerakan (movement tech), dan recoil — tanpa logic server multiplayer.

> **Referensi:** [Design_Gameplay.md](Design_Gameplay.md) (Training Range) • [Impl_Guide_Movement.md](Impl_Guide_Movement.md)

## Prerequisites

- Phase 2 (player controller + movement tech) & Phase 3 (shooting) selesai.
- Map lokal terpisah dari Map Multiplayer.

## 1. Scene Setup Training Range

- Map lokal: Target Statis, Aim Trainer (random spawn 25m), Movement Course.
- Audio & lighting sederhana (mirip [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md)).

## 2. Fitur Aim Trainer (v2.0)

- **Dummy Target:** HP 100, respawn 2s, random spawn.
- Hit marker lokal + **score card**: akurasi %, kill count, HS rate, streak.
- Target kejar waktu: 30 targets / 60s timer (best-score simpan localStorage).

## 3. Fitur Movement Course (v2.0)

- Ramp + rintangan untuk latihan Slide-Hop, Air Strafe, Curve Slide, Moon-jump.
- Checkpoint system + timer + best time.
- **Objective mesin:** level target (mis. waktu T→A 3.3s ±20%) dari [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md#chapter-8-map-strategy).

## 4. Recoil Practice (v2.0)

- Papan grid 25m; infinite ammo (toggle semi/full-auto).
- Bullet decal bertahan 10s di dinding latihan.
- Reset spray pattern instan (tombol R) + overlay pointer grid.

## Rollback Procedure

- Jika mode single merusak mode online → pisah flag `TRAINING_MODE=true` di store.
- Jika bot latihan macet → restart session local, bukan server.

## Verification Steps

- [ ] Dummy respawn 2s setelah mati; hit marker tanpa delay server.
- [ ] Movement course bisa diselesaikan dengan slide-hop chain.
- [ ] Best time & score card tersimpan setelah refresh page.
- [ ] Recoil pattern di grid identik 2x spray (deterministik).

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Aim trainer run sendiri di mode online | Guard `TRAINING_MODE` di usePlayerInput |
| Decal menumpuk (FPS drop) | Batasi 50 decal; pool via object pooling |
| Best time di-reset tiap refresh | Gunakan localStorage, bukan state in-memory |
