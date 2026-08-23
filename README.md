# 🎯 CS Web FPS — Zombie Survival Offline v1.0 (CS:GO / Krunker)

**v3.0 Offline** — Game **fully offline** (no server). Mode utama **Zombie Survival** dengan `ZombieEngine` + `SpatialGrid 5m` + `InstancedZombieRenderer` (1 draw call). Dibangun **React Three Fiber** + **Rapier** + **Zustand**. Model Krunker blocky/voxel 10 senjata. Map **START (0,-30) → FINISH (0,30)** jelas.

> Lihat `docs/Zombie_Shooter_System_v1.md` (Single Source of Truth) + `docs/ZOMBIE_MODE.md` untuk detail mode.

---

## 🚀 Quick Start (Full Offline)

```bash
# 1. Instal semua dependensi (root, client, shared)
npm install

# 2. Jalankan development (hanya Vite, no server)
npm run dev

# 3. Buka browser
#    Frontend:  http://localhost:5173  (semua mode offline)
```

**Prasyarat:** Node.js v18+. Tidak butuh server — semua mode jalan offline (`Training`, `5v5 Offline`, `Zombie Shooter`, `L4D Campaign`).

---

## 🎮 Fitur Gameplay Inti (v2.0)

### Movement Tech (Full Krunker-Inspired)
- **Slide-Hop Chain** dengan momentum preservation
- **Air Strafing / Strafe-Hop** (mouse turn di udara, diagonal +20%)
- **Curve Slide** (belok tanpa kehilangan momentum)
- **Moon-Jump** (jump tinggi setelah exit slide) & **Short-Hop** (ADS di udara)
- **Slide Control Setting** (normalisasi FPS → movement fairness)
- **Frame-Perfect Input Buffer** (scroll wheel jump support)

### Mode Permainan (All Offline — START → FINISH jelas)
| Mode | Format | START → FINISH | Status |
| :--- | :--- | :--- | :--- |
| Training Range | Solo aim & recoil, dummy + marker | Spawn → Target wall | ✅ Offline |
| 5v5 Offline (Bomb) | 1 pemain + 9 bot, 5v5 bomb defusal | T-Spawn/CT-Spawn → Bomb Site A/B | ✅ Offline |
| Zombie Shooter v1 | Wave survival, SpatialGrid + Instanced | START `0,-30` SafeRoom → FINISH `0,30` Rescue | ✅ Offline |
| Left 4 Dead Campaign | 4 survivors (1+3 bot), Director AI, 4 chapter | SafeRoom START → Corridor → Finale Rescue | ✅ Offline (mirip L4D) |

### Sistem Lainnya (Offline)
- **ZombieEngine** `SpatialGrid 5m` + `InstancedMesh MAX 100` (1 draw call) + `HitDetection` head/body sphere — 60 FPS wave 20
- **L4D Director AI** — pacing BuildUp/Sustain/Relief, horde timer, special Infected (Hunter/Smoker/Boomer/Tank/Witch), crescendo, panic level
- **5v5 Offline Bot AI** — patrol/hold/peek/engage/retreat/plant/defuse, economy buy
- **Training Range** — dummy, recoil wall, marker jarak, tracking stats
- **Ekonomi** buy menu CS:GO style ($800 start), **10 senjata** Rifle/SMG/Pistol/Sniper/Melee
- HUD pure CSS zero-asset, Tailwind, Krunker blocky voxel weapons

---

## 🛠️ Tech Stack

### Frontend (Client — Offline All)
| Komponen | Teknologi |
| :--- | :--- |
| Framework | React + Vite + TypeScript |
| 3D Engine | Three.js + React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Physics | Rapier.js (`@react-three/rapier`) — KinematicCharacterController (ZombieArcade) / Simple pos clamp (L4D) |
| State | Zustand (`useGameStore`, `useZombieStore`, `useL4DStore`, `useOffline5v5Store`, `useWeaponStore`) |
| UI / Styling | Tailwind CSS + Vanilla CSS (Zero Asset UI) |
| Audio | Web Audio API + Howler.js (2D UI) — no server audio sync |

### Arsitektur Proyek (Offline)
- **Monorepo NPM Workspaces** (`client`, `shared`) — `shared` hanya constants (`WEAPONS`, `PHYSICS`, `MAP`); logic semua di `client/src/game/*` offline.

---

## 📖 Dokumentasi Lengkap (Design Documents)

Semua keputusan arsitektur, panduan desain, dan spesifikasi fitur disimpan di `docs/`. Silakan baca sebelum memulai pengembangan:

### Core Design
- [Zombie Shooter System v1.0 (Single Source)](docs/Zombie_Shooter_System_v1.md) — 14 bab offline (Store, Engine, Grid, HitDetection, Instanced, Downed, etc) — **START→FINISH modular**
- [L4D Campaign Design](docs/ZOMBIE_MODE.md#technical-architecture--offline-only-v10) — Director AI, 4 chapter SafeRoom→Rescue, Special Infected
- [Game Design Document (GDD)](Game_Design_Document.md) — Roadmap + loop
- [Master Implementation Checklist](docs/Master_Implementation_Checklist.md) — status fitur v1.0 offline


### Spesifikasi Fitur (Design — Offline)
- [Zombie Shooter System v1.0](docs/Zombie_Shooter_System_v1.md) — Store/Engine/Grid/HitDetection/Barricade/PowerUp/Instanced/Movement
- [ZOMBIE_MODE.md Offline v1.0](docs/ZOMBIE_MODE.md#technical-architecture--offline-only-v10) — Outpost Z-7 START→FINISH, Director-free (wave)
- [L4D Campaign](docs/Zombie_Shooter_System_v1.md) + `useL4DStore`/`L4DDirector` — 4 chapter, SafeRoom START, Rescue FINISH, Hunter/Smoker/Boomer/Tank/Witch
- [Design_Player.md](docs/Design_Player.md) — hitbox & movement bible
- [Design_Weapons.md](docs/Design_Weapons.md) — 10 senjata
- [Design_UI_Flow_Geometry.md](docs/Design_UI_Flow_Geometry.md) — flow & 3D geometry

### Proses & Status
- [Master Implementation Checklist](docs/Master_Implementation_Checklist.md) — fitur terverifikasi.
- [IMPROVEMENTS_AND_FIXES_AUDIT.md](docs/IMPROVEMENTS_AND_FIXES_AUDIT.md) — backlog P1–P3 (performa, polish, AI).
- Index: [docs/README.md](docs/README.md).

### Phase Guides (Urutan Build)
- Dokumentasi Phase_0–Phase_8 historis sudah diarsipkan / dihapus. Status fitur: [Master_Implementation_Checklist.md](docs/Master_Implementation_Checklist.md). Index docs: [docs/README.md](docs/README.md).


---

## 📂 Struktur Folder (Offline)

```text
cs-game/
├── package.json           # Monorepo (client, shared) — dev hanya Vite
├── client/                # Frontend offline
│   ├── src/components/    # HUD, Crosshair, Minimap (no network)
│   ├── src/game/          # Game 3D
│   │   ├── zombie/        # ZombieEngine, SpatialGrid, HitDetection, Barricade, PowerUp, Instanced
│   │   ├── l4d/           # L4DDirector, L4DCampaignMap (START→FINISH)
│   │   ├── player/        # ZombieArcadeController, MinecraftCharacter
│   │   ├── weapons/       # ZombieShootingSystem, WeaponModel
│   │   └── training/      # TrainingRange (offline)
│   ├── src/screens/       # MainMenu (4 mode), ZombieSurvivalMode, L4DMode, Offline5v5Mode
│   └── src/stores/        # useGameStore, useZombieStore, useL4DStore, useOffline5v5Store, useWeaponStore
├── shared/                # Constants only (WEAPONS, PHYSICS, MAP)
└── docs/                  # Zombie_Shooter_System_v1.md, ZOMBIE_MODE.md, AUDIT
```

---

## 🎯 Target Performa (Performance Budget — Offline)

| Parameter | Target | Implementasi v1.0 |
| :--- | :--- | :--- |
| FPS | 60+ (min 60) | 60 FPS wave 20 (60 zombies) |
| Load Time | < 3 detik | < 2s (no server) |
| Draw Calls | < 500 | < 80 (InstancedMesh 1 call / 100 zombies) |
| Memory | < 400 MB | < 300 MB |
| Offline Tick | 60 Hz (requestAnimationFrame) | ZombieEngine.update(1/60) + SpatialGrid O(1) |

---

## ⚠️ Keterbatasan (Offline)

1. **Full Offline** — tidak ada multiplayer online (sengaja dihapus per request). 5v5 pakai 9 bot, Zombie & L4D solo + 3 bot survivors.
2. **Audio Context** — browser memblokir autoplay; wajib "Click to Play" untuk unlock AudioContext.
3. **No-Mobile MVP** — desktop browser dulu; touch belum.
4. **No Server Anti-Cheat** — validasi hanya client offline.