# Phase 6: Audio 3D Positional & UI (v2.0)

Integrasi pengalaman suara imersif — krusial untuk FPS taktis.

> **Referensi:** [Design_Audio.md](Design_Audio.md) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md)

## Prerequisites

- Phase 5 (mode) selesai.
- Sound assets (procedural/CC0) & listener (kamera pemain) siap.

## 1. Implementasi Audio 3D Positional

- Web Audio API via `PositionalAudio` (@react-three/drei).
- Emitter: footstep (lari), gunshot (dari posisi senjata), reload.

## 2. Audio 2D (UI & HUD)

- Howler.js atau AudioBuffer untuk: hit marker dink, kill confirm cash, UI clicks.

## 3. Fitur Lanjutan: Occlusion & Prioritas (v2.0)

- Occlusion: dinding tebal → low-pass filter + volume turun.
- Priority pool: maks 12 sumber 3D; drop suara prioritas rendah (footstep jauh) demi tembakan dekat.

## 4. Audio Logika Game (v2.0 BARU)

- Beep bom: 1s → plant → stabil 4s → tempo 1.5s, panik <10s.
- Round start/end stinger, buy confirm, plant/defuse ping.

## Rollback Procedure

- Suara desync → re-sync emitter dengan posisi server snapshot (bukan posisi lokal).
- Kompresi audio rusak → build ulang asset atau fallback ke boom/simtube.

## Verification Steps

- [ ] Footstep musuh makin kencang saat mendekat; pening stereo benar.
- [ ] Dink terdengar saat HS; muffled saat tembak di balik dinding tebal.
- [ ] Pooling: 20 sumber → yang rendah prioritas di-drop, tidak crash.
- [ ] Beep bom sesuai timeline (1s/4s/1.5s/panik).

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Suara menggema aneh | Set correct reverb / distance model (linear/inverse) |
| Stereo terbalik | Normalisasi vektor listener-camera tiap frame |
| Audio 3D tidak terdengar saat move | Pastikan listener dipindahkan bersama kamera |
