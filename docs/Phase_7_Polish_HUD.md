# Phase 7: Polishing UI, HUD & Game Feel (v2.0)

Langkah terakhir sebelum MVP: game feel + feedback visual lengkap.

> **Referensi:** [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) • [Impl_Guide_HUD_UI.md](Impl_Guide_HUD_UI.md)

## Prerequisites

- Phase 6 (audio) selesai.
- HUD base (crosshair, HP, ammo) dari [Design_CSS_UI_System.md](Design_CSS_UI_System.md) sudah tampil.

## 1. Polish Pergerakan Kamera (v2.0)

- Head bobbing ritmis (nonaktif saat ADS/lompat) + dropdown camera physics.
- FOV kick saat sprint (+5) & ADS (75 → 60, lerp 0.1s).

## 2. Visual Polish: Decals & Tracers

- Bullet tracers object-pooled (20 object, garis tipis kuning 60ms life).
- Impact sparks & decal dinding; max 50 decal untuk performa.

## 3. Advanced HUD & Network Monitor (v2.0)

- Minimap 2D dapat diputar (toggle M, panah teman + ikon bom).
- FPS kiri atas, ping kanan atas; **warna status** hijau <80ms, kuning 80-150ms, merah >150ms.
- Lag warning banner jika ping >120ms / packet loss >5%.

## 4. Spectator System & Kill Feed (v2.0)

- Spectator: free cam (F), follow player (angka), death cam 1s setelah mati ([Design_Combat_Kill.md](Design_Combat_Kill.md)).
- Kill feed CSS slide-in; oversized kill card saat clutch (1vX).

## Rollback Procedure

- FPS drop setelah polish → matikan head bob + kurangi decal (50 → 20).
- Minimap bocor info musuh → disable ikon musuh di mode competitive.

## Verification Steps

- [ ] Bobbing mulus; FOV berubah saat sprint/ADS.
- [ ] Tracer & decal tampil; FPS tetap stabil di 60 (draw calls ≤ 450).
- [ ] Minimap akurat posisi teman + ikon bom; FPS/ping warna benar.
- [ ] Spectator 3 mode berfungsi; kill feed animasi mulus.
- [ ] Banner ping muncul saat >120ms (simulasi throttle).

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Minimap posisi salah | Sampling posisi dari server state, bukan local predicted |
| Tracer penuh (lag) | Pool 20 → 8; reuse object; jangan spawn per detik |
| Banner ping false-positive | Ambang 120ms dihitung rata-rata 1s (bukan spike) |
