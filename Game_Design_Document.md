# Web-Based FPS Game Design & Implementation Plan (CS:GO / Krunker Clone)

**Versi:** v2.1  
**Status:** MVP Build Complete — Build Passing (0 errors)  
**Last Updated:** 2026-08-12

---

## Game Concept
Sebuah game First-Person Shooter (FPS) berbasis web yang ringan dan cepat bergaya seperti Krunker.io, dengan elemen taktis ala CS:GO. Game ini akan dapat dimainkan langsung melalui browser tanpa perlu instalasi, mendukung multiplayer real-time, dan menggunakan grafis 3D (low-poly/blocky) agar ringan dijalankan. Model senjata menggunakan gaya Krunker.io (blocky/voxel) dengan 10 senjata: Rifle, SMG, Pistol, Sniper, dan Melee.

## 🎯 Pilar Desain Inti (Core Vision)

Berdasarkan keputusan desain, game ini resmi akan berkiblat ke **Arcade Shooter Berkecepatan Tinggi**. Berikut 4 pilar yang telah dikunci:

1. **Pacing Sangat Cepat (Fast TTK):** Membutuhkan 1-3 peluru (terutama *headshot*) untuk membunuh musuh. Pertempuran sangat mengandalkan refleks, *flick aim*, dan insting murni.

2. **Movement Agresif & Momentum-Based (Full Krunker Tech):** Karakter dapat bermanuver dengan *slide-hop chain*, **air strafing (strafe-hop)**, **curve slide**, **moon-jump**, dan **short-hop** — semuanya berbasis momentum & frame-perfect input. Tidak ada penalti pergerakan simulasi berat. **Slide Control setting** memastikan keadilan antar FPS berbeda ([Lihat Movement Physics Bible](docs/Design_Player.md#3-movement-physics-bible)).

3. **Sistem Ekonomi 'Buy Menu' (CS:GO Style):** Pemain mendapat uang ($) dari *kill* dan kemenangan ronde untuk membeli senjata (AK-47, AWP, M4A1, Deagle), *Armor*, dan *Granat Taktis* di awal setiap ronde (Buy Phase 'B').

4. **Aesthetics 'Low-Poly / Blocky':** Dunia game dibangun menggunakan arsitektur blok bersudut tegas, warna kontras/cerah, dan tanpa tekstur realistis yang membebani. Fokus mutlak pada kejelasan visual musuh (clarity) dan framerate (FPS) tinggi di browser.

---

## 🔁 Gameplay Loop Overview (State Machine)

```
┌──────────────┐   klik tombol    ┌───────────────────┐
│ Main Menu    │ ───────────────► │ Mode Selection    │
│ (nickname)   │                  │ (Single | Mabar)  │
└──────────────┘                  └─────────┬─────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        ┌──────────────────────┐                    ┌──────────────────────────┐
        │ TRAINING RANGE       │                    │ MATCHMAKING (joinOrCreate)│
        │ (Single, instant)    │                    │ 5v5 Bomb Defusal          │
        └──────────────────────┘                    └─────────────┬────────────┘
                                                                 ▼
                                                   ┌──────────────────────────┐
                                                   │ ROUND LOOP (15 ronde)    │
                                                   │ ┌──────────────────────┐ │
                                                   │ │ Buy Phase (15s)      │ │
                                                   │ │ → Active (1m55s)     │ │
                                                   │ │ → Round End (4s)     │ │
                                                   │ └──────────────────────┘ │
                                                   │ Half-Time swap di ronde 8│
                                                   │ Overtime jika 7-7        │
                                                   └─────────────┬────────────┘
                                                                 ▼
                                                   ┌──────────────────────────┐
                                                   │ MATCH END (Victory/Defeat│
                                                   │ + economy summary)       │
                                                   └──────────────────────────┘
```

**Detail lengkap:** [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md) (Chapter 1-2).

---

## Proposed Tech Stack (Gold Standard Web FPS)

> [!TIP]
> Pemilihan teknologi ini difokuskan pada performa di browser (WebGL), kemudahan pengembangan, dan sinkronisasi multiplayer real-time.

| Layer | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Build** | Vite | Dev server + bundler |
| **UI/State** | React.js + Zustand | Main Menu, HUD, Settings. State terpisah (`useGameStore`, `useNetworkStore`, `useWeaponStore`) agar tidak mengganggu render loop 3D |
| **3D Engine** | Three.js + React Three Fiber (R3F) & Drei | `<PointerLockControls>`, `<Sky>`, rendering berbasis komponen |
| **Physics** | Rapier.js (`@react-three/rapier`) | **KinematicCharacterController** untuk pergerakan pemain (anti-stuck/anti-clip) |
| **Styling** | Tailwind CSS + Vanilla CSS | UI overlay (Crosshair/HUD) di luar Canvas, zero-asset |
| **Audio** | Web Audio API (3D HRTF) + Howler.js (2D UI) | Spatial audio + UI feedback |
| **Multiplayer** | Node.js + Colyseus | **Authoritative Server**, anti-cheat, schema sync |
| **Shared** | Monorepo NPM Workspaces (`@cs-game/shared`) | Berbagi tipe TS + schema Colyseus antara client & server |

---

## Arsitektur Multiplayer Terdepan

> [!WARNING]
> FPS multiplayer tidak akan responsif jika hanya mengandalkan sinkronisasi naif. Game ini akan mengimplementasikan **Client-Side Prediction & Server Reconciliation**.

1. **Client Prediction:** Saat pemain menekan tombol maju (W), *client* langsung menggerakkan karakter di layar tanpa menunggu balasan server (mencegah rasa *lag*).
2. **Server Authority:** Server menerima input, memvalidasinya, dan mengirimkan posisi absolut ke semua *client*.
3. **Reconciliation:** Jika terjadi perbedaan (karena *lag*), *client* akan dikoreksi secara halus menuju posisi valid dari server (Lerp < 0.5m, Snap > 0.5m).
4. **Interpolasi Entity:** Karakter pemain lain digerakkan dengan mulus di antara 2 titik (*snapshot*) terakhir yang diterima dari server (buffer ~100ms).

Detail: [Design_Networking_Advanced.md](docs/Design_Networking_Advanced.md)

---

## Core Features (MVP)

> [!IMPORTANT]
> Untuk tahap awal, fokus pada mekanik inti FPS sebelum menambahkan fitur kompleks (mode roadmap, skin, dll).

1. **Player Movement (Movement Tech Suite):** WASD + mouse-look, walk 5 m/s, sprint 7.5 m/s, crouch 2.5 m/s, jump + gravity — plus slide-hop chain, air strafe, curve slide, moon-jump, short-hop, slide control setting.
2. **Multiplayer Sync (Prioritas Utama):** Sinkronisasi posisi real-time (30 tick/s), client prediction + reconciliation.
3. **Shooting Mechanics:** Raycast di *Client* untuk respons instan (visual), validasi hit + damage 100% di *Server* (lag compensation 500ms).
4. **Basic Map:** Arena 60×40m dengan kolisi fisika ringan (Box/Capsule collider terpisah dari visual).
5. **Bomb Defusal 5v5:** Buy phase 15s, round 1m55s, plant 3s, bomb 40s, defuse 5s/10s, ekonomi penuh, first-to-8 (15 ronde). Bomb pickup setelah terjatuh.
6. **Training Range (Single):** Dummy target, aim trainer, movement course, recoil practice.
7. **Spectator System:** Death cam, free cam, player follow, objective cam.
8. **10 Senjata Krunker-Style:** AK-47, M4A1-S, AWP, MP5, Deagle, Glock-18, Tec-9, Auto Pistol, Knife, Combat Knife — semua model blocky/voxel.
9. **Server-Side Buy Zone Validation:** Player harus berada di buy zone untuk membeli.
10. **Respawn Countdown Sync:** Death screen countdown disinkronkan dengan server respawn timer.

---

## Rincian Desain Game (Game Design Details)

Rencana mendalam terkait aspek-aspek di dalam game sudah didokumentasikan di file terpisah berikut:

- 👤 **Pemain & Pergerakan (Movement Physics Bible):** [Design_Player.md](docs/Design_Player.md)
- 🔫 **Persenjataan:** [Design_Weapons.md](docs/Design_Weapons.md)
- ☠️ **Pertempuran & Kematian + Spectator:** [Design_Combat_Kill.md](docs/Design_Combat_Kill.md)
- 🏆 **Mode Gameplay + Training Range + Roadmap Mode:** [Design_Gameplay.md](docs/Design_Gameplay.md)
- 🔊 **Audio System:** [Design_Audio.md](docs/Design_Audio.md)
- 🌐 **Advanced Networking & Anti-Cheat:** [Design_Networking_Advanced.md](docs/Design_Networking_Advanced.md)
- 🗺️ **Denah Layout Map + Callouts:** [Design_Map_Layout.md](docs/Design_Map_Layout.md)
- 🎨 **User Flow & Geometri 3D:** [Design_UI_Flow_Geometry.md](docs/Design_UI_Flow_Geometry.md)
- 💅 **Spesifikasi Vanilla CSS UI:** [Design_CSS_UI_System.md](docs/Design_CSS_UI_System.md)
- 📒 **Gameplay Mechanics Bible (Master):** [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md)
- ⚖️ **Gameplay Balance Rationale:** [Gameplay_Balance_Rationale.md](docs/Gameplay_Balance_Rationale.md)
- 📋 **Master Implementation Checklist (62 fitur):** [Master_Implementation_Checklist.md](docs/Master_Implementation_Checklist.md)

---

## Development Roadmap & Phases

### Fase 0: Setup Monorepo & Shared Types
[Lihat Detail Fase 0](docs/Phase_0_Monorepo_Setup.md)
- Inisialisasi workspace (`client`, `server`, `shared`), definisi schema Colyseus (PlayerState, GameState).

### Fase 1: Setup & Environment (Web 3D)
[Lihat Detail Fase 1](docs/Phase_1_Setup_Environment.md)
- Setup Vite + React + Tailwind di `client`, scene R3F + lighting + floor.

### Fase 2: Player Controller, Physics & Movement Tech
[Lihat Detail Fase 2](docs/Phase_2_Player_Controller.md)
- Input WASD, Rapier Kinematic Character Controller.
- **Movement Tech Suite:** slide-hop, air strafe, curve slide, moon-jump, short-hop, input buffer, slide control setting.

### Fase 2.5: Network Prototype (Krusial)
[Lihat Detail Fase 2.5](docs/Phase_2.5_Colyseus_Sync.md)
- Setup room Colyseus, sync 2 client, verifikasi prediction pada latensi simulasi 100ms.

### Fase 3: Weapon Mechanics
[Lihat Detail Fase 3](docs/Phase_3_Weapon_Mechanics.md)
- FPV weapon model, client raycast (efek instan), server validation (anti-aimbot).

### Fase 4: Combat System & Multiplayer Setup
[Lihat Detail Fase 4](docs/Phase_4_Multiplayer_Setup.md)
- HUD, HP, kill feed, respawn, spectator system, room matchmaking.

### Fase 4.5: Training Range (Offline Mode)
[Lihat Detail Fase 4.5](docs/Phase_4.5_Training_Range.md)
- Mode single player: dummy target, aim trainer, movement course, recoil practice grid.

### Fase 5: Bomb Defusal Mode + Ekonomi
[Lihat Detail Fase 5](docs/Phase_5_Bomb_Defusal.md)
- Round loop 15 ronde, buy menu glassmorphism, plant/defuse C4, ekonomi penuh ($16,000 cap), halftime, overtime.

### Fase 5.5: Integrasi Map Container Yard
[Lihat Detail Fase 5.5](docs/Phase_5.5_Map_Integration.md)
- Peta 3D Container Yard 60×40m, 5 zona (Buy zone, Site A/B), material wallbang (-50%), batasan perimeter 7.2m.

### Fase 6: Audio 3D & Occlusion
[Lihat Detail Fase 6](docs/Phase_6_Audio_3D.md)
- Spatial 3D HRTF (Web Audio API), occlusion low-pass filter 800Hz, Howler.js UI sounds, priority pool 12 source.

### Fase 7: Polish, HUD & Network Quality Monitor
[Lihat Detail Fase 7](docs/Phase_7_Polish_HUD.md)
- Interpolasi musuh halus, pure CSS HUD (minimap 2D, FPS/ping counter, lag warning banner), spectator broadcast.

### Fase 8: Roadmap Mode Tambahan (Post-MVP)
[Lihat Detail Fase 8](docs/Phase_8_Roadmap_Modes.md)
- FFA Deathmatch (first-to-20 kills) → Gun Game (ladder 20 level) → Team Deathmatch (75 kills).


---

## File Reference Index

| File | Isi | Prioritas Baca |
| :--- | :--- | :--- |
| `README.md` | Quick start, tech stack, struktur | 1 |
| `docs/Analysis_Reference_Doc.md` | Referensi angka final (semua tabel dikunci) | 2 |
| `docs/Gameplay_Mechanics_Bible.md` | Gameplay loop + timing + edge cases lengkap | 3 |
| `docs/Master_Implementation_Checklist.md` | Daftar fitur + dependensi + testing | 4 |
| `docs/Design_Gameplay.md` | Mode, ekonomi, training range, roadmap | 5 |
| `docs/Design_Player.md` | Karakter + Movement Physics Bible | 6 |
| `docs/Design_Weapons.md` | Senjata & granat | 7 |
| `docs/Design_Combat_Kill.md` | Damage, death, spectator | 8 |
| `docs/Design_Map_Layout.md` | Map, callout, rotasi | 9 |
| `docs/Design_Networking_Advanced.md` | Networking + anti-cheat | 10 |
| `docs/Design_Audio.md` | Audio 3D/2D | 11 |
| `docs/Design_CSS_UI_System.md` | HUD CSS zero-asset | 12 |
| `docs/Design_UI_Flow_Geometry.md` | User flow + geometri 3D | 13 |
| `docs/Gameplay_Balance_Rationale.md` | Alasan angka + TTK math | 14 |
| `docs/Impl_Guide_*.md` (5) | Panduan implementasi step-by-step | Saat build |
| `docs/Phase_*.md` (5) | Panduan fase build berurutan | Saat build |