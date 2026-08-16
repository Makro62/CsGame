# 👤 Desain Karakter, Animasi, Hitbox & Movement Physics Bible (v2.0)

Dokumen ini mencakup spesifikasi model 3D karakter, pembeda visual tim, presisi *hitbox*, FPV Arm model, fisika kematian, UI *nametag*, suara vokal — serta **(baru) Movement Physics Bible** lengkap dengan seluruh movement tech ala Krunker.io.

> **Referensi silang:** [Design_Combat_Kill.md](Design_Combat_Kill.md) (damage/hitbox) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (alasan angka) • kode: `PlayerController.tsx`

---

## 1. Visual Karakter & Identification (Team Distinction)

- **Gaya Model 3D:** Model *low-poly* bergaya balok/voxel (Krunker style).
- **Tim Terrorist (T):** Baju & sarung tangan taktis **Merah** (`#b91c1c`), bandana hitam.
- **Tim Counter-Terrorist (CT):** Rompi anti-peluru **Biru Navy** (`#1e3a8a`), helm Kevlar hitam.
- **FPV Arm Model:** Sepasang lengan balok low-poly dengan sarung tangan taktis tim yang memegang senjata.
- **Enemy Outline Glow:** Semua musuh memiliki outline oranye/merah (`#f97316` / `#ef4444`, mesh skala 1.05, `THREE.BackSide`). **Hilang** saat musuh di dalam Smoke Grenade.

### Spesifikasi Dimensi Model (Third-Person)

| Bagian | Geometry | Dimensi (m) | T | CT |
| :--- | :--- | :--- | :--- | :--- |
| Kepala | Box | 0.4 × 0.4 × 0.4 | Kulit + bandana `#1c1917` | Helm Kevlar `#111827` |
| Torso | Box | 0.5 × 0.8 × 0.3 | Kemeja `#b91c1c` | Rompi `#1e3a8a` |
| Celana | Box | 0.5 × 0.7 × 0.3 | Jeans `#4b5563` | SWAT `#374151` |
| Total Tinggi Model | - | 1.8 m (kepala di atas torso) | - | - |

---

## 2. Keseimbangan Statistik Karakter (Uniform Stats)

- **Semua pemain:** 100 HP, kecepatan dasar sama → 100% skill-based.
- **Catatan trade-off:** Krunker menggunakan **16 class** dengan statistik berbeda. Keputusan desain kita tetap **uniform** untuk MVP (fairness + simple balance). Analisis lengkap di [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md#3-prinsip-desain-inti-dikunci).

---

## 3. Presisi Hitbox (3-Zone Collider + Dimensi Fisik)

Server memvalidasi hit menggunakan **kapsul/box sederhana** (bukan mesh visual):

```
        ┌──────┐  ← Head (0.30 × 0.25 × 0.30), pusat di y=1.65m
        │ 2.0x │
        └──────┘
    ┌───────────┐  ← Torso (0.55 × 0.70 × 0.35), pusat di y=1.15m
    │   1.0x    │
    └───────────┘
   ┌─────────────┐  ← Limbs (0.15 × 0.70 × 0.15 ×2), pusat di y=0.5m
   │    0.7x     │
   └─────────────┘
```

| Zona | Multiplier | Dimensi Collider (m) | Offset Y (dari kaki) |
| :--- | :--- | :--- | :--- |
| Head | 2.0x | 0.30 × 0.25 × 0.30 | 1.65 |
| Torso | 1.0x | 0.55 × 0.70 × 0.35 | 1.15 |
| Limbs | 0.7x | 0.15 × 0.70 × 0.15 (masing-masing) | 0.50 |

**Saat Crouch/Slide:** seluruh collider dikompres 50% (tinggi 1.8 → 0.9m, offset kepala turun ke y=0.75m).

---

## 4. Movement Physics Bible 🏃 (BARU — Full Krunker Movement Tech)

Ini adalah inti dari desain *game feel*. Semua parameter di bawah **dikunci** untuk MVP.

### 4.1 Kecepatan & Parameter Dasar

| Parameter | Nilai | Catatan |
| :--- | :--- | :--- |
| Walk Speed | 5 m/s | WASD saja |
| Sprint Speed | 7.5 m/s | Shift + bergerak (1.5× walk) |
| Crouch Speed | 2.5 m/s | Ctrl (0.5× walk) |
| Slide Speed | 7.5 m/s (sprint) → turun ke 4 m/s | Selama durasi slide 0.6s |
| Slide-Hop Boost | Sprint × 1.3 (9.75 m/s max) | Momentum preservation |
| Jump Height (standar) | ~1.1 m | JUMP_VELOCITY 5 m/s |
| Gravity | 9.81 m/s² | Rapier |
| Eye Height (stand) / (crouch) | 0.8 m / 0.4 m | Kamera dari kaki |
| **Strafe Multiplier (diagonal)** | **× 1.2** | W+A / W+D lebih cepat dari W saja |

### 4.2 Friction & Air Control

| State | Friction | Air Control | Keterangan |
| :--- | :--- | :--- | :--- |
| Walk (ground) | 5.0 | - | Berhenti cepat |
| Sprint (ground) | 3.0 | - | Sedikit licin |
| Slide (aktif) | 0.5 | 0.4 | Hampir tanpa gesekan |
| Airborne | 0.0 | 0.75 (dengan W) | Full momentum di udara |

> **Aturan Emas:** Momentum horizontal **tidak pernah di-reset** saat melompat. Friction berlaku hanya pada state tertentu — inilah dasar slide-hop & strafe-hop.

### 4.3 Slide-Hop Chain

```
Sprint (W+Shift) → Crouch (Ctrl) → SLIDE mulai (0.6s)
   ↓ (velocity dipertahankan, friction rendah)
Step 1-2: [Jump saat masih slide] → SLIDE-HOP (momentum × 1.3, chain = 1)
   ↓ (di udara: air control aktif)
Step 3-4: [Land → Crouch lagi tepat waktu] → SLIDE baru → Jump → chain ≥ 3
```

| Parameter | Nilai |
| :--- | :--- |
| Durasi slide | 0.6 detik |
| Trigger syarat | Kecepatan > 4 m/s + Sprint + Crouch |
| Momentum jump | kecepatan tanah × 1.3 (cap 12 m/s) |
| Chaining | Jump saat slide state aktif → pertahankan momentum |
| Gagal timing (air friction terlambat) | Kecepatan turun ke base walk dalam ~1s |

### 4.4 Air Strafing / Strafe-Hop

Mengubah arah di udara dengan memutar mouse **ke arah gerakan** sambil menahan W (+A/D):

```
velocity_new = rotateToward(velocity, camera_yaw, max_turn_rate)
```

| Parameter | Nilai |
| :--- | :--- |
| Max turn per jump | 30° (di luar ini kehilangan 20% kecepatan) |
| Akselerasi turn | 0.75 factor per frame |
| Speed loss saat turn tajam (>30°) | −20% |
| Syarat | W ditekan + ada kecepatan horizontal |

### 4.5 Curve Slide

Belok **saat slide** tanpa kehilangan momentum:
- Velocity diserap ke arah kamera baru secara bertahap.
- Max rotasi velocity: 10°/per tick slide (tidak bisa 180° instan).
- Kehilangan kecepatan saat curve: < 10% (jika rotasi ≤ 30° total).

### 4.6 Moon-Jump

Jump tinggi setelah **keluar dari state crouch** (exit slide):
- Delay jump input 150ms setelah release crouch → height × 1.4.
- Gunakan untuk mencapai atap kontainer / campuran verticality.

### 4.7 Short-Hop (ADS Di Udara)

- Menekan Klik Kanan (ADS) di udara → jump height -40%.
- Berguna untuk pendaratan cepat + trigger slide berikutnya (ritme slide-hop).
- Tidak berpengaruh pada akurasi (sudah dalam keadaan lompat = spread 5%).

### 4.8 Frame-Perfect Input & Slide Control Setting

**Frame-Perfect Buffer:**
- Input jump/strafing diproses berbasis **timestamp** (bukan frame count) — konsisten di semua FPS.
- Window presisi: ±100ms dari trigger ideal.
- Dukungan **scroll wheel** untuk jump (pro player style).

**Slide Control Setting (kunci fairness lintas hardware):**

```
FPS rendah (60) → friction & traction diperlonggar (simulasi FPS tinggi)
Formula: effectiveSlideFactor = lerp(0.5, 1.0, slideControl / 10)
Nilai setting: 0-10 (default 6)
- 0  → friction penuh (FPS tinggi, frame-perfect)
- 10 → friction sangat rendah (membantu FPS rendah)
```

Tujuan: pemain 60 FPS bisa setara fluiditas pemain 240 FPS → anti-pay-to-win hardware.

### 4.9 Movement State Sync (Ke Server)

| State | Dikirim ke Server |
| :--- | :--- |
| walk | setiap 3 frame (~10/s) |
| sprint | setiap 3 frame |
| slide | setiap tick (30/s) — penting utk footstep audio |
| crouch | setiap tick |
| airborne | setiap tick (hitbox validity) |

---

## 5. Efek Fisika Kematian (Blocky Impulse Ragdoll)

- Saat HP = 0, server memicu death state; client me-render avatar terpental sesuai vektor impulse peluru terakhir.
- Impulse magnitude: `normal (1.0)`, `headshot (1.4)`, `awp (1.8)`.
- Tubuh disembunyikan setelah 3s / respawn.

**Death Animation Sequence:**
1. `t=0` — Impulse force diterapkan, avatar mulai jatuh (0.5s fisik).
2. `t=0.5s` — Avatar freeze di posisi jatuh (spectate death cam mulai).
3. `t=3s` — Avatar dibersihkan, pemain respawn.

---

## 6. UI Nametag & Health Bar di Atas Kepala

- Saat crosshair mengarah ke pemain lain (< 30m): tampilkan nickname + mini HP bar (hijau ≥ 60, kuning 30-59, merah < 30).
- HP bar musuh **hanya terlihat** jika pemain tersebut pernah terkena damage dalam 3 detik terakhir (info duty).
- Nametag musuh tetap tampil (bukan info tersembunyi) — game arcade, bukan esport ketat.

---

## 7. Ekspresi Suara Vokal Karakter (Character Vocal Cues)

| Cue | Pemicu | File |
| :--- | :--- | :--- |
| Hurt Grunt | Menerima damage > 20 dalam 1 hit | `vo_hurt.ogg` |
| Jump & Slide Breath | Slide-hop / moon-jump | `vo_jump.ogg` |
| Death Cry | Kehilangan HP = 0 | `vo_death.ogg` |
| Flash Reaction | Kena flashbang | `vo_flash.ogg` |

---

## 8. Animation States (Status Animasi)

| State | Deskripsi | Trigger |
| :--- | :--- | :--- |
| idle | Berdiri diam | Tidak ada input |
| walk | Berjalan normal | WASD + tidak sprint |
| sprint | Berlari (senjata menunduk) | Shift + WASD |
| crouch | Jongkok | Ctrl |
| slide | Meluncur (bobot rendah) | Sprint + Crouch |
| jump/airborne | Di udara | Space */
| reload | Animasi reload senjata | R / auto-reload |
| death | Terpental (ragdoll) | HP = 0 |

---

## 9. QA Checklist Movement Tech

- [ ] Slide-hop chain 3x tanpa kehilangan momentum.
- [ ] Air strafe 30° bekerja, >30° kehilangan 20%.
- [ ] Curve slide rotasi 30° total → kecepatan turun < 10%.
- [ ] Moon-jump height × 1.4 dengan timing window 150ms.
- [ ] Short-hop height -40% dengan ADS di udara.
- [ ] Slide Control 0 vs 10 menghasilkan perbedaan yang playable di 60 FPS.
- [ ] Diagonal (W+A) terasa lebih cepat dari W saja (× 1.2).
- [ ] Tidak ada reset momentum saat jump.
- [ ] Crouch hitbox 50% mempengaruhi raycast musuh dengan benar.