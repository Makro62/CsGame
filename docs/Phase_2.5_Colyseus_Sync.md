# Phase 2.5: Colyseus Room & Client Sync (v2.0)

Fase ini menguji dan mengimplementasikan sinkronisasi jaringan antar pemain menggunakan Node.js + Colyseus, termasuk Client Prediction, Reconciliation, dan (v2.0) reconnect session resume.

> **Referensi:** [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (Section 7 Networking) • [Design_Networking_Advanced.md](Design_Networking_Advanced.md)

## Prerequisites

- Phase 0 selesai (shared schema + konstanta).
- Phase 1 selesai (client 3D environment).

## 1. Setup Colyseus Room Dasar

- Buat `GameRoom` di `server/src/rooms/GameRoom.ts`.
- Terapkan `GameState` dari `@cs-game/shared` (JANGAN duplikasi).
- Izinkan client connect dengan `joinOrCreate("game_room")`.

## 2. Sync Posisi & Rotasi

- Client kirim paket input + timestamp → server validasi → update state → broadcast 30 tick/s.
- **Client Prediction:** gerak lokal instan.
- **Server Reconciliation:** lerp halus < 0.5m; snap (teleport) > 0.5m.

## 3. Entity Interpolation (v2.0)

- Buffer interpolasi 100ms antara dua snapshot terakhir untuk pemain lain.
- Jika packet loss > 5%, aktifkan extrapolation (teruskan arah terakhir maks 200ms).

## 4. Reconnect Session Resume (BARU v2.0)

- `onLeave` non-consented → snapshot state tersimpan 60s (TTL slot).
- Join ulang dengan `sessionId` sama → restore posisi, money, weapon, skor.
- Posisi tidak aman (LOS musuh hidup) → pindah spawn aman + protection 1.5s.

## Rollback Procedure

- Desync parah → turunkan tick ke 15 sementara; bandingkan prediksi vs snapshot.
- Reconnect gagal → cek TTL slot & sessionId di payload join.

## Verification Steps

- [ ] Dua client terhubung ke server yang sama & saling melihat bergerak.
- [ ] Lerp mulus dengan simulasi latency 100ms + packet loss 2%.
- [ ] Putus koneksi 30s lalu reconnect → state lengkap kembali.
- [ ] Snapshot oplok: posisi server vs client dalam 0.5m toleransi.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Snap berlebihan (teleport) | Naikkan frekuensi snapshot atau perbaiki toleransi 0.5m |
| Interpolasi jitter | Pastikan buffer 100ms konsisten, jangan reset per frame |
| Reconnect state hilang | Cek TTL 60s dan bypass join-late rule untuk session lama |
