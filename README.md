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
| Training Range | 1 pemain, aim trainer + recoil practice | ✅ |
| Bomb Defusal 5v5 | 5v5, 15 ronde, first-to-8 + overtime | ✅ |
| Zombie Survival | Solo / co-op 1–4, wave ∞, shop, PaP, extraction | ✅ |
| FFA / TDM / Gun Game | Server-side partial / roadmap | 🟨 |

### Sistem Lainnya
- Sistem ekonomi buy menu CS:GO style ($800 start, kill/round rewards)
- **10 Senjata** — Rifle, SMG, Pistol, Sniper, Melee (Glock, Tec-9, Auto Pistol, Combat Knife)
- Bomb Defusal lengkap (plant 3s, timer 40s, defuse 5s/10s) + bomb pickup setelah terjatuh
- Training Range (dummy target, aim trainer, recoil practice)
- Anti-cheat server-side + lag compensation **200ms** + interest management
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
- [Master Implementation Checklist](docs/Master_Implementation_Checklist.md) — Papan tugas fitur + status (zombie dikoreksi).
- [Gameplay Mechanics Bible](docs/Gameplay_Mechanics_Bible.md) — **Dokumen gameplay paling detail** (loop, timing, decision tree, edge cases).
- [docs/README.md](docs/README.md) — Index dokumentasi terkini.


### Spesifikasi Fitur (Design)
- [Design_Player.md](docs/Design_Player.md) — Model karakter, hitbox, **Movement Physics Bible v2.0**.
- [Design_Weapons.md](docs/Design_Weapons.md) — Statistik senjata, recoil "7", wallbang, balance rationale.
- [Design_Combat_Kill.md](docs/Design_Combat_Kill.md) — Hitbox/damage, death/respawn, **spectator system**, edge cases.
- [Design_Gameplay.md](docs/Design_Gameplay.md) — Ekonomi, C4, format ronde, **training range**, roadmap mode, OT.
- [Design_Audio.md](docs/Design_Audio.md) — Sistem audio 3D/2D, occlusion, priority matrix.
- [Design_Networking_Advanced.md](docs/Design_Networking_Advanced.md) — Server otoritatif, lag comp, reconnection, network monitor.
- [Design_UI_Flow_Geometry.md](docs/Design_UI_Flow_Geometry.md) — Alur layar, geometri 3D, transition timing.
- [Design_CSS_UI_System.md](docs/Design_CSS_UI_System.md) — Desain UI/HUD murni CSS (crosshair, minimap, FPS/ping).

### Proses & Status
- [Master Implementation Checklist](docs/Master_Implementation_Checklist.md) — fitur terverifikasi.
- [IMPROVEMENTS_AND_FIXES_AUDIT.md](docs/IMPROVEMENTS_AND_FIXES_AUDIT.md) — backlog P1–P3 (performa, polish, AI).
- Index: [docs/README.md](docs/README.md).

### Phase Guides (Urutan Build)
- Dokumentasi Phase_0–Phase_8 historis sudah diarsipkan / dihapus. Status fitur: [Master_Implementation_Checklist.md](docs/Master_Implementation_Checklist.md). Index docs: [docs/README.md](docs/README.md).


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
5. **Class Uniform** — semua pemain 100 HP & kecepatan sama (skill-based murni); angka & trade-off di [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md) / [Analysis_Reference_Doc.md](docs/Analysis_Reference_Doc.md).