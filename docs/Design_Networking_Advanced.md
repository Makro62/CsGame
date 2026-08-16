# 🌐 Desain Jaringan, Anti-Cheat, Reconnect & Network Monitor (v2.0)

Dokumen ini mendefinisikan strategi mengatasi latensi, batasan WebSocket, validasi anti-cheat, rekonsiliasi fisika, **reconnection flow**, **network quality monitor**, dan **bandwidth budget**.

> **Referensi:** [Design_Combat_Kill.md](Design_Combat_Kill.md) (validasi tembakan) • kode: `GameRoom.ts`, `AntiCheatSystem.ts`

---

## 1. Arsitektur Server Otoritatif

```
  CLIENT (Browser)                      SERVER (Colyseus Node.js)
  ─────────────────                      ──────────────────────────
  Input (W/A/S/D)  ──── WebSocket ────►  Terima input
  ↓                                       Validasi anti-cheat
  [Client Prediction]                     Hitung posisi server
  (gerak instan)                          ↓
                                          Broadcast state semua pemain
  ◄──── Snapshot ───────────────────────  Kirim corrected position
  ↓
  [Reconciliation]
  (Lerp < 0.5m, Snap > 0.5m)
```

---

## 2. Lag Compensation (Server-Side Rewinding) — Sangat Kritis

1. Server simpan **History Buffer** posisi hitbox semua pemain 500ms terakhir (snapshot per tick 33ms).
2. Terima event tembakan → baca `timestamp` penembakan client.
3. Rewind posisi target ke timestamp tersebut.
4. Raycast pada posisi historis.
5. Hit valid → kurangi HP.

**Batasan:** maks rewind 500ms; timestamp lebih tua → ditolak (cheat/koneksi buruk).

### Trade Kill Fairness
- Dua tembakan valid dalam 100ms → keduanya dihitung (urutkan timestamp, bukan urutan penerimaan paket).

---

## 3. Trade-Off Teknis: Tick Rate & Protokol

### Tick Rate 30/detik
- 33ms per update. Cukup untuk MVP browser; diskrepansi kecil saat target strafing cepat (vs 128-tick CS:GO).

### WebSocket (TCP) vs UDP

| Aspek | WebSocket/TCP | UDP (Native) |
| :--- | :--- | :--- |
| Head-of-Line Blocking | ❌ Ada | ✅ Tidak |
| Browser Support | ✅ Native | ❌ (WebRTC DataChannel) |
| Implementasi | ✅ Colyseus | ❌ Kompleks |
| Keputusan | **MVP** | Future opsi |

> [!WARNING]
> "Rubber-banding aneh" saat packet loss hampir pasti **TCP Head-of-Line Blocking** — keterbatasan arsitektur terdokumentasi, bukan bug. Monitor jaringan (section 7) membantu diagnosis.

---

## 4. Anti-Cheat Validation (Server Wajib)

### A. Movement Validation (Anti-Speedhack)
- `maxDelta = playerSpeed × deltaTime × 1.15` → tolak jika melebihi.

### B. Fire-Rate Enforcement
- Interval < `(1000/fireRate) × 0.85` → abaikan paket.

### C. Interest Management (Anti-Wallhack)
- Jangan kirim posisi pemain > 60m atau sepenuhnya di balik dinding tebal (raycast server per 100ms).

### D. Ammo & State Validation
- Ammo = 0 → tolak. `isDead` → tolak. Reloading → tolak.

### E. Movement Tech Overflow (BARU)
- Velocity > `sprintSpeed × 2.2` (12+ m/s di luar slide-hop legal) → tolak & clamp.

---

## 5. Client Prediction & Server Reconciliation

### Input Sequence Buffer
- Setiap input ber-`seq++`; client simpan input yang belum dikonfirmasi.
- Server kirim `lastProcessedSeq` per snapshot; client buang input ≤ seq tersebut, lalu re-simulasi sisanya.

### Koreksi Halus
- < 0.5m → Lerp 3-5 frame.
- > 0.5m → Snap (desync besar).

### Movement Tech Note (BARU)
- Prediksi client menjalankan **fisika movement lokal yang identik** dengan server (friction, air strafe, slide control) — beda nilai parameter = desync permanen. Simpan konstanta physics di package `shared`.

---

## 6. Reconnection Flow (BARU)

```
Disconnect terdeteksi (websocket close / timeout 5s tanpa paket)
   ↓
Server: simpan snapshot pemain (posisi valid terakhir, money, weapon, skor, ronde)
   ↓  client otomatis mencoba reconnect setiap 2s (maks 60s window)
   ↓
Berhasil reconnect → server cek sessionId sama
   ├─ ✅ Cocok → pulihkan state penuh, posisi terakhir valid (dengan 1.5s spawn protection jika posisi tidak aman)
   └─ ❌ Beda session / > 60s → dianggap player baru (join ulang sebagai rekan baru, state reset)
```

- **Anti-abuse:** reconnect tidak memberi keuntungan posisi (posisi valid terakhir yang disimpan).
- Player yang disconnect dianggap "afk" mulai detik 30 dalam window; bot dummy tidak ada di MVP (cukup antri).

---

## 7. Network Quality Monitor (BARU)

| Metrik | Cara Ukur | Threshold Warning |
| :--- | :--- | :--- |
| **Ping (RTT)** | Timestamp echo tiap 1s (kirim `ping` → server balas `pong`) | > 120ms |
| **Packet Loss** | Hitung paket yang tidak diakui `lastProcessedSeq` (gap) | > 5% |
| **Jitter** | Deviasi ping antar sampel terakhir 10 | > 30ms |

**UI:** Ping display (hijau <80 / kuning 80-150 / merah >150) + **Lag Warning Banner** ketika threshold terlampaui 3 detik berturut.

---

## 8. Bandwidth Budget (BARU)

| Pesan | Ukuran | Frekuensi |
| :--- | :--- | :--- |
| Input (client → server) | ~40 bytes | 30/s |
| Snapshot (server → client) | ~30 bytes/pemain | 30/s |
| Shoot event | ~50 bytes | Saat tembak |
| Kill/Audio event | ~60 bytes | Occasional |
| Interest filter aktif | -50% paket | Selalu |

**Estimasi:** ~10 KB/s/pemain naik; ~10-20 KB/s turun (tergantung pemain terlihat). 10 pemain ≈ 100-200 KB/s — aman untuk koneksi rumah.

---

## 9. Mitigasi Risiko: Rapier Kinematic Reconciliation

Fase 2.5 memvalidasi `KinematicCharacterController` Rapier menerima koreksi posisi absolut dari Colyseus tanpa "tersentak". Jika snapping terjadi → terapkan Lerp (section 5).

**Selalu simpan konstanta physics di `shared/`** — client & server harus pakai nilai yang identik:
- walkSpeed, sprintSpeed, crouchSpeed, slideBoost, strafeMultiplier, friction per state, airControl, slideControl formula, maxVelocity = 12 m/s.

---

## 10. QA Checklist Networking

- [ ] 2 client saling lihat & tembak (latensi 0 ms).
- [ ] Simulasi 100ms latency: prediction tetap responsif, reconciliation benar.
- [ ] Packet loss simulasi 10%: tanpa teleport tidak wajar.
- [ ] Rewind 500ms: hit fair di ping 150ms.
- [ ] Disconnect → reconnect 60s → state pulih (money & skor).
- [ ] Ping/loss/jitter display akurat; banner muncul di threshold.
- [ ] Interest management: musuh >60m/tembok tidak terkirim.
- [ ] Anti-cheat menolak speedhack (delta > 15%) dan fire-rate hack.
