# ✅ Master Implementation Checklist — CS Web FPS (v2.1)

Dokumen ini adalah daftar fitur yang telah **dikonfirmasi untuk diimplementasikan**. Setiap fitur memiliki **dependensi** (fitur lain yang harus selesai lebih dulu) dan **testing criteria** (cara memverifikasi fitur bekerja).

> **Referensi Spesifikasi:** [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (angka dikunci) • [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) (game loop & mekanik) • [docs/README.md](README.md) (index semua dokumen)

**Legenda Status:** 🔲 Belum | 🟨 In Progress | ✅ Selesai  
**Legenda Prioritas:** 🟢 MVP (wajib rilis pertama) | 🟡 High (segera setelah MVP) | 🔵 Post-MVP (polish/roadmap)

---

## 1. 🖥️ UI & HUD (Antarmuka Pengguna)

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 1 | Main Menu (Nickname, pilih Mode Single / Mabar) | 🟢 | - | Klik tombol → menu hilang → canvas 3D muncul | ✅ Selesai |
| 2 | Buy Menu Glassmorphism (tombol 'B') | 🟢 | #36 Economy | Hanya muncul di Buy Zone saat Buy Phase | ✅ Selesai |
| 3 | HUD Lengkap (HP, Ammo, Timer, Skor Tim) | 🟢 | #1 | Angka berubah real-time sesuai state server | ✅ Selesai |
| 4 | Kill Feed (nama pembunuh & korban) | 🟢 | Combat System | Entri hilang otomatis 5 detik, maks 4 | ✅ Selesai |
| 5 | Skull Kill Confirm (CSS emas) | 🟢 | #4 | Muncul 0.6s dari event server `kill_confirmed` | ✅ Selesai |
| 6 | Damage Vignette (tepi merah) | 🟢 | Combat System | Red flash 0.3s saat event `PlayerDamaged` | ✅ Selesai |
| 7 | Leaderboard (TAB, K/D + Ping) | 🟢 | Network | Tabel lengkap + skor tim per sisi | ✅ Selesai |
| 8 | AWP Sniper Scope Overlay | 🟢 | Weapon System | Aktif hanya AWP + Klik Kanan | ✅ Selesai |
| 9 | Death Screen (grayscale + countdown) | 🟢 | Combat System | Countdown 3s → auto respawn | ✅ Selesai |
| 10 | Radio Commands UI (Z + 1/2/3) | 🟡 | #4 | Pesan muncul 3s, hanya untuk 1 tim | ✅ Selesai |
| 11 | **FPS Counter (kiri atas)** | 🟡 | #3 | Update 1x/s, akurat ±2 FPS | ✅ Selesai |
| 12 | **Ping Display (kanan atas, warna)** | 🟡 | Network | Hijau <80, kuning 80-150, merah >150ms | ✅ Selesai |
| 13 | **Minimap 2D (toggle M)** | 🟡 | Map + Network | Panah pemain + ikon bom + rotate view | ✅ Selesai |
| 14 | **Lag Warning Banner** | 🔵 | #12 | Muncul saat ping >120ms / loss >5% | ✅ Selesai |
| 15 | **Settings Menu (video, sens, slide control, keybind)** | 🟡 | #1 | Perubahan diterapkan tanpa restart | ✅ Selesai |
| 16 | **Vote Kick UI** | 🔵 | Server | Vote 50%+ pemain → kick | ✅ Selesai (handler `vote_request`/`vote_kick` di GameRoom.ts + tombol KICK di Leaderboard) |
| 17 | **Ready/Skip Buy UI** | 🟡 | #2 | Semua ready → +10s waktu aktif | ✅ Selesai (Tombol Ready {readyCount} ter-mount di HUD.tsx & handler server `ready`/`skipBuyPhase`) |

---

## 2. 🏃 Karakter, Pergerakan & Movement Tech

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 18 | Gerakan WASD dasar (5 m/s) | 🟢 | Rapier setup | Maju/mundur/kiri/kanan mulus | ✅ Selesai |
| 19 | Mouse Look (PointerLock) | 🟢 | - | Kamera ikut mouse, tanpa jitter | ✅ Selesai |
| 20 | Sprint (Shift, 7.5 m/s) | 🟢 | #18 | Tidak bisa tembak saat sprint | ✅ Selesai |
| 21 | Jump + Gravitasi | 🟢 | #18 | Mendarat mulus di ramp (snap-to-ground) | ✅ Selesai |
| 22 | Crouch (Ctrl, hitbox -50%, 2.5 m/s) | 🟢 | #18 | Kamera lerp 0.8 → 0.4 m halus | ✅ Selesai |
| 23 | **Slide (Sprint + Crouch, 0.6s)** | 🟢 | #20, #22 | Hitbox crouch, kecepatan sprint | ✅ Selesai |
| 24 | **Slide-Hop Chain (momentum × 1.3)** | 🟢 | #23 | 3x chain tanpa reset kecepatan | ✅ Selesai |
| 25 | **Air Strafing / Strafe-Hop** | 🟡 | #24 | Belok 30° di udara, diagonal ×1.2 | ✅ Selesai |
| 26 | **Curve Slide** | 🔵 | #24 | Belok saat slide, loss momentum < 10% | ✅ Selesai |
| 27 | **Moon-Jump (height ×1.4)** | 🔵 | #24 | Timing window 150ms | ✅ Selesai |
| 28 | **Short-Hop (ADS di udara)** | 🔵 | #24 | Jump height -40% | ✅ Selesai |
| 29 | **Frame-Perfect Input Buffer (scroll wheel)** | 🔵 | #24 | Jump presisi ±100ms, scroll support | ✅ Selesai |
| 30 | **Slide Control Setting (0-10, FPS normalize)** | 🟡 | #24 | Hasil movement konsisten di 60 vs 120 FPS | ✅ Selesai |
| 31 | Head Bobbing (kamera goyang) | 🟡 | #19 | Nonaktif saat ADS/udara | ✅ Selesai |
| 32 | Enemy Outline Glow | 🟢 | Player model | Hilang saat musuh di dalam smoke | ✅ Selesai |

---

## 3. 🔫 Senjata, Peluru & Utilitas

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 33 | Hipfire (tembak tanpa ADS) | 🟢 | Weapon model | Spread sesuai tabel akurasi | ✅ Selesai |
| 34 | ADS / Zoom (Klik Kanan, akurasi 100%) | 🟢 | #33 | Zoom dalam, spread 0 | ✅ Selesai |
| 35 | Recoil Pattern "7" (AK-47) | 🟢 | #33 | Pola deterministik, bisa dikompensasi | ✅ Selesai |
| 36 | Spray Spread (kumulatif) | 🟢 | #35 | Reset setelah 300ms tidak menembak | ✅ Selesai |
| 37 | Bullet Tracers (objek pool 20) | 🟢 | #33 | Hilang 60ms, tanpa GC spikes | ✅ Selesai (`TracerManager` ter-mount di `App.tsx` & `TrainingRange.tsx`) |
| 38 | Impact Sparks & Decals (maks 50, 10s) | 🟡 | #37 | Decal tertua terhapus saat limit | ✅ Selesai (`ImpactSpark` & `VisualEffects.tsx` ter-mount) |
| 39 | Wallbang System (2-pass raycast, -50%) | 🟢 | #33 | Maks 2 permukaan tembus | ✅ Selesai (Server `GameRoom.ts` `wallbangFactor` = 0.5 pada obstacle kayu) |
| 40 | Reload Mechanic (R, audio cue) | 🟢 | #33 | Lock out tembak/sprint/granat | ✅ Selesai |
| 41 | Weapon Switch (timing deploy/undeploy) | 🟡 | #33 | Tidak bisa shoot saat switch | ✅ Selesai |
| 42 | Flashbang (blind 1-3s, tinnitus) | 🟡 | Grenade system | Sudut → durasi blindness | ✅ Selesai (Simulasi server `throw_grenade` & `grenadeDetonated`) |
| 43 | Smoke Grenade (blokir LOS 15s) | 🟢 | Grenade system | Outline hilang di dalam smoke | ✅ Selesai (Simulasi server `GameRoom.ts` + LOS block) |
| 44 | HE Grenade (radius 4m, 80 max) | 🟢 | Grenade system | Damage turun sesuai jarak | ✅ Selesai (Simulasi server `GameRoom.ts` calculate HE damage) |
| 45 | **Nade Throw Trajectory Preview** | 🔵 | #42-44 | Garis putus-putus 1.5s, cooldown untuk spam | ✅ Selesai (`PreviewArc` di `GrenadeSystem.tsx` — titik kuning putus-putus saat hold G, cooldown 600ms) |
| 46 | **Melee (Knife) + Speed Buff +10%** | 🔵 | #33 | Future roadmap (Krunker-style) | ✅ Selesai (speed buff aktif saat memegang knife di PlayerController) |

---

## 4. 🌐 Multiplayer & Jaringan (Colyseus Server)

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 47 | Sync posisi (Prediction + Reconciliation) | 🟢 | Phase 2.5 | Lerp <0.5m, snap >0.5m | ✅ Selesai |
| 48 | Bomb Defusal 5v5 (tanam/defuse) | 🟢 | #47 | Full round flow 15 ronde | ✅ Selesai |
| 49 | Ekonomi & Buy Menu Online | 🟢 | #48 | Server validasi uang, cap $16,000 | ✅ Selesai |
| 50 | Kill Feed sinkron real-time | 🟢 | #47 | Semua client dapat event sama | ✅ Selesai |
| 51 | Lag Compensation / Server Rewind 200ms | 🟢 | #47 | Hit fair pada ping 80-150ms | ✅ Selesai (`WeaponManager.ts` `MAX_REWIND_MS` = 200ms + `recordPosition`) |
| 52 | Anti-Cheat Dasar (speed, fire-rate, ammo) | 🟢 | #47 | Log + reject paket curang | ✅ Selesai (`AntiCheatSystem.ts`: speed 1.35x, fire-rate 30%, ammo, input-flood 60/s, kick otomatis) |
| 53 | Interest Management (60m + LOS) | 🟡 | #47 | Musuh jauh/tembok tidak terkirim | ✅ Selesai (`InterestManager.ts`: 60m + LOS, broadcast 10Hz `interestUpdate`) |
| 54 | Radio Commands (team-filtered) | 🟡 | #47 | Hanya tim sendiri menerima | ✅ Selesai (ter-mount di HUD) |
| 55 | Room Auto-Matchmaking | 🟢 | Phase 2.5 | joinOrCreate → tim zig-zag | ✅ Selesai |
| 56 | **Spectator Broadcast (free cam, follow)** | 🟡 | #47 | Semua mode spectator sinkron | ✅ Selesai (`SpectatorHUD.tsx` switch target + spectator camera follow) |
| 57 | **Reconnect Flow (60s window)** | 🟡 | #55 | State dipertahankan setelah join ulang | ✅ Selesai (server `allowReconnection` + `pendingReconnect` 60s; client `scheduleReconnect` + token sessionStorage + `ReconnectOverlay.tsx` countdown) |
| 58 | **Vote Kick + Forfeit (/ff)** | 🔵 | #55 | 50%+ vote → eksekusi | ✅ Selesai (vote kick; forfeit via chat `/ff` → `ff_vote` server, `ffVoteStarted`/`forfeitAccepted` di client) |
| 59 | **Network Monitor (ping/loss/jitter)** | 🔵 | #47 | Data akurat untuk HUD + lag banner | ✅ Selesai (FpsPingDisplay + lag banner di HUD) |
| 60 | **Ready/Skip System** | 🟡 | #48 | Semua ready → fase aktif lebih cepat | ✅ Selesai (Tombol Ready di HUD & handler `ready`/`skipBuyPhase` server) |
| 61 | **Overtime (7-7 → first-to-9)** | 🟡 | #48 | Trigger + swap otomatis | ✅ Selesai (isOvertime + overtimeMaxRounds di server) |

---

## 6. 🎮 Game Modes

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 75 | **Gun Game Mode (FFA, level-up per kill)** | 🔵 | #55 | Progresi 8 senjata, kill → weapon berikutnya, knife terakhir menang | ✅ Selesai (`GUN_GAME_WEAPONS` di shared, progresi di `GameRoom.ts`, mode di MainMenu + HUD FFA-style) |

---

## 7. 🧟 Zombie Survival Mode (v3.0)

> **Proses perbaikan:** [Impl_Zombie_Survival.md](Impl_Zombie_Survival.md) · **Defect list:** [Zombie_Survival_Code_Review.md](Zombie_Survival_Code_Review.md)  
> **Catatan:** Banyak item di bawah pernah ditandai ✅ karena file komponen ada, tetapi wiring/bug masih terbuka. Status dikoreksi 16 Agustus 2026.

| # | Fitur | Prioritas | Dependensi | Testing Criteria | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| 76 | **ZombieSurvivalRoom (`zombie_room`)** | 🟢 | Colyseus | Join room 1-4 player; **tidak** dual-connect `fps_room` | 🟨 Parsial (P0-1) |
| 77 | **5 Zombie Types & Spawning** | 🟢 | Server AI | Walker, Runner, Tank, Spitter, Boss | 🟨 Parsial (Spitter/boss spawn bugs) |
| 78 | **Wave System & Scaling** | 🟢 | Server AI | Escalating HP/Speed; pause on game over | 🟨 Bug (P0-5, P0-7) |
| 79 | **Point Economy & Shop** | 🟢 | #76 | Poin 1× sync; perk/senjata tervalidasi server | 🟨 Bug (P1-1, P1-2) |
| 80 | **Mystery Box Gacha** | 🟡 | #79 | Mounted + wired in-game | 🔲 Tidak wired (P1-3) |
| 81 | **Pack-a-Punch Upgrade** | 🟡 | #79 | Mounted + event server | 🔲 Tidak wired (P1-3) |
| 82 | **Map Outpost Z-7 & Area Unlock** | 🟢 | Map 3D | Arena OK; unlock proximity + state sync | 🟨 Parsial |
| 83 | **Power-Ups (6 Types)** | 🟡 | #77 | Pickup protocol + nuke cleanup | 🔴 Rusak (P0-4, P0-6) |
| 84 | **Procedural Audio System** | 🟢 | Web Audio | SFX library; waveClear wired | 🟨 Parsial |
| 85 | **Leaderboard LocalStorage** | 🟡 | Client | Bisa dibuka in-game | 🟨 Parsial |
| 86 | **A\* Pathfinding** | 🔵 | Map & AI | Throttled pathfinding | 🟨 Parsial (perf) |
| 87 | **Downed & Revive Mechanic** | 🟡 | Player State | Co-op revive server-driven | 🟨 Parsial (P1-4) |
| 88 | **Helipad Extraction Sequence** | 🟡 | Map & Wave | Evac + pause wave + server proximity | 🟨 Parsial |
| 89 | **Interactive Barricade Repair** | 🔵 | Map 3D | Repair dengan cooldown; damage flag benar | 🟨 Parsial |

---

## 📊 Ringkasan Scope

| Kategori | Jumlah Fitur | MVP | Post-MVP | Status |
| :--- | :--- | :---: | :---: | :---: |
| UI & HUD | 17 | 10 | 7 | 17 ✅ (100%) |
| Karakter & Movement | 15 | 10 | 5 | 15 ✅ (100%) |
| Senjata & Utilitas | 14 | 8 | 6 | 14 ✅ (100%) |
| Multiplayer & Jaringan | 15 | 10 | 5 | 15 ✅ (100%) |
| Map, Environment & Training | 13 | 10 | 3 | 13 ✅ v2.2 · perbaikan v3 → [Impl_Map…](Impl_Map_ContainerYard_v3.md) |
| Game Modes (Classic/GunGame) | 1 | 0 | 1 | 1 ✅ (100%) |
| Zombie Survival Mode (v3.0) | 14 | 8 | 6 | 🟨 ~60% fondasi — lihat Impl + Code Review |
| **Total CS klasik** | **75 task** | **48** | **27** | **75 ✅** |
| **Zombie (terpisah)** | **14 task** | **8** | **6** | **Belum playable co-op** |

> **Catatan status:** ✅ = terverifikasi di kode + wiring · 🟨 = parsial/bug · 🔲 = belum · 🔴 = rusak.  
> **Kerja aktif:** [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) · [Impl_Zombie_Survival.md](Impl_Zombie_Survival.md) · [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md)