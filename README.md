# CS-Game — 3D Web Tactical FPS & Zombie Survival

[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)

FPS taktis 3D di browser (React + Three.js). Empat mode offline: Training Range, 5v5 vs bot, Zombie Survival, dan kampanye Left 4 Dead.

---

## Mode permainan

### 5v5 Offline (bomb defusal)

Lawan 9 bot, tim **T** vs **CT**.

- **T**: tanam C4 di site A atau B, atau eliminasi CT.
- **CT**: jinakkan C4, atau eliminasi T sebelum bom terpasang.
- Peta: **Container Yard** dan **DE_RAVENPOINT** (80×100 m, dua site, mid). Alias map lama `dust` diarahkan ke Ravenpoint.
- Ekonomi + buy menu **[B]** di fase beli.
- Bot: pathfinding, cover, rotasi site, plant/defuse.

### Zombie Survival (Operation Blackout)

Wave survival di outpost modular.

- Pilih hero dulu: **NOVA-7** (assault, ability Berserk) atau **TITAN** (heavy, ability Shield). Ability **[Q]**.
- Poin dari kill → toko **[B]** antar gelombang (senjata, ammo, perk, upgrade tier).
- Buka ruangan lewat **buy door**; perbaiki jendela barricade dengan **[F]**.
- Horde, power-up, loot, dan tracker sisa zombie per gelombang.

### Left 4 Dead

Kampanye 4 chapter dengan AI Director (horde, crescendo, finale/rescue).

- Pilih survivor: **Coach**, **Rochelle**, **Ellis**, **Nick** (ability **[Q]**).
- Squad bot: tembak, cover, revive pemain yang downed (**tahan [F]**).

### Training Range

Latihan solo tanpa server.

- **Aim drill**: dummy acak, akurasi/headshot.
- **Recoil practice**: dinding spray pattern.
- Arsenal rack untuk ganti senjata cepat.

---

## Senjata

| Kategori | Senjata |
| :--- | :--- |
| Rifle | AK-47, M4A1-S |
| Sniper | AWP |
| SMG | MP5-SD |
| Pistol | Desert Eagle, Glock-18, Tec-9 |
| Melee | Combat Knife |
| Utility | HE, Smoke, Flash (5v5) |

**Gunplay:** ADS (klik kanan), recoil pattern, spread saat lari, crouch untuk tembakan pertama yang lebih rapat, hitmarker + damage indicator.

---

## Kontrol

| Tombol | Aksi |
| :--- | :--- |
| **W A S D** | Gerak |
| **Mouse** | Pandangan |
| **Klik kiri** | Tembak / melee |
| **Klik kanan** | ADS / scope |
| **Spasi** | Lompat |
| **Ctrl** | Jongkok / slide |
| **Shift** | Sprint |
| **R** | Reload |
| **1 / 2 / 3** | Primary / pistol / pisau |
| **B** | Buy menu / toko survival |
| **E** | Plant / defuse C4 (5v5) |
| **F** | Interaksi, repair barricade, revive |
| **Q** | Ability hero / survivor |
| **Esc** | Pause (Lanjutkan, Pengaturan, Ulangi, Menu utama) |
| **P** | Pengaturan (sens, volume, crosshair) |

HUD in-game hanya punya satu tombol **MENU [ESC]**. Pengaturan, restart, dan keluar ke menu utama ada di pause — bukan tombol dobel di pojok.

---

## Stack

| Bagian | Teknologi |
| :--- | :--- |
| UI | React 18, TypeScript, Wouter |
| 3D | Three.js r170, React Three Fiber, Drei |
| Fisika | Rapier (`@react-three/rapier`) — training / 5v5 / L4D |
| Zombie gerak | Arcade controller (bukan Rapier character) |
| State | Zustand |
| Audio | Web Audio API (prosedural) |
| Tes | Vitest + Testing Library (`test/`) |
| Bundler | Vite 5, npm workspaces (`client` + `shared`) |

---

## Menjalankan

Butuh **Node.js 18+**.

```bash
git clone https://github.com/Makro62/CsGame.git
cd cs-game
npm install
npm run dev
```

Buka **http://localhost:5173** (kalau port terpakai, Vite naik ke 5174, 5175, …).

| Perintah | Fungsi |
| :--- | :--- |
| `npm run test` | Unit test |
| `npm run test:watch` | Tes watch |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` per workspace |
| `npm run build` | Build `shared` lalu `client` |

---

## Rute

| URL | Layar |
| :--- | :--- |
| `/` | Menu utama |
| `/training` | Training Range |
| `/offline5v5` | 5v5 (pilih map/tim dulu) |
| `/zombie` | Survival (pilih hero dulu) |
| `/l4d` | Kampanye (pilih survivor dulu) |

---

## Struktur repo

```text
cs-game/
├── client/src/
│   ├── components/          # Crosshair, audio, overlay klik-untuk-main
│   ├── game/
│   │   ├── l4d/             # Director, peta kampanye, survivor
│   │   ├── map/             # Container Yard, Ravenpoint
│   │   ├── offline/         # Bot 5v5, ekonomi, ronde, bom
│   │   ├── player/          # Controller FPS + arcade zombie
│   │   ├── training/        # Aim / recoil range
│   │   ├── weapons/         # Tembak, reload, recoil, model
│   │   └── zombie/          # Engine, layout Blackout, shop, interactives
│   ├── lib/                 # numericGuards, event bus
│   ├── screens/             # Menu, settings, keempat mode
│   ├── stores/              # Zustand
│   └── ui/
│       ├── hudTheme.ts      # Token HUD + modal bersama
│       └── components/overlays/  # Pause, chrome MENU, GameModal
├── shared/                  # Senjata, ekonomi, konstanta peta
├── test/                    # Vitest (alias @src → client/src)
└── docs/                    # Katalog test case
```

Pintu, jendela, dan rintangan Survival punya **satu sumber data** di `survivalLayout.ts`. Overlay pause / buy / settings memakai kartu yang sama (`GameModal`).

---

## Lisensi

Untuk edukasi dan eksplorasi web 3D. Lihat repositori untuk ketentuan distribusi.
