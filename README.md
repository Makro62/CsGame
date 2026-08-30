# 🎯 CS-Game — 3D Web-Based Tactical FPS & Zombie Survival

[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)

**CS-Game** adalah game *First-Person Shooter* (FPS) taktis 3D modern yang berjalan langsung di browser tanpa perlu instalasi aplikasi tambahan. Dibangun menggunakan **React, Three.js (React Three Fiber), dan Rapier Physics**, game ini menghadirkan perpaduan *gunplay* kompetitif ala Counter-Strike dan mode bertahan hidup ala Zombie Horde / Left 4 Dead.

---

## 🎮 Mode Permainan (Game Modes)

### 1. ⚔️ 5v5 Tactical Match (Offline vs Bots)
Mode kompetitif klasik 5 lawan 5 antara tim **Terrorist (T)** dan **Counter-Terrorist (CT)**:
* **Tujuan**:
  * **Tim T**: Pasang bom C4 di Bomb Site A atau B dan pertahankan hingga meledak, atau eliminasi seluruh tim CT.
  * **Tim CT**: Jinakkan bom C4 sebelum meledak atau habisi seluruh tim Teroris sebelum bom dipasang.
* **Fitur Utama**:
  * AI Bot taktis cerdas dengan sistem pathfinding, pencarian tempat berlindung (*cover*), rotasi site, pemasangan, dan penjinakan bom.
  * Pilihan peta: **Container Yard** (taktikal peti kemas) & **Dust** (area gurun pasir).
  * Sistem ekonomi & *Buy Menu* [B] di awal ronde.
  * Callout label taktis (MID, A PLATFORM, CT SPAWN, dll.) dan indikator radar.

### 2. ☣️ Zombie Survival Mode
Mode pertarungan bertahan hidup gelombang zombie (*wave-based survival*):
* **Tujuan**: Bertahan hidup dari gelombang zombie yang terus bertambah kuat dan selesaikan target misi eliminasi horde di setiap gelombang.
* **Fitur Utama**:
  * **Objective Tracker**: Menampilkan sisa zombie yang harus dieliminasi untuk menyelesaikan gelombang misi.
  * **Horde Alert**: Peringatan kedatangan gelombang musuh yang mendalam.
  * **Sistem Poin & Survival Shop [B]**: Dapatkan poin dari setiap zombie yang dibunuh untuk membeli senjata baru, amunisi, dan upgrade tier.
  * **Weapon Tiers & Pack-a-Punch**: Upgrade senjata hingga Tier 3 dengan tambahan damage dan efek visual aura energi.
  * **Perks & Power-ups**: Efek *Double Points*, *Insta-Kill*, *Max Ammo*, *Nuke*, *Speed Boost*, hingga *Juggernog*.
  * **Arsenal Panel**: Panel inventaris senjata yang telah dibeli dengan tombol shortcut ganti senjata instan.

### 3. 🧟 Left 4 Dead (L4D) Co-op Survivor
Mode petualangan kooperatif bertema apokalips:
* **AI Director System**: Algoritma AI dinamis yang mengatur tensi, intensitas horde, jeda istirahat, dan serangan zombie kejutan secara real-time.
* **Squad Survivor AI**: Rekan bot yang dapat menembak bersama, melindungi pemain, serta menyembuhkan (*revive*) saat pemain dalam kondisi *downed*.
* **Mekanik Downed & Revive**: Waktu penyelematan darurat sebelum kehabisan darah.

### 4. 🎯 Training Range & Recoil Practice
Area latihan untuk mengasah refleks dan keahlian menembak:
* **Aim Drill**: Sasaran tembak bergerak dan muncul acak (*popping dummies*) dengan pencatatan akurasi, headshot, dan skor.
* **Recoil Practice**: Dinding sasaran kalibrasi semprotan peluru (*spray pattern wall*) untuk melatih kompensasi recoil senjata seperti AK-47 dan M4A1.
* Pilihan jarak target (5M, 10M, 15M, 20M) dan tingkat kesulitan bot.

---

## 🔫 Senjata & Mekanik Tempur (Gunplay)

| Kategori | Senjata | Deskripsi |
| :--- | :--- | :--- |
| **Rifles** | **AK-47** | Senjata serbu legendaris dengan damage tinggi dan headshot 1-hit kill. |
| | **M4A1-S** | Senjata serbu bersiluet peredam suara (*silencer*), stabil, dan akurat. |
| **Sniper** | **AWP Magnum** | Senjata runduk mematikan dengan scope zoom ganda 1-shot kill di badan. |
| **SMG** | **MP5-SD** | Senjata laras pendek otomatis dengan fire rate tinggi dan akurasi gerak. |
| **Pistols** | **Desert Eagle .50** | Pistol berat kaliber tinggi berdaya hancur besar. |
| | **Glock-18** | Pistol standar dengan mode burst dan akurasi stabil saat bergerak. |
| | **Tec-9** | Pistol semi-otomatis berkapasitas peluru besar. |
| **Melee** | **Combat Knife** | Pisau tempur jarak dekat dengan damage punggung mematikan (*backstab*). |
| **Granat** | **HE, Smoke, Flash** | Granat ledak, granat asap penghalang pandangan, dan granat kejut silau. |

### Mekanik Tempur Utama:
* **ADS (Aim Down Sights)**: Klik kanan untuk membidik menggunakan *iron sight* atau *reflex sight* taktis dengan goyangan yang diredam 78%.
* **Recoil Pattern & Spray Compensation**: Pola hamburan peluru autentik yang dapat dikendalikan dengan gerakan mouse ke bawah.
* **Movement Penalties**: Menembak sambil berlari meningkatkan sebaran peluru; jongkok (*crouch*) atau berhenti meningkatkan akurasi tembakan pertama.
* **Akimbo / Dual-Wield**: Mode penggunaan dua pistol sekaligus untuk tembakan ganda.

---

## ⌨️ Kontrol Permainan (Controls)

| Tombol | Aksi |
| :--- | :--- |
| **W, A, S, D** | Bergerak (Maju, Kiri, Mundur, Kanan) |
| **Mouse** | Mengarahkan pandangan & membidik |
| **Klik Kiri** | Menembak / Menyerang dengan pisau |
| **Klik Kanan** | Membidik / ADS (*Aim Down Sights*) / Scope AWP |
| **Spasi** | Melompat |
| **Ctrl / C** | Jongkok (*Crouch*) |
| **Shift** | Berjalan perlahan (*Walk / Silent Footsteps*) |
| **R** | Mengisi ulang peluru (*Reload*) |
| **1** | Memilih Senjata Utama (*Primary Weapon*) |
| **2** | Memilih Senjata Cadangan (*Secondary Pistol*) |
| **3** | Memilih Pisau (*Combat Knife*) |
| **4** | Memilih Granat (*HE / Smoke / Flashbang*) |
| **B** | Membuka Toko / Menu Pembelian (*Arsenal Shop*) |
| **E** | Interaksi / Pasang & Jinakkan Bom C4 |
| **Tab** | Menampilkan Scoreboard |
| **Esc** | Jeda Permainan / Buka Menu Pengaturan |

---

## 🛠️ Arsitektur & Teknologi

* **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build Tool & Dev Server**: [Vite 5](https://vitejs.dev/)
* **3D Engine**: [Three.js](https://threejs.org/) melalui [@react-three/fiber](https://r3f.docs.pmnd.rs/)
* **Physics Engine**: [@react-three/rapier](https://github.com/pmndrs/react-three-rapier) (rigid body, colliders, raycasting)
* **Audio Engine**: Synthesized Procedural Audio Engine berbasis **Web Audio API**
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Routing**: [Wouter](https://github.com/molefrog/wouter)
* **Quality & Testing**: [Vitest](https://vitest.dev/) (Unit Testing) + [ESLint](https://eslint.org/)

---

## 🚀 Cara Menjalankan di Lokal (Getting Started)

### Prasyarat:
* **Node.js** versi 18 ke atas
* **npm** atau **yarn**

### Langkah Instalasi:

1. **Clone repositori**:
   ```bash
   git clone https://github.com/Makro62/CsGame.git
   cd cs-game
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Dev Server)**:
   ```bash
   npm run dev
   ```
   Buka browser di alamat: `http://localhost:5174`

4. **Menjalankan Pengujian (Unit Tests)**:
   ```bash
   npm run test
   ```

5. **Pemeriksaan Linter & Tipe Data**:
   ```bash
   npm run lint
   npm run typecheck
   ```

6. **Build untuk Produksi**:
   ```bash
   npm run build
   ```

---

## 📁 Struktur Direktori

```text
cs-game/
├── client/                     # Aplikasi Frontend React + Three.js
│   ├── src/
│   │   ├── components/         # Komponen UI/Overlay (Crosshair, Scope, Audio, HUD)
│   │   ├── game/               # Logika Inti Game
│   │   │   ├── effects/        # Efek visual partikel, peluru, dan tracer
│   │   │   ├── l4d/            # AI Director dan logika Left 4 Dead
│   │   │   ├── map/            # Definisi 3D Map (ContainerYard, Dust, Callouts)
│   │   │   ├── offline/        # Algoritma pertempuran bot dan logika bom 5v5
│   │   │   ├── player/         # Kontroler pemain & model karakter bot
│   │   │   ├── training/       # Area latihan akurasi dan kontrol recoil
│   │   │   ├── weapons/        # Sistem tembak, animasi, reload, dan model senjata 3D
│   │   │   └── zombie/         # Mesin zombie, loot, survival shop, dan spawning
│   │   ├── hooks/              # Custom React hooks
│   │   ├── screens/            # Layar Game (MainMenu, 5v5, Zombie, L4D, Training)
│   │   ├── stores/             # Global State Management (Zustand)
│   │   └── ui/                 # Desain sistem dan komponen antarmuka
├── shared/                     # Tipe data, konstanta peta, dan weapon stats bersama
├── eslint.config.js            # Konfigurasi ESLint modern
└── package.json                # Workspace dependencies & build scripts
```

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Dibuat untuk tujuan edukasi, eksplorasi teknologi web 3D, dan hiburan.
