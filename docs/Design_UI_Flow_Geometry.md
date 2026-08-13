# 🎨 Desain Bentuk Geometri 3D, Alur Tanpa Login & Flow Tambahan (v2.0)

Dokumen ini mendefinisikan alur pengalaman pengguna (User Flow) tanpa registrasi/login, bentuk geometri 3D seluruh objek, **transition timing**, **z-index layering**, dan alur layar tambahan (ready/skip, vote kick, forfeit, spectator).

> **Referensi:** [Design_CSS_UI_System.md](Design_CSS_UI_System.md) (style) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md)

---

## 1. Alur Pengalaman Pengguna (Instant Play - Tanpa Login)

```
┌────────────────────────────────────────────────────────┐
│                   Buka Web Browser                     │
└───────────────────────────┬────────────────────────────┘
                            │ (Loading < 2 detik)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Layar Main Menu                       │
│  • Input Nickname: [ Player_482 ] (Bisa diedit/acak)   │
│  • Tombol [ 🎯 Mode Latihan (Single) ]                │
│  • Tombol [ ⚔️ Cari Match Mabar (5v5) ]               │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              ▼                           ▼
 ┌──────────────────────────┐ ┌──────────────────────────┐
 │  Mode Single (Lokal)     │ │  Mode Mabar (Colyseus)   │
 │  • Load Map + Training   │ │  • Join/Create Room      │
 │  • Langsung main         │ │  • Autojoin Tim Red/Blue │
 └────────────┬─────────────┘ └───────────┬──────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Klik Layar ("Click to Play")              │
│  • PointerLockControls aktif (Mouse terkunci)          │
│  • Buka Buy Menu ('B') atau Masuk Medan Tempur         │
└────────────────────────────────────────────────────────┘
```

### Alur Tambahan (BARU)

| Situasi | Flow |
| :--- | :--- |
| **Ready/Skip Buy** | Buy phase berjalan → pemain tekan Ready (F2/R) → progres bar per tim → 10/10 (atau 8/10) → sisa buy phase di-skip, +10s waktu aktif |
| **Vote Kick** | `/kick <nick>` ATAU klik tombol di leaderboard → semua pemain dapat prompt YES/NO (5s) → 50%+ → pemain dikick (layar pesan "Kicked by vote") |
| **Forfeit** | `/ff` → prompt 4/5 persetujuan tim (5s) → match end (tim lawan menang) |
| **Death → Spectate** | Mati → death cam 1s → auto free cam → pilih pemain (1-9) / objective (O) / third-person (V); tombol respawn otomatis 3s |
| **Reconnect** | Koneksi putus → overlay "Reconnecting..." (60s countdown) → sukses = lanjut / gagal = kembali ke main menu dengan state disimpan |

---

## 2. Transition Timing (BARU)

| Transisi | Durasi | Easing |
| :--- | :--- | :--- |
| Main menu → gameplay | 400ms | ease-out |
| Mode select → loading | 200ms | ease-in |
| Death screen muncul | 300ms | ease-out |
| Buy menu open/close | 220ms | ease-out |
| Leaderboard (TAB) | 100ms (instan) | linear |
| Kill feed slide-in | 300ms | ease-out |
| Skull kill confirm pop | 600ms | back-out |
| Vignette damage | 300ms | ease-out forwards |
| Scope masuk (AWP) | 250ms | ease-in-out |
| Round end banner | 500ms | back-out |

---

## 3. Z-Index Layering (BARU)

| Layer | Z-Index | Elemen |
| :--- | :--- | :--- |
| 3D Canvas | 0 | Jelas |
| HUD dasar | 10 | Crosshair, HP, ammo, timer |
| HUD floating | 20 | Kill feed, minimap, FPS/ping |
| Overlay | 30 | Vignette, flashbang white, scope |
| Menu | 40 | Buy menu, leaderboard, settings |
| Screen | 50 | Main menu, death screen, round end |
| Modal | 60 | Vote kick, forfeit, reconnect |
| Loading | 100 | Loading screen, lag banner |

---

## 4. Spek Geometri 3D (Warna Hex & Dimensi)

### A. Karakter (Player Model & Identitas Tim)

**Tim Terrorist (T - Merah):**
- Kepala: `[0.4, 0.4, 0.4]` kulit/cokelat + bandana hitam `#1c1917`.
- Torso: `[0.5, 0.8, 0.3]` kemeja merah gelap `#b91c1c`.
- Celana: `[0.5, 0.7, 0.3]` jeans abu `#4b5563`.

**Tim Counter-Terrorist (CT - Biru):**
- Kepala: `[0.4, 0.4, 0.4]` helm Kevlar hitam `#111827`.
- Torso: `[0.5, 0.8, 0.3]` rompi navy `#1e3a8a`.
- Celana: `[0.5, 0.7, 0.3]` SWAT `#374151`.

**Indikator Musuh:** Outline glow (mesh ganda, skala 1.05, `THREE.BackSide`) oranye `#f97316` / merah `#ef4444` — hanya musuh.

### B. Map "Container Yard"

| Objek | Geometry | Warna |
| :--- | :--- | :--- |
| Lantai Beton | Plane [60, 40] | `#4a5568` |
| Kontainer | Box [6.0, 2.4, 2.4] | T/A: `#dc2626` • CT/B: `#2563eb` • Mid: `#d97706` • Accent: `#16a34a` |
| Boks Kayu | Box [1.2, 1.2, 1.2] | `#92400e` |
| Tong Besi | Cylinder r0.35 h1.5 | `#374151` |
| Tembok Batas | Box [60, 7.2, 0.5] / [0.5, 7.2, 40] | `#6b7280` |
| Ramp | Box [2.4, 0.1, 2.4] rot 30° | `#6b7280` |

### C. Senjata & Granat (FPV)

| Objek | Rakitan | Warna |
| :--- | :--- | :--- |
| AK-47 | 3 balok (popor/receiver/laras) | `#78350f` / `#1f2937` / `#9ca3af` |
| M4A1-S | Balok + silencer cylinder | `#111827` |
| AWP | Laras panjang + scope | `#4d7c0f` + hitam |
| Tracer | Cylinder r0.01 len 20 | `#fef08a` (unlit) |
| HE | Sphere r0.1 | `#14532d` |
| Smoke | Cylinder r0.1 h0.3 | `#9ca3af` |
| Flash | Cylinder r0.08 h0.25 | `#f3f4f6` |

### D. Dummy Target (Training)
- Box [0.4, 1.8, 0.4] warna tim dummy + kepala berwarna kontras + outline.
- Head zone (2.0x) divisualkan sebagai blok kecil terpisah.

---

## 5. Responsive Behavior (BARU)

| Scope | Perilaku |
| :--- | :--- |
| Min res | 1280 × 720 (game dimulai dengan warning jika lebih kecil) |
| UI Scale | Setting 75% / 100% / 125% |
| Ultra-wide (>21:9) | HUD tetap di tengah-kanan (safe area 16:9), FOV di-extend |
| Window kecil | Minimap & kill feed collapse ke icon |

### Color Blindness Notes (BARU)
- Team colors didukung TONAL: merah vs biru kontras kuat; outline juga punya bentuk (lingkaran musuh vs persegi teman) di pengaturan "Accessibility".

---

## 6. QA Checklist Flow & Geometry

- [ ] Instant play tanpa login ≤ 2 detik ke gameplay.
- [ ] Semua transisi sesuai timing tabel.
- [ ] Z-index tidak saling menutupi elemen penting.
- [ ] Dummy target head zone terlihat jelas.
- [ ] Minimap props align dengan geometri 3D.
- [ ] Responsive di 1280×720 dan 2560×1440.
