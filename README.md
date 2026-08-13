# 🎯 CS Web FPS (CS:GO / Krunker Clone)

**v2.1** — Game First-Person Shooter (FPS) berbasis web bergaya *low-poly blocky* ala **Krunker.io** dengan elemen taktis layaknya **CS:GO** (Mode Bomb Defusal 5v5). Dibangun murni menggunakan **React Three Fiber** (Frontend WebGL) dan **Colyseus** (Backend Multiplayer Otoritatif). Model senjata Krunker-style (blocky/voxel) dengan **10 senjata** termasuk pistol & pisau.

---

## 🚀 Quick Start

```bash
# 1. Instal semua dependensi (root, client, server, shared sekaligus)
npm install

# 2. Jalankan development (2 proses: Vite + Colyseus server)
npm run dev

# 3. Buka browser
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:2567  (Colyseus monitor: /colyseus)
```

**Prasyarat:** Node.js v18+.

---

## 🎮 Fitur Gameplay Inti (v2.0)

### Movement Tech (Full Krunker-Inspired)
- **Slide-Hop Chain** dengan momentum preservation
- **Air Strafing / Strafe-Hop** (mouse turn di udara, diagonal +20%)
- **Curve Slide** (belok tanpa kehilangan momentum)
- **Moon-Jump** (jump tinggi setelah exit slide) & **Short-Hop** (ADS di udara)
- **Slide Control Setting** (normalisasi FPS → movement fairness)
- **Frame-Perfect Input Buffer** (scroll wheel jump support)

### Mode Permainan
| Mode | Format | Status |
| :--- | :--- | :--- |
| Single (Training Range) | 1 pemain, aim trainer + movement course | MVP |
| Mabar Bomb Defusal | 5v5, 15 ronde, first-to-8 | MVP |
| FFA Deathmatch | 8-12 pemain, first-to-50 kills | Roadmap |
| Gun Game | 7 weapon ladder, first to finish | Roadmap |
| TDM | 5v5, first-to-100 kills | Roadmap |

### Sistem Lainnya
- Sistem ekonomi buy menu CS:GO style ($800 start, kill/round rewards)
- **10 Senjata** — Rifle, SMG, Pistol, Sniper, Melee (Glock, Tec-9, Auto Pistol, Combat Knife)
- Bomb Defusal lengkap (plant 3s, timer 40s, defuse 5s/10s) + bomb pickup setelah terjatuh
- Spectator System lengkap (death cam, free cam, player follow, objective cam)
- Training Range (dummy target, aim trainer, movement course, recoil practice)
- Anti-cheat server-side + lag compensation 500ms + interest management
- HUD pure CSS zero-asset (crosshair, minimap, kill feed, FPS/ping monitor)
- Model senjata **Krunker.io blocky/voxel style** — semua dari box geometry

---

## 🛠️ Tech Stack

### Frontend (Client)
| Komponen | Teknologi |
| :--- | :--- |
| Framework | React + Vite + TypeScript |
| 3D Engine | Three.js + React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Physics | Rapier.js (`@react-three/rapier`) — Kinematic Character Controller |
| State | Zustand (`useGameStore`, `useNetworkStore`, `useWeaponStore`) |
| UI / Styling | Tailwind CSS + Vanilla CSS (Zero Asset UI — tanpa gambar/ikon eksternal) |
| Audio | Web Audio API (3D Positional) + Howler.js (2D UI) |

### Backend (Server)
| Komponen | Teknologi |
| :--- | :--- |
| Runtime | Node.js + TypeScript |
| Multiplayer | Colyseus |
| State Sync | `@colyseus/schema` |
| Arsitektur | Server Otoritatif (validasi HP, damage, peluru, ekonomi, anti-cheat) |

### Arsitektur Proyek
- **Monorepo NPM Workspaces** (`client`, `server`, `shared`) — berbagi tipe & schema Colyseus untuk mencegah type-mismatch.

---

## 📖 Dokumentasi Lengkap (Design Documents)

Semua keputusan arsitektur, panduan desain, dan spesifikasi fitur disimpan di `docs/`. Silakan baca sebelum memulai pengembangan:

### Core Design
- [Game Design Document (GDD)](Game_Design_Document.md) — Dokumen roadmap + gameplay loop utama.
- [Analysis Reference Doc](docs/Analysis_Reference_Doc.md) — **Referensi final v2.0** semua spesifikasi yang dikunci.
- [Document Implementation Checklist](docs/Document_Implementation_Checklist.md) — **Checklist lacak status implementasi per dokumen (32 file)**.
- [Master Implementation Checklist](docs/Master_Implementation_Checklist.md) — Papan tugas ±62 fitur + dependensi + testing criteria.
- [Gameplay Mechanics Bible](docs/Gameplay_Mechanics_Bible.md) — **Dokumen gameplay paling detail** (loop, timing, decision tree, edge cases).
- [Gameplay Balance Rationale](docs/Gameplay_Balance_Rationale.md) — Alasan di balik setiap angka (TTK, ekonomi, movement, map).


### Spesifikasi Fitur (Design)
- [Design_Player.md](docs/Design_Player.md) — Model karakter, hitbox, **Movement Physics Bible v2.0**.
- [Design_Weapons.md](docs/Design_Weapons.md) — Statistik senjata, recoil "7", wallbang, balance rationale.
- [Design_Combat_Kill.md](docs/Design_Combat_Kill.md) — Hitbox/damage, death/respawn, **spectator system**, edge cases.
- [Design_Gameplay.md](docs/Design_Gameplay.md) — Ekonomi, C4, format ronde, **training range**, roadmap mode, OT.
- [Design_Map_Layout.md](docs/Design_Map_Layout.md) — Denah Container Yard, callout list, rotation time, sightlines.
- [Design_Audio.md](docs/Design_Audio.md) — Sistem audio 3D/2D, occlusion, priority matrix.
- [Design_Networking_Advanced.md](docs/Design_Networking_Advanced.md) — Server otoritatif, lag comp, reconnection, network monitor.
- [Design_UI_Flow_Geometry.md](docs/Design_UI_Flow_Geometry.md) — Alur layar, geometri 3D, transition timing.
- [Design_CSS_UI_System.md](docs/Design_CSS_UI_System.md) — Desain UI/HUD murni CSS (crosshair, minimap, FPS/ping).

### Panduan Implementasi (Code Execution Guides)
- [Impl_Guide_Movement.md](docs/Impl_Guide_Movement.md) — Step-by-step movement tech (slide-hop → air strafe → moon-jump).
- [Impl_Guide_HUD_UI.md](docs/Impl_Guide_HUD_UI.md) — Step-by-step seluruh HUD/UI.
- [Impl_Guide_Weapons.md](docs/Impl_Guide_Weapons.md) — Step-by-step senjata, granat, recoil.
- [Impl_Guide_Map.md](docs/Impl_Guide_Map.md) — Step-by-step map 3D + minimap data.
- [Impl_Guide_Server.md](docs/Impl_Guide_Server.md) — Step-by-step server Colyseus (bomb, ekonomi, anti-cheat, spectator).

### Phase Guides (Urutan Build)
- [Phase_0_Monorepo_Setup.md](docs/Phase_0_Monorepo_Setup.md) — Monorepo setup & Shared Types
- [Phase_1_Setup_Environment.md](docs/Phase_1_Setup_Environment.md) — React + R3F Canvas & Scene
- [Phase_2_Player_Controller.md](docs/Phase_2_Player_Controller.md) — Rapier Kinematic Character Controller & Movement Tech
- [Phase_2.5_Colyseus_Sync.md](docs/Phase_2.5_Colyseus_Sync.md) — Room Colyseus & Latency Sync Prototype
- [Phase_3_Weapon_Mechanics.md](docs/Phase_3_Weapon_Mechanics.md) — Raycast shooting, recoil, & reload
- [Phase_4_Multiplayer_Setup.md](docs/Phase_4_Multiplayer_Setup.md) — Combat system & Multiplayer Integration
- [Phase_4.5_Training_Range.md](docs/Phase_4.5_Training_Range.md) — Single Player offline training range
- [Phase_5_Bomb_Defusal.md](docs/Phase_5_Bomb_Defusal.md) — Mode Bomb Defusal 5v5 & Economy System
- [Phase_5.5_Map_Integration.md](docs/Phase_5.5_Map_Integration.md) — Container Yard 3D Map & Collision Integration
- [Phase_6_Audio_3D.md](docs/Phase_6_Audio_3D.md) — 3D HRTF Positional Audio & UI Sound System
- [Phase_7_Polish_HUD.md](docs/Phase_7_Polish_HUD.md) — Pure CSS HUD, Minimap, & Network Quality Monitor
- [Phase_8_Roadmap_Modes.md](docs/Phase_8_Roadmap_Modes.md) — Post-MVP Modes (FFA Deathmatch, Gun Game, TDM)


---

## 📂 Struktur Folder

```text
cs-game/
├── package.json           # Konfigurasi Monorepo (NPM Workspaces)
├── client/                # Kode Frontend (React, Vite, R3F)
│   ├── src/components/    # Komponen React (HUD, Crosshair, Minimap)
│   ├── src/game/          # Logika Game 3D (Player, Map, Senjata)
│   ├── src/hooks/         # Custom hooks (usePlayerInput, dll)
│   ├── src/screens/       # MainMenu, BuyMenu, Leaderboard, DeathScreen
│   └── src/stores/        # Zustand State (Game, Network, Weapon)
├── server/                # Kode Backend (Node.js, Colyseus)
│   ├── src/rooms/         # Logika Room & Bomb Defusal
│   └── src/index.ts       # Entry point server
├── shared/                # Kode dipakai Client & Server
│   └── src/schema/        # Colyseus State Schema
└── docs/                  # Seluruh dokumen desain game (v2.0)
```

---

## 🎯 Target Performa (Performance Budget)

| Parameter | Target |
| :--- | :--- |
| FPS | 120+ (target), minimal 60 di GPU integrated |
| Load Time | < 3 detik (aset primer: 3D primitif, tanpa GLB besar) |
| Draw Calls | < 500 (instancedMesh untuk kontainer/boks) |
| Memory | < 400 MB (browser) |
| Server Tick | 30 tick/detik |
| Ping Monitoring | HUD warning saat ping > 120ms / packet loss > 5% |

---

## ⚠️ Keterbatasan yang Diketahui (Known Limitations)

1. **WebSocket/TCP Head-of-Line Blocking** — rubber-banding mungkin terjadi saat packet loss (trade-off yang didokumentasikan).
2. **Audio Context** — browser memblokir autoplay; wajib "Click to Play" untuk unlock AudioContext.
3. **No-Mobile MVP** — kontrol touch belum didukung di versi pertama (desktop browser saja).
4. **Reserve Ammo ∞** — tidak ada sistem pickup amunisi di map (keputusan desain).
5. **Class Uniform** — semua pemain 100 HP & kecepatan sama (skill-based murni), trade-off vs Krunker class system didokumentasikan di [Gameplay_Balance_Rationale.md](docs/Gameplay_Balance_Rationale.md).