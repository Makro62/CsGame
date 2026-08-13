# 📋 Dokumen Desain Game FPS Web — Analisis Lengkap (v2.0)
## CS:GO / Krunker Clone — Production-Ready Design Reference

**Versi:** 2.0  
**Status:** Final untuk Implementasi  
**Platform:** Browser Desktop (WebGL)  
**Engine:** Three.js + React Three Fiber  
**Networking:** Colyseus (Node.js)  
**Physics:** Rapier.js  

---

## 1. Ringkasan Proyek & Tech Stack

Game ini adalah First-Person Shooter berbasis web dengan kecepatan Krunker.io (movement tech penuh) dan elemen taktis CS:GO (Bomb Defusal). Dapat dimainkan langsung dari browser tanpa instalasi.

### Stack Frontend

| Komponen | Teknologi |
| :--- | :--- |
| Build Tool | Vite |
| UI Framework | React + TypeScript |
| 3D Engine | Three.js + React Three Fiber (R3F) |
| Helper 3D | @react-three/drei |
| Physics | Rapier.js (@react-three/rapier) — Kinematic Character Controller |
| State | Zustand (useGameStore + useNetworkStore + useWeaponStore) |
| Styling | Tailwind CSS + Vanilla CSS (Zero Asset UI) |
| Audio 3D | Web Audio API + drei PositionalAudio |

### Stack Backend

| Komponen | Teknologi |
| :--- | :--- |
| Runtime | Node.js |
| Multiplayer | Colyseus |
| Schema | @colyseus/schema |
| Shared Types | Monorepo @cs-game/shared |

---

## 2. Mode Permainan

| Mode | Format | Nyawa | Keterangan |
| :--- | :--- | :--- | :--- |
| **Single (Training Range)** | 1 Pemain | Tak Terbatas | Lokal offline: dummy target, aim trainer, movement course, recoil practice |
| **Mabar Bomb Defusal** | 5 vs 5 (Max 10) | 1 / Ronde | CS:GO Style, 15 ronde first-to-8 (+ OT) |
| **FFA Deathmatch** (Roadmap) | 8-12 Pemain | Respawn cepat | First-to-50 kills |
| **Gun Game** (Roadmap) | 8 Pemain | Respawn cepat | Ladder 7 senjata, pertama selesai menang |
| **TDM** (Roadmap) | 5v5 | Respawn cepat | First-to-100 kills |

---

## 3. Prinsip Desain Inti (Dikunci)

1. **Server Otoritatif:** HP, damage, kill, death, ekonomi, validasi tembakan = 100% server.
2. **Client Prediction:** Pergerakan lokal terasa instan tanpa menunggu server.
3. **Server Reconciliation:** Koreksi posisi halus (Lerp < 0.5m, Snap > 0.5m).
4. **Entity Interpolation:** Pemain lain bergerak mulus di antara snapshot server.
5. **Zero External Asset UI:** Semua HUD dibuat murni Vanilla CSS.
6. **Movement Momentum-Based:** Semua tech movement berbasis momentum (bukan kecepatan tetap), dengan Slide Control untuk fairness lintas FPS.
7. **Uniform Stats:** Semua pemain 100 HP & kecepatan sama (skill-based murni).

---

## 4. Sistem Senjata — Statistik Lengkap

> Angka diambil langsung dari `@cs-game/shared` (`WEAPONS`). Ada **10 senjata** total (5 senjata utama dapat dibeli, 2 pistol murah, 2 melee, 1 pistol gratis).

| Senjata | Tim | Harga | Damage Torso | Headshot | Fire Rate | Magazine | Reload |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| AK-47 | T | $2,700 | 35 | 100 (1-hit kill) | 10/dtk | 30 + ∞ | 2.4s |
| M4A1-S | CT | $3,100 | 31 | 92 (vs Helm) | 11/dtk | 25 + ∞ | 3.1s |
| AWP | Keduanya | $4,750 | 115 (1-hit kill) | 115 | Bolt 1.2s | 5 + ∞ | 3.7s |
| Desert Eagle | Keduanya | $700 | 53 | 100 (1-hit kill) | Semi 0.3s | 7 + ∞ | 2.2s |
| MP5 (SMG) | Keduanya | $1,500 | 24 | 72 | 10.5/dtk | 30 + ∞ | 2.1s |
| Glock | Keduanya | $200 | 22 | 78 | 8/dtk | 20 + ∞ | 1.8s |
| Tec-9 | T | $500 | 18 | 65 | 12/dtk | 18 + ∞ | 1.6s |
| Auto Pistol | CT | $500 | 20 | 70 | 9/dtk | 15 + ∞ | 1.5s |
| Knife | Keduanya | $0 (gratis) | 50 | 100 | 2/dtk | - | - |
| Combat Knife | Keduanya | $0 (gratis) | 55 | 100 | 2.5/dtk | - | - |

### Wallbang & Penetrasi

> ⚠️ **PENTING: Wallbang BELUM diimplementasikan di kode** (client maupun server). Tabel ini adalah spesifikasi rencana, bukan perilaku saat ini. Semua permukaan saat ini solid (peluru diblokir). Status: [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) #39.

| Material | Tembus? (rencana) | Pengurangan | Penetrasi Maks |
| :--- | :--- | :--- | :--- |
| Pintu Kontainer / Boks Kayu | ✅ Ya (AK47/AWP/Deagle) | -50% damage | Maks 2 permukaan |
| Tong Besi / Tembok Solid | ❌ Tidak | Diblokir | 0 |
| Tembok Pembatas Arena | ❌ Tidak | Diblokir | 0 |

### TTK (Time-To-Kill) Ringkasan

| Penembak vs Target | Torso | Kepala (tanpa helm) | Kepala (helm) |
| :--- | :--- | :--- | :--- |
| AK-47 (100 HP) | 3 peluru | 1 peluru | 1 peluru |
| M4A1-S (100 HP) | 4 peluru | 2 peluru | 2 peluru |
| AWP | 1 peluru | 1 peluru | 1 peluru |
| Deagle | 2 peluru | 1 peluru | 1 peluru |

---

## 5. Bomb Defusal — Aturan Lengkap

| Parameter | Nilai |
| :--- | :--- |
| Format | 5v5, First to 8 Ronde (15 total) |
| Durasi Ronde | 1 menit 55 detik |
| Buy Phase | 15 detik awal ronde |
| Timer Bom C4 | 40 detik setelah tertanam |
| Tanam C4 | 3 detik (pemain diam) |
| Defuse Tanpa Kit | 10 detik |
| Defuse Dengan Kit | 5 detik (Beli Kit CT: $400) |
| Half-Time | Ronde ke-8 — tim bertukar sisi |
| Overtime | Skor 7-7 → first-to-9 (maks 2 ronde tambahan) |
| Ready/Skip Buy | Semua pemain ready → skip sisa buy phase (mulai aktif lebih cepat) | 🟨 handler `ready` ada di server; tanpa UI client |
| Reconnect Window | 60 detik (state dipertahankan) | 🔲 belum diimplementasikan |

### Ekonomi

| Event | Bonus |
| :--- | :--- |
| Pistol Round (Ronde 1) | $800 |
| Menang Ronde | +$3,250 |
| Kalah Ronde (loss bonus) | +$1,400 — +$1,900 |
| Kill Rifle | +$300 |
| Kill AWP | +$100 |
| Kill SMG/MP5 | +$600 |
| Tanam Bom | +$300 (seluruh tim T) |
| Defuse Berhasil | +$300 (individu CT) |
| Max Money Cap | $16,000 |

---

## 6. Karakter & Movement Tech (Full Krunker-Inspired)

### Kecepatan Dasar

| Input | Aksi | Kecepatan |
| :--- | :--- | :--- |
| WASD | Gerakan Dasar | 5 m/s |
| Shift + WASD | Sprint | 7.5 m/s |
| Ctrl | Crouch | 2.5 m/s (hitbox -50%) |
| Space | Jump | Gravitasi Rapier |
| Sprint + Crouch | Slide | 0.6s, hitbox crouch |
| Slide + Jump | Slide-Hop | Momentum sprint × 1.3 |

### Movement Tech Advanced

| Tech | Deskripsi | Parameter |
| :--- | :--- | :--- |
| **Air Strafing** | Mouse turn di udara → rotasi velocity | Maks 30° / lompatan, akselerasi 0.75 factor |
| **Strafe Multiplier** | Gerakan diagonal lebih cepat | × 1.2 (bukan 1.0) |
| **Curve Slide** | Belok saat slide tanpa kehilangan momentum | Rotasi velocity, loss < 10% |
| **Moon-Jump** | Jump tinggi setelah exit slide | Height × 1.4, timing window 150ms |
| **Short-Hop** | ADS di udara → jump rendah | Reduce height 40% |
| **Frame-Perfect Buffer** | Input jump presisi (±2 frame) | Window 100ms, timestamp-based, scroll wheel support |
| **Slide Control Setting** | Normalisasi FPS → movement | Nilai 0-10, default 6 |

### Friction & Air Control

| State | Friction | Air Control |
| :--- | :--- | :--- |
| Walk (ground) | 5.0 | - |
| Sprint (ground) | 3.0 | - |
| Slide (active) | 0.5 | 0.4 |
| Airborne | 0.0 | 0.75 (dengan W pressed) |

---

## 7. Networking — Parameter Kritis

| Parameter | Nilai |
| :--- | :--- |
| Server Tick Rate | 30 tick/detik |
| Lag Compensation Rewind | Max 500ms |
| Koreksi Halus (Lerp) | < 0.5m perbedaan |
| Koreksi Langsung (Snap) | > 0.5m perbedaan |
| Interpolation Buffer (remote) | 100ms |
| Protokol | WebSocket (Colyseus/TCP) |
| Network Monitor | Ping/loss/jitter sampling per detik |
| Lag Warning Threshold | Ping > 120ms ATAU loss > 5% |

### Bandwidth Budget (Per Client)

| Pesan | Ukuran | Frekuensi |
| :--- | :--- | :--- |
| Input (client → server) | ~40 bytes | 30/s (per tick) |
| Snapshot (server → client) | ~30 bytes/pemain | 30/s |
| Shoot event | ~50 bytes | Saat tembak |
| Kill/Audio event | ~60 bytes | Occasional |
| **Estimasi total** | **~10 KB/s per pemain** | 10 pemain = ~100 KB/s |

---

## 8. Anti-Cheat (Server Wajib)

1. **Speedhack:** Tolak jika delta > `speed × deltaTime × 1.15`.
2. **Fire-Rate:** Tolak jika interval < `(1000 / fireRate) × 0.85ms`.
3. **Ammo Hack:** Tolak tembakan jika `ammo <= 0`.
4. **Dead Shoot:** Tolak tembakan jika `isDead === true`.
5. **Interest Management:** Jangan kirim posisi musuh > 60m atau di balik dinding solid.
6. **Reload Exploit:** Tolak tembakan selama `isReloading`.
7. **Movement Tech Overflow:** Tolak velocity > `sprintSpeed × 2.2` (akselarasi slide-hop ilegal).

---

## 9. Combat — Formula Damage

```
Final Damage = Base Damage × Hitbox Multiplier × Wallbang Modifier
```

| Zona Hitbox | Multiplier |
| :--- | :--- |
| Kepala | 2.0x |
| Torso | 1.0x |
| Tangan & Kaki | 0.7x |

### Contoh Perhitungan

| Kasus | Perhitungan | Hasil |
| :--- | :--- | :--- |
| AK-47 → Kepala (tanpa helm) | 35 × 2.0 | 70 dmg (2 hit kill) |
| AK-47 → Kepala (dengan helm) | 100 (rule-based 1-hit) | Kill |
| M4A1 → Kepala (helm) | 46 × 2.0 = 92 | 92 dmg (2 hit kill) |
| AK-47 wallbang → Torso | 35 × 0.5 | 17.5 dmg |
| AK-47 wallbang → Head | 35 × 2.0 × 0.5 | 35 dmg |
| Deagle → Limbs | 53 × 0.7 | 37.1 dmg |

---

## 10. Spectator System

| Mode | Trigger | Deskripsi |
| :--- | :--- | :--- |
| Death Cam | Player mati | 1 detik, kamera follow killer dari posisi victim |
| Free Cam | Tombol F | Kamera bebas dalam batas map, WASD + scroll zoom |
| Player Follow | Tombol 1-9 | Follow pemain hidup (nama + K/D di HUD) |
| Objective Cam | Tombol O | Auto-follow bom / pemain yang defuse |
| Third-Person | Tombol V (spectate) | Toggle di atas bahu pemain yang di-follow |
| Skip Next Player | Tombol G | Lompat ke pemain berikutnya |

---

## 11. Training Range (Mode Single)

| Fitur | Deskripsi |
| :--- | :--- |
| Dummy Target | HP 100, respawn 2s, 3 behavior (idle / polar / random strafe) |
| Aim Trainer | Target spawn acak, hit & headshot counter, mode timer 60s |
| Movement Course | Track slide-hop dengan checkpoint + best time |
| Recoil Practice | Target 25m + overlay pola spray |
| Setting Bebas | Infinite ammo, god mode, spawn/swap weapon, set jarak dummy |

---

## 12. HUD Elements (Semua Pure CSS — Zero Image)

| Elemen | Posisi | Keterangan |
| :--- | :--- | :--- |
| Dot Crosshair | Tengah | 6px solid white, shadow hitam |
| HP Bar | Kiri Bawah | Gradient merah→hijau |
| Ammo | Kanan Bawah | `30 / ∞` Roboto Mono |
| Timer & Skor | Tengah Atas | `RED 12 | 03:45 | BLUE 10` |
| Kill Feed | Kanan Atas | Slide-in, hilang 5 detik, maks 4 entri |
| Skull Kill Confirm | Tengah | CSS geometry tengkorak emas |
| Damage Vignette | Tepi Layar | Inset shadow merah 0.3s |
| AWP Scope | Full Screen | Radial-gradient hitam CSS |
| **FPS Counter** | Kiri Atas (kecil) | Roboto Mono 10px, update 1x/s |
| **Ping Display** | Kanan Atas | Hijau <80ms, Kuning 80-150ms, Merah >150ms |
| **Minimap** | Kanan Bawah | 2D canvas, toggle M, player arrows + bomb icon |
| **Lag Warning Banner** | Tengah Atas | Merah, muncul saat network quality drop |
| Leaderboard (TAB) | Full Screen | Tabel K/D semua pemain + ping |
| Death Screen | Full Screen | Grayscale + countdown respawn + tombol spectate |
| Buy Menu | Full Screen | Glassmorphism, toggle B |

---

## 13. Audio System

| Kategori | Contoh | Layer |
| :--- | :--- | :--- |
| 3D Positional (Mono) | Footstep, gunshot, reload musuh | Web Audio API HRTF |
| 2D UI | Hitmarker dink, kill confirm cash | Howler.js / AudioBuffer |
| Warning | Low HP heartbeat | 2D loop |

### Spesifikasi File Audio

| Parameter | Nilai |
| :--- | :--- |
| Format | OGG (fallback MP3) |
| Sample Rate | 44.1 kHz |
| Channel | Mono (wajib untuk 3D), Stereo (UI) |
| Preload | Semua decode saat loading screen |

### Occlusion & Prioritas

- **Occlusion:** Raycast listener → source; jika tertembus dinding tebal → low-pass 800Hz + volume -12dB.
- **Priority Pool:** Maks 12 source 3D simultan. Urutan drop: Kill Confirm > Headshot > Hitmarker > Gunshot > Footstep.

---

## 14. Performance Budget

| Parameter | Target | Wajib |
| :--- | :--- | :--- |
| FPS | 120+ (target), min 60 | ✅ |
| Load Time | < 3 detik | ✅ |
| Draw Calls | < 500 (instancedMesh) | ✅ |
| Memory | < 400 MB | ✅ |
| Max 3D Audio Sources | 12 aktif | ✅ |
| Max Decal Aktif | 50 (lifetime 10s) | ✅ |
| Tracer Pool | 20 objek (object pooling) | ✅ |

---

## 15. Roadmap Mode Tambahan (Fase 2)

| Mode | Spec Ringkas | Prioritas |
| :--- | :--- | :--- |
| FFA Deathmatch | 8-12 pemain, first-to-50 kills, respawn 2s, senjata bebas | 1 |
| Gun Game | 8 pemain, ladder: Deagle → MP5 → AK-47 → M4A1-S → Deagle relaunch → AWP → Knife, kill mendorong naik tingkat, death turun tingkat | 2 |
| TDM | 5v5, first-to-100 kills, spawn protection 1s | 3 |

---

## 16. QA Checklist Minimal (Sebelum Release)

- [ ] WASD + Sprint + Crouch + Jump responsif.
- [ ] Slide-Hop berfungsi dengan momentum (chainable ≥ 3x).
- [ ] Air strafe mengubah arah di udara ≥ 30°.
- [ ] Curve slide tidak kehilangan momentum > 10%.
- [ ] Moon-jump & short-hop berfungsi sesuai parameter.
- [ ] Slide Control setting mengubah perilaku di FPS berbeda.
- [ ] Tembakan mengurangi ammo.
- [ ] Reload mengunci tembakan.
- [ ] Wallbang mengurangi damage 50% (maks 2 permukaan).
- [ ] HP berkurang dari server, bukan client.
- [ ] Kill Feed muncul dari event server.
- [ ] Leaderboard TAB menampilkan K/D + ping real-time.
- [ ] FPS counter & ping display bekerja.
- [ ] Minimap toggle M menampilkan pemain + bom.
- [ ] Lag warning muncul saat ping > 120ms.
- [ ] Spectator: death cam → free cam → player follow → objective cam bekerja.
- [ ] Bom bisa ditanam di Site A & B, didefuse CT.
- [ ] Buy Menu muncul hanya di Buy Zone saat Buy Phase.
- [ ] Economy money bertambah dari kill & ronde. Max cap $16,000.
- [ ] Anti-cheat menolak speedhack & fire-rate hack.
- [ ] Reconnect dalam 60s mengembalikan state pemain.
- [ ] Vote kick & forfeit bekerja.
- [ ] 2 client bisa saling melihat dan saling tembak.
- [ ] Posisi pemain lain smooth (interpolasi, tidak teleport).
- [ ] Training range: dummy, aim trainer, movement course berfungsi.

---

## 17. Risiko Teknis & Mitigasi

| Risiko | Dampak | Mitigasi |
| :--- | :--- | :--- |
| Latency tinggi | Lag terasa | Client prediction + reconciliation + network monitor |
| TCP Head-of-Line Blocking | Rubber-banding | Documented trade-off, monitor ping, future WebRTC |
| Audio blocked browser | Tidak ada suara | "Click to Start" unlock AudioContext |
| Memory leak effects | FPS drop lama | Object pooling tracers/sparks/decals |
| Movement FPS-dependent | Tidak fair lintas hardware | Slide Control setting (normalisasi) |
| Weapon balance buruk | Meta rusak | Tune stats, playtest iteratif (lih. Balance Rationale) |
| Spawn kill | Pengalaman buruk | Spawn protection 1.5s + safe spawn selection |
| Cheat hit registration | Rasa tidak adil | Anti-cheat 7 validasi + lag comp batas 500ms |

---

## 18. Prioritas Implementasi

- **[Fase 0: Monorepo Setup & Shared Schema](Phase_0_Monorepo_Setup.md)** — NPM workspaces, Shared Types, & Colyseus Schema.
- **[Fase 1: Setup & Environment](Phase_1_Setup_Environment.md)** — React + Vite + R3F Canvas dasar.
- **[Fase 2: Player Controller & Movement Tech](Phase_2_Player_Controller.md)** — Rapier Kinematic Controller, slide-hop, air strafe, curve slide, moon-jump.
- **[Fase 2.5: Network Prototype](Phase_2.5_Colyseus_Sync.md)** — Colyseus Room dasar, sync 2 client, client prediction validation.
- **[Fase 3: Weapon Mechanics](Phase_3_Weapon_Mechanics.md)** — Raycast tembakan, recoil pattern "7", reload.
- **[Fase 4: Combat System & Multiplayer Setup](Phase_4_Multiplayer_Setup.md)** — Health/damage, kill feed, respawn, spectator broadcast.
- **[Fase 4.5: Training Range (Offline Mode)](Phase_4.5_Training_Range.md)** — Dummy target, aim trainer, movement course, recoil grid.
- **[Fase 5: Bomb Defusal Mode & Ekonomi](Phase_5_Bomb_Defusal.md)** — Round loop 15 ronde, Buy Menu, C4 plant/defuse, ekonomi ($16,000 cap).
- **[Fase 5.5: Integrasi Map Container Yard](Phase_5.5_Map_Integration.md)** — 3D map 60×40m, buy/plant zones, wallbangable boxes.
- **[Fase 6: Audio 3D Positional & UI](Phase_6_Audio_3D.md)** — Spatial HRTF, wall occlusion filter, Howler.js UI sounds.
- **[Fase 7: Polish, HUD & Network Monitor](Phase_7_Polish_HUD.md)** — Pure CSS HUD, Minimap 2D, FPS/ping display, lag warning banner.
- **[Fase 8: Roadmap Mode (Post-MVP)](Phase_8_Roadmap_Modes.md)** — FFA Deathmatch, Arms Race / Gun Game, Team Deathmatch.